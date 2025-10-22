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

function validateUseValidation(csharp) {
  const hasValidationAttribute = csharp.includes('[Validation]');
  const validationMatches = csharp.match(/\[Validation\]\s*private\s+ValidationField\s+\w+/g);
  const validationCount = validationMatches ? validationMatches.length : 0;
  const hasErrorRendering = csharp.includes('error') || csharp.includes('valid');

  return {
    passed: hasValidationAttribute || validationCount > 0,
    feature: 'useValidation',
    details: `Found ${validationCount} validation field(s)`
  };
}

async function main() {
  const jsxPath = path.join(__dirname, 'fixtures', 'UseValidationTest.jsx');

  console.log('Testing useValidation validation...\n');

  const csharp = await transpileComponent(jsxPath);
  const result = validateUseValidation(csharp);

  console.log(`Feature: ${result.feature}`);
  console.log(`Status: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`Details: ${result.details}\n`);

  // Additional checks
  const hasValidationRules = csharp.includes('Required =') &&
                              csharp.includes('Pattern =') &&
                              csharp.includes('Message =');
  const hasValidationField = csharp.includes('ValidationField');

  console.log('Additional validations:');
  console.log(`  ValidationField type: ${hasValidationField ? '✓' : '✗'}`);
  console.log(`  Validation rules: ${hasValidationRules ? '✓' : '✗'}`);

  if (result.passed && hasValidationField && hasValidationRules) {
    console.log('\n✓ useValidation feature is working correctly!');
    process.exit(0);
  } else {
    console.log('\n✗ useValidation feature validation failed');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
