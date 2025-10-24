import type { DomElementStateOptions, DomStateChangeCallback } from './types';
import { DomElementStateValues } from './dom-element-state-values';
/**
 * DomElementState - Makes the DOM itself a reactive data source
 *
 * Tracks DOM changes (intersection, mutations, resize) and provides
 * a reactive API for accessing DOM topology in your components.
 *
 * @example
 * ```typescript
 * const box = new DomElementState(element);
 * console.log(box.childrenCount); // 3
 * console.log(box.isIntersecting); // true
 * ```
 */
export declare class DomElementState {
    private _element;
    private _elements;
    private _selector;
    private options;
    private intersectionObserver?;
    private mutationObserver?;
    private resizeObserver?;
    private _isIntersecting;
    private _intersectionRatio;
    private _boundingRect;
    private _childrenCount;
    private _grandChildrenCount;
    private _attributes;
    private _classList;
    private _exists;
    private onChange?;
    private updatePending;
    constructor(selectorOrElement?: string | HTMLElement, options?: DomElementStateOptions);
    /** The DOM element (singular mode) */
    get element(): HTMLElement | null;
    /** All matching elements (collection mode) */
    get elements(): HTMLElement[];
    /** Whether element is in viewport */
    get isIntersecting(): boolean;
    /** Percentage of element visible (0-1) */
    get intersectionRatio(): number;
    /** Element position and size */
    get boundingRect(): DOMRect | null;
    /** Direct children count */
    get childrenCount(): number;
    /** Total descendants count */
    get grandChildrenCount(): number;
    /** All element attributes */
    get attributes(): Record<string, string>;
    /** Element classes as array */
    get classList(): string[];
    /** Whether element exists in DOM */
    get exists(): boolean;
    /** Number of elements matching selector */
    get count(): number;
    /**
     * Test if all elements match a condition
     */
    every(predicate: (elem: DomElementState) => boolean): boolean;
    /**
     * Test if any element matches a condition
     */
    some(predicate: (elem: DomElementState) => boolean): boolean;
    /**
     * Filter elements by condition
     */
    filter(predicate: (elem: DomElementState) => boolean): DomElementState[];
    /**
     * Transform each element
     */
    map<T>(fn: (elem: DomElementState) => T): T[];
    /**
     * Access statistical methods for collections
     */
    get vals(): DomElementStateValues;
    /**
     * Attach to a single element
     */
    attachElement(element: HTMLElement): void;
    /**
     * Attach to elements matching selector
     */
    attachSelector(selector: string): void;
    /**
     * Attach to multiple specific elements
     */
    attachElements(elements: HTMLElement[]): void;
    private setupObservers;
    private setupIntersectionObserver;
    private setupMutationObserver;
    private setupResizeObserver;
    private updateState;
    private scheduleUpdate;
    private notifyChange;
    /**
     * Set callback for state changes
     */
    setOnChange(callback: DomStateChangeCallback): void;
    /**
     * Clean up all observers and resources
     */
    cleanup(): void;
    /**
     * Destroy the state object
     */
    destroy(): void;
}
//# sourceMappingURL=dom-element-state.d.ts.map