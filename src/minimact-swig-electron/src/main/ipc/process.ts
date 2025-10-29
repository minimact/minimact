import { ipcMain } from 'electron';
import type { ProcessController } from '../services/ProcessController';

/**
 * Register process control IPC handlers
 */
export function registerProcessHandlers(processController: ProcessController): void {
  /**
   * Build a Minimact project
   */
  ipcMain.handle('process:build', async (_, projectPath: string) => {
    try {
      const result = await processController.build(projectPath);
      return { success: result.success, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Start a Minimact app
   */
  ipcMain.handle('process:start', async (_, projectPath: string, port: number) => {
    try {
      await processController.start(projectPath, port);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Stop the running app
   */
  ipcMain.handle('process:stop', async () => {
    try {
      processController.stop();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Check if app is running
   */
  ipcMain.handle('process:isRunning', async () => {
    try {
      const isRunning = processController.isRunning();
      return { success: true, data: isRunning };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Register output listener (send to renderer via IPC)
   */
  ipcMain.handle('process:subscribeOutput', async (event) => {
    const unsubscribe = processController.onOutput((data: string) => {
      event.sender.send('process:output', data);
    });

    // Store unsubscribe function for cleanup
    event.sender.once('destroyed', () => {
      unsubscribe();
    });

    return { success: true };
  });
}
