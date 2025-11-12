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
exports.listModulesCommand = listModulesCommand;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
/**
 * List all installed modules in mact_modules/
 */
async function listModulesCommand(options = {}) {
    const projectRoot = options.project || process.cwd();
    const mactModulesDir = path.join(projectRoot, 'mact_modules');
    // Check if mact_modules/ exists
    if (!await directoryExists(mactModulesDir)) {
        console.log(chalk_1.default.yellow('\n⚠️  No mact_modules/ directory found.'));
        console.log(chalk_1.default.gray('   Run `swig init` to initialize modules.\n'));
        return;
    }
    // Scan for all package.json files
    const modules = await scanModules(mactModulesDir);
    if (modules.length === 0) {
        console.log(chalk_1.default.yellow('\n⚠️  No modules installed in mact_modules/'));
        console.log(chalk_1.default.gray('   Run `swig import <package>` to install modules.\n'));
        return;
    }
    // Calculate total size
    const totalSize = modules.reduce((sum, mod) => sum + mod.size, 0);
    // Display modules
    console.log(chalk_1.default.cyan(`\n📦 Installed modules in mact_modules/:\n`));
    // Group by @minimact and others
    const minimactModules = modules.filter(m => m.name.startsWith('@minimact/'));
    const externalModules = modules.filter(m => !m.name.startsWith('@minimact/'));
    if (minimactModules.length > 0) {
        console.log(chalk_1.default.cyan('  Minimact modules:'));
        for (const mod of minimactModules) {
            displayModule(mod);
        }
        console.log();
    }
    if (externalModules.length > 0) {
        console.log(chalk_1.default.cyan('  External libraries:'));
        for (const mod of externalModules) {
            displayModule(mod);
        }
        console.log();
    }
    console.log(chalk_1.default.gray(`  Total: ${modules.length} module(s), ${formatSize(totalSize)}\n`));
}
/**
 * Display a single module
 */
function displayModule(mod) {
    const sizeStr = formatSize(mod.size).padEnd(10);
    const nameStr = `${mod.name}@${mod.version}`.padEnd(35);
    const typeTag = mod.type === 'module' ? chalk_1.default.blue('[ESM]') : chalk_1.default.green('[UMD]');
    console.log(chalk_1.default.gray('    •') + ` ${chalk_1.default.bold(nameStr)} ${typeTag} ${chalk_1.default.gray(sizeStr)}`);
    if (mod.description) {
        console.log(chalk_1.default.gray(`      ${mod.description}`));
    }
}
/**
 * Scan mact_modules/ for all installed modules
 */
async function scanModules(mactModulesDir) {
    const modules = [];
    async function scanDirectory(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                // Check if this directory has a package.json
                const packageJsonPath = path.join(fullPath, 'package.json');
                if (await fileExists(packageJsonPath)) {
                    try {
                        const pkgJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
                        // Calculate script file size
                        const scriptPath = path.join(fullPath, pkgJson.main);
                        let size = 0;
                        if (await fileExists(scriptPath)) {
                            const stats = await fs.stat(scriptPath);
                            size = stats.size;
                        }
                        modules.push({
                            name: pkgJson.name,
                            version: pkgJson.version,
                            description: pkgJson.description || '',
                            main: pkgJson.main,
                            size,
                            type: pkgJson.type || 'umd'
                        });
                    }
                    catch (error) {
                        console.warn(chalk_1.default.yellow(`⚠️  Failed to read ${packageJsonPath}: ${error.message}`));
                    }
                }
                else {
                    // Recursively scan subdirectories (for scoped packages like @minimact/*)
                    await scanDirectory(fullPath);
                }
            }
        }
    }
    await scanDirectory(mactModulesDir);
    // Sort: @minimact modules first, then alphabetically
    modules.sort((a, b) => {
        const aIsMinimact = a.name.startsWith('@minimact/');
        const bIsMinimact = b.name.startsWith('@minimact/');
        if (aIsMinimact && !bIsMinimact)
            return -1;
        if (!aIsMinimact && bIsMinimact)
            return 1;
        return a.name.localeCompare(b.name);
    });
    return modules;
}
/**
 * Format file size in human-readable format
 */
function formatSize(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
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
