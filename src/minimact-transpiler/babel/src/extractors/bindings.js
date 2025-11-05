/**
 * Binding Extractor for Minimact Transpiler
 *
 * Extracts state/prop bindings from JavaScript expressions.
 * Converts AST expressions into binding paths for C# code generation.
 *
 * Examples:
 * - count → "count"
 * - user.name → "user.name"
 * - price.toFixed(2) → { transform: "toFixed", binding: "price", args: [2] }
 * - count > 5 ? 'High' : 'Low' → { conditional: "count > 5", trueValue: "High", falseValue: "Low" }
 *
 * Reuses critical logic from:
 * - babel-plugin-minimact/src/extractors/templates.cjs → buildMemberPathShared() (lines 34-50)
 * - babel-plugin-minimact/src/extractors/templates.cjs → extractBindingShared() (lines 136-160)
 */

const { extractConditionalBinding: extractConditionalBindingFromConditionals } = require('./conditionals');

/**
 * Main binding extractor
 *
 * Analyzes an expression and extracts binding information.
 * Returns string for simple bindings, object for complex bindings.
 *
 * @param {Object} expr - Babel expression node
 * @param {Object} t - Babel types
 * @returns {string|Object|null} - Binding path, binding object, or null
 */
function extractBindings(expr, t) {
  if (t.isIdentifier(expr)) {
    return extractIdentifierBinding(expr, t);
  } else if (t.isMemberExpression(expr) || t.isOptionalMemberExpression(expr)) {
    return extractMemberBinding(expr, t);
  } else if (t.isCallExpression(expr)) {
    // First try method call binding (toFixed, toLowerCase, etc.)
    const methodBinding = extractMethodCallBinding(expr, t);
    if (methodBinding) {
      return methodBinding;
    }

    // Otherwise, handle complex chained calls
    return extractComplexBinding(expr, t);
  } else if (t.isBinaryExpression(expr)) {
    // Handle binary expressions: todo.priority + 1, price * quantity
    return extractBinaryExpressionBinding(expr, t);
  } else if (t.isLogicalExpression(expr)) {
    // Handle logical expressions: todo.dueDate || 'No due date'
    return extractLogicalExpressionBinding(expr, t);
  } else if (t.isUnaryExpression(expr)) {
    // Handle unary expressions: !todo.completed
    return extractUnaryExpressionBinding(expr, t);
  } else if (t.isConditionalExpression(expr)) {
    // Handle ternary: count > 5 ? 'High' : 'Low'
    return extractConditionalBinding(expr, t);
  } else {
    return null;
  }
}

/**
 * Extract identifier binding
 *
 * Simple variable reference: count, title, isVisible
 *
 * @param {Object} identifier - Babel Identifier node
 * @param {Object} t - Babel types
 * @returns {string} - Variable name
 */
function extractIdentifierBinding(identifier, t) {
  return identifier.name;
}

/**
 * Extract member expression binding
 *
 * Dotted property access: user.name, todo.text, item.category.name
 * Optional chaining: user?.name, viewModel?.userEmail
 *
 * CRITICAL FUNCTION - Ported from babel-plugin-minimact/src/extractors/templates.cjs
 * buildMemberPathShared() (lines 34-50)
 *
 * @param {Object} memberExpr - Babel MemberExpression or OptionalMemberExpression node
 * @param {Object} t - Babel types
 * @returns {string} - Dotted path (e.g., "user.name" or "viewModel.userEmail")
 */
function extractMemberBinding(memberExpr, t) {
  return buildMemberPath(memberExpr, t);
}

/**
 * Build member expression path
 *
 * Recursively walks member expression chain and builds dotted path.
 *
 * Examples:
 * - user.name → "user.name"
 * - todo.category.title → "todo.category.title"
 * - item.tags[0] → "item.tags" (computed properties ignored)
 *
 * CRITICAL - Direct port from babel-plugin-minimact/src/extractors/templates.cjs (lines 34-50)
 *
 * @param {Object} expr - Babel MemberExpression node
 * @param {Object} t - Babel types
 * @returns {string} - Dotted path
 */
function buildMemberPath(expr, t) {
  const parts = [];
  let current = expr;

  // Walk up the member expression chain
  // Handle both MemberExpression and OptionalMemberExpression (e.g., user?.profile?.name)
  while (t.isMemberExpression(current) || t.isOptionalMemberExpression(current)) {
    if (t.isIdentifier(current.property)) {
      parts.unshift(current.property.name);
    }
    current = current.object;
  }

  // Get the root identifier
  if (t.isIdentifier(current)) {
    parts.unshift(current.name);
  }

  return parts.join('.');
}

/**
 * Extract method call binding
 *
 * Transform methods like toFixed, toLowerCase, etc.
 * Supports method chaining on member expressions!
 *
 * Examples:
 * - price.toFixed(2) → { transform: "toFixed", binding: "price", args: [2] }
 * - text.toLowerCase() → { transform: "toLowerCase", binding: "text", args: [] }
 * - product.name.toUpperCase() → { transform: "toUpperCase", binding: "product.name", args: [] }
 * - product.price.toFixed(2) → { transform: "toFixed", binding: "product.price", args: [2] }
 * - user?.email?.toLowerCase() → { transform: "toLowerCase", binding: "user.email", args: [] }
 *
 * Pattern from babel-plugin-minimact/src/extractors/templates.cjs (lines 56-100)
 *
 * @param {Object} expr - Babel CallExpression node
 * @param {Object} t - Babel types
 * @returns {Object|null} - Transform binding object or null
 */
function extractMethodCallBinding(expr, t) {
  const callee = expr.callee;

  if (!t.isMemberExpression(callee) && !t.isOptionalMemberExpression(callee)) {
    return null;
  }

  const methodName = t.isIdentifier(callee.property) ? callee.property.name : null;
  if (!methodName) return null;

  // List of supported transform methods
  const transformMethods = [
    'toFixed', 'toString', 'toLowerCase', 'toUpperCase',
    'trim', 'trimStart', 'trimEnd', 'substring', 'substr',
    'slice', 'padStart', 'padEnd'
  ];

  if (!transformMethods.includes(methodName)) {
    return null;
  }

  // Extract the binding (what's being transformed)
  let binding = null;
  if (t.isMemberExpression(callee.object) || t.isOptionalMemberExpression(callee.object)) {
    // Handle: product.price.toFixed(2) or product?.price?.toFixed(2)
    binding = buildMemberPath(callee.object, t);
  } else if (t.isIdentifier(callee.object)) {
    // Handle: price.toFixed(2)
    binding = callee.object.name;
  } else if (t.isBinaryExpression(callee.object)) {
    // Handle: (price * quantity).toFixed(2)
    const identifiers = [];
    extractIdentifiers(callee.object, identifiers, t);
    binding = `__expr__:${identifiers.join(',')}`;
  }

  if (!binding) return null;

  // Extract method arguments
  const args = expr.arguments.map(arg => {
    if (t.isNumericLiteral(arg)) return arg.value;
    if (t.isStringLiteral(arg)) return arg.value;
    if (t.isBooleanLiteral(arg)) return arg.value;
    return null;
  }).filter(v => v !== null);

  return {
    type: 'transform',
    transform: methodName,
    binding: binding,
    args: args
  };
}

/**
 * Extract complex binding (chained calls, complex expressions)
 *
 * Handles complex expressions that can't be simply represented.
 * Extracts all identifiers and marks as computed expression.
 *
 * Examples:
 * - todo.text.substring(0, 10).toUpperCase() → "__expr__:todo"
 * - array.concat(other) → "__expr__:array,other"
 *
 * @param {Object} expr - Babel expression node
 * @param {Object} t - Babel types
 * @returns {string|null} - Complex binding marker or null
 */
function extractComplexBinding(expr, t) {
  const identifiers = [];
  extractIdentifiers(expr, identifiers, t);

  if (identifiers.length === 0) {
    return null;
  }

  // Use __expr__ prefix to indicate this is a computed expression
  return `__expr__:${identifiers.join(',')}`;
}

/**
 * Extract binary expression binding
 *
 * Arithmetic/comparison operations: +, -, *, /, >, <, ===, etc.
 *
 * Examples:
 * - todo.priority + 1 → "__expr__:todo"
 * - price * quantity → "__expr__:price,quantity"
 *
 * @param {Object} expr - Babel BinaryExpression node
 * @param {Object} t - Babel types
 * @returns {string} - Complex binding marker
 */
function extractBinaryExpressionBinding(expr, t) {
  const identifiers = [];
  extractIdentifiers(expr, identifiers, t);

  return `__expr__:${identifiers.join(',')}`;
}

/**
 * Extract logical expression binding
 *
 * Logical operations: &&, ||
 *
 * Examples:
 * - todo.dueDate || 'No due date' → "__expr__:todo"
 * - isVisible && isEnabled → "__expr__:isVisible,isEnabled"
 *
 * @param {Object} expr - Babel LogicalExpression node
 * @param {Object} t - Babel types
 * @returns {string} - Complex binding marker
 */
function extractLogicalExpressionBinding(expr, t) {
  const identifiers = [];
  extractIdentifiers(expr, identifiers, t);

  return `__expr__:${identifiers.join(',')}`;
}

/**
 * Extract unary expression binding
 *
 * Unary operations: !, -, +, typeof, etc.
 *
 * Examples:
 * - !todo.completed → "__expr__:todo"
 * - -price → "__expr__:price"
 *
 * @param {Object} expr - Babel UnaryExpression node
 * @param {Object} t - Babel types
 * @returns {string} - Complex binding marker
 */
function extractUnaryExpressionBinding(expr, t) {
  const identifiers = [];
  extractIdentifiers(expr.argument, identifiers, t);

  return `__expr__:${identifiers.join(',')}`;
}

/**
 * Extract conditional expression binding (ternary)
 *
 * Ternary operations: condition ? trueValue : falseValue
 *
 * Examples:
 * - count > 5 ? 'High' : 'Low' → { conditional: "count > 5", trueValue: "High", falseValue: "Low" }
 * - isVisible ? user.name : 'Anonymous' → { conditional: "isVisible", trueValue: "user.name", falseValue: "Anonymous" }
 *
 * @param {Object} expr - Babel ConditionalExpression node
 * @param {Object} t - Babel types
 * @returns {Object} - Conditional binding object
 */
function extractConditionalBinding(expr, t) {
  // Try the specialized conditional binding extractor first (for literal values)
  const literalBinding = extractConditionalBindingFromConditionals(expr, t);
  if (literalBinding) {
    // Perfect! This is a ternary with literal values like: isExpanded ? 'Hide' : 'Show'
    return literalBinding;
  }

  // Fall back to more complex handling (dynamic values)
  // Extract condition
  let condition = null;
  if (t.isIdentifier(expr.test)) {
    condition = expr.test.name;
  } else if (t.isMemberExpression(expr.test)) {
    condition = buildMemberPath(expr.test, t);
  } else if (t.isBinaryExpression(expr.test)) {
    const left = t.isIdentifier(expr.test.left) ? expr.test.left.name :
                 t.isMemberExpression(expr.test.left) ? buildMemberPath(expr.test.left, t) :
                 String(expr.test.left.value || '<complex>');

    const right = t.isIdentifier(expr.test.right) ? expr.test.right.name :
                  t.isMemberExpression(expr.test.right) ? buildMemberPath(expr.test.right, t) :
                  String(expr.test.right.value || '<complex>');

    condition = `${left} ${expr.test.operator} ${right}`;
  } else {
    const identifiers = [];
    extractIdentifiers(expr.test, identifiers, t);
    condition = `__expr__:${identifiers.join(',')}`;
  }

  // Extract true value (dynamic)
  const trueValue = t.isStringLiteral(expr.consequent) ? expr.consequent.value :
                    t.isNumericLiteral(expr.consequent) ? String(expr.consequent.value) :
                    t.isIdentifier(expr.consequent) ? expr.consequent.name :
                    t.isMemberExpression(expr.consequent) ? buildMemberPath(expr.consequent, t) :
                    '<complex>';

  // Extract false value
  const falseValue = t.isStringLiteral(expr.alternate) ? expr.alternate.value :
                     t.isNumericLiteral(expr.alternate) ? String(expr.alternate.value) :
                     t.isIdentifier(expr.alternate) ? expr.alternate.name :
                     t.isMemberExpression(expr.alternate) ? buildMemberPath(expr.alternate, t) :
                     '<complex>';

  return {
    type: 'conditional',
    conditional: condition,
    trueValue: trueValue,
    falseValue: falseValue
  };
}

/**
 * Extract all identifiers from expression (recursive)
 *
 * Walks expression tree and collects all variable names.
 * Used for complex expressions to identify dependencies.
 *
 * @param {Object} expr - Babel expression node
 * @param {Array} identifiers - Accumulator array for identifier names
 * @param {Object} t - Babel types
 */
function extractIdentifiers(expr, identifiers, t) {
  if (!expr) return;

  if (t.isIdentifier(expr)) {
    if (!identifiers.includes(expr.name)) {
      identifiers.push(expr.name);
    }
  } else if (t.isMemberExpression(expr)) {
    const path = buildMemberPath(expr, t);
    const root = path.split('.')[0];
    if (!identifiers.includes(root)) {
      identifiers.push(root);
    }
  } else if (t.isBinaryExpression(expr) || t.isLogicalExpression(expr)) {
    extractIdentifiers(expr.left, identifiers, t);
    extractIdentifiers(expr.right, identifiers, t);
  } else if (t.isUnaryExpression(expr)) {
    extractIdentifiers(expr.argument, identifiers, t);
  } else if (t.isCallExpression(expr)) {
    extractIdentifiers(expr.callee, identifiers, t);
    expr.arguments.forEach(arg => extractIdentifiers(arg, identifiers, t));
  } else if (t.isConditionalExpression(expr)) {
    extractIdentifiers(expr.test, identifiers, t);
    extractIdentifiers(expr.consequent, identifiers, t);
    extractIdentifiers(expr.alternate, identifiers, t);
  }
}

module.exports = {
  extractBindings,
  buildMemberPath,
  extractIdentifierBinding,
  extractMemberBinding,
  extractComplexBinding,
  extractMethodCallBinding,
  extractBinaryExpressionBinding,
  extractLogicalExpressionBinding,
  extractUnaryExpressionBinding,
  extractConditionalBinding,
  extractIdentifiers
};
