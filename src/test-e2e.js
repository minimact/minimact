#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('╔═══════════════════════════════════════════════════╗');
console.log('║   Minimact End-to-End Test Runner (Node.js)       ║');
console.log('╚═══════════════════════════════════════════════════╝\n');

const isWindows = process.platform === 'win32';
const libExt = isWindows ? '.dll' : (process.platform === 'darwin' ? '.dylib' : '.so');
const libPrefix = isWindows ? '' : 'lib';
const libName = `${libPrefix}minimact${libExt}`;

let totalTests = 0;
let passedTests = 0;

function runCommand(command, description, options = {}) {
    console.log(`\n[${++totalTests}] ${description}...`);
    console.log(`    Command: ${command}`);

    try {
        const output = execSync(command, {
            encoding: 'utf8',
            stdio: options.silent ? 'pipe' : 'inherit',
            ...options
        });

        console.log(`    ✓ Success\n`);
        passedTests++;
        return output;
    } catch (error) {
        console.error(`    ✗ Failed!`);
        if (error.stdout) console.error(error.stdout);
        if (error.stderr) console.error(error.stderr);
        console.error(error.message);

        if (options.required !== false) {
            console.error('\n❌ Critical failure - stopping tests');
            process.exit(1);
        }
        return null;
    }
}

function checkFileExists(filePath, description) {
    console.log(`\n[${++totalTests}] Checking ${description}...`);
    console.log(`    Path: ${filePath}`);

    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`    ✓ Found (${(stats.size / 1024).toFixed(1)} KB)\n`);
        passedTests++;
        return true;
    } else {
        console.error(`    ✗ Not found!\n`);
        return false;
    }
}

// Step 1: Build Rust library
console.log('\n═══ PHASE 1: Rust Build ═══');
runCommand('cargo build --release', 'Building Rust library (release mode)');

const rustLibPath = path.join('target', 'release', libName);
checkFileExists(rustLibPath, 'Rust library artifact');

// Step 2: Build .NET test CLI
console.log('\n═══ PHASE 2: .NET Test CLI Build ═══');
runCommand('dotnet build TestCli/TestCli.csproj', 'Building .NET test CLI');

// Step 3: Copy Rust library to .NET output
console.log('\n═══ PHASE 3: Prepare Test Environment ═══');
const dotnetOutputDir = path.join('TestCli', 'bin', 'Debug', 'net8.0');
const targetLibPath = path.join(dotnetOutputDir, libName);

console.log(`\n[${++totalTests}] Copying Rust library to .NET output...`);
console.log(`    From: ${rustLibPath}`);
console.log(`    To:   ${targetLibPath}`);

try {
    if (!fs.existsSync(dotnetOutputDir)) {
        fs.mkdirSync(dotnetOutputDir, { recursive: true });
    }
    fs.copyFileSync(rustLibPath, targetLibPath);
    console.log('    ✓ Copied successfully\n');
    passedTests++;
} catch (error) {
    console.error(`    ✗ Copy failed: ${error.message}\n`);
    process.exit(1);
}

checkFileExists(targetLibPath, 'Rust library in .NET output');

// Step 4: Run .NET tests
console.log('\n═══ PHASE 4: Execute .NET Test Suite ═══');
const testOutput = runCommand(
    'dotnet run --project TestCli/TestCli.csproj --no-build',
    'Running .NET test CLI'
);

// Step 5: Analyze results
console.log('\n═══ PHASE 5: Test Analysis ═══');

if (testOutput) {
    const hasAllPassed = testOutput.includes('ALL TESTS PASSED');
    const hasSomeFailed = testOutput.includes('SOME TESTS FAILED');

    console.log(`\n[${++totalTests}] Analyzing test results...`);

    if (hasAllPassed) {
        console.log('    ✓ All .NET tests reported success\n');
        passedTests++;
    } else if (hasSomeFailed) {
        console.error('    ✗ Some .NET tests failed\n');
    } else {
        console.warn('    ⚠ Could not parse test results\n');
    }
}

// Optional: Run Rust tests
console.log('\n═══ PHASE 6: Rust Unit Tests (Optional) ═══');
runCommand('cargo test', 'Running Rust unit tests', { required: false });

// Final summary
console.log('\n' + '═'.repeat(55));
console.log('FINAL SUMMARY');
console.log('═'.repeat(55));
console.log(`Total checks: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);

if (passedTests === totalTests) {
    console.log('\n✅ ALL CHECKS PASSED - System is ready!');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${totalTests - passedTests} checks failed`);
    process.exit(1);
}
