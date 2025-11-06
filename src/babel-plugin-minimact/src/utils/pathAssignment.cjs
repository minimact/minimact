/**
 * Path Assignment Pass for Minimact
 *
 * CRITICAL: This is the FIRST PASS that runs before any extraction.
 * It assigns hex paths to every JSX node by mutating the AST.
 *
 * Problem it solves:
 * - Old system: Each extractor recalculated paths independently
 * - Result: Path mismatches between template/attribute/handler extractors
 *
 * Solution:
 * - Single pass assigns paths and stores in node.__minimactPath
 * - All extractors read from node.__minimactPath (no recalculation!)
 *
 * Usage:
 *   const pathGen = new HexPathGenerator();
 *   assignPathsToJSX(jsxRoot, '', pathGen, t);
 *   // Now all JSX nodes have __minimactPath metadata
 */

const { HexPathGenerator } = require('./hexPath.cjs');

/**
 * Assign hex paths to all JSX nodes in tree
 *
 * Mutates AST by adding __minimactPath and __minimactPathSegments to each node.
 * This ensures consistent paths across all subsequent extractors.
 *
 * @param {Object} node - Babel AST node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 */
function assignPathsToJSX(node, parentPath, pathGen, t) {
  if (t.isJSXElement(node)) {
    // Generate hex path for this element
    const childHex = pathGen.next(parentPath);
    const currentPath = pathGen.buildPath(parentPath, childHex);
    const pathSegments = pathGen.parsePath(currentPath);

    // Mutate AST node with path data
    node.__minimactPath = currentPath;
    node.__minimactPathSegments = pathSegments;

    // Process attributes (for @attributeName paths)
    if (node.openingElement && node.openingElement.attributes) {
      for (const attr of node.openingElement.attributes) {
        if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
          const attrName = attr.name.name;
          const attrPath = `${currentPath}.@${attrName}`;

          // Mutate attribute node with path
          attr.__minimactPath = attrPath;
          attr.__minimactPathSegments = [...pathSegments, `@${attrName}`];
        }
      }
    }

    // Recursively assign paths to children
    if (node.children) {
      assignPathsToChildren(node.children, currentPath, pathGen, t);
    }
  } else if (t.isJSXFragment(node)) {
    // Fragments don't get paths - children become direct siblings
    if (node.children) {
      assignPathsToChildren(node.children, parentPath, pathGen, t);
    }
  }
}

/**
 * Assign paths to JSX children array
 *
 * Handles mixed content: JSXElement, JSXText, JSXExpressionContainer, JSXFragment
 *
 * @param {Array} children - Array of Babel AST nodes
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 */
function assignPathsToChildren(children, parentPath, pathGen, t) {
  for (const child of children) {
    if (t.isJSXElement(child)) {
      // Nested JSX element
      assignPathsToJSX(child, parentPath, pathGen, t);
    } else if (t.isJSXText(child)) {
      // Static text node
      const text = child.value.trim();
      if (text) {
        const textHex = pathGen.next(parentPath);
        const textPath = pathGen.buildPath(parentPath, textHex);
        const textSegments = pathGen.parsePath(textPath);

        // Mutate text node with path
        child.__minimactPath = textPath;
        child.__minimactPathSegments = textSegments;
      }
    } else if (t.isJSXExpressionContainer(child)) {
      // Expression container - assign path and recurse into structural JSX
      const expr = child.expression;

      // Skip JSX comments (empty expressions like {/* comment */})
      if (t.isJSXEmptyExpression(expr)) {
        // Don't assign path, don't increment counter - comments are ignored
        continue;
      }

      // Generate path for the expression container
      const exprHex = pathGen.next(parentPath);
      const exprPath = pathGen.buildPath(parentPath, exprHex);
      const exprSegments = pathGen.parsePath(exprPath);

      // Mutate expression container with path
      child.__minimactPath = exprPath;
      child.__minimactPathSegments = exprSegments;

      // Recurse into structural expressions (conditionals, loops)
      assignPathsToExpression(expr, exprPath, pathGen, t);
    } else if (t.isJSXFragment(child)) {
      // Fragment - flatten children
      assignPathsToJSX(child, parentPath, pathGen, t);
    }
  }
}

/**
 * Assign paths to expressions containing JSX
 *
 * Handles:
 * - Logical AND: {isVisible && <Modal />}
 * - Ternary: {isAdmin ? <AdminPanel /> : <UserPanel />}
 * - Array.map: {items.map(item => <li>{item}</li>)}
 *
 * @param {Object} expr - Babel expression node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 */
function assignPathsToExpression(expr, parentPath, pathGen, t) {
  if (!expr) return;

  if (t.isLogicalExpression(expr) && expr.operator === '&&') {
    // Logical AND: {isAdmin && <div>Admin Panel</div>}
    if (t.isJSXElement(expr.right)) {
      assignPathsToJSX(expr.right, parentPath, pathGen, t);
    } else if (t.isJSXExpressionContainer(expr.right)) {
      assignPathsToExpression(expr.right.expression, parentPath, pathGen, t);
    }
  } else if (t.isConditionalExpression(expr)) {
    // Ternary: {isAdmin ? <AdminPanel/> : <UserPanel/>}

    // Assign paths to consequent (true branch)
    if (t.isJSXElement(expr.consequent)) {
      assignPathsToJSX(expr.consequent, parentPath, pathGen, t);
    } else if (t.isJSXExpressionContainer(expr.consequent)) {
      assignPathsToExpression(expr.consequent.expression, parentPath, pathGen, t);
    }

    // Assign paths to alternate (false branch)
    if (expr.alternate) {
      if (t.isJSXElement(expr.alternate)) {
        assignPathsToJSX(expr.alternate, parentPath, pathGen, t);
      } else if (t.isJSXExpressionContainer(expr.alternate)) {
        assignPathsToExpression(expr.alternate.expression, parentPath, pathGen, t);
      }
    }
  } else if (t.isCallExpression(expr) &&
             t.isMemberExpression(expr.callee) &&
             t.isIdentifier(expr.callee.property) &&
             expr.callee.property.name === 'map') {
    // Array.map: {items.map(item => <li>{item}</li>)}

    const callback = expr.arguments[0];
    if (t.isArrowFunctionExpression(callback) || t.isFunctionExpression(callback)) {
      const body = callback.body;

      if (t.isJSXElement(body)) {
        // Arrow function with JSX body: item => <li>{item}</li>
        assignPathsToJSX(body, parentPath, pathGen, t);
      } else if (t.isBlockStatement(body)) {
        // Arrow function with block: item => { return <li>{item}</li>; }
        const returnStmt = body.body.find(stmt => t.isReturnStatement(stmt));
        if (returnStmt && t.isJSXElement(returnStmt.argument)) {
          assignPathsToJSX(returnStmt.argument, parentPath, pathGen, t);
        }
      }
    }
  } else if (t.isJSXFragment(expr)) {
    // Fragment
    assignPathsToJSX(expr, parentPath, pathGen, t);
  } else if (t.isJSXElement(expr)) {
    // Direct JSX element
    assignPathsToJSX(expr, parentPath, pathGen, t);
  }
}

/**
 * Get path from AST node (helper for extractors)
 *
 * Reads __minimactPath metadata assigned by this pass.
 * Throws error if path wasn't assigned (indicates bug).
 *
 * @param {Object} node - Babel AST node
 * @returns {string} - Hex path
 */
function getPathFromNode(node) {
  if (!node.__minimactPath) {
    throw new Error('[Minimact] Path not assigned to node! Did you forget to run assignPathsToJSX?');
  }
  return node.__minimactPath;
}

/**
 * Get path segments from AST node (helper for extractors)
 *
 * @param {Object} node - Babel AST node
 * @returns {string[]} - Path segments array
 */
function getPathSegmentsFromNode(node) {
  if (!node.__minimactPathSegments) {
    throw new Error('[Minimact] Path segments not assigned to node! Did you forget to run assignPathsToJSX?');
  }
  return node.__minimactPathSegments;
}

module.exports = {
  assignPathsToJSX,
  assignPathsToChildren,
  assignPathsToExpression,
  getPathFromNode,
  getPathSegmentsFromNode
};
