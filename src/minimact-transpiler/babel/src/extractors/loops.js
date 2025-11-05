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
 * @param {Array} loopContext - Loop context stack for nested loops (optional)
 * @returns {Object|null} - Loop info or null if not a map
 */
function extractCallExpression(expr, parentPath, pathGen, t, loopContext = []) {
  // Check if it's a .map() call
  if (t.isMemberExpression(expr.callee) &&
      t.isIdentifier(expr.callee.property) &&
      expr.callee.property.name === 'map') {
    return extractMapLoop(expr, parentPath, pathGen, t, loopContext);
  }

  // Check for chained operations: items.filter(...).map(...)
  if (t.isMemberExpression(expr.callee) &&
      t.isCallExpression(expr.callee.object)) {
    return extractCallExpression(expr.callee.object, parentPath, pathGen, t, loopContext);
  }

  return null;
}

/**
 * Extract map loop
 *
 * Extracts complete loop template from .map() call expression.
 * Supports nested loops by tracking loop context stack.
 *
 * IMPORTANT: This function also sets component.currentMapContext for event handler capture.
 *
 * Pattern from babel-plugin-minimact/src/extractors/loopTemplates.cjs (lines 120-164)
 *
 * @param {Object} callExpr - Babel CallExpression node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @param {Array} loopContext - Loop context stack for nested loops
 * @param {Object} component - Component context (optional, for event handler capture)
 * @returns {Object|null} - Loop template info or null
 */
function extractMapLoop(callExpr, parentPath, pathGen, t, loopContext = [], component = null) {
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

  // ✅ CRITICAL: Set currentMapContext for event handler capture
  // This enables event handlers inside loops to capture loop variables
  // Pattern from babel-plugin-minimact dist line 1352-1356
  const previousMapContext = component ? component.currentMapContext : null;

  if (component) {
    // Build params array from parent contexts + current context
    const previousParams = previousMapContext ? previousMapContext.params : [];
    const currentParams = [params.itemVar];
    if (params.indexVar) {
      currentParams.push(params.indexVar);
    }

    component.currentMapContext = {
      params: [...previousParams, ...currentParams]  // Accumulate all loop vars
    };
  }

  // Get JSX element returned by callback
  const jsxElement = extractLoopBody(callback, t);
  if (!jsxElement) {
    console.warn('[Loop Extractor] .map() callback does not return JSX element');

    // Restore previous context before returning
    if (component) {
      component.currentMapContext = previousMapContext;
    }

    return null;
  }

  // Extract key binding (if present)
  const keyBinding = extractKeyBinding(jsxElement, params.itemVar, params.indexVar, t);

  // Create new loop context for this loop
  const newContext = {
    itemVar: params.itemVar,
    indexVar: params.indexVar,
    arrayBinding,
    depth: loopContext.length
  };

  const loopInfo = {
    type: 'MapLoop',
    arrayBinding,
    itemVar: params.itemVar,
    indexVar: params.indexVar,
    keyBinding,
    body: jsxElement,
    loopContext: [...loopContext, newContext], // Stack of parent loops + this loop
    depth: loopContext.length, // 0 for top-level, 1 for first nested, etc.
    // Note: The actual JSX traversal of the body will happen in the traverser
    // The traverser should pass loopContext when traversing the body
    previousMapContext  // Store for restoration after traversal
  };

  return loopInfo;
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

/**
 * Check if loop is nested
 *
 * @param {Object} loopInfo - Loop info object
 * @returns {boolean} - True if nested (depth > 0)
 */
function isNestedLoop(loopInfo) {
  return loopInfo && loopInfo.depth > 0;
}

/**
 * Get loop depth
 *
 * @param {Object} loopInfo - Loop info object
 * @returns {number} - Loop depth (0 for top-level, 1+ for nested)
 */
function getLoopDepth(loopInfo) {
  return loopInfo ? (loopInfo.depth || 0) : 0;
}

/**
 * Get loop context stack
 *
 * Returns the full stack of loop contexts (parent loops + current loop).
 *
 * @param {Object} loopInfo - Loop info object
 * @returns {Array} - Array of loop context objects
 */
function getLoopContext(loopInfo) {
  return loopInfo && loopInfo.loopContext ? loopInfo.loopContext : [];
}

/**
 * Get parent loop context
 *
 * Returns the immediate parent loop context (if nested).
 *
 * @param {Object} loopInfo - Loop info object
 * @returns {Object|null} - Parent loop context or null
 */
function getParentLoopContext(loopInfo) {
  if (!loopInfo || !loopInfo.loopContext || loopInfo.loopContext.length <= 1) {
    return null;
  }

  // Return the second-to-last item (parent of current loop)
  return loopInfo.loopContext[loopInfo.loopContext.length - 2];
}

/**
 * Check if identifier is loop variable
 *
 * Checks if an identifier matches any loop variable in the context stack.
 *
 * @param {string} identifierName - Identifier name to check
 * @param {Array} loopContext - Loop context stack
 * @returns {boolean} - True if identifier is a loop variable
 */
function isLoopVariable(identifierName, loopContext) {
  if (!loopContext || loopContext.length === 0) {
    return false;
  }

  for (const ctx of loopContext) {
    if (identifierName === ctx.itemVar || identifierName === ctx.indexVar) {
      return true;
    }
  }

  return false;
}

/**
 * Restore map context after loop traversal
 *
 * CRITICAL: Must be called after traversing loop body to restore previous context.
 * This enables proper nesting of event handlers in nested loops.
 *
 * Usage pattern:
 * ```javascript
 * const loopInfo = extractMapLoop(expr, parentPath, pathGen, t, loopContext, component);
 * if (loopInfo) {
 *   // Traverse loop body...
 *   restoreMapContext(loopInfo, component);
 * }
 * ```
 *
 * @param {Object} loopInfo - Loop info returned from extractMapLoop
 * @param {Object} component - Component context
 */
function restoreMapContext(loopInfo, component) {
  if (component && loopInfo && loopInfo.previousMapContext !== undefined) {
    component.currentMapContext = loopInfo.previousMapContext;
  }
}

/**
 * Get captured params for event handler
 *
 * Returns the array of loop variables that should be captured by event handlers.
 * This is used by the event handler extractor.
 *
 * @param {Object} component - Component context
 * @returns {Array} - Array of captured param names (e.g., ['category', 'catIndex', 'item', 'itemIndex'])
 */
function getCapturedParams(component) {
  return component && component.currentMapContext
    ? component.currentMapContext.params
    : [];
}

/**
 * Resolve binding in loop context
 *
 * Resolves a binding path considering loop variables.
 * Returns both the resolved binding and depth information for index variables.
 *
 * Examples:
 * - "todo.name" in context where itemVar="todo" → { binding: "item.name", depth: null }
 * - "catIndex" in parent loop → { binding: "index", depth: 0 }
 * - "itemIndex" in nested loop → { binding: "index", depth: 1 }
 *
 * @param {string} binding - Original binding path
 * @param {Array} loopContext - Loop context stack
 * @returns {string|Object} - Resolved binding (string) or { binding, depth } for index vars
 */
function resolveBindingInLoopContext(binding, loopContext) {
  if (!loopContext || loopContext.length === 0) {
    return binding;
  }

  // Check each loop context (most nested first)
  for (let i = loopContext.length - 1; i >= 0; i--) {
    const ctx = loopContext[i];

    // Replace loop item variable with generic "item"
    if (binding.startsWith(`${ctx.itemVar}.`)) {
      return binding.replace(`${ctx.itemVar}.`, 'item.');
    } else if (binding === ctx.itemVar) {
      return 'item';
    }

    // Replace loop index variable with generic "index" + depth info
    if (binding === ctx.indexVar) {
      return {
        binding: 'index',
        depth: ctx.depth,
        isLoopIndex: true,
        originalName: ctx.indexVar  // Keep original for debugging
      };
    }
  }

  return binding;
}

/**
 * Check if resolved binding is a loop index
 *
 * @param {string|Object} resolvedBinding - Result from resolveBindingInLoopContext()
 * @returns {boolean} - True if it's a loop index variable
 */
function isResolvedLoopIndex(resolvedBinding) {
  return typeof resolvedBinding === 'object' && resolvedBinding.isLoopIndex === true;
}

/**
 * Get loop index depth
 *
 * Returns the depth of a loop index variable (0 for parent, 1 for nested, etc.)
 *
 * @param {string|Object} resolvedBinding - Result from resolveBindingInLoopContext()
 * @returns {number|null} - Depth or null if not a loop index
 */
function getLoopIndexDepth(resolvedBinding) {
  return isResolvedLoopIndex(resolvedBinding) ? resolvedBinding.depth : null;
}

/**
 * Get normalized binding name
 *
 * Extracts the binding string whether it's a simple string or object.
 *
 * @param {string|Object} resolvedBinding - Result from resolveBindingInLoopContext()
 * @returns {string} - Binding name
 */
function getBindingName(resolvedBinding) {
  return typeof resolvedBinding === 'object' ? resolvedBinding.binding : resolvedBinding;
}

/**
 * Format binding for C# code generation
 *
 * Converts resolved binding to a format suitable for C# code generation:
 * - "item.name" → "item.name"
 * - { binding: 'index', depth: 0 } → "parentIndex" or "outerIndex"
 * - { binding: 'index', depth: 1 } → "currentIndex" or "innerIndex"
 *
 * @param {string|Object} resolvedBinding - Result from resolveBindingInLoopContext()
 * @param {Object} options - Formatting options
 * @param {string} options.indexNaming - "qualified" (depth-based) or "simple" (just "index")
 * @returns {string} - Formatted binding for C#
 */
function formatBindingForCSharp(resolvedBinding, options = {}) {
  const { indexNaming = 'qualified' } = options;

  if (!isResolvedLoopIndex(resolvedBinding)) {
    return resolvedBinding;
  }

  const depth = resolvedBinding.depth;

  if (indexNaming === 'simple') {
    return 'index';
  }

  // Qualified naming with depth
  if (indexNaming === 'qualified') {
    if (depth === 0) {
      return 'outerIndex';
    } else if (depth === 1) {
      return 'innerIndex';
    } else {
      return `index_depth${depth}`;
    }
  }

  // Numeric suffix (index0, index1, index2, ...)
  if (indexNaming === 'numeric') {
    return `index${depth}`;
  }

  return 'index';
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
  validateLoop,
  isNestedLoop,
  getLoopDepth,
  getLoopContext,
  getParentLoopContext,
  isLoopVariable,
  resolveBindingInLoopContext,
  isResolvedLoopIndex,
  getLoopIndexDepth,
  getBindingName,
  formatBindingForCSharp,
  restoreMapContext,
  getCapturedParams
};
