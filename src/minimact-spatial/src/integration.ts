/**
 * Minimact Integration Layer for Spatial Areas
 *
 * This file provides the integration between spatial area tracking
 * and Minimact's component context, HintQueue, and prediction system.
 *
 * Pattern: Same as minimact-punch integration
 */

import type { AreaDefinition, AreaState, AreaOptions, AbsoluteBounds } from './types';
import { calculateBounds, calculateDistance, calculateCenterDistance, calculateIntersection } from './bounds-calculator';
import {
  queryElementsInBounds,
  calculateCoverage,
  calculateElementStats,
  calculateDensity,
  isInViewport,
  calculateVisibleRatio,
  getElementsByTagInBounds,
  getElementsByClassInBounds,
  querySelectorInBounds,
  querySelectorAllInBounds
} from './spatial-engine';

/**
 * Component context interface (from Minimact)
 */
export interface ComponentContext {
  componentId: string;
  element: HTMLElement;
  state: Map<string, any>;
  effects: Array<{ callback: () => void | (() => void), deps: any[] | undefined, cleanup?: () => void }>;
  refs: Map<string, { current: any }>;
  areas?: Map<string, AreaInstance>;
  hintQueue: HintQueue;
  domPatcher: DOMPatcher;
  playgroundBridge?: PlaygroundBridge;
  signalR: SignalRManager;
}

/**
 * SignalRManager interface
 */
export interface SignalRManager {
  invoke(method: string, ...args: any[]): Promise<any>;
}

/**
 * HintQueue interface
 */
export interface HintQueue {
  matchHint(componentId: string, stateChanges: Record<string, any>): {
    hintId: string;
    patches: any[];
    confidence: number;
  } | null;
}

/**
 * DOMPatcher interface
 */
export interface DOMPatcher {
  applyPatches(element: HTMLElement, patches: any[]): void;
}

/**
 * PlaygroundBridge interface
 */
export interface PlaygroundBridge {
  cacheHit(data: any): void;
  cacheMiss(data: any): void;
}

/**
 * Internal area instance (stored in component context)
 */
interface AreaInstance {
  definition: AreaDefinition;
  options?: AreaOptions;
  boundsRef: AbsoluteBounds | null;
  rafRef: number | null;
  lastUpdateRef: number;
  cleanupHandlers: Array<() => void>;
  onChange?: (state: AreaState) => void;
}

// ============================================================
// GLOBAL CONTEXT TRACKING
// ============================================================

let currentContext: ComponentContext | null = null;
let areaIndex = 0;

/**
 * Set the current component context
 * Called by Minimact before each render
 *
 * @internal
 */
export function setComponentContext(context: ComponentContext): void {
  currentContext = context;
  areaIndex = 0;
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
 * Get current context
 *
 * @internal
 */
export function getCurrentContext(): ComponentContext | null {
  return currentContext;
}

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

/**
 * useArea hook - Integrated with Minimact
 *
 * Track a spatial region reactively. Syncs changes to server for predictive rendering.
 *
 * @param definition - Area definition (selector, bounds, or 'viewport')
 * @param options - Tracking options
 * @returns AreaState with spatial queries and statistics
 *
 * @example
 * ```typescript
 * const header = useArea({ top: 0, height: 80 });
 * const sidebar = useArea('#sidebar');
 *
 * // Server can access: State["area_0"], State["area_1"]
 * ```
 */
export function useArea(
  definition: AreaDefinition,
  options?: AreaOptions
): AreaState {
  if (!currentContext) {
    throw new Error('[minimact-spatial] useArea must be called within a component render');
  }

  const context = currentContext;
  const index = areaIndex++;
  const stateKey = `area_${index}`;

  // Initialize areas map if needed
  if (!context.areas) {
    context.areas = new Map();
  }

  // Get or create area instance
  if (!context.areas.has(stateKey)) {
    const instance: AreaInstance = {
      definition,
      options,
      boundsRef: null,
      rafRef: null,
      lastUpdateRef: 0,
      cleanupHandlers: []
    };

    // Setup change handler
    instance.onChange = (state: AreaState) => {
      syncToServer(context, stateKey, state);
    };

    // Setup observers
    setupObservers(instance, options || {});

    context.areas.set(stateKey, instance);
  }

  const instance = context.areas.get(stateKey)!;

  // Calculate current state
  const state = calculateAreaState(instance);

  return state;
}

/**
 * Calculate area state from instance
 */
function calculateAreaState(instance: AreaInstance): AreaState {
  // Calculate bounds
  let bounds: AbsoluteBounds;
  try {
    bounds = calculateBounds(instance.definition);
    instance.boundsRef = bounds;
  } catch (error) {
    console.error('[minimact-spatial] Failed to calculate bounds:', error);
    bounds = instance.boundsRef || {
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0
    };
  }

  // Query elements
  const elementQuery = queryElementsInBounds(bounds, instance.options);

  // Calculate statistics
  const coverage = calculateCoverage(elementQuery.all, bounds);
  const elementStats = calculateElementStats(elementQuery.all);
  const area = bounds.width * bounds.height;
  const density = calculateDensity(elementQuery.all.length, bounds);
  const totalPixelsCovered = coverage * area;
  const emptySpace = area - totalPixelsCovered;
  const emptyRatio = area > 0 ? emptySpace / area : 0;
  const inViewport = isInViewport(bounds);
  const visibleRatio = calculateVisibleRatio(bounds);
  const visiblePixels = visibleRatio * area;

  // Build AreaState API
  const areaState: AreaState = {
    // Geometry
    bounds,
    width: bounds.width,
    height: bounds.height,
    area,
    center: {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2
    },

    // Element queries
    elementsFullyEnclosed: elementQuery.fully,
    elementsPartiallyEnclosed: elementQuery.partially,
    elementsAll: elementQuery.all,
    elementsCount: elementQuery.all.length,
    elementsFullyCount: elementQuery.fully.length,
    elementsPartiallyCount: elementQuery.partially.length,

    // Coverage analysis
    coverage,
    totalPixelsCovered,
    emptySpace,
    emptyRatio,

    // Element statistics
    elementDensity: density,
    averageElementSize: elementStats.averageSize,
    largestElement: elementStats.largestElement,
    smallestElement: elementStats.smallestElement,

    // Spatial queries
    intersects: (other: AreaState) => {
      const intersection = calculateIntersection(bounds, other.bounds);
      return intersection !== null;
    },

    intersectionRatio: (other: AreaState) => {
      const intersection = calculateIntersection(bounds, other.bounds);
      if (!intersection) return 0;

      const intersectionArea = intersection.width * intersection.height;
      const thisArea = bounds.width * bounds.height;
      return thisArea > 0 ? intersectionArea / thisArea : 0;
    },

    intersectionArea: (other: AreaState) => {
      const intersection = calculateIntersection(bounds, other.bounds);
      if (!intersection) return 0;
      return intersection.width * intersection.height;
    },

    contains: (element: Element) => {
      return elementQuery.fully.includes(element);
    },

    overlaps: (element: Element) => {
      return elementQuery.all.includes(element);
    },

    distance: (other: AreaState) => {
      return calculateDistance(bounds, other.bounds);
    },

    centerDistance: (other: AreaState) => {
      return calculateCenterDistance(bounds, other.bounds);
    },

    getElementsByTag: (tagName: string) => {
      return getElementsByTagInBounds(tagName, bounds, elementQuery.all);
    },

    getElementsByClass: (className: string) => {
      return getElementsByClassInBounds(className, bounds, elementQuery.all);
    },

    querySelector: (selector: string) => {
      return querySelectorInBounds(selector, elementQuery.all);
    },

    querySelectorAll: (selector: string) => {
      return querySelectorAllInBounds(selector, elementQuery.all);
    },

    // Viewport queries
    isInViewport: inViewport,
    visibleRatio,
    visiblePixels,

    // State properties
    isEmpty: elementQuery.all.length === 0,
    isFull: coverage > 0.8,
    isSparse: density < 5
  };

  return areaState;
}

/**
 * Setup observers for area tracking
 */
function setupObservers(instance: AreaInstance, options: AreaOptions): void {
  const throttle = options.throttle || 100;

  const triggerUpdate = () => {
    const now = Date.now();
    if (now - instance.lastUpdateRef < throttle) {
      return;
    }
    instance.lastUpdateRef = now;

    // Recalculate and notify
    const state = calculateAreaState(instance);
    if (instance.onChange) {
      instance.onChange(state);
    }
  };

  // Scroll tracking
  if (options.trackScroll !== false) {
    const handleScroll = () => {
      if (instance.rafRef) {
        cancelAnimationFrame(instance.rafRef);
      }
      instance.rafRef = requestAnimationFrame(triggerUpdate);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    instance.cleanupHandlers.push(() => window.removeEventListener('scroll', handleScroll));
  }

  // Resize tracking
  if (options.trackResize !== false) {
    const handleResize = () => {
      if (instance.rafRef) {
        cancelAnimationFrame(instance.rafRef);
      }
      instance.rafRef = requestAnimationFrame(triggerUpdate);
    };
    window.addEventListener('resize', handleResize);
    instance.cleanupHandlers.push(() => window.removeEventListener('resize', handleResize));
  }

  // Mutation tracking
  if (options.trackMutations) {
    const observer = new MutationObserver(() => {
      if (instance.rafRef) {
        cancelAnimationFrame(instance.rafRef);
      }
      instance.rafRef = requestAnimationFrame(triggerUpdate);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    instance.cleanupHandlers.push(() => observer.disconnect());
  }
}

/**
 * Sync area state to server
 */
function syncToServer(
  context: ComponentContext,
  stateKey: string,
  state: AreaState
): void {
  // Build state change object for HintQueue
  const stateChanges: Record<string, any> = {
    [stateKey]: {
      bounds: state.bounds,
      elementsCount: state.elementsCount,
      coverage: state.coverage,
      isEmpty: state.isEmpty,
      isFull: state.isFull,
      isInViewport: state.isInViewport
    }
  };

  // Check hint queue for cached patches
  const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

  if (hint) {
    // 🟢 CACHE HIT! Apply patches immediately
    console.log(
      `[minimact-spatial] 🟢 CACHE HIT! Hint '${hint.hintId}' matched ` +
      `(${hint.confidence.toFixed(2)} confidence, ${hint.patches.length} patches)`
    );

    context.domPatcher.applyPatches(context.element, hint.patches);

    if (context.playgroundBridge) {
      context.playgroundBridge.cacheHit({
        componentId: context.componentId,
        hintId: hint.hintId,
        confidence: hint.confidence,
        patchCount: hint.patches.length
      });
    }
  } else {
    // 🔴 CACHE MISS
    console.log(`[minimact-spatial] 🔴 CACHE MISS for area state`);

    if (context.playgroundBridge) {
      context.playgroundBridge.cacheMiss({
        componentId: context.componentId,
        methodName: `areaChange(${stateKey})`,
        patchCount: 0
      });
    }
  }

  // Sync to server (keeps server state fresh)
  context.signalR
    .invoke('UpdateAreaState', {
      componentId: context.componentId,
      stateKey,
      bounds: state.bounds,
      elementsCount: state.elementsCount,
      coverage: state.coverage,
      isEmpty: state.isEmpty,
      isFull: state.isFull,
      isInViewport: state.isInViewport
    })
    .catch((err) => {
      console.error('[minimact-spatial] Failed to sync area state to server:', err);
    });
}

/**
 * Cleanup areas for a component
 *
 * @internal
 */
export function cleanupAreas(context: ComponentContext): void {
  if (!context.areas) return;

  for (const instance of context.areas.values()) {
    // Cancel pending RAF
    if (instance.rafRef) {
      cancelAnimationFrame(instance.rafRef);
    }

    // Cleanup observers
    instance.cleanupHandlers.forEach(cleanup => cleanup());
  }

  context.areas.clear();
}
