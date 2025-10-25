/**
 * minimact-trees - useDecisionTree Hook
 *
 * React hook for evaluating decision trees based on state
 * Works with useState to create a universal state machine
 */

import { useMemo } from 'react';
import type { DecisionTree, StateContext, DecisionTreeOptions } from './types';
import { evaluateTree } from './evaluator';

/**
 * Evaluate a decision tree based on current state
 *
 * @param tree - Decision tree structure
 * @param context - Current state values (from useState calls)
 * @param options - Evaluation options
 * @returns Computed result value
 *
 * @example
 * ```typescript
 * const [role, setRole] = useState('admin');
 * const [count, setCount] = useState(5);
 *
 * const shippingCost = useDecisionTree({
 *   roleAdmin: 0,
 *   rolePremium: {
 *     count5: 0,
 *     count3: 5
 *   },
 *   roleBasic: 10
 * }, { role, count });
 *
 * // When role='admin', count=5: shippingCost = 0
 * // When role='premium', count=5: shippingCost = 0
 * // When role='premium', count=3: shippingCost = 5
 * // When role='basic', count=anything: shippingCost = 10
 * ```
 */
export function useDecisionTree<TResult = any>(
  tree: DecisionTree<TResult>,
  context: StateContext,
  options?: DecisionTreeOptions
): TResult | undefined {
  // Memoize result based on context values
  // This prevents unnecessary re-evaluations
  const result = useMemo(() => {
    return evaluateTree(tree, context, options);
  }, [
    tree,
    // Serialize context for dependency tracking
    JSON.stringify(context),
    options?.defaultValue,
    options?.strictMode
  ]);

  return result;
}

/**
 * Alternative API: Pass states directly as arguments
 *
 * @example
 * ```typescript
 * const role = useState('admin');
 * const count = useState(5);
 *
 * const shippingCost = useDecisionTreeWith({
 *   roleAdmin: 0,
 *   rolePremium: { count5: 0, count3: 5 },
 *   roleBasic: 10
 * }, role, count);
 * ```
 */
export function useDecisionTreeWith<TResult = any>(
  tree: DecisionTree<TResult>,
  ...states: Array<[any, (value: any) => void]>
): TResult | undefined {
  // Build context from state tuples
  const context: StateContext = {};

  states.forEach(([value, _setter], index) => {
    // Use state index as key (states must be in consistent order)
    context[`state${index}`] = value;
  });

  return useDecisionTree(tree, context);
}
