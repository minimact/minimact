/**
 * Legacy Shared Logic from babel-plugin-minimact
 *
 * This module ports critical reusable functions from the old plugin:
 * - babel-plugin-minimact/src/extractors/templates.cjs (lines 18-100)
 * - babel-plugin-minimact/src/utils/helpers.cjs
 *
 * These functions are battle-tested and handle edge cases correctly.
 * DO NOT modify unless fixing a bug - reuse as-is for consistency.
 */

/**
 * Build member expression path (e.g., user.profile.name → "user.profile.name")
 *
 * This is CRITICAL for binding extraction throughout the transpiler.
 * Used by: bindings.js, expressions.js, templates.js, conditionals.js
 *
 * Ported from: babel-plugin-minimact/src/extractors/templates.cjs (lines 34-50)
 *
 * @param {Object} expr - Babel MemberExpression node
 * @returns {string} - Dotted path (e.g., "user.profile.name")
 */
function buildMemberPathShared(expr) {
  const parts = [];
  let current = expr;

  // Walk up the member expression chain
  while (isMemberExpression(current)) {
    if (isIdentifier(current.property)) {
      // Add property name to the front (we're walking backwards)
      parts.unshift(current.property.name);
    } else {
      // Computed property access like obj[key] - not supported yet
      parts.unshift('<computed>');
    }
    current = current.object;
  }

  // Base object (leftmost identifier)
  if (isIdentifier(current)) {
    parts.unshift(current.name);
  } else {
    // Complex base like function call
    parts.unshift('<complex>');
  }

  return parts.join('.');
}

/**
 * Extract identifiers from expression recursively
 *
 * Used for complex expressions where we need all variable dependencies.
 * Example: (discount * 100) → ["discount"]
 *
 * Ported from: babel-plugin-minimact/src/extractors/templates.cjs (lines 18-29)
 *
 * @param {Object} expr - Babel expression node
 * @param {Array} result - Array to collect identifiers (mutated)
 */
function extractIdentifiersShared(expr, result) {
  if (isIdentifier(expr)) {
    result.push(expr.name);
  } else if (isBinaryExpression(expr) || isLogicalExpression(expr)) {
    // Binary: a + b, a > b, etc.
    // Logical: a && b, a || b
    extractIdentifiersShared(expr.left, result);
    extractIdentifiersShared(expr.right, result);
  } else if (isUnaryExpression(expr)) {
    // Unary: !a, -b, +c
    extractIdentifiersShared(expr.argument, result);
  } else if (isMemberExpression(expr)) {
    // Member: user.name
    result.push(buildMemberPathShared(expr));
  } else if (isCallExpression(expr)) {
    // Call: func(a, b)
    // Extract from callee and arguments
    if (isMemberExpression(expr.callee)) {
      result.push(buildMemberPathShared(expr.callee.object));
    } else if (isIdentifier(expr.callee)) {
      result.push(expr.callee.name);
    }
    // Also extract from arguments
    for (const arg of expr.arguments) {
      extractIdentifiersShared(arg, result);
    }
  }
}

/**
 * Extract template literal with bindings
 *
 * Converts template literal to parameterized string with {0}, {1} slots.
 * Example: `Count: ${count}` → { template: "Count: {0}", bindings: ["count"] }
 *
 * Ported from: babel-plugin-minimact/src/extractors/templates.cjs (lines 223-271)
 *
 * @param {Object} node - Babel TemplateLiteral node
 * @param {Object} component - Component context (for complex binding extraction)
 * @returns {Object} - { template, bindings, slots, transforms, conditionals }
 */
function extractTemplateLiteralShared(node, component = null) {
  let templateStr = '';
  const bindings = [];
  const slots = [];
  const transforms = [];
  const conditionals = [];

  for (let i = 0; i < node.quasis.length; i++) {
    const quasi = node.quasis[i];
    // Add static text
    templateStr += quasi.value.raw;

    if (i < node.expressions.length) {
      const expr = node.expressions[i];

      // Record slot position (where {0} starts)
      slots.push(templateStr.length);

      // Add placeholder
      templateStr += `{${i}}`;

      // Extract binding from expression
      const binding = extractBindingShared(expr, component);

      if (binding && typeof binding === 'object' && binding.transform) {
        // Transform method call: price.toFixed(2)
        bindings.push(binding.binding);
        transforms.push({
          slotIndex: i,
          method: binding.transform,
          args: binding.args
        });
      } else if (binding) {
        bindings.push(binding);
      } else {
        bindings.push('__complex__');
      }
    }
  }

  const result = {
    template: templateStr,
    bindings,
    slots,
    type: 'attribute'
  };

  if (transforms.length > 0) {
    result.transforms = transforms;
  }
  if (conditionals.length > 0) {
    result.conditionals = conditionals;
  }

  return result;
}

/**
 * Extract binding from expression
 *
 * Returns string binding path or object with transform metadata.
 * Example: count → "count"
 * Example: user.name → "user.name"
 * Example: price.toFixed(2) → { binding: "price", transform: "toFixed", args: [2] }
 *
 * @param {Object} expr - Babel expression node
 * @param {Object} component - Component context
 * @returns {string|Object|null} - Binding path, transform object, or null
 */
function extractBindingShared(expr, component = null) {
  if (isIdentifier(expr)) {
    // Simple identifier: {count}
    return expr.name;
  } else if (isMemberExpression(expr)) {
    // Member expression: {user.name}
    return buildMemberPathShared(expr);
  } else if (isCallExpression(expr)) {
    // Method call: {price.toFixed(2)}
    const methodCall = extractMethodCallBindingShared(expr);
    if (methodCall) {
      return methodCall;
    }

    // Complex call - extract identifiers
    const identifiers = [];
    extractIdentifiersShared(expr, identifiers);
    if (identifiers.length > 0) {
      return `__expr__:${identifiers.join(',')}`;
    }
  } else if (isBinaryExpression(expr)) {
    // Binary expression: {count + 1}
    const identifiers = [];
    extractIdentifiersShared(expr, identifiers);
    if (identifiers.length > 0) {
      return `__expr__:${identifiers.join(',')}`;
    }
  }

  return null;
}

/**
 * Extract method call binding (toFixed, toLowerCase, etc.)
 *
 * Handles transform methods that can be applied client-side.
 * Example: price.toFixed(2) → { binding: "price", transform: "toFixed", args: [2] }
 *
 * Ported from: babel-plugin-minimact/src/extractors/templates.cjs (lines 56-100)
 *
 * @param {Object} expr - Babel CallExpression node
 * @returns {Object|null} - { binding, transform, args } or null
 */
function extractMethodCallBindingShared(expr) {
  const callee = expr.callee;

  if (!isMemberExpression(callee) && !isOptionalMemberExpression(callee)) {
    return null;
  }

  const methodName = isIdentifier(callee.property) ? callee.property.name : null;
  if (!methodName) return null;

  // Whitelist of supported transform methods
  const transformMethods = [
    'toFixed', 'toString', 'toLowerCase', 'toUpperCase',
    'trim', 'trimStart', 'trimEnd'
  ];

  if (!transformMethods.includes(methodName)) {
    return null;
  }

  // Extract the base binding
  let binding = null;
  if (isMemberExpression(callee.object)) {
    binding = buildMemberPathShared(callee.object);
  } else if (isIdentifier(callee.object)) {
    binding = callee.object.name;
  } else if (isBinaryExpression(callee.object)) {
    // Expression like (discount * 100).toFixed(0)
    const identifiers = [];
    extractIdentifiersShared(callee.object, identifiers);
    binding = `__expr__:${identifiers.join(',')}`;
  }

  if (!binding) return null;

  // Extract method arguments
  const args = expr.arguments.map(arg => {
    if (isNumericLiteral(arg)) return arg.value;
    if (isStringLiteral(arg)) return arg.value;
    if (isBooleanLiteral(arg)) return arg.value;
    return null;
  }).filter(v => v !== null);

  return {
    transform: methodName,
    binding: binding,
    args: args
  };
}

/**
 * Check if attribute is an event handler
 *
 * @param {string} attrName - Attribute name (e.g., "onClick", "onSubmit")
 * @returns {boolean} - True if event handler
 */
function isEventHandler(attrName) {
  return attrName.startsWith('on') && attrName.length > 2 && attrName[2] === attrName[2].toUpperCase();
}

/**
 * Sanitize identifier for C# usage
 *
 * C# has different reserved words than JavaScript.
 * Example: "event" → "eventValue"
 *
 * @param {string} name - JavaScript identifier
 * @returns {string} - Sanitized C# identifier
 */
function sanitizeIdentifier(name) {
  const csharpReservedWords = [
    'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char',
    'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate',
    'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false',
    'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit',
    'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace',
    'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private',
    'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed',
    'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch',
    'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked',
    'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while'
  ];

  if (csharpReservedWords.includes(name.toLowerCase())) {
    return `${name}Value`;
  }

  return name;
}

/**
 * Get source location for error reporting
 *
 * @param {Object} node - Babel AST node
 * @returns {Object} - { line, column, file }
 */
function getSourceLocation(node) {
  if (!node || !node.loc) {
    return { line: 0, column: 0, file: 'unknown' };
  }

  return {
    line: node.loc.start.line,
    column: node.loc.start.column,
    file: node.loc.filename || 'unknown'
  };
}

/**
 * Escape string for C# code generation
 *
 * Ported from: babel-plugin-minimact/src/utils/helpers.cjs
 *
 * @param {string} str - Input string
 * @returns {string} - Escaped string
 */
function escapeCSharpString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// ============================================================================
// Type Checking Helpers (Babel-agnostic)
// ============================================================================

/**
 * These helpers abstract away Babel's t.isX() checks so we can potentially
 * swap out Babel for another parser in the future.
 */

function isIdentifier(node) {
  return node && node.type === 'Identifier';
}

function isMemberExpression(node) {
  return node && node.type === 'MemberExpression';
}

function isOptionalMemberExpression(node) {
  return node && node.type === 'OptionalMemberExpression';
}

function isCallExpression(node) {
  return node && node.type === 'CallExpression';
}

function isBinaryExpression(node) {
  return node && node.type === 'BinaryExpression';
}

function isLogicalExpression(node) {
  return node && node.type === 'LogicalExpression';
}

function isUnaryExpression(node) {
  return node && node.type === 'UnaryExpression';
}

function isNumericLiteral(node) {
  return node && node.type === 'NumericLiteral';
}

function isStringLiteral(node) {
  return node && node.type === 'StringLiteral';
}

function isBooleanLiteral(node) {
  return node && node.type === 'BooleanLiteral';
}

module.exports = {
  // Critical binding extraction
  buildMemberPathShared,
  extractIdentifiersShared,
  extractBindingShared,
  extractTemplateLiteralShared,
  extractMethodCallBindingShared,

  // Utility functions
  isEventHandler,
  sanitizeIdentifier,
  getSourceLocation,
  escapeCSharpString,

  // Type checkers (Babel-agnostic)
  isIdentifier,
  isMemberExpression,
  isOptionalMemberExpression,
  isCallExpression,
  isBinaryExpression,
  isLogicalExpression,
  isUnaryExpression,
  isNumericLiteral,
  isStringLiteral,
  isBooleanLiteral
};
