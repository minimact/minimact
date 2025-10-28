/**
 * Minimact Integration Layer for Bundle
 *
 * Integrates Bundle with Minimact's component context and server sync.
 * Follows MES (Minimact Extension Standards) Silver certification.
 */

import { Bundle, BundleAttributes } from './bundle';
import { getBundleRegistration } from './bundle-registry';

/**
 * Component context for Minimact integration
 * Matches the pattern from minimact-punch
 */
export interface ComponentContext {
  componentId: string;
  element: HTMLElement;
  bundles?: Map<string, Bundle>;
  signalR: SignalRManager;
}

/**
 * SignalR manager interface for server synchronization
 */
export interface SignalRManager {
  updateBundleState(componentId: string, bundleId: string, attributes: BundleAttributes): Promise<void>;
}

// Global context (set by Minimact runtime)
let currentContext: ComponentContext | null = null;
let bundleIndex = 0;

/**
 * Set component context (called by Minimact before component render)
 *
 * @param context - Component context
 */
export function setBundleContext(context: ComponentContext): void {
  currentContext = context;
  bundleIndex = 0;
}

/**
 * Clear component context (called by Minimact after component render)
 */
export function clearBundleContext(): void {
  currentContext = null;
  bundleIndex = 0;
}

/**
 * Get current component context (for debugging/testing)
 *
 * @returns Current context or null
 */
export function getCurrentContext(): ComponentContext | null {
  return currentContext;
}

/**
 * useBundle - Minimact hook for declarative DOM attribute application
 *
 * Applies attributes to elements matched by a registered bundle selector.
 * Integrates with Minimact's component context and server sync.
 *
 * @param id - Bundle identifier (must be registered via registerBundle)
 * @param attributes - Attributes to apply (class, style, data-*, etc.)
 * @returns Bundle instance
 *
 * @example
 * ```typescript
 * // Register bundle (typically in useEffect or globally)
 * registerBundle("hero-animation", ".hero h1, .hero p");
 *
 * // Use bundle in component
 * function MyComponent() {
 *   const [visible, setVisible] = useState(false);
 *
 *   const bundle = useBundle("hero-animation", {
 *     class: visible ? "fade-in visible" : "fade-in",
 *     'data-animated': visible
 *   });
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useBundle(id: string, attributes: BundleAttributes): Bundle {
  if (!currentContext) {
    throw new Error('[minimact-bundle] useBundle must be called within a component render');
  }

  const context = currentContext;
  const index = bundleIndex++;
  const bundleKey = `bundle_${index}`;

  // Initialize bundles map if needed
  if (!context.bundles) {
    context.bundles = new Map();
  }

  // Get or create bundle
  let bundle: Bundle;

  if (!context.bundles.has(bundleKey)) {
    // Create new bundle
    bundle = new Bundle({
      id,
      attributes,
      onApply: (elements) => {
        // Sync bundle state to server
        context.signalR.updateBundleState(context.componentId, id, attributes)
          .catch(err => {
            console.error('[minimact-bundle] Failed to sync bundle state to server:', err);
          });
      }
    });

    context.bundles.set(bundleKey, bundle);

    // Apply immediately
    bundle.apply();
  } else {
    // Update existing bundle
    bundle = context.bundles.get(bundleKey)!;
    bundle.update(attributes);
  }

  return bundle;
}

/**
 * Cleanup all bundles for a component
 *
 * Called by Minimact during component cleanup.
 *
 * @param context - Component context
 */
export function cleanupBundles(context: ComponentContext): void {
  if (context.bundles) {
    context.bundles.forEach(bundle => {
      bundle.cleanup();
    });
    context.bundles.clear();
  }
}

/**
 * Apply bundle without Minimact context (for testing)
 *
 * @param id - Bundle identifier
 * @param attributes - Attributes to apply
 * @returns Bundle instance
 */
export function applyBundleStandalone(id: string, attributes: BundleAttributes): Bundle {
  const bundle = new Bundle({ id, attributes });
  bundle.apply();
  return bundle;
}
