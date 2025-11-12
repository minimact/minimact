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
exports.uninstallCommand = uninstallCommand;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const prompts_1 = __importDefault(require("prompts"));
const ora_1 = __importDefault(require("ora"));
/**
 * Uninstall a module from mact_modules/
 */
async function uninstallCommand(packageName, options = {}) {
    const projectRoot = options.project || process.cwd();
    const mactModulesDir = path.join(projectRoot, 'mact_modules');
    console.log(chalk_1.default.cyan(`\n🗑️  Uninstalling ${chalk_1.default.bold(packageName)}...\n`));
    // Check if mact_modules/ exists
    if (!await directoryExists(mactModulesDir)) {
        console.log(chalk_1.default.yellow('⚠️  No mact_modules/ directory found.'));
        console.log(chalk_1.default.gray('   Nothing to uninstall.\n'));
        return;
    }
    // Determine package directory (handle scoped packages like @minimact/power)
    const packageSubPath = packageName.startsWith('@')
        ? packageName.split('/').join(path.sep)
        : packageName;
    const packageDir = path.join(mactModulesDir, packageSubPath);
    // Check if module is installed
    if (!await directoryExists(packageDir)) {
        console.log(chalk_1.default.yellow(`⚠️  ${packageName} is not installed.`));
        console.log(chalk_1.default.gray('   Use `swig list` to see installed modules.\n'));
        return;
    }
    // Read package.json for version info
    let version = 'unknown';
    try {
        const pkgJson = JSON.parse(await fs.readFile(path.join(packageDir, 'package.json'), 'utf-8'));
        version = pkgJson.version;
    }
    catch {
        // Ignore if can't read package.json
    }
    // Confirm deletion (unless --force)
    if (!options.force) {
        const { shouldUninstall } = await (0, prompts_1.default)({
            type: 'confirm',
            name: 'shouldUninstall',
            message: `Remove ${packageName}@${version} from mact_modules/?`,
            initial: false
        });
        if (!shouldUninstall) {
            console.log(chalk_1.default.gray('\nAborted.\n'));
            return;
        }
    }
    // Remove the module directory
    const spinner = (0, ora_1.default)(`Removing ${packageName}...`).start();
    try {
        await fs.rm(packageDir, { recursive: true, force: true });
        // Clean up empty parent directories (for scoped packages)
        if (packageName.startsWith('@')) {
            const scopeDir = path.join(mactModulesDir, packageName.split('/')[0]);
            const remaining = await fs.readdir(scopeDir);
            // If scope directory is empty, remove it
            if (remaining.length === 0) {
                await fs.rm(scopeDir, { recursive: true, force: true });
            }
        }
        spinner.succeed(`Removed ${packageName}@${version}`);
        console.log(chalk_1.default.green(`\n✅ Successfully uninstalled ${chalk_1.default.bold(packageName)}`));
        console.log(chalk_1.default.gray('   Use `swig list` to view remaining modules\n'));
    }
    catch (error) {
        spinner.fail('Failed to uninstall module');
        console.error(chalk_1.default.red(`\n❌ Error: ${error.message}\n`));
        process.exit(1);
    }
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
