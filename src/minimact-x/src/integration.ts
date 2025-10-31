/**
 * Integration Layer
 * Connects useStateX with Minimact's ComponentContext
 */

import type { ComponentContext } from '@minimact/core';
import type {
  StateXConfig,
  UseStateXReturn,
  SetStateXFunction,
  StateXProjection,
  ProjectionUpdateEvent,
  StateXContext
} from './types';
import { ProjectionEngine } from './projection-engine';
import { TransformHandler } from './transform-handler';

// Extend ComponentContext to include StateX fields
declare module '@minimact/core' {
  interface ComponentContext extends StateXContext {
    stateProjections?: Map<string, StateXProjection>;
    dependencyGraph?: any;
    projectionContext?: any;
    stateXDevToolsBridge?: any;
    stateXSyncTimeouts?: Map<string, number>;
  }
}

// Global context tracking (provided by Minimact core)
let currentContext: ComponentContext | null = null;
let stateXIndex = 0;

/**
 * Set the current component context (called by Minimact before render)
 * @internal
 */
export function setComponentContext(context: ComponentContext): void {
  currentContext = context;
  stateXIndex = 0;
}

/**
 * Clear the current component context (called by Minimact after render)
 * @internal
 */
export function clearComponentContext(): void {
  currentContext = null;
  stateXIndex = 0;
}

/**
 * Get the current component context (for testing)
 * @internal
 */
export function getCurrentContext(): ComponentContext | null {
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
export function useStateX<T>(
  initialValue: T,
  config: StateXConfig<T>
): UseStateXReturn<T> {
  // Ensure we're in a component context
  if (!currentContext) {
    throw new Error(
      '[useStateX] must be called within a component render. ' +
      'Ensure @minimact/x integration is properly set up.'
    );
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
    const projection: StateXProjection = {
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
    const initialResults = ProjectionEngine.applyProjections(
      context.element,
      stateKey,
      initialValue,
      config.targets,
      projectionContext
    );

    projection.projectionResults = initialResults;
  }

  // Get current value
  const currentValue = context.state.get(stateKey) as T;

  // Create setState function
  const setState: SetStateXFunction<T> = (newValue: T | ((prev: T) => T)) => {
    const startTime = performance.now();

    // Compute actual new value
    const actualNewValue = typeof newValue === 'function'
      ? (newValue as (prev: T) => T)(context.state.get(stateKey) as T)
      : newValue;

    // Check if value actually changed (using custom equals or Object.is)
    const equals = config.equals || Object.is;
    const oldValue = context.state.get(stateKey) as T;

    if (equals(oldValue, actualNewValue)) {
      // Value hasn't changed, skip update
      return;
    }

    // Update state
    context.state.set(stateKey, actualNewValue);

    // Get projection context (custom or component context)
    const projectionContext = config.context ? config.context() : context.projectionContext || {};

    // Apply projections to DOM
    const results = ProjectionEngine.applyProjections(
      context.element,
      stateKey,
      actualNewValue,
      config.targets,
      projectionContext
    );

    // Update projection metadata
    const projection = context.stateProjections!.get(stateKey)!;
    projection.currentValue = actualNewValue;
    projection.lastUpdated = Date.now();
    projection.projectionResults = results;

    // Notify DevTools (if bridge exists)
    if (context.stateXDevToolsBridge) {
      results.forEach(result => {
        const event: ProjectionUpdateEvent = {
          componentId: context.componentId,
          stateKey,
          selector: result.selector,
          oldValue,
          newValue: actualNewValue,
          transformedValue: result.transformedValue!,
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
      const stateChanges: Record<string, any> = {
        [stateKey]: actualNewValue
      };

      const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

      if (hint) {
        // Template patch matched! Apply it
        const latency = performance.now() - startTime;
        console.log(
          `[useStateX] 🟢 Template patch matched! Hint '${hint.hintId}' - ` +
          `applying ${hint.patches.length} patches in ${latency.toFixed(2)}ms`
        );

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
      } else {
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
        }).catch((err: Error) => {
          console.error('[useStateX] Failed to sync state to server:', err);
        });
      }
    } else if (syncStrategy === 'debounced') {
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
          }).catch((err: Error) => {
            console.error('[useStateX] Failed to sync state to server:', err);
          });
        }
        context.stateXSyncTimeouts!.delete(stateKey);
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
export function syncStateToServer(stateKey?: string): void {
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
      }).catch((err: Error) => {
        console.error(`[useStateX] Failed to sync state '${stateKey}' to server:`, err);
      });
    }
  } else {
    // Sync all stateX states
    if (context.stateProjections) {
      context.stateProjections.forEach((projection: StateXProjection, key: string) => {
        const value = context.state.get(key);
        if (value !== undefined) {
          context.signalR.invoke('UpdateComponentState', {
            componentId: context.componentId,
            stateKey: key,
            value
          }).catch((err: Error) => {
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
export function cleanupStateProjections(context: ComponentContext): void {
  // Clear any pending sync timeouts
  if (context.stateXSyncTimeouts) {
    context.stateXSyncTimeouts.forEach((timeoutId: number) => {
      clearTimeout(timeoutId);
    });
    context.stateXSyncTimeouts.clear();
  }

  // Clear projection metadata
  if (context.stateProjections) {
    context.stateProjections.clear();
  }
}
