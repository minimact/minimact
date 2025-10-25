/**
 * minimact-trees - Type Definitions
 *
 * 🌳 Universal State Machine
 * Decision trees that work with ANY value types
 */
/**
 * Decision tree structure
 * Can be nested to any depth, leaf values are the results
 */
export type DecisionTree<TResult = any> = {
    [key: string]: TResult | DecisionTree<TResult>;
};
/**
 * Parsed state key
 * e.g., "roleAdmin" → { stateName: "role", expectedValue: "admin" }
 */
export interface ParsedStateKey {
    stateName: string;
    expectedValue: any;
}
/**
 * State context for evaluation
 * Maps state names to their current values
 */
export type StateContext = Record<string, any>;
/**
 * Decision tree options
 */
export interface DecisionTreeOptions {
    /**
     * Default value if no match found
     */
    defaultValue?: any;
    /**
     * Enable debug logging
     */
    debugLogging?: boolean;
    /**
     * Strict mode - throw error if no match found
     */
    strictMode?: boolean;
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
 * Component context interface (from Minimact)
 * Re-exported for convenience
 */
export interface ComponentContext {
    componentId: string;
    element: HTMLElement;
    state: Map<string, any>;
    decisionTrees?: Map<string, DecisionTreeState>;
    [key: string]: any;
}
