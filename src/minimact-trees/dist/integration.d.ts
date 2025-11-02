/**
 * Minimact Integration Layer for Decision Trees
 *
 * This file provides the integration between DecisionTree evaluation
 * and Minimact's component context, HintQueue, and prediction system.
 *
 * Pattern: Same as minimact-punch integration
 */
import type { DecisionTree, StateContext, DecisionTreeOptions } from './types';
/**
 * Component context interface (from Minimact)
 */
export interface ComponentContext {
    componentId: string;
    element: HTMLElement;
    state: Map<string, any>;
    effects: Array<{
        callback: () => void | (() => void);
        deps: any[] | undefined;
        cleanup?: () => void;
    }>;
    refs: Map<string, {
        current: any;
    }>;
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
/**
 * Set the current component context
 * Called by Minimact before each render
 *
 * @internal
 */
export declare function setComponentContext(context: ComponentContext): void;
/**
 * Clear the current component context
 * Called by Minimact after each render
 *
 * @internal
 */
export declare function clearComponentContext(): void;
/**
 * Get current context
 *
 * @internal
 */
export declare function getCurrentContext(): ComponentContext | null;
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
export declare function useDecisionTree<TResult = any>(tree: DecisionTree<TResult>, context: StateContext, options?: DecisionTreeOptions): TResult | undefined;
/**
 * Cleanup decision trees for a component
 *
 * @internal
 */
export declare function cleanupDecisionTrees(context: ComponentContext): void;
//# sourceMappingURL=integration.d.ts.map