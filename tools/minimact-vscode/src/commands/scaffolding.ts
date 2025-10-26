import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Component scaffolding options
 */
interface ScaffoldOptions {
  componentName: string;
  location: string;
  includeCodebehind: boolean;
  includeState: boolean;
  includeEffect: boolean;
  includeDomState: boolean;
  includeTypes: boolean;
}

/**
 * Create a new Minimact component with wizard
 */
export async function createComponent(uri?: vscode.Uri) {
  // Determine default location
  let defaultLocation = '';
  if (uri && uri.fsPath) {
    // Right-clicked on a folder
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.type === vscode.FileType.Directory) {
      defaultLocation = uri.fsPath;
    }
  } else {
    // Fallback to workspace root + components directory
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const componentsDir = vscode.workspace.getConfiguration('minimact').get<string>('componentsDirectory', 'src/components');
      defaultLocation = path.join(workspaceFolders[0].uri.fsPath, componentsDir);
    }
  }

  // Step 1: Get component name
  const componentName = await vscode.window.showInputBox({
    prompt: 'Component Name (e.g., TodoList, UserProfile)',
    placeHolder: 'TodoList',
    validateInput: (value) => {
      if (!value) {
        return 'Component name is required';
      }
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
        return 'Component name must start with uppercase letter and contain only letters/numbers';
      }
      return null;
    }
  });

  if (!componentName) {
    return; // User cancelled
  }

  // Step 2: Get location
  const location = await vscode.window.showInputBox({
    prompt: 'Location (folder path)',
    value: defaultLocation,
    validateInput: (value) => {
      if (!value) {
        return 'Location is required';
      }
      return null;
    }
  });

  if (!location) {
    return; // User cancelled
  }

  // Step 3: Get options via QuickPick (multi-select)
  const optionItems: vscode.QuickPickItem[] = [
    {
      label: 'Create codebehind file',
      description: 'For database queries and business logic',
      picked: true
    },
    {
      label: 'Add useState example',
      description: 'Include state management hook',
      picked: false
    },
    {
      label: 'Add useEffect example',
      description: 'Include lifecycle hook',
      picked: false
    },
    {
      label: 'Add useDomElementState',
      description: 'Minimact Punch - DOM reactive state',
      picked: false
    },
    {
      label: 'Include TypeScript types file',
      description: 'Separate .types.ts file for interfaces',
      picked: false
    }
  ];

  const selectedOptions = await vscode.window.showQuickPick(optionItems, {
    title: `Create Minimact Component: ${componentName}`,
    placeHolder: 'Select options (use Space to toggle)',
    canPickMany: true
  });

  if (!selectedOptions) {
    return; // User cancelled
  }

  // Build options object
  const options: ScaffoldOptions = {
    componentName,
    location,
    includeCodebehind: selectedOptions.some(o => o.label === 'Create codebehind file'),
    includeState: selectedOptions.some(o => o.label === 'Add useState example'),
    includeEffect: selectedOptions.some(o => o.label === 'Add useEffect example'),
    includeDomState: selectedOptions.some(o => o.label === 'Add useDomElementState'),
    includeTypes: selectedOptions.some(o => o.label === 'Include TypeScript types file')
  };

  // Generate files
  await generateComponent(options);
}

/**
 * Generate component files
 */
async function generateComponent(options: ScaffoldOptions) {
  const { componentName, location } = options;

  // Ensure directory exists
  if (!fs.existsSync(location)) {
    fs.mkdirSync(location, { recursive: true });
  }

  // File paths
  const tsxPath = path.join(location, `${componentName}.tsx`);
  const codebehindPath = path.join(location, `${componentName}.codebehind.cs`);
  const typesPath = path.join(location, `${componentName}.types.ts`);

  // Check if TSX file already exists
  if (fs.existsSync(tsxPath)) {
    const overwrite = await vscode.window.showWarningMessage(
      `${componentName}.tsx already exists. Overwrite?`,
      'Yes',
      'No'
    );
    if (overwrite !== 'Yes') {
      return;
    }
  }

  // Generate TSX file
  const tsxContent = generateTsxContent(options);
  fs.writeFileSync(tsxPath, tsxContent, 'utf-8');

  // Generate codebehind if requested
  if (options.includeCodebehind) {
    const codebehindContent = generateCodebehindContent(options);
    fs.writeFileSync(codebehindPath, codebehindContent, 'utf-8');
  }

  // Generate types file if requested
  if (options.includeTypes) {
    const typesContent = generateTypesContent(options);
    fs.writeFileSync(typesPath, typesContent, 'utf-8');
  }

  // Open the TSX file
  const document = await vscode.workspace.openTextDocument(tsxPath);
  await vscode.window.showTextDocument(document);

  // Show success message
  const filesCreated = [
    `${componentName}.tsx`,
    ...(options.includeCodebehind ? [`${componentName}.codebehind.cs`] : []),
    ...(options.includeTypes ? [`${componentName}.types.ts`] : [])
  ];

  vscode.window.showInformationMessage(
    `✅ Created: ${filesCreated.join(', ')}`,
    'Build Now'
  ).then(selection => {
    if (selection === 'Build Now') {
      vscode.commands.executeCommand('workbench.action.tasks.build');
    }
  });
}

/**
 * Generate TSX file content
 */
function generateTsxContent(options: ScaffoldOptions): string {
  const { componentName, includeState, includeEffect, includeDomState, includeTypes } = options;

  const imports: string[] = [];
  const hooks: string[] = [];
  const jsxElements: string[] = [];

  // Determine imports
  const hooksList: string[] = [];
  if (includeState) hooksList.push('useState');
  if (includeEffect) hooksList.push('useEffect');
  if (includeDomState) hooksList.push('useDomElementState');

  if (hooksList.length > 0) {
    imports.push(`import { ${hooksList.join(', ')} } from 'minimact';`);
  }

  if (includeTypes) {
    imports.push(`import { ${componentName}Props } from './${componentName}.types';`);
  }

  // Add hook examples
  if (includeState) {
    hooks.push(`  const [count, setCount] = useState(0);`);
    jsxElements.push(`        <p>Count: {count}</p>`,
                     `        <button onclick={() => setCount(count + 1)}>Increment</button>`);
  }

  if (includeEffect) {
    hooks.push(`\n  useEffect(() => {`,
               `    // Side effect logic here`,
               `    console.log('Component mounted');`,
               `    return () => {`,
               `      console.log('Component unmounted');`,
               `    };`,
               `  }, []);`);
  }

  if (includeDomState) {
    hooks.push(`\n  const domState = useDomElementState('#my-element');`);
    jsxElements.push(`        <div id="my-element">`,
                     `          <p>Intersecting: {domState.isIntersecting ? 'Yes' : 'No'}</p>`,
                     `        </div>`);
  }

  // Default content if no hooks selected
  if (!includeState && !includeDomState) {
    jsxElements.push(`        <h1>${componentName}</h1>`,
                     `        <p>Welcome to your new Minimact component!</p>`);
  }

  const propsParam = includeTypes ? `props: ${componentName}Props` : '';

  return `${imports.join('\n')}${imports.length > 0 ? '\n\n' : ''}export function ${componentName}(${propsParam}) {
${hooks.join('\n')}

  return (
    <div className="${componentName.toLowerCase()}">
${jsxElements.join('\n')}
    </div>
  );
}
`;
}

/**
 * Generate codebehind file content
 */
function generateCodebehindContent(options: ScaffoldOptions): string {
  const { componentName } = options;

  // Detect namespace from location or use default
  const namespace = getNamespaceFromLocation(options.location);

  return `using Microsoft.EntityFrameworkCore;

namespace ${namespace};

public partial class ${componentName}
{
    // Dependencies (injected via constructor)
    // private readonly AppDbContext _db;

    // public ${componentName}(AppDbContext db)
    // {
    //     _db = db;
    // }

    // Business logic methods

    // private async Task<List<T>> LoadDataAsync()
    // {
    //     return await _db.YourTable
    //         .Where(x => x.Condition)
    //         .ToListAsync();
    // }
}
`;
}

/**
 * Generate types file content
 */
function generateTypesContent(options: ScaffoldOptions): string {
  const { componentName } = options;

  return `export interface ${componentName}Props {
  // Add your prop types here
  // title?: string;
  // onAction?: () => void;
}

export interface ${componentName}State {
  // Add your state types here
  // count: number;
}
`;
}

/**
 * Extract namespace from location
 */
function getNamespaceFromLocation(location: string): string {
  // Try to find a .csproj file in parent directories
  let dir = location;
  for (let i = 0; i < 5; i++) {
    const files = fs.readdirSync(dir);
    const csprojFile = files.find(f => f.endsWith('.csproj'));
    if (csprojFile) {
      // Use project name as namespace
      return csprojFile.replace('.csproj', '');
    }

    const parentDir = path.dirname(dir);
    if (parentDir === dir) break; // Reached root
    dir = parentDir;
  }

  // Fallback to generic namespace
  return 'MyApp.Components';
}
