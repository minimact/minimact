/**
 * Integration Layer
 * Connects useStateX with Minimact's ComponentContext
 */
import type { ComponentContext } from '@minimact/core';
import type { StateXConfig, UseStateXReturn, StateXProjection, StateXContext } from './types';
declare module '@minimact/core' {
    interface ComponentContext extends StateXContext {
        stateProjections?: Map<string, StateXProjection>;
        dependencyGraph?: any;
        projectionContext?: any;
        stateXDevToolsBridge?: any;
        stateXSyncTimeouts?: Map<string, number>;
    }
}
/**
 * Set the current component context (called by Minimact before render)
 * @internal
 */
export declare function setComponentContext(context: ComponentContext): void;
/**
 * Clear the current component context (called by Minimact after render)
 * @internal
 */
export declare function clearComponentContext(): void;
/**
 * Get the current component context (for testing)
 * @internal
 */
export declare function getCurrentContext(): ComponentContext | null;
/**
 * useStateX Hook (Integrated Mode)
 *
 * Works within Minimact component context with full integration:
 * - HintQueue for template patch matching
 * - SignalR for server synchronization
 * - PlaygroundBridge for DevTools
 * - DOMPatcher for surgical updates
 *
 * @example
 * ```tsx
 * const [price, setPrice] = useStateX(99, {
 *   targets: {
 *     '.price-display': {
 *       transform: v => `$${v.toFixed(2)}`,
 *       applyIf: ctx => ctx.user.canSeePrice
 *     }
 *   }
 * });
 * ```
 */
export declare function useStateX<T>(initialValue: T, config: StateXConfig<T>): UseStateXReturn<T>;
/**
 * Manually sync state to server (for sync: 'manual' strategy)
 *
 * @param stateKey - State key to sync (optional, syncs all if not provided)
 */
export declare function syncStateToServer(stateKey?: string): void;
/**
 * Cleanup all state projections for a component
 * Called by Minimact on component unmount
 * @internal
 */
export declare function cleanupStateProjections(context: ComponentContext): void;
//# sourceMappingURL=integration.d.ts.map