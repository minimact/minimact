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
export function trackDependencies<T extends object>(
  state: T,
  fn: (state: T) => any
): DependencyTrackingResult {
  const dependencies = new Set<string>();

  // Create proxy that tracks property access
  const proxy = createTrackingProxy(state, '', dependencies);

  // Execute function with tracking proxy
  const result = fn(proxy);

  return {
    result,
    dependencies: Array.from(dependencies)
  };
}

/**
 * Create a Proxy that tracks property access
 *
 * This recursively wraps objects to track nested property access like:
 * state.user.isPremium → tracks 'user.isPremium'
 */
function createTrackingProxy<T extends object>(
  target: T,
  path: string,
  dependencies: Set<string>
): T {
  return new Proxy(target, {
    get(obj, prop) {
      // Build the full path (e.g., 'user.isPremium')
      const propPath = path ? `${path}.${String(prop)}` : String(prop);

      // Track this property access
      dependencies.add(propPath);

      const value = obj[prop as keyof T];

      // If value is an object, return a proxy for nested tracking
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return createTrackingProxy(value, propPath, dependencies);
      }

      // Primitive value, return as-is
      return value;
    }
  });
}

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
export function hasPathChanged(
  prevState: any,
  nextState: any,
  dependencies: string[]
): boolean {
  return dependencies.some(path => {
    const prevValue = resolvePath(path, prevState);
    const nextValue = resolvePath(path, nextState);

    // Use strict equality for primitives
    return prevValue !== nextValue;
  });
}

/**
 * Resolve a dot-notation path to a value
 *
 * @param path - Dot-notation path (e.g., 'user.isPremium')
 * @param obj - Object to resolve from
 * @returns Value at path
 *
 * @example
 * ```typescript
 * const value = resolvePath('user.isPremium', { user: { isPremium: true } });
 * // value = true
 * ```
 */
function resolvePath(path: string, obj: any): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Shallow equality check for objects
 * Used for memoization cache
 */
export function shallowEqual(objA: any, objB: any): boolean {
  if (objA === objB) return true;

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (objA[key] !== objB[key]) return false;
  }

  return true;
}
