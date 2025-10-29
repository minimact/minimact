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

import { DomElementState } from './dom-element-state';
import type { DomElementStateOptions, DomElementStateSnapshot } from './types';
import type { ConfidenceWorkerManager } from './confidence-worker-manager';
import type { ComponentContext } from '@minimact/core';

/**
 * SignalRManager interface for server synchronization
 */
export interface SignalRManager {
  updateDomElementState(componentId: string, stateKey: string, snapshot: any): Promise<void>;
  invoke(method: string, ...args: any[]): Promise<any>; // For RequestPrediction calls
}

/**
 * HintQueue interface for predictive rendering
 */
export interface HintQueue {
  matchHint(componentId: string, stateChanges: Record<string, any>): {
    hintId: string;
    patches: any[];
    confidence: number;
  } | null;
}

/**
 * DOMPatcher interface for applying patches
 */
export interface DOMPatcher {
  applyPatches(element: HTMLElement, patches: any[]): void;
}

/**
 * PlaygroundBridge interface for visualization
 */
export interface PlaygroundBridge {
  cacheHit(data: {
    componentId: string;
    hintId: string;
    latency: number;
    confidence: number;
    patchCount: number;
  }): void;

  cacheMiss(data: {
    componentId: string;
    methodName: string;
    latency: number;
    patchCount: number;
  }): void;
}

// ============================================================
// GLOBAL CONTEXT TRACKING (MES 1.1.1)
// ============================================================

let currentContext: ComponentContext | null = null;
let domElementStateIndex = 0;

/**
 * Set the current component context
 * Called by Minimact before each render
 *
 * @internal
 */
export function setComponentContext(context: ComponentContext): void {
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
export function clearComponentContext(): void {
  currentContext = null;
}

/**
 * Get current context (for advanced usage)
 *
 * @internal
 */
export function getCurrentContext(): ComponentContext | null {
  return currentContext;
}

/**
 * Handle prediction request from confidence worker
 * Worker says: "I predict hover/intersection/focus will occur in X ms"
 *
 * @internal
 */
function handleWorkerPrediction(
  context: ComponentContext,
  request: {
    componentId: string;
    elementId: string;
    observation: {
      hover?: boolean;
      isIntersecting?: boolean;
      focus?: boolean;
    };
    confidence: number;
    leadTime: number;
  }
): void {
  console.log(
    `[minimact-punch] 🔮 Worker prediction: ${request.elementId} ` +
    `(${(request.confidence * 100).toFixed(0)}% confident, ${request.leadTime.toFixed(0)}ms lead time)`
  );

  // Build predicted state object
  // The stateKey needs to match what useDomElementState uses
  const stateKey = request.elementId.split('_').pop()!; // Extract "domElementState_0" from "counter-1_domElementState_0"

  const predictedState: Record<string, any> = {
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
export function useDomElementState(
  selector?: string,
  options?: DomElementStateOptions
): DomElementState {
  // MES 1.1.1: Guard - Must be called within component render
  if (!currentContext) {
    throw new Error(
      '[minimact-punch] useDomElementState must be called within a component render. ' +
      'Make sure you are calling this hook inside a Minimact component function.'
    );
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
    domState.setOnChange((snapshot: DomElementStateSnapshot) => {
      const startTime = performance.now();

      // Build state change object for hint matching
      // Format matches what HintQueue expects
      const stateChanges: Record<string, any> = {
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
        console.log(
          `[minimact-punch] 🟢 DOM CACHE HIT! Hint '${hint.hintId}' matched - ` +
          `applying ${hint.patches.length} patches in ${latency.toFixed(2)}ms`
        );

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
      } else {
        // 🔴 CACHE MISS - No prediction available
        const latency = performance.now() - startTime;
        console.log(
          `[minimact-punch] 🔴 DOM CACHE MISS - No prediction for DOM change:`,
          stateChanges
        );

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
    domState.attachElement = (element: HTMLElement) => {
      originalAttachElement(element);

      // Register with confidence worker (if available)
      if (context.confidenceWorker?.isReady()) {
        const elementId = `${context.componentId}_${stateKey}`;
        context.confidenceWorker.registerElement(
          context.componentId,
          elementId,
          element,
          {
            hover: options?.trackHover ?? true,
            intersection: options?.trackIntersection ?? true,
            focus: options?.trackFocus ?? false,
          }
        );
      }
    };

    // If selector provided, attach after render
    if (selector) {
      queueMicrotask(() => {
        const elements = Array.from(
          context.element.querySelectorAll(selector)
        ) as HTMLElement[];

        if (elements.length > 0) {
          domState.attachElements(elements);
        }
      });
    }
  }

  return context.domElementStates.get(stateKey)!;
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
export function cleanupDomElementStates(context: ComponentContext): void {
  if (!context.domElementStates) return;

  // Disconnect all observers and clear resources
  for (const domState of context.domElementStates.values()) {
    domState.destroy();
  }

  context.domElementStates.clear();
}

// ============================================================
// TYPESCRIPT MODULE AUGMENTATION
// ============================================================

/**
 * Extend ComponentContext to include minimact-punch extensions
 * This allows TypeScript to know about our extension
 */
declare module '@minimact/core' {
  interface ComponentContext {
    domElementStates?: Map<string, DomElementState>;
    confidenceWorker?: ConfidenceWorkerManager;
  }
}
