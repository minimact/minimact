#!/usr/bin/env node

/**
 * Transpile all TSX files in a project
 * Usage: node transpile-project.js <project-path> [--clean]
 * Example: node transpile-project.js ../examples/CounterWithDebug
 * Example: node transpile-project.js ../examples/CounterWithDebug --clean
 *
 * Options:
 *   --clean  Delete all generated files (.cs, .json, .keys) before transpiling
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Recursively find all .tsx files in a directory
 */
function findTsxFiles(dir) {
  const results = [];

  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, bin, obj, .git, etc.
        if (!['node_modules', 'bin', 'obj', '.git', '.vs', 'Generated'].includes(entry.name)) {
          scan(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
        results.push(fullPath);
      }
    }
  }

  scan(dir);
  return results;
}

/**
 * Delete all generated files for a TSX file
 */
function cleanGeneratedFiles(tsxPath) {
  const dir = path.dirname(tsxPath);
  const baseName = path.basename(tsxPath, '.tsx');

  const filesToDelete = [
    path.join(dir, `${baseName}.cs`),
    path.join(dir, `${baseName}.templates.json`),
    path.join(dir, `${baseName}.hooks.json`),
    path.join(dir, `${baseName}.structural-changes.json`),
    path.join(dir, `${baseName}.tsx.keys`)
  ];

  let deletedCount = 0;
  for (const file of filesToDelete) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * Transpile a single TSX file to C#
 */
async function transpileTsx(tsxPath, outputDir) {
  return new Promise((resolve, reject) => {
    const babelPluginDir = path.join(__dirname, 'babel-plugin-minimact');

    const nodeScript = `
      const babel = require('@babel/core');
      const fs = require('fs');
      const path = require('path');

      const code = fs.readFileSync('${tsxPath.replace(/\\/g, '\\\\')}', 'utf-8');
      const filename = '${tsxPath.replace(/\\/g, '\\\\')}';

      // Suppress console logs from Babel plugin
      const originalLog = console.log;
      console.log = (...args) => {
        if (args[0] && args[0].includes('[DEBUG]')) {
          originalLog(...args);
        }
      };

      const result = babel.transformSync(code, {
        presets: ['@babel/preset-typescript'],
        plugins: ['./index-full.cjs'],
        filename: filename
      });

      console.log = originalLog;

      const csharpCode = result.metadata?.minimactCSharp || result.code;

      // Extract component name and read templates
      let templatesJson = null;
      const componentNameMatch = csharpCode.match(/(?:public )?(?:partial )?class (\\w+)/);

      if (componentNameMatch) {
        const componentName = componentNameMatch[1];
        const templatesPath = path.join(__dirname, componentName + '.templates.json');

        try {
          if (fs.existsSync(templatesPath)) {
            templatesJson = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
          }
        } catch (err) {
          // Templates file not found
        }
      }

      console.log(JSON.stringify({ csharpCode, templatesJson }));
    `;

    const proc = spawn('node', ['-e', nodeScript], {
      cwd: babelPluginDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const output = JSON.parse(stdout);
          resolve(output);
        } catch (err) {
          reject(new Error(`Failed to parse output for ${tsxPath}: ${err.message}`));
        }
      } else {
        reject(new Error(`Babel failed for ${tsxPath}: ${stderr}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Write C# file with proper namespace and using statements
 */
function writeCSharpFile(tsxPath, csharpCode, projectRoot) {
  const filename = path.basename(tsxPath);
  const tsxDir = path.dirname(tsxPath);

  // Clean the generated code
  let cleanedCode = csharpCode;
  cleanedCode = cleanedCode.replace(/^using [^;]+;[\r\n]*/gm, '');
  cleanedCode = cleanedCode.replace(/namespace [^;]+;[\r\n]*/g, '');
  cleanedCode = cleanedCode.replace(/^[\r\n]+/, '');

  // Determine namespace based on folder structure
  const folderName = path.basename(tsxDir);
  const projectName = path.basename(projectRoot);
  const namespace = `${projectName}.${folderName}`;

  const compilableCode = `using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Rendering;
using Minimact.AspNetCore.Extensions;
using Minimact.AspNetCore.SPA;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;

namespace ${namespace};

${cleanedCode}
`;

  const outputFilename = filename.replace(/\.tsx$/, '.cs');
  const outputPath = path.join(tsxDir, outputFilename);

  fs.writeFileSync(outputPath, compilableCode, 'utf-8');
  return outputPath;
}

async function main() {
  const args = process.argv.slice(2);
  const projectPath = args.find(arg => !arg.startsWith('--'));
  const cleanMode = args.includes('--clean');

  if (!projectPath) {
    log('Usage: node transpile-project.js <project-path> [--clean]', colors.red);
    log('Example: node transpile-project.js ../examples/CounterWithDebug', colors.cyan);
    log('Example: node transpile-project.js ../examples/CounterWithDebug --clean', colors.cyan);
    process.exit(1);
  }

  const absoluteProjectPath = path.resolve(__dirname, projectPath);

  if (!fs.existsSync(absoluteProjectPath)) {
    log(`Error: Project path not found: ${absoluteProjectPath}`, colors.red);
    process.exit(1);
  }

  log(`\n╔═══════════════════════════════════════════════════╗`, colors.cyan);
  log(`║   Transpiling Project: ${path.basename(absoluteProjectPath).padEnd(25)}║`, colors.cyan);
  if (cleanMode) {
    log(`║   Mode: CLEAN (deleting old files first)         ║`, colors.yellow);
  }
  log(`╚═══════════════════════════════════════════════════╝\n`, colors.cyan);

  // Find all TSX files
  log(`Scanning for .tsx files...`, colors.yellow);
  const tsxFiles = findTsxFiles(absoluteProjectPath);

  if (tsxFiles.length === 0) {
    log(`\n⚠ No .tsx files found in ${absoluteProjectPath}`, colors.yellow);
    process.exit(0);
  }

  log(`Found ${tsxFiles.length} .tsx file(s)\n`, colors.green);

  // Clean mode: delete all generated files first
  if (cleanMode) {
    log(`${'─'.repeat(60)}`, colors.yellow);
    log(`Cleaning generated files...`, colors.yellow);
    let totalDeleted = 0;
    for (const tsxPath of tsxFiles) {
      const deletedCount = cleanGeneratedFiles(tsxPath);
      if (deletedCount > 0) {
        const relativePath = path.relative(absoluteProjectPath, tsxPath);
        log(`  ✓ Deleted ${deletedCount} file(s) for: ${relativePath}`, colors.magenta);
        totalDeleted += deletedCount;
      }
    }
    log(`Total files deleted: ${totalDeleted}`, colors.magenta);
    log(`${'─'.repeat(60)}\n`, colors.yellow);
  }

  // Output to the same directory as the TSX files (in-place transpilation)
  const outputDir = absoluteProjectPath;

  let successCount = 0;
  let failCount = 0;

  // Transpile each file
  for (const tsxPath of tsxFiles) {
    const relativePath = path.relative(absoluteProjectPath, tsxPath);
    log(`\n${'─'.repeat(60)}`, colors.cyan);
    log(`Transpiling: ${relativePath}`, colors.yellow);

    try {
      const { csharpCode, templatesJson } = await transpileTsx(tsxPath, outputDir);

      // Write C# file
      const outputPath = writeCSharpFile(tsxPath, csharpCode, outputDir);
      log(`  ✓ C# written to: ${path.relative(absoluteProjectPath, outputPath)}`, colors.green);

      // Write templates JSON if exists
      if (templatesJson) {
        const templatesPath = outputPath.replace(/\.cs$/, '.templates.json');
        fs.writeFileSync(templatesPath, JSON.stringify(templatesJson, null, 2), 'utf-8');
        log(`  ✓ Templates written to: ${path.relative(absoluteProjectPath, templatesPath)}`, colors.green);
        log(`  ✓ Template count: ${Object.keys(templatesJson.templates || {}).length}`, colors.green);
      }

      successCount++;
    } catch (err) {
      log(`  ✗ Failed: ${err.message}`, colors.red);
      failCount++;
    }
  }

  // Summary
  log(`\n${'═'.repeat(60)}`, colors.cyan);
  log(`\nTranspilation Summary:`, colors.cyan);
  log(`  ✓ Success: ${successCount}`, colors.green);
  if (failCount > 0) {
    log(`  ✗ Failed: ${failCount}`, colors.red);
  }
  log(`  📁 Output directory: ${outputDir}`, colors.cyan);
  log(``);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  log(`\nFatal error: ${err.message}`, colors.red);
  console.error(err.stack);
  process.exit(1);
});
