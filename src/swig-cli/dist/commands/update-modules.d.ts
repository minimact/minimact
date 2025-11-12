interface UpdateModulesOptions {
    all?: boolean;
    project?: string;
}
/**
 * Update modules in mact_modules/
 */
export declare function updateModulesCommand(packageName?: string, options?: UpdateModulesOptions): Promise<void>;
export {};
