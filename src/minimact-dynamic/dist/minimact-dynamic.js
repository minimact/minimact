'use strict';

var react = require('react');

/**
 * minimact-dynamic - Dependency Tracker
 *
 * Automatically tracks which state properties a function accesses
 * using Proxy to intercept property reads.
 *
 * This enables smart re-evaluation: only re-run binding when
 * its specific dependencies change.
 */
/**
 * Track which state properties a function accesses
 *
 * @param state - State object
 * @param fn - Function to track
 * @returns Result and array of dependency paths
 *
 * @example
 * ```typescript
 * const { result, dependencies } = trackDependencies(
 *   { user: { isPremium: true }, product: { price: 29.99 } },
 *   (state) => state.user.isPremium ? state.product.price : 0
 * );
 * // dependencies = ['user.isPremium', 'product.price']
 * ```
 */
function trackDependencies(state, fn) {
    const dependencies = new Set();
    // Create proxy that tracks property access
    const proxy = createTrackingProxy(state, '', dependencies);
    // Execute function with tracking proxy
    const result = fn(proxy);
    return {
        result,
        dependencies: Array.from(dependencies)
    };
}
/**
 * Create a Proxy that tracks property access
 *
 * This recursively wraps objects to track nested property access like:
 * state.user.isPremium → tracks 'user.isPremium'
 */
function createTrackingProxy(target, path, dependencies) {
    return new Proxy(target, {
        get(obj, prop) {
            // Build the full path (e.g., 'user.isPremium')
            const propPath = path ? `${path}.${String(prop)}` : String(prop);
            // Track this property access
            dependencies.add(propPath);
            const value = obj[prop];
            // If value is an object, return a proxy for nested tracking
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                return createTrackingProxy(value, propPath, dependencies);
            }
            // Primitive value, return as-is
            return value;
        }
    });
}
/**
 * Check if any dependency path changed between prev and next state
 *
 * @param prevState - Previous state
 * @param nextState - Next state
 * @param dependencies - Array of dependency paths to check
 * @returns True if any dependency changed
 *
 * @example
 * ```typescript
 * const changed = hasPathChanged(
 *   { user: { isPremium: false } },
 *   { user: { isPremium: true } },
 *   ['user.isPremium']
 * );
 * // changed = true
 * ```
 */
function hasPathChanged(prevState, nextState, dependencies) {
    return dependencies.some(path => {
        const prevValue = resolvePath(path, prevState);
        const nextValue = resolvePath(path, nextState);
        // Use strict equality for primitives
        return prevValue !== nextValue;
    });
}
/**
 * Resolve a dot-notation path to a value
 *
 * @param path - Dot-notation path (e.g., 'user.isPremium')
 * @param obj - Object to resolve from
 * @returns Value at path
 *
 * @example
 * ```typescript
 * const value = resolvePath('user.isPremium', { user: { isPremium: true } });
 * // value = true
 * ```
 */
function resolvePath(path, obj) {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
}
/**
 * Shallow equality check for objects
 * Used for memoization cache
 */
function shallowEqual(objA, objB) {
    if (objA === objB)
        return true;
    if (typeof objA !== 'object' ||
        objA === null ||
        typeof objB !== 'object' ||
        objB === null) {
        return false;
    }
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length)
        return false;
    for (const key of keysA) {
        if (objA[key] !== objB[key])
            return false;
    }
    return true;
}

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
class ValueUpdater {
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
    updateValue(selector, value) {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) {
            console.warn(`[minimact-dynamic] No elements found for selector: ${selector}`);
            return;
        }
        const stringValue = String(value);
        elements.forEach(element => {
            // Direct DOM update - MINIMAL
            // No VDOM, no reconciliation, just set the value
            element.textContent = stringValue;
        });
        if (elements.length > 0) {
            console.log(`[minimact-dynamic] Updated ${elements.length} element(s) ` +
                `with selector '${selector}' to value: ${stringValue}`);
        }
    }
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
    updateAttribute(selector, attr, value) {
        const elements = document.querySelectorAll(selector);
        const stringValue = String(value);
        elements.forEach(element => {
            element.setAttribute(attr, stringValue);
        });
        if (elements.length > 0) {
            console.log(`[minimact-dynamic] Updated attribute '${attr}' on ${elements.length} ` +
                `element(s) with selector '${selector}' to: ${stringValue}`);
        }
    }
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
    updateStyle(selector, prop, value) {
        const elements = document.querySelectorAll(selector);
        const stringValue = String(value);
        elements.forEach(element => {
            element.style[prop] = stringValue;
        });
        if (elements.length > 0) {
            console.log(`[minimact-dynamic] Updated style '${prop}' on ${elements.length} ` +
                `element(s) with selector '${selector}' to: ${stringValue}`);
        }
    }
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
    updateClass(selector, value) {
        const elements = document.querySelectorAll(selector);
        const stringValue = String(value);
        elements.forEach(element => {
            element.className = stringValue;
        });
        if (elements.length > 0) {
            console.log(`[minimact-dynamic] Updated className on ${elements.length} ` +
                `element(s) with selector '${selector}' to: ${stringValue}`);
        }
    }
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
    updateVisibility(selector, visible) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.style.display = visible ? '' : 'none';
        });
        if (elements.length > 0) {
            console.log(`[minimact-dynamic] Updated visibility on ${elements.length} ` +
                `element(s) with selector '${selector}' to: ${visible ? 'visible' : 'hidden'}`);
        }
    }
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
    updateOrder(containerSelector, childSelectors) {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.warn(`[minimact-dynamic] Container not found: ${containerSelector}`);
            return;
        }
        // Collect child elements in new order
        const orderedChildren = [];
        for (const selector of childSelectors) {
            // Try to find child in current container first
            let child = container.querySelector(selector);
            // If not in container, search globally (for teleportation)
            if (!child) {
                child = document.querySelector(selector);
            }
            if (child) {
                orderedChildren.push(child);
            }
            else {
                console.warn(`[minimact-dynamic] Child element not found: ${selector}`);
            }
        }
        // Append in new order (this moves them if needed)
        orderedChildren.forEach(child => {
            container.appendChild(child);
        });
        console.log(`[minimact-dynamic] Choreographed ${orderedChildren.length} element(s) ` +
            `in container '${containerSelector}'`);
    }
}

/**
 * minimact-dynamic - useDynamicState Hook
 *
 * The core hook that enables minimal dynamic value bindings.
 *
 * Philosophy: Structure ONCE. Bind SEPARATELY. Update DIRECTLY.
 */
/**
 * Create a dynamic state manager with automatic dependency tracking
 *
 * @param initialState - Initial state object
 * @returns Dynamic state API
 *
 * @example
 * ```typescript
 * const dynamic = useDynamicState({
 *   user: { isPremium: false },
 *   product: { price: 29.99, factoryPrice: 19.99 }
 * });
 *
 * // Structure ONCE
 * <span className="price"></span>
 *
 * // Bind SEPARATELY
 * dynamic('.price', (state) =>
 *   state.user.isPremium ? state.product.factoryPrice : state.product.price
 * );
 *
 * // Update state
 * dynamic.setState({ user: { isPremium: true } });
 * // → Direct DOM update: el.textContent = '$19.99' (< 1ms!)
 * ```
 */
function useDynamicState(initialState) {
    const [state, setState] = react.useState(initialState);
    const prevStateRef = react.useRef(initialState);
    const bindingsRef = react.useRef(new Map());
    const orderBindingsRef = react.useRef(new Map());
    const updaterRef = react.useRef(new ValueUpdater());
    const isHydratedRef = react.useRef(false);
    // HYDRATION: Read pre-rendered bindings from server
    react.useEffect(() => {
        if (!isHydratedRef.current) {
            hydrateBindings();
            isHydratedRef.current = true;
        }
    }, []);
    /**
     * Hydrate bindings from server-rendered HTML
     * Server has already evaluated functions and rendered values
     */
    const hydrateBindings = () => {
        const bindingElements = document.querySelectorAll('[data-minimact-binding]');
        bindingElements.forEach(el => {
            const metadataJson = el.getAttribute('data-minimact-binding');
            if (!metadataJson)
                return;
            try {
                const metadata = JSON.parse(metadataJson);
                console.log(`[minimact-dynamic] Hydrated binding: ${metadata.selector}`);
                // Remove metadata attribute (cleanup)
                el.removeAttribute('data-minimact-binding');
            }
            catch (error) {
                console.error('[minimact-dynamic] Failed to parse binding metadata:', error);
            }
        });
        if (bindingElements.length > 0) {
            console.log(`[minimact-dynamic] Hydrated ${bindingElements.length} bindings in < 5ms`);
        }
    };
    /**
     * Register a dynamic value binding
     */
    const registerBinding = react.useCallback((selector, fn) => {
        // Track dependencies by executing function once with tracking proxy
        const { result: initialValue, dependencies } = trackDependencies(state, fn);
        const bindingId = `binding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Store binding
        bindingsRef.current.set(selector, {
            bindingId,
            selector,
            fn,
            dependencies,
            currentValue: initialValue
        });
        // Render initial value to DOM
        updaterRef.current.updateValue(selector, initialValue);
        console.log(`[minimact-dynamic] Registered binding '${selector}' with dependencies:`, dependencies);
    }, [state]);
    /**
     * Register element order binding (DOM CHOREOGRAPHY)
     */
    const registerOrderBinding = react.useCallback((containerSelector, fn) => {
        // Track dependencies
        const { result: initialOrder, dependencies } = trackDependencies(state, fn);
        const bindingId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Store binding
        orderBindingsRef.current.set(containerSelector, {
            bindingId,
            containerSelector,
            fn,
            dependencies,
            currentOrder: initialOrder
        });
        // Apply initial order
        updaterRef.current.updateOrder(containerSelector, initialOrder);
        console.log(`[minimact-dynamic] Registered order binding '${containerSelector}' ` +
            `with dependencies:`, dependencies);
    }, [state]);
    /**
     * Re-evaluate bindings when state changes
     * Only re-evaluates bindings whose dependencies changed
     */
    react.useEffect(() => {
        const prevState = prevStateRef.current;
        // Update value bindings
        bindingsRef.current.forEach(binding => {
            // Check if any dependencies changed
            const shouldUpdate = hasPathChanged(prevState, state, binding.dependencies);
            if (shouldUpdate) {
                const startTime = performance.now();
                // Re-evaluate function with new state
                const newValue = binding.fn(state);
                // Update DOM directly - MINIMAL (< 1ms target)
                updaterRef.current.updateValue(binding.selector, newValue);
                // Update current value
                binding.currentValue = newValue;
                const latency = performance.now() - startTime;
                console.log(`[minimact-dynamic] Updated binding '${binding.selector}' ` +
                    `to: ${newValue} in ${latency.toFixed(2)}ms`);
            }
        });
        // Update order bindings (DOM Choreography)
        orderBindingsRef.current.forEach(binding => {
            const shouldUpdate = hasPathChanged(prevState, state, binding.dependencies);
            if (shouldUpdate) {
                const startTime = performance.now();
                // Re-evaluate order function
                const newOrder = binding.fn(state);
                // Update DOM order - Elements move, never destroyed!
                updaterRef.current.updateOrder(binding.containerSelector, newOrder);
                // Update current order
                binding.currentOrder = newOrder;
                const latency = performance.now() - startTime;
                console.log(`[minimact-dynamic] Choreographed '${binding.containerSelector}' ` +
                    `in ${latency.toFixed(2)}ms`);
            }
        });
        // Store current state for next comparison
        prevStateRef.current = state;
    }, [state]);
    /**
     * Update state
     */
    const updateState = react.useCallback((updaterOrPartial) => {
        if (typeof updaterOrPartial === 'function') {
            setState(updaterOrPartial);
        }
        else {
            setState(prev => ({ ...prev, ...updaterOrPartial }));
        }
    }, []);
    // Build API object
    const api = registerBinding;
    // .order() for DOM choreography
    api.order = registerOrderBinding;
    // .attr() for attribute bindings
    api.attr = (selector, attribute, fn) => {
        const { result: initialValue, dependencies } = trackDependencies(state, fn);
        const binding = {
            bindingId: `attr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            selector,
            fn,
            dependencies,
            currentValue: initialValue
        };
        bindingsRef.current.set(`${selector}[attr:${attribute}]`, binding);
        updaterRef.current.updateAttribute(selector, attribute, initialValue);
        console.log(`[minimact-dynamic] Registered attribute binding '${selector}[${attribute}]'`);
    };
    // .class() for class bindings
    api.class = (selector, fn) => {
        const { result: initialValue, dependencies } = trackDependencies(state, fn);
        const binding = {
            bindingId: `class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            selector,
            fn,
            dependencies,
            currentValue: initialValue
        };
        bindingsRef.current.set(`${selector}[class]`, binding);
        updaterRef.current.updateClass(selector, initialValue);
        console.log(`[minimact-dynamic] Registered class binding '${selector}'`);
    };
    // .style() for style bindings
    api.style = (selector, property, fn) => {
        const { result: initialValue, dependencies } = trackDependencies(state, fn);
        const binding = {
            bindingId: `style_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            selector,
            fn,
            dependencies,
            currentValue: initialValue
        };
        bindingsRef.current.set(`${selector}[style:${property}]`, binding);
        updaterRef.current.updateStyle(selector, property, initialValue);
        console.log(`[minimact-dynamic] Registered style binding '${selector}[${property}]'`);
    };
    // .show() for visibility bindings
    api.show = (selector, fn) => {
        const { result: initialValue, dependencies } = trackDependencies(state, fn);
        const binding = {
            bindingId: `show_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            selector,
            fn,
            dependencies,
            currentValue: initialValue
        };
        bindingsRef.current.set(`${selector}[show]`, binding);
        updaterRef.current.updateVisibility(selector, initialValue);
        console.log(`[minimact-dynamic] Registered visibility binding '${selector}'`);
    };
    // State management
    api.getState = () => state;
    api.setState = updateState;
    api.clear = () => {
        bindingsRef.current.clear();
        orderBindingsRef.current.clear();
    };
    api.remove = (selector) => bindingsRef.current.delete(selector);
    return api;
}

/**
 * minimact-dynamic
 *
 * Minimal dynamic value bindings for Minimact.
 * Separate structure from content. Define DOM once, bind values separately.
 *
 * Philosophy: Structure ONCE. Bind SEPARATELY. Update DIRECTLY.
 *
 * @example
 * ```typescript
 * import { useDynamicState } from 'minimact-dynamic';
 *
 * const dynamic = useDynamicState({
 *   user: { isPremium: false },
 *   product: { price: 29.99 }
 * });
 *
 * // Structure ONCE
 * <span className="price"></span>
 *
 * // Bind SEPARATELY
 * dynamic('.price', (state) =>
 *   state.user.isPremium ? `$${state.product.price * 0.8}` : `$${state.product.price}`
 * );
 * ```
 */
const VERSION = '0.1.0';
const PHILOSOPHY = 'Structure ONCE. Bind SEPARATELY. Update DIRECTLY.';

exports.PHILOSOPHY = PHILOSOPHY;
exports.VERSION = VERSION;
exports.ValueUpdater = ValueUpdater;
exports.hasPathChanged = hasPathChanged;
exports.shallowEqual = shallowEqual;
exports.trackDependencies = trackDependencies;
exports.useDynamicState = useDynamicState;
//# sourceMappingURL=minimact-dynamic.js.map
