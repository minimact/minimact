import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { execSync } from 'child_process';

const SWIG_REPO_URL = 'https://github.com/minimact/swig.git';

/**
 * Get the installation directory for Swig
 */
function getSwigInstallPath(): string {
  const platform = os.platform();

  if (platform === 'win32') {
    return path.join(process.env.APPDATA || os.homedir(), 'minimact-swig');
  } else if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'minimact-swig');
  } else {
    return path.join(os.homedir(), '.local', 'share', 'minimact-swig');
  }
}

/**
 * Check if Swig is already installed
 */
async function isSwigInstalled(): Promise<boolean> {
  const installPath = getSwigInstallPath();

  try {
    await fs.access(path.join(installPath, 'package.json'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Install command - Download and install Swig GUI to AppData
 */
export async function installCommand(options: { force?: boolean }): Promise<void> {
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
    execSync(`git clone ${SWIG_REPO_URL} "${tempClonePath}"`, {
      stdio: 'inherit'
    });

    // Copy the swig subfolder to install path
    const swigSubfolder = path.join(tempClonePath, 'swig');
    console.log('📋 Copying files to installation directory...');
    await copyDirectory(swigSubfolder, installPath);

    // Install npm dependencies
    console.log('📦 Installing npm dependencies...');
    execSync('npm install', {
      cwd: installPath,
      stdio: 'inherit'
    });

    // Clean up temp files
    console.log('🧹 Cleaning up...');
    await fs.rm(tempClonePath, { recursive: true, force: true });

    console.log('✅ Minimact Swig installed successfully!');
    console.log(`   Installation directory: ${installPath}`);
    console.log('   Run "swig launch" to start the GUI');
  } catch (error) {
    console.error('❌ Installation failed:', error);
    throw error;
  }
}

/**
 * Recursively copy directory
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
