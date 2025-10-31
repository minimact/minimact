#!/usr/bin/env node

/**
 * Local Package Sync Script
 *
 * Syncs local packages to target projects' mact_modules directories.
 * This allows development without npm publish or npm link.
 *
 * Usage:
 *   node scripts/sync-local-packages.js              # Sync once
 *   node scripts/sync-local-packages.js --watch      # Watch mode
 *   node scripts/sync-local-packages.js --verbose    # Verbose output
 *   node scripts/sync-local-packages.js --build      # Force build
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chokidar = require('chokidar');

// Load configuration
const configPath = path.resolve(__dirname, '../sync-packages.config.js');
const config = require(configPath);

// Parse CLI arguments
const args = process.argv.slice(2);
const flags = {
  watch: args.includes('--watch') || args.includes('-w'),
  verbose: args.includes('--verbose') || args.includes('-v') || config.options.verbose,
  build: args.includes('--build') || args.includes('-b'),
  force: args.includes('--force') || args.includes('-f')
};

// Console helpers
const log = {
  info: (msg) => console.log(`\x1b[36mℹ\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`),
  error: (msg) => console.error(`\x1b[31m✗\x1b[0m ${msg}`),
  verbose: (msg) => flags.verbose && console.log(`\x1b[90m  ${msg}\x1b[0m`),
  header: (msg) => console.log(`\n\x1b[1m${msg}\x1b[0m`)
};

// Utility: Copy directory recursively with glob patterns
function copyDir(src, dest, include = ['**/*'], exclude = []) {
  const fg = require('fast-glob');

  // Ensure destination exists
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Find files matching include patterns, excluding exclude patterns
  const files = fg.sync(include, {
    cwd: src,
    ignore: exclude,
    dot: false
  });

  log.verbose(`Found ${files.length} files to copy`);

  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    // Create directory if needed
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Copy file
    fs.copyFileSync(srcPath, destPath);
    log.verbose(`Copied: ${file}`);
  }

  return files.length;
}

// Utility: Install dependencies in target directory
function installDependencies(targetPath, packageName) {
  const packageJsonPath = path.join(targetPath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    log.warn(`No package.json found at ${packageJsonPath}`);
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.peerDependencies };

  if (Object.keys(deps).length === 0) {
    log.verbose(`No dependencies to install for ${packageName}`);
    return;
  }

  log.info(`Installing dependencies for ${packageName}...`);

  try {
    execSync('npm install --production --no-save', {
      cwd: targetPath,
      stdio: flags.verbose ? 'inherit' : 'pipe'
    });
    log.success(`Dependencies installed for ${packageName}`);
  } catch (error) {
    log.error(`Failed to install dependencies for ${packageName}: ${error.message}`);
  }
}

// Build a package
function buildPackage(pkg) {
  if (!pkg.buildCommand) {
    log.verbose(`No build command for ${pkg.name}, skipping build`);
    return;
  }

  const sourcePath = path.resolve(__dirname, '..', pkg.source);

  if (!fs.existsSync(sourcePath)) {
    log.error(`Source path not found: ${sourcePath}`);
    return;
  }

  log.info(`Building ${pkg.name}...`);

  try {
    execSync(pkg.buildCommand, {
      cwd: sourcePath,
      stdio: flags.verbose ? 'inherit' : 'pipe'
    });
    log.success(`Built ${pkg.name}`);
  } catch (error) {
    log.error(`Build failed for ${pkg.name}: ${error.message}`);
    throw error;
  }
}

// Sync a single package to a target
function syncPackage(pkg, target) {
  const sourcePath = path.resolve(__dirname, '..', pkg.source);
  const [scope, name] = pkg.name.split('/');
  const targetPath = path.resolve(__dirname, '..', target.path, scope, name);

  log.verbose(`Source: ${sourcePath}`);
  log.verbose(`Target: ${targetPath}`);

  // Check if source exists
  if (!fs.existsSync(sourcePath)) {
    log.error(`Source not found: ${sourcePath}`);
    return false;
  }

  // Build if needed
  if ((config.options.autoBuild || flags.build) && pkg.buildCommand) {
    try {
      buildPackage(pkg);
    } catch (error) {
      return false;
    }
  }

  // Copy files
  log.info(`Syncing ${pkg.name} → ${target.name}...`);
  const fileCount = copyDir(sourcePath, targetPath, pkg.include, pkg.exclude);
  log.success(`Synced ${fileCount} files from ${pkg.name} → ${target.name}`);

  // Install dependencies if needed
  if ((config.options.autoInstallDeps || pkg.installDependencies)) {
    installDependencies(targetPath, pkg.name);
  }

  return true;
}

// Sync all configured packages
function syncAll() {
  log.header('🔄 Syncing Local Packages');

  let successCount = 0;
  let failCount = 0;

  for (const target of config.targets) {
    log.header(`📦 Target: ${target.name}`);

    for (const packageName of target.packages) {
      const pkg = config.packages.find(p => p.name === packageName);

      if (!pkg) {
        log.error(`Package not found in config: ${packageName}`);
        failCount++;
        continue;
      }

      if (syncPackage(pkg, target)) {
        successCount++;
      } else {
        failCount++;
      }
    }
  }

  log.header(`📊 Summary: ${successCount} synced, ${failCount} failed`);

  if (failCount > 0) {
    process.exit(1);
  }
}

// Watch mode
function watchMode() {
  log.header('👀 Watch Mode Enabled');
  log.info('Watching for changes...');

  // Initial sync
  syncAll();

  // Set up watchers for each package
  const watchers = [];

  for (const pkg of config.packages) {
    const sourcePath = path.resolve(__dirname, '..', pkg.source);

    const watcher = chokidar.watch(sourcePath, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**', // Don't watch dist, we'll rebuild on source changes
        ...pkg.exclude
      ],
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', (changedPath) => {
      log.info(`\n📝 Changed: ${path.relative(sourcePath, changedPath)}`);
      log.info(`Rebuilding ${pkg.name}...`);

      // Rebuild
      try {
        buildPackage(pkg);

        // Sync to all targets that need this package
        for (const target of config.targets) {
          if (target.packages.includes(pkg.name)) {
            syncPackage(pkg, target);
          }
        }
      } catch (error) {
        log.error(`Failed to rebuild: ${error.message}`);
      }
    });

    watchers.push(watcher);
    log.verbose(`Watching: ${sourcePath}`);
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log.header('\n👋 Stopping watchers...');
    watchers.forEach(w => w.close());
    process.exit(0);
  });
}

// Main
function main() {
  try {
    // Check if fast-glob is installed
    try {
      require('fast-glob');
    } catch (e) {
      log.error('Missing dependency: fast-glob');
      log.info('Run: npm install --save-dev fast-glob chokidar');
      process.exit(1);
    }

    if (flags.watch) {
      watchMode();
    } else {
      syncAll();
    }
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    if (flags.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
