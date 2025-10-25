/**
 * minimact-trees - Universal State Machine
 *
 * 🌳 Decision trees that work with ANY value types
 *
 * XState but declarative, predictive, and minimal.
 */
export { useDecisionTree, setComponentContext, clearComponentContext, getCurrentContext, cleanupDecisionTrees } from './integration';
export { evaluateTree, getAllPaths } from './evaluator';
export { parseStateKey, matchesState, findMatchingKeys, debugParseKey } from './parser';
export type { DecisionTree, ParsedStateKey, StateContext, DecisionTreeOptions, ComponentContext, DecisionTreeState } from './types';
export declare const VERSION = "0.1.0";
export declare const CODENAME = "Universal State Machine";
