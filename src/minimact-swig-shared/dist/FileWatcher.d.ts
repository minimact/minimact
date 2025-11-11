/**
 * FileWatcher - Watches project files for changes
 *
 * Responsibilities:
 * - Watch TSX files for changes
 * - Trigger callbacks on file changes
 * - Debounce rapid changes
 */
export declare class FileWatcher {
    private watcher;
    private debounceTimers;
    private debounceDelay;
    /**
     * Start watching a project directory
     */
    watch(projectPath: string, callback: (filePath: string) => void): void;
    /**
     * Stop watching
     */
    stop(): void;
    /**
     * Debounce file change events
     */
    private debounce;
}
