import { DomElementState } from './dom-element-state';

/**
 * Global registry for tracking DomElementState instances
 *
 * This enables minimact-query to query DOM elements that have been
 * wrapped with DomElementState tracking.
 */

// WeakMap for element -> state lookup (garbage collection friendly)
const elementToStateMap = new WeakMap<Element, DomElementState>();

// Set for tracking all active states (allows iteration)
const activeStates = new Set<DomElementState>();

// Map for selector-based caching
const selectorCache = new Map<string, Set<DomElementState>>();
let cacheInvalidated = false;

/**
 * Register a DomElementState instance with the global registry
 * Called when a DomElementState attaches to an element
 */
export function registerDomElementState(element: Element, state: DomElementState): void {
  elementToStateMap.set(element, state);
  activeStates.add(state);
  invalidateSelectorCache();
}

/**
 * Unregister a DomElementState instance from the global registry
 * Called when a DomElementState is destroyed or element is detached
 */
export function unregisterDomElementState(element: Element, state: DomElementState): void {
  elementToStateMap.delete(element);
  activeStates.delete(state);
  invalidateSelectorCache();
}

/**
 * Get the DomElementState for a given element
 * Returns null if element is not tracked
 */
export function getDomElementState(element: Element): DomElementState | null {
  return elementToStateMap.get(element) ?? null;
}

/**
 * Query all DomElementState instances matching a CSS selector
 * This is the core integration point for minimact-query
 */
export function queryDomElementStates(selector: string): DomElementState[] {
  // Check cache first
  if (!cacheInvalidated && selectorCache.has(selector)) {
    return Array.from(selectorCache.get(selector)!);
  }

  // Query DOM and map to DomElementState instances
  const elements = document.querySelectorAll(selector);
  const states: DomElementState[] = [];

  for (const element of Array.from(elements)) {
    const state = elementToStateMap.get(element);
    if (state) {
      states.push(state);
    }
  }

  // Cache the result
  selectorCache.set(selector, new Set(states));
  cacheInvalidated = false;

  return states;
}

/**
 * Get all active DomElementState instances
 * Useful for debugging and analytics
 */
export function getAllDomElementStates(): DomElementState[] {
  return Array.from(activeStates);
}

/**
 * Get count of tracked elements
 */
export function getTrackedElementCount(): number {
  return activeStates.size;
}

/**
 * Clear all registrations (useful for testing)
 */
export function clearRegistry(): void {
  // Note: WeakMap doesn't have a clear() method
  // We can only clear the Set and cache
  activeStates.clear();
  selectorCache.clear();
  cacheInvalidated = true;
}

/**
 * Invalidate selector cache
 * Called when registry changes (add/remove elements)
 */
function invalidateSelectorCache(): void {
  selectorCache.clear();
  cacheInvalidated = true;
}

/**
 * Debug information about the registry
 */
export function getRegistryDebugInfo(): {
  activeStatesCount: number;
  cachedSelectors: string[];
} {
  return {
    activeStatesCount: activeStates.size,
    cachedSelectors: Array.from(selectorCache.keys())
  };
}
