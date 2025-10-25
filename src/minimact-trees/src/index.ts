/**
 * minimact-trees - Universal State Machine
 *
 * 🌳 Decision trees that work with ANY value types
 *
 * XState but declarative, predictive, and minimal.
 */

// Integrated mode (with Minimact)
export {
  useDecisionTree,
  setComponentContext,
  clearComponentContext,
  getCurrentContext,
  cleanupDecisionTrees
} from './integration';

// Standalone mode (pure evaluation)
export { evaluateTree, getAllPaths } from './evaluator';
export { parseStateKey, matchesState, findMatchingKeys, debugParseKey } from './parser';

export type {
  DecisionTree,
  ParsedStateKey,
  StateContext,
  DecisionTreeOptions,
  ComponentContext,
  DecisionTreeState
} from './types';

export const VERSION = '0.1.0';
export const CODENAME = 'Universal State Machine';
