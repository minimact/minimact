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
exports.ModuleManager = exports.AVAILABLE_MODULES = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const https_1 = __importDefault(require("https"));
/**
 * Known Minimact modules and their npm package names
 */
const MINIMACT_MODULES = {
    '@minimact/power': '@minimact/core',
    '@minimact/mvc': '@minimact/mvc',
    '@minimact/punch': '@minimact/punch',
    '@minimact/md': '@minimact/md',
    '@minimact/spa': '@minimact/spa'
};
/**
 * Available modules for initialization
 */
exports.AVAILABLE_MODULES = [
    {
        name: '@minimact/power',
        description: 'Advanced features (useServerTask, useComputed, usePaginatedServerTask)',
        recommended: true,
        category: 'minimact'
    },
    {
        name: '@minimact/mvc',
        description: 'MVC Bridge (useMvcState, useMvcViewModel)',
        recommended: true,
        category: 'minimact'
    },
    {
        name: '@minimact/punch',
        description: 'DOM element state tracking (useDomElementState)',
        recommended: false,
        category: 'minimact'
    },
    {
        name: '@minimact/md',
        description: 'Markdown rendering (useMarkdown, useRazorMarkdown)',
        recommended: false,
        category: 'minimact'
    },
    {
        name: 'lodash',
        description: 'Utility library for arrays, objects, strings, etc.',
        recommended: false,
        category: 'external'
    },
    {
        name: 'moment',
        description: 'Date/time manipulation library',
        recommended: false,
        category: 'external'
    },
    {
        name: 'dayjs',
        description: '2KB date library (Moment.js alternative)',
        recommended: false,
        category: 'external'
    },
    {
        name: 'axios',
        description: 'Promise-based HTTP client',
        recommended: false,
        category: 'external'
    },
    {
        name: 'chart.js',
        description: 'JavaScript charting library',
        recommended: false,
        category: 'external'
    }
];
/**
 * ModuleManager - Manages mact_modules with global cache (AppData)
 *
 * Architecture:
 * 1. Global Cache (AppData/minimact-cache/mact_modules) - Downloaded from npm once
 * 2. Project Cache (project/mact_modules) - Copied from global cache
 *
 * Benefits:
 * - Offline-friendly (download once, use everywhere)
 * - Fast project setup (copy from cache, not download)
 * - Shared across all projects
 */
class ModuleManager {
    constructor() {
        this.globalCachePath = this.getGlobalCachePath();
    }
    /**
     * Get the global cache directory for mact_modules
     * Similar to where Swig GUI is installed
     */
    getGlobalCachePath() {
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
     * Import (install) a module into a project using global cache
     */
    async importModule(packageName, projectRoot, options = {}) {
        const { force = false, onProgress } = options;
        const projectMactModulesDir = path.join(projectRoot, 'mact_modules');
        onProgress?.(`Importing ${packageName}...`);
        // Determine package directories (handle scoped packages like @minimact/power)
        const packageSubPath = packageName.startsWith('@')
            ? packageName.split('/').join(path.sep)
            : packageName;
        const globalPackageDir = path.join(this.globalCachePath, packageSubPath);
        const projectPackageDir = path.join(projectMactModulesDir, packageSubPath);
        // Check if already installed in project
        if (!force && await this.directoryExists(projectPackageDir)) {
            throw new Error(`${packageName} is already installed in project. Use force option to reinstall.`);
        }
        // Step 1: Check global cache, download if needed
        if (!await this.directoryExists(globalPackageDir) || force) {
            onProgress?.(`Downloading ${packageName} to global cache...`);
            // Determine npm package name (some Minimact modules are special)
            const npmPackageName = MINIMACT_MODULES[packageName] || packageName;
            // Create global cache directory
            await fs.mkdir(this.globalCachePath, { recursive: true });
            // Use npm to install package to a temporary location
            const tempDir = path.join(os.tmpdir(), 'minimact-import-' + Date.now());
            await fs.mkdir(tempDir, { recursive: true });
            // Run npm install in temp directory
            try {
                (0, child_process_1.execSync)(`npm install ${npmPackageName} --no-save --legacy-peer-deps`, {
                    cwd: tempDir,
                    stdio: 'pipe'
                });
            }
            catch (error) {
                // Clean up temp directory on error
                await fs.rm(tempDir, { recursive: true, force: true });
                throw new Error(`Failed to download ${npmPackageName} from npm: ${error.message}`);
            }
            // Find the installed package in node_modules
            const nodeModulesPath = path.join(tempDir, 'node_modules', npmPackageName);
            // Read package.json to find main/browser/module entry
            const pkgJsonPath = path.join(nodeModulesPath, 'package.json');
            const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'));
            // Find browser bundle (look for dist/*.min.js or similar)
            const bundlePath = await this.findBrowserBundle(nodeModulesPath, pkgJson);
            if (!bundlePath) {
                await fs.rm(tempDir, { recursive: true, force: true });
                throw new Error(`Could not find browser bundle for ${npmPackageName}. Package may not have a client-side build.`);
            }
            // Copy bundle to global cache
            const bundleFileName = path.basename(bundlePath);
            await fs.mkdir(globalPackageDir, { recursive: true });
            await fs.copyFile(bundlePath, path.join(globalPackageDir, bundleFileName));
            // Generate package.json for global cache
            const metadata = this.generatePackageJson(packageName, bundleFileName, pkgJson);
            await fs.writeFile(path.join(globalPackageDir, 'package.json'), JSON.stringify(metadata, null, 2), 'utf-8');
            // Clean up temp directory
            await fs.rm(tempDir, { recursive: true, force: true });
            onProgress?.(`Downloaded ${packageName} to global cache`);
        }
        else {
            onProgress?.(`Found ${packageName} in global cache`);
        }
        // Step 2: Copy from global cache to project
        onProgress?.(`Copying ${packageName} to project...`);
        // Create project mact_modules directory
        await fs.mkdir(projectMactModulesDir, { recursive: true });
        // Remove existing if force
        if (force && await this.directoryExists(projectPackageDir)) {
            await fs.rm(projectPackageDir, { recursive: true, force: true });
        }
        // Copy from global cache to project
        await this.copyDirectory(globalPackageDir, projectPackageDir);
        onProgress?.(`Successfully installed ${packageName}`);
    }
    /**
     * List installed modules in a project
     */
    async listModules(projectRoot) {
        const mactModulesDir = path.join(projectRoot, 'mact_modules');
        if (!await this.directoryExists(mactModulesDir)) {
            return [];
        }
        const modules = [];
        // Scan for package.json files
        const entries = await fs.readdir(mactModulesDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                // Handle scoped packages (@minimact/power)
                if (entry.name.startsWith('@')) {
                    const scopeDir = path.join(mactModulesDir, entry.name);
                    const subEntries = await fs.readdir(scopeDir, { withFileTypes: true });
                    for (const subEntry of subEntries) {
                        if (subEntry.isDirectory()) {
                            const modulePath = path.join(scopeDir, subEntry.name);
                            const module = await this.loadModuleMetadata(modulePath);
                            if (module) {
                                modules.push(module);
                            }
                        }
                    }
                }
                else {
                    // Regular package (lodash, moment, etc.)
                    const modulePath = path.join(mactModulesDir, entry.name);
                    const module = await this.loadModuleMetadata(modulePath);
                    if (module) {
                        modules.push(module);
                    }
                }
            }
        }
        return modules;
    }
    /**
     * Uninstall a module from a project
     */
    async uninstallModule(packageName, projectRoot) {
        const mactModulesDir = path.join(projectRoot, 'mact_modules');
        const packageSubPath = packageName.startsWith('@')
            ? packageName.split('/').join(path.sep)
            : packageName;
        const modulePath = path.join(mactModulesDir, packageSubPath);
        if (!await this.directoryExists(modulePath)) {
            throw new Error(`${packageName} is not installed in project`);
        }
        await fs.rm(modulePath, { recursive: true, force: true });
        // Clean up empty parent directories (for scoped packages)
        if (packageName.startsWith('@')) {
            const scopeDir = path.join(mactModulesDir, packageName.split('/')[0]);
            const remaining = await fs.readdir(scopeDir);
            if (remaining.length === 0) {
                await fs.rm(scopeDir, { recursive: true, force: true });
            }
        }
    }
    /**
     * Check if a module is installed in a project
     */
    async isModuleInstalled(packageName, projectRoot) {
        const mactModulesDir = path.join(projectRoot, 'mact_modules');
        const packageSubPath = packageName.startsWith('@')
            ? packageName.split('/').join(path.sep)
            : packageName;
        const modulePath = path.join(mactModulesDir, packageSubPath);
        return await this.directoryExists(modulePath);
    }
    /**
     * Get available modules for selection
     */
    getAvailableModules() {
        return exports.AVAILABLE_MODULES;
    }
    /**
     * Search npm registry for packages
     * @param query Search query
     * @param size Number of results to return (default: 20, max: 250)
     */
    async searchNpmRegistry(query, size = 20) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        return new Promise((resolve, reject) => {
            const searchUrl = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${Math.min(size, 250)}`;
            https_1.default.get(searchUrl, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        const results = response.objects.map((obj) => ({
                            name: obj.package.name,
                            version: obj.package.version,
                            description: obj.package.description || '',
                            keywords: obj.package.keywords || [],
                            date: obj.package.date,
                            links: obj.package.links,
                            publisher: obj.package.publisher,
                            maintainers: obj.package.maintainers,
                            score: obj.score
                        }));
                        // Sort by score (highest first)
                        results.sort((a, b) => b.score.final - a.score.final);
                        resolve(results);
                    }
                    catch (error) {
                        reject(new Error(`Failed to parse npm search results: ${error.message}`));
                    }
                });
            }).on('error', (error) => {
                reject(new Error(`Failed to search npm registry: ${error.message}`));
            });
        });
    }
    /**
     * Get package info from npm registry
     * @param packageName Package name to lookup
     */
    async getPackageInfo(packageName) {
        return new Promise((resolve) => {
            const packageUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`;
            https_1.default.get(packageUrl, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        if (res.statusCode === 200) {
                            const pkg = JSON.parse(data);
                            resolve({
                                name: pkg.name,
                                version: pkg.version,
                                description: pkg.description || ''
                            });
                        }
                        else {
                            resolve(null);
                        }
                    }
                    catch {
                        resolve(null);
                    }
                });
            }).on('error', () => {
                resolve(null);
            });
        });
    }
    // ===== Private Helper Methods =====
    async loadModuleMetadata(modulePath) {
        try {
            const pkgJsonPath = path.join(modulePath, 'package.json');
            const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'));
            // Get file size
            const mainFilePath = path.join(modulePath, pkgJson.main);
            const stats = await fs.stat(mainFilePath);
            return {
                name: pkgJson.name,
                version: pkgJson.version,
                description: pkgJson.description,
                size: stats.size,
                type: pkgJson.type,
                path: modulePath
            };
        }
        catch {
            return null;
        }
    }
    async findBrowserBundle(packagePath, pkgJson) {
        // Strategy 1: Check explicit browser field
        if (pkgJson.browser) {
            const browserPath = path.join(packagePath, pkgJson.browser);
            if (await this.fileExists(browserPath)) {
                return browserPath;
            }
        }
        // Strategy 2: Check for dist/*.min.js
        const distDir = path.join(packagePath, 'dist');
        if (await this.directoryExists(distDir)) {
            const files = await fs.readdir(distDir);
            const minFile = files.find(f => f.endsWith('.min.js') && !f.includes('esm'));
            if (minFile) {
                return path.join(distDir, minFile);
            }
            // Fallback to any .js file
            const jsFile = files.find(f => f.endsWith('.js') && !f.includes('esm'));
            if (jsFile) {
                return path.join(distDir, jsFile);
            }
        }
        // Strategy 3: Check main field
        if (pkgJson.main) {
            const mainPath = path.join(packagePath, pkgJson.main);
            if (await this.fileExists(mainPath)) {
                return mainPath;
            }
        }
        return null;
    }
    generatePackageJson(packageName, mainFile, npmPkgJson) {
        const isMinimactModule = packageName.startsWith('@minimact/');
        return {
            name: packageName,
            version: npmPkgJson.version || '0.0.0',
            description: npmPkgJson.description || `Client-side module: ${packageName}`,
            main: mainFile,
            type: isMinimactModule ? 'module' : 'umd',
            global: this.getGlobalName(packageName)
        };
    }
    getGlobalName(packageName) {
        const globals = {
            'lodash': '_',
            'moment': 'moment',
            'dayjs': 'dayjs',
            'axios': 'axios',
            'chart.js': 'Chart'
        };
        return globals[packageName];
    }
    async copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            }
            else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }
    async directoryExists(dir) {
        try {
            const stats = await fs.stat(dir);
            return stats.isDirectory();
        }
        catch {
            return false;
        }
    }
    async fileExists(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.isFile();
        }
        catch {
            return false;
        }
    }
}
exports.ModuleManager = ModuleManager;
