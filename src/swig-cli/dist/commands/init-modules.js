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
exports.initModulesCommand = initModulesCommand;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const prompts_1 = __importDefault(require("prompts"));
const import_1 = require("./import");
/**
 * Available modules for initialization
 */
const AVAILABLE_MODULES = [
    {
        name: '@minimact/power',
        description: 'Advanced features (useServerTask, useComputed, usePaginatedServerTask)',
        recommended: true
    },
    {
        name: '@minimact/mvc',
        description: 'MVC Bridge (useMvcState, useMvcViewModel)',
        recommended: true
    },
    {
        name: '@minimact/punch',
        description: 'DOM element state tracking (useDomElementState)',
        recommended: false
    },
    {
        name: '@minimact/md',
        description: 'Markdown rendering (useMarkdown, useRazorMarkdown)',
        recommended: false
    },
    {
        name: 'lodash',
        description: 'Utility library for arrays, objects, strings, etc.',
        recommended: false
    },
    {
        name: 'moment',
        description: 'Date/time manipulation library',
        recommended: false
    },
    {
        name: 'dayjs',
        description: '2KB date library (Moment.js alternative)',
        recommended: false
    },
    {
        name: 'axios',
        description: 'Promise-based HTTP client',
        recommended: false
    },
    {
        name: 'chart.js',
        description: 'JavaScript charting library',
        recommended: false
    }
];
/**
 * Initialize mact_modules/ with interactive module selection
 */
async function initModulesCommand(options = {}) {
    const projectRoot = options.project || process.cwd();
    const mactModulesDir = path.join(projectRoot, 'mact_modules');
    console.log(chalk_1.default.cyan('\n📦 Initialize mact_modules/\n'));
    console.log(chalk_1.default.gray('Select modules to install in your project:\n'));
    // Check if mact_modules/ already exists
    if (await directoryExists(mactModulesDir)) {
        const { shouldContinue } = await (0, prompts_1.default)({
            type: 'confirm',
            name: 'shouldContinue',
            message: 'mact_modules/ already exists. Continue and add more modules?',
            initial: true
        });
        if (!shouldContinue) {
            console.log(chalk_1.default.gray('\nAborted.\n'));
            return;
        }
        console.log();
    }
    // Prompt for module selection
    const { selectedModules } = await (0, prompts_1.default)({
        type: 'multiselect',
        name: 'selectedModules',
        message: 'Select modules to install:',
        choices: AVAILABLE_MODULES.map(mod => ({
            title: `${mod.name} ${mod.recommended ? chalk_1.default.cyan('(recommended)') : ''}`,
            description: mod.description,
            value: mod.name,
            selected: mod.recommended
        })),
        hint: 'Space to select, Enter to confirm',
        instructions: false
    });
    if (!selectedModules || selectedModules.length === 0) {
        console.log(chalk_1.default.yellow('\n⚠️  No modules selected. Exiting.\n'));
        return;
    }
    console.log(chalk_1.default.cyan(`\n📦 Installing ${selectedModules.length} module(s)...\n`));
    // Install each selected module
    let successCount = 0;
    let failCount = 0;
    for (const moduleName of selectedModules) {
        try {
            await (0, import_1.importCommand)(moduleName, { project: projectRoot });
            successCount++;
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Failed to install ${moduleName}: ${error.message}`));
            failCount++;
        }
    }
    // Summary
    console.log(chalk_1.default.cyan('━'.repeat(50)));
    if (successCount > 0) {
        console.log(chalk_1.default.green(`\n✅ Successfully installed ${successCount} module(s)`));
    }
    if (failCount > 0) {
        console.log(chalk_1.default.red(`❌ Failed to install ${failCount} module(s)`));
    }
    console.log(chalk_1.default.gray(`\n📁 Modules installed in: ${mactModulesDir}`));
    console.log(chalk_1.default.gray('   Use `swig list` to view installed modules'));
    console.log(chalk_1.default.gray('   Use `swig import <package>` to add more modules\n'));
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
