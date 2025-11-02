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
function parseStateKey(key) {
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
function matchesState(context, parsedKey) {
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
function findMatchingKeys(tree, context) {
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
function debugParseKey(key) {
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

/**
 * minimact-trees - Decision Tree Evaluator
 *
 * Evaluates decision trees against state context
 * Traverses tree depth-first, matching states along the way
 */
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
function evaluateTree(tree, context, options = {}) {
    const { defaultValue, debugLogging = false, strictMode = false } = options;
    if (debugLogging) {
        console.log('[minimact-trees] Evaluating tree with context:', context);
    }
    const result = traverse(tree, context, debugLogging);
    if (result === undefined) {
        if (strictMode) {
            throw new Error(`[minimact-trees] No matching path found in decision tree for state: ${JSON.stringify(context)}`);
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
function traverse(node, context, debug, depth = 0) {
    const indent = '  '.repeat(depth);
    // Base case: leaf node (non-object value)
    if (typeof node !== 'object' || node === null || Array.isArray(node)) {
        if (debug) {
            console.log(`${indent}→ Leaf value:`, node);
        }
        return node;
    }
    // Check if this object is a decision tree node or a leaf value
    // A plain object is a leaf value if it has no valid decision tree keys
    const keys = Object.keys(node);
    const hasAnyValidTreeKey = keys.some(key => {
        try {
            parseStateKey(key);
            return true;
        }
        catch {
            return false;
        }
    });
    // If no valid tree keys, this object is a leaf value
    if (!hasAnyValidTreeKey) {
        if (debug) {
            console.log(`${indent}→ Leaf value (object with no tree keys):`, node);
        }
        return node;
    }
    // Recursive case: traverse children
    for (const key of keys) {
        let parsed;
        try {
            parsed = parseStateKey(key);
        }
        catch (error) {
            if (debug) {
                console.warn(`${indent}⚠️ Invalid key format: "${key}"`, error);
            }
            continue;
        }
        if (debug) {
            console.log(`${indent}Checking "${key}" → ` +
                `${parsed.stateName} === ${JSON.stringify(parsed.expectedValue)}`);
        }
        // Check if current state matches this key
        if (matchesState(context, parsed)) {
            if (debug) {
                console.log(`${indent}✓ Match! Traversing deeper...`);
            }
            // Traverse deeper
            const childNode = node[key];
            const result = traverse(childNode, context, debug, depth + 1);
            if (result !== undefined) {
                return result;
            }
        }
        else {
            if (debug) {
                const currentValue = context[parsed.stateName];
                console.log(`${indent}✗ No match (current value: ${JSON.stringify(currentValue)})`);
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
function getAllPaths(tree, prefix = '') {
    const paths = [];
    for (const key of Object.keys(tree)) {
        const value = tree[key];
        const currentPath = prefix ? `${prefix} → ${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Recurse into subtree
            const subPaths = getAllPaths(value, currentPath);
            paths.push(...subPaths);
        }
        else {
            // Leaf node
            paths.push(`${currentPath} = ${JSON.stringify(value)}`);
        }
    }
    return paths;
}

/**
 * Minimact Integration Layer for Decision Trees
 *
 * This file provides the integration between DecisionTree evaluation
 * and Minimact's component context, HintQueue, and prediction system.
 *
 * Pattern: Same as minimact-punch integration
 */
// ============================================================
// GLOBAL CONTEXT TRACKING
// ============================================================
let currentContext = null;
let decisionTreeIndex = 0;
/**
 * Set the current component context
 * Called by Minimact before each render
 *
 * @internal
 */
function setComponentContext(context) {
    currentContext = context;
    decisionTreeIndex = 0;
}
/**
 * Clear the current component context
 * Called by Minimact after each render
 *
 * @internal
 */
function clearComponentContext() {
    currentContext = null;
}
/**
 * Get current context
 *
 * @internal
 */
function getCurrentContext() {
    return currentContext;
}
// ============================================================
// HOOK IMPLEMENTATION
// ============================================================
/**
 * useDecisionTree hook - Integrated with Minimact
 *
 * Evaluates a decision tree based on component state.
 * Syncs changes to server for predictive rendering.
 *
 * @param tree - Decision tree structure
 * @param context - State context (key-value pairs)
 * @param options - Evaluation options
 * @returns Current tree result value
 *
 * @example
 * ```typescript
 * // Client-side (runs in browser)
 * const price = useDecisionTree({
 *   roleAdmin: 0,
 *   rolePremium: { count5: 0, count3: 5 },
 *   roleBasic: 10
 * }, { role: 'admin', count: 5 });
 *
 * // Server-side (C# component reads it)
 * // protected override VNode Render() {
 * //   return new VNode("div", $"Price: {State["decisionTree_0"]}");
 * // }
 * ```
 */
function useDecisionTree(tree, context, options) {
    if (!currentContext) {
        throw new Error('[minimact-trees] useDecisionTree must be called within a component render');
    }
    const componentContext = currentContext;
    const index = decisionTreeIndex++;
    const stateKey = `decisionTree_${index}`;
    // Initialize decision trees map if needed
    if (!componentContext.decisionTrees) {
        componentContext.decisionTrees = new Map();
    }
    // Evaluate tree
    const currentValue = evaluateTree(tree, context, options);
    // Check if value changed
    const existingState = componentContext.decisionTrees.get(stateKey);
    const previousValue = existingState?.currentValue;
    if (previousValue !== currentValue) {
        // Store new state
        componentContext.decisionTrees.set(stateKey, {
            tree,
            context,
            currentValue,
            options
        });
        // Sync to server
        syncToServer(componentContext, stateKey, currentValue, context);
    }
    return currentValue;
}
/**
 * Sync decision tree result to server
 *
 * @internal
 */
function syncToServer(context, stateKey, value, stateContext) {
    // Build state change object for HintQueue
    const stateChanges = {
        [stateKey]: value
    };
    // Check hint queue for cached patches
    const hint = context.hintQueue.matchHint(context.componentId, stateChanges);
    if (hint) {
        // 🟢 CACHE HIT! Apply patches immediately
        console.log(`[minimact-trees] 🟢 CACHE HIT! Hint '${hint.hintId}' matched ` +
            `(${hint.confidence.toFixed(2)} confidence, ${hint.patches.length} patches)`);
        context.domPatcher.applyPatches(context.element, hint.patches);
        if (context.playgroundBridge) {
            context.playgroundBridge.cacheHit({
                componentId: context.componentId,
                hintId: hint.hintId,
                confidence: hint.confidence,
                patchCount: hint.patches.length
            });
        }
    }
    else {
        // 🔴 CACHE MISS
        console.log(`[minimact-trees] 🔴 CACHE MISS for decision tree value: ${value}`);
        if (context.playgroundBridge) {
            context.playgroundBridge.cacheMiss({
                componentId: context.componentId,
                methodName: `decisionTree(${value})`,
                patchCount: 0
            });
        }
    }
    // Sync to server (keeps server state fresh)
    context.signalR
        .invoke('UpdateDecisionTreeState', {
        componentId: context.componentId,
        stateKey,
        value,
        context: stateContext
    })
        .catch((err) => {
        console.error('[minimact-trees] Failed to sync decision tree to server:', err);
    });
}
/**
 * Cleanup decision trees for a component
 *
 * @internal
 */
function cleanupDecisionTrees(context) {
    if (context.decisionTrees) {
        context.decisionTrees.clear();
    }
}

/**
 * minimact-trees - Universal State Machine
 *
 * 🌳 Decision trees that work with ANY value types
 *
 * XState but declarative, predictive, and minimal.
 */
// Integrated mode (with Minimact)
const VERSION = '0.1.0';
const CODENAME = 'Universal State Machine';

export { CODENAME, VERSION, cleanupDecisionTrees, clearComponentContext, debugParseKey, evaluateTree, findMatchingKeys, getAllPaths, getCurrentContext, matchesState, parseStateKey, setComponentContext, useDecisionTree };
