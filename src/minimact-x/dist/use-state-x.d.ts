/**
 * useStateX Hook
 * CSS for State Logic - Declarative state projection system
 */
import type { StateXConfig, UseStateXReturn } from './types';
/**
 * Set the current component context (called by integration layer)
 * @internal
 */
export declare function setComponentContext(context: any): void;
/**
 * Clear the current component context (called by integration layer)
 * @internal
 */
export declare function clearComponentContext(): void;
/**
 * Get the current component context (for testing)
 * @internal
 */
export declare function getCurrentContext(): any;
/**
 * useStateX Hook
 *
 * Declarative state management with automatic DOM projection
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
 *
 * @param initialValue - Initial state value
 * @param config - State projection configuration
 * @returns Tuple of [currentValue, setState]
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
 * @internal
 */
export declare function cleanupStateProjections(context: any): void;
//# sourceMappingURL=use-state-x.d.ts.map