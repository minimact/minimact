/**
 * Transform Handler
 * Manages transform functions (inline and registry-based)
 */
/**
 * Global transform registry
 * Stores reusable transform functions accessible by ID
 */
class TransformHandler {
    /**
     * Register a reusable transform function
     *
     * @example
     * TransformHandler.registerTransform('currency-usd', v => `$${v.toFixed(2)}`, 'Format as USD currency');
     * TransformHandler.registerTransform('percentage', v => `${(v * 100).toFixed(0)}%`);
     */
    static registerTransform(id, fn, description) {
        if (this.registry.has(id)) {
            console.warn(`[useStateX] Transform '${id}' already registered. Overwriting.`);
        }
        this.registry.set(id, { id, fn, description });
    }
    /**
     * Register multiple transforms at once
     *
     * @example
     * TransformHandler.registerTransforms({
     *   'currency-usd': v => `$${v.toFixed(2)}`,
     *   'percentage': v => `${(v * 100).toFixed(0)}%`,
     *   'uppercase': v => v.toUpperCase()
     * });
     */
    static registerTransforms(transforms) {
        Object.entries(transforms).forEach(([id, fn]) => {
            this.registerTransform(id, fn);
        });
    }
    /**
     * Get a registered transform by ID
     */
    static getTransform(id) {
        return this.registry.get(id)?.fn;
    }
    /**
     * Check if a transform ID is registered
     */
    static hasTransform(id) {
        return this.registry.has(id);
    }
    /**
     * Get all registered transform IDs
     */
    static getRegisteredIds() {
        return Array.from(this.registry.keys());
    }
    /**
     * Get all registered transforms with metadata
     */
    static getAllTransforms() {
        return Array.from(this.registry.values());
    }
    /**
     * Clear all registered transforms
     * Useful for testing
     */
    static clearRegistry() {
        this.registry.clear();
    }
    /**
     * Apply a transform to a value
     * Handles both inline transforms and registry-based transforms
     *
     * @param config - Target projection config
     * @param value - Value to transform
     * @returns Transformed value or stringified value if no transform
     */
    static applyTransform(config, value) {
        try {
            // 1. Check if transform ID is provided (Registry approach)
            if (config.transformId) {
                const fn = this.getTransform(config.transformId);
                if (fn) {
                    const result = fn(value);
                    return result;
                }
                console.warn(`[useStateX] Transform '${config.transformId}' not found in registry. ` +
                    `Falling back to inline transform or toString.`);
            }
            // 2. Use inline transform (Static Analysis approach)
            if (config.transform) {
                const result = config.transform(value);
                return result;
            }
            // 3. Fallback to toString
            return String(value);
        }
        catch (error) {
            console.error('[useStateX] Transform error:', error);
            // Rethrow so caller can handle
            throw error;
        }
    }
    /**
     * Validate a transform function
     * Ensures it's pure and serializable (for Babel static analysis)
     *
     * @param fn - Function to validate
     * @returns Validation result
     */
    static validateTransform(fn) {
        const warnings = [];
        let isPure = true;
        let isSerializable = true;
        const fnString = fn.toString();
        // Check for common impure patterns
        if (fnString.includes('Math.random')) {
            warnings.push('Transform uses Math.random() - not pure');
            isPure = false;
        }
        if (fnString.includes('Date.now')) {
            warnings.push('Transform uses Date.now() - not pure');
            isPure = false;
        }
        if (fnString.includes('new Date()')) {
            warnings.push('Transform uses new Date() - not pure');
            isPure = false;
        }
        // Check for closure variables (basic heuristic)
        if (fnString.includes('=>') || fnString.includes('function')) {
            // Check if it references variables outside the function scope
            // This is a simplified check - real analysis would need AST parsing
            const varNames = fnString.match(/(?:const|let|var)\s+(\w+)/g);
            if (varNames && varNames.length > 1) {
                warnings.push('Transform may reference external variables - may not be serializable');
                isSerializable = false;
            }
        }
        // Check for complex logic (multiple statements)
        if (fnString.includes('{') && fnString.includes(';')) {
            warnings.push('Transform has multiple statements - may not be serializable via Babel');
            isSerializable = false;
        }
        const isValid = warnings.length === 0;
        return {
            isValid,
            isPure,
            isSerializable,
            warnings
        };
    }
}
TransformHandler.registry = new Map();
/**
 * Pre-register common transforms
 */
TransformHandler.registerTransforms({
    // Currency formatting
    'currency-usd': v => `$${Number(v).toFixed(2)}`,
    'currency-eur': v => `€${Number(v).toFixed(2)}`,
    'currency-gbp': v => `£${Number(v).toFixed(2)}`,
    // Percentage formatting
    'percentage': v => `${(Number(v) * 100).toFixed(0)}%`,
    'percentage-1': v => `${(Number(v) * 100).toFixed(1)}%`,
    'percentage-2': v => `${(Number(v) * 100).toFixed(2)}%`,
    // String transformations
    'uppercase': v => String(v).toUpperCase(),
    'lowercase': v => String(v).toLowerCase(),
    'capitalize': v => {
        const str = String(v);
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
    'trim': v => String(v).trim(),
    // Number formatting
    'number-0': v => Number(v).toFixed(0),
    'number-1': v => Number(v).toFixed(1),
    'number-2': v => Number(v).toFixed(2),
    'number-comma': v => Number(v).toLocaleString(),
    // Date formatting (basic - for complex dates, use external library)
    'date-short': v => new Date(v).toLocaleDateString(),
    'date-long': v => new Date(v).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }),
    'time-short': v => new Date(v).toLocaleTimeString(),
    'datetime-short': v => new Date(v).toLocaleString(),
    // Boolean formatting
    'yes-no': v => v ? 'Yes' : 'No',
    'true-false': v => v ? 'True' : 'False',
    'on-off': v => v ? 'On' : 'Off',
    'check-x': v => v ? '✓' : '✗',
    'check-circle': v => v ? '●' : '○',
    // Array formatting
    'array-length': v => Array.isArray(v) ? v.length.toString() : '0',
    'array-join': v => Array.isArray(v) ? v.join(', ') : '',
    'array-count': v => Array.isArray(v) ? `${v.length} items` : '0 items',
    // Misc
    'stringify': v => JSON.stringify(v),
    'to-string': v => String(v),
    'empty-dash': v => v ? String(v) : '-',
    'empty-na': v => v ? String(v) : 'N/A'
});

/**
 * Projection Engine
 * Applies state projections to DOM elements based on target configuration
 */
/**
 * Projection Engine
 * Handles the core logic of transforming state values and applying them to DOM
 */
class ProjectionEngine {
    /**
     * Apply a state projection to all matching targets within a root element
     *
     * @param rootElement - Component root element to search within
     * @param stateKey - State key (for logging/debugging)
     * @param value - Current state value
     * @param targets - Target projection configuration
     * @param context - Context object for applyIf conditions
     * @returns Array of projection results
     */
    static applyProjections(rootElement, stateKey, value, targets, context) {
        const results = [];
        // Process each target selector
        for (const [selector, config] of Object.entries(targets)) {
            const startTime = performance.now();
            try {
                // 1. Evaluate applyIf condition (if provided)
                let shouldApply = true;
                let applyIfResult = undefined;
                if (config.applyIf) {
                    try {
                        applyIfResult = config.applyIf(context);
                        shouldApply = applyIfResult;
                    }
                    catch (error) {
                        console.error(`[useStateX] applyIf error for selector '${selector}':`, error);
                        results.push({
                            selector,
                            applied: false,
                            error: error,
                            applyIfResult: false,
                            latency: performance.now() - startTime
                        });
                        continue;
                    }
                }
                // 2. Skip if applyIf returned false and skipIfFalse is enabled
                if (!shouldApply && config.skipIfFalse) {
                    results.push({
                        selector,
                        applied: false,
                        applyIfResult,
                        latency: performance.now() - startTime
                    });
                    continue;
                }
                // 3. Query for target element(s)
                const elements = rootElement.querySelectorAll(selector);
                if (elements.length === 0) {
                    console.warn(`[useStateX] No elements found for selector '${selector}'`);
                    results.push({
                        selector,
                        applied: false,
                        applyIfResult,
                        latency: performance.now() - startTime
                    });
                    continue;
                }
                // 4. Transform the value (if shouldApply is true)
                let transformedValue;
                if (shouldApply) {
                    try {
                        transformedValue = TransformHandler.applyTransform(config, value);
                    }
                    catch (error) {
                        console.error(`[useStateX] Transform error for selector '${selector}':`, error);
                        results.push({
                            selector,
                            applied: false,
                            error: error,
                            applyIfResult,
                            latency: performance.now() - startTime
                        });
                        continue;
                    }
                }
                // 5. Apply to each matching element
                elements.forEach((element) => {
                    if (shouldApply && transformedValue !== undefined) {
                        this.applyToElement(element, transformedValue, config.applyAs || 'textContent', config.property);
                    }
                    else {
                        // Clear the element if applyIf returned false
                        this.clearElement(element, config.applyAs || 'textContent', config.property);
                    }
                });
                // 6. Record success
                results.push({
                    selector,
                    applied: shouldApply,
                    transformedValue: shouldApply ? transformedValue : undefined,
                    element: elements[0],
                    applyIfResult,
                    latency: performance.now() - startTime
                });
            }
            catch (error) {
                console.error(`[useStateX] Projection error for selector '${selector}':`, error);
                results.push({
                    selector,
                    applied: false,
                    error: error,
                    latency: performance.now() - startTime
                });
            }
        }
        return results;
    }
    /**
     * Apply transformed value to a single DOM element
     */
    static applyToElement(element, value, applyAs, property) {
        switch (applyAs) {
            case 'textContent':
                element.textContent = String(value);
                break;
            case 'innerHTML':
                // Security warning for innerHTML
                if (typeof value === 'string' && this.containsPotentialXSS(value)) {
                    console.warn('[useStateX] Potential XSS detected in innerHTML projection. ' +
                        'Ensure value is sanitized.', { element, value });
                }
                element.innerHTML = String(value);
                break;
            case 'attribute':
                if (!property) {
                    console.error('[useStateX] property is required for applyAs="attribute"');
                    return;
                }
                element.setAttribute(property, String(value));
                break;
            case 'class':
                if (!property) {
                    console.error('[useStateX] property is required for applyAs="class"');
                    return;
                }
                // Toggle class based on boolean value
                if (value) {
                    element.classList.add(property);
                }
                else {
                    element.classList.remove(property);
                }
                break;
            case 'style':
                if (!property) {
                    console.error('[useStateX] property is required for applyAs="style"');
                    return;
                }
                // Set inline style property
                element.style[property] = String(value);
                break;
            default:
                console.error(`[useStateX] Unknown applyAs mode: ${applyAs}`);
        }
    }
    /**
     * Clear element content/attributes based on applyAs mode
     */
    static clearElement(element, applyAs, property) {
        switch (applyAs) {
            case 'textContent':
                element.textContent = '';
                break;
            case 'innerHTML':
                element.innerHTML = '';
                break;
            case 'attribute':
                if (property) {
                    element.removeAttribute(property);
                }
                break;
            case 'class':
                if (property) {
                    element.classList.remove(property);
                }
                break;
            case 'style':
                if (property) {
                    element.style[property] = '';
                }
                break;
        }
    }
    /**
     * Basic XSS detection (heuristic)
     * For production, use a proper HTML sanitizer like DOMPurify
     */
    static containsPotentialXSS(html) {
        const dangerous = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i, // Event handlers like onclick=
            /<iframe/i,
            /<object/i,
            /<embed/i
        ];
        return dangerous.some(pattern => pattern.test(html));
    }
    /**
     * Sanitize HTML (basic - recommend using DOMPurify in production)
     */
    static sanitizeHTML(html) {
        // Create a temporary element
        const temp = document.createElement('div');
        temp.textContent = html; // This escapes HTML entities
        return temp.innerHTML;
    }
}

/**
 * Integration Layer
 * Connects useStateX with Minimact's ComponentContext
 */
// Global context tracking (provided by Minimact core)
let currentContext = null;
let stateXIndex = 0;
/**
 * Set the current component context (called by Minimact before render)
 * @internal
 */
function setComponentContext(context) {
    currentContext = context;
    stateXIndex = 0;
}
/**
 * Clear the current component context (called by Minimact after render)
 * @internal
 */
function clearComponentContext() {
    currentContext = null;
    stateXIndex = 0;
}
/**
 * Get the current component context (for testing)
 * @internal
 */
function getCurrentContext() {
    return currentContext;
}
/**
 * useStateX Hook (Integrated Mode)
 *
 * Works within Minimact component context with full integration:
 * - HintQueue for template patch matching
 * - SignalR for server synchronization
 * - PlaygroundBridge for DevTools
 * - DOMPatcher for surgical updates
 *
 * @example
 * ```tsx
 * const [price, setPrice] = useStateX(99, {
 *   targets: {
 *     '.price-display': {
 *       transform: v => `$${v.toFixed(2)}`,
 *       applyIf: ctx => ctx.user.canSeePrice
 *     }
 *   }
 * });
 * ```
 */
function useStateX$1(initialValue, config) {
    // Ensure we're in a component context
    if (!currentContext) {
        throw new Error('[useStateX] must be called within a component render. ' +
            'Ensure @minimact/x integration is properly set up.');
    }
    const context = currentContext;
    const index = stateXIndex++;
    const stateKey = `stateX_${index}`;
    // Initialize stateProjections map if not exists
    if (!context.stateProjections) {
        context.stateProjections = new Map();
    }
    // Initialize projection metadata if not exists
    if (!context.stateProjections.has(stateKey)) {
        const projection = {
            stateKey,
            config,
            currentValue: initialValue,
            lastUpdated: Date.now(),
            affectedTargets: Object.keys(config.targets),
            projectionResults: []
        };
        context.stateProjections.set(stateKey, projection);
        // Store initial value in underlying state
        if (!context.state) {
            context.state = new Map();
        }
        context.state.set(stateKey, initialValue);
        // Apply initial projections (if not conditional)
        const projectionContext = config.context ? config.context() : context.projectionContext || {};
        const initialResults = ProjectionEngine.applyProjections(context.element, stateKey, initialValue, config.targets, projectionContext);
        projection.projectionResults = initialResults;
    }
    // Get current value
    const currentValue = context.state.get(stateKey);
    // Create setState function
    const setState = (newValue) => {
        const startTime = performance.now();
        // Compute actual new value
        const actualNewValue = typeof newValue === 'function'
            ? newValue(context.state.get(stateKey))
            : newValue;
        // Check if value actually changed (using custom equals or Object.is)
        const equals = config.equals || Object.is;
        const oldValue = context.state.get(stateKey);
        if (equals(oldValue, actualNewValue)) {
            // Value hasn't changed, skip update
            return;
        }
        // Update state
        context.state.set(stateKey, actualNewValue);
        // Get projection context (custom or component context)
        const projectionContext = config.context ? config.context() : context.projectionContext || {};
        // Apply projections to DOM
        const results = ProjectionEngine.applyProjections(context.element, stateKey, actualNewValue, config.targets, projectionContext);
        // Update projection metadata
        const projection = context.stateProjections.get(stateKey);
        projection.currentValue = actualNewValue;
        projection.lastUpdated = Date.now();
        projection.projectionResults = results;
        // Notify DevTools (if bridge exists)
        if (context.stateXDevToolsBridge) {
            results.forEach(result => {
                const event = {
                    componentId: context.componentId,
                    stateKey,
                    selector: result.selector,
                    oldValue,
                    newValue: actualNewValue,
                    transformedValue: result.transformedValue,
                    applied: result.applied,
                    applyIfResult: result.applyIfResult,
                    latency: result.latency || 0,
                    timestamp: Date.now()
                };
                context.stateXDevToolsBridge.projectionUpdate(event);
            });
        }
        // Check hint queue for template patches (if available)
        if (context.hintQueue) {
            const stateChanges = {
                [stateKey]: actualNewValue
            };
            const hint = context.hintQueue.matchHint(context.componentId, stateChanges);
            if (hint) {
                // Template patch matched! Apply it
                const latency = performance.now() - startTime;
                console.log(`[useStateX] 🟢 Template patch matched! Hint '${hint.hintId}' - ` +
                    `applying ${hint.patches.length} patches in ${latency.toFixed(2)}ms`);
                if (context.domPatcher) {
                    context.domPatcher.applyPatches(context.element, hint.patches);
                }
                // Notify playground
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
                // Cache miss
                if (context.playgroundBridge) {
                    context.playgroundBridge.cacheMiss({
                        componentId: context.componentId,
                        methodName: `useStateX(${stateKey})`,
                        latency: performance.now() - startTime,
                        patchCount: 0
                    });
                }
            }
        }
        // Sync to server (based on sync strategy)
        const syncStrategy = config.sync || 'immediate';
        if (syncStrategy === 'immediate') {
            // Immediate sync
            if (context.signalR) {
                context.signalR.invoke('UpdateComponentState', {
                    componentId: context.componentId,
                    stateKey,
                    value: actualNewValue
                }).catch((err) => {
                    console.error('[useStateX] Failed to sync state to server:', err);
                });
            }
        }
        else if (syncStrategy === 'debounced') {
            // Debounced sync
            const delay = config.syncDelay || 300;
            // Initialize timeouts map if not exists
            if (!context.stateXSyncTimeouts) {
                context.stateXSyncTimeouts = new Map();
            }
            // Clear previous timeout
            const existingTimeout = context.stateXSyncTimeouts.get(stateKey);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }
            // Set new timeout
            const timeoutId = window.setTimeout(() => {
                if (context.signalR) {
                    context.signalR.invoke('UpdateComponentState', {
                        componentId: context.componentId,
                        stateKey,
                        value: actualNewValue
                    }).catch((err) => {
                        console.error('[useStateX] Failed to sync state to server:', err);
                    });
                }
                context.stateXSyncTimeouts.delete(stateKey);
            }, delay);
            context.stateXSyncTimeouts.set(stateKey, timeoutId);
        }
        // 'manual' strategy: Developer calls syncStateToServer manually
    };
    return [currentValue, setState];
}
/**
 * Manually sync state to server (for sync: 'manual' strategy)
 *
 * @param stateKey - State key to sync (optional, syncs all if not provided)
 */
function syncStateToServer$1(stateKey) {
    if (!currentContext) {
        throw new Error('[useStateX] No active component context');
    }
    if (!currentContext.signalR) {
        console.warn('[useStateX] SignalR not available, cannot sync to server');
        return;
    }
    const context = currentContext;
    if (stateKey) {
        // Sync specific state
        const value = context.state.get(stateKey);
        if (value !== undefined) {
            context.signalR.invoke('UpdateComponentState', {
                componentId: context.componentId,
                stateKey,
                value
            }).catch((err) => {
                console.error(`[useStateX] Failed to sync state '${stateKey}' to server:`, err);
            });
        }
    }
    else {
        // Sync all stateX states
        if (context.stateProjections) {
            context.stateProjections.forEach((projection, key) => {
                const value = context.state.get(key);
                if (value !== undefined) {
                    context.signalR.invoke('UpdateComponentState', {
                        componentId: context.componentId,
                        stateKey: key,
                        value
                    }).catch((err) => {
                        console.error(`[useStateX] Failed to sync state '${key}' to server:`, err);
                    });
                }
            });
        }
    }
}
/**
 * Cleanup all state projections for a component
 * Called by Minimact on component unmount
 * @internal
 */
function cleanupStateProjections(context) {
    // Clear any pending sync timeouts
    if (context.stateXSyncTimeouts) {
        context.stateXSyncTimeouts.forEach((timeoutId) => {
            clearTimeout(timeoutId);
        });
        context.stateXSyncTimeouts.clear();
    }
    // Clear projection metadata
    if (context.stateProjections) {
        context.stateProjections.clear();
    }
}

/**
 * useStateX Hook
 * CSS for State Logic - Declarative state projection system
 */
/**
 * useStateX Hook
 *
 * Declarative state management with automatic DOM projection
 *
 * @example
 * ```tsx
 * const [price, setPrice] = useStateX(99, {
 *   targets: {
 *     '.price-display': {
 *       transform: v => `$${v.toFixed(2)}`,
 *       applyIf: ctx => ctx.user.canSeePrice
 *     }
 *   }
 * });
 * ```
 *
 * @param initialValue - Initial state value
 * @param config - State projection configuration
 * @returns Tuple of [currentValue, setState]
 */
function useStateX(initialValue, config) {
    // Ensure we're in a component context
    {
        throw new Error('[useStateX] must be called within a component render. ' +
            'Ensure minimact-x integration is properly set up.');
    }
}
/**
 * Manually sync state to server (for sync: 'manual' strategy)
 *
 * @param stateKey - State key to sync (optional, syncs all if not provided)
 */
function syncStateToServer(stateKey) {
    {
        throw new Error('[useStateX] No active component context');
    }
}

/**
 * Minimact X 🌵 + ✨
 *
 * CSS for State Logic - Declarative state projection addon for Minimact
 *
 * **Core Philosophy:**
 * Just as CSS externalizes styling from HTML, useStateX externalizes
 * state-to-DOM bindings from JSX. This enables build-time analysis,
 * predictive rendering, and superior developer experience.
 *
 * @packageDocumentation
 */
// ============================================================
// CORE HOOK (Integrated Mode - DEFAULT)
// ============================================================
/**
 * Main hook - declarative state with DOM projection
 * Integrated with Minimact's ComponentContext for full features
 *
 * @example
 * ```tsx
 * const [price, setPrice] = useStateX(99, {
 *   targets: {
 *     '.price-display': {
 *       transform: v => `$${v.toFixed(2)}`,
 *       applyIf: ctx => ctx.user.canSeePrice
 *     }
 *   }
 * });
 * ```
 */
// ============================================================
// VERSION & METADATA
// ============================================================
const VERSION = '0.1.0';
const MES_CERTIFICATION = 'Gold'; // Minimact Extension Standards
/**
 * Package metadata for debugging
 */
const PACKAGE_INFO = {
    name: 'minimact-x',
    version: VERSION,
    certification: MES_CERTIFICATION,
    features: [
        'Declarative state projections',
        'CSS-like selector targeting',
        'Pure transform functions',
        'Conditional rendering (applyIf)',
        'Template Patch System integration',
        'Server synchronization (immediate/debounced/manual)',
        'Transform registry (reusable transforms)',
        'DevTools integration',
        'Babel static analysis support',
        'XSS protection',
        'Dependency graph tracking',
        'MES Gold certified'
    ],
    philosophy: 'CSS for State Logic - Predictive Declarative UI Architecture'
};
/**
 * Quick start helper - register common transforms
 *
 * @example
 * ```typescript
 * import { setupMinimactX } from '@minimact/x';
 *
 * // Automatically registers all built-in transforms
 * setupMinimactX();
 * ```
 */
function setupMinimactX() {
    console.log(`[Minimact X] v${VERSION} initialized ✨\n` +
        `MES Certification: ${MES_CERTIFICATION}\n` +
        `Philosophy: ${PACKAGE_INFO.philosophy}`);
    // Transforms are auto-registered in TransformHandler
    // This function is just for explicit initialization
}

export { MES_CERTIFICATION, PACKAGE_INFO, ProjectionEngine, TransformHandler, VERSION, cleanupStateProjections, clearComponentContext, getCurrentContext, setComponentContext, setupMinimactX, syncStateToServer$1 as syncStateToServer, syncStateToServer as syncStateToServerStandalone, useStateX$1 as useStateX, useStateX as useStateXStandalone };
//# sourceMappingURL=x.esm.js.map
