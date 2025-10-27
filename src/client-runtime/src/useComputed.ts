/**
 * useComputed Hook
 *
 * Compute values on the client using browser-only APIs or external libraries,
 * then sync to the server for rendering.
 *
 * This replaces the conceptually flawed "useClientState" with a sound approach:
 * - Client computes values using browser APIs (lodash, moment, geolocation, crypto)
 * - Results are synced to server via UpdateClientComputedState
 * - Server accesses values via GetClientState<T>(key) for rendering
 * - Server still does ALL rendering (dehydrationist architecture)
 */

import { useState, useEffect, useRef } from './hooks';
import type { ComponentContext } from './hooks';

export interface UseComputedOptions<T = any> {
  /** Enable memoization (default: true) */
  memoize?: boolean;
  /** Cache expiry in milliseconds (e.g., 5000 = 5 seconds) */
  expiry?: number;
  /** Debounce sync to server (milliseconds) */
  debounce?: number;
  /** Throttle sync to server (milliseconds) */
  throttle?: number;
  /** Initial value before first computation */
  initialValue?: T;
}

interface ComputedCache<T> {
  value: T;
  timestamp: number;
  deps: any[];
}

let currentContext: ComponentContext | null = null;
let computedIndex = 0;

/**
 * Set the current component context for useComputed
 * Called by setComponentContext in hooks.ts
 */
export function setComputedContext(context: ComponentContext): void {
  currentContext = context;
  computedIndex = 0;
}

/**
 * Clear the current component context
 */
export function clearComputedContext(): void {
  currentContext = null;
  computedIndex = 0;
}

/**
 * useComputed Hook
 *
 * @param key - Unique identifier for server-side access via GetClientState<T>(key)
 * @param computeFn - Function that computes the value (runs on client)
 * @param deps - Dependency array (like useEffect)
 * @param options - Configuration options
 * @returns The computed value
 *
 * @example
 * // With lodash
 * const sortedUsers = useComputed('sortedUsers', () => {
 *   return _.sortBy(users, 'name');
 * }, [users]);
 *
 * @example
 * // With geolocation
 * const location = useComputed('location', async () => {
 *   const pos = await new Promise((resolve) => {
 *     navigator.geolocation.getCurrentPosition(resolve);
 *   });
 *   return { lat: pos.coords.latitude, lng: pos.coords.longitude };
 * }, []);
 *
 * @example
 * // With memoization and expiry
 * const result = useComputed('result', () => compute(data), [data], {
 *   memoize: true,
 *   expiry: 5000  // Cache for 5 seconds
 * });
 */
export function useComputed<T>(
  key: string,
  computeFn: () => T,
  deps: any[] = [],
  options: UseComputedOptions<T> = {}
): T {
  if (!currentContext) {
    throw new Error('[Minimact] useComputed must be called within a component render');
  }

  const {
    memoize = true,  // Default to true for performance
    expiry,
    debounce,
    throttle,
    initialValue
  } = options;

  const context = currentContext;
  const index = computedIndex++;
  const computedKey = `computed_${index}_${key}`;

  // Store computed value in state
  const [value, setValue] = useState<T>(
    initialValue !== undefined ? initialValue : null as T
  );

  // Cache for memoization
  const cache = useRef<ComputedCache<T> | null>(null);

  // Debounce timer ref
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    // Check if we should use cached value
    if (memoize && cache.current) {
      // Check if deps changed
      const depsChanged = deps.length !== cache.current.deps.length ||
        deps.some((dep, i) => !Object.is(dep, cache.current!.deps[i]));

      if (!depsChanged) {
        // Deps haven't changed
        if (expiry) {
          // Check if cache expired
          const age = Date.now() - cache.current.timestamp;
          if (age < expiry) {
            // Cache is still valid, use cached value
            return;
          }
          // Cache expired, continue to recompute
        } else {
          // No expiry, use cached value indefinitely
          return;
        }
      }
      // Deps changed, continue to recompute
    }

    // Compute new value
    let computed: T;
    try {
      computed = computeFn();
    } catch (error) {
      console.error(`[Minimact] Error in useComputed('${key}'):`, error);
      throw error;
    }

    // Handle async computations
    if (computed instanceof Promise) {
      computed.then((resolvedValue) => {
        // Update cache if memoization enabled
        if (memoize) {
          cache.current = {
            value: resolvedValue,
            timestamp: Date.now(),
            deps: [...deps]
          };
        }

        // Update local state
        setValue(resolvedValue);

        // Sync to server
        syncToServer(resolvedValue);
      }).catch((error) => {
        console.error(`[Minimact] Async error in useComputed('${key}'):`, error);
      });

      return; // Don't sync yet, wait for promise to resolve
    }

    // Update cache if memoization enabled
    if (memoize) {
      cache.current = {
        value: computed,
        timestamp: Date.now(),
        deps: [...deps]
      };
    }

    // Update local state
    setValue(computed);

    // Sync to server
    syncToServer(computed);

  }, deps);

  /**
   * Sync computed value to server via SignalR
   */
  function syncToServer(computedValue: T): void {
    const doSync = () => {
      if (!context.signalR) {
        console.warn(`[Minimact] SignalR not available, cannot sync useComputed('${key}')`);
        return;
      }

      context.signalR.updateClientComputedState(context.componentId, { [key]: computedValue })
        .catch(err => {
          console.error(`[Minimact] Failed to sync computed state '${key}':`, err);
        });
    };

    // Apply debounce if specified
    if (debounce) {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = window.setTimeout(() => {
        doSync();
        debounceTimer.current = null;
      }, debounce);
      return;
    }

    // TODO: Implement throttle
    if (throttle) {
      // For now, just sync immediately
      // Proper throttle implementation would track last sync time
      doSync();
      return;
    }

    // No debounce/throttle, sync immediately
    doSync();
  }

  return value;
}
