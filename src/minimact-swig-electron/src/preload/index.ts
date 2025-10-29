import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Project APIs
  project: {
    create: (path: string, template: string) =>
      ipcRenderer.invoke('project:create', path, template),
    load: (path: string) =>
      ipcRenderer.invoke('project:load', path),
    getRecent: () =>
      ipcRenderer.invoke('project:getRecent'),
    scanFiles: (projectPath: string) =>
      ipcRenderer.invoke('project:scanFiles', projectPath),
    selectDirectory: () =>
      ipcRenderer.invoke('project:selectDirectory')
  },

  // Transpiler APIs
  transpiler: {
    transpileFile: (filePath: string) =>
      ipcRenderer.invoke('transpiler:transpileFile', filePath),
    transpileProject: (projectPath: string) =>
      ipcRenderer.invoke('transpiler:transpileProject', projectPath)
  },

  // Process control APIs
  process: {
    build: (projectPath: string) =>
      ipcRenderer.invoke('process:build', projectPath),
    start: (projectPath: string, port: number) =>
      ipcRenderer.invoke('process:start', projectPath, port),
    stop: () =>
      ipcRenderer.invoke('process:stop'),
    isRunning: () =>
      ipcRenderer.invoke('process:isRunning'),
    subscribeOutput: () =>
      ipcRenderer.invoke('process:subscribeOutput'),
    onOutput: (callback: (data: string) => void) => {
      ipcRenderer.on('process:output', (_, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('process:output');
    }
  },

  // File APIs
  file: {
    read: (filePath: string) =>
      ipcRenderer.invoke('file:read', filePath),
    readFile: (filePath: string) =>
      ipcRenderer.invoke('file:read', filePath),
    write: (filePath: string, content: string) =>
      ipcRenderer.invoke('file:write', filePath, content),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('file:write', filePath, content),
    openInEditor: (filePath: string, editor?: string) =>
      ipcRenderer.invoke('file:openInEditor', filePath, editor),
    openExternal: (url: string) =>
      ipcRenderer.invoke('file:openExternal', url),
    showInFolder: (filePath: string) =>
      ipcRenderer.invoke('file:showInFolder', filePath)
  },

  // Template APIs
  template: {
    getMetadata: (componentId: string) =>
      ipcRenderer.invoke('template:getMetadata', componentId),
    getComponents: () =>
      ipcRenderer.invoke('template:getComponents'),
    preview: (request: { componentId: string; templateKey: string; state: Record<string, any> }) =>
      ipcRenderer.invoke('template:preview', request),
    getUsageStats: (componentId: string) =>
      ipcRenderer.invoke('template:getUsageStats', componentId),
    getPerformance: (componentId: string) =>
      ipcRenderer.invoke('template:getPerformance', componentId),
    subscribeTelemetry: (componentId: string) =>
      ipcRenderer.invoke('template:subscribeTelemetry', componentId),
    unsubscribeTelemetry: () =>
      ipcRenderer.invoke('template:unsubscribeTelemetry'),
    onTelemetry: (callback: (telemetry: any) => void) => {
      ipcRenderer.on('template:telemetry', (_, telemetry) => callback(telemetry));
      return () => ipcRenderer.removeAllListeners('template:telemetry');
    }
  },

  // SignalR APIs
  signalr: {
    connect: (url: string) =>
      ipcRenderer.invoke('signalr:connect', url),
    disconnect: () =>
      ipcRenderer.invoke('signalr:disconnect'),
    getComponentTree: () =>
      ipcRenderer.invoke('signalr:getComponentTree'),
    getComponentState: (componentId: string) =>
      ipcRenderer.invoke('signalr:getComponentState', componentId),
    updateComponentState: (componentId: string, stateKey: string, value: any) =>
      ipcRenderer.invoke('signalr:updateComponentState', componentId, stateKey, value),
    getAllComponents: () =>
      ipcRenderer.invoke('signalr:getAllComponents'),
    triggerRender: (componentId: string) =>
      ipcRenderer.invoke('signalr:triggerRender', componentId),
    subscribeStateChanges: (componentId: string) =>
      ipcRenderer.invoke('signalr:subscribeStateChanges', componentId),
    unsubscribeStateChanges: (componentId: string) =>
      ipcRenderer.invoke('signalr:unsubscribeStateChanges', componentId),
    isConnected: () =>
      ipcRenderer.invoke('signalr:isConnected'),
    previewCascade: (componentId: string, stateKey: string, newValue: any) =>
      ipcRenderer.invoke('signalr:previewCascade', componentId, stateKey, newValue)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
