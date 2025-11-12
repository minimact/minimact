"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importCommand = importCommand;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
/**
 * Known Minimact modules and their npm package names
 */
const MINIMACT_MODULES = {
    '@minimact/power': '@minimact/core', // power is part of @minimact/core package
    '@minimact/mvc': '@minimact/mvc',
    '@minimact/punch': '@minimact/punch',
    '@minimact/md': '@minimact/md',
    '@minimact/spa': '@minimact/spa'
};
/**
 * Get the global cache directory for mact_modules
 * Similar to how Swig GUI is installed
 */
function getGlobalCachePath() {
    const platform = os.platform();
    if (platform === 'win32') {
        return path.join(process.env.APPDATA || os.homedir(), 'minimact-cache', 'mact_modules');
    }
    else if (platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'minimact-cache', 'mact_modules');
    }
    else {
        return path.join(os.homedir(), '.local', 'share', 'minimact-cache', 'mact_modules');
    }
}
/**
 * Import (install) a module into mact_modules/ using global cache
 */
async function importCommand(packageName, options = {}) {
    const projectRoot = options.project || process.cwd();
    const projectMactModulesDir = path.join(projectRoot, 'mact_modules');
    const globalCachePath = getGlobalCachePath();
    console.log(chalk_1.default.cyan(`\n📦 Importing ${chalk_1.default.bold(packageName)}...\n`));
    // Determine package directories (handle scoped packages like @minimact/power)
    const packageSubPath = packageName.startsWith('@')
        ? packageName.split('/').join(path.sep)
        : packageName;
    const globalPackageDir = path.join(globalCachePath, packageSubPath);
    const projectPackageDir = path.join(projectMactModulesDir, packageSubPath);
    // Check if already installed in project
    if (!options.force && await directoryExists(projectPackageDir)) {
        console.log(chalk_1.default.yellow(`⚠️  ${packageName} is already installed in project`));
        console.log(chalk_1.default.gray(`   Use --force to reinstall\n`));
        return;
    }
    let spinner = (0, ora_1.default)();
    try {
        // Step 1: Check global cache, download if needed
        if (!await directoryExists(globalPackageDir) || options.force) {
            spinner.start(`Downloading ${packageName} to global cache...`);
            // Determine npm package name (some Minimact modules are special)
            const npmPackageName = MINIMACT_MODULES[packageName] || packageName;
            // Create global cache directory
            await fs.mkdir(globalCachePath, { recursive: true });
            // Use npm to install package to a temporary location
            const tempDir = path.join(os.tmpdir(), 'minimact-import-' + Date.now());
            await fs.mkdir(tempDir, { recursive: true });
            // Run npm install in temp directory
            (0, child_process_1.execSync)(`npm install ${npmPackageName} --no-save --legacy-peer-deps`, {
                cwd: tempDir,
                stdio: 'pipe'
            });
            // Find the installed package in node_modules
            const nodeModulesPath = path.join(tempDir, 'node_modules', npmPackageName);
            // Read package.json to find main/browser/module entry
            const pkgJsonPath = path.join(nodeModulesPath, 'package.json');
            const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'));
            // Find browser bundle (look for dist/*.min.js or similar)
            const bundlePath = await findBrowserBundle(nodeModulesPath, pkgJson);
            if (!bundlePath) {
                throw new Error(`Could not find browser bundle for ${npmPackageName}. Package may not have a client-side build.`);
            }
            // Copy bundle to global cache
            const bundleFileName = path.basename(bundlePath);
            await fs.mkdir(globalPackageDir, { recursive: true });
            await fs.copyFile(bundlePath, path.join(globalPackageDir, bundleFileName));
            // Generate package.json for global cache
            const metadata = generatePackageJson(packageName, bundleFileName, pkgJson);
            await fs.writeFile(path.join(globalPackageDir, 'package.json'), JSON.stringify(metadata, null, 2), 'utf-8');
            // Clean up temp directory
            await fs.rm(tempDir, { recursive: true, force: true });
            spinner.succeed(`Downloaded ${packageName} to global cache`);
        }
        else {
            console.log(chalk_1.default.gray(`   Found ${packageName} in global cache`));
        }
        // Step 2: Copy from global cache to project
        spinner.start(`Copying ${packageName} to project...`);
        // Create project mact_modules directory
        await fs.mkdir(projectMactModulesDir, { recursive: true });
        // Remove existing if force
        if (options.force && await directoryExists(projectPackageDir)) {
            await fs.rm(projectPackageDir, { recursive: true, force: true });
        }
        // Copy from global cache to project
        await copyDirectory(globalPackageDir, projectPackageDir);
        spinner.succeed(`Copied ${packageName} to project`);
        // Read package.json for version info
        const pkgJson = JSON.parse(await fs.readFile(path.join(projectPackageDir, 'package.json'), 'utf-8'));
        console.log(chalk_1.default.green(`\n✅ Successfully installed ${chalk_1.default.bold(packageName)}@${pkgJson.version}`));
        console.log(chalk_1.default.gray(`   Global cache: ${globalPackageDir}`));
        console.log(chalk_1.default.gray(`   Project: ${projectPackageDir}`));
        if (pkgJson.description) {
            console.log(chalk_1.default.gray(`   ${pkgJson.description}`));
        }
        console.log();
    }
    catch (error) {
        spinner.fail('Failed to install module');
        console.error(chalk_1.default.red(`\n❌ Error: ${error.message}\n`));
        process.exit(1);
    }
}
/**
 * Find browser bundle in installed package
 */
async function findBrowserBundle(packagePath, pkgJson) {
    // Check package.json for browser field
    if (pkgJson.browser) {
        const browserPath = path.join(packagePath, pkgJson.browser);
        if (await fileExists(browserPath)) {
            return browserPath;
        }
    }
    // Check for common dist locations
    const commonPaths = [
        'dist/*.min.js',
        'dist/*.umd.js',
        'dist/*.browser.js',
        'dist/index.js',
        'build/*.min.js',
        'umd/*.min.js',
        pkgJson.main,
        pkgJson.module
    ];
    for (const pattern of commonPaths) {
        if (!pattern)
            continue;
        if (pattern.includes('*')) {
            // Glob pattern
            const dir = path.join(packagePath, path.dirname(pattern));
            const ext = path.extname(pattern).substring(1);
            if (await directoryExists(dir)) {
                const files = await fs.readdir(dir);
                const match = files.find(f => f.endsWith(ext));
                if (match) {
                    return path.join(dir, match);
                }
            }
        }
        else {
            // Direct path
            const fullPath = path.join(packagePath, pattern);
            if (await fileExists(fullPath)) {
                return fullPath;
            }
        }
    }
    return null;
}
/**
 * Generate package.json metadata for mact_modules
 */
function generatePackageJson(packageName, mainFile, npmPackageJson) {
    const metadata = {
        name: packageName,
        version: npmPackageJson.version,
        description: npmPackageJson.description || `Client-side module: ${packageName}`,
        main: mainFile,
        type: packageName.startsWith('@minimact/') ? 'module' : 'umd'
    };
    // Detect global variable name for UMD modules
    if (metadata.type === 'umd') {
        const globalNames = {
            'lodash': '_',
            'moment': 'moment',
            'axios': 'axios',
            'dayjs': 'dayjs',
            'chart.js': 'Chart'
        };
        if (globalNames[packageName]) {
            metadata.global = globalNames[packageName];
        }
    }
    return metadata;
}
/**
 * Check if directory exists
 */
async function directoryExists(dir) {
    try {
        const stats = await fs.stat(dir);
        return stats.isDirectory();
    }
    catch {
        return false;
    }
}
/**
 * Check if file exists
 */
async function fileExists(file) {
    try {
        const stats = await fs.stat(file);
        return stats.isFile();
    }
    catch {
        return false;
    }
}
/**
 * Recursively copy directory
 */
async function copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        }
        else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}
