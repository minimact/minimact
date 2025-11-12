import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import prompts from 'prompts';
import ora from 'ora';

interface UninstallOptions {
  force?: boolean;
  project?: string;
}

/**
 * Uninstall a module from mact_modules/
 */
export async function uninstallCommand(packageName: string, options: UninstallOptions = {}): Promise<void> {
  const projectRoot = options.project || process.cwd();
  const mactModulesDir = path.join(projectRoot, 'mact_modules');

  console.log(chalk.cyan(`\n🗑️  Uninstalling ${chalk.bold(packageName)}...\n`));

  // Check if mact_modules/ exists
  if (!await directoryExists(mactModulesDir)) {
    console.log(chalk.yellow('⚠️  No mact_modules/ directory found.'));
    console.log(chalk.gray('   Nothing to uninstall.\n'));
    return;
  }

  // Determine package directory (handle scoped packages like @minimact/power)
  const packageSubPath = packageName.startsWith('@')
    ? packageName.split('/').join(path.sep)
    : packageName;

  const packageDir = path.join(mactModulesDir, packageSubPath);

  // Check if module is installed
  if (!await directoryExists(packageDir)) {
    console.log(chalk.yellow(`⚠️  ${packageName} is not installed.`));
    console.log(chalk.gray('   Use `swig list` to see installed modules.\n'));
    return;
  }

  // Read package.json for version info
  let version = 'unknown';
  try {
    const pkgJson = JSON.parse(
      await fs.readFile(path.join(packageDir, 'package.json'), 'utf-8')
    );
    version = pkgJson.version;
  } catch {
    // Ignore if can't read package.json
  }

  // Confirm deletion (unless --force)
  if (!options.force) {
    const { shouldUninstall } = await prompts({
      type: 'confirm',
      name: 'shouldUninstall',
      message: `Remove ${packageName}@${version} from mact_modules/?`,
      initial: false
    });

    if (!shouldUninstall) {
      console.log(chalk.gray('\nAborted.\n'));
      return;
    }
  }

  // Remove the module directory
  const spinner = ora(`Removing ${packageName}...`).start();

  try {
    await fs.rm(packageDir, { recursive: true, force: true });

    // Clean up empty parent directories (for scoped packages)
    if (packageName.startsWith('@')) {
      const scopeDir = path.join(mactModulesDir, packageName.split('/')[0]);
      const remaining = await fs.readdir(scopeDir);

      // If scope directory is empty, remove it
      if (remaining.length === 0) {
        await fs.rm(scopeDir, { recursive: true, force: true });
      }
    }

    spinner.succeed(`Removed ${packageName}@${version}`);

    console.log(chalk.green(`\n✅ Successfully uninstalled ${chalk.bold(packageName)}`));
    console.log(chalk.gray('   Use `swig list` to view remaining modules\n'));

  } catch (error) {
    spinner.fail('Failed to uninstall module');
    console.error(chalk.red(`\n❌ Error: ${(error as Error).message}\n`));
    process.exit(1);
  }
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
