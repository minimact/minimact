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
      const code = fs.readFileSync('${jsxPath.replace(/\\/g, '\\\\')}', 'utf-8');
      const result = babel.transformSync(code, {
        presets: ['@babel/preset-typescript', '@babel/preset-react'],
        plugins: ['./index-full.cjs'],
        filename: '${path.basename(jsxPath)}'
      });
      // The C# code is in metadata, not in result.code
      const csharpCode = result.metadata?.minimactCSharp || result.code;
      console.log(csharpCode);
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
        resolve(stdout);
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
    const csharpCode = await transpileComponent(jsxPath);

    log(`\n✓ Transpiled successfully\n`, colors.green);
    log(`Generated C# code:\n`, colors.cyan);
    log(`${'='.repeat(60)}`, colors.cyan);

    // Add line numbers
    const lines = csharpCode.split('\n');
    lines.forEach((line, idx) => {
      const lineNum = String(idx + 1).padStart(4, ' ');
      console.log(`${colors.yellow}${lineNum}${colors.reset} ${line}`);
    });

    log(`${'='.repeat(60)}\n`, colors.cyan);
    log(`✓ Total lines: ${lines.length}`, colors.green);

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
