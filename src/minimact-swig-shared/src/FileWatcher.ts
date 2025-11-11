import chokidar, { type FSWatcher } from 'chokidar';

/**
 * FileWatcher - Watches project files for changes
 *
 * Responsibilities:
 * - Watch TSX files for changes
 * - Trigger callbacks on file changes
 * - Debounce rapid changes
 */
export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceDelay: number = 200; // ms

  /**
   * Start watching a project directory
   */
  watch(projectPath: string, callback: (filePath: string) => void): void {
    if (this.watcher) {
      this.stop();
    }

    this.watcher = chokidar.watch(projectPath, {
      ignored: ['**/node_modules/**', '**/bin/**', '**/obj/**', '**/.git/**', '**/dist/**', '**/out/**'],
      persistent: true,
      ignoreInitial: true
    });

    this.watcher.on('change', (filePath: string) => {
      // Only watch for .tsx and .jsx files
      if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
        this.debounce(filePath, callback);
      }
    });
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    // Clear all pending debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  /**
   * Debounce file change events
   */
  private debounce(filePath: string, callback: (filePath: string) => void): void {
    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      callback(filePath);
      this.debounceTimers.delete(filePath);
    }, this.debounceDelay);

    this.debounceTimers.set(filePath, timer);
  }
}
