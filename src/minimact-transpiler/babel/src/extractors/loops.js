/**
 * Loop Extractor for Minimact Transpiler
 *
 * Extracts array.map() loop patterns for predictive rendering.
 * This enables 100% coverage for list rendering with O(1) memory.
 *
 * Examples:
 * - {todos.map(todo => <li>{todo.text}</li>)}
 * - {items.map((item, i) => <div key={item.id}>{item.name}</div>)}
 * - {data.filter(x => x.active).map(x => <span>{x.label}</span>)}
 *
 * Reuses from old plugin:
 * - babel-plugin-minimact/src/extractors/loopTemplates.cjs → FULL FILE (lines 1-300+)
 */

const { buildMemberPath } = require('./bindings');

/**
 * Extract call expression (main entry point for loop detection)
 *
 * Determines if call expression is a .map() loop and extracts loop info.
 *
 * @param {Object} expr - Babel CallExpression node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @returns {Object|null} - Loop info or null if not a map
 */
function extractCallExpression(expr, parentPath, pathGen, t) {
  // Check if it's a .map() call
  if (t.isMemberExpression(expr.callee) &&
      t.isIdentifier(expr.callee.property) &&
      expr.callee.property.name === 'map') {
    return extractMapLoop(expr, parentPath, pathGen, t);
  }

  // Check for chained operations: items.filter(...).map(...)
  if (t.isMemberExpression(expr.callee) &&
      t.isCallExpression(expr.callee.object)) {
    return extractCallExpression(expr.callee.object, parentPath, pathGen, t);
  }

  return null;
}

/**
 * Extract map loop
 *
 * Extracts complete loop template from .map() call expression.
 *
 * Pattern from babel-plugin-minimact/src/extractors/loopTemplates.cjs (lines 120-164)
 *
 * @param {Object} callExpr - Babel CallExpression node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @returns {Object|null} - Loop template info or null
 */
function extractMapLoop(callExpr, parentPath, pathGen, t) {
  // Get array binding (the object being mapped)
  const arrayBinding = extractArrayBinding(callExpr.callee.object, t);
  if (!arrayBinding) {
    console.warn('[Loop Extractor] Could not extract array binding from .map()');
    return null;
  }

  // Get callback function (arrow function or function expression)
  const callback = callExpr.arguments[0];
  if (!t.isArrowFunctionExpression(callback) && !t.isFunctionExpression(callback)) {
    console.warn('[Loop Extractor] .map() callback is not a function');
    return null;
  }

  // Extract loop parameters
  const params = extractLoopParameters(callback, t);

  // Get JSX element returned by callback
  const jsxElement = extractLoopBody(callback, t);
  if (!jsxElement) {
    console.warn('[Loop Extractor] .map() callback does not return JSX element');
    return null;
  }

  // Extract key binding (if present)
  const keyBinding = extractKeyBinding(jsxElement, params.itemVar, params.indexVar, t);

  return {
    type: 'MapLoop',
    arrayBinding,
    itemVar: params.itemVar,
    indexVar: params.indexVar,
    keyBinding,
    body: jsxElement,
    // Note: The actual JSX traversal of the body will happen in the traverser
    // This just captures the structure metadata
  };
}

/**
 * Extract loop parameters from arrow function
 *
 * Gets item and index parameter names from .map() callback.
 *
 * Examples:
 * - (todo) => ... → { itemVar: "todo", indexVar: null }
 * - (todo, i) => ... → { itemVar: "todo", indexVar: "i" }
 * - (item, index) => ... → { itemVar: "item", indexVar: "index" }
 *
 * Pattern from babel-plugin-minimact/src/extractors/loopTemplates.cjs (lines 136-137)
 *
 * @param {Object} arrowFunc - Babel ArrowFunctionExpression or FunctionExpression
 * @param {Object} t - Babel types
 * @returns {Object} - { itemVar: string, indexVar: string|null }
 */
function extractLoopParameters(arrowFunc, t) {
  const params = arrowFunc.params;

  const itemVar = params[0] && t.isIdentifier(params[0])
    ? params[0].name
    : 'item';

  const indexVar = params[1] && t.isIdentifier(params[1])
    ? params[1].name
    : null;

  return { itemVar, indexVar };
}

/**
 * Extract loop body (JSX element from callback)
 *
 * Extracts the JSX element returned by the .map() callback.
 * Handles various callback patterns:
 * - Direct return: item => <li>{item}</li>
 * - Block return: item => { return <li>{item}</li> }
 * - Conditional: item => condition ? <div/> : <span/>
 * - Logical AND: item => condition && <div/>
 *
 * Pattern from babel-plugin-minimact/src/extractors/loopTemplates.cjs (lines 199-234)
 *
 * @param {Object} arrowFunc - Babel ArrowFunctionExpression or FunctionExpression
 * @param {Object} t - Babel types
 * @returns {Object|null} - JSX element or null
 */
function extractLoopBody(arrowFunc, t) {
  const body = arrowFunc.body;

  // Arrow function with direct JSX return: (...) => <li>...</li>
  if (t.isJSXElement(body)) {
    return body;
  }

  // JSX Fragment: (...) => <>...</>
  if (t.isJSXFragment(body)) {
    return body;
  }

  // Arrow function or function expression with block body
  if (t.isBlockStatement(body)) {
    // Find return statement
    for (const stmt of body.body) {
      if (t.isReturnStatement(stmt)) {
        if (t.isJSXElement(stmt.argument) || t.isJSXFragment(stmt.argument)) {
          return stmt.argument;
        }
      }
    }
  }

  // Conditional expression: condition ? <div/> : <span/>
  if (t.isConditionalExpression(body)) {
    // For now, take the consequent (true branch) as the representative structure
    // Full conditional handling will be done during traversal
    if (t.isJSXElement(body.consequent)) {
      return body.consequent;
    } else if (t.isJSXElement(body.alternate)) {
      return body.alternate;
    }
  }

  // Logical AND: condition && <div/>
  if (t.isLogicalExpression(body) && body.operator === '&&') {
    if (t.isJSXElement(body.right)) {
      return body.right;
    }
  }

  return null;
}

/**
 * Extract array binding from member expression
 *
 * Gets the variable name of the array being mapped.
 *
 * Examples:
 * - todos.map(...) → "todos"
 * - this.state.items.map(...) → "items"
 * - user.posts.map(...) → "posts"
 * - [...todos].map(...) → "todos"
 * - todos.filter(x => x.active).map(...) → "todos"
 *
 * Pattern from babel-plugin-minimact/src/extractors/loopTemplates.cjs (lines 174-194)
 *
 * @param {Object} expr - Babel expression node
 * @param {Object} t - Babel types
 * @returns {string|null} - Array binding name or null
 */
function extractArrayBinding(expr, t) {
  if (t.isIdentifier(expr)) {
    return expr.name;
  } else if (t.isMemberExpression(expr)) {
    // Build full member path for complex bindings
    return buildMemberPath(expr, t);
  } else if (t.isCallExpression(expr)) {
    // Handle array methods like .reverse(), .slice(), .filter()
    if (t.isMemberExpression(expr.callee)) {
      return extractArrayBinding(expr.callee.object, t);
    }
  } else if (t.isArrayExpression(expr)) {
    // Spread array: [...todos]
    if (expr.elements.length > 0 && t.isSpreadElement(expr.elements[0])) {
      return extractArrayBinding(expr.elements[0].argument, t);
    }
  }
  return null;
}

/**
 * Extract key binding from JSX element
 *
 * Finds the key attribute and extracts its binding.
 *
 * Examples:
 * - <li key={todo.id}> → "item.id"
 * - <div key={i}> → "index"
 * - <span key={`item-${item.id}`}> → "item.id" (simplified)
 *
 * Pattern from babel-plugin-minimact/src/extractors/loopTemplates.cjs (lines 241-280)
 *
 * @param {Object} jsxElement - Babel JSXElement node
 * @param {string} itemVar - Item variable name
 * @param {string|null} indexVar - Index variable name
 * @param {Object} t - Babel types
 * @returns {string|null} - Key binding or null
 */
function extractKeyBinding(jsxElement, itemVar, indexVar, t) {
  // Find key attribute
  const keyAttr = jsxElement.openingElement.attributes.find(
    attr => t.isJSXAttribute(attr) &&
            t.isIdentifier(attr.name) &&
            attr.name.name === 'key'
  );

  if (!keyAttr) return null;

  // Extract key expression
  if (t.isJSXExpressionContainer(keyAttr.value)) {
    const expr = keyAttr.value.expression;

    if (t.isIdentifier(expr)) {
      // Simple identifier: key={i}
      if (expr.name === indexVar) {
        return 'index';
      } else if (expr.name === itemVar) {
        return 'item';
      }
      return expr.name;
    } else if (t.isMemberExpression(expr)) {
      // Member expression: key={todo.id}
      const path = buildMemberPath(expr, t);

      // Replace item variable with "item" for consistency
      if (path.startsWith(`${itemVar}.`)) {
        return path.replace(`${itemVar}.`, 'item.');
      }

      return path;
    } else if (t.isTemplateLiteral(expr)) {
      // Template literal: key={`item-${todo.id}`}
      // Try to extract the main binding
      for (const expression of expr.expressions) {
        if (t.isMemberExpression(expression)) {
          const path = buildMemberPath(expression, t);
          if (path.startsWith(`${itemVar}.`)) {
            return path.replace(`${itemVar}.`, 'item.');
          }
        }
      }
    }
  } else if (t.isStringLiteral(keyAttr.value)) {
    // Static key: key="static"
    return keyAttr.value.value;
  }

  return null;
}

/**
 * Check if call expression is a map loop
 *
 * Quick check to determine if expression is a .map() call.
 *
 * @param {Object} expr - Babel CallExpression node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if .map() call
 */
function isMapLoop(expr, t) {
  return t.isCallExpression(expr) &&
         t.isMemberExpression(expr.callee) &&
         t.isIdentifier(expr.callee.property) &&
         expr.callee.property.name === 'map';
}

/**
 * Check if loop has key attribute
 *
 * @param {Object} loopInfo - Loop info object
 * @returns {boolean} - True if has key
 */
function hasKeyBinding(loopInfo) {
  return loopInfo && loopInfo.keyBinding !== null;
}

/**
 * Check if loop has index parameter
 *
 * @param {Object} loopInfo - Loop info object
 * @returns {boolean} - True if has index
 */
function hasIndexVar(loopInfo) {
  return loopInfo && loopInfo.indexVar !== null;
}

/**
 * Get loop body tag name (for quick inspection)
 *
 * @param {Object} loopInfo - Loop info object
 * @param {Object} t - Babel types
 * @returns {string|null} - Tag name or null
 */
function getLoopBodyTag(loopInfo, t) {
  if (!loopInfo || !loopInfo.body) return null;

  if (t.isJSXElement(loopInfo.body)) {
    return loopInfo.body.openingElement.name.name;
  }

  return null;
}

/**
 * Check if loop body is fragment
 *
 * @param {Object} loopInfo - Loop info object
 * @param {Object} t - Babel types
 * @returns {boolean} - True if fragment
 */
function isLoopBodyFragment(loopInfo, t) {
  return loopInfo && loopInfo.body && t.isJSXFragment(loopInfo.body);
}

/**
 * Validate loop info
 *
 * Ensures loop structure is valid and complete.
 *
 * @param {Object} loopInfo - Loop info object
 * @returns {boolean} - True if valid
 */
function validateLoop(loopInfo) {
  if (!loopInfo) return false;

  if (!loopInfo.arrayBinding) {
    console.warn('[Loop Extractor] Missing array binding');
    return false;
  }

  if (!loopInfo.itemVar) {
    console.warn('[Loop Extractor] Missing item variable');
    return false;
  }

  if (!loopInfo.body) {
    console.warn('[Loop Extractor] Missing loop body');
    return false;
  }

  return true;
}

module.exports = {
  extractCallExpression,
  extractMapLoop,
  extractLoopParameters,
  extractLoopBody,
  extractArrayBinding,
  extractKeyBinding,
  isMapLoop,
  hasKeyBinding,
  hasIndexVar,
  getLoopBodyTag,
  isLoopBodyFragment,
  validateLoop
};
