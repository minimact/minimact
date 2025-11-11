import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';

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
 * Check if Swig is installed
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
 * Launch command - Launch the Swig GUI
 */
export async function launchCommand(): Promise<void> {
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
    const child = spawn('npm', ['start'], {
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
  } catch (error) {
    console.error('❌ Failed to launch Swig:', error);
    throw error;
  }
}
