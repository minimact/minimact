interface ListModulesOptions {
    project?: string;
}
/**
 * List all installed modules in mact_modules/
 */
export declare function listModulesCommand(options?: ListModulesOptions): Promise<void>;
export {};
