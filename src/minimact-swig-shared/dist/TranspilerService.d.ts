import type { TranspileResult, TranspileProjectResult } from './types';
/**
 * TranspilerService - Transpiles TSX to C# using babel-plugin-minimact
 *
 * Responsibilities:
 * - Transpile single TSX files to C#
 * - Transpile entire projects
 * - Track errors and duration
 */
export declare class TranspilerService {
    private babelPluginPath;
    constructor(babelPluginPath?: string);
    /**
     * Transpile a single TSX file to C#
     */
    transpileFile(tsxPath: string): Promise<TranspileResult>;
    /**
     * Transpile all TSX files in a project
     */
    transpileProject(projectPath: string): Promise<TranspileProjectResult>;
    /**
     * Generate Tailwind CSS for a project
     * Scans TSX files for Tailwind classes and generates purged/minified CSS
     */
    generateTailwindCss(projectPath: string): Promise<{
        success: boolean;
        outputPath?: string;
        error?: string;
        duration: number;
    }>;
}
