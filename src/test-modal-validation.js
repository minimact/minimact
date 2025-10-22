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

function validateUseModal(csharp) {
  const hasModalState = csharp.includes('isOpen') || csharp.includes('IsOpen');
  const hasModalStateType = csharp.includes('ModalState');
  const hasBackdrop = csharp.includes('modal-backdrop') || csharp.includes('ModalBackdrop');

  // Check if ModalState is used, which includes open/close methods
  return {
    passed: hasModalState && hasModalStateType,
    feature: 'useModal',
    details: hasModalState ? 'Modal state detected' : 'No modal detected'
  };
}

async function main() {
  const jsxPath = path.join(__dirname, 'fixtures', 'UseModalTest.jsx');

  console.log('Testing useModal validation...\n');

  const csharp = await transpileComponent(jsxPath);
  const result = validateUseModal(csharp);

  console.log(`Feature: ${result.feature}`);
  console.log(`Status: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`Details: ${result.details}\n`);

  // Additional checks
  const hasModalStateType = csharp.includes('ModalState');
  const hasBackdrop = csharp.includes('modal-backdrop');

  console.log('Additional validations:');
  console.log(`  ModalState type: ${hasModalStateType ? '✓' : '✗'}`);
  console.log(`  Modal backdrop: ${hasBackdrop ? '✓' : '✗'}`);
  console.log(`  IsOpen property: ${csharp.includes('isOpen') ? '✓' : '✗'}`);

  if (result.passed && hasModalStateType) {
    console.log('\n✓ useModal feature is working correctly!');
    process.exit(0);
  } else {
    console.log('\n✗ useModal feature validation failed');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
