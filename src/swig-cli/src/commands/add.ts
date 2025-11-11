import * as path from 'path';
import * as fs from 'fs/promises';
import prompts from 'prompts';
import chalk from 'chalk';
import { TranspilerService } from '@minimact/swig-shared';

/**
 * Add command - Generate a new page with controller
 */
export async function addCommand(
  pageName?: string,
  routePath?: string,
  options: {
    mvc?: boolean;
    project?: string;
  } = {}
): Promise<void> {
  const projectPath = options.project || process.cwd();

  // Interactive mode if pageName or routePath not provided
  if (!pageName || !routePath) {
    console.log(chalk.bold.cyan('✨ Add a new page to your Minimact project\n'));

    const answers = await prompts([
      {
        type: !pageName ? 'text' : null,
        name: 'pageName',
        message: 'Page name (PascalCase, no dashes):',
        validate: (value: string) => {
          if (value.length === 0) return 'Page name is required';
          if (/[^a-zA-Z0-9_]/.test(value)) {
            return 'Page name can only contain letters, numbers, and underscores (no dashes or spaces)';
          }
          if (/^\d/.test(value)) {
            return 'Page name cannot start with a number';
          }
          return true;
        }
      },
      {
        type: !routePath ? 'text' : null,
        name: 'routePath',
        message: 'Route path (e.g., Products/{id}):',
        initial: (prev: string) => {
          // Suggest route based on page name
          const name = prev || pageName;
          if (!name) return '';
          // Convert ProductDetails -> Products/{id}
          // Convert HomePage -> Home
          return name.replace(/Page$/, '').replace(/([A-Z])/g, '/$1').replace(/^\//, '');
        },
        validate: (value: string) =>
          value.length > 0 ? true : 'Route path is required'
      },
      {
        type: 'confirm',
        name: 'useMvc',
        message: 'Use MVC Bridge pattern (ViewModel)?',
        initial: options.mvc || false
      }
    ]);

    // User cancelled
    if (!answers.pageName && !pageName) {
      console.log(chalk.yellow('\n❌ Cancelled'));
      process.exit(0);
    }

    pageName = pageName || answers.pageName;
    routePath = routePath || answers.routePath;
    options.mvc = answers.useMvc;

    console.log('');
  }

  // Validate page name for C# compatibility
  if (/[^a-zA-Z0-9_]/.test(pageName!)) {
    console.error(chalk.red('❌ Invalid page name!'));
    console.error(chalk.yellow(`   Page name "${pageName}" contains invalid characters.`));
    console.error(chalk.gray('   Use PascalCase or underscores (e.g., ProductDetails, Product_Details)'));
    console.error(chalk.gray('   Avoid dashes, spaces, or special characters'));
    process.exit(1);
  }

  if (/^\d/.test(pageName!)) {
    console.error(chalk.red('❌ Invalid page name!'));
    console.error(chalk.yellow(`   Page name "${pageName}" cannot start with a number.`));
    process.exit(1);
  }

  console.log(chalk.bold(`📄 Adding new page: ${chalk.cyan(pageName!)}`));
  console.log(`   Route: ${chalk.green(`/${routePath!}`)}`);
  console.log(`   Mode: ${options.mvc ? chalk.magenta('MVC Bridge') : chalk.blue('Standard')}`);
  console.log('');

  try {
    // Ensure page name ends with "Page"
    const pageClassName = pageName!.endsWith('Page') ? pageName! : `${pageName!}Page`;
    const controllerName = pageName!.replace(/Page$/, '') + 'Controller';
    const viewModelName = options.mvc ? pageName!.replace(/Page$/, '') + 'ViewModel' : null;

    // Create directories if they don't exist
    const controllersDir = path.join(projectPath, 'Controllers');
    const pagesDir = path.join(projectPath, 'Pages');
    const viewModelsDir = path.join(projectPath, 'ViewModels');

    await fs.mkdir(controllersDir, { recursive: true });
    await fs.mkdir(pagesDir, { recursive: true });
    if (options.mvc) {
      await fs.mkdir(viewModelsDir, { recursive: true });
    }

    // Extract project name from .csproj file
    const projectName = await getProjectName(projectPath);

    // Generate controller
    const controllerPath = path.join(controllersDir, `${controllerName}.cs`);
    const controllerContent = generateController(
      projectName,
      controllerName,
      pageClassName,
      routePath!,
      viewModelName
    );

    await fs.writeFile(controllerPath, controllerContent, 'utf-8');
    console.log(chalk.green(`   ✅ Created controller: ${path.relative(projectPath, controllerPath)}`));

    // Generate ViewModel if MVC mode
    if (options.mvc && viewModelName) {
      const viewModelPath = path.join(viewModelsDir, `${viewModelName}.cs`);
      const viewModelContent = generateViewModel(projectName, viewModelName);

      await fs.writeFile(viewModelPath, viewModelContent, 'utf-8');
      console.log(chalk.green(`   ✅ Created ViewModel: ${path.relative(projectPath, viewModelPath)}`));
    }

    // Generate Page (TSX)
    const pagePath = path.join(pagesDir, `${pageClassName}.tsx`);
    const pageContent = generatePage(pageClassName, options.mvc || false, viewModelName);

    await fs.writeFile(pagePath, pageContent, 'utf-8');
    console.log(chalk.green(`   ✅ Created page: ${path.relative(projectPath, pagePath)}`));

    // Transpile the page
    console.log(chalk.gray('   🔄 Transpiling page to C#...'));
    const transpiler = new TranspilerService();
    const result = await transpiler.transpileFile(pagePath);

    if (result.success) {
      console.log(chalk.green(`   ✅ Transpiled to C# in ${result.duration}ms`));
    } else {
      console.warn(chalk.yellow(`   ⚠️  Transpilation failed: ${result.error}`));
    }

    console.log(chalk.green.bold('\n✅ Page added successfully!'));
    console.log('');
    console.log(chalk.bold('Next steps:'));
    console.log(`   ${chalk.gray('•')} Edit ${chalk.cyan(path.relative(projectPath, pagePath))}`);
    if (options.mvc && viewModelName) {
      console.log(`   ${chalk.gray('•')} Update ${chalk.cyan(path.relative(projectPath, path.join(viewModelsDir, `${viewModelName}.cs`)))}`);
    }
    console.log(`   ${chalk.gray('•')} Run ${chalk.cyan('swig watch')} to auto-transpile changes`);
    console.log(`   ${chalk.gray('•')} Navigate to ${chalk.cyan(`http://localhost:5000/${routePath}`)}`);
  } catch (error) {
    console.error(chalk.red('❌ Failed to add page:'), error);
    throw error;
  }
}

/**
 * Get project name from .csproj file
 */
async function getProjectName(projectPath: string): Promise<string> {
  const entries = await fs.readdir(projectPath);
  const csprojFile = entries.find((f) => f.endsWith('.csproj'));

  if (csprojFile) {
    return path.basename(csprojFile, '.csproj');
  }

  return 'MyProject';
}

/**
 * Generate controller code
 */
function generateController(
  projectName: string,
  controllerName: string,
  pageClassName: string,
  routePath: string,
  viewModelName: string | null
): string {
  const hasParameters = routePath.includes('{');
  const paramMatch = routePath.match(/\{(\w+)\}/g);
  const parameters = paramMatch
    ? paramMatch.map((p) => p.replace(/[{}]/g, ''))
    : [];

  const methodSignature = parameters.length > 0
    ? `Details(${parameters.map((p) => `int ${p}`).join(', ')})`
    : 'Index()';

  // Special handling for root Index route
  const isRootIndex = routePath === '' || routePath === '/' || routePath.toLowerCase() === 'index';
  const routeAttribute = isRootIndex ? '[Route("")]' : `[Route("${routePath.split('/')[0]}")]`;
  const httpGetAttribute = isRootIndex
    ? '[HttpGet]'
    : (parameters.length > 0 ? `[HttpGet("${routePath.split('/').slice(1).join('/')}")]` : '[HttpGet]');

  if (viewModelName) {
    // MVC Bridge pattern
    return `using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;
using ${projectName}.ViewModels;

namespace ${projectName}.Controllers;

[ApiController]
${routeAttribute}
public class ${controllerName} : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;

    public ${controllerName}(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    ${httpGetAttribute}
    public async Task<IActionResult> ${methodSignature}
    {
        // TODO: Fetch data from database/service
        var viewModel = new ${viewModelName}
        {
            // TODO: Populate properties
        };

        return await _renderer.RenderPage<Minimact.Components.${pageClassName}>(
            viewModel: viewModel,
            pageTitle: "${pageClassName.replace(/([A-Z])/g, ' $1').trim()}"
        );
    }
}
`;
  } else {
    // Standard pattern (no ViewModel)
    return `using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;

namespace ${projectName}.Controllers;

[ApiController]
${routeAttribute}
public class ${controllerName} : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;

    public ${controllerName}(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    ${httpGetAttribute}
    public async Task<IActionResult> ${methodSignature}
    {
        return await _renderer.RenderPage<Minimact.Components.${pageClassName}>(
            pageTitle: "${pageClassName.replace(/([A-Z])/g, ' $1').trim()}"
        );
    }
}
`;
  }
}

/**
 * Generate ViewModel code
 */
function generateViewModel(projectName: string, viewModelName: string): string {
  return `using Minimact.AspNetCore.Attributes;

namespace ${projectName}.ViewModels;

public class ${viewModelName}
{
    // TODO: Add your properties here

    // Example immutable property (server authority):
    // public string Title { get; set; } = string.Empty;

    // Example mutable property (client can modify):
    // [Mutable]
    // public int Count { get; set; }
}
`;
}

/**
 * Generate Page (TSX) code
 */
function generatePage(
  pageClassName: string,
  useMvc: boolean,
  viewModelName: string | null
): string {
  if (useMvc && viewModelName) {
    return `import { useMvcViewModel } from '@minimact/mvc';
import { useState } from '@minimact/core';

interface ${viewModelName} {
  // TODO: Match your C# ViewModel properties
}

export function ${pageClassName}() {
  const viewModel = useMvcViewModel<${viewModelName}>();
  const [localState, setLocalState] = useState(0);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>${pageClassName.replace(/([A-Z])/g, ' $1').trim()}</h1>

      <p>TODO: Build your page here!</p>

      {/* Example: Access ViewModel data */}
      {/* <p>Data: {viewModel.someProperty}</p> */}

      {/* Example: Local state */}
      <button onClick={() => setLocalState(localState + 1)}>
        Clicked {localState} times
      </button>
    </div>
  );
}
`;
  } else {
    return `import { useState } from '@minimact/core';

export function ${pageClassName}() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>${pageClassName.replace(/([A-Z])/g, ' $1').trim()}</h1>

      <p>TODO: Build your page here!</p>

      {/* Example: Local state */}
      <button onClick={() => setCount(count + 1)}>
        Clicked {count} times
      </button>
    </div>
  );
}
`;
  }
}
