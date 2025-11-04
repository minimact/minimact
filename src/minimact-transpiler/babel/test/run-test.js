const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

// Import the plugin
const minimactTranspiler = require('../src/index');

// Read test file
const testFile = path.join(__dirname, 'SimpleCounter.tsx');
const code = fs.readFileSync(testFile, 'utf8');

console.log('====== Running Minimact Transpiler Test ======\n');
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
  const jsonFile = path.join(__dirname, 'output', 'SimpleCounter.json');
  if (fs.existsSync(jsonFile)) {
    const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    console.log('Generated JSON:\n');
    console.log(JSON.stringify(json, null, 2));
    console.log('\n✅ Test successful!');
  } else {
    console.error('❌ Output JSON file not found!');
  }
} catch (error) {
  console.error('\n❌ Transpilation failed:');
  console.error(error);
  process.exit(1);
}
