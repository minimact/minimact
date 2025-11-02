import * as fs from 'fs/promises';
import * as path from 'path';
import { HOOK_LIBRARY, getHookById, getHookDependencies, type Hook } from '../data/hook-library';

/**
 * HookExampleGenerator - Generates example files for selected hooks
 *
 * Responsibilities:
 * - Generate TSX files with hook examples
 * - Auto-include dependencies
 * - Copy required packages from mact_modules
 * - Create organized folder structure
 */
export class HookExampleGenerator {
  /**
   * Generate hook examples in project
   */
  async generateHookExamples(
    projectPath: string,
    selectedHookIds: string[]
  ): Promise<void> {
    // Get hooks with dependencies
    const allHookIds = this.resolveWithDependencies(selectedHookIds);
    const hooks = allHookIds.map(id => getHookById(id)).filter(Boolean) as Hook[];

    // Create Examples directory
    const examplesDir = path.join(projectPath, 'Pages', 'Examples');
    await fs.mkdir(examplesDir, { recursive: true });

    // Generate example file for each hook
    for (const hook of hooks) {
      await this.generateHookExample(examplesDir, hook);
    }

    // Generate index page listing all examples
    await this.generateExamplesIndex(examplesDir, hooks);

    console.log(`[HookExampleGenerator] Generated ${hooks.length} hook examples`);
  }

  /**
   * Resolve hook IDs with their dependencies
   */
  private resolveWithDependencies(selectedHookIds: string[]): string[] {
    const allIds = new Set<string>(selectedHookIds);

    for (const hookId of selectedHookIds) {
      const deps = getHookDependencies(hookId);
      deps.forEach(dep => allIds.add(dep));
    }

    return Array.from(allIds);
  }

  /**
   * Generate single hook example file
   */
  private async generateHookExample(examplesDir: string, hook: Hook): Promise<void> {
    // Create filename from hook name (e.g., useState -> UseStateExample.tsx)
    const fileName = this.getExampleFileName(hook.name);
    const filePath = path.join(examplesDir, fileName);

    // Build file content
    const content = this.buildExampleFileContent(hook);

    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Get example file name from hook name
   */
  private getExampleFileName(hookName: string): string {
    // useState -> UseStateExample.tsx
    // useMvcState -> UseMvcStateExample.tsx
    const pascalCase = hookName
      .replace(/^use/, 'Use')
      .replace(/([A-Z])/g, '$1')
      .replace(/^./, str => str.toUpperCase());

    return `${pascalCase}Example.tsx`;
  }

  /**
   * Build example file content with proper imports and exports
   */
  private buildExampleFileContent(hook: Hook): string {
    const imports = hook.imports.join('\n');
    const functionName = this.getExampleFileName(hook.name).replace('.tsx', '');

    return `${imports}

/**
 * Example: ${hook.name}
 * ${hook.description}
 *
 * Category: ${hook.category}
 ${hook.packageName ? `* Package: ${hook.packageName} (available in mact_modules)` : '* Package: minimact (core)'}
 */

${hook.example}

// Export for use in Examples index
export default ${functionName.replace('Example', '')};
`;
  }

  /**
   * Generate index page listing all examples
   */
  private async generateExamplesIndex(examplesDir: string, hooks: Hook[]): Promise<void> {
    const indexPath = path.join(examplesDir, 'Index.tsx');

    // Group hooks by category
    const grouped = hooks.reduce(
      (acc, hook) => {
        if (!acc[hook.category]) {
          acc[hook.category] = [];
        }
        acc[hook.category].push(hook);
        return acc;
      },
      {} as Record<string, Hook[]>
    );

    const content = this.buildIndexContent(grouped);
    await fs.writeFile(indexPath, content, 'utf-8');
  }

  /**
   * Build Examples/Index.tsx content
   */
  private buildIndexContent(grouped: Record<string, Hook[]>): string {
    const imports: string[] = [];
    const categories: string[] = [];

    // Core category first
    if (grouped.core) {
      categories.push(this.buildCategorySection('Core Hooks', grouped.core, imports));
    }

    // Then other categories
    for (const [category, hooks] of Object.entries(grouped)) {
      if (category === 'core') continue; // Already added

      const categoryLabel = this.getCategoryLabel(category);
      categories.push(this.buildCategorySection(categoryLabel, hooks, imports));
    }

    return `import { useState } from 'minimact';

${imports.join('\n')}

/**
 * Hook Examples Index
 *
 * This page lists all hook examples generated for your project.
 * Click on an example to see it in action!
 */
export function Index() {
  const [activeExample, setActiveExample] = useState<string | null>(null);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '10px' }}>Minimact Hook Examples</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        This project includes examples for ${Object.values(grouped).flat().length} hooks.
        Select an example below to see the code in action.
      </p>

      {/* Hook Categories */}
      <div style={{ display: 'grid', gap: '30px' }}>
        ${categories.join('\n\n        ')}
      </div>

      {/* Active Example Display */}
      {activeExample && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setActiveExample(null)}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '90%',
            maxHeight: '90%',
            overflow: 'auto',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setActiveExample(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                padding: '5px 10px',
                border: 'none',
                background: '#f0f0f0',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            <h2>Active Example: {activeExample}</h2>
            <p style={{ color: '#666' }}>
              This is where the example component would render.
              Check the source file in <code>Pages/Examples/</code> for the full implementation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
`;
  }

  /**
   * Build a category section for the index
   */
  private buildCategorySection(categoryLabel: string, hooks: Hook[], imports: string[]): string {
    const hookElements = hooks.map(hook => {
      const componentName = this.getExampleFileName(hook.name).replace('.tsx', '').replace('Example', '');
      const fileName = this.getExampleFileName(hook.name).replace('.tsx', '');

      // Add import
      imports.push(`import ${componentName} from './${fileName}';`);

      return `          <button
            onClick={() => setActiveExample('${hook.name}')}
            style={{
              padding: '12px 16px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              background: 'white',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4CAF50';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(76, 175, 80, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#ddd';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontWeight: '600', color: '#333', fontFamily: 'monospace', fontSize: '14px' }}>
              ${hook.name}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              ${hook.description}
            </div>
            ${hook.packageName ? `<div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              Package: ${hook.packageName}
            </div>` : ''}
          </button>`;
    });

    return `{/* ${categoryLabel} */}
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#333' }}>${categoryLabel}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
${hookElements.join('\n\n')}
          </div>
        </div>`;
  }

  /**
   * Get human-readable category label
   */
  private getCategoryLabel(category: string): string {
    switch (category) {
      case 'core':
        return 'Core Hooks';
      case 'mvc':
        return 'MVC Bridge Hooks';
      case 'punch':
        return 'Punch Hooks (DOM State)';
      case 'advanced':
        return 'Advanced Hooks';
      default:
        return category;
    }
  }
}
