/**
 * minimact-dynamic - Dependency Tracker
 *
 * Automatically tracks which state properties a function accesses
 * using Proxy to intercept property reads.
 *
 * This enables smart re-evaluation: only re-run binding when
 * its specific dependencies change.
 */
import type { DependencyTrackingResult } from './types';
/**
 * Track which state properties a function accesses
 *
 * @param state - State object
 * @param fn - Function to track
 * @returns Result and array of dependency paths
 *
 * @example
 * ```typescript
 * const { result, dependencies } = trackDependencies(
 *   { user: { isPremium: true }, product: { price: 29.99 } },
 *   (state) => state.user.isPremium ? state.product.price : 0
 * );
 * // dependencies = ['user.isPremium', 'product.price']
 * ```
 */
export declare function trackDependencies<T extends object>(state: T, fn: (state: T) => any): DependencyTrackingResult;
/**
 * Check if any dependency path changed between prev and next state
 *
 * @param prevState - Previous state
 * @param nextState - Next state
 * @param dependencies - Array of dependency paths to check
 * @returns True if any dependency changed
 *
 * @example
 * ```typescript
 * const changed = hasPathChanged(
 *   { user: { isPremium: false } },
 *   { user: { isPremium: true } },
 *   ['user.isPremium']
 * );
 * // changed = true
 * ```
 */
export declare function hasPathChanged(prevState: any, nextState: any, dependencies: string[]): boolean;
/**
 * Shallow equality check for objects
 * Used for memoization cache
 */
export declare function shallowEqual(objA: any, objB: any): boolean;
//# sourceMappingURL=dependency-tracker.d.ts.map