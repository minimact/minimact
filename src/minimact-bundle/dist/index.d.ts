/**
 * Minimact Bundle - Declarative DOM Selector Primitives
 *
 * Behavioral anchors for applying attributes to arbitrary DOM elements
 * without wrapper pollution. Pure declarative control.
 *
 * @example
 * ```typescript
 * // Standalone mode
 * import { registerBundle, Bundle } from 'minimact-bundle';
 *
 * registerBundle("hero-animation", ".hero h1, .hero p");
 *
 * const bundle = new Bundle({
 *   id: "hero-animation",
 *   attributes: { class: "fade-in" }
 * });
 * bundle.apply();
 *
 * // Integrated mode (with Minimact)
 * import { useBundle, registerBundle } from 'minimact-bundle';
 *
 * function MyComponent() {
 *   registerBundle("hero-animation", ".hero h1, .hero p");
 *
 *   useBundle("hero-animation", {
 *     class: visible ? "fade-in visible" : "fade-in"
 *   });
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export { registerBundle, unregisterBundle, getBundleRegistration, hasBundleRegistration, getAllBundleIds, clearAllBundles } from './bundle-registry';
export type { BundleSelector, BundleRegistration } from './bundle-registry';
export { Bundle } from './bundle';
export type { BundleAttributes, BundleOptions } from './bundle';
export { useBundle, cleanupBundles, setBundleContext, clearBundleContext, getCurrentContext, applyBundleStandalone } from './integration';
export type { ComponentContext, SignalRManager } from './integration';
export declare const VERSION = "0.1.0";
export declare const MES_CERTIFICATION = "Silver";
/**
 * Feature flags
 */
export declare const FEATURES: {
    readonly standaloneMode: true;
    readonly minimactIntegration: true;
    readonly serverSync: true;
    readonly cssSelectors: true;
    readonly functionSelectors: true;
    readonly directElements: true;
    readonly attributeApplication: true;
    readonly classManagement: true;
    readonly styleApplication: true;
    readonly cleanup: true;
};
//# sourceMappingURL=index.d.ts.map