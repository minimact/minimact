/**
 * Minimact Integration Layer for DOM Element State
 *
 * This file provides the integration between DomElementState (standalone)
 * and Minimact's component context, HintQueue, and prediction system.
 *
 * Follows MES (Minimact Extension Standards) requirements:
 * - ✅ Component context integration (MES 1.1.1)
 * - ✅ Index-based tracking (MES 1.1.2)
 * - ✅ State storage in context (MES 1.1.3)
 * - ✅ HintQueue integration (MES 2.1.1)
 * - ✅ PlaygroundBridge integration (MES 2.1.2)
 * - ✅ Cleanup pattern (MES 1.2.1)
 */
import { DomElementState } from './dom-element-state';
import type { DomElementStateOptions } from './types';
import type { ConfidenceWorkerManager } from './confidence-worker-manager';
/**
 * Component context interface (from Minimact)
 *
 * We declare this here to avoid circular dependencies.
 * The actual implementation comes from minimact core.
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
    domElementStates?: Map<string, DomElementState>;
    hintQueue: HintQueue;
    domPatcher: DOMPatcher;
    playgroundBridge?: PlaygroundBridge;
    signalR: SignalRManager;
    confidenceWorker?: ConfidenceWorkerManager;
}
/**
 * SignalRManager interface for server synchronization
 */
export interface SignalRManager {
    updateDomElementState(componentId: string, stateKey: string, snapshot: any): Promise<void>;
    invoke(method: string, ...args: any[]): Promise<any>;
}
/**
 * HintQueue interface for predictive rendering
 */
export interface HintQueue {
    matchHint(componentId: string, stateChanges: Record<string, any>): {
        hintId: string;
        patches: any[];
        confidence: number;
    } | null;
}
/**
 * DOMPatcher interface for applying patches
 */
export interface DOMPatcher {
    applyPatches(element: HTMLElement, patches: any[]): void;
}
/**
 * PlaygroundBridge interface for visualization
 */
export interface PlaygroundBridge {
    cacheHit(data: {
        componentId: string;
        hintId: string;
        latency: number;
        confidence: number;
        patchCount: number;
    }): void;
    cacheMiss(data: {
        componentId: string;
        methodName: string;
        latency: number;
        patchCount: number;
    }): void;
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
 * Get current context (for advanced usage)
 *
 * @internal
 */
export declare function getCurrentContext(): ComponentContext | null;
/**
 * useDomElementState hook - Integrated with Minimact
 *
 * Makes the DOM a first-class reactive data source with predictive rendering.
 *
 * **MES Compliance:**
 * - ✅ Component context integration (MES 1.1.1)
 * - ✅ Index-based tracking (MES 1.1.2)
 * - ✅ State storage in context (MES 1.1.3)
 * - ✅ HintQueue integration (MES 2.1.1)
 * - ✅ PlaygroundBridge notifications (MES 2.1.2)
 *
 * @param selector - Optional CSS selector for collection mode
 * @param options - Configuration options
 * @returns DomElementState instance
 *
 * @example
 * ```tsx
 * // Singular element
 * const box = useDomElementState();
 *
 * <div ref={el => box.attachElement(el)}>
 *   {box.childrenCount > 3 && <CollapseButton />}
 *   {box.isIntersecting && <LazyContent />}
 * </div>
 * ```
 *
 * @example
 * ```tsx
 * // Collection with statistics
 * const prices = useDomElementState('.price');
 *
 * {prices.vals.avg() > 50 && <PremiumBadge />}
 * {prices.count > 10 && <Pagination />}
 * ```
 */
export declare function useDomElementState(selector?: string, options?: DomElementStateOptions): DomElementState;
/**
 * Cleanup all DOM element states for a component
 *
 * Called when component unmounts to prevent memory leaks.
 *
 * **MES Compliance:**
 * - ✅ Cleanup implementation (MES 1.2.1)
 * - ✅ Memory leak prevention (MES 1.2.2)
 *
 * @param context - Component context
 *
 * @example
 * ```typescript
 * // Called automatically by Minimact on unmount
 * cleanupDomElementStates(context);
 * ```
 */
export declare function cleanupDomElementStates(context: ComponentContext): void;
/**
 * Extend ComponentContext to include domElementStates
 * This allows TypeScript to know about our extension
 */
declare module 'minimact/types' {
    interface ComponentContext {
        domElementStates?: Map<string, DomElementState>;
    }
}
//# sourceMappingURL=integration.d.ts.map