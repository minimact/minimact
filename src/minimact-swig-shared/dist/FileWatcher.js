"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWatcher = void 0;
const chokidar_1 = __importDefault(require("chokidar"));
/**
 * FileWatcher - Watches project files for changes
 *
 * Responsibilities:
 * - Watch TSX files for changes
 * - Trigger callbacks on file changes
 * - Debounce rapid changes
 */
class FileWatcher {
    constructor() {
        this.watcher = null;
        this.debounceTimers = new Map();
        this.debounceDelay = 200; // ms
    }
    /**
     * Start watching a project directory
     */
    watch(projectPath, callback) {
        if (this.watcher) {
            this.stop();
        }
        this.watcher = chokidar_1.default.watch(projectPath, {
            ignored: ['**/node_modules/**', '**/bin/**', '**/obj/**', '**/.git/**', '**/dist/**', '**/out/**'],
            persistent: true,
            ignoreInitial: true
        });
        this.watcher.on('change', (filePath) => {
            // Only watch for .tsx and .jsx files
            if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
                this.debounce(filePath, callback);
            }
        });
    }
    /**
     * Stop watching
     */
    stop() {
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
    debounce(filePath, callback) {
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
exports.FileWatcher = FileWatcher;
