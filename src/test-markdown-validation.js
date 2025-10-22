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

function validateUseMarkdown(csharp) {
  const hasMarkdownAttribute = csharp.includes('[Markdown]');
  const markdownFieldMatches = csharp.match(/\[Markdown\]\s*\[State\]\s*private\s+string\s+\w+/g);
  const markdownFieldCount = markdownFieldMatches ? markdownFieldMatches.length : 0;
  const hasRawHtmlRendering = csharp.includes('DivRawHtml') || csharp.includes('Markdown.ToHtml');

  return {
    passed: hasMarkdownAttribute && markdownFieldCount > 0,
    feature: 'useMarkdown',
    details: `Found ${markdownFieldCount} markdown field(s)${hasRawHtmlRendering ? ' with HTML rendering' : ''}`
  };
}

async function main() {
  const jsxPath = path.join(__dirname, 'fixtures', 'UseMarkdownTest.jsx');

  console.log('Testing useMarkdown validation...\n');

  const csharp = await transpileComponent(jsxPath);
  const result = validateUseMarkdown(csharp);

  console.log(`Feature: ${result.feature}`);
  console.log(`Status: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`Details: ${result.details}\n`);

  if (result.passed) {
    console.log('✓ useMarkdown feature is working correctly!');
    process.exit(0);
  } else {
    console.log('✗ useMarkdown feature validation failed');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
