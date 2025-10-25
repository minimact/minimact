/**
 * minimact-dynamic - Value Updater
 *
 * Updates DOM element values directly.
 * NO VDOM. NO RECONCILIATION.
 * Just: el.textContent = value
 *
 * This is the core of MINIMACT's performance advantage.
 */
/**
 * Update DOM element value directly
 * Target: < 1ms per update
 */
export declare class ValueUpdater {
    /**
     * Update text content for all elements matching selector
     *
     * @param selector - CSS selector
     * @param value - New value
     *
     * @example
     * ```typescript
     * updater.updateValue('.price', '$19.99');
     * // → Direct update: el.textContent = '$19.99'
     * ```
     */
    updateValue(selector: string, value: any): void;
    /**
     * Update attribute value
     *
     * @param selector - CSS selector
     * @param attr - Attribute name
     * @param value - New value
     *
     * @example
     * ```typescript
     * updater.updateAttribute('img', 'src', '/new-image.jpg');
     * ```
     */
    updateAttribute(selector: string, attr: string, value: any): void;
    /**
     * Update style property
     *
     * @param selector - CSS selector
     * @param prop - Style property name
     * @param value - New value
     *
     * @example
     * ```typescript
     * updater.updateStyle('.progress', 'width', '75%');
     * ```
     */
    updateStyle(selector: string, prop: string, value: any): void;
    /**
     * Update class name
     *
     * @param selector - CSS selector
     * @param value - New class string
     *
     * @example
     * ```typescript
     * updater.updateClass('.button', 'button active');
     * ```
     */
    updateClass(selector: string, value: any): void;
    /**
     * Update visibility (display: none vs display: block)
     *
     * @param selector - CSS selector
     * @param visible - Whether element should be visible
     *
     * @example
     * ```typescript
     * updater.updateVisibility('.modal', true);
     * ```
     */
    updateVisibility(selector: string, visible: boolean): void;
    /**
     * Update element order (DOM CHOREOGRAPHY)
     * Moves elements based on state, never destroys them
     *
     * @param containerSelector - Container selector
     * @param childSelectors - Ordered array of child selectors
     *
     * @example
     * ```typescript
     * updater.updateOrder('.cards', ['#card-3', '#card-1', '#card-2']);
     * // → Rearranges cards in container (smooth CSS transitions!)
     * ```
     */
    updateOrder(containerSelector: string, childSelectors: string[]): void;
}
//# sourceMappingURL=value-updater.d.ts.map