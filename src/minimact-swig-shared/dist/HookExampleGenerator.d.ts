/**
 * HookExampleGenerator - Generates example files for selected hooks
 *
 * Responsibilities:
 * - Generate TSX files with hook examples
 * - Auto-include dependencies
 * - Copy required JS files from mact_modules to wwwroot/js
 * - Create organized folder structure
 */
export declare class HookExampleGenerator {
    /**
     * Generate hook examples in project
     */
    generateHookExamples(projectPath: string, selectedHookIds: string[]): Promise<void>;
    /**
     * Resolve hook IDs with their dependencies
     */
    private resolveWithDependencies;
    /**
     * Generate single hook example file
     */
    private generateHookExample;
    /**
     * Get example file name from hook name
     */
    private getExampleFileName;
    /**
     * Build example file content with proper imports and exports
     */
    private buildExampleFileContent;
    /**
     * Generate index page listing all examples
     */
    private generateExamplesIndex;
    /**
     * Build Examples/Index.tsx content
     */
    private buildIndexContent;
    /**
     * Build a category section for the index
     */
    private buildCategorySection;
    /**
     * Get human-readable category label
     */
    private getCategoryLabel;
    /**
     * Copy required JS files from mact_modules to wwwroot/js
     * This ensures extension packages (@minimact/mvc, @minimact/punch) are available
     */
    private copyRequiredJsFiles;
    /**
     * Generate server-side code file (C# or Rust)
     */
    private generateServerCode;
}
