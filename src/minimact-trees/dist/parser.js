/**
 * minimact-trees - Universal Key Parser
 *
 * Parses decision tree keys into state/value pairs
 * Supports strings, numbers, booleans, floats, kebab-case, etc.
 */
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
export function parseStateKey(key) {
    // Match pattern: lowercase start, then split on first capital or digit
    const match = key.match(/^([a-z][a-zA-Z0-9]*?)([A-Z].*|[0-9].*)$/);
    if (!match) {
        return null;
    }
    const stateName = match[1];
    const valueString = match[2];
    // Infer the expected value type
    const expectedValue = inferValueType(valueString);
    return { stateName, expectedValue };
}
/**
 * Infer the type of a value string
 *
 * @param str - Value portion of the key
 * @returns Typed value
 */
function inferValueType(str) {
    // Boolean: True/False
    if (str === 'True')
        return true;
    if (str === 'False')
        return false;
    // Float: digits.digits
    if (/^[0-9]+\.[0-9]+$/.test(str)) {
        return parseFloat(str);
    }
    // Integer: all digits
    if (/^[0-9]+$/.test(str)) {
        return parseInt(str, 10);
    }
    // String: Convert PascalCase to kebab-case
    // "Admin" → "admin"
    // "CreditCard" → "credit-card"
    // "StatusPending" → "status-pending"
    const kebabCase = str.replace(/([A-Z])/g, (match, p1, offset) => offset > 0 ? '-' + p1.toLowerCase() : p1.toLowerCase());
    return kebabCase;
}
/**
 * Check if a state context matches a parsed key
 *
 * @param context - Current state values
 * @param parsedKey - Parsed decision tree key
 * @returns True if state matches expected value
 */
export function matchesState(context, parsedKey) {
    const currentValue = context[parsedKey.stateName];
    return currentValue === parsedKey.expectedValue;
}
/**
 * Find all matching keys at current tree level
 *
 * @param tree - Decision tree node
 * @param context - Current state values
 * @returns Array of matching keys
 */
export function findMatchingKeys(tree, context) {
    const matchingKeys = [];
    for (const key of Object.keys(tree)) {
        const parsed = parseStateKey(key);
        if (parsed && matchesState(context, parsed)) {
            matchingKeys.push(key);
        }
    }
    return matchingKeys;
}
/**
 * Debug: Show what a key parses to
 */
export function debugParseKey(key) {
    const parsed = parseStateKey(key);
    if (parsed) {
        console.log(`[minimact-trees] "${key}" → ` +
            `stateName: "${parsed.stateName}", ` +
            `expectedValue: ${JSON.stringify(parsed.expectedValue)} (${typeof parsed.expectedValue})`);
    }
    else {
        console.log(`[minimact-trees] "${key}" → INVALID KEY FORMAT`);
    }
}
