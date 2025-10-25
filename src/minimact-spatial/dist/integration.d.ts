/**
 * Minimact Integration Layer for Spatial Areas
 *
 * This file provides the integration between spatial area tracking
 * and Minimact's component context, HintQueue, and prediction system.
 *
 * Pattern: Same as minimact-punch integration
 */
import type { AreaDefinition, AreaState, AreaOptions, AbsoluteBounds } from './types';
/**
 * Component context interface (from Minimact)
 */
export interface ComponentContext {
    componentId: string;
    element: HTMLElement;
    state: Map<string, any>;
    effects: Array<{
        callback: () => void | (() => void);
        deps: any[] | undefined;
        cleanup?: () => void;
    }>;
    refs: Map<string, {
        current: any;
    }>;
    areas?: Map<string, AreaInstance>;
    hintQueue: HintQueue;
    domPatcher: DOMPatcher;
    playgroundBridge?: PlaygroundBridge;
    signalR: SignalRManager;
}
/**
 * SignalRManager interface
 */
export interface SignalRManager {
    invoke(method: string, ...args: any[]): Promise<any>;
}
/**
 * HintQueue interface
 */
export interface HintQueue {
    matchHint(componentId: string, stateChanges: Record<string, any>): {
        hintId: string;
        patches: any[];
        confidence: number;
    } | null;
}
/**
 * DOMPatcher interface
 */
export interface DOMPatcher {
    applyPatches(element: HTMLElement, patches: any[]): void;
}
/**
 * PlaygroundBridge interface
 */
export interface PlaygroundBridge {
    cacheHit(data: any): void;
    cacheMiss(data: any): void;
}
/**
 * Internal area instance (stored in component context)
 */
interface AreaInstance {
    definition: AreaDefinition;
    options?: AreaOptions;
    boundsRef: AbsoluteBounds | null;
    rafRef: number | null;
    lastUpdateRef: number;
    cleanupHandlers: Array<() => void>;
    onChange?: (state: AreaState) => void;
}
/**
 * Set the current component context
 * Called by Minimact before each render
 *
 * @internal
 */
export declare function setComponentContext(context: ComponentContext): void;
/**
 * Clear the current component context
 * Called by Minimact after each render
 *
 * @internal
 */
export declare function clearComponentContext(): void;
/**
 * Get current context
 *
 * @internal
 */
export declare function getCurrentContext(): ComponentContext | null;
/**
 * useArea hook - Integrated with Minimact
 *
 * Track a spatial region reactively. Syncs changes to server for predictive rendering.
 *
 * @param definition - Area definition (selector, bounds, or 'viewport')
 * @param options - Tracking options
 * @returns AreaState with spatial queries and statistics
 *
 * @example
 * ```typescript
 * const header = useArea({ top: 0, height: 80 });
 * const sidebar = useArea('#sidebar');
 *
 * // Server can access: State["area_0"], State["area_1"]
 * ```
 */
export declare function useArea(definition: AreaDefinition, options?: AreaOptions): AreaState;
/**
 * Cleanup areas for a component
 *
 * @internal
 */
export declare function cleanupAreas(context: ComponentContext): void;
export {};
