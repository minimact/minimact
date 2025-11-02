/**
 * minimact-trees - Decision Tree Evaluator
 *
 * Evaluates decision trees against state context
 * Traverses tree depth-first, matching states along the way
 */
import type { DecisionTree, StateContext, DecisionTreeOptions } from './types';
/**
 * Evaluate a decision tree against current state
 *
 * @param tree - Decision tree structure
 * @param context - Current state values
 * @param options - Evaluation options
 * @returns Result value (leaf of matched path)
 *
 * @example
 * ```typescript
 * const tree = {
 *   roleAdmin: 0,
 *   rolePremium: {
 *     count5: 0,
 *     count3: 5
 *   },
 *   roleBasic: 10
 * };
 *
 * const result = evaluateTree(tree, { role: 'premium', count: 5 });
 * // → 0 (matched rolePremium → count5)
 * ```
 */
export declare function evaluateTree<TResult = any>(tree: DecisionTree<TResult>, context: StateContext, options?: DecisionTreeOptions): TResult | undefined;
/**
 * Get all possible paths through a decision tree
 * (Useful for debugging and visualization)
 *
 * @param tree - Decision tree
 * @returns Array of path strings
 */
export declare function getAllPaths(tree: DecisionTree, prefix?: string): string[];
//# sourceMappingURL=evaluator.d.ts.map