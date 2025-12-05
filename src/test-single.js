#!/usr/bin/env node

/**
 * Test single JSX file - transpile to C# and display output
 * Runs both Babel plugin and Reluxer transformer, then compares outputs.
 * Usage: node test-single.js <filename.jsx>
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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

async function transpileComponent(jsxPath) {
  return new Promise((resolve, reject) => {
    const babelPluginDir = path.join(__dirname, 'babel-plugin-minimact');

    const nodeScript = `
      const babel = require('@babel/core');
      const fs = require('fs');
      const path = require('path');

      const code = fs.readFileSync('${jsxPath.replace(/\\/g, '\\\\')}', 'utf-8');
      const filename = '${jsxPath.replace(/\\/g, '\\\\')}'; // 🔥 Use full path instead of basename

      // Suppress console logs from Babel plugin (except DEBUG logs)
      const originalLog = console.log;
      console.log = (...args) => {
        if (args[0] && args[0].includes('[DEBUG]')) {
          originalLog(...args);
        }
      };

      const result = babel.transformSync(code, {
        presets: ['@babel/preset-typescript'], // NO React preset - we handle JSX ourselves!
        plugins: ['./index-full.cjs'],
        filename: filename
      });

      // Restore console.log
      console.log = originalLog;

      // The C# code is in metadata
      const csharpCode = result.metadata?.minimactCSharp || result.code;

      // Templates are written to file - read them
      // The babel plugin uses the component NAME (not filename) for templates
      // Extract component name from C# code: "public partial class ComponentName"
      let templatesJson = null;
      const componentNameMatch = csharpCode.match(/(?:public )?(?:partial )?class (\\w+)/);

      if (componentNameMatch) {
        const componentName = componentNameMatch[1];
        const templatesPath = path.join(__dirname, componentName + '.templates.json');

        try {
          if (fs.existsSync(templatesPath)) {
            templatesJson = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
          }
        } catch (err) {
          // Templates file not found or invalid
        }
      }

      // Output both as JSON so we can parse them
      console.log(JSON.stringify({ csharpCode, templatesJson }));
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
        try {
          const output = JSON.parse(stdout);
          resolve(output);
        } catch (err) {
          reject(new Error(`Failed to parse output: ${err.message}`));
        }
      } else {
        reject(new Error(`Babel failed: ${stderr}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Transpile using Reluxer (C# transformer)
 */
async function transpileWithReluxer(jsxPath) {
  return new Promise((resolve, reject) => {
    const reluxerDir = path.join(__dirname, 'reluxer-minimact', 'Reluxer.Transformer.Tests');

    // Run the Reluxer transformer
    const proc = spawn('dotnet', ['run', '--', jsxPath], {
      cwd: reluxerDir,
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
        // Parse the output - look for generated files
        const filename = path.basename(jsxPath).replace(/\.(jsx|tsx)$/, '');
        const outputDir = path.join(__dirname, 'test-output-lexer');

        const result = {
          csharpCode: '',
          templatesJson: null,
          hooksJson: null,
          structuralChangesJson: null,
          keysJson: null,
          stdout
        };

        // Read generated files
        const csPath = path.join(outputDir, `${filename}.cs`);
        const templatesPath = path.join(outputDir, `${filename}.templates.json`);
        const hooksPath = path.join(outputDir, `${filename}.hooks.json`);
        const structuralPath = path.join(outputDir, `${filename}.structural-changes.json`);
        const keysPath = path.join(outputDir, `${filename}.tsx.keys`);

        try {
          if (fs.existsSync(csPath)) {
            result.csharpCode = fs.readFileSync(csPath, 'utf-8');
          }
          if (fs.existsSync(templatesPath)) {
            result.templatesJson = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
          }
          if (fs.existsSync(hooksPath)) {
            result.hooksJson = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
          }
          if (fs.existsSync(structuralPath)) {
            result.structuralChangesJson = JSON.parse(fs.readFileSync(structuralPath, 'utf-8'));
          }
          if (fs.existsSync(keysPath)) {
            result.keysJson = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));
          }
        } catch (err) {
          // Some files may not exist
        }

        resolve(result);
      } else {
        reject(new Error(`Reluxer failed (code ${code}): ${stderr}\n${stdout}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Normalize C# code for comparison
 * - Extracts and sorts using statements
 * - Normalizes whitespace
 * - Removes comments
 * - Returns structured representation
 */
function normalizeCSharpCode(code) {
  if (!code) return { usings: [], namespace: '', body: '' };

  // Normalize line endings
  code = code.replace(/\r\n/g, '\n');

  // Extract using statements
  const usingRegex = /^using\s+[^;]+;/gm;
  const usings = (code.match(usingRegex) || [])
    .map(u => u.trim())
    .sort();

  // Remove using statements from code
  let body = code.replace(usingRegex, '');

  // Extract namespace
  const namespaceMatch = body.match(/namespace\s+([^;{]+)[;{]/);
  const namespace = namespaceMatch ? namespaceMatch[1].trim() : '';

  // Remove namespace declaration
  body = body.replace(/namespace\s+[^;{]+[;{]/, '');

  // Remove comments
  body = body.replace(/^\s*\/\/.*$/gm, '');      // Single-line comments
  body = body.replace(/\/\*[\s\S]*?\*\//g, '');  // Multi-line comments

  // Normalize whitespace (but preserve structure)
  body = body
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  return { usings, namespace, body };
}

/**
 * Compare two outputs and show differences
 */
function compareOutputs(babelResult, reluxerResult, filename) {
  log(`\n${'━'.repeat(80)}`, colors.cyan);
  log(`\n🔍 COMPARISON: Babel vs Reluxer\n`, colors.cyan);

  const differences = [];

  // Normalize both C# outputs
  const babelNorm = normalizeCSharpCode(babelResult.csharpCode);
  const reluxerNorm = normalizeCSharpCode(reluxerResult.csharpCode);

  // Compare usings (after sorting, should be equivalent)
  const babelUsings = babelNorm.usings.join('\n');
  const reluxerUsings = reluxerNorm.usings.join('\n');

  if (babelUsings === reluxerUsings) {
    log(`  ✅ Using statements: IDENTICAL (${babelNorm.usings.length} usings)`, colors.green);
  } else {
    const missingInReluxer = babelNorm.usings.filter(u => !reluxerNorm.usings.includes(u));
    const missingInBabel = reluxerNorm.usings.filter(u => !babelNorm.usings.includes(u));

    if (missingInReluxer.length === 0 && missingInBabel.length === 0) {
      log(`  ✅ Using statements: EQUIVALENT (different order, same content)`, colors.green);
    } else {
      log(`  ⚠️  Using statements: DIFFERENT`, colors.yellow);
      if (missingInReluxer.length > 0) {
        log(`    Missing in Reluxer: ${missingInReluxer.join(', ')}`, colors.red);
      }
      if (missingInBabel.length > 0) {
        log(`    Missing in Babel: ${missingInBabel.join(', ')}`, colors.yellow);
      }
      differences.push('usings');
    }
  }

  // Compare namespace
  if (babelNorm.namespace === reluxerNorm.namespace) {
    log(`  ✅ Namespace: IDENTICAL (${babelNorm.namespace || '(none)'})`, colors.green);
  } else {
    log(`  ⚠️  Namespace: DIFFERENT`, colors.yellow);
    log(`    Babel:   ${babelNorm.namespace || '(none)'}`, colors.red);
    log(`    Reluxer: ${reluxerNorm.namespace || '(none)'}`, colors.green);
    differences.push('namespace');
  }

  // Compare body (the actual class code)
  const babelBody = babelNorm.body.replace(/\s+/g, ' ').trim();
  const reluxerBody = reluxerNorm.body.replace(/\s+/g, ' ').trim();

  if (babelBody === reluxerBody) {
    log(`  ✅ Class body: IDENTICAL`, colors.green);
  } else {
    // Check if they're structurally similar (same tokens, different formatting)
    const babelTokens = babelBody.split(/\s+/).filter(t => t.length > 0);
    const reluxerTokens = reluxerBody.split(/\s+/).filter(t => t.length > 0);

    if (JSON.stringify(babelTokens) === JSON.stringify(reluxerTokens)) {
      log(`  ✅ Class body: EQUIVALENT (same tokens, different formatting)`, colors.green);
    } else {
      log(`  ❌ Class body: DIFFERENT`, colors.red);
      differences.push('class-body');

      // Find first difference
      const babelLines = babelNorm.body.split('\n');
      const reluxerLines = reluxerNorm.body.split('\n');
      let diffCount = 0;

      for (let i = 0; i < Math.max(babelLines.length, reluxerLines.length) && diffCount < 5; i++) {
        const bLine = (babelLines[i] || '').trim();
        const rLine = (reluxerLines[i] || '').trim();
        if (bLine !== rLine) {
          log(`    Line ${i + 1}:`, colors.yellow);
          log(`      Babel:   ${bLine.substring(0, 70)}`, colors.red);
          log(`      Reluxer: ${rLine.substring(0, 70)}`, colors.green);
          diffCount++;
        }
      }
      if (diffCount >= 5) {
        log(`    ... (more differences)`, colors.yellow);
      }
    }
  }

  // Compare templates
  const babelTemplates = babelResult.templatesJson?.templates || {};
  const reluxerTemplates = reluxerResult.templatesJson?.templates || {};
  const babelTemplateKeys = Object.keys(babelTemplates).sort();
  const reluxerTemplateKeys = Object.keys(reluxerTemplates).sort();

  // Separate content templates from attribute templates
  const isContentKey = k => !k.includes('@');
  const babelContentKeys = babelTemplateKeys.filter(isContentKey);
  const reluxerContentKeys = reluxerTemplateKeys.filter(isContentKey);
  const babelAttrKeys = babelTemplateKeys.filter(k => !isContentKey(k));
  const reluxerAttrKeys = reluxerTemplateKeys.filter(k => !isContentKey(k));

  // Compare content templates (more important)
  if (JSON.stringify(babelContentKeys) === JSON.stringify(reluxerContentKeys)) {
    log(`  ✅ Content templates: IDENTICAL (${babelContentKeys.length} templates)`, colors.green);
  } else {
    const onlyInBabel = babelContentKeys.filter(k => !reluxerContentKeys.includes(k));
    const onlyInReluxer = reluxerContentKeys.filter(k => !babelContentKeys.includes(k));

    if (onlyInBabel.length === 0 && onlyInReluxer.length === 0) {
      log(`  ✅ Content templates: EQUIVALENT`, colors.green);
    } else {
      log(`  ⚠️  Content templates: DIFFERENT`, colors.yellow);
      differences.push('content-templates');
      if (onlyInBabel.length > 0) {
        log(`    Only in Babel: ${onlyInBabel.join(', ')}`, colors.red);
      }
      if (onlyInReluxer.length > 0) {
        log(`    Only in Reluxer: ${onlyInReluxer.join(', ')}`, colors.green);
      }
    }
  }

  // Compare attribute templates (less critical - different approaches are OK)
  if (babelAttrKeys.length === reluxerAttrKeys.length) {
    log(`  ✅ Attribute templates: SAME COUNT (${babelAttrKeys.length} attrs)`, colors.green);
  } else {
    log(`  ℹ️  Attribute templates: DIFFERENT COUNT (Babel: ${babelAttrKeys.length}, Reluxer: ${reluxerAttrKeys.length})`, colors.cyan);
    // Not adding to differences - attribute template differences are often acceptable
  }

  // Compare template content for shared keys
  const sharedKeys = babelContentKeys.filter(k => reluxerContentKeys.includes(k));
  let templateContentDiffs = 0;
  for (const key of sharedKeys) {
    const babelTpl = babelTemplates[key];
    const reluxerTpl = reluxerTemplates[key];
    if (babelTpl.template !== reluxerTpl.template) {
      if (templateContentDiffs === 0) {
        log(`  ⚠️  Template content differences:`, colors.yellow);
      }
      if (templateContentDiffs < 3) {
        log(`    ${key}: "${babelTpl.template}" vs "${reluxerTpl.template}"`, colors.yellow);
      }
      templateContentDiffs++;
    }
  }
  if (templateContentDiffs > 3) {
    log(`    ... and ${templateContentDiffs - 3} more`, colors.yellow);
  }
  if (templateContentDiffs > 0) {
    differences.push('template-content');
  } else if (sharedKeys.length > 0) {
    log(`  ✅ Template content: IDENTICAL for ${sharedKeys.length} shared templates`, colors.green);
  }

  // Compare hooks
  const babelHooks = babelResult.hooksJson?.hooks || [];
  const reluxerHooks = reluxerResult.hooksJson?.hooks || [];

  if (reluxerResult.hooksJson) {
    log(`  📎 Hooks (Reluxer): ${reluxerHooks.length} hooks found`, colors.cyan);
    reluxerHooks.forEach(h => {
      log(`    - ${h.type}: ${h.varName || '(unnamed)'} [index: ${h.index}]`, colors.cyan);
    });
  }

  // Show structural changes if available
  if (reluxerResult.structuralChangesJson) {
    const changes = reluxerResult.structuralChangesJson.changes || [];
    log(`  🏗️  Structural changes (Reluxer): ${changes.length} operations`, colors.cyan);
  }

  // Show keys if available
  if (reluxerResult.keysJson) {
    const keyCount = Object.keys(reluxerResult.keysJson.keys || {}).length;
    log(`  🔑 Element keys (Reluxer): ${keyCount} keys generated`, colors.cyan);
  }

  // Summary
  log(`\n${'━'.repeat(80)}`, colors.cyan);
  if (differences.length === 0) {
    log(`\n✅ RESULT: Outputs are equivalent!`, colors.green);
  } else {
    log(`\n⚠️  RESULT: ${differences.length} difference(s) found: ${differences.join(', ')}`, colors.yellow);
  }

  return differences;
}

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    log('Usage: node test-single.js <path-to-file.tsx>', colors.red);
    log('Example: node test-single.js Counter.jsx', colors.cyan);
    log('Example: node test-single.js ../test-tsx/01-ComplexTemplateLiterals.tsx', colors.cyan);
    process.exit(1);
  }

  // Support both relative and absolute paths
  let jsxPath;
  if (path.isAbsolute(inputPath)) {
    jsxPath = inputPath;
  } else if (inputPath.includes('/') || inputPath.includes('\\')) {
    // Path with directory separator - resolve relative to current directory
    jsxPath = path.resolve(__dirname, inputPath);
  } else {
    // Just a filename - look in fixtures folder
    jsxPath = path.join(__dirname, 'fixtures', inputPath);
  }

  if (!fs.existsSync(jsxPath)) {
    log(`Error: File not found: ${jsxPath}`, colors.red);
    process.exit(1);
  }

  const filename = path.basename(jsxPath);

  log(`\n╔═══════════════════════════════════════════════════╗`, colors.cyan);
  log(`║   Testing: ${filename.padEnd(36)}║`, colors.cyan);
  log(`╚═══════════════════════════════════════════════════╝\n`, colors.cyan);

  try {
    log(`Transpiling ${filename}...`, colors.yellow);
    const result = await transpileComponent(jsxPath);
    const { csharpCode, templatesJson } = result;

    log(`\n✓ Transpiled successfully\n`, colors.green);

    // Display C# code
    log(`Generated C# code:\n`, colors.cyan);
    log(`${'='.repeat(80)}`, colors.cyan);

    // Add line numbers
    const lines = csharpCode.split('\n');
    lines.forEach((line, idx) => {
      const lineNum = String(idx + 1).padStart(4, ' ');
      console.log(`${colors.yellow}${lineNum}${colors.reset} ${line}`);
    });

    log(`${'='.repeat(80)}\n`, colors.cyan);
    log(`✓ Total lines: ${lines.length}`, colors.green);

    // Write C# code to output file (raw Babel output, no re-wrapping)
    // Each component gets its own folder to avoid conflicts
    const componentName = filename.replace(/\.(jsx|tsx)$/, '');
    const outputDir = path.join(__dirname, 'test-output-babel', componentName);
    const outputFilename = componentName + '.cs';
    const outputPath = path.join(outputDir, outputFilename);

    // Create component-specific directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write raw Babel output directly (no re-wrapping)
    fs.writeFileSync(outputPath, csharpCode, 'utf-8');
    log(`\n✓ Wrote C# output to: ${outputPath}`, colors.green);

    // Create a .csproj file for compilation
    const csprojContent = `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <OutputType>Library</OutputType>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="..\\..\\Minimact.AspNetCore\\Minimact.AspNetCore.csproj" />
  </ItemGroup>

</Project>
`;
    const csprojPath = path.join(outputDir, `${componentName}.csproj`);
    fs.writeFileSync(csprojPath, csprojContent, 'utf-8');

    // Try to compile the C# code
    log(`\nCompiling C# code...`, colors.yellow);
    try {
      const compileResult = await new Promise((resolve, reject) => {
        const dotnetProc = spawn('dotnet', ['build', outputDir], {
          cwd: __dirname,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let compileStdout = '';
        let compileStderr = '';

        dotnetProc.stdout.on('data', (data) => {
          compileStdout += data.toString();
        });

        dotnetProc.stderr.on('data', (data) => {
          compileStderr += data.toString();
        });

        dotnetProc.on('close', (code) => {
          resolve({ code, stdout: compileStdout, stderr: compileStderr });
        });

        dotnetProc.on('error', reject);
      });

      if (compileResult.code === 0) {
        log(`✓ C# compilation successful!`, colors.green);
      } else {
        log(`✗ C# compilation failed:`, colors.red);
        console.log(compileResult.stdout);
        console.log(compileResult.stderr);
      }
    } catch (compileErr) {
      log(`⚠ Could not compile C# code: ${compileErr.message}`, colors.yellow);
    }

    // Display Templates JSON
    if (templatesJson) {
      log(`\n${'━'.repeat(80)}`, colors.cyan);
      log(`\nGenerated Templates JSON:\n`, colors.cyan);
      log(`${'='.repeat(80)}`, colors.cyan);

      // Pretty print JSON with syntax highlighting
      const formattedJson = JSON.stringify(templatesJson, null, 2);
      const jsonLines = formattedJson.split('\n');
      jsonLines.forEach((line, idx) => {
        const lineNum = String(idx + 1).padStart(4, ' ');
        console.log(`${colors.yellow}${lineNum}${colors.reset} ${line}`);
      });

      log(`${'='.repeat(80)}\n`, colors.cyan);
      log(`✓ Template count: ${Object.keys(templatesJson.templates || {}).length}`, colors.green);

      // Write Templates JSON to output file
      const templatesOutputFilename = filename.replace(/\.(jsx|tsx)$/, '.templates.json');
      const templatesOutputPath = path.join(outputDir, templatesOutputFilename);
      fs.writeFileSync(templatesOutputPath, JSON.stringify(templatesJson, null, 2), 'utf-8');
      log(`✓ Wrote templates JSON to: ${templatesOutputPath}`, colors.green);

      // Show template types breakdown
      if (templatesJson.templates) {
        const types = {};
        for (const template of Object.values(templatesJson.templates)) {
          types[template.type] = (types[template.type] || 0) + 1;
        }
        log(`✓ Template types:`, colors.green);
        for (const [type, count] of Object.entries(types)) {
          log(`  - ${type}: ${count}`, colors.green);
        }
      }
    } else {
      log(`\n⚠ No templates JSON generated`, colors.yellow);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RELUXER TRANSPILATION
    // ═══════════════════════════════════════════════════════════════════════

    log(`\n${'═'.repeat(80)}`, colors.cyan);
    log(`\n🦀 RELUXER TRANSPILATION\n`, colors.cyan);

    try {
      log(`Transpiling ${filename} with Reluxer...`, colors.yellow);
      const reluxerResult = await transpileWithReluxer(jsxPath);

      if (reluxerResult.csharpCode) {
        log(`\n✓ Reluxer transpiled successfully`, colors.green);

        // Show summary
        log(`  - C# code: ${reluxerResult.csharpCode.split('\n').length} lines`, colors.cyan);
        if (reluxerResult.templatesJson) {
          log(`  - Templates: ${Object.keys(reluxerResult.templatesJson.templates || {}).length}`, colors.cyan);
        }
        if (reluxerResult.hooksJson) {
          log(`  - Hooks: ${reluxerResult.hooksJson.hooks?.length || 0}`, colors.cyan);
        }
        if (reluxerResult.structuralChangesJson) {
          log(`  - Structural changes: ${reluxerResult.structuralChangesJson.changes?.length || 0}`, colors.cyan);
        }
        if (reluxerResult.keysJson) {
          log(`  - Element keys: ${Object.keys(reluxerResult.keysJson.keys || {}).length}`, colors.cyan);
        }

        // Compare outputs (raw Babel output vs Reluxer output)
        compareOutputs(
          { csharpCode, templatesJson },
          reluxerResult,
          filename
        );
      } else {
        log(`\n⚠ Reluxer did not produce C# output`, colors.yellow);
        if (reluxerResult.stdout) {
          log(`\nReluxer output:`, colors.yellow);
          console.log(reluxerResult.stdout);
        }
      }
    } catch (reluxerErr) {
      log(`\n⚠ Reluxer transpilation failed: ${reluxerErr.message}`, colors.yellow);
    }

    log(`\n✓ Done!`, colors.green);

  } catch (err) {
    log(`\n✗ Babel failed: ${err.message}`, colors.red);
    process.exit(1);
  }
}

main().catch(err => {
  log(`\nFatal error: ${err.message}`, colors.red);
  console.error(err.stack);
  process.exit(1);
});
