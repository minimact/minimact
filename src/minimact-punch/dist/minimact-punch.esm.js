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
 * Pseudo-State Tracker
 *
 * Makes CSS pseudo-selectors (:hover, :active, :focus, :disabled) reactive JavaScript values.
 * Eliminates manual event handler tracking for pseudo-states.
 *
 * Features:
 * - Hover state (mouseenter/mouseleave)
 * - Active state (mousedown/mouseup)
 * - Focus state (focus/blur)
 * - Disabled state (attribute-based)
 * - Checked state (attribute-based)
 * - Invalid state (attribute-based)
 */
class PseudoStateTracker {
    constructor(element, onChange) {
        this.states = {
            hover: false,
            active: false,
            focus: false,
            disabled: false,
            checked: false,
            invalid: false,
        };
        this.listeners = [];
        this.element = element;
        this.onChange = onChange;
        this.setupListeners();
    }
    /**
     * Setup all event listeners and observers
     */
    setupListeners() {
        // Hover state
        this.addListener('mouseenter', () => {
            this.states.hover = true;
            this.notifyChange();
        });
        this.addListener('mouseleave', () => {
            this.states.hover = false;
            this.notifyChange();
        });
        // Active state
        this.addListener('mousedown', () => {
            this.states.active = true;
            this.notifyChange();
        });
        this.addListener('mouseup', () => {
            this.states.active = false;
            this.notifyChange();
        });
        // Also clear active on mouseleave (in case mouseup happens outside)
        this.addListener('mouseleave', () => {
            if (this.states.active) {
                this.states.active = false;
                this.notifyChange();
            }
        });
        // Focus state
        this.addListener('focus', () => {
            this.states.focus = true;
            this.notifyChange();
        });
        this.addListener('blur', () => {
            this.states.focus = false;
            this.notifyChange();
        });
        // Attribute-based states (use MutationObserver)
        this.mutationObserver = new MutationObserver(() => {
            this.updateAttributeStates();
        });
        this.mutationObserver.observe(this.element, {
            attributes: true,
            attributeFilter: ['disabled', 'aria-disabled', 'aria-checked', 'aria-invalid']
        });
        // Initialize attribute states
        this.updateAttributeStates();
    }
    /**
     * Add event listener and track for cleanup
     */
    addListener(event, handler, options) {
        this.element.addEventListener(event, handler, options);
        this.listeners.push({ event, handler, options });
    }
    /**
     * Update attribute-based states
     */
    updateAttributeStates() {
        const prevDisabled = this.states.disabled;
        const prevChecked = this.states.checked;
        const prevInvalid = this.states.invalid;
        // Disabled state
        this.states.disabled =
            this.element.hasAttribute('disabled') ||
                this.element.getAttribute('aria-disabled') === 'true';
        // Checked state (for inputs)
        if (this.element instanceof HTMLInputElement) {
            this.states.checked = this.element.checked;
        }
        else {
            this.states.checked = this.element.getAttribute('aria-checked') === 'true';
        }
        // Invalid state (for inputs)
        if (this.element instanceof HTMLInputElement || this.element instanceof HTMLTextAreaElement) {
            this.states.invalid = !this.element.validity.valid;
        }
        else {
            this.states.invalid = this.element.getAttribute('aria-invalid') === 'true';
        }
        // Only notify if something actually changed
        if (prevDisabled !== this.states.disabled ||
            prevChecked !== this.states.checked ||
            prevInvalid !== this.states.invalid) {
            this.notifyChange();
        }
    }
    /**
     * Notify change callback
     */
    notifyChange() {
        if (this.onChange) {
            this.onChange();
        }
    }
    // Getters for pseudo-states
    get hover() {
        return this.states.hover;
    }
    get active() {
        return this.states.active;
    }
    get focus() {
        return this.states.focus;
    }
    get disabled() {
        return this.states.disabled;
    }
    get checked() {
        return this.states.checked;
    }
    get invalid() {
        return this.states.invalid;
    }
    /**
     * Get all states as object
     */
    getAll() {
        return { ...this.states };
    }
    /**
     * Cleanup - remove all listeners and observers
     */
    destroy() {
        // Remove all event listeners
        for (const { event, handler, options } of this.listeners) {
            this.element.removeEventListener(event, handler, options);
        }
        this.listeners = [];
        // Disconnect mutation observer
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = undefined;
        }
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
            trackHover: options.trackHover ?? true,
            trackFocus: options.trackFocus ?? false,
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
     * Get pseudo-state tracker (lazy initialization)
     *
     * @example
     * ```typescript
     * const box = new DomElementState(element);
     * console.log(box.state.hover); // true/false
     * console.log(box.state.focus); // true/false
     * ```
     */
    get state() {
        if (!this.pseudoStateTracker && this._element) {
            this.pseudoStateTracker = new PseudoStateTracker(this._element, () => {
                this.notifyChange();
            });
        }
        if (!this.pseudoStateTracker) {
            throw new Error('[minimact-punch] Cannot access state - element not attached');
        }
        return this.pseudoStateTracker;
    }
    /**
     * Destroy the state object
     */
    destroy() {
        this.cleanup();
        this.pseudoStateTracker?.destroy();
        this.pseudoStateTracker = undefined;
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
    // Setup confidence worker prediction callback (only once)
    if (context.confidenceWorker && !context.confidenceWorker.isReady()) {
        context.confidenceWorker.setOnPredictionRequest((request) => {
            handleWorkerPrediction(context, request);
        });
    }
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
/**
 * Handle prediction request from confidence worker
 * Worker says: "I predict hover/intersection/focus will occur in X ms"
 *
 * @internal
 */
function handleWorkerPrediction(context, request) {
    console.log(`[minimact-punch] 🔮 Worker prediction: ${request.elementId} ` +
        `(${(request.confidence * 100).toFixed(0)}% confident, ${request.leadTime.toFixed(0)}ms lead time)`);
    // Build predicted state object
    // The stateKey needs to match what useDomElementState uses
    const stateKey = request.elementId.split('_').pop(); // Extract "domElementState_0" from "counter-1_domElementState_0"
    const predictedState = {
        [stateKey]: request.observation
    };
    // Request prediction from server via SignalR
    // Server will render with predicted state and send patches via QueueHint
    context.signalR
        .invoke('RequestPrediction', context.componentId, predictedState)
        .then(() => {
        console.log(`[minimact-punch] ✅ Requested prediction from server for ${request.elementId}`);
    })
        .catch((err) => {
        console.error(`[minimact-punch] ❌ Failed to request prediction:`, err);
    });
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
        // Wrap attachElement to register with confidence worker
        const originalAttachElement = domState.attachElement.bind(domState);
        domState.attachElement = (element) => {
            originalAttachElement(element);
            // Register with confidence worker (if available)
            if (context.confidenceWorker?.isReady()) {
                const elementId = `${context.componentId}_${stateKey}`;
                context.confidenceWorker.registerElement(context.componentId, elementId, element, {
                    hover: options?.trackHover ?? true,
                    intersection: options?.trackIntersection ?? true,
                    focus: options?.trackFocus ?? false,
                });
            }
        };
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
 * Types for the Confidence Engine Web Worker
 *
 * The confidence engine runs in a Web Worker to analyze user behavior
 * and predict future DOM observations before they occur.
 */
/**
 * Circular buffer for efficient event history storage
 */
const DEFAULT_CONFIG = {
    minConfidence: 0.7,
    hoverHighConfidence: 0.85,
    intersectionHighConfidence: 0.90,
    focusHighConfidence: 0.95,
    hoverLeadTimeMin: 50,
    hoverLeadTimeMax: 300,
    intersectionLeadTimeMax: 300,
    maxTrajectoryAngle: 30,
    minMouseVelocity: 0.1,
    maxPredictionsPerElement: 2,
    predictionWindowMs: 200,
    mouseHistorySize: 20,
    scrollHistorySize: 10,
    debugLogging: false,
};

/**
 * Confidence Worker Manager
 *
 * Main thread manager for the Confidence Engine Web Worker.
 * Handles worker lifecycle, forwards browser events, and receives prediction requests.
 *
 * This is an OPTIONAL extension to minimact-punch - if the worker fails to load,
 * useDomElementState will still work (just without predictive hints).
 */
/**
 * Manages the Confidence Engine Web Worker
 */
class ConfidenceWorkerManager {
    constructor(config = {}) {
        this.worker = null;
        this.workerReady = false;
        this.eventListeners = new Map();
        this.observedElements = new Set(); // Track registered elements
        this.config = {
            workerPath: config.workerPath || '/workers/confidence-engine.worker.js',
            config: { ...DEFAULT_CONFIG, ...config.config },
            debugLogging: config.debugLogging || false,
        };
        this.onPredictionRequest = config.onPredictionRequest;
    }
    /**
     * Initialize and start the worker
     */
    async start() {
        try {
            // Check for Worker support
            if (typeof Worker === 'undefined') {
                this.log('Web Workers not supported in this browser');
                return false;
            }
            // Create worker
            this.worker = new Worker(this.config.workerPath, { type: 'module' });
            // Setup message handler
            this.worker.onmessage = (event) => {
                this.handleWorkerMessage(event.data);
            };
            // Setup error handler
            this.worker.onerror = (error) => {
                console.error('[ConfidenceWorker] Worker error:', error);
                this.workerReady = false;
            };
            // Attach browser event listeners
            this.attachEventListeners();
            this.workerReady = true;
            this.log('Worker started successfully');
            return true;
        }
        catch (error) {
            console.error('[ConfidenceWorker] Failed to start worker:', error);
            return false;
        }
    }
    /**
     * Stop the worker and cleanup
     */
    stop() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.workerReady = false;
        }
        this.detachEventListeners();
        this.observedElements.clear();
        this.log('Worker stopped');
    }
    /**
     * Register an element for observation
     */
    registerElement(componentId, elementId, element, observables) {
        if (!this.workerReady || !this.worker) {
            return;
        }
        // Get element bounds
        const bounds = this.getElementBounds(element);
        // Send to worker
        this.postMessage({
            type: 'registerElement',
            componentId,
            elementId,
            bounds,
            observables,
        });
        this.observedElements.add(elementId);
        this.log('Registered element', { elementId, observables });
    }
    /**
     * Update element bounds (when element moves/resizes)
     */
    updateBounds(elementId, element) {
        if (!this.workerReady || !this.worker || !this.observedElements.has(elementId)) {
            return;
        }
        const bounds = this.getElementBounds(element);
        this.postMessage({
            type: 'updateBounds',
            elementId,
            bounds,
        });
    }
    /**
     * Unregister an element
     */
    unregisterElement(elementId) {
        if (!this.workerReady || !this.worker) {
            return;
        }
        this.postMessage({
            type: 'unregisterElement',
            elementId,
        });
        this.observedElements.delete(elementId);
        this.log('Unregistered element', { elementId });
    }
    /**
     * Set prediction request callback
     */
    setOnPredictionRequest(callback) {
        this.onPredictionRequest = callback;
    }
    /**
     * Check if worker is ready
     */
    isReady() {
        return this.workerReady;
    }
    /**
     * Handle messages from worker
     */
    handleWorkerMessage(message) {
        switch (message.type) {
            case 'requestPrediction':
                this.handlePredictionRequest(message);
                break;
            case 'debug':
                if (this.config.debugLogging) {
                    console.log(message.message, message.data || '');
                }
                break;
            default:
                console.warn('[ConfidenceWorker] Unknown message from worker:', message);
        }
    }
    /**
     * Handle prediction request from worker
     */
    handlePredictionRequest(request) {
        this.log('Prediction request', {
            elementId: request.elementId,
            confidence: `${(request.confidence * 100).toFixed(0)}%`,
            leadTime: `${request.leadTime.toFixed(0)}ms`,
            reason: request.reason,
        });
        if (this.onPredictionRequest) {
            this.onPredictionRequest({
                componentId: request.componentId,
                elementId: request.elementId,
                observation: request.observation,
                confidence: request.confidence,
                leadTime: request.leadTime,
            });
        }
    }
    /**
     * Attach browser event listeners
     */
    attachEventListeners() {
        // Mouse move (throttled)
        let lastMouseMove = 0;
        const mouseMoveHandler = (event) => {
            const mouseEvent = event;
            const now = performance.now();
            if (now - lastMouseMove < 16)
                return; // ~60fps throttle
            lastMouseMove = now;
            this.postMessage({
                type: 'mousemove',
                x: mouseEvent.clientX,
                y: mouseEvent.clientY,
                timestamp: now,
            });
        };
        window.addEventListener('mousemove', mouseMoveHandler, { passive: true });
        this.eventListeners.set('mousemove', mouseMoveHandler);
        // Scroll (throttled)
        let lastScroll = 0;
        const scrollHandler = () => {
            const now = performance.now();
            if (now - lastScroll < 16)
                return; // ~60fps throttle
            lastScroll = now;
            this.postMessage({
                type: 'scroll',
                scrollX: window.scrollX,
                scrollY: window.scrollY,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                timestamp: now,
            });
        };
        window.addEventListener('scroll', scrollHandler, { passive: true });
        this.eventListeners.set('scroll', scrollHandler);
        // Focus
        const focusHandler = (event) => {
            const target = event.target;
            if (!target.id)
                return; // Only track elements with IDs
            this.postMessage({
                type: 'focus',
                elementId: target.id,
                timestamp: performance.now(),
            });
        };
        window.addEventListener('focus', focusHandler, { capture: true, passive: true });
        this.eventListeners.set('focus', focusHandler);
        // Keydown (Tab key)
        const keydownHandler = (event) => {
            const keyEvent = event;
            if (keyEvent.key === 'Tab') {
                this.postMessage({
                    type: 'keydown',
                    key: keyEvent.key,
                    timestamp: performance.now(),
                });
            }
        };
        window.addEventListener('keydown', keydownHandler, { passive: true });
        this.eventListeners.set('keydown', keydownHandler);
        this.log('Event listeners attached');
    }
    /**
     * Detach browser event listeners
     */
    detachEventListeners() {
        for (const [eventType, handler] of this.eventListeners) {
            if (eventType === 'focus') {
                window.removeEventListener('focus', handler, { capture: true });
            }
            else {
                window.removeEventListener(eventType, handler);
            }
        }
        this.eventListeners.clear();
        this.log('Event listeners detached');
    }
    /**
     * Post message to worker
     */
    postMessage(message) {
        if (!this.worker || !this.workerReady) {
            return;
        }
        try {
            this.worker.postMessage(message);
        }
        catch (error) {
            console.error('[ConfidenceWorker] Failed to post message:', error);
        }
    }
    /**
     * Get element bounds relative to viewport
     */
    getElementBounds(element) {
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom + window.scrollY,
            right: rect.right + window.scrollX,
        };
    }
    /**
     * Debug logging
     */
    log(message, data) {
        if (this.config.debugLogging) {
            console.log(`[ConfidenceWorkerManager] ${message}`, data || '');
        }
    }
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
        'PlaygroundBridge visualization',
        'Confidence Worker (intent-based predictions)',
        'Pseudo-state reactivity (hover, focus, active, disabled)'
    ]
};

export { ConfidenceWorkerManager, DomElementState, DomElementStateValues, MES_CERTIFICATION, PACKAGE_INFO, PseudoStateTracker, VERSION, cleanupDomElementStates, clearComponentContext, useDomElementState$1 as createDomElementState, getCurrentContext, setComponentContext, useDomElementState };
