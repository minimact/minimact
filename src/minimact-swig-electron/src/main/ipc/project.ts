import { ipcMain, dialog } from 'electron';
import type { ProjectManager } from '../services/ProjectManager';

/**
 * Register project-related IPC handlers
 */
export function registerProjectHandlers(projectManager: ProjectManager): void {
  /**
   * Create a new Minimact project
   */
  ipcMain.handle('project:create', async (_, projectPath: string, template: string) => {
    try {
      const project = await projectManager.createProject(projectPath, template);
      return { success: true, data: project };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Load an existing Minimact project
   */
  ipcMain.handle('project:load', async (_, projectPath: string) => {
    try {
      const project = await projectManager.loadProject(projectPath);
      return { success: true, data: project };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Get list of recent projects
   */
  ipcMain.handle('project:getRecent', async () => {
    try {
      const projects = await projectManager.getRecentProjects();
      return { success: true, data: projects };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Scan project files
   */
  ipcMain.handle('project:scanFiles', async (_, projectPath: string) => {
    try {
      const files = await projectManager.scanProjectFiles(projectPath);
      return { success: true, data: files };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Open directory picker dialog
   */
  ipcMain.handle('project:selectDirectory', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Project Directory'
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'No directory selected' };
      }

      return { success: true, data: result.filePaths[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
