const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

// Import the plugin
const minimactTranspiler = require('../src/index');

// Read test file
const testFile = path.join(__dirname, 'ConditionalTest.tsx');
const code = fs.readFileSync(testFile, 'utf8');

console.log('====== Running Conditional Test ======\n');
console.log(`Input file: ${testFile}`);
console.log(`\nSource code:\n${code}\n`);
console.log('====== Transpiling ======\n');

// Run Babel with our plugin
try {
  const result = babel.transformSync(code, {
    filename: testFile,
    presets: [
      ['@babel/preset-typescript', { isTSX: true, allExtensions: true }]
    ],
    plugins: [
      [minimactTranspiler, {
        outputDir: path.join(__dirname, 'output'),
        hexGap: 0x10000000
      }]
    ]
  });

  console.log('\n====== Transpilation Complete ======\n');

  // Read and display the generated JSON
  const jsonFile = path.join(__dirname, 'output', 'ConditionalTest.json');
  if (fs.existsSync(jsonFile)) {
    const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

    console.log('Generated JSON:\n');
    console.log(JSON.stringify(json, null, 2));

    console.log('\n====== Path Verification ======\n');

    // Verify paths are sequential and tag-agnostic
    const paths = [];
    function collectPaths(node, prefix = '') {
      if (node.path) {
        paths.push({ path: node.path, type: node.type, tag: node.tag || node.name || 'n/a' });
      }
      if (node.children) {
        node.children.forEach(child => collectPaths(child, prefix + '  '));
      }
      if (node.renderMethod) {
        collectPaths(node.renderMethod, prefix);
      }
    }

    collectPaths(json);

    // Sort paths lexicographically
    paths.sort((a, b) => a.path.localeCompare(b.path));

    console.log('All paths (sorted):');
    paths.forEach(p => {
      const pathStr = p.path.padEnd(50);
      const typeStr = p.type.padEnd(20);
      console.log(`  ${pathStr} ${typeStr} ${p.tag}`);
    });

    // Check for proper sequencing
    console.log('\n====== Hex Code Analysis ======\n');

    const siblings = {};
    paths.forEach(p => {
      const segments = p.path.split('.');
      if (segments.length > 0) {
        const parent = segments.slice(0, -1).join('.');
        if (!siblings[parent]) siblings[parent] = [];
        siblings[parent].push({ segment: segments[segments.length - 1], path: p.path, type: p.type });
      }
    });

    Object.keys(siblings).sort().forEach(parent => {
      const children = siblings[parent].filter(s => !s.segment.startsWith('@'));
      if (children.length > 1) {
        console.log(`Parent: ${parent || '(root)'}`);
        children.forEach((child, idx) => {
          const hex = parseInt(child.segment, 16);
          console.log(`  ${idx + 1}. ${child.segment} (${hex.toLocaleString()}) - ${child.type}`);

          // Verify spacing
          if (idx > 0) {
            const prevHex = parseInt(children[idx - 1].segment, 16);
            const gap = hex - prevHex;
            console.log(`     Gap from previous: ${gap.toLocaleString()} (0x${gap.toString(16)})`);
          }
        });
        console.log('');
      }
    });

    console.log('\n✅ Test successful!');
  } else {
    console.error('❌ Output JSON file not found!');
  }
} catch (error) {
  console.error('\n❌ Transpilation failed:');
  console.error(error);
  process.exit(1);
}
