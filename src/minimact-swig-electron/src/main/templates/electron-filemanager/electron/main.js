const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let dotnetProcess;
const isDev = process.env.NODE_ENV === 'development';

// Kestrel server port
const KESTREL_PORT = 5000;
const KESTREL_URL = `http://localhost:${KESTREL_PORT}`;

/**
 * Start the ASP.NET Core Kestrel server
 */
function startDotnetServer() {
  return new Promise((resolve, reject) => {
    console.log('[Electron] Starting .NET Kestrel server...');

    const dotnetPath = isDev
      ? path.join(__dirname, '..', 'src', 'bin', 'Debug', 'net8.0', 'MinimactElectronFileManager.dll')
      : path.join(process.resourcesPath, 'dotnet', 'MinimactElectronFileManager.dll');

    if (!fs.existsSync(dotnetPath)) {
      console.error(`[Electron] .NET app not found at: ${dotnetPath}`);
      console.error('[Electron] Run "dotnet build" in the src directory first');
      reject(new Error('.NET app not built'));
      return;
    }

    dotnetProcess = spawn('dotnet', [dotnetPath], {
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: isDev ? 'Development' : 'Production',
        ASPNETCORE_URLS: KESTREL_URL,
        ELECTRON_MODE: 'true'
      }
    });

    dotnetProcess.stdout.on('data', (data) => {
      console.log(`[.NET] ${data.toString().trim()}`);
      if (data.toString().includes('Now listening on')) {
        resolve();
      }
    });

    dotnetProcess.stderr.on('data', (data) => {
      console.error(`[.NET ERROR] ${data.toString().trim()}`);
    });

    dotnetProcess.on('close', (code) => {
      console.log(`[.NET] Process exited with code ${code}`);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      resolve(); // Resolve anyway, let BrowserWindow handle connection errors
    }, 10000);
  });
}

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#1a1a1a',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  // Load the Minimact app
  mainWindow.loadURL(KESTREL_URL);

  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle navigation (prevent external navigation)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(KESTREL_URL)) {
      event.preventDefault();
    }
  });
}

/**
 * IPC Handlers - Desktop API Bridge
 */

// Open file dialog
ipcMain.handle('dialog:openFile', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: options?.title || 'Open File',
    filters: options?.filters || []
  });

  return result.canceled ? null : result.filePaths[0];
});

// Open directory dialog
ipcMain.handle('dialog:openDirectory', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: options?.title || 'Open Directory'
  });

  return result.canceled ? null : result.filePaths[0];
});

// Save file dialog
ipcMain.handle('dialog:saveFile', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options?.title || 'Save File',
    filters: options?.filters || []
  });

  return result.canceled ? null : result.filePath;
});

// Get app version
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// Get platform info
ipcMain.handle('app:getPlatform', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.version,
    electron: process.versions.electron,
    chrome: process.versions.chrome
  };
});

/**
 * App Lifecycle
 */

app.on('ready', async () => {
  try {
    await startDotnetServer();
    createWindow();
  } catch (error) {
    console.error('[Electron] Failed to start:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // Kill .NET process
  if (dotnetProcess) {
    dotnetProcess.kill();
  }

  // Quit on all platforms (including macOS)
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Clean shutdown
app.on('before-quit', () => {
  if (dotnetProcess) {
    console.log('[Electron] Shutting down .NET server...');
    dotnetProcess.kill('SIGTERM');
  }
});

console.log('[Electron] Main process started');
console.log('[Electron] Environment:', isDev ? 'Development' : 'Production');
