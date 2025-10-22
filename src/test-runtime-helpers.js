#!/usr/bin/env node

/**
 * Test runtime helpers (Minimact.createElement, Minimact.Fragment, etc.)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runCSharpTest(code, description) {
  log(`\nTesting: ${description}`, colors.cyan);

  const tempDir = path.join(__dirname, '.temp-helper-test');
  const projectDir = path.join(tempDir, 'HelperTest');

  try {
    // Create temp project
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    fs.mkdirSync(projectDir, { recursive: true });

    // Create .csproj
    const csproj = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="../../Minimact.Runtime/Minimact.Runtime.csproj" />
  </ItemGroup>
</Project>`;

    // Create Program.cs (using top-level statements for .NET 8+)
    const programCs = `using Minimact.Runtime.Core;
using MinimactHelpers = Minimact.Runtime.Core.Minimact;
using Newtonsoft.Json;
using System;
using System.Linq;

${code}

try
{
    var result = Test();
    var json = JsonConvert.SerializeObject(result, Formatting.None);
    Console.WriteLine(json);
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Error: {ex.Message}");
    Environment.Exit(1);
}`;

    fs.writeFileSync(path.join(projectDir, 'HelperTest.csproj'), csproj);
    fs.writeFileSync(path.join(projectDir, 'Program.cs'), programCs);

    // Build
    await new Promise((resolve, reject) => {
      const buildProc = spawn('dotnet', ['build', '--verbosity', 'normal'], {
        cwd: projectDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      buildProc.stdout.on('data', (data) => { stdout += data.toString(); });
      buildProc.stderr.on('data', (data) => { stderr += data.toString(); });

      buildProc.on('close', (code) => {
        if (code === 0) resolve();
        else {
          console.error('Build output:', stdout);
          console.error('Build stderr:', stderr);
          reject(new Error(`Build failed`));
        }
      });
    });

    // Run
    const output = await new Promise((resolve, reject) => {
      const runProc = spawn('dotnet', ['run', '--no-build'], {
        cwd: projectDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      runProc.stdout.on('data', (data) => { stdout += data.toString(); });
      runProc.stderr.on('data', (data) => { stderr += data.toString(); });

      runProc.on('close', (code) => {
        if (code === 0) resolve(stdout.trim());
        else reject(new Error(`Execution failed: ${stderr}`));
      });
    });

    // Cleanup
    fs.rmSync(projectDir, { recursive: true, force: true });

    log(`  ✓ ${description}`, colors.green);
    log(`  Output: ${output.substring(0, 100)}...`, colors.reset);
    return true;

  } catch (err) {
    log(`  ✗ Failed: ${err.message}`, colors.red);
    return false;
  }
}

async function main() {
  log('╔═══════════════════════════════════════════════════╗', colors.cyan);
  log('║   Minimact Runtime Helpers Test Suite             ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════╝', colors.cyan);

  let passed = 0;
  let total = 0;

  // Test 1: createElement with static props
  total++;
  if (await runCSharpTest(`
static VNode Test()
{
    return MinimactHelpers.createElement("div",
        new { className = "container", id = "main" },
        "Hello World"
    );
}
`, 'createElement with static props')) {
    passed++;
  }

  // Test 2: createElement with children array
  total++;
  if (await runCSharpTest(`
static VNode Test()
{
    return MinimactHelpers.createElement("ul", null,
        MinimactHelpers.createElement("li", null, "Item 1"),
        MinimactHelpers.createElement("li", null, "Item 2"),
        MinimactHelpers.createElement("li", null, "Item 3")
    );
}
`, 'createElement with multiple children')) {
    passed++;
  }

  // Test 3: Fragment
  total++;
  if (await runCSharpTest(`
static VNode Test()
{
    return MinimactHelpers.Fragment(
        MinimactHelpers.createElement("h1", null, "Title"),
        MinimactHelpers.createElement("p", null, "Paragraph")
    );
}
`, 'Fragment with multiple children')) {
    passed++;
  }

  // Test 4: MergeWith (spread operator)
  total++;
  if (await runCSharpTest(`
static VNode Test()
{
    var baseProps = new { id = "btn1", className = "button" };
    var extraProps = new { disabled = "true", type = "submit" };
    var merged = baseProps.MergeWith(extraProps);

    return MinimactHelpers.createElement("button", merged, "Submit");
}
`, 'MergeWith for spread operator')) {
    passed++;
  }

  // Test 5: Dynamic children from LINQ
  total++;
  if (await runCSharpTest(`
static VNode Test()
{
    var items = new[] { 1, 2, 3, 4, 5 };
    return MinimactHelpers.createElement("ul", null,
        items.Select(i => MinimactHelpers.createElement("li", new { key = i.ToString() }, $"Item {i}")).ToArray()
    );
}
`, 'Dynamic children from LINQ Select')) {
    passed++;
  }

  // Summary
  log('\n═══════════════════════════════════════════════════', colors.cyan);
  if (passed === total) {
    log(`✓ ALL TESTS PASSED (${passed}/${total})`, colors.green);
  } else {
    log(`⚠ SOME TESTS FAILED (${passed}/${total})`, colors.yellow);
  }
  log('═══════════════════════════════════════════════════\n', colors.cyan);

  process.exit(passed === total ? 0 : 1);
}

main().catch(err => {
  log(`\nFatal error: ${err.message}`, colors.red);
  console.error(err.stack);
  process.exit(1);
});
