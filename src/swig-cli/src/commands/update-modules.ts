import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import prompts from 'prompts';
import { importCommand } from './import';

interface UpdateModulesOptions {
  all?: boolean;
  project?: string;
}

interface ModuleInfo {
  name: string;
  version: string;
  path: string;
}

/**
 * Update modules in mact_modules/
 */
export async function updateModulesCommand(packageName?: string, options: UpdateModulesOptions = {}): Promise<void> {
  const projectRoot = options.project || process.cwd();
  const mactModulesDir = path.join(projectRoot, 'mact_modules');

  console.log(chalk.cyan('\n🔄 Update modules\n'));

  // Check if mact_modules/ exists
  if (!await directoryExists(mactModulesDir)) {
    console.log(chalk.yellow('⚠️  No mact_modules/ directory found.'));
    console.log(chalk.gray('   Run `swig init` to initialize modules.\n'));
    return;
  }

  // Scan installed modules
  const installedModules = await scanModules(mactModulesDir);

  if (installedModules.length === 0) {
    console.log(chalk.yellow('⚠️  No modules installed in mact_modules/'));
    console.log(chalk.gray('   Run `swig import <package>` to install modules.\n'));
    return;
  }

  let modulesToUpdate: ModuleInfo[] = [];

  if (options.all) {
    // Update all modules
    modulesToUpdate = installedModules;
    console.log(chalk.cyan(`Updating all ${installedModules.length} module(s)...\n`));

  } else if (packageName) {
    // Update specific module
    const module = installedModules.find(m => m.name === packageName);

    if (!module) {
      console.log(chalk.yellow(`⚠️  ${packageName} is not installed.`));
      console.log(chalk.gray('   Use `swig list` to see installed modules.\n'));
      return;
    }

    modulesToUpdate = [module];
    console.log(chalk.cyan(`Updating ${packageName}...\n`));

  } else {
    // Interactive selection
    console.log(chalk.gray('Installed modules:\n'));

    const { selectedModules } = await prompts({
      type: 'multiselect',
      name: 'selectedModules',
      message: 'Select modules to update:',
      choices: installedModules.map(mod => ({
        title: `${mod.name}@${mod.version}`,
        value: mod.name,
        selected: false
      })),
      hint: 'Space to select, Enter to confirm',
      instructions: false
    });

    if (!selectedModules || selectedModules.length === 0) {
      console.log(chalk.yellow('\n⚠️  No modules selected. Exiting.\n'));
      return;
    }

    modulesToUpdate = installedModules.filter(m => selectedModules.includes(m.name));
    console.log();
  }

  // Update each selected module
  let successCount = 0;
  let failCount = 0;

  for (const module of modulesToUpdate) {
    try {
      console.log(chalk.cyan(`\n📦 Updating ${module.name}@${module.version}...`));
      await importCommand(module.name, { project: projectRoot, force: true });
      successCount++;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to update ${module.name}: ${(error as Error).message}`));
      failCount++;
    }
  }

  // Summary
  console.log(chalk.cyan('\n' + '━'.repeat(50)));
  if (successCount > 0) {
    console.log(chalk.green(`\n✅ Successfully updated ${successCount} module(s)`));
  }
  if (failCount > 0) {
    console.log(chalk.red(`❌ Failed to update ${failCount} module(s)`));
  }

  console.log(chalk.gray('\n   Use `swig list` to view updated modules\n'));
}

/**
 * Scan mact_modules/ for all installed modules
 */
async function scanModules(mactModulesDir: string): Promise<ModuleInfo[]> {
  const modules: ModuleInfo[] = [];

  async function scanDirectory(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Check if this directory has a package.json
        const packageJsonPath = path.join(fullPath, 'package.json');

        if (await fileExists(packageJsonPath)) {
          try {
            const pkgJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

            modules.push({
              name: pkgJson.name,
              version: pkgJson.version,
              path: fullPath
            });
          } catch (error) {
            // Ignore modules with invalid package.json
          }
        } else {
          // Recursively scan subdirectories (for scoped packages like @minimact/*)
          await scanDirectory(fullPath);
        }
      }
    }
  }

  await scanDirectory(mactModulesDir);

  // Sort: @minimact modules first, then alphabetically
  modules.sort((a, b) => {
    const aIsMinimact = a.name.startsWith('@minimact/');
    const bIsMinimact = b.name.startsWith('@minimact/');

    if (aIsMinimact && !bIsMinimact) return -1;
    if (!aIsMinimact && bIsMinimact) return 1;

    return a.name.localeCompare(b.name);
  });

  return modules;
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

/**
 * Check if file exists
 */
async function fileExists(file: string): Promise<boolean> {
  try {
    const stats = await fs.stat(file);
    return stats.isFile();
  } catch {
    return false;
  }
}
