import { ipcMain } from 'electron';
import type { TranspilerService } from '../services/TranspilerService';

/**
 * Register transpiler-related IPC handlers
 */
export function registerTranspilerHandlers(transpilerService: TranspilerService): void {
  /**
   * Transpile a single TSX file to C#
   */
  ipcMain.handle('transpiler:transpileFile', async (_, filePath: string) => {
    try {
      const result = await transpilerService.transpileFile(filePath);
      return { success: result.success, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Transpile all TSX files in a project
   */
  ipcMain.handle('transpiler:transpileProject', async (_, projectPath: string) => {
    try {
      const result = await transpilerService.transpileProject(projectPath);
      return { success: result.success, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
