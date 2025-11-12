/**
 * Available modules for Minimact projects
 */
export interface ModuleDefinition {
    name: string;
    description: string;
    recommended: boolean;
    category: 'minimact' | 'external';
}
/**
 * Module metadata (package.json structure)
 */
export interface ModuleMetadata {
    name: string;
    version: string;
    description: string;
    main: string;
    type: 'module' | 'umd';
    global?: string;
}
/**
 * Installed module info
 */
export interface InstalledModule {
    name: string;
    version: string;
    description: string;
    size: number;
    type: 'module' | 'umd';
    path: string;
}
/**
 * npm search result
 */
export interface NpmSearchResult {
    name: string;
    version: string;
    description: string;
    keywords: string[];
    date: string;
    links: {
        npm: string;
        homepage?: string;
        repository?: string;
    };
    publisher: {
        username: string;
        email: string;
    };
    maintainers: Array<{
        username: string;
        email: string;
    }>;
    score: {
        final: number;
        detail: {
            quality: number;
            popularity: number;
            maintenance: number;
        };
    };
}
/**
 * Available modules for initialization
 */
export declare const AVAILABLE_MODULES: ModuleDefinition[];
/**
 * ModuleManager - Manages mact_modules with global cache (AppData)
 *
 * Architecture:
 * 1. Global Cache (AppData/minimact-cache/mact_modules) - Downloaded from npm once
 * 2. Project Cache (project/mact_modules) - Copied from global cache
 *
 * Benefits:
 * - Offline-friendly (download once, use everywhere)
 * - Fast project setup (copy from cache, not download)
 * - Shared across all projects
 */
export declare class ModuleManager {
    private globalCachePath;
    constructor();
    /**
     * Get the global cache directory for mact_modules
     * Similar to where Swig GUI is installed
     */
    private getGlobalCachePath;
    /**
     * Import (install) a module into a project using global cache
     */
    importModule(packageName: string, projectRoot: string, options?: {
        force?: boolean;
        onProgress?: (message: string) => void;
    }): Promise<void>;
    /**
     * List installed modules in a project
     */
    listModules(projectRoot: string): Promise<InstalledModule[]>;
    /**
     * Uninstall a module from a project
     */
    uninstallModule(packageName: string, projectRoot: string): Promise<void>;
    /**
     * Check if a module is installed in a project
     */
    isModuleInstalled(packageName: string, projectRoot: string): Promise<boolean>;
    /**
     * Get available modules for selection
     */
    getAvailableModules(): ModuleDefinition[];
    /**
     * Search npm registry for packages
     * @param query Search query
     * @param size Number of results to return (default: 20, max: 250)
     */
    searchNpmRegistry(query: string, size?: number): Promise<NpmSearchResult[]>;
    /**
     * Get package info from npm registry
     * @param packageName Package name to lookup
     */
    getPackageInfo(packageName: string): Promise<{
        name: string;
        version: string;
        description: string;
    } | null>;
    private loadModuleMetadata;
    private findBrowserBundle;
    private generatePackageJson;
    private getGlobalName;
    private copyDirectory;
    private directoryExists;
    private fileExists;
}
