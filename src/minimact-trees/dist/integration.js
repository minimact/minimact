/**
 * Minimact Integration Layer for Decision Trees
 *
 * This file provides the integration between DecisionTree evaluation
 * and Minimact's component context, HintQueue, and prediction system.
 *
 * Pattern: Same as minimact-punch integration
 */
import { evaluateTree } from './evaluator';
// ============================================================
// GLOBAL CONTEXT TRACKING
// ============================================================
let currentContext = null;
let decisionTreeIndex = 0;
/**
 * Set the current component context
 * Called by Minimact before each render
 *
 * @internal
 */
export function setComponentContext(context) {
    currentContext = context;
    decisionTreeIndex = 0;
}
/**
 * Clear the current component context
 * Called by Minimact after each render
 *
 * @internal
 */
export function clearComponentContext() {
    currentContext = null;
}
/**
 * Get current context
 *
 * @internal
 */
export function getCurrentContext() {
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
export function useDecisionTree(tree, context, options) {
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
function syncToServer(context, stateKey, value, stateContext) {
    // Build state change object for HintQueue
    const stateChanges = {
        [stateKey]: value
    };
    // Check hint queue for cached patches
    const hint = context.hintQueue.matchHint(context.componentId, stateChanges);
    if (hint) {
        // 🟢 CACHE HIT! Apply patches immediately
        console.log(`[minimact-trees] 🟢 CACHE HIT! Hint '${hint.hintId}' matched ` +
            `(${hint.confidence.toFixed(2)} confidence, ${hint.patches.length} patches)`);
        context.domPatcher.applyPatches(context.element, hint.patches);
        if (context.playgroundBridge) {
            context.playgroundBridge.cacheHit({
                componentId: context.componentId,
                hintId: hint.hintId,
                confidence: hint.confidence,
                patchCount: hint.patches.length
            });
        }
    }
    else {
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
export function cleanupDecisionTrees(context) {
    if (context.decisionTrees) {
        context.decisionTrees.clear();
    }
}
