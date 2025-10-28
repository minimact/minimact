/**
 * Bundle Registry - Manages declarative DOM selector registrations
 *
 * Bundles are named selectors that target arbitrary DOM elements
 * for declarative attribute/style/class application.
 */
export type BundleSelector = string | (() => Element[]) | Element[];
export interface BundleRegistration {
    id: string;
    selector: BundleSelector;
    getElements: () => Element[];
}
/**
 * Register a bundle selector
 *
 * @param id - Unique bundle identifier
 * @param selector - CSS selector, function, or element array
 *
 * @example
 * ```typescript
 * registerBundle("hero-animation", ".hero h1, .hero p");
 * registerBundle("admin-only", "[data-admin-only]");
 * registerBundle("visible", () => getVisibleElements());
 * ```
 */
export declare function registerBundle(id: string, selector: BundleSelector): void;
/**
 * Unregister a bundle
 *
 * @param id - Bundle identifier to remove
 */
export declare function unregisterBundle(id: string): void;
/**
 * Get a bundle registration
 *
 * @param id - Bundle identifier
 * @returns Bundle registration or undefined
 */
export declare function getBundleRegistration(id: string): BundleRegistration | undefined;
/**
 * Check if a bundle is registered
 *
 * @param id - Bundle identifier
 * @returns True if bundle exists
 */
export declare function hasBundleRegistration(id: string): boolean;
/**
 * Get all registered bundle IDs
 *
 * @returns Array of bundle IDs
 */
export declare function getAllBundleIds(): string[];
/**
 * Clear all bundle registrations
 */
export declare function clearAllBundles(): void;
//# sourceMappingURL=bundle-registry.d.ts.map