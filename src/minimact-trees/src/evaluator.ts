/**
 * minimact-trees - Decision Tree Evaluator
 *
 * Evaluates decision trees against state context
 * Traverses tree depth-first, matching states along the way
 */

import type { DecisionTree, StateContext, DecisionTreeOptions } from './types';
import { parseStateKey, matchesState } from './parser';

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
export function evaluateTree<TResult = any>(
  tree: DecisionTree<TResult>,
  context: StateContext,
  options: DecisionTreeOptions = {}
): TResult | undefined {
  const { defaultValue, debugLogging = false, strictMode = false } = options;

  if (debugLogging) {
    console.log('[minimact-trees] Evaluating tree with context:', context);
  }

  const result = traverse(tree, context, debugLogging);

  if (result === undefined) {
    if (strictMode) {
      throw new Error(
        `[minimact-trees] No matching path found in decision tree for state: ${JSON.stringify(context)}`
      );
    }

    if (debugLogging) {
      console.warn('[minimact-trees] No match found, returning default value');
    }

    return defaultValue;
  }

  if (debugLogging) {
    console.log('[minimact-trees] Match found:', result);
  }

  return result;
}

/**
 * Recursively traverse decision tree
 *
 * @param node - Current tree node
 * @param context - State context
 * @param debug - Debug logging enabled
 * @returns Result value or undefined
 */
function traverse<TResult = any>(
  node: DecisionTree<TResult> | TResult,
  context: StateContext,
  debug: boolean,
  depth: number = 0
): TResult | undefined {
  const indent = '  '.repeat(depth);

  // Base case: leaf node (non-object value)
  if (typeof node !== 'object' || node === null || Array.isArray(node)) {
    if (debug) {
      console.log(`${indent}→ Leaf value:`, node);
    }
    return node as TResult;
  }

  // Recursive case: traverse children
  for (const key of Object.keys(node)) {
    let parsed;

    try {
      parsed = parseStateKey(key);
    } catch (error) {
      if (debug) {
        console.warn(`${indent}⚠️ Invalid key format: "${key}"`, error);
      }
      continue;
    }

    if (debug) {
      console.log(
        `${indent}Checking "${key}" → ` +
        `${parsed.stateName} === ${JSON.stringify(parsed.expectedValue)}`
      );
    }

    // Check if current state matches this key
    if (matchesState(context, parsed)) {
      if (debug) {
        console.log(`${indent}✓ Match! Traversing deeper...`);
      }

      // Traverse deeper
      const childNode = (node as Record<string, any>)[key];
      const result = traverse(childNode, context, debug, depth + 1);

      if (result !== undefined) {
        return result;
      }
    } else {
      if (debug) {
        const currentValue = context[parsed.stateName];
        console.log(
          `${indent}✗ No match (current value: ${JSON.stringify(currentValue)})`
        );
      }
    }
  }

  // No matching path found at this level
  return undefined;
}

/**
 * Get all possible paths through a decision tree
 * (Useful for debugging and visualization)
 *
 * @param tree - Decision tree
 * @returns Array of path strings
 */
export function getAllPaths(tree: DecisionTree, prefix: string = ''): string[] {
  const paths: string[] = [];

  for (const key of Object.keys(tree)) {
    const value = tree[key];
    const currentPath = prefix ? `${prefix} → ${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recurse into subtree
      const subPaths = getAllPaths(value as DecisionTree, currentPath);
      paths.push(...subPaths);
    } else {
      // Leaf node
      paths.push(`${currentPath} = ${JSON.stringify(value)}`);
    }
  }

  return paths;
}
