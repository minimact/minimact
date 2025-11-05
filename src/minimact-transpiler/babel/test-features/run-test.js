/**
 * Test Runner for Minimact Transpiler Test Features
 *
 * Usage:
 *   node run-test.js <number>
 *
 * Examples:
 *   node run-test.js 1          # Runs 01-style-objects.tsx
 *   node run-test.js 17         # Runs 17-complex-expressions.tsx
 *   node run-test.js 18         # Runs 18-simple-test.tsx
 */

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

// Get test number from command line
const testNumber = process.argv[2];

if (!testNumber) {
  console.error('❌ Error: Please provide a test number');
  console.error('Usage: node run-test.js <number>');
  console.error('Example: node run-test.js 18');
  process.exit(1);
}

// Pad number with leading zero if needed (e.g., 1 -> 01, 18 -> 18)
const paddedNumber = testNumber.padStart(2, '0');

// Find the test file
const testDir = __dirname;
const files = fs.readdirSync(testDir);
const testFile = files.find(f => f.startsWith(`${paddedNumber}-`) && f.endsWith('.tsx'));

if (!testFile) {
  console.error(`❌ Error: No test file found starting with '${paddedNumber}-'`);
  console.error(`Available tests in ${testDir}:`);
  files
    .filter(f => f.endsWith('.tsx'))
    .sort()
    .forEach(f => {
      const num = f.split('-')[0];
      console.error(`  ${num}: ${f}`);
    });
  process.exit(1);
}

const testPath = path.join(testDir, testFile);
const outputDir = path.join(testDir, 'output');

console.log('═══════════════════════════════════════════════════════════════');
console.log('🧪 Minimact Transpiler Test Runner');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`📁 Test File: ${testFile}`);
console.log(`📂 Output Dir: ${outputDir}`);
console.log('═══════════════════════════════════════════════════════════════\n');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read test file
const code = fs.readFileSync(testPath, 'utf-8');

console.log('📄 Source Code:');
console.log('───────────────────────────────────────────────────────────────');
console.log(code);
console.log('───────────────────────────────────────────────────────────────\n');

// Run transpiler
console.log('⚙️  Running Transpiler...\n');

try {
  const result = babel.transformSync(code, {
    filename: testPath,
    presets: [
      ['@babel/preset-typescript', { isTSX: true, allExtensions: true }]
    ],
    plugins: [
      [path.join(__dirname, '..', 'src', 'index.js'), {
        outputDir: outputDir,
        hexGap: 0x10000000
      }]
    ]
  });

  console.log('\n✅ Transpilation Complete!\n');

  // Find and display generated JSON
  const componentName = testFile
    .replace(/^\d+-/, '')
    .replace('.tsx', '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const jsonFile = path.join(outputDir, `${componentName}.json`);

  if (fs.existsSync(jsonFile)) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 Generated JSON Output:');
    console.log('═══════════════════════════════════════════════════════════════');

    const jsonContent = fs.readFileSync(jsonFile, 'utf-8');
    const jsonData = JSON.parse(jsonContent);

    // Pretty print with colors if possible
    console.log(JSON.stringify(jsonData, null, 2));

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`📁 Output saved to: ${jsonFile}`);
    console.log('═══════════════════════════════════════════════════════════════');
  } else {
    console.log('⚠️  Warning: JSON output file not found');
    console.log(`   Expected: ${jsonFile}`);
  }

} catch (error) {
  console.error('\n❌ Transpilation Failed!\n');
  console.error('Error Details:');
  console.error('───────────────────────────────────────────────────────────────');
  console.error(error.message);

  if (error.stack) {
    console.error('\nStack Trace:');
    console.error(error.stack);
  }

  process.exit(1);
}

console.log('\n✨ Test Complete!\n');
