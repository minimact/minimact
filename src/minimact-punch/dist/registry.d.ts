import { DomElementState } from './dom-element-state';
/**
 * Register a DomElementState instance with the global registry
 * Called when a DomElementState attaches to an element
 */
export declare function registerDomElementState(element: Element, state: DomElementState): void;
/**
 * Unregister a DomElementState instance from the global registry
 * Called when a DomElementState is destroyed or element is detached
 */
export declare function unregisterDomElementState(element: Element, state: DomElementState): void;
/**
 * Get the DomElementState for a given element
 * Returns null if element is not tracked
 */
export declare function getDomElementState(element: Element): DomElementState | null;
/**
 * Query all DomElementState instances matching a CSS selector
 * This is the core integration point for minimact-query
 */
export declare function queryDomElementStates(selector: string): DomElementState[];
/**
 * Get all active DomElementState instances
 * Useful for debugging and analytics
 */
export declare function getAllDomElementStates(): DomElementState[];
/**
 * Get count of tracked elements
 */
export declare function getTrackedElementCount(): number;
/**
 * Clear all registrations (useful for testing)
 */
export declare function clearRegistry(): void;
/**
 * Debug information about the registry
 */
export declare function getRegistryDebugInfo(): {
    activeStatesCount: number;
    cachedSelectors: string[];
};
//# sourceMappingURL=registry.d.ts.map