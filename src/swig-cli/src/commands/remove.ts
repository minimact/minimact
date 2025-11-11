import * as path from 'path';
import * as fs from 'fs/promises';
import prompts from 'prompts';
import chalk from 'chalk';

/**
 * Remove command - Remove a page and its controller
 */
export async function removeCommand(
  pageName?: string,
  options: {
    project?: string;
    force?: boolean;
  } = {}
): Promise<void> {
  const projectPath = options.project || process.cwd();

  // Interactive mode if pageName not provided
  if (!pageName) {
    console.log(chalk.bold.cyan('🗑️  Remove a page from your Minimact project\n'));

    // Scan for existing pages
    const pagesDir = path.join(projectPath, 'Pages');
    let existingPages: string[] = [];

    try {
      const files = await fs.readdir(pagesDir);
      existingPages = files
        .filter((f) => f.endsWith('.tsx'))
        .map((f) => f.replace('.tsx', ''));
    } catch {
      console.error(chalk.red('❌ Pages directory not found. Are you in a Minimact project?'));
      process.exit(1);
    }

    if (existingPages.length === 0) {
      console.error(chalk.red('❌ No pages found in the project.'));
      process.exit(1);
    }

    const answers = await prompts([
      {
        type: 'select',
        name: 'pageName',
        message: 'Select a page to remove:',
        choices: existingPages.map((p) => ({
          title: p,
          value: p
        }))
      },
      {
        type: 'confirm',
        name: 'confirmDelete',
        message: (prev: string) => `Are you sure you want to delete ${chalk.red(prev)}?`,
        initial: false
      }
    ]);

    // User cancelled
    if (!answers.pageName || !answers.confirmDelete) {
      console.log(chalk.yellow('\n❌ Cancelled'));
      process.exit(0);
    }

    pageName = answers.pageName;

    console.log('');
  } else if (!options.force) {
    // Confirm deletion if not using --force
    const { confirmDelete } = await prompts({
      type: 'confirm',
      name: 'confirmDelete',
      message: `Are you sure you want to delete ${chalk.red(pageName)}?`,
      initial: false
    });

    if (!confirmDelete) {
      console.log(chalk.yellow('\n❌ Cancelled'));
      process.exit(0);
    }
  }

  console.log(chalk.bold(`🗑️  Removing page: ${chalk.red(pageName!)}`));
  console.log('');

  try {
    // Ensure page name ends with "Page"
    const pageClassName = pageName!.endsWith('Page') ? pageName! : `${pageName!}Page`;
    const controllerName = pageName!.replace(/Page$/, '') + 'Controller';
    const viewModelName = pageName!.replace(/Page$/, '') + 'ViewModel';

    const pagesDir = path.join(projectPath, 'Pages');
    const controllersDir = path.join(projectPath, 'Controllers');
    const viewModelsDir = path.join(projectPath, 'ViewModels');

    let filesRemoved = 0;

    // Remove Page files (.tsx, .cs, .tsx.keys, .hooks.json, .templates.json, .structural-changes.json)
    const pageBasePath = path.join(pagesDir, pageClassName);
    const pageExtensions = ['.tsx', '.cs', '.tsx.keys', '.hooks.json', '.templates.json', '.structural-changes.json'];

    for (const ext of pageExtensions) {
      const filePath = pageBasePath + ext;
      try {
        await fs.unlink(filePath);
        console.log(chalk.gray(`   ✓ Removed ${path.relative(projectPath, filePath)}`));
        filesRemoved++;
      } catch {
        // File doesn't exist, skip
      }
    }

    // Remove Controller
    const controllerPath = path.join(controllersDir, `${controllerName}.cs`);
    try {
      await fs.unlink(controllerPath);
      console.log(chalk.gray(`   ✓ Removed ${path.relative(projectPath, controllerPath)}`));
      filesRemoved++;
    } catch {
      // File doesn't exist
    }

    // Remove ViewModel (if exists)
    const viewModelPath = path.join(viewModelsDir, `${viewModelName}.cs`);
    try {
      await fs.unlink(viewModelPath);
      console.log(chalk.gray(`   ✓ Removed ${path.relative(projectPath, viewModelPath)}`));
      filesRemoved++;
    } catch {
      // File doesn't exist
    }

    if (filesRemoved === 0) {
      console.log(chalk.yellow('   ⚠️  No files found to remove'));
    } else {
      console.log(chalk.green.bold(`\n✅ Removed ${filesRemoved} file(s) successfully!`));
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to remove page:'), error);
    throw error;
  }
}
