/**
 * Conditional Expression Extractor for Minimact Transpiler
 *
 * Extracts conditional expressions (ternary and logical) into structured format.
 * Handles JSX branching and conditional data binding.
 *
 * Examples:
 * - {isAdmin ? <AdminPanel /> : <UserPanel />} → ConditionalTemplate
 * - {isVisible && <Modal />} → LogicalExpression with JSX
 * - {count > 5} → Binary comparison
 *
 * Reuses from old plugin:
 * - babel-plugin-minimact/src/extractors/templates.cjs → Conditional traversal (lines 404-421)
 */

const { buildMemberPath } = require('./bindings');

/**
 * Extract conditional expression (ternary: ? :)
 *
 * Handles ternary operator with JSX or value branches.
 * Extracts condition, consequent (true branch), and alternate (false branch).
 *
 * Pattern from babel-plugin-minimact/src/extractors/templates.cjs (lines 410-421)
 *
 * @param {Object} expr - Babel ConditionalExpression node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @returns {Object} - Conditional info with condition, consequent, alternate
 */
function extractConditionalExpression(expr, parentPath, pathGen, t) {
  const result = {
    type: 'ConditionalExpression',
    condition: null,
    consequent: null,
    alternate: null
  };

  // Extract condition (test)
  result.condition = extractCondition(expr.test, t);

  // Extract consequent (true branch)
  if (t.isJSXElement(expr.consequent)) {
    // JSX element - will be traversed separately
    result.consequent = {
      type: 'JSXElement',
      tagName: expr.consequent.openingElement.name.name
    };
  } else if (t.isJSXFragment(expr.consequent)) {
    result.consequent = {
      type: 'JSXFragment'
    };
  } else {
    // Value expression
    result.consequent = {
      type: 'Value',
      value: extractValue(expr.consequent, t)
    };
  }

  // Extract alternate (false branch)
  if (t.isJSXElement(expr.alternate)) {
    result.alternate = {
      type: 'JSXElement',
      tagName: expr.alternate.openingElement.name.name
    };
  } else if (t.isJSXFragment(expr.alternate)) {
    result.alternate = {
      type: 'JSXFragment'
    };
  } else {
    // Value expression
    result.alternate = {
      type: 'Value',
      value: extractValue(expr.alternate, t)
    };
  }

  return result;
}

/**
 * Extract logical expression (&&, ||)
 *
 * Handles logical operators, typically used for conditional rendering.
 * Most common: {isVisible && <Modal />}
 *
 * Pattern from babel-plugin-minimact/src/extractors/templates.cjs (lines 404-410)
 *
 * @param {Object} expr - Babel LogicalExpression node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @returns {Object} - Logical expression info with condition and branches
 */
function extractLogicalExpression(expr, parentPath, pathGen, t) {
  const result = {
    type: 'LogicalExpression',
    operator: expr.operator, // '&&' or '||'
    condition: null,
    branches: []
  };

  // Extract condition (left side)
  result.condition = extractCondition(expr.left, t);

  // Extract right side (JSX or value)
  if (t.isJSXElement(expr.right)) {
    result.branches.push({
      type: 'JSXElement',
      tagName: expr.right.openingElement.name.name
    });
  } else if (t.isJSXFragment(expr.right)) {
    result.branches.push({
      type: 'JSXFragment'
    });
  } else {
    result.branches.push({
      type: 'Value',
      value: extractValue(expr.right, t)
    });
  }

  return result;
}

/**
 * Extract binary expression (comparisons: >, <, ===, !==, etc.)
 *
 * Extracts comparison operations used in conditions.
 *
 * Examples:
 * - count > 5 → { left: "count", operator: ">", right: "5" }
 * - user.age >= 18 → { left: "user.age", operator: ">=", right: "18" }
 *
 * @param {Object} expr - Babel BinaryExpression node
 * @param {Object} t - Babel types
 * @returns {Object} - Binary expression info with left, operator, right
 */
function extractBinaryExpression(expr, t) {
  const left = extractOperand(expr.left, t);
  const right = extractOperand(expr.right, t);

  return {
    type: 'BinaryExpression',
    left,
    operator: expr.operator,
    right
  };
}

/**
 * Extract condition from test expression
 *
 * Converts various condition types to string representation.
 *
 * Examples:
 * - isVisible → "isVisible"
 * - user.isAdmin → "user.isAdmin"
 * - count > 5 → "count > 5"
 * - !isDisabled → "!isDisabled"
 *
 * @param {Object} testExpr - Babel expression node (test condition)
 * @param {Object} t - Babel types
 * @returns {string|Object} - Condition string or object
 */
function extractCondition(testExpr, t) {
  if (t.isIdentifier(testExpr)) {
    // Simple identifier: isVisible
    return testExpr.name;
  } else if (t.isMemberExpression(testExpr)) {
    // Member expression: user.isAdmin
    return buildMemberPath(testExpr, t);
  } else if (t.isBinaryExpression(testExpr)) {
    // Binary comparison: count > 5
    return extractBinaryExpression(testExpr, t);
  } else if (t.isLogicalExpression(testExpr)) {
    // Logical: isVisible && isEnabled
    return extractLogicalCondition(testExpr, t);
  } else if (t.isUnaryExpression(testExpr)) {
    // Unary: !isDisabled
    return extractUnaryCondition(testExpr, t);
  } else if (t.isCallExpression(testExpr)) {
    // Function call: hasPermission()
    return extractCallCondition(testExpr, t);
  } else {
    // Complex condition
    return '<complex>';
  }
}

/**
 * Extract operand from binary/logical expression
 *
 * Handles left and right sides of operations.
 *
 * @param {Object} operand - Babel expression node
 * @param {Object} t - Babel types
 * @returns {string} - Operand as string
 */
function extractOperand(operand, t) {
  if (t.isIdentifier(operand)) {
    return operand.name;
  } else if (t.isMemberExpression(operand)) {
    return buildMemberPath(operand, t);
  } else if (t.isLiteral(operand)) {
    return String(operand.value);
  } else if (t.isUnaryExpression(operand)) {
    return `${operand.operator}${extractOperand(operand.argument, t)}`;
  } else {
    return '<complex>';
  }
}

/**
 * Extract value from expression
 *
 * Gets the actual value from various expression types.
 *
 * @param {Object} expr - Babel expression node
 * @param {Object} t - Babel types
 * @returns {string} - Value as string
 */
function extractValue(expr, t) {
  if (t.isStringLiteral(expr)) {
    return expr.value;
  } else if (t.isNumericLiteral(expr)) {
    return String(expr.value);
  } else if (t.isBooleanLiteral(expr)) {
    return String(expr.value);
  } else if (t.isNullLiteral(expr)) {
    return 'null';
  } else if (t.isIdentifier(expr)) {
    return expr.name;
  } else if (t.isMemberExpression(expr)) {
    return buildMemberPath(expr, t);
  } else if (t.isTemplateLiteral(expr)) {
    // Template literal - extract static if possible
    if (expr.expressions.length === 0) {
      return expr.quasis[0].value.raw;
    }
    return '<template>';
  } else {
    return '<complex>';
  }
}

/**
 * Extract logical condition (&&, ||)
 *
 * Handles nested logical expressions in conditions.
 *
 * @param {Object} expr - Babel LogicalExpression node
 * @param {Object} t - Babel types
 * @returns {Object} - Logical condition object
 */
function extractLogicalCondition(expr, t) {
  return {
    type: 'LogicalCondition',
    operator: expr.operator,
    left: extractCondition(expr.left, t),
    right: extractCondition(expr.right, t)
  };
}

/**
 * Extract unary condition (!, -, +, typeof, etc.)
 *
 * Handles unary operators in conditions.
 *
 * @param {Object} expr - Babel UnaryExpression node
 * @param {Object} t - Babel types
 * @returns {string} - Unary condition string
 */
function extractUnaryCondition(expr, t) {
  const argument = extractCondition(expr.argument, t);
  return `${expr.operator}${argument}`;
}

/**
 * Extract call condition (function calls in conditions)
 *
 * Handles method calls used as conditions.
 *
 * @param {Object} expr - Babel CallExpression node
 * @param {Object} t - Babel types
 * @returns {string} - Call condition string
 */
function extractCallCondition(expr, t) {
  if (t.isMemberExpression(expr.callee)) {
    const object = buildMemberPath(expr.callee.object, t);
    const method = t.isIdentifier(expr.callee.property)
      ? expr.callee.property.name
      : '<computed>';
    return `${object}.${method}()`;
  } else if (t.isIdentifier(expr.callee)) {
    return `${expr.callee.name}()`;
  }
  return '<complex-call>';
}

/**
 * Check if expression is conditional (has branching)
 *
 * @param {Object} expr - Babel expression node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if conditional
 */
function isConditionalExpression(expr, t) {
  return t.isConditionalExpression(expr) || t.isLogicalExpression(expr);
}

/**
 * Check if conditional contains JSX
 *
 * Determines if conditional branches contain JSX elements (structural).
 *
 * @param {Object} expr - Babel ConditionalExpression or LogicalExpression
 * @param {Object} t - Babel types
 * @returns {boolean} - True if contains JSX
 */
function containsJSX(expr, t) {
  if (t.isConditionalExpression(expr)) {
    return t.isJSXElement(expr.consequent) ||
           t.isJSXFragment(expr.consequent) ||
           t.isJSXElement(expr.alternate) ||
           t.isJSXFragment(expr.alternate);
  } else if (t.isLogicalExpression(expr)) {
    return t.isJSXElement(expr.right) || t.isJSXFragment(expr.right);
  }
  return false;
}

/**
 * Simplify condition to string
 *
 * Converts complex condition objects to simple string representation.
 *
 * @param {string|Object} condition - Condition (string or object)
 * @returns {string} - Simplified condition string
 */
function simplifyCondition(condition) {
  if (typeof condition === 'string') {
    return condition;
  }

  if (condition.type === 'BinaryExpression') {
    return `${condition.left} ${condition.operator} ${condition.right}`;
  }

  if (condition.type === 'LogicalCondition') {
    const left = simplifyCondition(condition.left);
    const right = simplifyCondition(condition.right);
    return `${left} ${condition.operator} ${right}`;
  }

  return '<complex>';
}

/**
 * Extract literal value helper
 *
 * Pattern from babel-plugin-minimact (extractLiteralValue)
 *
 * @param {Object} node - Babel node
 * @param {Object} t - Babel types
 * @returns {string|null} - Literal value or null
 */
function extractLiteralValue(node, t) {
  if (t.isStringLiteral(node)) {
    return node.value;
  } else if (t.isNumericLiteral(node)) {
    return String(node.value);
  } else if (t.isBooleanLiteral(node)) {
    return String(node.value);
  } else if (t.isNullLiteral(node)) {
    return 'null';
  }
  return null;
}

module.exports = {
  extractConditionalExpression,
  extractLogicalExpression,
  extractBinaryExpression,
  extractCondition,
  extractOperand,
  extractValue,
  extractLogicalCondition,
  extractUnaryCondition,
  extractCallCondition,
  isConditionalExpression,
  containsJSX,
  simplifyCondition,
  extractLiteralValue
};
