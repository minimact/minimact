import * as path from 'path';
import { ProjectManager } from '@minimact/swig-shared';
import * as os from 'os';
import prompts from 'prompts';
import chalk from 'chalk';

const TEMPLATES = [
  {
    value: 'Counter',
    title: 'Counter',
    description: 'Simple counter app with useState'
  },
  {
    value: 'TodoList',
    title: 'Todo List',
    description: 'Todo list app with add/delete/toggle'
  },
  {
    value: 'Dashboard',
    title: 'Dashboard',
    description: 'Dashboard with charts (BarChart, LineChart, PieChart, AreaChart)'
  },
  {
    value: 'MVC',
    title: 'MVC Bridge',
    description: 'MVC Bridge pattern with ViewModels (useMvcState, useMvcViewModel)'
  },
  {
    value: 'MVC-Dashboard',
    title: 'MVC Dashboard',
    description: 'MVC Bridge + Dashboard with charts'
  },
  {
    value: 'SPA',
    title: 'SPA (Single Page Application)',
    description: 'Full SPA with shells, pages, instant navigation, and shell persistence'
  },
  {
    value: 'Electron-FileManager',
    title: 'Electron File Manager',
    description: 'Desktop file manager with Electron + Minimact'
  }
];

/**
 * New command - Create a new Minimact project
 */
export async function newCommand(
  template?: string,
  name?: string,
  options: {
    tailwind?: boolean;
    solution?: boolean;
    hooks?: string;
  } = {}
): Promise<void> {
  // Interactive mode if template or name not provided
  if (!template || !name) {
    console.log(chalk.bold.cyan('✨ Create a new Minimact project\n'));

    const answers = await prompts([
      {
        type: !name ? 'text' : null,
        name: 'projectName',
        message: 'Project name (use PascalCase or underscores, no dashes):',
        initial: 'MyMinimactApp',
        validate: (value: string) => {
          if (value.length === 0) return 'Project name is required';
          if (/[^a-zA-Z0-9_]/.test(value)) {
            return 'Project name can only contain letters, numbers, and underscores (no dashes or spaces)';
          }
          if (/^\d/.test(value)) {
            return 'Project name cannot start with a number';
          }
          return true;
        }
      },
      {
        type: !template ? 'select' : null,
        name: 'projectTemplate',
        message: 'Select a template:',
        choices: TEMPLATES,
        initial: 0
      },
      {
        type: 'confirm',
        name: 'enableTailwind',
        message: 'Enable Tailwind CSS?',
        initial: options.tailwind || false
      },
      {
        type: 'confirm',
        name: 'createSolution',
        message: 'Create Visual Studio solution file (.sln)?',
        initial: options.solution !== false
      },
      {
        type: 'multiselect',
        name: 'selectedHooks',
        message: 'Select hook examples to include (optional):',
        choices: [
          { title: 'useState', value: 'useState' },
          { title: 'useEffect', value: 'useEffect' },
          { title: 'useRef', value: 'useRef' },
          { title: 'useMvcState', value: 'useMvcState' },
          { title: 'useMvcViewModel', value: 'useMvcViewModel' }
        ],
        hint: '- Space to select. Return to submit'
      }
    ]);

    // User cancelled
    if (!answers.projectName && !name) {
      console.log(chalk.yellow('\n❌ Cancelled'));
      process.exit(0);
    }

    // Use answers or fallback to provided arguments
    name = name || answers.projectName;
    template = template || answers.projectTemplate;
    options.tailwind = answers.enableTailwind;
    options.solution = answers.createSolution;

    if (answers.selectedHooks && answers.selectedHooks.length > 0) {
      options.hooks = answers.selectedHooks.join(',');
    }

    console.log('');
  }

  // Validate project name for C# compatibility
  if (/[^a-zA-Z0-9_]/.test(name!)) {
    console.error(chalk.red('❌ Invalid project name!'));
    console.error(chalk.yellow(`   Project name "${name}" contains invalid characters.`));
    console.error(chalk.gray('   Use PascalCase or underscores (e.g., MyApp, My_App)'));
    console.error(chalk.gray('   Avoid dashes, spaces, or special characters'));
    process.exit(1);
  }

  if (/^\d/.test(name!)) {
    console.error(chalk.red('❌ Invalid project name!'));
    console.error(chalk.yellow(`   Project name "${name}" cannot start with a number.`));
    console.error(chalk.gray('   Use a name like "MyApp123" instead of "123MyApp"'));
    process.exit(1);
  }

  console.log(chalk.bold(`📦 Creating new Minimact project: ${chalk.cyan(name!)}`));
  console.log(`   Template: ${chalk.green(template!)}`);

  const projectPath = path.join(process.cwd(), name!);

  // Parse hooks option
  const selectedHooks = options.hooks ? options.hooks.split(',').map((h) => h.trim()) : [];

  try {
    // Create ProjectManager instance (use temp directory for user data)
    const projectManager = new ProjectManager(os.tmpdir());

    // Create project
    const project = await projectManager.createProject(projectPath, template!, {
      createSolution: options.solution !== false,
      enableTailwind: options.tailwind || false,
      selectedHooks
    });

    console.log(chalk.green.bold('\n✅ Project created successfully!'));
    console.log(`   ${chalk.gray('Path:')} ${chalk.cyan(project.path)}`);
    console.log(`   ${chalk.gray('Port:')} ${chalk.cyan(project.port)}`);
    console.log('');
    console.log(chalk.bold('Next steps:'));
    console.log(`   ${chalk.cyan(`cd ${name}`)}`);
    console.log(`   ${chalk.cyan('swig watch')}     ${chalk.gray('# Watch for TSX changes and auto-transpile')}`);
    console.log(`   ${chalk.cyan('swig run')}       ${chalk.gray('# Run the application')}`);
    console.log('');
    console.log(chalk.bold('Or use the Swig GUI:'));
    console.log(`   ${chalk.cyan('swig launch')}`);
  } catch (error) {
    console.error(chalk.red('❌ Failed to create project:'), error);
    throw error;
  }
}
