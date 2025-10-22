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

function validateUseTemplate(csharp) {
  const layoutInheritance = csharp.match(/class\s+\w+\s*:\s*(DefaultLayout|SidebarLayout|AuthLayout|AdminLayout)/);
  const hasRenderContent = csharp.includes('protected override VNode RenderContent(');
  const hasTemplateProps = csharp.includes('public override string Title');

  return {
    passed: layoutInheritance !== null || hasRenderContent,
    feature: 'useTemplate',
    details: layoutInheritance ? `Inherits from ${layoutInheritance[1]}` : 'No template detected'
  };
}

async function main() {
  const jsxPath = path.join(__dirname, 'fixtures', 'UseTemplateTest.jsx');

  console.log('Testing useTemplate validation...\n');

  const csharp = await transpileComponent(jsxPath);
  const result = validateUseTemplate(csharp);

  console.log(`Feature: ${result.feature}`);
  console.log(`Status: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`Details: ${result.details}\n`);

  // Additional checks
  const hasRenderContent = csharp.includes('protected override VNode RenderContent(');
  const hasTemplateProps = csharp.includes('public override string Title');

  console.log('Additional validations:');
  console.log(`  RenderContent method: ${hasRenderContent ? '✓' : '✗'}`);
  console.log(`  Template properties: ${hasTemplateProps ? '✓' : '✗'}`);

  if (result.passed && hasRenderContent && hasTemplateProps) {
    console.log('\n✓ useTemplate feature is working correctly!');
    process.exit(0);
  } else {
    console.log('\n✗ useTemplate feature validation failed');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
