import { ipcMain, shell } from 'electron';
import * as fs from 'fs/promises';

/**
 * Register file operation IPC handlers
 */
export function registerFileHandlers(): void {
  /**
   * Read file contents
   */
  ipcMain.handle('file:read', async (_, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, data: content };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Write file contents
   */
  ipcMain.handle('file:write', async (_, filePath: string, content: string) => {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Open file in external editor (VS Code, Rider, etc.)
   */
  ipcMain.handle('file:openInEditor', async (_, filePath: string, editor?: string) => {
    try {
      if (editor) {
        // Specific editor requested
        const { execa } = await import('execa');
        await execa(editor, [filePath]);
      } else {
        // Open with default application
        await shell.openPath(filePath);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Open URL in external browser
   */
  ipcMain.handle('file:openExternal', async (_, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Show file in system file explorer
   */
  ipcMain.handle('file:showInFolder', async (_, filePath: string) => {
    try {
      shell.showItemInFolder(filePath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
