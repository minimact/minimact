const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - Exposes safe IPC APIs to renderer process
 *
 * This creates the bridge between Electron's main process and the web content.
 * The renderer (Minimact app) accesses these via window.electronAPI
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // File system dialogs
  dialog: {
    openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
    openDirectory: (options) => ipcRenderer.invoke('dialog:openDirectory', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options)
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => ipcRenderer.invoke('app:getPlatform')
  },

  // Check if running in Electron
  isElectron: true
});

console.log('[Electron] Preload script loaded - electronAPI exposed to renderer');
