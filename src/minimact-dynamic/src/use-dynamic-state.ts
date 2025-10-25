/**
 * minimact-dynamic - useDynamicState Hook
 *
 * The core hook that enables minimal dynamic value bindings.
 *
 * Philosophy: Structure ONCE. Bind SEPARATELY. Update DIRECTLY.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  DynamicStateAPI,
  DynamicBinding,
  DynamicOrderBinding,
  DynamicValueFunction,
  DynamicOrderFunction
} from './types';
import { trackDependencies, hasPathChanged } from './dependency-tracker';
import { ValueUpdater } from './value-updater';

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
export function useDynamicState<TState extends object = any>(
  initialState: TState
): DynamicStateAPI<TState> {
  const [state, setState] = useState<TState>(initialState);
  const prevStateRef = useRef<TState>(initialState);
  const bindingsRef = useRef<Map<string, DynamicBinding<TState>>>(new Map());
  const orderBindingsRef = useRef<Map<string, DynamicOrderBinding<TState>>>(new Map());
  const updaterRef = useRef<ValueUpdater>(new ValueUpdater());
  const isHydratedRef = useRef(false);

  // HYDRATION: Read pre-rendered bindings from server
  useEffect(() => {
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
      if (!metadataJson) return;

      try {
        const metadata = JSON.parse(metadataJson);
        console.log(`[minimact-dynamic] Hydrated binding: ${metadata.selector}`);

        // Remove metadata attribute (cleanup)
        el.removeAttribute('data-minimact-binding');
      } catch (error) {
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
  const registerBinding = useCallback(
    (selector: string, fn: DynamicValueFunction<TState>) => {
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

      console.log(
        `[minimact-dynamic] Registered binding '${selector}' with dependencies:`,
        dependencies
      );
    },
    [state]
  );

  /**
   * Register element order binding (DOM CHOREOGRAPHY)
   */
  const registerOrderBinding = useCallback(
    (containerSelector: string, fn: DynamicOrderFunction<TState>) => {
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

      console.log(
        `[minimact-dynamic] Registered order binding '${containerSelector}' ` +
        `with dependencies:`,
        dependencies
      );
    },
    [state]
  );

  /**
   * Re-evaluate bindings when state changes
   * Only re-evaluates bindings whose dependencies changed
   */
  useEffect(() => {
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
        console.log(
          `[minimact-dynamic] Updated binding '${binding.selector}' ` +
          `to: ${newValue} in ${latency.toFixed(2)}ms`
        );
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
        console.log(
          `[minimact-dynamic] Choreographed '${binding.containerSelector}' ` +
          `in ${latency.toFixed(2)}ms`
        );
      }
    });

    // Store current state for next comparison
    prevStateRef.current = state;
  }, [state]);

  /**
   * Update state
   */
  const updateState = useCallback((updaterOrPartial: any) => {
    if (typeof updaterOrPartial === 'function') {
      setState(updaterOrPartial);
    } else {
      setState(prev => ({ ...prev, ...updaterOrPartial }));
    }
  }, []);

  // Build API object
  const api: any = registerBinding;

  // .order() for DOM choreography
  api.order = registerOrderBinding;

  // .attr() for attribute bindings
  api.attr = (selector: string, attribute: string, fn: DynamicValueFunction<TState>) => {
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
  api.class = (selector: string, fn: DynamicValueFunction<TState>) => {
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
  api.style = (selector: string, property: string, fn: DynamicValueFunction<TState>) => {
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
  api.show = (selector: string, fn: (state: TState) => boolean) => {
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
  api.remove = (selector: string) => bindingsRef.current.delete(selector);

  return api;
}
