"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookExampleGenerator = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const hook_library_1 = require("./data/hook-library");
/**
 * HookExampleGenerator - Generates example files for selected hooks
 *
 * Responsibilities:
 * - Generate TSX files with hook examples
 * - Auto-include dependencies
 * - Copy required JS files from mact_modules to wwwroot/js
 * - Create organized folder structure
 */
class HookExampleGenerator {
    /**
     * Generate hook examples in project
     */
    async generateHookExamples(projectPath, selectedHookIds) {
        // Get hooks with dependencies
        const allHookIds = this.resolveWithDependencies(selectedHookIds);
        const hooks = allHookIds.map(id => (0, hook_library_1.getHookById)(id)).filter(Boolean);
        // Create Examples directory
        const examplesDir = path.join(projectPath, 'Pages', 'Examples');
        await fs.mkdir(examplesDir, { recursive: true });
        // Generate example file for each hook
        for (const hook of hooks) {
            await this.generateHookExample(examplesDir, hook);
            // Generate server-side code if present
            if (hook.serverCode) {
                await this.generateServerCode(projectPath, hook);
            }
        }
        // Generate index page listing all examples
        await this.generateExamplesIndex(examplesDir, hooks);
        // Copy required JS files to wwwroot/js
        await this.copyRequiredJsFiles(projectPath, allHookIds);
        console.log(`[HookExampleGenerator] Generated ${hooks.length} hook examples`);
    }
    /**
     * Resolve hook IDs with their dependencies
     */
    resolveWithDependencies(selectedHookIds) {
        const allIds = new Set(selectedHookIds);
        for (const hookId of selectedHookIds) {
            const deps = (0, hook_library_1.getHookDependencies)(hookId);
            deps.forEach(dep => allIds.add(dep));
        }
        return Array.from(allIds);
    }
    /**
     * Generate single hook example file
     */
    async generateHookExample(examplesDir, hook) {
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
    getExampleFileName(hookName) {
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
    buildExampleFileContent(hook) {
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
    async generateExamplesIndex(examplesDir, hooks) {
        const indexPath = path.join(examplesDir, 'Index.tsx');
        // Group hooks by category
        const grouped = hooks.reduce((acc, hook) => {
            if (!acc[hook.category]) {
                acc[hook.category] = [];
            }
            acc[hook.category].push(hook);
            return acc;
        }, {});
        const content = this.buildIndexContent(grouped);
        await fs.writeFile(indexPath, content, 'utf-8');
    }
    /**
     * Build Examples/Index.tsx content
     */
    buildIndexContent(grouped) {
        const imports = [];
        const categories = [];
        // Core category first
        if (grouped.core) {
            categories.push(this.buildCategorySection('Core Hooks', grouped.core, imports));
        }
        // Then other categories
        for (const [category, hooks] of Object.entries(grouped)) {
            if (category === 'core')
                continue; // Already added
            const categoryLabel = this.getCategoryLabel(category);
            categories.push(this.buildCategorySection(categoryLabel, hooks, imports));
        }
        return `import { useState } from '@minimact/core';

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
    buildCategorySection(categoryLabel, hooks, imports) {
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
    getCategoryLabel(category) {
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
    /**
     * Copy required JS files from mact_modules to wwwroot/js
     * This ensures extension packages (@minimact/mvc, @minimact/punch) are available
     */
    async copyRequiredJsFiles(projectPath, selectedHookIds) {
        const requiredPackages = (0, hook_library_1.getRequiredPackages)(selectedHookIds);
        if (requiredPackages.length === 0) {
            console.log('[HookExampleGenerator] No extension packages required (core hooks only)');
            return;
        }
        // Ensure wwwroot/js directory exists
        const jsDir = path.join(projectPath, 'wwwroot', 'js');
        await fs.mkdir(jsDir, { recursive: true });
        // Source: Swig's mact_modules folder (synced via sync-local-packages.js)
        const mactModulesDir = path.join(__dirname, '..', '..', 'mact_modules', '@minimact');
        for (const packageName of requiredPackages) {
            const shortName = packageName.replace('@minimact/', ''); // "mvc" or "punch"
            try {
                // Source path (from mact_modules)
                const sourcePath = path.join(mactModulesDir, shortName, 'dist', `${shortName}.min.js`);
                // Check if file exists
                const exists = await fs.access(sourcePath).then(() => true).catch(() => false);
                if (!exists) {
                    console.warn(`[HookExampleGenerator] Warning: ${sourcePath} not found`);
                    console.warn(`[HookExampleGenerator] Run 'npm run sync' in monorepo root to sync packages`);
                    continue;
                }
                // Destination path (wwwroot/js)
                const destPath = path.join(jsDir, `minimact-${shortName}.min.js`);
                // Copy file
                await fs.copyFile(sourcePath, destPath);
                console.log(`[HookExampleGenerator] ✓ Copied ${packageName} → wwwroot/js/minimact-${shortName}.min.js`);
            }
            catch (error) {
                console.error(`[HookExampleGenerator] Failed to copy ${packageName}:`, error);
                console.error(`[HookExampleGenerator] Make sure to run 'npm run sync' in the monorepo root first`);
            }
        }
        // Log summary
        if (requiredPackages.length > 0) {
            console.log(`[HookExampleGenerator] Copied ${requiredPackages.length} extension package(s) to wwwroot/js/`);
            console.log(`[HookExampleGenerator] Packages: ${requiredPackages.join(', ')}`);
        }
    }
    /**
     * Generate server-side code file (C# or Rust)
     */
    async generateServerCode(projectPath, hook) {
        if (!hook.serverCode)
            return;
        // Determine target directory based on language
        const targetDir = hook.serverCode.language === 'csharp'
            ? path.join(projectPath, 'ServerReducers')
            : path.join(projectPath, 'ServerReducers'); // Rust would go to same dir for now
        // Create directory if it doesn't exist
        await fs.mkdir(targetDir, { recursive: true });
        // Get project name from path to replace namespace placeholder
        const projectName = path.basename(projectPath);
        let code = hook.serverCode.code;
        // Replace namespace placeholder with actual project name
        code = code.replace(/YourProjectName/g, projectName);
        // Write server code file
        const filePath = path.join(targetDir, hook.serverCode.fileName);
        await fs.writeFile(filePath, code, 'utf-8');
        console.log(`[HookExampleGenerator] ✓ Generated server code: ${hook.serverCode.fileName} (${hook.serverCode.language})`);
    }
}
exports.HookExampleGenerator = HookExampleGenerator;
