import { ipcMain } from 'electron'
import type { SignalRClient } from '../services/SignalRClient'

/**
 * Template IPC Handlers
 *
 * Handles communication between renderer and SignalR for template operations
 */
export function registerTemplateHandlers(signalRClient: SignalRClient) {
  /**
   * Get component metadata including templates
   */
  ipcMain.handle('template:getMetadata', async (_event, componentId: string) => {
    try {
      if (!signalRClient.isConnected) {
        return {
          success: false,
          error: 'Not connected to SignalR hub'
        }
      }

      const metadata = await signalRClient.invoke('GetComponentMetadata', componentId)

      return {
        success: true,
        data: metadata
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  /**
   * Get all components in the connected app
   */
  ipcMain.handle('template:getComponents', async () => {
    try {
      if (!signalRClient.isConnected) {
        return {
          success: false,
          error: 'Not connected to SignalR hub'
        }
      }

      const components = await signalRClient.invoke('GetAllComponents')

      return {
        success: true,
        data: components
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  /**
   * Preview template with custom state
   */
  ipcMain.handle('template:preview', async (_event, request: {
    componentId: string
    templateKey: string
    state: Record<string, any>
  }) => {
    try {
      if (!signalRClient.isConnected) {
        return {
          success: false,
          error: 'Not connected to SignalR hub'
        }
      }

      const preview = await signalRClient.invoke('PreviewTemplate', request)

      return {
        success: true,
        data: preview
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  /**
   * Get template usage statistics
   */
  ipcMain.handle('template:getUsageStats', async (_event, componentId: string) => {
    try {
      if (!signalRClient.isConnected) {
        return {
          success: false,
          error: 'Not connected to SignalR hub'
        }
      }

      const stats = await signalRClient.invoke('GetTemplateUsageStats', componentId)

      return {
        success: true,
        data: stats
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  /**
   * Get template performance metrics
   */
  ipcMain.handle('template:getPerformance', async (_event, componentId: string) => {
    try {
      if (!signalRClient.isConnected) {
        return {
          success: false,
          error: 'Not connected to SignalR hub'
        }
      }

      const performance = await signalRClient.invoke('GetTemplatePerformance', componentId)

      return {
        success: true,
        data: performance
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  /**
   * Subscribe to template telemetry events
   */
  ipcMain.handle('template:subscribeTelemetry', async (_event, componentId: string) => {
    try {
      if (!signalRClient.isConnected) {
        return {
          success: false,
          error: 'Not connected to SignalR hub'
        }
      }

      // Subscribe to template applied events
      signalRClient.on('TemplateApplied', (telemetry) => {
        if (!componentId || telemetry.componentId === componentId) {
          // Forward to renderer
          _event.sender.send('template:telemetry', telemetry)
        }
      })

      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  /**
   * Unsubscribe from template telemetry events
   */
  ipcMain.handle('template:unsubscribeTelemetry', async () => {
    try {
      signalRClient.off('TemplateApplied', () => {})

      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
}
