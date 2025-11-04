/**
 * AST Utilities for Minimact Transpiler
 *
 * Common AST operations and type checks.
 * Provides clean wrappers around Babel's type checking functions.
 */

/**
 * Check if node is JSXElement
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if JSXElement
 */
function isJSXElement(node, t) {
  return node && t.isJSXElement(node);
}

/**
 * Check if node is JSXFragment
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if JSXFragment
 */
function isJSXFragment(node, t) {
  return node && t.isJSXFragment(node);
}

/**
 * Check if node is JSXText
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if JSXText
 */
function isJSXText(node, t) {
  return node && t.isJSXText(node);
}

/**
 * Check if node is JSXExpressionContainer
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if JSXExpressionContainer
 */
function isJSXExpressionContainer(node, t) {
  return node && t.isJSXExpressionContainer(node);
}

/**
 * Check if node is JSXEmptyExpression
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if JSXEmptyExpression
 */
function isJSXEmptyExpression(node, t) {
  return node && t.isJSXEmptyExpression(node);
}

/**
 * Check if node is Identifier
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if Identifier
 */
function isIdentifier(node, t) {
  return node && t.isIdentifier(node);
}

/**
 * Check if node is MemberExpression
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if MemberExpression
 */
function isMemberExpression(node, t) {
  return node && t.isMemberExpression(node);
}

/**
 * Check if node is CallExpression
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if CallExpression
 */
function isCallExpression(node, t) {
  return node && t.isCallExpression(node);
}

/**
 * Check if node is ConditionalExpression (ternary)
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if ConditionalExpression
 */
function isConditionalExpression(node, t) {
  return node && t.isConditionalExpression(node);
}

/**
 * Check if node is LogicalExpression (&&, ||)
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if LogicalExpression
 */
function isLogicalExpression(node, t) {
  return node && t.isLogicalExpression(node);
}

/**
 * Check if node is BinaryExpression (>, <, ===, etc.)
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if BinaryExpression
 */
function isBinaryExpression(node, t) {
  return node && t.isBinaryExpression(node);
}

/**
 * Check if node is TemplateLiteral
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if TemplateLiteral
 */
function isTemplateLiteral(node, t) {
  return node && t.isTemplateLiteral(node);
}

/**
 * Check if node is ObjectExpression
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if ObjectExpression
 */
function isObjectExpression(node, t) {
  return node && t.isObjectExpression(node);
}

/**
 * Check if node is ArrayExpression
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if ArrayExpression
 */
function isArrayExpression(node, t) {
  return node && t.isArrayExpression(node);
}

/**
 * Check if node is Literal (string, number, boolean, null)
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if Literal
 */
function isLiteral(node, t) {
  return node && (
    t.isStringLiteral(node) ||
    t.isNumericLiteral(node) ||
    t.isBooleanLiteral(node) ||
    t.isNullLiteral(node)
  );
}

/**
 * Get node type as string
 *
 * Returns human-readable node type name.
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {string} - Node type name
 */
function getNodeType(node, t) {
  if (!node) return 'null';
  if (!node.type) return 'unknown';

  // JSX types
  if (isJSXElement(node, t)) return 'JSXElement';
  if (isJSXFragment(node, t)) return 'JSXFragment';
  if (isJSXText(node, t)) return 'JSXText';
  if (isJSXExpressionContainer(node, t)) return 'JSXExpressionContainer';
  if (isJSXEmptyExpression(node, t)) return 'JSXEmptyExpression';

  // Expression types
  if (isIdentifier(node, t)) return 'Identifier';
  if (isMemberExpression(node, t)) return 'MemberExpression';
  if (isCallExpression(node, t)) return 'CallExpression';
  if (isConditionalExpression(node, t)) return 'ConditionalExpression';
  if (isLogicalExpression(node, t)) return 'LogicalExpression';
  if (isBinaryExpression(node, t)) return 'BinaryExpression';
  if (isTemplateLiteral(node, t)) return 'TemplateLiteral';
  if (isObjectExpression(node, t)) return 'ObjectExpression';
  if (isArrayExpression(node, t)) return 'ArrayExpression';

  // Literal types
  if (t.isStringLiteral(node)) return 'StringLiteral';
  if (t.isNumericLiteral(node)) return 'NumericLiteral';
  if (t.isBooleanLiteral(node)) return 'BooleanLiteral';
  if (t.isNullLiteral(node)) return 'NullLiteral';

  // Fallback to raw type
  return node.type;
}

/**
 * Walk AST recursively with visitor
 *
 * Generic AST walker that visits all nodes in tree.
 * Visitor can return false to skip children.
 *
 * @param {Object} node - Babel AST node
 * @param {Function} visitor - Visitor function (node, parent, key) => boolean|void
 * @param {Object} t - Babel types
 * @param {Object} parent - Parent node (internal)
 * @param {string} key - Property key (internal)
 */
function walkAST(node, visitor, t, parent = null, key = null) {
  if (!node) return;

  // Visit current node
  const shouldContinue = visitor(node, parent, key);

  // If visitor returns false, skip children
  if (shouldContinue === false) {
    return;
  }

  // Walk JSX children
  if (isJSXElement(node, t)) {
    // Walk attributes
    for (const attr of node.openingElement.attributes) {
      walkAST(attr, visitor, t, node, 'attributes');
    }

    // Walk children
    for (const child of node.children) {
      walkAST(child, visitor, t, node, 'children');
    }
  } else if (isJSXFragment(node, t)) {
    // Walk fragment children
    for (const child of node.children) {
      walkAST(child, visitor, t, node, 'children');
    }
  } else if (isJSXExpressionContainer(node, t)) {
    // Walk expression
    walkAST(node.expression, visitor, t, node, 'expression');
  }

  // Walk expression trees
  else if (isConditionalExpression(node, t)) {
    walkAST(node.test, visitor, t, node, 'test');
    walkAST(node.consequent, visitor, t, node, 'consequent');
    walkAST(node.alternate, visitor, t, node, 'alternate');
  } else if (isLogicalExpression(node, t) || isBinaryExpression(node, t)) {
    walkAST(node.left, visitor, t, node, 'left');
    walkAST(node.right, visitor, t, node, 'right');
  } else if (isCallExpression(node, t)) {
    walkAST(node.callee, visitor, t, node, 'callee');
    for (const arg of node.arguments) {
      walkAST(arg, visitor, t, node, 'arguments');
    }
  } else if (isMemberExpression(node, t)) {
    walkAST(node.object, visitor, t, node, 'object');
    if (node.computed) {
      walkAST(node.property, visitor, t, node, 'property');
    }
  } else if (isTemplateLiteral(node, t)) {
    for (const expr of node.expressions) {
      walkAST(expr, visitor, t, node, 'expressions');
    }
  } else if (isObjectExpression(node, t)) {
    for (const prop of node.properties) {
      walkAST(prop, visitor, t, node, 'properties');
    }
  } else if (isArrayExpression(node, t)) {
    for (const elem of node.elements) {
      walkAST(elem, visitor, t, node, 'elements');
    }
  }
}

/**
 * Find all nodes matching predicate
 *
 * Searches AST and returns all nodes where predicate returns true.
 *
 * @param {Object} node - Root node
 * @param {Function} predicate - Test function (node) => boolean
 * @param {Object} t - Babel types
 * @returns {Array} - Array of matching nodes
 */
function findNodes(node, predicate, t) {
  const matches = [];

  walkAST(node, (currentNode) => {
    if (predicate(currentNode)) {
      matches.push(currentNode);
    }
  }, t);

  return matches;
}

/**
 * Find first node matching predicate
 *
 * Searches AST and returns first node where predicate returns true.
 *
 * @param {Object} node - Root node
 * @param {Function} predicate - Test function (node) => boolean
 * @param {Object} t - Babel types
 * @returns {Object|null} - First matching node or null
 */
function findNode(node, predicate, t) {
  let match = null;

  walkAST(node, (currentNode) => {
    if (predicate(currentNode)) {
      match = currentNode;
      return false; // Stop walking
    }
  }, t);

  return match;
}

/**
 * Count nodes matching predicate
 *
 * @param {Object} node - Root node
 * @param {Function} predicate - Test function (node) => boolean
 * @param {Object} t - Babel types
 * @returns {number} - Count of matching nodes
 */
function countNodes(node, predicate, t) {
  let count = 0;

  walkAST(node, (currentNode) => {
    if (predicate(currentNode)) {
      count++;
    }
  }, t);

  return count;
}

/**
 * Get all identifiers used in expression
 *
 * @param {Object} node - Expression node
 * @param {Object} t - Babel types
 * @returns {Array} - Array of identifier names
 */
function getIdentifiers(node, t) {
  const identifiers = [];

  walkAST(node, (currentNode) => {
    if (isIdentifier(currentNode, t)) {
      if (!identifiers.includes(currentNode.name)) {
        identifiers.push(currentNode.name);
      }
    }
  }, t);

  return identifiers;
}

/**
 * Check if expression contains identifier
 *
 * @param {Object} node - Expression node
 * @param {string} name - Identifier name to find
 * @param {Object} t - Babel types
 * @returns {boolean} - True if contains identifier
 */
function containsIdentifier(node, name, t) {
  let found = false;

  walkAST(node, (currentNode) => {
    if (isIdentifier(currentNode, t) && currentNode.name === name) {
      found = true;
      return false; // Stop walking
    }
  }, t);

  return found;
}

/**
 * Check if node is pure (no side effects)
 *
 * Determines if expression has side effects (calls, assignments, etc.)
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if pure
 */
function isPure(node, t) {
  if (!node) return true;

  // Literals are pure
  if (isLiteral(node, t)) return true;

  // Identifiers are pure (assuming no getters)
  if (isIdentifier(node, t)) return true;

  // Member expressions are pure if object is pure
  if (isMemberExpression(node, t)) {
    return isPure(node.object, t);
  }

  // Template literals are pure if all expressions are pure
  if (isTemplateLiteral(node, t)) {
    return node.expressions.every(expr => isPure(expr, t));
  }

  // Binary/Logical expressions are pure if both sides are pure
  if (isBinaryExpression(node, t) || isLogicalExpression(node, t)) {
    return isPure(node.left, t) && isPure(node.right, t);
  }

  // Conditional is pure if all branches are pure
  if (isConditionalExpression(node, t)) {
    return isPure(node.test, t) &&
           isPure(node.consequent, t) &&
           isPure(node.alternate, t);
  }

  // Calls, assignments, updates are not pure
  return false;
}

module.exports = {
  // Type checks
  isJSXElement,
  isJSXFragment,
  isJSXText,
  isJSXExpressionContainer,
  isJSXEmptyExpression,
  isIdentifier,
  isMemberExpression,
  isCallExpression,
  isConditionalExpression,
  isLogicalExpression,
  isBinaryExpression,
  isTemplateLiteral,
  isObjectExpression,
  isArrayExpression,
  isLiteral,

  // Type info
  getNodeType,

  // AST walking
  walkAST,
  findNodes,
  findNode,
  countNodes,

  // Identifier utilities
  getIdentifiers,
  containsIdentifier,

  // Analysis
  isPure
};
