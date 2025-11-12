interface InitModulesOptions {
    project?: string;
}
/**
 * Initialize mact_modules/ with interactive module selection
 */
export declare function initModulesCommand(options?: InitModulesOptions): Promise<void>;
export {};
