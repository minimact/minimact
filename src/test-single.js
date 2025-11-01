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
        plugins: ['./index-full.cjs'],
        filename: filename
      });

      // Restore console.log
      console.log = originalLog;

      // The C# code is in metadata
      const csharpCode = result.metadata?.minimactCSharp || result.code;

      // Templates are written to file - read them
      const componentName = filename.replace(/\\.(jsx|tsx)$/, '');
      const templatesPath = path.join(__dirname, componentName + '.templates.json');
      let templatesJson = null;

      try {
        if (fs.existsSync(templatesPath)) {
          templatesJson = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
        }
      } catch (err) {
        // Templates file not found or invalid
      }

      // Output both as JSON so we can parse them
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
  const filename = process.argv[2];

  if (!filename) {
    log('Usage: node test-single.js <filename.jsx>', colors.red);
    log('Example: node test-single.js Counter.jsx', colors.cyan);
    process.exit(1);
  }

  const jsxPath = path.join(__dirname, 'fixtures', filename);

  if (!fs.existsSync(jsxPath)) {
    log(`Error: File not found: ${jsxPath}`, colors.red);
    process.exit(1);
  }

  log(`\n╔═══════════════════════════════════════════════════╗`, colors.cyan);
  log(`║   Testing: ${filename.padEnd(36)}║`, colors.cyan);
  log(`╚═══════════════════════════════════════════════════╝\n`, colors.cyan);

  try {
    log(`Transpiling ${filename}...`, colors.yellow);
    const result = await transpileComponent(jsxPath);
    const { csharpCode, templatesJson } = result;

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
