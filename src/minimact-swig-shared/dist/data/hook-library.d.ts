/**
 * Hook Library - Comprehensive catalog of all available Minimact hooks
 *
 * Categories:
 * - Core Hooks (built-in React-like hooks)
 * - Communication Hooks (pub/sub, SignalR)
 * - Task Hooks (server tasks, task scheduling)
 * - Advanced Hooks (context, computed values)
 * - MVC Hooks (@minimact/mvc package)
 * - Punch Hooks (@minimact/punch package - DOM element state)
 * - Query Hooks (@minimact/query package - SQL for the DOM)
 * - Trees Hooks (@minimact/trees package - Decision trees & state machines)
 * - Quantum Hooks (@minimact/quantum package - Quantum DOM entanglement)
 *
 * Each hook includes:
 * - Name, description, category
 * - Code example template
 * - Import statement
 * - Default selection status
 */
export interface Hook {
    id: string;
    name: string;
    description: string;
    category: 'core' | 'communication' | 'tasks' | 'advanced' | 'mvc' | 'punch' | 'query' | 'trees' | 'quantum' | 'charts';
    packageName?: string;
    imports: string[];
    example: string;
    serverCode?: {
        language: 'csharp' | 'rust';
        fileName: string;
        code: string;
    };
    isDefault: boolean;
    dependencies?: string[];
}
export declare const HOOK_LIBRARY: Hook[];
/**
 * Get hooks by category
 */
export declare function getHooksByCategory(category: Hook['category']): Hook[];
/**
 * Get default hooks (shown by default in UI)
 */
export declare function getDefaultHooks(): Hook[];
/**
 * Get non-default hooks (shown when expanded)
 */
export declare function getAdvancedHooks(): Hook[];
/**
 * Get hook by ID
 */
export declare function getHookById(id: string): Hook | undefined;
/**
 * Get all dependencies for a hook (recursively)
 */
export declare function getHookDependencies(hookId: string): string[];
/**
 * Get required NPM packages for selected hooks
 */
export declare function getRequiredPackages(selectedHookIds: string[]): string[];
