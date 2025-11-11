/**
 * Transpile command - Transpile TSX files to C#
 */
export declare function transpileCommand(files: string[], options: {
    watch?: boolean;
    project?: string;
}): Promise<void>;
