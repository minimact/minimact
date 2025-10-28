var MinimactBundle = (function (exports) {
    'use strict';

    /**
     * Bundle Registry - Manages declarative DOM selector registrations
     *
     * Bundles are named selectors that target arbitrary DOM elements
     * for declarative attribute/style/class application.
     */
    /**
     * BundleRegistry - Global registry for bundle selectors
     *
     * Stores mappings between bundle IDs and their target selectors.
     * Supports string selectors, function selectors, and direct element arrays.
     */
    class BundleRegistry {
        constructor() {
            this.registrations = new Map();
        }
        /**
         * Register a bundle with a selector
         *
         * @param id - Unique bundle identifier
         * @param selector - CSS selector, function, or element array
         *
         * @example
         * ```typescript
         * registry.register("hero-animation", ".hero h1, .hero p");
         * registry.register("visible", () => {
         *   return Array.from(document.querySelectorAll('.item'))
         *     .filter(el => isInViewport(el));
         * });
         * ```
         */
        register(id, selector) {
            const registration = {
                id,
                selector,
                getElements: () => {
                    if (typeof selector === 'string') {
                        // CSS selector string
                        return Array.from(document.querySelectorAll(selector));
                    }
                    else if (typeof selector === 'function') {
                        // Function returning elements
                        return selector();
                    }
                    else {
                        // Direct element array
                        return selector;
                    }
                }
            };
            this.registrations.set(id, registration);
        }
        /**
         * Unregister a bundle
         *
         * @param id - Bundle identifier to remove
         */
        unregister(id) {
            this.registrations.delete(id);
        }
        /**
         * Get a bundle registration
         *
         * @param id - Bundle identifier
         * @returns Bundle registration or undefined
         */
        get(id) {
            return this.registrations.get(id);
        }
        /**
         * Check if a bundle is registered
         *
         * @param id - Bundle identifier
         * @returns True if bundle exists
         */
        has(id) {
            return this.registrations.has(id);
        }
        /**
         * Get all registered bundle IDs
         *
         * @returns Array of bundle IDs
         */
        getAllIds() {
            return Array.from(this.registrations.keys());
        }
        /**
         * Clear all registrations
         */
        clear() {
            this.registrations.clear();
        }
        /**
         * Get registration count
         */
        get size() {
            return this.registrations.size;
        }
    }
    // Singleton instance
    const registry = new BundleRegistry();
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
    function registerBundle(id, selector) {
        registry.register(id, selector);
    }
    /**
     * Unregister a bundle
     *
     * @param id - Bundle identifier to remove
     */
    function unregisterBundle(id) {
        registry.unregister(id);
    }
    /**
     * Get a bundle registration
     *
     * @param id - Bundle identifier
     * @returns Bundle registration or undefined
     */
    function getBundleRegistration(id) {
        return registry.get(id);
    }
    /**
     * Check if a bundle is registered
     *
     * @param id - Bundle identifier
     * @returns True if bundle exists
     */
    function hasBundleRegistration(id) {
        return registry.has(id);
    }
    /**
     * Get all registered bundle IDs
     *
     * @returns Array of bundle IDs
     */
    function getAllBundleIds() {
        return registry.getAllIds();
    }
    /**
     * Clear all bundle registrations
     */
    function clearAllBundles() {
        registry.clear();
    }

    /**
     * Bundle - Standalone DOM attribute applicator
     *
     * Applies attributes, classes, and styles to elements matched by a registered selector.
     * Can be used standalone or integrated with Minimact hooks.
     */
    /**
     * Bundle - Applies attributes to DOM elements via registered selector
     *
     * This is the standalone implementation that can be used without React/Minimact.
     * For Minimact integration, use the `useBundle` hook.
     *
     * @example
     * ```typescript
     * const bundle = new Bundle({
     *   id: 'hero-animation',
     *   attributes: {
     *     class: 'fade-in visible',
     *     'data-animated': 'true'
     *   }
     * });
     *
     * bundle.apply();  // Apply attributes
     * bundle.cleanup();  // Remove attributes
     * ```
     */
    class Bundle {
        constructor(options) {
            this.appliedElements = [];
            this.id = options.id;
            this.attributes = options.attributes;
            this.onApply = options.onApply;
            this.onCleanup = options.onCleanup;
        }
        /**
         * Apply attributes to target elements
         *
         * Looks up the registered selector and applies all attributes
         * to the matched elements.
         */
        apply() {
            const registration = getBundleRegistration(this.id);
            if (!registration) {
                console.warn(`[minimact-bundle] Bundle "${this.id}" not registered`);
                return;
            }
            // Get target elements
            const elements = registration.getElements();
            this.appliedElements = elements;
            // Apply attributes to each element
            elements.forEach(el => {
                this.applyAttributesToElement(el, this.attributes);
            });
            // Callback
            if (this.onApply) {
                this.onApply(elements);
            }
        }
        /**
         * Cleanup applied attributes
         *
         * Removes classes and attributes that were applied.
         * Note: Styles are NOT removed automatically as they may conflict.
         */
        cleanup() {
            this.appliedElements.forEach(el => {
                this.cleanupElement(el, this.attributes);
            });
            // Callback
            if (this.onCleanup) {
                this.onCleanup(this.appliedElements);
            }
            this.appliedElements = [];
        }
        /**
         * Update attributes and re-apply
         *
         * @param newAttributes - New attributes to apply
         */
        update(newAttributes) {
            // Cleanup old attributes
            this.cleanup();
            // Update and re-apply
            this.attributes = newAttributes;
            this.apply();
        }
        /**
         * Get currently applied elements
         *
         * @returns Array of elements with attributes applied
         */
        getAppliedElements() {
            return [...this.appliedElements];
        }
        // ============================================================
        // Private Methods
        // ============================================================
        applyAttributesToElement(el, attrs) {
            // Apply classes
            const classValue = attrs.class || attrs.className;
            if (classValue) {
                const classes = classValue.split(' ').filter(Boolean);
                el.classList.add(...classes);
            }
            // Apply styles
            if (attrs.style && el instanceof HTMLElement) {
                if (typeof attrs.style === 'object') {
                    Object.entries(attrs.style).forEach(([key, value]) => {
                        if (value !== undefined && value !== null) {
                            el.style[key] = String(value);
                        }
                    });
                }
            }
            // Apply other attributes
            Object.entries(attrs).forEach(([key, value]) => {
                if (!['class', 'className', 'style', 'id'].includes(key)) {
                    if (value !== undefined && value !== null) {
                        el.setAttribute(key, String(value));
                    }
                }
            });
        }
        cleanupElement(el, attrs) {
            // Remove classes
            const classValue = attrs.class || attrs.className;
            if (classValue) {
                const classes = classValue.split(' ').filter(Boolean);
                el.classList.remove(...classes);
            }
            // Remove attributes (excluding style - too risky)
            Object.keys(attrs).forEach(key => {
                if (!['class', 'className', 'style', 'id'].includes(key)) {
                    el.removeAttribute(key);
                }
            });
            // Note: We don't remove styles because they may have been
            // set by other sources. User can manually clear if needed.
        }
    }

    /**
     * Minimact Integration Layer for Bundle
     *
     * Integrates Bundle with Minimact's component context and server sync.
     * Follows MES (Minimact Extension Standards) Silver certification.
     */
    // Global context (set by Minimact runtime)
    let currentContext = null;
    let bundleIndex = 0;
    /**
     * Set component context (called by Minimact before component render)
     *
     * @param context - Component context
     */
    function setBundleContext(context) {
        currentContext = context;
        bundleIndex = 0;
    }
    /**
     * Clear component context (called by Minimact after component render)
     */
    function clearBundleContext() {
        currentContext = null;
        bundleIndex = 0;
    }
    /**
     * Get current component context (for debugging/testing)
     *
     * @returns Current context or null
     */
    function getCurrentContext() {
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
    function useBundle(id, attributes) {
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
        let bundle;
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
        }
        else {
            // Update existing bundle
            bundle = context.bundles.get(bundleKey);
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
    function cleanupBundles(context) {
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
    function applyBundleStandalone(id, attributes) {
        const bundle = new Bundle({ id, attributes });
        bundle.apply();
        return bundle;
    }

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
    // Version and metadata
    const VERSION = '0.1.0';
    const MES_CERTIFICATION = 'Silver';
    /**
     * Feature flags
     */
    const FEATURES = {
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
    };

    exports.Bundle = Bundle;
    exports.FEATURES = FEATURES;
    exports.MES_CERTIFICATION = MES_CERTIFICATION;
    exports.VERSION = VERSION;
    exports.applyBundleStandalone = applyBundleStandalone;
    exports.cleanupBundles = cleanupBundles;
    exports.clearAllBundles = clearAllBundles;
    exports.clearBundleContext = clearBundleContext;
    exports.getAllBundleIds = getAllBundleIds;
    exports.getBundleRegistration = getBundleRegistration;
    exports.getCurrentContext = getCurrentContext;
    exports.hasBundleRegistration = hasBundleRegistration;
    exports.registerBundle = registerBundle;
    exports.setBundleContext = setBundleContext;
    exports.unregisterBundle = unregisterBundle;
    exports.useBundle = useBundle;

    return exports;

})({});
