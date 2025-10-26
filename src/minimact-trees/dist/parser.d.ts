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
 * Format: stateName:Value
 * - Use colon (:) to separate state name from value
 * - Escape colons in values with backslash (\:)
 *
 * Examples:
 * - "role:Admin" → { stateName: "role", expectedValue: "admin" }
 * - "count:5" → { stateName: "count", expectedValue: 5 }
 * - "price:19.99" → { stateName: "price", expectedValue: 19.99 }
 * - "isActive:True" → { stateName: "isActive", expectedValue: true }
 * - "statusCode:Pending" → { stateName: "statusCode", expectedValue: "pending" }
 * - "tier:Gold" → { stateName: "tier", expectedValue: "gold" }
 * - "message:Error\:Failed" → { stateName: "message", expectedValue: "error:failed" }
 * - "balance:-50" → { stateName: "balance", expectedValue: -50 }
 *
 * @param key - Decision tree key in format "stateName:Value"
 * @returns Parsed state key
 * @throws Error if key is invalid
 */
export declare function parseStateKey(key: string): ParsedStateKey;
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
