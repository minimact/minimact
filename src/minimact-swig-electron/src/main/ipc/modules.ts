import { ipcMain } from 'electron';
import { ModuleManager, type ModuleDefinition, type InstalledModule, type NpmSearchResult } from '@minimact/swig-shared';

const moduleManager = new ModuleManager();

/**
 * IPC handlers for mact_modules management
 *
 * Provides module installation, listing, and uninstallation
 * using the shared ModuleManager with AppData caching
 */
export function registerModulesHandlers(): void {
  /**
   * Get available modules for installation
   */
  ipcMain.handle('modules:get-available', async (): Promise<ModuleDefinition[]> => {
    return moduleManager.getAvailableModules();
  });

  /**
   * List installed modules in a project
   */
  ipcMain.handle('modules:list', async (_event, projectPath: string): Promise<InstalledModule[]> => {
    return await moduleManager.listModules(projectPath);
  });

  /**
   * Import (install) a module to a project
   */
  ipcMain.handle('modules:import', async (_event, packageName: string, projectPath: string, force: boolean = false): Promise<void> => {
    await moduleManager.importModule(packageName, projectPath, {
      force,
      onProgress: (message: string) => {
        console.log(`[ModuleManager] ${message}`);
      }
    });
  });

  /**
   * Import multiple modules to a project
   */
  ipcMain.handle('modules:import-multiple', async (_event, packageNames: string[], projectPath: string): Promise<{ success: string[]; failed: string[] }> => {
    const results = {
      success: [] as string[],
      failed: [] as string[]
    };

    for (const packageName of packageNames) {
      try {
        await moduleManager.importModule(packageName, projectPath, {
          onProgress: (message: string) => {
            console.log(`[ModuleManager] ${message}`);
          }
        });
        results.success.push(packageName);
      } catch (error) {
        console.error(`[ModuleManager] Failed to import ${packageName}:`, error);
        results.failed.push(packageName);
      }
    }

    return results;
  });

  /**
   * Uninstall a module from a project
   */
  ipcMain.handle('modules:uninstall', async (_event, packageName: string, projectPath: string): Promise<void> => {
    await moduleManager.uninstallModule(packageName, projectPath);
  });

  /**
   * Check if a module is installed in a project
   */
  ipcMain.handle('modules:is-installed', async (_event, packageName: string, projectPath: string): Promise<boolean> => {
    return await moduleManager.isModuleInstalled(packageName, projectPath);
  });

  /**
   * Search npm registry for packages
   */
  ipcMain.handle('modules:search-npm', async (_event, query: string, size?: number): Promise<NpmSearchResult[]> => {
    return await moduleManager.searchNpmRegistry(query, size);
  });

  /**
   * Get package info from npm registry
   */
  ipcMain.handle('modules:get-package-info', async (_event, packageName: string): Promise<{ name: string; version: string; description: string } | null> => {
    return await moduleManager.getPackageInfo(packageName);
  });
}
