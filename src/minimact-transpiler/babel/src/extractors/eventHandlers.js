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
 * Extract block statement handler (multiple statements)
 *
 * Handles event handlers with multiple statements:
 * onClick={() => {
 *   console.log('Clicked');
 *   setCount(count + 1);
 *   alert('Updated!');
 * }}
 *
 * Pattern from babel-plugin-minimact/src/extractors/eventHandlers.cjs (lines 120-150)
 *
 * @param {Object} blockStatement - BlockStatement node
 * @param {Object} component - Component context (for tracking dependencies)
 * @param {Object} t - Babel types
 * @returns {Array} - Array of statement info objects
 */
function extractBlockStatementHandler(blockStatement, component, t) {
  const statements = [];

  for (const stmt of blockStatement.body) {
    if (t.isExpressionStatement(stmt)) {
      const expr = stmt.expression;

      if (t.isCallExpression(expr)) {
        // Function call: setCount(...), alert(...), console.log(...), etc.
        statements.push({
          type: 'Call',
          callee: extractCallee(expr.callee, t),
          arguments: extractArguments(expr.arguments, t)
        });
      } else if (t.isAssignmentExpression(expr)) {
        // Assignment: count = 5
        statements.push({
          type: 'Assignment',
          operator: expr.operator,
          left: extractExpression(expr.left, t),
          right: extractExpression(expr.right, t)
        });
      } else {
        // Other expression statement
        statements.push({
          type: 'ExpressionStatement',
          expression: extractExpression(expr, t)
        });
      }
    } else if (t.isIfStatement(stmt)) {
      // if statement in handler
      statements.push({
        type: 'If',
        condition: extractExpression(stmt.test, t),
        consequent: t.isBlockStatement(stmt.consequent)
          ? extractBlockStatementHandler(stmt.consequent, component, t)
          : [{ type: 'ExpressionStatement', expression: extractExpression(stmt.consequent, t) }],
        alternate: stmt.alternate
          ? (t.isBlockStatement(stmt.alternate)
              ? extractBlockStatementHandler(stmt.alternate, component, t)
              : [{ type: 'ExpressionStatement', expression: extractExpression(stmt.alternate, t) }])
          : null
      });
    } else if (t.isReturnStatement(stmt)) {
      // return statement
      statements.push({
        type: 'Return',
        value: stmt.argument ? extractExpression(stmt.argument, t) : null
      });
    } else if (t.isVariableDeclaration(stmt)) {
      // Variable declaration: const x = 5;
      statements.push({
        type: 'VariableDeclaration',
        kind: stmt.kind, // const, let, var
        declarations: stmt.declarations.map(decl => ({
          name: t.isIdentifier(decl.id) ? decl.id.name : extractExpression(decl.id, t),
          init: decl.init ? extractExpression(decl.init, t) : null
        }))
      });
    } else {
      // Other statement types (for, while, switch, etc.)
      // Store the node itself for special handling by C# visitor
      statements.push({
        type: 'UnsupportedStatement',
        statementType: stmt.type,
        _astNode: stmt
      });
    }
  }

  return statements;
}

/**
 * Extract callee from call expression
 *
 * Examples:
 * - setCount → "setCount"
 * - console.log → "console.log"
 * - obj.method.call → "obj.method.call"
 *
 * @param {Object} callee - Callee node
 * @param {Object} t - Babel types
 * @returns {string|Object} - Callee string or expression object for complex cases
 */
function extractCallee(callee, t) {
  if (t.isIdentifier(callee)) {
    return callee.name;
  }

  if (t.isMemberExpression(callee)) {
    const object = extractCallee(callee.object, t);
    const property = t.isIdentifier(callee.property)
      ? callee.property.name
      : extractExpression(callee.property, t);

    // If object is a string and property is a string, join them
    if (typeof object === 'string' && typeof property === 'string') {
      return `${object}.${property}`;
    }

    // Otherwise return structured form
    return {
      type: 'MemberAccess',
      object: object,
      property: property,
      computed: callee.computed
    };
  }

  // Complex callee (function call result, etc.)
  return extractExpression(callee, t);
}

/**
 * Extract arguments from call expression
 *
 * @param {Array} args - Argument nodes
 * @param {Object} t - Babel types
 * @returns {Array} - Array of argument info objects
 */
function extractArguments(args, t) {
  return args.map(arg => extractExpression(arg, t));
}

/**
 * Extract expression metadata for C# code generation
 *
 * Instead of generating code strings, we extract structured metadata
 * that C# can understand and regenerate in C# syntax.
 *
 * Examples:
 * - count + 1 → { type: 'Binary', operator: '+', left: 'count', right: 1 }
 * - user.name → { type: 'Member', path: 'user.name' }
 * - alert('Hi') → { type: 'Call', callee: 'alert', args: [{ type: 'String', value: 'Hi' }] }
 *
 * @param {Object} node - AST node
 * @param {Object} t - Babel types
 * @returns {Object} - Expression metadata
 */
function extractExpression(node, t) {
  if (t.isIdentifier(node)) {
    return { type: 'Identifier', name: node.name };
  }

  if (t.isNumericLiteral(node)) {
    return { type: 'Numeric', value: node.value };
  }

  if (t.isStringLiteral(node)) {
    return { type: 'String', value: node.value };
  }

  if (t.isBooleanLiteral(node)) {
    return { type: 'Boolean', value: node.value };
  }

  if (t.isNullLiteral(node)) {
    return { type: 'Null' };
  }

  if (t.isMemberExpression(node)) {
    return {
      type: 'Member',
      object: extractExpression(node.object, t),
      property: t.isIdentifier(node.property) ? node.property.name : extractExpression(node.property, t),
      computed: node.computed
    };
  }

  if (t.isBinaryExpression(node)) {
    return {
      type: 'Binary',
      operator: node.operator,
      left: extractExpression(node.left, t),
      right: extractExpression(node.right, t)
    };
  }

  if (t.isLogicalExpression(node)) {
    return {
      type: 'Logical',
      operator: node.operator,
      left: extractExpression(node.left, t),
      right: extractExpression(node.right, t)
    };
  }

  if (t.isUnaryExpression(node)) {
    return {
      type: 'Unary',
      operator: node.operator,
      argument: extractExpression(node.argument, t),
      prefix: node.prefix
    };
  }

  if (t.isCallExpression(node)) {
    return {
      type: 'Call',
      callee: extractCallee(node.callee, t),
      arguments: extractArguments(node.arguments, t)
    };
  }

  if (t.isConditionalExpression(node)) {
    return {
      type: 'Conditional',
      test: extractExpression(node.test, t),
      consequent: extractExpression(node.consequent, t),
      alternate: extractExpression(node.alternate, t)
    };
  }

  if (t.isArrayExpression(node)) {
    return {
      type: 'Array',
      elements: node.elements.map(el => el ? extractExpression(el, t) : { type: 'Null' })
    };
  }

  if (t.isObjectExpression(node)) {
    return {
      type: 'Object',
      properties: node.properties.map(prop => {
        if (t.isObjectProperty(prop)) {
          return {
            key: t.isIdentifier(prop.key) ? prop.key.name : extractExpression(prop.key, t),
            value: extractExpression(prop.value, t)
          };
        }
        return { type: 'Unknown' };
      })
    };
  }

  // Fallback for complex/unsupported expressions
  return {
    type: 'Complex',
    nodeType: node.type,
    // Store the node itself for later analysis if needed
    _astNode: node
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
  extractBlockStatementHandler,
  extractCallee,
  extractArguments,
  extractExpression,
  getEventType,
  validateEventHandler
};
