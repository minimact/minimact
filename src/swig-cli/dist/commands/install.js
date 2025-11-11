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
Object.defineProperty(exports, "__esModule", { value: true });
exports.installCommand = installCommand;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const child_process_1 = require("child_process");
const SWIG_REPO_URL = 'https://github.com/minimact/swig.git';
/**
 * Get the installation directory for Swig
 */
function getSwigInstallPath() {
    const platform = os.platform();
    if (platform === 'win32') {
        return path.join(process.env.APPDATA || os.homedir(), 'minimact-swig');
    }
    else if (platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'minimact-swig');
    }
    else {
        return path.join(os.homedir(), '.local', 'share', 'minimact-swig');
    }
}
/**
 * Check if Swig is already installed
 */
async function isSwigInstalled() {
    const installPath = getSwigInstallPath();
    try {
        await fs.access(path.join(installPath, 'package.json'));
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Install command - Download and install Swig GUI to AppData
 */
async function installCommand(options) {
    console.log('📦 Installing Minimact Swig GUI...');
    // Check if already installed
    if (!options.force && (await isSwigInstalled())) {
        console.log('✅ Minimact Swig is already installed!');
        console.log('   Use --force to reinstall');
        console.log(`   Installation directory: ${getSwigInstallPath()}`);
        return;
    }
    const installPath = getSwigInstallPath();
    const tempClonePath = path.join(os.tmpdir(), 'minimact-swig-clone');
    try {
        // Remove existing installation if forcing
        if (options.force) {
            console.log('🗑️  Removing existing installation...');
            await fs.rm(installPath, { recursive: true, force: true });
        }
        // Create parent directory
        await fs.mkdir(path.dirname(installPath), { recursive: true });
        // Clone Swig repo to temp location
        console.log('📥 Cloning Swig from GitHub...');
        (0, child_process_1.execSync)(`git clone ${SWIG_REPO_URL} "${tempClonePath}"`, {
            stdio: 'inherit'
        });
        // Copy the swig subfolder to install path
        const swigSubfolder = path.join(tempClonePath, 'swig');
        console.log('📋 Copying files to installation directory...');
        await copyDirectory(swigSubfolder, installPath);
        // Install npm dependencies
        console.log('📦 Installing npm dependencies...');
        (0, child_process_1.execSync)('npm install', {
            cwd: installPath,
            stdio: 'inherit'
        });
        // Clean up temp files
        console.log('🧹 Cleaning up...');
        await fs.rm(tempClonePath, { recursive: true, force: true });
        console.log('✅ Minimact Swig installed successfully!');
        console.log(`   Installation directory: ${installPath}`);
        console.log('   Run "swig launch" to start the GUI');
    }
    catch (error) {
        console.error('❌ Installation failed:', error);
        throw error;
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
