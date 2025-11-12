interface ImportOptions {
    force?: boolean;
    project?: string;
}
/**
 * Import (install) a module into mact_modules/ using global cache
 */
export declare function importCommand(packageName: string, options?: ImportOptions): Promise<void>;
export {};
