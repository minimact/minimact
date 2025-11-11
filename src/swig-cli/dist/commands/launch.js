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
exports.launchCommand = launchCommand;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const child_process_1 = require("child_process");
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
 * Check if Swig is installed
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
 * Launch command - Launch the Swig GUI
 */
async function launchCommand() {
    console.log('🚀 Launching Minimact Swig GUI...');
    // Check if Swig is installed
    if (!(await isSwigInstalled())) {
        console.error('❌ Minimact Swig is not installed!');
        console.error('   Run "swig install" first');
        process.exit(1);
    }
    const installPath = getSwigInstallPath();
    try {
        // Launch Swig with npm start
        const child = (0, child_process_1.spawn)('npm', ['start'], {
            cwd: installPath,
            stdio: 'inherit',
            shell: true
        });
        child.on('error', (error) => {
            console.error('❌ Failed to launch Swig:', error);
            process.exit(1);
        });
        child.on('exit', (code) => {
            if (code !== 0) {
                console.error(`❌ Swig exited with code ${code}`);
                process.exit(code || 1);
            }
        });
    }
    catch (error) {
        console.error('❌ Failed to launch Swig:', error);
        throw error;
    }
}
