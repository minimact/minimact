/**
 * minimact-trees - Universal Key Parser
 *
 * Parses decision tree keys into state/value pairs
 * Supports strings, numbers, booleans, floats, kebab-case, etc.
 */
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
export function parseStateKey(key) {
    // Validate input
    if (!key || key.trim() === '') {
        throw new Error('parseStateKey: key cannot be empty');
    }
    // Split on unescaped colons
    // Strategy: split on ':', but not on '\:'
    const parts = [];
    let current = '';
    let i = 0;
    while (i < key.length) {
        if (key[i] === '\\' && i + 1 < key.length && key[i + 1] === ':') {
            // Escaped colon - add the colon to current part
            current += ':';
            i += 2;
        }
        else if (key[i] === ':') {
            // Unescaped colon - this is the delimiter
            parts.push(current);
            current = '';
            i++;
        }
        else {
            current += key[i];
            i++;
        }
    }
    parts.push(current);
    // Must have exactly 2 parts: stateName and value
    if (parts.length !== 2) {
        throw new Error(`parseStateKey: invalid key format "${key}". Expected format: "stateName:Value"`);
    }
    const stateName = parts[0];
    const valueString = parts[1];
    // Validate state name (must start with lowercase letter)
    if (!stateName || !/^[a-z]/.test(stateName)) {
        throw new Error(`parseStateKey: state name must start with lowercase letter, got "${stateName}"`);
    }
    // Validate value string is not empty
    if (!valueString) {
        throw new Error(`parseStateKey: value cannot be empty in "${key}"`);
    }
    // Infer the expected value and its type
    const { value: expectedValue, type: valueType } = inferValueType(valueString);
    return { stateName, expectedValue, valueType };
}
/**
 * Infer the type of a value string
 *
 * @param str - Value portion of the key (after the colon)
 * @returns Object with typed value and its type
 */
function inferValueType(str) {
    // Boolean: True/False (case-sensitive)
    if (str === 'True')
        return { value: true, type: 'boolean' };
    if (str === 'False')
        return { value: false, type: 'boolean' };
    // Negative float: -digits.digits
    if (/^-[0-9]+\.[0-9]+$/.test(str)) {
        return { value: parseFloat(str), type: 'number' };
    }
    // Float: digits.digits
    if (/^[0-9]+\.[0-9]+$/.test(str)) {
        return { value: parseFloat(str), type: 'number' };
    }
    // Negative integer: -digits
    if (/^-[0-9]+$/.test(str)) {
        return { value: parseInt(str, 10), type: 'number' };
    }
    // Integer: all digits
    if (/^[0-9]+$/.test(str)) {
        return { value: parseInt(str, 10), type: 'number' };
    }
    // String: Convert to lowercase kebab-case
    // "Admin" → "admin"
    // "CreditCard" → "credit-card"
    // "StatusPending" → "status-pending"
    // "CA" → "ca"
    // "A" → "a"
    //
    // Note: We lowercase everything for consistent matching
    // Insert hyphen before uppercase letter that follows a lowercase letter
    const kebabCase = str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase();
    return { value: kebabCase, type: 'string' };
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
    // Normalize context value to match the format used in parsed keys
    let normalizedValue = currentValue;
    if (parsedKey.valueType === 'string' && typeof currentValue === 'string') {
        // Apply same normalization as inferValueType: lowercase kebab-case
        normalizedValue = currentValue
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase();
    }
    return normalizedValue === parsedKey.expectedValue;
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
        try {
            const parsed = parseStateKey(key);
            if (matchesState(context, parsed)) {
                matchingKeys.push(key);
            }
        }
        catch (error) {
            // Skip invalid keys
            continue;
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
