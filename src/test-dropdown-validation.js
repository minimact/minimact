#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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
      const csharpCode = result.metadata?.minimactCSharp || result.code;
      console.log(csharpCode);
    `;

    const proc = spawn('node', ['-e', nodeScript], {
      cwd: babelPluginDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`Babel failed: ${stderr}`));
    });

    proc.on('error', reject);
  });
}

function validateUseDropdown(csharp) {
  const hasDropdownState = csharp.includes('items') || csharp.includes('Items');
  const hasSelectElement = csharp.includes('select') || csharp.includes('dropdown');
  const hasRouteReference = csharp.includes('Routes.') || csharp.includes('Api.');

  return {
    passed: hasDropdownState && hasSelectElement,
    feature: 'useDropdown',
    details: hasRouteReference ? 'Dropdown with route reference' : (hasDropdownState ? 'Dropdown detected' : 'No dropdown')
  };
}

async function main() {
  const jsxPath = path.join(__dirname, 'fixtures', 'UseDropdownTest.jsx');

  console.log('Testing useDropdown validation...\n');

  const csharp = await transpileComponent(jsxPath);
  const result = validateUseDropdown(csharp);

  console.log(`Feature: ${result.feature}`);
  console.log(`Status: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`Details: ${result.details}\n`);

  // Additional checks
  const hasDropdownStateType = csharp.includes('DropdownState');
  const hasItemsProperty = csharp.includes('dropdown.items');
  const hasPropsProperty = csharp.includes('dropdown.props');

  console.log('Additional validations:');
  console.log(`  DropdownState type: ${hasDropdownStateType ? '✓' : '✗'}`);
  console.log(`  Items property: ${hasItemsProperty ? '✓' : '✗'}`);
  console.log(`  Props property: ${hasPropsProperty ? '✓' : '✗'}`);

  if (result.passed && hasDropdownStateType) {
    console.log('\n✓ useDropdown feature is working correctly!');
    process.exit(0);
  } else {
    console.log('\n✗ useDropdown feature validation failed');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
