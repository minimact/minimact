/**
 * Minimact Integration Layer for Decision Trees
 *
 * This file provides the integration between DecisionTree evaluation
 * and Minimact's component context, HintQueue, and prediction system.
 *
 * Pattern: Same as minimact-punch integration
 */

import type { DecisionTree, StateContext, DecisionTreeOptions } from './types';
import { evaluateTree } from './evaluator';

/**
 * Component context interface (from Minimact)
 */
export interface ComponentContext {
  componentId: string;
  element: HTMLElement;
  state: Map<string, any>;
  effects: Array<{ callback: () => void | (() => void), deps: any[] | undefined, cleanup?: () => void }>;
  refs: Map<string, { current: any }>;
  decisionTrees?: Map<string, DecisionTreeState>;
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
 * Decision tree state (stored in component context)
 */
export interface DecisionTreeState {
  tree: DecisionTree;
  context: StateContext;
  currentValue: any;
  options?: DecisionTreeOptions;
}

// ============================================================
// GLOBAL CONTEXT TRACKING
// ============================================================

let currentContext: ComponentContext | null = null;
let decisionTreeIndex = 0;

/**
 * Set the current component context
 * Called by Minimact before each render
 *
 * @internal
 */
export function setComponentContext(context: ComponentContext): void {
  currentContext = context;
  decisionTreeIndex = 0;
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
 * useDecisionTree hook - Integrated with Minimact
 *
 * Evaluates a decision tree based on component state.
 * Syncs changes to server for predictive rendering.
 *
 * @param tree - Decision tree structure
 * @param context - State context (key-value pairs)
 * @param options - Evaluation options
 * @returns Current tree result value
 *
 * @example
 * ```typescript
 * // Client-side (runs in browser)
 * const price = useDecisionTree({
 *   roleAdmin: 0,
 *   rolePremium: { count5: 0, count3: 5 },
 *   roleBasic: 10
 * }, { role: 'admin', count: 5 });
 *
 * // Server-side (C# component reads it)
 * // protected override VNode Render() {
 * //   return new VNode("div", $"Price: {State["decisionTree_0"]}");
 * // }
 * ```
 */
export function useDecisionTree<TResult = any>(
  tree: DecisionTree<TResult>,
  context: StateContext,
  options?: DecisionTreeOptions
): TResult | undefined {
  if (!currentContext) {
    throw new Error('[minimact-trees] useDecisionTree must be called within a component render');
  }

  const componentContext = currentContext;
  const index = decisionTreeIndex++;
  const stateKey = `decisionTree_${index}`;

  // Initialize decision trees map if needed
  if (!componentContext.decisionTrees) {
    componentContext.decisionTrees = new Map();
  }

  // Evaluate tree
  const currentValue = evaluateTree(tree, context, options);

  // Check if value changed
  const existingState = componentContext.decisionTrees.get(stateKey);
  const previousValue = existingState?.currentValue;

  if (previousValue !== currentValue) {
    // Store new state
    componentContext.decisionTrees.set(stateKey, {
      tree,
      context,
      currentValue,
      options
    });

    // Sync to server
    syncToServer(componentContext, stateKey, currentValue, context);
  }

  return currentValue;
}

/**
 * Sync decision tree result to server
 *
 * @internal
 */
function syncToServer(
  context: ComponentContext,
  stateKey: string,
  value: any,
  stateContext: StateContext
): void {
  // Build state change object for HintQueue
  const stateChanges: Record<string, any> = {
    [stateKey]: value
  };

  // Check hint queue for cached patches
  const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

  if (hint) {
    // 🟢 CACHE HIT! Apply patches immediately
    console.log(
      `[minimact-trees] 🟢 CACHE HIT! Hint '${hint.hintId}' matched ` +
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
    console.log(`[minimact-trees] 🔴 CACHE MISS for decision tree value: ${value}`);

    if (context.playgroundBridge) {
      context.playgroundBridge.cacheMiss({
        componentId: context.componentId,
        methodName: `decisionTree(${value})`,
        patchCount: 0
      });
    }
  }

  // Sync to server (keeps server state fresh)
  context.signalR
    .invoke('UpdateDecisionTreeState', {
      componentId: context.componentId,
      stateKey,
      value,
      context: stateContext
    })
    .catch((err) => {
      console.error('[minimact-trees] Failed to sync decision tree to server:', err);
    });
}

/**
 * Cleanup decision trees for a component
 *
 * @internal
 */
export function cleanupDecisionTrees(context: ComponentContext): void {
  if (context.decisionTrees) {
    context.decisionTrees.clear();
  }
}
