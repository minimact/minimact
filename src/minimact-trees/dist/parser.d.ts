/**
 * minimact-trees - Universal Key Parser
 *
 * Parses decision tree keys into state/value pairs
 * Supports strings, numbers, booleans, floats, kebab-case, etc.
 */
import type { ParsedStateKey } from './types';
/**
 * Parse a decision tree key into state name and expected value
 *
 * Examples:
 * - "roleAdmin" → { stateName: "role", expectedValue: "admin" }
 * - "count5" → { stateName: "count", expectedValue: 5 }
 * - "price19.99" → { stateName: "price", expectedValue: 19.99 }
 * - "isActiveTrue" → { stateName: "isActive", expectedValue: true }
 * - "statusCodePending" → { stateName: "statusCode", expectedValue: "pending" }
 * - "tierGold" → { stateName: "tier", expectedValue: "gold" }
 *
 * @param key - Decision tree key
 * @returns Parsed state key or null if invalid
 */
export declare function parseStateKey(key: string): ParsedStateKey | null;
/**
 * Check if a state context matches a parsed key
 *
 * @param context - Current state values
 * @param parsedKey - Parsed decision tree key
 * @returns True if state matches expected value
 */
export declare function matchesState(context: Record<string, any>, parsedKey: ParsedStateKey): boolean;
/**
 * Find all matching keys at current tree level
 *
 * @param tree - Decision tree node
 * @param context - Current state values
 * @returns Array of matching keys
 */
export declare function findMatchingKeys(tree: Record<string, any>, context: Record<string, any>): string[];
/**
 * Debug: Show what a key parses to
 */
export declare function debugParseKey(key: string): void;
