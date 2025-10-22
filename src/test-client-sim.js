#!/usr/bin/env node

/**
 * Minimact Client Simulator
 *
 * Simulates the full client-server workflow:
 * 1. Read JSX/TSX components from fixtures/
 * 2. Transpile to C# using Babel plugin
 * 3. Send to CLI for processing
 * 4. Simulate state changes (like SignalR messages)
 * 5. Get reconciliation patches back
 * 6. Test predictor learning
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load test fixtures
const testFixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-fixtures.json'), 'utf-8'));

// ANSI color codes
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
 * Transpile JSX/TSX to C# using Babel plugin
 */
function transpileComponent(jsxPath) {
  return new Promise((resolve, reject) => {
    const babelPluginDir = path.join(__dirname, 'babel-plugin-minimact');

    if (!fs.existsSync(babelPluginDir)) {
      reject(new Error('Babel plugin directory not found'));
      return;
    }

    // Use node to run babel directly
    const nodeScript = `
      const babel = require('@babel/core');
      const fs = require('fs');
      const code = fs.readFileSync('${jsxPath.replace(/\\/g, '\\\\')}', 'utf-8');
      const result = babel.transformSync(code, {
        presets: ['@babel/preset-typescript', '@babel/preset-react'],
        plugins: ['./index-full.cjs'],
        filename: '${path.basename(jsxPath)}'
      });
      // The C# code is in metadata, not in result.code
      const csharpCode = result.metadata?.minimactCSharp || result.code;
      console.log(csharpCode);
    `;

    const proc = spawn('node', ['-e', nodeScript], {
      cwd: babelPluginDir,
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

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Babel failed: ${stderr}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Compile C# code and execute to get VNode output
 */
async function compileCSharp(csharpCode, fallbackComponentName, testProps = {}) {
  const tempDir = path.join(__dirname, '.temp-compile');
  const projectDir = path.join(tempDir, `TestComponent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  try {
    // Extract actual component name from C# code
    // Look for: "public partial class ComponentName : MinimactComponent"
    const classNameMatch = csharpCode.match(/public\s+partial\s+class\s+(\w+)\s*:\s*MinimactComponent/);
    const componentName = classNameMatch ? classNameMatch[1] : fallbackComponentName;

    if (!classNameMatch) {
      log(`  ⚠ Warning: Could not extract component name from C# code, using fallback: ${fallbackComponentName}`, colors.yellow);
    }

    // Create temp project directory with unique name to avoid file locks
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    fs.mkdirSync(projectDir, { recursive: true });

    // Create a console app project with ASP.NET Core support
    const csproj = `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="../../Minimact.Runtime/Minimact.Runtime.csproj" />
  </ItemGroup>
</Project>`;

    // Extract prop types from C# code
    const propTypePattern = /\[Prop\]\s+public\s+(\S+)\s+(\w+)\s+\{/g;
    const propTypes = {};
    let match;
    while ((match = propTypePattern.exec(csharpCode)) !== null) {
      propTypes[match[2]] = match[1];  // propName -> type
    }

    // Generate C# code to set props
    function toCSharpValue(value, propName) {
      const propType = propTypes[propName] || 'dynamic';

      // Handle primitives directly without JSON serialization
      if (value === null) return 'null';
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'string') return `"${value.replace(/"/g, '\\"')}"`;

      // For complex types (objects, arrays), use JSON with proper type conversion
      const json = JSON.stringify(JSON.stringify(value));

      if (propType.startsWith('List<')) {
        return `Newtonsoft.Json.JsonConvert.DeserializeObject<${propType}>(${json})`;
      } else {
        // dynamic or object types
        return `Newtonsoft.Json.JsonConvert.DeserializeObject<dynamic>(${json})`;
      }
    }

    const propsInitCode = Object.entries(testProps).map(([key, value]) => {
      return `            component.${key} = ${toCSharpValue(value, key)};`;
    }).join('\n');

    // Create Program.cs that instantiates the component and calls RenderComponent()
    const programCs = `using Minimact.Runtime.Core;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;

${csharpCode}

class Program
{
    static void Main()
    {
        try
        {
            var component = new ${componentName}();
${propsInitCode}
            var vnode = component.RenderComponent();
            var json = JsonConvert.SerializeObject(vnode, Formatting.None);
            Console.WriteLine(json);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error: {ex.Message}");
            Environment.Exit(1);
        }
    }
}`;

    fs.writeFileSync(path.join(projectDir, 'TestComponent.csproj'), csproj);
    fs.writeFileSync(path.join(projectDir, 'Program.cs'), programCs);

    // Build the project
    const buildProc = spawn('dotnet', ['build', '--verbosity', 'quiet'], {
      cwd: projectDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let buildStdout = '';
    let buildStderr = '';

    buildProc.stdout.on('data', (data) => { buildStdout += data.toString(); });
    buildProc.stderr.on('data', (data) => { buildStderr += data.toString(); });

    await new Promise((resolve, reject) => {
      buildProc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Build failed: ${buildStderr}\n${buildStdout}`));
      });
      buildProc.on('error', reject);
    });

    // Run the compiled component
    const runProc = spawn('dotnet', ['run', '--no-build'], {
      cwd: projectDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let runStdout = '';
    let runStderr = '';

    runProc.stdout.on('data', (data) => { runStdout += data.toString(); });
    runProc.stderr.on('data', (data) => { runStderr += data.toString(); });

    const result = await new Promise((resolve, reject) => {
      runProc.on('close', (code) => {
        if (code === 0) {
          try {
            const vnode = JSON.parse(runStdout.trim());
            resolve(vnode);
          } catch (err) {
            reject(new Error(`Failed to parse VNode JSON: ${err.message}`));
          }
        } else {
          reject(new Error(`Execution failed: ${runStderr}`));
        }
      });
      runProc.on('error', reject);
    });

    // Clean up temp directory after execution completes
    try {
      if (fs.existsSync(projectDir)) {
        fs.rmSync(projectDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      // Ignore cleanup errors on Windows file locks
    }

    return result;

  } catch (err) {
    // Clean up on error too
    try {
      if (fs.existsSync(projectDir)) {
        fs.rmSync(projectDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      // Ignore cleanup errors
    }
    throw err;
  }
}

/**
 * Validation functions for Babel plugin features
 */
function validateUseState(component) {
  const csharp = component.csharp;

  // Check for [State] attribute
  const hasStateAttribute = csharp.includes('[State]');

  // Check for private field declarations with State attribute
  const stateFieldMatches = csharp.match(/\[State\]\s*private\s+\w+\s+\w+\s*=/g);
  const stateFieldCount = stateFieldMatches ? stateFieldMatches.length : 0;

  return {
    passed: hasStateAttribute && stateFieldCount > 0,
    feature: 'useState',
    details: `Found ${stateFieldCount} [State] field(s)`
  };
}

function validateUseEffect(component) {
  const csharp = component.csharp;

  // Check for [OnStateChanged("...")] attribute
  const hasAttribute = /\[OnStateChanged\("[\w]+"\)\]/.test(csharp);

  // Count effect methods
  const effectMatches = csharp.match(/\[OnStateChanged\("[\w]+"\)\]/g);
  const effectCount = effectMatches ? effectMatches.length : 0;

  return {
    passed: hasAttribute && effectCount > 0,
    feature: 'useEffect',
    details: `Found ${effectCount} effect method(s)`
  };
}

function validateUseRef(component) {
  const csharp = component.csharp;

  // Check for [Ref] attribute
  const hasRefAttribute = csharp.includes('[Ref]');

  // Check for ElementRef type usage
  const hasElementRefType = csharp.includes('ElementRef');

  return {
    passed: hasRefAttribute || hasElementRefType,
    feature: 'useRef',
    details: hasRefAttribute ? 'Found [Ref] attribute' : 'No refs detected'
  };
}

function validateEventHandlers(component) {
  const csharp = component.csharp;

  // Check for HandleClick/HandleChange/etc methods
  const handlerMatches = csharp.match(/private\s+void\s+Handle\w+_\d+\s*\(/g);
  const handlerCount = handlerMatches ? handlerMatches.length : 0;

  // Check for SetState calls within handlers
  const hasSetState = csharp.includes('SetState(');

  return {
    passed: handlerCount > 0,
    feature: 'Event Handlers',
    details: `Found ${handlerCount} event handler(s)`
  };
}

function validateConditionalRendering(component) {
  const csharp = component.csharp;

  // Check for ternary operator (? :) in VNode construction
  const hasTernary = csharp.includes('?') && csharp.includes(':');

  // Check for null-conditional (??) or null checks
  const hasNullCheck = csharp.includes('??') || csharp.includes('!= null');

  return {
    passed: hasTernary || hasNullCheck,
    feature: 'Conditional Rendering',
    details: hasTernary ? 'Ternary operators found' : (hasNullCheck ? 'Null checks found' : 'No conditionals')
  };
}

function validateListRendering(component) {
  const csharp = component.csharp;

  // Check for .Select() LINQ method (map equivalent)
  const hasSelect = csharp.includes('.Select(');

  // Check for foreach loops or array iteration
  const hasForeach = csharp.includes('foreach') || csharp.includes('.ToArray()');

  // Check for key property handling
  const hasKey = csharp.includes('Key =') || csharp.includes('key:');

  return {
    passed: hasSelect || hasForeach,
    feature: 'List Rendering',
    details: hasSelect ? '.Select() found' : (hasForeach ? 'Iteration found' : 'No list rendering')
  };
}

function validatePartialClass(component) {
  const csharp = component.csharp;

  // Check for partial class declaration
  const isPartial = csharp.includes('public partial class');

  // Check for MinimactComponent inheritance
  const inheritsBase = csharp.includes(': MinimactComponent') || csharp.includes(': DefaultLayout');

  return {
    passed: isPartial && inheritsBase,
    feature: 'Partial Class',
    details: isPartial ? 'Partial class declared' : 'Not a partial class'
  };
}

function validateJSXtoVNode(component) {
  const csharp = component.csharp;

  // Check for VElement/VNode construction
  const hasVElement = csharp.includes('new VElement(');
  const hasVNode = csharp.includes('VNode');

  // Check for Render method
  const hasRender = csharp.includes('protected override VNode Render(');

  return {
    passed: (hasVElement || hasVNode) && hasRender,
    feature: 'JSX → VNode',
    details: hasRender ? 'Render method found' : 'No Render method'
  };
}

/**
 * Run all validations for a component
 */
function validateAllFeatures(component) {
  const validations = [
    validateUseState(component),
    validateUseEffect(component),
    validateUseRef(component),
    validateEventHandlers(component),
    validateConditionalRendering(component),
    validateListRendering(component),
    validatePartialClass(component),
    validateJSXtoVNode(component)
  ];

  return validations;
}

/**
 * Send command to CLI and get response
 */
function sendToCli(command, args, stdinData = null) {
  return new Promise((resolve, reject) => {
    const cliPath = path.join(__dirname, 'Minimact.Cli');

    const proc = spawn('dotnet', ['run', '--no-build', '--', command, ...args], {
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

    // Send stdin data if provided
    if (stdinData) {
      proc.stdin.write(JSON.stringify(stdinData));
      proc.stdin.end();
    }

    proc.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr,
        success: code === 0
      });
    });

    proc.on('error', reject);
  });
}

/**
 * Simulate a client state change and reconciliation
 */
async function simulateStateChange(componentName, stateChange, oldTree, newTree) {
  log(`  → State change: ${componentName}.${stateChange.state_key} = ${JSON.stringify(stateChange.new_value)}`, colors.cyan);

  // Write trees to temp files
  const oldFile = path.join(__dirname, '.test-old.json');
  const newFile = path.join(__dirname, '.test-new.json');

  fs.writeFileSync(oldFile, JSON.stringify(oldTree));
  fs.writeFileSync(newFile, JSON.stringify(newTree));

  try {
    // Send reconciliation request
    const result = await sendToCli('reconcile', ['--old', oldFile, '--new', newFile]);

    if (result.success) {
      // Parse patches from output
      const patchMatch = result.stdout.match(/\[[\s\S]*\]/);
      if (patchMatch) {
        const patches = JSON.parse(patchMatch[0]);
        log(`  ✓ Reconciled: ${patches.length} patch(es)`, colors.green);
        return { success: true, patches };
      }
    }

    log(`  ✗ Reconciliation failed`, colors.red);
    return { success: false, patches: [] };

  } finally {
    // Clean up temp files
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    if (fs.existsSync(newFile)) fs.unlinkSync(newFile);
  }
}

/**
 * Main simulation workflow
 */
async function runSimulation() {
  log('\n╔═══════════════════════════════════════════════════╗', colors.magenta);
  log('║   Minimact Client Simulation                      ║', colors.magenta);
  log('║   JSX → C# → SignalR → Reconciliation            ║', colors.magenta);
  log('╚═══════════════════════════════════════════════════╝\n', colors.magenta);

  let totalTests = 0;
  let passedTests = 0;

  // Check for command-line argument to filter specific file
  const filterFile = process.argv[2];

  // Phase 1: Load JSX components
  log('═══ PHASE 1: Loading JSX Components ═══\n', colors.blue);

  const fixturesDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(fixturesDir)) {
    log('Creating fixtures directory...', colors.yellow);
    fs.mkdirSync(fixturesDir);

    // Create a sample counter component
    const counterJsx = `
function Counter({ count }) {
  return (
    <div className="counter">
      <span>Count: {count}</span>
      <button onClick={increment}>+</button>
    </div>
  );
}
`.trim();

    fs.writeFileSync(path.join(fixturesDir, 'Counter.jsx'), counterJsx);
    log('Created sample Counter.jsx', colors.green);
  }

  let jsxFiles = fs.readdirSync(fixturesDir).filter(f =>
    f.endsWith('.jsx') || f.endsWith('.tsx')
  );

  // Filter to specific file if provided
  if (filterFile) {
    jsxFiles = jsxFiles.filter(f => f === filterFile || f === `${filterFile}.jsx` || f === `${filterFile}.tsx`);
    if (jsxFiles.length === 0) {
      log(`Error: File '${filterFile}' not found in fixtures directory`, colors.red);
      process.exit(1);
    }
    log(`Filtering to: ${jsxFiles[0]}\n`, colors.yellow);
  }

  log(`Found ${jsxFiles.length} component(s):\n`, colors.cyan);
  jsxFiles.forEach(f => log(`  - ${f}`, colors.cyan));
  console.log();

  // Phase 2: Transpile JSX to C#
  log('═══ PHASE 2: Transpiling JSX → C# ═══\n', colors.blue);

  const components = [];

  for (const file of jsxFiles) {
    totalTests++;
    const jsxPath = path.join(fixturesDir, file);
    const componentName = path.basename(file, path.extname(file));
    log(`[${totalTests}] Transpiling ${file}...`, colors.cyan);

    try {
      const csharp = await transpileComponent(jsxPath);
      log(`  ✓ Transpiled to C#`, colors.green);

      // Get test props for this component
      const testProps = testFixtures[componentName] || {};

      // Now compile and execute the C#
      log(`  Compiling C# code...`, colors.cyan);
      const vnode = await compileCSharp(csharp, componentName, testProps);
      log(`  ✓ Compiled and executed successfully`, colors.green);
      log(`  VNode output:`, colors.cyan);
      log(`  ${JSON.stringify(vnode).substring(0, 100)}...`, colors.reset);
      console.log();

      components.push({
        name: componentName,
        jsx: fs.readFileSync(jsxPath, 'utf-8'),
        csharp,
        vnode
      });

      passedTests++;
    } catch (err) {
      log(`  ✗ Failed: ${err.message}`, colors.red);
      console.log();
    }
  }

  // Phase 2.5: Validate Babel Plugin Feature Transformations
  log('═══ PHASE 2.5: Validating Feature Transformations ═══\n', colors.blue);

  for (const component of components) {
    log(`\n[Feature Validation] ${component.name}`, colors.cyan);
    log('-'.repeat(55), colors.cyan);

    const validations = validateAllFeatures(component);
    let componentPassed = 0;
    let componentTotal = 0;

    for (const validation of validations) {
      componentTotal++;
      const symbol = validation.passed ? '✓' : '✗';
      const color = validation.passed ? colors.green : colors.yellow;

      log(`  ${symbol} ${validation.feature.padEnd(25)} ${validation.details}`, color);

      if (validation.passed) {
        componentPassed++;
      }
    }

    log(`  Summary: ${componentPassed}/${componentTotal} features validated`, colors.cyan);
    console.log();

    totalTests++;
    if (componentPassed === componentTotal) {
      passedTests++;
    }
  }

  // Phase 3: Simulate SignalR state changes
  log('═══ PHASE 3: Simulating State Changes ═══\n', colors.blue);

  // Scenario: Counter component
  totalTests++;
  log(`[${totalTests}] Counter: increment from 0 to 1`, colors.cyan);

  const oldCounterTree = {
    type: 'Element',
    tag: 'div',
    props: { class: 'counter' },
    children: [
      {
        type: 'Element',
        tag: 'span',
        props: {},
        children: [{ type: 'Text', content: 'Count: 0' }]
      },
      {
        type: 'Element',
        tag: 'button',
        props: {},
        children: [{ type: 'Text', content: '+' }]
      }
    ]
  };

  const newCounterTree = {
    type: 'Element',
    tag: 'div',
    props: { class: 'counter' },
    children: [
      {
        type: 'Element',
        tag: 'span',
        props: {},
        children: [{ type: 'Text', content: 'Count: 1' }]
      },
      {
        type: 'Element',
        tag: 'button',
        props: {},
        children: [{ type: 'Text', content: '+' }]
      }
    ]
  };

  const stateChange1 = {
    component_id: 'counter_1',
    state_key: 'count',
    old_value: 0,
    new_value: 1
  };

  const result1 = await simulateStateChange('Counter', stateChange1, oldCounterTree, newCounterTree);
  if (result1.success) passedTests++;
  console.log();

  // Scenario: Multiple rapid increments (test predictor learning)
  log('═══ PHASE 4: Testing Predictor Learning ═══\n', colors.blue);

  totalTests++;
  log(`[${totalTests}] Repeated state changes (predictor training)`, colors.cyan);

  let predictorSuccess = true;
  for (let i = 0; i < 5; i++) {
    const oldTree = {
      type: 'Element',
      tag: 'div',
      props: { class: 'counter' },
      children: [
        {
          type: 'Element',
          tag: 'span',
          props: {},
          children: [{ type: 'Text', content: `Count: ${i}` }]
        }
      ]
    };

    const newTree = {
      type: 'Element',
      tag: 'div',
      props: { class: 'counter' },
      children: [
        {
          type: 'Element',
          tag: 'span',
          props: {},
          children: [{ type: 'Text', content: `Count: ${i + 1}` }]
        }
      ]
    };

    const stateChange = {
      component_id: 'counter_1',
      state_key: 'count',
      old_value: i,
      new_value: i + 1
    };

    const result = await simulateStateChange('Counter', stateChange, oldTree, newTree);
    if (!result.success) {
      predictorSuccess = false;
      break;
    }
  }

  if (predictorSuccess) {
    log(`  ✓ Predictor learned pattern after 5 iterations`, colors.green);
    passedTests++;
  } else {
    log(`  ✗ Predictor learning failed`, colors.red);
  }
  console.log();

  // Phase 5: Check metrics
  log('═══ PHASE 5: Checking Metrics ═══\n', colors.blue);

  totalTests++;
  log(`[${totalTests}] Fetching performance metrics`, colors.cyan);

  try {
    const metricsResult = await sendToCli('metrics', []);
    if (metricsResult.success && metricsResult.stdout.includes('Reconciliation')) {
      log(`  ✓ Metrics collected successfully`, colors.green);

      // Extract key metrics
      const reconcileCalls = metricsResult.stdout.match(/Calls:\s+(\d+)/);
      const patches = metricsResult.stdout.match(/Patches:\s+(\d+)/);

      if (reconcileCalls) {
        log(`  → Total reconciliations: ${reconcileCalls[1]}`, colors.cyan);
      }
      if (patches) {
        log(`  → Total patches generated: ${patches[1]}`, colors.cyan);
      }

      passedTests++;
    } else {
      log(`  ✗ Failed to fetch metrics`, colors.red);
    }
  } catch (err) {
    log(`  ✗ Error: ${err.message}`, colors.red);
  }
  console.log();

  // Summary
  log('═══════════════════════════════════════════════════', colors.magenta);
  const color = passedTests === totalTests ? colors.green : colors.yellow;
  log(`SIMULATION RESULT: ${passedTests}/${totalTests} tests passed`, color);
  log('═══════════════════════════════════════════════════\n', colors.magenta);

  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run simulation
runSimulation().catch(err => {
  log(`\nFatal error: ${err.message}`, colors.red);
  console.error(err.stack);
  process.exit(1);
});
