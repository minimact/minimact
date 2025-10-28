/**
 * Minimact Integration Layer for Bundle
 *
 * Integrates Bundle with Minimact's component context and server sync.
 * Follows MES (Minimact Extension Standards) Silver certification.
 */
import { Bundle, BundleAttributes } from './bundle';
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
/**
 * Set component context (called by Minimact before component render)
 *
 * @param context - Component context
 */
export declare function setBundleContext(context: ComponentContext): void;
/**
 * Clear component context (called by Minimact after component render)
 */
export declare function clearBundleContext(): void;
/**
 * Get current component context (for debugging/testing)
 *
 * @returns Current context or null
 */
export declare function getCurrentContext(): ComponentContext | null;
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
export declare function useBundle(id: string, attributes: BundleAttributes): Bundle;
/**
 * Cleanup all bundles for a component
 *
 * Called by Minimact during component cleanup.
 *
 * @param context - Component context
 */
export declare function cleanupBundles(context: ComponentContext): void;
/**
 * Apply bundle without Minimact context (for testing)
 *
 * @param id - Bundle identifier
 * @param attributes - Attributes to apply
 * @returns Bundle instance
 */
export declare function applyBundleStandalone(id: string, attributes: BundleAttributes): Bundle;
//# sourceMappingURL=integration.d.ts.map