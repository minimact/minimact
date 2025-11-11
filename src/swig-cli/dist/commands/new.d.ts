/**
 * New command - Create a new Minimact project
 */
export declare function newCommand(template?: string, name?: string, options?: {
    tailwind?: boolean;
    solution?: boolean;
    hooks?: string;
}): Promise<void>;
