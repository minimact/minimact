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
 *   node scripts/sync-local-packages.js --zip        # Create mact_modules.zip
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
  force: args.includes('--force') || args.includes('-f'),
  zip: args.includes('--zip') || args.includes('-z')
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
  // Package-specific setting takes precedence over global option
  const shouldInstall = pkg.installDependencies !== undefined
    ? pkg.installDependencies
    : config.options.autoInstallDeps;

  if (shouldInstall) {
    installDependencies(targetPath, pkg.name);
  }

  return true;
}

// Special: Copy client runtime to Electron app resources
function syncClientRuntimeToElectron() {
  const clientRuntimeSource = path.resolve(__dirname, '../src/client-runtime/dist/core.min.js');
  const electronResourceDest = path.resolve(__dirname, '../src/minimact-swig-electron/resources/minimact.js');

  // Create resources directory if it doesn't exist
  const resourcesDir = path.dirname(electronResourceDest);
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }

  if (!fs.existsSync(clientRuntimeSource)) {
    log.warn('Client runtime not built yet, skipping Electron resource copy');
    return false;
  }

  try {
    fs.copyFileSync(clientRuntimeSource, electronResourceDest);
    log.success('Copied client runtime to Electron resources');
    return true;
  } catch (error) {
    log.error(`Failed to copy client runtime to Electron: ${error.message}`);
    return false;
  }
}

// Create a zip file of mact_modules
function createMactModulesZip() {
  log.header('📦 Creating mact_modules.zip');

  // Create a temporary directory for mact_modules
  const tempDir = path.resolve(__dirname, '../dist/zip/mact_modules');
  const zipDir = path.resolve(__dirname, '../dist/zip');

  // Ensure directories exist
  if (!fs.existsSync(zipDir)) {
    fs.mkdirSync(zipDir, { recursive: true });
  }

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const zipPath = path.resolve(zipDir, 'mact_modules.zip');

  log.info(`Building mact_modules in: ${tempDir}`);
  log.info(`Output zip: ${zipPath}`);

  // Copy all packages to the temp directory
  log.info('Copying packages to temp directory...');
  let totalFiles = 0;

  for (const pkg of config.packages) {
    const sourcePath = path.resolve(__dirname, '..', pkg.source);
    const [scope, name] = pkg.name.split('/');
    const targetPath = path.join(tempDir, scope, name);

    if (!fs.existsSync(sourcePath)) {
      log.warn(`Source not found for ${pkg.name}, skipping`);
      continue;
    }

    log.verbose(`Copying ${pkg.name}...`);
    const fileCount = copyDir(sourcePath, targetPath, pkg.include, pkg.exclude);
    totalFiles += fileCount;
    log.verbose(`  ${fileCount} files copied`);
  }

  log.success(`Copied ${totalFiles} files from ${config.packages.length} packages`);

  try {
    const archiver = require('archiver');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle stream events
    output.on('close', () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      log.success(`Created mact_modules.zip (${sizeInMB} MB)`);
      log.info(`Total bytes: ${archive.pointer()}`);
      log.info(`Location: ${zipPath}`);
    });

    archive.on('error', (err) => {
      throw err;
    });

    // Pipe archive to output file
    archive.pipe(output);

    // Add the entire temp mact_modules directory
    archive.directory(tempDir, 'mact_modules');

    // Add a README
    const readme = `# Minimact Client Modules

This archive contains pre-built Minimact client-side modules.

## Installation

Extract this archive to your project root:

\`\`\`bash
# Windows
tar -xf mact_modules.zip

# Linux/Mac
unzip mact_modules.zip
\`\`\`

Or clone directly from GitHub:

\`\`\`bash
git clone https://github.com/minimact/mact-modules mact_modules
\`\`\`

## Contents

- @minimact/core - Core runtime (12.0 KB with SignalM WebSocket)
- @minimact/core/r - Full SignalR with fallbacks (23.94 KB)
- @minimact/core/power - Advanced hooks (useServerTask, useComputed, etc.)
- @minimact/core/hot-reload - Development tools

## Usage

Reference in your ASP.NET Core application:

\`\`\`csharp
// Program.cs
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "mact_modules")),
    RequestPath = "/mact_modules"
});
\`\`\`

Generated by: minimact/sync-local-packages
Version: ${new Date().toISOString()}
`;

    archive.append(readme, { name: 'README.md' });

    // Finalize the archive
    archive.finalize();

    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      log.error('Missing dependency: archiver');
      log.info('Run: npm install --save-dev archiver');
      return false;
    }
    log.error(`Failed to create zip: ${error.message}`);
    return false;
  }
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

  // Special: Copy client runtime to Electron app resources
  if (syncClientRuntimeToElectron()) {
    successCount++;
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
    } else if (flags.zip) {
      // Build packages first if needed
      if (config.options.autoBuild || flags.build) {
        for (const pkg of config.packages) {
          if (pkg.buildCommand) {
            try {
              buildPackage(pkg);
            } catch (error) {
              log.error(`Build failed for ${pkg.name}, skipping`);
            }
          }
        }
      }
      // Create the zip
      createMactModulesZip();
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
