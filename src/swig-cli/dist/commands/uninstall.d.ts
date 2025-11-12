interface UninstallOptions {
    force?: boolean;
    project?: string;
}
/**
 * Uninstall a module from mact_modules/
 */
export declare function uninstallCommand(packageName: string, options?: UninstallOptions): Promise<void>;
export {};
