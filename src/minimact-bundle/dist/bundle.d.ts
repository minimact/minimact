/**
 * Bundle - Standalone DOM attribute applicator
 *
 * Applies attributes, classes, and styles to elements matched by a registered selector.
 * Can be used standalone or integrated with Minimact hooks.
 */
export interface BundleAttributes {
    class?: string;
    className?: string;
    style?: Partial<CSSStyleDeclaration> | Record<string, string>;
    [key: string]: any;
}
export interface BundleOptions {
    /**
     * Unique bundle identifier (matches registration)
     */
    id: string;
    /**
     * Attributes to apply to target elements
     */
    attributes: BundleAttributes;
    /**
     * Optional callback when bundle is applied
     */
    onApply?: (elements: Element[]) => void;
    /**
     * Optional callback when bundle is cleaned up
     */
    onCleanup?: (elements: Element[]) => void;
}
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
export declare class Bundle {
    private id;
    private attributes;
    private appliedElements;
    private onApply?;
    private onCleanup?;
    constructor(options: BundleOptions);
    /**
     * Apply attributes to target elements
     *
     * Looks up the registered selector and applies all attributes
     * to the matched elements.
     */
    apply(): void;
    /**
     * Cleanup applied attributes
     *
     * Removes classes and attributes that were applied.
     * Note: Styles are NOT removed automatically as they may conflict.
     */
    cleanup(): void;
    /**
     * Update attributes and re-apply
     *
     * @param newAttributes - New attributes to apply
     */
    update(newAttributes: BundleAttributes): void;
    /**
     * Get currently applied elements
     *
     * @returns Array of elements with attributes applied
     */
    getAppliedElements(): Element[];
    private applyAttributesToElement;
    private cleanupElement;
}
//# sourceMappingURL=bundle.d.ts.map