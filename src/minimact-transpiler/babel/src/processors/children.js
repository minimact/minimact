/**
 * Child Node Processor for Minimact Transpiler
 *
 * Handles processing of JSX children arrays - mixed content including:
 * - JSXElement (nested elements)
 * - JSXText (static text)
 * - JSXExpressionContainer (dynamic expressions)
 * - JSXFragment (fragments to flatten)
 *
 * This module delegates to the traverser for recursive processing.
 */

const { createStaticText } = require('../nodes');

/**
 * Process children array of JSX element
 *
 * Handles mixed content while maintaining sibling order and assigning
 * sequential hex paths. This is the main entry point for child processing.
 *
 * @param {Array} children - Array of Babel AST child nodes
 * @param {string} parentPath - Parent hex path (e.g., "10000000")
 * @param {HexPathGenerator} pathGen - Hex path generator instance
 * @param {Object} t - Babel types
 * @param {Object} context - Traversal context with processors
 * @returns {Array} - Array of processed child JSON nodes
 */
function processChildren(children, parentPath, pathGen, t, context) {
  const result = [];

  for (const child of children) {
    if (t.isJSXElement(child)) {
      // Nested JSX element - recurse via traverser
      const childNode = processJSXElementChild(child, parentPath, pathGen, t, context);
      if (childNode) {
        result.push(childNode);
      }
    } else if (t.isJSXText(child)) {
      // Static text node
      const textNode = processTextChild(child, parentPath, pathGen, t, context);
      if (textNode) {
        result.push(textNode);
      }
    } else if (t.isJSXExpressionContainer(child)) {
      // Expression container - could be structural JSX or dynamic content
      const exprNode = processExpressionChild(child, parentPath, pathGen, t, context);
      if (exprNode) {
        result.push(exprNode);
      }
    } else if (t.isJSXFragment(child)) {
      // Fragment: <>...</> - flatten children into parent
      const fragmentChildren = processFragmentChild(child, parentPath, pathGen, t, context);
      result.push(...fragmentChildren);
    }
  }

  return result;
}

/**
 * Process JSXElement child
 *
 * Delegates to the traverser for recursive JSX element processing.
 *
 * @param {Object} element - Babel JSXElement node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @param {Object} context - Traversal context
 * @returns {Object|null} - JSON node or null
 */
function processJSXElementChild(element, parentPath, pathGen, t, context) {
  // Import traverseJSX from traverser (avoid circular dependency by using context)
  if (context.traverseJSX) {
    return context.traverseJSX(element, parentPath, pathGen, t, context);
  }

  console.warn('[Children Processor] No traverseJSX function in context');
  return null;
}

/**
 * Process static text node
 *
 * Extracts text content, trims whitespace, and creates StaticText JSON node.
 * Empty/whitespace-only text nodes are filtered out.
 *
 * @param {Object} textNode - Babel JSXText node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @param {Object} context - Traversal context (for logging)
 * @returns {Object|null} - StaticText node or null if empty
 */
function processTextChild(textNode, parentPath, pathGen, t, context) {
  const text = textNode.value.trim();

  if (!text) {
    // Empty or whitespace-only text - skip
    return null;
  }

  // Generate hex path for text node
  const textHex = pathGen.next(parentPath);
  const textPath = pathGen.buildPath(parentPath, textHex);
  const textSegments = pathGen.parsePath(textPath);

  // Log for debugging
  const preview = text.length > 20 ? `${text.substring(0, 20)}...` : text;
  context.log(`    [Text] "${preview}" → ${textPath}`);

  return createStaticText(textPath, textSegments, text);
}

/**
 * Process expression container child
 *
 * Determines if expression is structural (contains JSX) or dynamic (data binding).
 * Delegates to appropriate processor based on expression type.
 *
 * Structural expressions (contain JSX elements):
 * - Logical AND: {isVisible && <Modal />}
 * - Ternary: {isAdmin ? <AdminPanel /> : <UserPanel />}
 * - Array.map: {items.map(item => <li>{item}</li>)}
 *
 * Dynamic expressions (data bindings):
 * - Identifiers: {count}
 * - Member expressions: {user.name}
 * - Template literals: {`Count: ${count}`}
 * - etc.
 *
 * @param {Object} container - Babel JSXExpressionContainer node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @param {Object} context - Traversal context
 * @returns {Object|null} - JSON node or null
 */
function processExpressionChild(container, parentPath, pathGen, t, context) {
  const expr = container.expression;

  // Check if structural (contains JSX elements)
  const isStructural = isStructuralExpression(expr, t);

  if (isStructural) {
    // Structural JSX - traverse branches via structural expression handler
    return processStructuralExpression(expr, parentPath, pathGen, t, context);
  } else {
    // Dynamic content - delegate to expression processor
    if (context.processExpression) {
      return context.processExpression(expr, parentPath, pathGen, t);
    }

    console.warn('[Children Processor] No processExpression function in context');
    return null;
  }
}

/**
 * Process fragment child
 *
 * Fragments don't create wrapper nodes - their children become direct siblings.
 * This flattens the fragment's children into the parent's children array.
 *
 * Example:
 * <div>
 *   <>
 *     <h1>Title</h1>
 *     <p>Content</p>
 *   </>
 * </div>
 *
 * Becomes:
 * <div>
 *   <h1>Title</h1>
 *   <p>Content</p>
 * </div>
 *
 * @param {Object} fragment - Babel JSXFragment node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @param {Object} context - Traversal context
 * @returns {Array} - Array of flattened child nodes
 */
function processFragmentChild(fragment, parentPath, pathGen, t, context) {
  context.log(`    [Fragment] Flattening fragment children`);

  // Recursively process fragment's children
  // They inherit the parent's path (not the fragment's)
  return processChildren(fragment.children, parentPath, pathGen, t, context);
}

/**
 * Check if expression is structural (contains JSX)
 *
 * Structural expressions contain JSX elements and need special traversal:
 * - JSXElement: {<Component />}
 * - JSXFragment: {<>...</>}
 * - Logical AND with JSX right side: {isVisible && <Modal />}
 * - Ternary with JSX branches: {isAdmin ? <Admin /> : <User />}
 * - Array.map with JSX body: {items.map(item => <li>{item}</li>)}
 *
 * Pattern from old plugin: babel-plugin-minimact/src/extractors/templates.cjs (lines 332-340)
 *
 * @param {Object} expr - Babel expression node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if structural
 */
function isStructuralExpression(expr, t) {
  // Direct JSX
  if (t.isJSXElement(expr) || t.isJSXFragment(expr)) {
    return true;
  }

  // Empty expression (should be rare)
  if (t.isJSXEmptyExpression(expr)) {
    return true;
  }

  // Logical AND with JSX: {isVisible && <Modal />}
  if (t.isLogicalExpression(expr) &&
      (t.isJSXElement(expr.right) || t.isJSXFragment(expr.right))) {
    return true;
  }

  // Ternary with JSX: {isAdmin ? <Admin /> : <User />}
  if (t.isConditionalExpression(expr) &&
      (t.isJSXElement(expr.consequent) || t.isJSXElement(expr.alternate) ||
       t.isJSXFragment(expr.consequent) || t.isJSXFragment(expr.alternate))) {
    return true;
  }

  // Array.map with JSX: {items.map(item => <li>{item}</li>)}
  if (t.isCallExpression(expr) &&
      t.isMemberExpression(expr.callee) &&
      t.isIdentifier(expr.callee.property) &&
      expr.callee.property.name === 'map') {
    return true;
  }

  return false;
}

/**
 * Process structural expression
 *
 * Handles expressions that contain JSX elements:
 * - Logical AND: {isAdmin && <div>Admin Panel</div>}
 * - Ternary: {isAdmin ? <AdminPanel/> : <UserPanel/>}
 * - Array.map: {items.map(item => <li>{item}</li>)}
 * - Direct JSX: {<Component />}
 *
 * Pattern from old plugin: babel-plugin-minimact/src/extractors/templates.cjs (lines 404-421)
 *
 * @param {Object} expr - Babel expression node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @param {Object} context - Traversal context
 * @returns {Object|null} - Processed node or null
 */
function processStructuralExpression(expr, parentPath, pathGen, t, context) {
  if (t.isLogicalExpression(expr) && expr.operator === '&&') {
    // Logical AND: {isAdmin && <div>Admin Panel</div>}
    context.log(`    [Structural] Logical AND (&&) - delegating to expression processor`);

    // Delegate to expression processor which will handle conditional extraction
    if (context.processExpression) {
      return context.processExpression(expr, parentPath, pathGen, t);
    }
  } else if (t.isConditionalExpression(expr)) {
    // Ternary: {isAdmin ? <AdminPanel/> : <UserPanel/>}
    context.log(`    [Structural] Ternary (? :) - delegating to expression processor`);

    // Delegate to expression processor which will handle conditional extraction
    if (context.processExpression) {
      return context.processExpression(expr, parentPath, pathGen, t);
    }
  } else if (t.isCallExpression(expr) &&
             t.isMemberExpression(expr.callee) &&
             t.isIdentifier(expr.callee.property) &&
             expr.callee.property.name === 'map') {
    // Array.map: {items.map(item => <li>{item}</li>)}
    context.log(`    [Structural] Array.map - delegating to expression processor`);

    // Delegate to expression processor which will handle loop extraction
    if (context.processExpression) {
      return context.processExpression(expr, parentPath, pathGen, t);
    }
  } else if (t.isJSXFragment(expr)) {
    // Fragment: {<>...</>}
    return processFragmentChild(expr, parentPath, pathGen, t, context);
  } else if (t.isJSXElement(expr)) {
    // Direct JSX element: {<Component />}
    if (context.traverseJSX) {
      return context.traverseJSX(expr, parentPath, pathGen, t, context);
    }
  }

  console.warn(`[Children Processor] Unhandled structural expression type: ${expr.type}`);
  return null;
}

module.exports = {
  processChildren,
  processTextChild,
  processExpressionChild,
  processFragmentChild,
  isStructuralExpression,
  processStructuralExpression
};
