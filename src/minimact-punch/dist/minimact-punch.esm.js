/**
 * Statistical operations on DOM element collections
 *
 * Provides avg, sum, median, stdDev, and other aggregations
 * by extracting numeric values from elements.
 *
 * @example
 * ```typescript
 * const prices = new DomElementState('.price');
 * prices.vals.avg(); // 29.99
 * prices.vals.sum(); // 149.95
 * prices.vals.median(); // 25.00
 * ```
 */
class DomElementStateValues {
    constructor(elements) {
        this.elements = elements;
    }
    /**
     * Extract numeric values from elements
     * Priority: data-value attribute > textContent parsing
     */
    extractNumericValues() {
        return this.elements.map(state => {
            const element = state.element;
            if (!element)
                return 0;
            // Try data-value attribute first
            const dataValue = element.getAttribute('data-value');
            if (dataValue !== null) {
                const parsed = parseFloat(dataValue);
                return isNaN(parsed) ? 0 : parsed;
            }
            // Fall back to parsing textContent
            const text = element.textContent || '';
            const cleaned = text.replace(/[^0-9.-]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        });
    }
    /**
     * Average of all values
     */
    avg() {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    /**
     * Sum of all values
     */
    sum() {
        return this.extractNumericValues().reduce((a, b) => a + b, 0);
    }
    /**
     * Minimum value
     */
    min() {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        return Math.min(...values);
    }
    /**
     * Maximum value
     */
    max() {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        return Math.max(...values);
    }
    /**
     * Median value (middle value when sorted)
     */
    median() {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            // Even number of values - average the two middle values
            return (sorted[mid - 1] + sorted[mid]) / 2;
        }
        else {
            // Odd number of values - return middle value
            return sorted[mid];
        }
    }
    /**
     * Standard deviation
     */
    stdDev() {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        const avg = this.avg();
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquareDiff);
    }
    /**
     * Range (min and max)
     */
    range() {
        return {
            min: this.min(),
            max: this.max()
        };
    }
    /**
     * Percentile (e.g., percentile(95) for 95th percentile)
     */
    percentile(p) {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = (p / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        if (lower === upper) {
            return sorted[lower];
        }
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
    /**
     * Check if all values are above a threshold
     */
    allAbove(threshold) {
        return this.extractNumericValues().every(v => v > threshold);
    }
    /**
     * Check if any value is below a threshold
     */
    anyBelow(threshold) {
        return this.extractNumericValues().some(v => v < threshold);
    }
    /**
     * Count values above a threshold
     */
    countAbove(threshold) {
        return this.extractNumericValues().filter(v => v > threshold).length;
    }
    /**
     * Count values below a threshold
     */
    countBelow(threshold) {
        return this.extractNumericValues().filter(v => v < threshold).length;
    }
    /**
     * Count values in a range (inclusive)
     */
    countInRange(min, max) {
        return this.extractNumericValues().filter(v => v >= min && v <= max).length;
    }
    /**
     * Get all values as array
     */
    toArray() {
        return this.extractNumericValues();
    }
}

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
class DomElementState {
    constructor(selectorOrElement, options = {}) {
        // Core properties
        this._element = null;
        this._elements = [];
        this._selector = null;
        // Reactive state
        this._isIntersecting = false;
        this._intersectionRatio = 0;
        this._boundingRect = null;
        this._childrenCount = 0;
        this._grandChildrenCount = 0;
        this._attributes = {};
        this._classList = [];
        this._exists = false;
        this.updatePending = false;
        // Merge options with defaults
        this.options = {
            selector: options.selector ?? null,
            trackIntersection: options.trackIntersection ?? true,
            trackMutation: options.trackMutation ?? true,
            trackResize: options.trackResize ?? true,
            intersectionOptions: options.intersectionOptions || {},
            debounceMs: options.debounceMs ?? 16 // ~60fps
        };
        // Initialize based on input
        if (typeof selectorOrElement === 'string') {
            this._selector = selectorOrElement;
            this.attachSelector(selectorOrElement);
        }
        else if (selectorOrElement instanceof HTMLElement) {
            this.attachElement(selectorOrElement);
        }
    }
    // ============================================================
    // PUBLIC API - Reactive Properties
    // ============================================================
    /** The DOM element (singular mode) */
    get element() {
        return this._element;
    }
    /** All matching elements (collection mode) */
    get elements() {
        return this._elements;
    }
    /** Whether element is in viewport */
    get isIntersecting() {
        return this._isIntersecting;
    }
    /** Percentage of element visible (0-1) */
    get intersectionRatio() {
        return this._intersectionRatio;
    }
    /** Element position and size */
    get boundingRect() {
        return this._boundingRect;
    }
    /** Direct children count */
    get childrenCount() {
        return this._childrenCount;
    }
    /** Total descendants count */
    get grandChildrenCount() {
        return this._grandChildrenCount;
    }
    /** All element attributes */
    get attributes() {
        return { ...this._attributes };
    }
    /** Element classes as array */
    get classList() {
        return [...this._classList];
    }
    /** Whether element exists in DOM */
    get exists() {
        return this._exists;
    }
    // Collection properties
    /** Number of elements matching selector */
    get count() {
        return this._elements.length;
    }
    // ============================================================
    // COLLECTION METHODS
    // ============================================================
    /**
     * Test if all elements match a condition
     */
    every(predicate) {
        return this._elements.every(el => {
            const state = new DomElementState(el, this.options);
            return predicate(state);
        });
    }
    /**
     * Test if any element matches a condition
     */
    some(predicate) {
        return this._elements.some(el => {
            const state = new DomElementState(el, this.options);
            return predicate(state);
        });
    }
    /**
     * Filter elements by condition
     */
    filter(predicate) {
        return this._elements
            .filter(el => {
            const state = new DomElementState(el, this.options);
            return predicate(state);
        })
            .map(el => new DomElementState(el, this.options));
    }
    /**
     * Transform each element
     */
    map(fn) {
        return this._elements.map(el => {
            const state = new DomElementState(el, this.options);
            return fn(state);
        });
    }
    // ============================================================
    // STATISTICAL OPERATIONS
    // ============================================================
    /**
     * Access statistical methods for collections
     */
    get vals() {
        return new DomElementStateValues(this._elements.map(el => new DomElementState(el, this.options)));
    }
    // ============================================================
    // ATTACHMENT METHODS
    // ============================================================
    /**
     * Attach to a single element
     */
    attachElement(element) {
        this.cleanup();
        this._element = element;
        this._elements = [element];
        this._selector = null;
        this._exists = true;
        this.updateState();
        this.setupObservers();
    }
    /**
     * Attach to elements matching selector
     */
    attachSelector(selector) {
        this.cleanup();
        this._selector = selector;
        const elements = Array.from(document.querySelectorAll(selector));
        this._elements = elements;
        this._element = elements[0] || null;
        this._exists = elements.length > 0;
        if (this._element) {
            this.updateState();
            this.setupObservers();
        }
    }
    /**
     * Attach to multiple specific elements
     */
    attachElements(elements) {
        this.cleanup();
        this._elements = elements;
        this._element = elements[0] || null;
        this._selector = null;
        this._exists = elements.length > 0;
        if (this._element) {
            this.updateState();
            this.setupObservers();
        }
    }
    // ============================================================
    // OBSERVER SETUP
    // ============================================================
    setupObservers() {
        if (!this._element)
            return;
        if (this.options.trackIntersection) {
            this.setupIntersectionObserver();
        }
        if (this.options.trackMutation) {
            this.setupMutationObserver();
        }
        if (this.options.trackResize) {
            this.setupResizeObserver();
        }
    }
    setupIntersectionObserver() {
        if (!this._element || this.intersectionObserver)
            return;
        this.intersectionObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                this._isIntersecting = entry.isIntersecting;
                this._intersectionRatio = entry.intersectionRatio;
                this._boundingRect = entry.boundingClientRect;
                this.scheduleUpdate();
            }
        }, this.options.intersectionOptions);
        this.intersectionObserver.observe(this._element);
    }
    setupMutationObserver() {
        if (!this._element || this.mutationObserver)
            return;
        this.mutationObserver = new MutationObserver(() => {
            this.updateState();
            this.scheduleUpdate();
        });
        this.mutationObserver.observe(this._element, {
            childList: true,
            attributes: true,
            attributeOldValue: false,
            characterData: false,
            subtree: true
        });
    }
    setupResizeObserver() {
        if (!this._element || this.resizeObserver)
            return;
        this.resizeObserver = new ResizeObserver(() => {
            this._boundingRect = this._element.getBoundingClientRect();
            this.scheduleUpdate();
        });
        this.resizeObserver.observe(this._element);
    }
    // ============================================================
    // STATE UPDATE
    // ============================================================
    updateState() {
        if (!this._element)
            return;
        // Update children counts
        this._childrenCount = this._element.children.length;
        this._grandChildrenCount = this._element.querySelectorAll('*').length;
        // Update attributes
        const attrs = {};
        for (let i = 0; i < this._element.attributes.length; i++) {
            const attr = this._element.attributes[i];
            attrs[attr.name] = attr.value;
        }
        this._attributes = attrs;
        // Update classList
        this._classList = Array.from(this._element.classList);
        // Update bounding rect
        this._boundingRect = this._element.getBoundingClientRect();
    }
    scheduleUpdate() {
        if (this.updatePending)
            return;
        this.updatePending = true;
        requestAnimationFrame(() => {
            this.notifyChange();
            this.updatePending = false;
        });
    }
    notifyChange() {
        if (this.onChange) {
            const snapshot = {
                isIntersecting: this._isIntersecting,
                intersectionRatio: this._intersectionRatio,
                childrenCount: this._childrenCount,
                grandChildrenCount: this._grandChildrenCount,
                attributes: this.attributes,
                classList: this.classList,
                boundingRect: this._boundingRect,
                exists: this._exists,
                count: this._elements.length
            };
            this.onChange(snapshot);
        }
    }
    // ============================================================
    // LIFECYCLE
    // ============================================================
    /**
     * Set callback for state changes
     */
    setOnChange(callback) {
        this.onChange = callback;
    }
    /**
     * Clean up all observers and resources
     */
    cleanup() {
        this.intersectionObserver?.disconnect();
        this.mutationObserver?.disconnect();
        this.resizeObserver?.disconnect();
        this.intersectionObserver = undefined;
        this.mutationObserver = undefined;
        this.resizeObserver = undefined;
    }
    /**
     * Destroy the state object
     */
    destroy() {
        this.cleanup();
        this.onChange = undefined;
        this._element = null;
        this._elements = [];
    }
}

/**
 * Hook for using DOM element state in components
 *
 * This is a simplified standalone version. In full Minimact integration,
 * this would connect to the component context and trigger re-renders.
 *
 * @param selectorOrElement - CSS selector or HTMLElement
 * @param options - Configuration options
 * @returns DomElementState instance
 *
 * @example
 * ```typescript
 * const box = useDomElementState();
 * // Attach to element via ref
 * <div ref={el => box.attachElement(el)}>
 *   {box.childrenCount > 3 && <CollapseButton />}
 * </div>
 * ```
 *
 * @example
 * ```typescript
 * const prices = useDomElementState('.price');
 * {prices.vals.avg() > 50 && <PremiumBadge />}
 * ```
 */
function useDomElementState$1(selectorOrElement, options) {
    // For standalone usage, just create and return the state
    // In full Minimact integration, this would:
    // 1. Store state in component context
    // 2. Set up onChange callback to trigger re-render
    // 3. Clean up on unmount
    // 4. Send state changes to server via SignalR
    return new DomElementState(selectorOrElement, options);
}

/**
 * Minimact Integration Layer for DOM Element State
 *
 * This file provides the integration between DomElementState (standalone)
 * and Minimact's component context, HintQueue, and prediction system.
 *
 * Follows MES (Minimact Extension Standards) requirements:
 * - ✅ Component context integration (MES 1.1.1)
 * - ✅ Index-based tracking (MES 1.1.2)
 * - ✅ State storage in context (MES 1.1.3)
 * - ✅ HintQueue integration (MES 2.1.1)
 * - ✅ PlaygroundBridge integration (MES 2.1.2)
 * - ✅ Cleanup pattern (MES 1.2.1)
 */
// ============================================================
// GLOBAL CONTEXT TRACKING (MES 1.1.1)
// ============================================================
let currentContext = null;
let domElementStateIndex = 0;
/**
 * Set the current component context
 * Called by Minimact before each render
 *
 * @internal
 */
function setComponentContext(context) {
    currentContext = context;
    domElementStateIndex = 0;
}
/**
 * Clear the current component context
 * Called by Minimact after each render
 *
 * @internal
 */
function clearComponentContext() {
    currentContext = null;
}
/**
 * Get current context (for advanced usage)
 *
 * @internal
 */
function getCurrentContext() {
    return currentContext;
}
// ============================================================
// HOOK IMPLEMENTATION (MES 1.1)
// ============================================================
/**
 * useDomElementState hook - Integrated with Minimact
 *
 * Makes the DOM a first-class reactive data source with predictive rendering.
 *
 * **MES Compliance:**
 * - ✅ Component context integration (MES 1.1.1)
 * - ✅ Index-based tracking (MES 1.1.2)
 * - ✅ State storage in context (MES 1.1.3)
 * - ✅ HintQueue integration (MES 2.1.1)
 * - ✅ PlaygroundBridge notifications (MES 2.1.2)
 *
 * @param selector - Optional CSS selector for collection mode
 * @param options - Configuration options
 * @returns DomElementState instance
 *
 * @example
 * ```tsx
 * // Singular element
 * const box = useDomElementState();
 *
 * <div ref={el => box.attachElement(el)}>
 *   {box.childrenCount > 3 && <CollapseButton />}
 *   {box.isIntersecting && <LazyContent />}
 * </div>
 * ```
 *
 * @example
 * ```tsx
 * // Collection with statistics
 * const prices = useDomElementState('.price');
 *
 * {prices.vals.avg() > 50 && <PremiumBadge />}
 * {prices.count > 10 && <Pagination />}
 * ```
 */
function useDomElementState(selector, options) {
    // MES 1.1.1: Guard - Must be called within component render
    if (!currentContext) {
        throw new Error('[minimact-punch] useDomElementState must be called within a component render. ' +
            'Make sure you are calling this hook inside a Minimact component function.');
    }
    const context = currentContext;
    // MES 1.1.2: Index-based tracking
    const index = domElementStateIndex++;
    const stateKey = `domElementState_${index}`;
    // MES 1.1.3: Initialize storage if needed
    if (!context.domElementStates) {
        context.domElementStates = new Map();
    }
    // Get or create state instance
    if (!context.domElementStates.has(stateKey)) {
        // Create new DomElementState instance
        const domState = new DomElementState(selector, {
            trackIntersection: options?.trackIntersection ?? true,
            trackMutation: options?.trackMutation ?? true,
            trackResize: options?.trackResize ?? true,
            intersectionOptions: options?.intersectionOptions,
            debounceMs: options?.debounceMs ?? 16
        });
        // MES 2.1: Set up change callback (Predictive Rendering Integration)
        domState.setOnChange((snapshot) => {
            const startTime = performance.now();
            // Build state change object for hint matching
            // Format matches what HintQueue expects
            const stateChanges = {
                [stateKey]: {
                    isIntersecting: snapshot.isIntersecting,
                    intersectionRatio: snapshot.intersectionRatio,
                    childrenCount: snapshot.childrenCount,
                    grandChildrenCount: snapshot.grandChildrenCount,
                    attributes: snapshot.attributes,
                    classList: snapshot.classList,
                    exists: snapshot.exists,
                    count: snapshot.count
                }
            };
            // MES 2.1.1: Check HintQueue for predicted patches
            const hint = context.hintQueue.matchHint(context.componentId, stateChanges);
            if (hint) {
                // 🟢 CACHE HIT! Apply predicted patches instantly
                const latency = performance.now() - startTime;
                console.log(`[minimact-punch] 🟢 DOM CACHE HIT! Hint '${hint.hintId}' matched - ` +
                    `applying ${hint.patches.length} patches in ${latency.toFixed(2)}ms`);
                // Apply patches to DOM
                context.domPatcher.applyPatches(context.element, hint.patches);
                // MES 2.1.2: Notify playground of cache hit
                if (context.playgroundBridge) {
                    context.playgroundBridge.cacheHit({
                        componentId: context.componentId,
                        hintId: hint.hintId,
                        latency,
                        confidence: hint.confidence,
                        patchCount: hint.patches.length
                    });
                }
            }
            else {
                // 🔴 CACHE MISS - No prediction available
                const latency = performance.now() - startTime;
                console.log(`[minimact-punch] 🔴 DOM CACHE MISS - No prediction for DOM change:`, stateChanges);
                // MES 2.1.2: Notify playground of cache miss
                if (context.playgroundBridge) {
                    context.playgroundBridge.cacheMiss({
                        componentId: context.componentId,
                        methodName: `domChange(${stateKey})`,
                        latency,
                        patchCount: 0
                    });
                }
            }
            // Sync DOM state to server to prevent stale data
            context.signalR.updateDomElementState(context.componentId, stateKey, {
                isIntersecting: snapshot.isIntersecting,
                intersectionRatio: snapshot.intersectionRatio,
                childrenCount: snapshot.childrenCount,
                grandChildrenCount: snapshot.grandChildrenCount,
                attributes: snapshot.attributes,
                classList: snapshot.classList,
                exists: snapshot.exists,
                count: snapshot.count
            }).catch(err => {
                console.error('[minimact-punch] Failed to sync DOM state to server:', err);
            });
        });
        // Store in context
        context.domElementStates.set(stateKey, domState);
        // If selector provided, attach after render
        if (selector) {
            queueMicrotask(() => {
                const elements = Array.from(context.element.querySelectorAll(selector));
                if (elements.length > 0) {
                    domState.attachElements(elements);
                }
            });
        }
    }
    return context.domElementStates.get(stateKey);
}
// ============================================================
// CLEANUP (MES 1.2.1)
// ============================================================
/**
 * Cleanup all DOM element states for a component
 *
 * Called when component unmounts to prevent memory leaks.
 *
 * **MES Compliance:**
 * - ✅ Cleanup implementation (MES 1.2.1)
 * - ✅ Memory leak prevention (MES 1.2.2)
 *
 * @param context - Component context
 *
 * @example
 * ```typescript
 * // Called automatically by Minimact on unmount
 * cleanupDomElementStates(context);
 * ```
 */
function cleanupDomElementStates(context) {
    if (!context.domElementStates)
        return;
    // Disconnect all observers and clear resources
    for (const domState of context.domElementStates.values()) {
        domState.destroy();
    }
    context.domElementStates.clear();
}

/**
 * Minimact Punch 🌵 + 🍹
 *
 * DOM observation and reactivity addon for Minimact.
 * Makes the DOM itself a first-class reactive data source.
 *
 * **Dual-Mode Package:**
 * - **Standalone Mode**: Use `DomElementState` class directly (no Minimact required)
 * - **Integrated Mode**: Use `useDomElementState` hook (requires Minimact)
 *
 * @packageDocumentation
 */
// ============================================================
// STANDALONE MODE (No Minimact required)
// ============================================================
/**
 * Core classes - work without Minimact
 * Use these for vanilla JS/TS projects or testing
 */
// ============================================================
// VERSION & METADATA
// ============================================================
const VERSION = '0.1.0';
const MES_CERTIFICATION = 'Silver'; // Minimact Extension Standards
/**
 * Package metadata for debugging
 */
const PACKAGE_INFO = {
    name: 'minimact-punch',
    version: VERSION,
    certification: MES_CERTIFICATION,
    modes: ['standalone', 'integrated'],
    features: [
        'IntersectionObserver integration',
        'MutationObserver integration',
        'ResizeObserver integration',
        'Statistical aggregations',
        'HintQueue predictive rendering',
        'PlaygroundBridge visualization'
    ]
};

export { DomElementState, DomElementStateValues, MES_CERTIFICATION, PACKAGE_INFO, VERSION, cleanupDomElementStates, clearComponentContext, useDomElementState$1 as createDomElementState, getCurrentContext, setComponentContext, useDomElementState };
