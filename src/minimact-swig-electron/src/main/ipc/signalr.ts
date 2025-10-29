import { ipcMain } from 'electron'
import { SignalRClient } from '../services/SignalRClient'
import type { ComponentStateSnapshot, ComponentTree } from '../types/component-state'

let signalRClient: SignalRClient | null = null

/**
 * IPC handlers for SignalR operations
 */
export function registerSignalRHandlers(): void {
  signalRClient = new SignalRClient()

  // Connect to SignalR hub
  ipcMain.handle('signalr:connect', async (_event, url: string) => {
    try {
      await signalRClient!.connect(url)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Disconnect from SignalR hub
  ipcMain.handle('signalr:disconnect', async () => {
    try {
      await signalRClient!.disconnect()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Get component tree
  ipcMain.handle('signalr:getComponentTree', async () => {
    try {
      const tree = await signalRClient!.invoke('GetComponentTree')
      return {
        success: true,
        data: tree as ComponentTree[]
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Get component state
  ipcMain.handle('signalr:getComponentState', async (_event, componentId: string) => {
    try {
      const snapshot = await signalRClient!.invoke('GetComponentState', componentId)
      return {
        success: true,
        data: snapshot as ComponentStateSnapshot
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Update component state
  ipcMain.handle(
    'signalr:updateComponentState',
    async (_event, componentId: string, stateKey: string, value: any) => {
      try {
        await signalRClient!.invoke('UpdateComponentState', componentId, stateKey, value)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  // Get all components list
  ipcMain.handle('signalr:getAllComponents', async () => {
    try {
      const components = await signalRClient!.invoke('GetAllComponents')
      return {
        success: true,
        data: components as Array<{ componentId: string; componentName: string }>
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Trigger component render
  ipcMain.handle('signalr:triggerRender', async (_event, componentId: string) => {
    try {
      await signalRClient!.invoke('TriggerRender', componentId)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Subscribe to component state changes
  ipcMain.handle('signalr:subscribeStateChanges', async (_event, componentId: string) => {
    try {
      await signalRClient!.invoke('SubscribeToComponent', componentId)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Unsubscribe from component state changes
  ipcMain.handle('signalr:unsubscribeStateChanges', async (_event, componentId: string) => {
    try {
      await signalRClient!.invoke('UnsubscribeFromComponent', componentId)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Check connection status
  ipcMain.handle('signalr:isConnected', async () => {
    return {
      success: true,
      data: signalRClient!.isConnected
    }
  })
}

export function getSignalRClient(): SignalRClient | null {
  return signalRClient
}
