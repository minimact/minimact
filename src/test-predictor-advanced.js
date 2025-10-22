#!/usr/bin/env node

/**
 * Advanced Predictor Testing Suite
 *
 * Tests sophisticated prediction scenarios to minimize server calls:
 * 1. Sequential patterns (typing, scrolling)
 * 2. Conditional patterns (toggle states)
 * 3. Batch operations (bulk updates)
 * 4. Multi-component patterns (cascading updates)
 * 5. Temporal patterns (timing-based predictions)
 * 6. Confidence thresholds
 */

const { spawn } = require('child_process');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Send command to CLI and get response
 */
function sendToCli(command, args) {
  return new Promise((resolve, reject) => {
    const cliPath = path.join(__dirname, 'Minimact.Cli');

    const proc = spawn('dotnet', ['run', '--no-build', '--', command, ...args], {
      cwd: cliPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr, success: code === 0 });
    });

    proc.on('error', reject);
  });
}

/**
 * Test Scenario 1: Sequential Counter Pattern
 * User clicks increment button multiple times in sequence
 * Predictor should learn: count++ pattern
 *
 * Expected: After 3 training iterations, predictor should predict with >80% confidence
 */
async function testSequentialPattern() {
  log('\n╔═══════════════════════════════════════════════════╗', colors.cyan);
  log('║   TEST 1: Sequential Counter Pattern             ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════╝\n', colors.cyan);

  // Reset metrics
  await sendToCli('metrics', ['--reset']);

  // Simulate 5 sequential increments (training)
  const trainingIterations = 5;
  log(`Training with ${trainingIterations} sequential increments...`, colors.blue);

  for (let i = 0; i < trainingIterations; i++) {
    log(`  Training iteration ${i + 1}: count ${i} → ${i + 1}`, colors.cyan);

    const stateChange = JSON.stringify({
      component_id: 'counter',
      state_key: 'count',
      old_value: i,
      new_value: i + 1
    });

    const oldTree = JSON.stringify({
      type: 'Text',
      content: `Count: ${i}`
    });

    const newTree = JSON.stringify({
      type: 'Text',
      content: `Count: ${i + 1}`
    });

    const result = await sendToCli('predict', [
      '--learn',
      '--state', stateChange,
      '--old', oldTree,
      '--new', newTree
    ]);

    if (!result.success) {
      log(`  ✗ Failed to learn pattern: ${result.stderr}`, colors.red);
      return { passed: false, reason: `Learn failed at iteration ${i + 1}` };
    }
  }

  // Now predict the next increment
  log('\nTesting prediction after training...', colors.blue);

  const stateChange = JSON.stringify({
    component_id: 'counter',
    state_key: 'count',
    old_value: 5,
    new_value: 6
  });

  const currentTree = JSON.stringify({
    type: 'Text',
    content: 'Count: 5'
  });

  const predictResult = await sendToCli('predict', [
    '--predict',
    '--state', stateChange,
    '--current', currentTree
  ]);

  if (!predictResult.success) {
    log(`✗ Prediction failed: ${predictResult.stderr}`, colors.red);
    return { passed: false, reason: 'Prediction command failed' };
  }

  try {
    const prediction = JSON.parse(predictResult.stdout);

    if (prediction.confidence !== undefined) {
      const confidence = prediction.confidence * 100;
      log(`  Confidence: ${confidence.toFixed(1)}%`, colors.cyan);

      if (confidence >= 80) {
        log('✓ PASSED: Confidence >= 80%', colors.green);
        return { passed: true, confidence };
      } else {
        log(`✗ FAILED: Confidence ${confidence.toFixed(1)}% < 80%`, colors.red);
        return { passed: false, reason: `Low confidence: ${confidence.toFixed(1)}%` };
      }
    } else {
      log('✗ FAILED: No prediction returned (confidence threshold not met)', colors.red);
      return { passed: false, reason: 'No prediction (below threshold)' };
    }
  } catch (e) {
    log(`✗ FAILED: Could not parse prediction response: ${e.message}`, colors.red);
    log(`  Response: ${predictResult.stdout}`, colors.yellow);
    return { passed: false, reason: 'Invalid prediction format' };
  }
}

/**
 * Test Scenario 2: Toggle Pattern
 * User toggles a boolean state on/off repeatedly
 * Predictor should learn: toggle flips true<->false
 *
 * Expected: High confidence (>90%) after just 2 iterations since pattern is deterministic
 */
async function testTogglePattern() {
  log('\n╔═══════════════════════════════════════════════════╗', colors.cyan);
  log('║   TEST 2: Toggle Pattern (Boolean Flip)          ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════╝\n', colors.cyan);

  log('Training with toggle pattern...', colors.blue);

  // Train: false->true, true->false, false->true
  const toggleStates = [
    { from: false, to: true },
    { from: true, to: false },
    { from: false, to: true }
  ];

  for (const state of toggleStates) {
    log(`  Toggle: ${state.from} → ${state.to}`, colors.cyan);

    const stateChange = JSON.stringify({
      component_id: 'toggle-button',
      state_key: 'enabled',
      old_value: state.from,
      new_value: state.to
    });

    const oldTree = JSON.stringify({
      type: 'Element',
      tag: 'button',
      props: { enabled: String(state.from) },
      children: [{ type: 'Text', content: state.from ? 'ON' : 'OFF' }]
    });

    const newTree = JSON.stringify({
      type: 'Element',
      tag: 'button',
      props: { enabled: String(state.to) },
      children: [{ type: 'Text', content: state.to ? 'ON' : 'OFF' }]
    });

    const result = await sendToCli('predict', [
      '--learn',
      '--state', stateChange,
      '--old', oldTree,
      '--new', newTree
    ]);

    if (!result.success) {
      log(`  ✗ Failed to learn pattern: ${result.stderr}`, colors.red);
      return { passed: false, reason: `Learn failed at toggle ${state.from}→${state.to}` };
    }
  }

  // Predict: true -> ?
  log('\nPredicting next toggle from true...', colors.blue);
  log('Expected: false with >90% confidence', colors.yellow);

  const stateChange = JSON.stringify({
    component_id: 'toggle-button',
    state_key: 'enabled',
    old_value: true,
    new_value: false
  });

  const currentTree = JSON.stringify({
    type: 'Element',
    tag: 'button',
    props: { enabled: 'true' },
    children: [{ type: 'Text', content: 'ON' }]
  });

  const predictResult = await sendToCli('predict', [
    '--predict',
    '--state', stateChange,
    '--current', currentTree
  ]);

  if (!predictResult.success) {
    log(`✗ Prediction failed: ${predictResult.stderr}`, colors.red);
    return { passed: false, reason: 'Prediction command failed' };
  }

  try {
    const prediction = JSON.parse(predictResult.stdout);

    if (prediction.confidence !== undefined) {
      const confidence = prediction.confidence * 100;
      log(`  Confidence: ${confidence.toFixed(1)}%`, colors.cyan);

      if (confidence >= 90) {
        log('✓ PASSED: Confidence >= 90%', colors.green);
        return { passed: true, confidence };
      } else {
        log(`✗ FAILED: Confidence ${confidence.toFixed(1)}% < 90%`, colors.red);
        return { passed: false, reason: `Low confidence: ${confidence.toFixed(1)}%` };
      }
    } else {
      log('✗ FAILED: No prediction returned (confidence threshold not met)', colors.red);
      return { passed: false, reason: 'No prediction (below threshold)' };
    }
  } catch (e) {
    log(`✗ FAILED: Could not parse prediction response: ${e.message}`, colors.red);
    log(`  Response: ${predictResult.stdout}`, colors.yellow);
    return { passed: false, reason: 'Invalid prediction format' };
  }
}

/**
 * Test Scenario 3: Multi-Step Form Pattern
 * User fills out form fields in sequence
 * Predictor should learn: field1->field2->field3 navigation
 *
 * Expected: Should predict next field with >70% confidence after 3 sequences
 */
async function testMultiStepFormPattern() {
  log('\n╔═══════════════════════════════════════════════════╗', colors.cyan);
  log('║   TEST 3: Multi-Step Form Navigation             ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════╝\n', colors.cyan);

  log('Training with form navigation pattern...', colors.blue);
  log('  Pattern: name → email → phone → submit', colors.cyan);

  const formSteps = ['name', 'email', 'phone', 'submit'];
  const trainingRuns = 3;

  for (let run = 0; run < trainingRuns; run++) {
    log(`\n  Training run ${run + 1}:`, colors.blue);
    for (let i = 0; i < formSteps.length - 1; i++) {
      log(`    Step ${i + 1}: ${formSteps[i]} → ${formSteps[i + 1]}`, colors.cyan);
    }
  }

  log('\nPredicting next step after "email"...', colors.blue);
  log('Expected: "phone" with >70% confidence', colors.yellow);

  log('✗ NOT IMPLEMENTED YET', colors.red);
  return { passed: false, reason: 'CLI predictor commands not implemented' };
}

/**
 * Test Scenario 4: Pagination Pattern
 * User clicks "next page" multiple times
 * Predictor should learn: page++ pattern
 *
 * Expected: Should predict page navigation after 2 iterations
 */
async function testPaginationPattern() {
  log('\n╔═══════════════════════════════════════════════════╗', colors.cyan);
  log('║   TEST 4: Pagination Pattern                     ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════╝\n', colors.cyan);

  log('Training with pagination clicks...', colors.blue);

  const pages = [1, 2, 3, 4, 5];
  for (let i = 0; i < pages.length - 1; i++) {
    log(`  Page ${pages[i]} → ${pages[i + 1]}`, colors.cyan);
  }

  log('\nPredicting next page after page 5...', colors.blue);
  log('Expected: page 6 with >75% confidence', colors.yellow);

  log('✗ NOT IMPLEMENTED YET', colors.red);
  return { passed: false, reason: 'CLI predictor commands not implemented' };
}

/**
 * Test Scenario 5: Confidence Decay Over Time
 * Test that predictor confidence decreases for stale patterns
 *
 * Expected: Confidence should decay after no usage
 */
async function testConfidenceDecay() {
  log('\n╔═══════════════════════════════════════════════════╗', colors.cyan);
  log('║   TEST 5: Confidence Decay                       ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════╝\n', colors.cyan);

  log('Training pattern...', colors.blue);
  log('  Learn: increment 0→1 (3 times)', colors.cyan);

  log('\nTesting immediate prediction...', colors.blue);
  log('Expected: High confidence (>80%)', colors.yellow);

  log('\nSimulating 1000 other operations...', colors.blue);
  log('(Pattern becomes stale)', colors.yellow);

  log('\nTesting prediction after staleness...', colors.blue);
  log('Expected: Lower confidence (<50%) OR pattern evicted', colors.yellow);

  log('✗ NOT IMPLEMENTED YET', colors.red);
  return { passed: false, reason: 'Confidence decay not implemented' };
}

/**
 * Test Scenario 6: Multi-Component Cascade
 * State change in one component triggers updates in related components
 * Predictor should learn: componentA.change → componentB.update
 *
 * Expected: Should predict cascade after 3 training runs
 */
async function testMultiComponentCascade() {
  log('\n╔═══════════════════════════════════════════════════╗', colors.cyan);
  log('║   TEST 6: Multi-Component Cascade                ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════╝\n', colors.cyan);

  log('Training with cascading updates...', colors.blue);
  log('  Pattern: CartItem.quantity++ → CartTotal.update', colors.cyan);

  const trainingRuns = 3;
  for (let i = 0; i < trainingRuns; i++) {
    log(`  Run ${i + 1}: Item quantity changed → Total recalculated`, colors.cyan);
  }

  log('\nPredicting cascade after item quantity change...', colors.blue);
  log('Expected: CartTotal update with >70% confidence', colors.yellow);

  log('✗ NOT IMPLEMENTED YET', colors.red);
  return { passed: false, reason: 'Multi-component prediction not implemented' };
}

/**
 * Test Scenario 7: Pattern Interference
 * Two similar but different patterns - predictor should distinguish them
 * Pattern A: click increment 5 times
 * Pattern B: click increment 3 times, then decrement
 *
 * Expected: Predictor should not confuse patterns
 */
async function testPatternInterference() {
  log('\n╔═══════════════════════════════════════════════════╗', colors.cyan);
  log('║   TEST 7: Pattern Interference                   ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════╝\n', colors.cyan);

  log('Training Pattern A: increment 5 times', colors.blue);
  log('  0→1→2→3→4→5', colors.cyan);

  log('\nTraining Pattern B: increment 3 times, then decrement', colors.blue);
  log('  0→1→2→1', colors.cyan);

  log('\nTesting prediction after 2 increments...', colors.blue);
  log('Context should determine which pattern matches', colors.yellow);

  log('✗ NOT IMPLEMENTED YET', colors.red);
  return { passed: false, reason: 'Pattern context not implemented' };
}

/**
 * Test Scenario 8: Server Call Reduction Metric
 * Measure actual reduction in server calls with prediction
 *
 * Baseline: 100 state changes = 100 server reconciliations
 * With Prediction: Should reduce to ~70 server calls (30% reduction)
 */
async function testServerCallReduction() {
  log('\n╔═══════════════════════════════════════════════════╗', colors.cyan);
  log('║   TEST 8: Server Call Reduction (Integration)    ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════╝\n', colors.cyan);

  log('Phase 1: Baseline (no prediction)', colors.blue);
  log('  Performing 100 state changes without prediction...', colors.cyan);
  // TODO: Make 100 state changes, count reconcile calls

  log('\nPhase 2: With prediction', colors.blue);
  log('  Training predictor with pattern...', colors.cyan);
  log('  Performing 100 state changes with prediction...', colors.cyan);
  // TODO: Make 100 state changes, use predictions, count reconcile calls

  log('\nExpected: >20% reduction in server calls', colors.yellow);

  log('✗ NOT IMPLEMENTED YET', colors.red);
  return { passed: false, reason: 'Integration test not implemented' };
}

/**
 * Test Scenario 9: Prediction Accuracy Rate
 * Track prediction hit rate over many operations
 *
 * Expected: >75% hit rate after training
 */
async function testPredictionAccuracy() {
  log('\n╔═══════════════════════════════════════════════════╗', colors.cyan);
  log('║   TEST 9: Prediction Accuracy Rate                ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════╝\n', colors.cyan);

  log('Training with 50 sequential increments...', colors.blue);

  log('\nTesting 100 predictions...', colors.blue);
  log('  Comparing predicted VNode vs actual VNode', colors.cyan);

  log('\nExpected metrics:', colors.yellow);
  log('  - Hit rate: >75%', colors.yellow);
  log('  - False positives: <10%', colors.yellow);
  log('  - Average confidence on hits: >85%', colors.yellow);

  log('✗ NOT IMPLEMENTED YET', colors.red);
  return { passed: false, reason: 'Accuracy tracking not implemented' };
}

/**
 * Test Scenario 10: Memory Pressure Under Prediction Load
 * Ensure predictor doesn\'t consume excessive memory
 *
 * Expected: Memory usage stays under 100MB even with 1000 patterns
 */
async function testMemoryPressure() {
  log('\n╔═══════════════════════════════════════════════════╗', colors.cyan);
  log('║   TEST 10: Memory Pressure                       ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════╝\n', colors.cyan);

  log('Creating 1000 different patterns...', colors.blue);
  // TODO: Create many predictors with different patterns

  log('\nChecking memory metrics...', colors.blue);
  const result = await sendToCli('metrics', []);

  if (result.success && result.stdout.includes('Predictors:')) {
    log('✓ Metrics retrieved', colors.green);
    const metricsMatch = result.stdout.match(/Predictors:\s+(\d+)/);
    if (metricsMatch) {
      const predictorCount = parseInt(metricsMatch[1]);
      log(`  Current predictors: ${predictorCount}`, colors.cyan);
    }
  }

  log('\nExpected: Memory eviction working, <100MB total', colors.yellow);

  log('⚠ PARTIAL - Can check metrics but can\'t create many predictors yet', colors.yellow);
  return { passed: false, reason: 'Cannot create multiple predictors via CLI yet' };
}

/**
 * Run all predictor tests
 */
async function runAllTests() {
  log('\n╔═══════════════════════════════════════════════════╗', colors.magenta);
  log('║   Advanced Predictor Test Suite                  ║', colors.magenta);
  log('║   Goal: Reduce server calls through prediction   ║', colors.magenta);
  log('╚═══════════════════════════════════════════════════╝\n', colors.magenta);

  const tests = [
    { name: 'Sequential Pattern', fn: testSequentialPattern },
    { name: 'Toggle Pattern', fn: testTogglePattern },
    { name: 'Multi-Step Form', fn: testMultiStepFormPattern },
    { name: 'Pagination', fn: testPaginationPattern },
    { name: 'Confidence Decay', fn: testConfidenceDecay },
    { name: 'Multi-Component Cascade', fn: testMultiComponentCascade },
    { name: 'Pattern Interference', fn: testPatternInterference },
    { name: 'Server Call Reduction', fn: testServerCallReduction },
    { name: 'Prediction Accuracy', fn: testPredictionAccuracy },
    { name: 'Memory Pressure', fn: testMemoryPressure }
  ];

  const results = [];

  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, ...result });
    } catch (err) {
      results.push({
        name: test.name,
        passed: false,
        reason: `Exception: ${err.message}`
      });
    }
  }

  // Summary
  log('\n═══════════════════════════════════════════════════', colors.magenta);
  log('TEST RESULTS SUMMARY', colors.magenta);
  log('═══════════════════════════════════════════════════\n', colors.magenta);

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach((result, idx) => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const color = result.passed ? colors.green : colors.red;
    log(`${idx + 1}. [${status}] ${result.name}`, color);
    if (!result.passed && result.reason) {
      log(`   Reason: ${result.reason}`, colors.yellow);
    }
  });

  log(`\n${'═'.repeat(55)}`, colors.magenta);
  const resultColor = passed === tests.length ? colors.green : colors.yellow;
  log(`FINAL: ${passed}/${tests.length} tests passed`, resultColor);
  log('═'.repeat(55) + '\n', colors.magenta);

  // TDD Summary
  log('╔═══════════════════════════════════════════════════╗', colors.blue);
  log('║   TDD ACTION ITEMS                                ║', colors.blue);
  log('╚═══════════════════════════════════════════════════╝\n', colors.blue);

  log('Required CLI commands:', colors.cyan);
  log('  1. minimact predict --learn <state-change> <old-tree> <new-tree>', colors.yellow);
  log('  2. minimact predict --predict <state-change> <current-tree>', colors.yellow);
  log('  3. minimact predict --stats (show hit rate, confidence)', colors.yellow);
  log('');
  log('Required predictor improvements:', colors.cyan);
  log('  1. Confidence thresholds (configurable)', colors.yellow);
  log('  2. Pattern context awareness', colors.yellow);
  log('  3. Multi-component pattern tracking', colors.yellow);
  log('  4. Temporal decay for stale patterns', colors.yellow);
  log('  5. Hit rate tracking in metrics', colors.yellow);
  log('');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(err => {
  log(`\nFatal error: ${err.message}`, colors.red);
  console.error(err.stack);
  process.exit(1);
});
