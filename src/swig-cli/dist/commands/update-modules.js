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
exports.updateModulesCommand = updateModulesCommand;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const prompts_1 = __importDefault(require("prompts"));
const import_1 = require("./import");
/**
 * Update modules in mact_modules/
 */
async function updateModulesCommand(packageName, options = {}) {
    const projectRoot = options.project || process.cwd();
    const mactModulesDir = path.join(projectRoot, 'mact_modules');
    console.log(chalk_1.default.cyan('\n🔄 Update modules\n'));
    // Check if mact_modules/ exists
    if (!await directoryExists(mactModulesDir)) {
        console.log(chalk_1.default.yellow('⚠️  No mact_modules/ directory found.'));
        console.log(chalk_1.default.gray('   Run `swig init` to initialize modules.\n'));
        return;
    }
    // Scan installed modules
    const installedModules = await scanModules(mactModulesDir);
    if (installedModules.length === 0) {
        console.log(chalk_1.default.yellow('⚠️  No modules installed in mact_modules/'));
        console.log(chalk_1.default.gray('   Run `swig import <package>` to install modules.\n'));
        return;
    }
    let modulesToUpdate = [];
    if (options.all) {
        // Update all modules
        modulesToUpdate = installedModules;
        console.log(chalk_1.default.cyan(`Updating all ${installedModules.length} module(s)...\n`));
    }
    else if (packageName) {
        // Update specific module
        const module = installedModules.find(m => m.name === packageName);
        if (!module) {
            console.log(chalk_1.default.yellow(`⚠️  ${packageName} is not installed.`));
            console.log(chalk_1.default.gray('   Use `swig list` to see installed modules.\n'));
            return;
        }
        modulesToUpdate = [module];
        console.log(chalk_1.default.cyan(`Updating ${packageName}...\n`));
    }
    else {
        // Interactive selection
        console.log(chalk_1.default.gray('Installed modules:\n'));
        const { selectedModules } = await (0, prompts_1.default)({
            type: 'multiselect',
            name: 'selectedModules',
            message: 'Select modules to update:',
            choices: installedModules.map(mod => ({
                title: `${mod.name}@${mod.version}`,
                value: mod.name,
                selected: false
            })),
            hint: 'Space to select, Enter to confirm',
            instructions: false
        });
        if (!selectedModules || selectedModules.length === 0) {
            console.log(chalk_1.default.yellow('\n⚠️  No modules selected. Exiting.\n'));
            return;
        }
        modulesToUpdate = installedModules.filter(m => selectedModules.includes(m.name));
        console.log();
    }
    // Update each selected module
    let successCount = 0;
    let failCount = 0;
    for (const module of modulesToUpdate) {
        try {
            console.log(chalk_1.default.cyan(`\n📦 Updating ${module.name}@${module.version}...`));
            await (0, import_1.importCommand)(module.name, { project: projectRoot, force: true });
            successCount++;
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Failed to update ${module.name}: ${error.message}`));
            failCount++;
        }
    }
    // Summary
    console.log(chalk_1.default.cyan('\n' + '━'.repeat(50)));
    if (successCount > 0) {
        console.log(chalk_1.default.green(`\n✅ Successfully updated ${successCount} module(s)`));
    }
    if (failCount > 0) {
        console.log(chalk_1.default.red(`❌ Failed to update ${failCount} module(s)`));
    }
    console.log(chalk_1.default.gray('\n   Use `swig list` to view updated modules\n'));
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
                        modules.push({
                            name: pkgJson.name,
                            version: pkgJson.version,
                            path: fullPath
                        });
                    }
                    catch (error) {
                        // Ignore modules with invalid package.json
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
