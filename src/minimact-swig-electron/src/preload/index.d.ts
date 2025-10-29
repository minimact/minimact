import { ElectronAPI } from '@electron-toolkit/preload'

// API Response type
interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Minimact API types
interface MinimactAPI {
  project: {
    create: (path: string, template: string) => Promise<APIResponse>
    load: (path: string) => Promise<APIResponse>
    getRecent: () => Promise<APIResponse>
    scanFiles: (projectPath: string) => Promise<APIResponse>
    selectDirectory: () => Promise<APIResponse<string>>
  }

  transpiler: {
    transpileFile: (filePath: string) => Promise<APIResponse>
    transpileProject: (projectPath: string) => Promise<APIResponse>
  }

  process: {
    build: (projectPath: string) => Promise<APIResponse>
    start: (projectPath: string, port: number) => Promise<APIResponse>
    stop: () => Promise<APIResponse>
    isRunning: () => Promise<APIResponse<boolean>>
    subscribeOutput: () => Promise<APIResponse>
    onOutput: (callback: (data: string) => void) => () => void
  }

  file: {
    read: (filePath: string) => Promise<APIResponse<string>>
    readFile: (filePath: string) => Promise<APIResponse<string>>
    write: (filePath: string, content: string) => Promise<APIResponse>
    writeFile: (filePath: string, content: string) => Promise<APIResponse>
    openInEditor: (filePath: string, editor?: string) => Promise<APIResponse>
    openExternal: (url: string) => Promise<APIResponse>
    showInFolder: (filePath: string) => Promise<APIResponse>
  }

  template: {
    getMetadata: (componentId: string) => Promise<APIResponse>
    getComponents: () => Promise<APIResponse>
    preview: (request: {
      componentId: string
      templateKey: string
      state: Record<string, any>
    }) => Promise<APIResponse>
    getUsageStats: (componentId: string) => Promise<APIResponse>
    getPerformance: (componentId: string) => Promise<APIResponse>
    subscribeTelemetry: (componentId: string) => Promise<APIResponse>
    unsubscribeTelemetry: () => Promise<APIResponse>
    onTelemetry: (callback: (telemetry: any) => void) => () => void
  }

  signalr: {
    connect: (url: string) => Promise<APIResponse>
    disconnect: () => Promise<APIResponse>
    getComponentTree: () => Promise<APIResponse>
    getComponentState: (componentId: string) => Promise<APIResponse>
    updateComponentState: (componentId: string, stateKey: string, value: any) => Promise<APIResponse>
    getAllComponents: () => Promise<APIResponse>
    triggerRender: (componentId: string) => Promise<APIResponse>
    subscribeStateChanges: (componentId: string) => Promise<APIResponse>
    unsubscribeStateChanges: (componentId: string) => Promise<APIResponse>
    isConnected: () => Promise<APIResponse<boolean>>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: MinimactAPI
  }
}
