/**
 * Event Handler Extractor for Minimact Transpiler
 *
 * Extracts and processes JSX event handlers (onClick, onChange, etc.).
 * Handles inline arrow functions, method references, and curried functions.
 *
 * Examples:
 * - onClick={() => handleClick()} → Extract inline handler
 * - onClick={handleClick} → Method reference
 * - onClick={() => handleQuantityChange(-1)} → Handler with arguments
 * - onChange={(e) => setState(e.target.value)} → Event parameter handling
 *
 * Ported from:
 * - babel-plugin-minimact/src/extractors/eventHandlers.cjs (lines 1-186)
 */

/**
 * Check if attribute name is an event handler
 *
 * Event handlers start with 'on' followed by uppercase letter.
 * Examples: onClick, onChange, onSubmit, onKeyDown
 *
 * @param {string} attrName - Attribute name
 * @returns {boolean} - True if event handler
 */
function isEventHandler(attrName) {
  if (!attrName.startsWith('on') || attrName.length < 3) {
    return false;
  }

  // Check if third character is uppercase (onClick, onChange, etc.)
  return attrName[2] === attrName[2].toUpperCase();
}

/**
 * Extract event handler from attribute value
 *
 * Main entry point for event handler extraction.
 * Handles arrow functions, method references, and inline calls.
 *
 * Pattern from babel-plugin-minimact/src/extractors/eventHandlers.cjs (lines 10-179)
 *
 * @param {string} attrName - Event attribute name (e.g., 'onClick')
 * @param {Object} value - JSX attribute value node
 * @param {Object} component - Component context (tracks handlers, map context)
 * @param {Object} t - Babel types
 * @returns {string} - Handler name or registration string
 */
function extractEventHandler(attrName, value, component, t) {
  // String literal (rare, but possible)
  if (t.isStringLiteral(value)) {
    return value.value;
  }

  // Expression container: {handler} or {() => handler()}
  if (t.isJSXExpressionContainer(value)) {
    const expr = value.expression;

    // Arrow function or function expression: () => handler()
    if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
      return extractInlineHandler(attrName, expr, component, t);
    }

    // Method reference: {handleClick}
    if (t.isIdentifier(expr)) {
      return expr.name;
    }

    // Direct call expression (unusual): {someMethod()}
    if (t.isCallExpression(expr)) {
      return extractCallHandler(attrName, expr, component, t);
    }
  }

  return 'UnknownHandler';
}

/**
 * Extract inline arrow/function handler
 *
 * Handles inline functions with various patterns:
 * - Simple calls: () => func()
 * - Event parameters: (e) => func(e.target.value)
 * - Curried functions: (e) => (id) => action(id) [INVALID - error]
 * - Destructuring: ({ target: { value } }) => func(value)
 *
 * Pattern from babel-plugin-minimact/src/extractors/eventHandlers.cjs (lines 18-147)
 *
 * @param {string} eventName - Event name (onClick, onChange, etc.)
 * @param {Object} expr - Arrow/function expression node
 * @param {Object} component - Component context
 * @param {Object} t - Babel types
 * @returns {string} - Handler name with optional captured params
 */
function extractInlineHandler(eventName, expr, component, t) {
  const handlerName = `Handle${component.eventHandlers.length}`;
  const isAsync = expr.async || false;

  // VALIDATION: Detect curried functions (invalid pattern)
  // Pattern: (e) => (id) => action(id)
  if (t.isArrowFunctionExpression(expr.body) || t.isFunctionExpression(expr.body)) {
    // Generate error-throwing handler
    component.eventHandlers.push({
      name: handlerName,
      body: null,
      params: expr.params,
      capturedParams: [],
      isAsync: false,
      isCurriedError: true // Flag for code generator
    });

    return handlerName;
  }

  // TRANSFORMATION: Simplify (e) => func(e.target.value) to (value) => func(value)
  let body = expr.body;
  let params = expr.params;

  if (t.isCallExpression(body) && params.length === 1 && t.isIdentifier(params[0])) {
    const eventParam = params[0].name; // e.g., "e"
    const transformResult = transformEventTargetValue(body, eventParam, t);

    if (transformResult) {
      body = transformResult.body;
      params = transformResult.params;
    }
  }

  // CAPTURE: Loop variables from .map() context
  const capturedParams = component.currentMapContext
    ? component.currentMapContext.params
    : [];

  // TRANSFORMATION: Handle parameter destructuring
  // Convert ({ target: { value } }) => ... to (e) => with unpacking in body
  let processedBody = body;
  let processedParams = params;

  if (hasDestructuredParams(params, t)) {
    const destructResult = processDestructuring(params[0], body, t);
    if (destructResult) {
      processedBody = destructResult.body;
      processedParams = destructResult.params;
    }
  }

  // Register handler
  component.eventHandlers.push({
    name: handlerName,
    body: processedBody,
    params: processedParams,
    capturedParams: capturedParams, // e.g., ['item', 'index']
    isAsync: isAsync,
    eventName: eventName
  });

  // Return handler registration string
  // Format: "Handle0" or "Handle0:{item}:{index}" for captured params
  if (capturedParams.length > 0) {
    const capturedRefs = capturedParams.map(p => `{${p}}`).join(':');
    return `${handlerName}:${capturedRefs}`;
  }

  return handlerName;
}

/**
 * Extract call expression handler
 *
 * Handles direct call expressions (unusual pattern).
 * Example: onClick={someMethod()}
 *
 * Pattern from babel-plugin-minimact/src/extractors/eventHandlers.cjs (lines 153-175)
 *
 * @param {string} eventName - Event name
 * @param {Object} expr - Call expression node
 * @param {Object} component - Component context
 * @param {Object} t - Babel types
 * @returns {string} - Handler name with optional captured params
 */
function extractCallHandler(eventName, expr, component, t) {
  const handlerName = `Handle${component.eventHandlers.length}`;

  // Capture loop variables if in .map() context
  const capturedParams = component.currentMapContext
    ? component.currentMapContext.params
    : [];

  component.eventHandlers.push({
    name: handlerName,
    body: expr,
    params: [],
    capturedParams: capturedParams,
    eventName: eventName
  });

  // Return handler registration string
  if (capturedParams.length > 0) {
    const capturedRefs = capturedParams.map(p => `{${p}}`).join(':');
    return `${handlerName}:${capturedRefs}`;
  }

  return handlerName;
}

/**
 * Transform e.target.value pattern
 *
 * Simplifies: (e) => func(e.target.value) → (value) => func(value)
 *
 * Pattern from babel-plugin-minimact/src/extractors/eventHandlers.cjs (lines 47-69)
 *
 * @param {Object} callExpr - Call expression node
 * @param {string} eventParam - Event parameter name (e.g., 'e')
 * @param {Object} t - Babel types
 * @returns {Object|null} - {body, params} or null if no transformation
 */
function transformEventTargetValue(callExpr, eventParam, t) {
  const args = callExpr.arguments;
  let transformed = false;

  const transformedArgs = args.map(arg => {
    // Check if arg is e.target.value
    if (t.isMemberExpression(arg) &&
        t.isMemberExpression(arg.object) &&
        t.isIdentifier(arg.object.object, { name: eventParam }) &&
        t.isIdentifier(arg.object.property, { name: 'target' }) &&
        t.isIdentifier(arg.property, { name: 'value' })) {
      transformed = true;
      return t.identifier('value');
    }
    return arg;
  });

  if (transformed) {
    return {
      body: t.callExpression(callExpr.callee, transformedArgs),
      params: [t.identifier('value')]
    };
  }

  return null;
}

/**
 * Check if parameters include destructuring
 *
 * @param {Array} params - Parameter nodes
 * @param {Object} t - Babel types
 * @returns {boolean} - True if has destructuring
 */
function hasDestructuredParams(params, t) {
  return params.length === 1 && t.isObjectPattern(params[0]);
}

/**
 * Process parameter destructuring
 *
 * Converts: ({ target: { value } }) => func(value)
 * To: (e) => { var value = e.Target.Value; func(value); }
 *
 * Pattern from babel-plugin-minimact/src/extractors/eventHandlers.cjs (lines 74-128)
 *
 * @param {Object} pattern - ObjectPattern node
 * @param {Object} body - Function body
 * @param {Object} t - Babel types
 * @returns {Object} - {body, params}
 */
function processDestructuring(pattern, body, t) {
  const destructuringStatements = [];
  const eventParam = t.identifier('e');

  // Recursively extract destructured properties
  function extractDestructured(pat, path = []) {
    if (t.isObjectPattern(pat)) {
      for (const prop of pat.properties) {
        if (t.isObjectProperty(prop)) {
          const key = t.isIdentifier(prop.key) ? prop.key.name : null;

          if (key && t.isIdentifier(prop.value)) {
            // Simple: { value } or { target: targetValue }
            const varName = prop.value.name;
            const accessPath = [...path, key];
            destructuringStatements.push({ varName, accessPath });
          } else if (key && t.isObjectPattern(prop.value)) {
            // Nested: { target: { value } }
            extractDestructured(prop.value, [...path, key]);
          }
        }
      }
    }
  }

  extractDestructured(pattern);

  if (destructuringStatements.length === 0) {
    return null;
  }

  // Build destructuring assignments
  const assignments = destructuringStatements.map(({ varName, accessPath }) => {
    // Build e.Target.Value access chain (capitalize for C#)
    let access = eventParam;
    for (const key of accessPath) {
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      access = t.memberExpression(access, t.identifier(capitalizedKey));
    }

    return t.variableDeclaration('var', [
      t.variableDeclarator(t.identifier(varName), access)
    ]);
  });

  // Wrap body in block statement with destructuring
  let processedBody;
  if (t.isBlockStatement(body)) {
    processedBody = t.blockStatement([...assignments, ...body.body]);
  } else {
    processedBody = t.blockStatement([...assignments, t.expressionStatement(body)]);
  }

  return {
    body: processedBody,
    params: [eventParam]
  };
}

/**
 * Get event type from event name
 *
 * Maps event name to C# event type.
 * Examples: onClick → MouseEventArgs, onChange → ChangeEventArgs
 *
 * @param {string} eventName - Event name (onClick, onChange, etc.)
 * @returns {string} - C# event type
 */
function getEventType(eventName) {
  const typeMap = {
    onClick: 'MouseEventArgs',
    onDoubleClick: 'MouseEventArgs',
    onMouseDown: 'MouseEventArgs',
    onMouseUp: 'MouseEventArgs',
    onMouseMove: 'MouseEventArgs',
    onMouseEnter: 'MouseEventArgs',
    onMouseLeave: 'MouseEventArgs',
    onChange: 'ChangeEventArgs',
    onInput: 'ChangeEventArgs',
    onSubmit: 'EventArgs',
    onFocus: 'FocusEventArgs',
    onBlur: 'FocusEventArgs',
    onKeyDown: 'KeyboardEventArgs',
    onKeyUp: 'KeyboardEventArgs',
    onKeyPress: 'KeyboardEventArgs'
  };

  return typeMap[eventName] || 'EventArgs';
}

/**
 * Validate event handler
 *
 * Checks if handler is valid and provides warnings.
 *
 * @param {Object} handler - Handler info
 * @returns {boolean} - True if valid
 */
function validateEventHandler(handler) {
  if (handler.isCurriedError) {
    console.warn(`[Event Handlers] Curried function detected in ${handler.name} - this is invalid`);
    return false;
  }

  return true;
}

module.exports = {
  isEventHandler,
  extractEventHandler,
  extractInlineHandler,
  extractCallHandler,
  transformEventTargetValue,
  hasDestructuredParams,
  processDestructuring,
  getEventType,
  validateEventHandler
};
