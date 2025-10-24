import type { DomElementStateOptions, DomStateChangeCallback } from './types';
import { DomElementStateValues } from './dom-element-state-values';
import { PseudoStateTracker } from './pseudo-state-tracker';
import { ThemeStateTracker, BreakpointState } from './theme-state-tracker';
import { StateHistoryTracker } from './state-history-tracker';
import { LifecycleStateTracker } from './lifecycle-state-tracker';
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
    private pseudoStateTracker?;
    private themeStateTracker?;
    private historyTracker?;
    private lifecycleTracker?;
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
     * Get pseudo-state tracker (lazy initialization)
     *
     * @example
     * ```typescript
     * const box = new DomElementState(element);
     * console.log(box.state.hover); // true/false
     * console.log(box.state.focus); // true/false
     * ```
     */
    get state(): PseudoStateTracker;
    /**
     * Get theme state (dark mode, high contrast, reduced motion)
     *
     * @example
     * ```typescript
     * const app = new DomElementState(rootElement);
     * console.log(app.theme.isDark); // true/false
     * console.log(app.theme.reducedMotion); // true/false
     * ```
     */
    get theme(): ThemeStateTracker;
    /**
     * Get breakpoint state (sm, md, lg, xl, 2xl)
     *
     * @example
     * ```typescript
     * const app = new DomElementState(rootElement);
     * console.log(app.breakpoint.md); // true/false
     * console.log(app.breakpoint.between('md', 'lg')); // true/false
     * ```
     */
    get breakpoint(): BreakpointState;
    /**
     * Get history tracker (temporal awareness)
     *
     * Provides access to:
     * - Change count, frequency analysis (changes per second/minute)
     * - Stability detection (hasStabilized, isOscillating)
     * - Trend analysis (increasing, decreasing, stable, volatile)
     * - Historical queries (updatedInLast, changedMoreThan, wasStableFor)
     * - Predictions (likelyToChangeNext, estimatedNextChange)
     *
     * @example
     * ```typescript
     * const widget = new DomElementState(element);
     * console.log(widget.history.changesPerSecond); // 0.37
     * console.log(widget.history.hasStabilized); // true
     * console.log(widget.history.trend); // 'increasing'
     * ```
     */
    get history(): StateHistoryTracker;
    /**
     * Get lifecycle state machine (theatrical engine)
     *
     * Transforms the element into a finite state machine with:
     * - Declarative states with valid transitions
     * - Styles bound to each state
     * - Templates bound to each state
     * - Lifecycle hooks (onEnter, onExit, onTransition)
     * - Auto-transitions with durations
     * - Transition history tracking
     *
     * @example
     * ```typescript
     * const modal = new DomElementState(element, {
     *   lifecycle: {
     *     states: ['hidden', 'visible'],
     *     defaultState: 'hidden',
     *     styles: {
     *       hidden: { opacity: 0 },
     *       visible: { opacity: 1 }
     *     }
     *   }
     * });
     *
     * console.log(modal.lifecycle.lifecycleState); // 'hidden'
     * modal.lifecycle.transitionTo('visible');
     * console.log(modal.lifecycle.style); // { opacity: 1 }
     * ```
     */
    get lifecycle(): LifecycleStateTracker<any>;
    /**
     * Destroy the state object
     */
    destroy(): void;
}
//# sourceMappingURL=dom-element-state.d.ts.map