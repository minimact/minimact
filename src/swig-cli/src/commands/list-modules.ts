import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';

interface ListModulesOptions {
  project?: string;
}

interface ModuleInfo {
  name: string;
  version: string;
  description: string;
  main: string;
  size: number;
  type: 'module' | 'umd';
}

/**
 * List all installed modules in mact_modules/
 */
export async function listModulesCommand(options: ListModulesOptions = {}): Promise<void> {
  const projectRoot = options.project || process.cwd();
  const mactModulesDir = path.join(projectRoot, 'mact_modules');

  // Check if mact_modules/ exists
  if (!await directoryExists(mactModulesDir)) {
    console.log(chalk.yellow('\n⚠️  No mact_modules/ directory found.'));
    console.log(chalk.gray('   Run `swig init` to initialize modules.\n'));
    return;
  }

  // Scan for all package.json files
  const modules = await scanModules(mactModulesDir);

  if (modules.length === 0) {
    console.log(chalk.yellow('\n⚠️  No modules installed in mact_modules/'));
    console.log(chalk.gray('   Run `swig import <package>` to install modules.\n'));
    return;
  }

  // Calculate total size
  const totalSize = modules.reduce((sum, mod) => sum + mod.size, 0);

  // Display modules
  console.log(chalk.cyan(`\n📦 Installed modules in mact_modules/:\n`));

  // Group by @minimact and others
  const minimactModules = modules.filter(m => m.name.startsWith('@minimact/'));
  const externalModules = modules.filter(m => !m.name.startsWith('@minimact/'));

  if (minimactModules.length > 0) {
    console.log(chalk.cyan('  Minimact modules:'));
    for (const mod of minimactModules) {
      displayModule(mod);
    }
    console.log();
  }

  if (externalModules.length > 0) {
    console.log(chalk.cyan('  External libraries:'));
    for (const mod of externalModules) {
      displayModule(mod);
    }
    console.log();
  }

  console.log(chalk.gray(`  Total: ${modules.length} module(s), ${formatSize(totalSize)}\n`));
}

/**
 * Display a single module
 */
function displayModule(mod: ModuleInfo): void {
  const sizeStr = formatSize(mod.size).padEnd(10);
  const nameStr = `${mod.name}@${mod.version}`.padEnd(35);
  const typeTag = mod.type === 'module' ? chalk.blue('[ESM]') : chalk.green('[UMD]');

  console.log(chalk.gray('    •') + ` ${chalk.bold(nameStr)} ${typeTag} ${chalk.gray(sizeStr)}`);
  if (mod.description) {
    console.log(chalk.gray(`      ${mod.description}`));
  }
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

            // Calculate script file size
            const scriptPath = path.join(fullPath, pkgJson.main);
            let size = 0;
            if (await fileExists(scriptPath)) {
              const stats = await fs.stat(scriptPath);
              size = stats.size;
            }

            modules.push({
              name: pkgJson.name,
              version: pkgJson.version,
              description: pkgJson.description || '',
              main: pkgJson.main,
              size,
              type: pkgJson.type || 'umd'
            });
          } catch (error) {
            console.warn(chalk.yellow(`⚠️  Failed to read ${packageJsonPath}: ${(error as Error).message}`));
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
 * Format file size in human-readable format
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
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
