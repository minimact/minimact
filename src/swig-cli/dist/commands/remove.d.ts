/**
 * Remove command - Remove a page and its controller
 */
export declare function removeCommand(pageName?: string, options?: {
    project?: string;
    force?: boolean;
}): Promise<void>;
