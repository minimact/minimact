import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import prompts from 'prompts';
import ora from 'ora';
import { importCommand } from './import';

interface InitModulesOptions {
  project?: string;
}

/**
 * Available modules for initialization
 */
const AVAILABLE_MODULES = [
  {
    name: '@minimact/power',
    description: 'Advanced features (useServerTask, useComputed, usePaginatedServerTask)',
    recommended: true
  },
  {
    name: '@minimact/mvc',
    description: 'MVC Bridge (useMvcState, useMvcViewModel)',
    recommended: true
  },
  {
    name: '@minimact/punch',
    description: 'DOM element state tracking (useDomElementState)',
    recommended: false
  },
  {
    name: '@minimact/md',
    description: 'Markdown rendering (useMarkdown, useRazorMarkdown)',
    recommended: false
  },
  {
    name: 'lodash',
    description: 'Utility library for arrays, objects, strings, etc.',
    recommended: false
  },
  {
    name: 'moment',
    description: 'Date/time manipulation library',
    recommended: false
  },
  {
    name: 'dayjs',
    description: '2KB date library (Moment.js alternative)',
    recommended: false
  },
  {
    name: 'axios',
    description: 'Promise-based HTTP client',
    recommended: false
  },
  {
    name: 'chart.js',
    description: 'JavaScript charting library',
    recommended: false
  }
];

/**
 * Initialize mact_modules/ with interactive module selection
 */
export async function initModulesCommand(options: InitModulesOptions = {}): Promise<void> {
  const projectRoot = options.project || process.cwd();
  const mactModulesDir = path.join(projectRoot, 'mact_modules');

  console.log(chalk.cyan('\n📦 Initialize mact_modules/\n'));
  console.log(chalk.gray('Select modules to install in your project:\n'));

  // Check if mact_modules/ already exists
  if (await directoryExists(mactModulesDir)) {
    const { shouldContinue } = await prompts({
      type: 'confirm',
      name: 'shouldContinue',
      message: 'mact_modules/ already exists. Continue and add more modules?',
      initial: true
    });

    if (!shouldContinue) {
      console.log(chalk.gray('\nAborted.\n'));
      return;
    }

    console.log();
  }

  // Prompt for module selection
  const { selectedModules } = await prompts({
    type: 'multiselect',
    name: 'selectedModules',
    message: 'Select modules to install:',
    choices: AVAILABLE_MODULES.map(mod => ({
      title: `${mod.name} ${mod.recommended ? chalk.cyan('(recommended)') : ''}`,
      description: mod.description,
      value: mod.name,
      selected: mod.recommended
    })),
    hint: 'Space to select, Enter to confirm',
    instructions: false
  });

  if (!selectedModules || selectedModules.length === 0) {
    console.log(chalk.yellow('\n⚠️  No modules selected. Exiting.\n'));
    return;
  }

  console.log(chalk.cyan(`\n📦 Installing ${selectedModules.length} module(s)...\n`));

  // Install each selected module
  let successCount = 0;
  let failCount = 0;

  for (const moduleName of selectedModules) {
    try {
      await importCommand(moduleName, { project: projectRoot });
      successCount++;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to install ${moduleName}: ${(error as Error).message}`));
      failCount++;
    }
  }

  // Summary
  console.log(chalk.cyan('━'.repeat(50)));
  if (successCount > 0) {
    console.log(chalk.green(`\n✅ Successfully installed ${successCount} module(s)`));
  }
  if (failCount > 0) {
    console.log(chalk.red(`❌ Failed to install ${failCount} module(s)`));
  }

  console.log(chalk.gray(`\n📁 Modules installed in: ${mactModulesDir}`));
  console.log(chalk.gray('   Use `swig list` to view installed modules'));
  console.log(chalk.gray('   Use `swig import <package>` to add more modules\n'));
}

/**
 * Check if directory exists
 */
async function directoryExists(dir: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
