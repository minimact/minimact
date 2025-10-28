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

// Standalone mode - Bundle registry and core class
export {
  registerBundle,
  unregisterBundle,
  getBundleRegistration,
  hasBundleRegistration,
  getAllBundleIds,
  clearAllBundles
} from './bundle-registry';

export type {
  BundleSelector,
  BundleRegistration
} from './bundle-registry';

export {
  Bundle
} from './bundle';

export type {
  BundleAttributes,
  BundleOptions
} from './bundle';

// Integrated mode - Minimact hooks
export {
  useBundle,
  cleanupBundles,
  setBundleContext,
  clearBundleContext,
  getCurrentContext,
  applyBundleStandalone
} from './integration';

export type {
  ComponentContext,
  SignalRManager
} from './integration';

// Version and metadata
export const VERSION = '0.1.0';
export const MES_CERTIFICATION = 'Silver';

/**
 * Feature flags
 */
export const FEATURES = {
  standaloneMode: true,
  minimactIntegration: true,
  serverSync: true,
  cssSelectors: true,
  functionSelectors: true,
  directElements: true,
  attributeApplication: true,
  classManagement: true,
  styleApplication: true,
  cleanup: true
} as const;
