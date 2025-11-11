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
exports.removeCommand = removeCommand;
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const prompts_1 = __importDefault(require("prompts"));
const chalk_1 = __importDefault(require("chalk"));
/**
 * Remove command - Remove a page and its controller
 */
async function removeCommand(pageName, options = {}) {
    const projectPath = options.project || process.cwd();
    // Interactive mode if pageName not provided
    if (!pageName) {
        console.log(chalk_1.default.bold.cyan('🗑️  Remove a page from your Minimact project\n'));
        // Scan for existing pages
        const pagesDir = path.join(projectPath, 'Pages');
        let existingPages = [];
        try {
            const files = await fs.readdir(pagesDir);
            existingPages = files
                .filter((f) => f.endsWith('.tsx'))
                .map((f) => f.replace('.tsx', ''));
        }
        catch {
            console.error(chalk_1.default.red('❌ Pages directory not found. Are you in a Minimact project?'));
            process.exit(1);
        }
        if (existingPages.length === 0) {
            console.error(chalk_1.default.red('❌ No pages found in the project.'));
            process.exit(1);
        }
        const answers = await (0, prompts_1.default)([
            {
                type: 'select',
                name: 'pageName',
                message: 'Select a page to remove:',
                choices: existingPages.map((p) => ({
                    title: p,
                    value: p
                }))
            },
            {
                type: 'confirm',
                name: 'confirmDelete',
                message: (prev) => `Are you sure you want to delete ${chalk_1.default.red(prev)}?`,
                initial: false
            }
        ]);
        // User cancelled
        if (!answers.pageName || !answers.confirmDelete) {
            console.log(chalk_1.default.yellow('\n❌ Cancelled'));
            process.exit(0);
        }
        pageName = answers.pageName;
        console.log('');
    }
    else if (!options.force) {
        // Confirm deletion if not using --force
        const { confirmDelete } = await (0, prompts_1.default)({
            type: 'confirm',
            name: 'confirmDelete',
            message: `Are you sure you want to delete ${chalk_1.default.red(pageName)}?`,
            initial: false
        });
        if (!confirmDelete) {
            console.log(chalk_1.default.yellow('\n❌ Cancelled'));
            process.exit(0);
        }
    }
    console.log(chalk_1.default.bold(`🗑️  Removing page: ${chalk_1.default.red(pageName)}`));
    console.log('');
    try {
        // Ensure page name ends with "Page"
        const pageClassName = pageName.endsWith('Page') ? pageName : `${pageName}Page`;
        const controllerName = pageName.replace(/Page$/, '') + 'Controller';
        const viewModelName = pageName.replace(/Page$/, '') + 'ViewModel';
        const pagesDir = path.join(projectPath, 'Pages');
        const controllersDir = path.join(projectPath, 'Controllers');
        const viewModelsDir = path.join(projectPath, 'ViewModels');
        let filesRemoved = 0;
        // Remove Page files (.tsx, .cs, .tsx.keys, .hooks.json, .templates.json, .structural-changes.json)
        const pageBasePath = path.join(pagesDir, pageClassName);
        const pageExtensions = ['.tsx', '.cs', '.tsx.keys', '.hooks.json', '.templates.json', '.structural-changes.json'];
        for (const ext of pageExtensions) {
            const filePath = pageBasePath + ext;
            try {
                await fs.unlink(filePath);
                console.log(chalk_1.default.gray(`   ✓ Removed ${path.relative(projectPath, filePath)}`));
                filesRemoved++;
            }
            catch {
                // File doesn't exist, skip
            }
        }
        // Remove Controller
        const controllerPath = path.join(controllersDir, `${controllerName}.cs`);
        try {
            await fs.unlink(controllerPath);
            console.log(chalk_1.default.gray(`   ✓ Removed ${path.relative(projectPath, controllerPath)}`));
            filesRemoved++;
        }
        catch {
            // File doesn't exist
        }
        // Remove ViewModel (if exists)
        const viewModelPath = path.join(viewModelsDir, `${viewModelName}.cs`);
        try {
            await fs.unlink(viewModelPath);
            console.log(chalk_1.default.gray(`   ✓ Removed ${path.relative(projectPath, viewModelPath)}`));
            filesRemoved++;
        }
        catch {
            // File doesn't exist
        }
        if (filesRemoved === 0) {
            console.log(chalk_1.default.yellow('   ⚠️  No files found to remove'));
        }
        else {
            console.log(chalk_1.default.green.bold(`\n✅ Removed ${filesRemoved} file(s) successfully!`));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Failed to remove page:'), error);
        throw error;
    }
}
