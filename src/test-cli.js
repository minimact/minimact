#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCliCommand(args, input = null) {
  return new Promise((resolve, reject) => {
    const cliPath = path.join(__dirname, 'Minimact.Cli');

    const proc = spawn('dotnet', ['run', '--no-build', '--', ...args], {
      cwd: cliPath,
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

    // Send input if provided
    if (input) {
      proc.stdin.write(input);
      proc.stdin.end();
    }

    proc.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr
      });
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function testFullPipeline() {
  log('\n╔═══════════════════════════════════════════════════╗', colors.cyan);
  log('║   Minimact CLI Test Suite (Node.js)               ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════╝\n', colors.cyan);

  let passed = 0;
  let total = 0;

  // Test 1: Run full test suite
  log('[1] Running full pipeline test...', colors.blue);
  total++;
  try {
    const result = await runCliCommand(['test']);

    if (result.code === 0) {
      log('✓ Full pipeline test passed\n', colors.green);
      log('Output:', colors.cyan);
      console.log(result.stdout);
      passed++;
    } else {
      log('✗ Full pipeline test failed\n', colors.red);
      console.log(result.stdout);
      console.error(result.stderr);
    }
  } catch (err) {
    log(`✗ Error: ${err.message}\n`, colors.red);
  }

  // Test 2: Test reconciliation with JSON files
  log('[2] Testing reconciliation command...', colors.blue);
  total++;
  try {
    // Create temporary test files
    const oldTree = {
      type: 'Element',
      tag: 'div',
      props: { class: 'container' },
      children: [
        { type: 'Text', content: 'Hello' }
      ]
    };

    const newTree = {
      type: 'Element',
      tag: 'div',
      props: { class: 'container', id: 'main' },
      children: [
        { type: 'Text', content: 'Hello, World!' }
      ]
    };

    const oldFile = path.join(__dirname, 'test-old.json');
    const newFile = path.join(__dirname, 'test-new.json');

    fs.writeFileSync(oldFile, JSON.stringify(oldTree));
    fs.writeFileSync(newFile, JSON.stringify(newTree));

    const result = await runCliCommand(['reconcile', '--old', oldFile, '--new', newFile]);

    // Clean up temp files
    fs.unlinkSync(oldFile);
    fs.unlinkSync(newFile);

    if (result.code === 0 && result.stdout.includes('patch')) {
      log('✓ Reconciliation command passed\n', colors.green);
      log('Output:', colors.cyan);
      console.log(result.stdout);
      passed++;
    } else {
      log('✗ Reconciliation command failed\n', colors.red);
      console.log(result.stdout);
      console.error(result.stderr);
    }
  } catch (err) {
    log(`✗ Error: ${err.message}\n`, colors.red);
  }

  // Test 3: Test predictor command
  log('[3] Testing predictor command...', colors.blue);
  total++;
  try {
    const result = await runCliCommand(['predict', '--iterations', '10']);

    if (result.code === 0) {
      log('✓ Predictor command passed\n', colors.green);
      log('Output:', colors.cyan);
      console.log(result.stdout);
      passed++;
    } else {
      log('✗ Predictor command failed\n', colors.red);
      console.log(result.stdout);
      console.error(result.stderr);
    }
  } catch (err) {
    log(`✗ Error: ${err.message}\n`, colors.red);
  }

  // Test 4: Test metrics command
  log('[4] Testing metrics command...', colors.blue);
  total++;
  try {
    const result = await runCliCommand(['metrics']);

    if (result.code === 0 && result.stdout.includes('Reconciliation')) {
      log('✓ Metrics command passed\n', colors.green);
      log('Output:', colors.cyan);
      console.log(result.stdout);
      passed++;
    } else {
      log('✗ Metrics command failed\n', colors.red);
      console.log(result.stdout);
      console.error(result.stderr);
    }
  } catch (err) {
    log(`✗ Error: ${err.message}\n`, colors.red);
  }

  // Test 5: Test logs command
  log('[5] Testing logs command...', colors.blue);
  total++;
  try {
    const result = await runCliCommand(['logs', '--level', '1']);

    if (result.code === 0) {
      log('✓ Logs command passed\n', colors.green);
      log('Output:', colors.cyan);
      console.log(result.stdout);
      passed++;
    } else {
      log('✗ Logs command failed\n', colors.red);
      console.log(result.stdout);
      console.error(result.stderr);
    }
  } catch (err) {
    log(`✗ Error: ${err.message}\n`, colors.red);
  }

  // Summary
  log('═══════════════════════════════════════════════════', colors.cyan);
  const color = passed === total ? colors.green : colors.yellow;
  log(`RESULT: ${passed}/${total} tests passed`, color);
  log('═══════════════════════════════════════════════════\n', colors.cyan);

  process.exit(passed === total ? 0 : 1);
}

// Run tests
testFullPipeline().catch(err => {
  log(`Fatal error: ${err.message}`, colors.red);
  console.error(err);
  process.exit(1);
});
