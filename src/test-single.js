#!/usr/bin/env node

/**
 * Test single JSX file - transpile to C# and display output
 * Usage: node test-single.js <filename.jsx>
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
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function transpileComponent(jsxPath) {
  return new Promise((resolve, reject) => {
    const babelPluginDir = path.join(__dirname, 'babel-plugin-minimact');

    const nodeScript = `
      const babel = require('@babel/core');
      const fs = require('fs');
      const path = require('path');

      const code = fs.readFileSync('${jsxPath.replace(/\\/g, '\\\\')}', 'utf-8');
      const filename = '${path.basename(jsxPath)}';

      // Suppress console logs from Babel plugin
      const originalLog = console.log;
      console.log = () => {};

      const result = babel.transformSync(code, {
        presets: ['@babel/preset-typescript', '@babel/preset-react'],
        plugins: ['./index.cjs'],
        filename: filename
      });

      // Restore console.log
      console.log = originalLog;

      // The C# code is in metadata
      const csharpCode = result.metadata?.minimactCSharp || result.code;

      // Templates are written to file - read them
      // The babel plugin uses the component NAME (not filename) for templates
      // Extract component name from C# code: "public partial class ComponentName"
      let templatesJson = null;
      let sourceMapJson = null;
      const componentNameMatch = csharpCode.match(/(?:public )?(?:partial )?class (\\w+)/);

      if (componentNameMatch) {
        const componentName = componentNameMatch[1];
        const templatesPath = path.join(__dirname, componentName + '.templates.json');
        const sourceMapPath = path.join(__dirname, componentName + '.sourcemap.json');

        try {
          if (fs.existsSync(templatesPath)) {
            templatesJson = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
          }
        } catch (err) {
          // Templates file not found or invalid
        }

        try {
          if (fs.existsSync(sourceMapPath)) {
            sourceMapJson = JSON.parse(fs.readFileSync(sourceMapPath, 'utf-8'));
          }
        } catch (err) {
          // Source map file not found or invalid
        }
      }

      // Output all as JSON so we can parse them
      console.log(JSON.stringify({ csharpCode, templatesJson, sourceMapJson }));
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
          reject(new Error(`Failed to parse output: ${err.message}`));
        }
      } else {
        reject(new Error(`Babel failed: ${stderr}`));
      }
    });

    proc.on('error', reject);
  });
}

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    log('Usage: node test-single.js <path-to-file.tsx>', colors.red);
    log('Example: node test-single.js Counter.jsx', colors.cyan);
    log('Example: node test-single.js ../test-tsx/01-ComplexTemplateLiterals.tsx', colors.cyan);
    process.exit(1);
  }

  // Support both relative and absolute paths
  let jsxPath;
  if (path.isAbsolute(inputPath)) {
    jsxPath = inputPath;
  } else if (inputPath.includes('/') || inputPath.includes('\\')) {
    // Path with directory separator - resolve relative to current directory
    jsxPath = path.resolve(__dirname, inputPath);
  } else {
    // Just a filename - look in fixtures folder
    jsxPath = path.join(__dirname, 'fixtures', inputPath);
  }

  if (!fs.existsSync(jsxPath)) {
    log(`Error: File not found: ${jsxPath}`, colors.red);
    process.exit(1);
  }

  const filename = path.basename(jsxPath);

  log(`\n╔═══════════════════════════════════════════════════╗`, colors.cyan);
  log(`║   Testing: ${filename.padEnd(36)}║`, colors.cyan);
  log(`╚═══════════════════════════════════════════════════╝\n`, colors.cyan);

  try {
    log(`Transpiling ${filename}...`, colors.yellow);
    const result = await transpileComponent(jsxPath);
    const { csharpCode, templatesJson, sourceMapJson } = result;

    log(`\n✓ Transpiled successfully\n`, colors.green);

    // Display C# code
    log(`Generated C# code:\n`, colors.cyan);
    log(`${'='.repeat(80)}`, colors.cyan);

    // Add line numbers
    const lines = csharpCode.split('\n');
    lines.forEach((line, idx) => {
      const lineNum = String(idx + 1).padStart(4, ' ');
      console.log(`${colors.yellow}${lineNum}${colors.reset} ${line}`);
    });

    log(`${'='.repeat(80)}\n`, colors.cyan);
    log(`✓ Total lines: ${lines.length}`, colors.green);

    // Write C# code to output file with proper wrapping for compilation
    const outputFilename = filename.replace(/\.(jsx|tsx)$/, '.cs');
    const outputPath = path.join(__dirname, 'test-output', outputFilename);

    // Create test-output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Wrap C# code in namespace and add using statements for compilation
    const componentName = filename.replace(/\.(jsx|tsx)$/, '');

    // Strip out the babel plugin's own using statements and namespace declaration
    let cleanedCode = csharpCode;

    // Remove using statements at the beginning
    cleanedCode = cleanedCode.replace(/^using [^;]+;[\r\n]*/gm, '');

    // Remove file-scoped namespace declaration
    cleanedCode = cleanedCode.replace(/namespace [^;]+;[\r\n]*/g, '');

    // Remove empty lines at the beginning
    cleanedCode = cleanedCode.replace(/^[\r\n]+/, '');

    const compilableCode = `using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Rendering;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;

namespace MinimactTest.Components
{
${cleanedCode}
}
`;

    fs.writeFileSync(outputPath, compilableCode, 'utf-8');
    log(`\n✓ Wrote C# output to: ${outputPath}`, colors.green);

    // Try to compile the C# code
    log(`\nCompiling C# code...`, colors.yellow);
    try {
      const compileResult = await new Promise((resolve, reject) => {
        const dotnetProc = spawn('dotnet', ['build', outputDir], {
          cwd: __dirname,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let compileStdout = '';
        let compileStderr = '';

        dotnetProc.stdout.on('data', (data) => {
          compileStdout += data.toString();
        });

        dotnetProc.stderr.on('data', (data) => {
          compileStderr += data.toString();
        });

        dotnetProc.on('close', (code) => {
          resolve({ code, stdout: compileStdout, stderr: compileStderr });
        });

        dotnetProc.on('error', reject);
      });

      if (compileResult.code === 0) {
        log(`✓ C# compilation successful!`, colors.green);
      } else {
        log(`✗ C# compilation failed:`, colors.red);
        console.log(compileResult.stdout);
        console.log(compileResult.stderr);
      }
    } catch (compileErr) {
      log(`⚠ Could not compile C# code: ${compileErr.message}`, colors.yellow);
    }

    // Display Templates JSON
    if (templatesJson) {
      log(`\n${'━'.repeat(80)}`, colors.cyan);
      log(`\nGenerated Templates JSON:\n`, colors.cyan);
      log(`${'='.repeat(80)}`, colors.cyan);

      // Pretty print JSON with syntax highlighting
      const formattedJson = JSON.stringify(templatesJson, null, 2);
      const jsonLines = formattedJson.split('\n');
      jsonLines.forEach((line, idx) => {
        const lineNum = String(idx + 1).padStart(4, ' ');
        console.log(`${colors.yellow}${lineNum}${colors.reset} ${line}`);
      });

      log(`${'='.repeat(80)}\n`, colors.cyan);
      log(`✓ Template count: ${Object.keys(templatesJson.templates || {}).length}`, colors.green);

      // Write Templates JSON to output file
      const templatesOutputFilename = filename.replace(/\.(jsx|tsx)$/, '.templates.json');
      const templatesOutputPath = path.join(__dirname, 'test-output', templatesOutputFilename);
      fs.writeFileSync(templatesOutputPath, JSON.stringify(templatesJson, null, 2), 'utf-8');
      log(`✓ Wrote templates JSON to: ${templatesOutputPath}`, colors.green);

      // Show template types breakdown
      if (templatesJson.templates) {
        const types = {};
        for (const template of Object.values(templatesJson.templates)) {
          types[template.type] = (types[template.type] || 0) + 1;
        }
        log(`✓ Template types:`, colors.green);
        for (const [type, count] of Object.entries(types)) {
          log(`  - ${type}: ${count}`, colors.green);
        }
      }
    } else {
      log(`\n⚠ No templates JSON generated`, colors.yellow);
    }

    // Display Source Map JSON
    if (sourceMapJson) {
      log(`\n${'━'.repeat(80)}`, colors.cyan);
      log(`\nGenerated Source Map JSON:\n`, colors.cyan);
      log(`${'='.repeat(80)}`, colors.cyan);

      // Pretty print JSON with syntax highlighting
      const formattedJson = JSON.stringify(sourceMapJson, null, 2);
      const jsonLines = formattedJson.split('\n');
      jsonLines.forEach((line, idx) => {
        const lineNum = String(idx + 1).padStart(4, ' ');
        console.log(`${colors.yellow}${lineNum}${colors.reset} ${line}`);
      });

      log(`${'='.repeat(80)}\n`, colors.cyan);

      // Write Source Map JSON to output file
      const sourceMapOutputFilename = filename.replace(/\.(jsx|tsx)$/, '.sourcemap.json');
      const sourceMapOutputPath = path.join(__dirname, 'test-output', sourceMapOutputFilename);
      fs.writeFileSync(sourceMapOutputPath, JSON.stringify(sourceMapJson, null, 2), 'utf-8');
      log(`✓ Wrote source map JSON to: ${sourceMapOutputPath}`, colors.green);

      // Count nodes and text nodes
      function countNodes(node) {
        let count = 1;
        let textCount = node.tagName === '#text' ? 1 : 0;
        for (const child of node.children || []) {
          const childCounts = countNodes(child);
          count += childCounts.total;
          textCount += childCounts.text;
        }
        return { total: count, text: textCount };
      }

      const counts = countNodes(sourceMapJson.rootNode);
      log(`✓ Total nodes: ${counts.total}`, colors.green);
      log(`✓ Text nodes (with length): ${counts.text}`, colors.green);
    } else {
      log(`\n⚠ No source map JSON generated`, colors.yellow);
    }

  } catch (err) {
    log(`\n✗ Failed: ${err.message}`, colors.red);
    process.exit(1);
  }
}

main().catch(err => {
  log(`\nFatal error: ${err.message}`, colors.red);
  console.error(err.stack);
  process.exit(1);
});
