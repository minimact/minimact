/**
 * Complex Expression Template Extractor for Minimact Transpiler
 *
 * Converts complex expressions into parameterized templates with expression trees.
 * This enables predictive rendering even for expressions that need C# evaluation.
 *
 * Examples:
 * - {count * 2 + 1} → { template: "{0} * 2 + 1", bindings: ["count"] }
 * - {Math.floor(price * 1.2)} → { template: "Math.floor({0} * 1.2)", bindings: ["price"] }
 * - {items[index]} → { template: "{0}[{1}]", bindings: ["items", "index"] }
 *
 * This allows Rust to cache patches based on expression structure, not just static values.
 */

const { extractBindings } = require('./bindings');

/**
 * Extract complex expression as template with expression tree
 *
 * @param {Object} expr - Babel expression node
 * @param {Object} t - Babel types
 * @returns {Object} - { template, bindings, expressionTree }
 */
function extractComplexExpression(expr, t) {
  const bindings = [];
  const bindingMap = new Map(); // Map variable names to slot indices

  // Build expression tree and extract template simultaneously
  const expressionTree = buildExpressionTree(expr, bindings, bindingMap, t);
  const template = buildTemplateString(expressionTree);

  return {
    template,
    bindings,
    expressionTree
  };
}

/**
 * Build expression tree recursively
 *
 * Walks the Babel AST and creates a simplified expression tree with slot bindings.
 *
 * @param {Object} node - Babel AST node
 * @param {Array} bindings - Accumulator for bindings
 * @param {Map} bindingMap - Map of variable names to slot indices
 * @param {Object} t - Babel types
 * @returns {Object} - Expression tree node
 */
function buildExpressionTree(node, bindings, bindingMap, t) {
  // Identifier: count → { type: 'Binding', slot: 0 }
  if (t.isIdentifier(node)) {
    const name = node.name;

    if (!bindingMap.has(name)) {
      bindingMap.set(name, bindings.length);
      bindings.push(name);
    }

    return {
      type: 'Binding',
      slot: bindingMap.get(name),
      name
    };
  }

  // Member Expression: user.name → { type: 'Binding', slot: 0 }
  if (t.isMemberExpression(node) && !node.computed) {
    const path = buildMemberPath(node, t);

    if (!bindingMap.has(path)) {
      bindingMap.set(path, bindings.length);
      bindings.push(path);
    }

    return {
      type: 'Binding',
      slot: bindingMap.get(path),
      name: path
    };
  }

  // Computed Member Expression: items[index] → { type: 'MemberExpression', object: ..., property: ... }
  if (t.isMemberExpression(node) && node.computed) {
    return {
      type: 'MemberExpression',
      computed: true,
      object: buildExpressionTree(node.object, bindings, bindingMap, t),
      property: buildExpressionTree(node.property, bindings, bindingMap, t)
    };
  }

  // Optional Member Expression: user?.name, obj?.prop?.nested
  if (t.isOptionalMemberExpression(node)) {
    // For optional chaining, try to build the full path if non-computed
    if (!node.computed) {
      const path = buildOptionalMemberPath(node, t);

      if (path) {
        if (!bindingMap.has(path)) {
          bindingMap.set(path, bindings.length);
          bindings.push(path);
        }

        return {
          type: 'OptionalBinding',
          slot: bindingMap.get(path),
          name: path,
          optional: true
        };
      }
    }

    // For computed or complex optional chaining
    return {
      type: 'OptionalMemberExpression',
      optional: node.optional,
      computed: node.computed,
      object: buildExpressionTree(node.object, bindings, bindingMap, t),
      property: node.computed
        ? buildExpressionTree(node.property, bindings, bindingMap, t)
        : { type: 'Identifier', name: node.property.name }
    };
  }

  // Optional Call Expression: func?.(), obj?.method?.()
  if (t.isOptionalCallExpression(node)) {
    const callee = node.callee;
    let calleeString = '<optionalCallee>';

    if (t.isIdentifier(callee)) {
      calleeString = callee.name;
    } else if (t.isMemberExpression(callee) || t.isOptionalMemberExpression(callee)) {
      calleeString = buildOptionalMemberPath(callee, t) || '<complex>';
    }

    return {
      type: 'OptionalCallExpression',
      optional: node.optional,
      callee: calleeString,
      arguments: node.arguments.map(arg => buildExpressionTree(arg, bindings, bindingMap, t))
    };
  }

  // Literal: 42, "hello", true → { type: 'Literal', value: ... }
  if (t.isNumericLiteral(node) || t.isStringLiteral(node) || t.isBooleanLiteral(node)) {
    return {
      type: 'Literal',
      value: node.value,
      raw: t.isStringLiteral(node) ? `"${node.value}"` : String(node.value)
    };
  }

  // Null/Undefined
  if (t.isNullLiteral(node)) {
    return { type: 'Literal', value: null, raw: 'null' };
  }
  if (t.isIdentifier(node) && node.name === 'undefined') {
    return { type: 'Literal', value: undefined, raw: 'undefined' };
  }

  // Binary Expression: a + b, x * y
  if (t.isBinaryExpression(node)) {
    return {
      type: 'BinaryExpression',
      operator: node.operator,
      left: buildExpressionTree(node.left, bindings, bindingMap, t),
      right: buildExpressionTree(node.right, bindings, bindingMap, t)
    };
  }

  // Unary Expression: -x, !flag, +value
  if (t.isUnaryExpression(node)) {
    return {
      type: 'UnaryExpression',
      operator: node.operator,
      prefix: node.prefix,
      argument: buildExpressionTree(node.argument, bindings, bindingMap, t)
    };
  }

  // Logical Expression: a && b, x || y
  if (t.isLogicalExpression(node)) {
    return {
      type: 'LogicalExpression',
      operator: node.operator,
      left: buildExpressionTree(node.left, bindings, bindingMap, t),
      right: buildExpressionTree(node.right, bindings, bindingMap, t)
    };
  }

  // Conditional Expression: condition ? trueVal : falseVal
  if (t.isConditionalExpression(node)) {
    return {
      type: 'ConditionalExpression',
      test: buildExpressionTree(node.test, bindings, bindingMap, t),
      consequent: buildExpressionTree(node.consequent, bindings, bindingMap, t),
      alternate: buildExpressionTree(node.alternate, bindings, bindingMap, t)
    };
  }

  // Call Expression: Math.floor(x), func(a, b)
  if (t.isCallExpression(node)) {
    const callee = getCalleeString(node.callee, t);

    return {
      type: 'CallExpression',
      callee,
      arguments: node.arguments.map(arg => buildExpressionTree(arg, bindings, bindingMap, t))
    };
  }

  // Array Expression: [1, 2, x]
  if (t.isArrayExpression(node)) {
    return {
      type: 'ArrayExpression',
      elements: node.elements.map(el =>
        el ? buildExpressionTree(el, bindings, bindingMap, t) : { type: 'Literal', value: null, raw: 'null' }
      )
    };
  }

  // Object Expression: { key: value }
  if (t.isObjectExpression(node)) {
    return {
      type: 'ObjectExpression',
      properties: node.properties.map(prop => {
        if (t.isObjectProperty(prop)) {
          return {
            type: 'Property',
            key: t.isIdentifier(prop.key) ? prop.key.name : String(prop.key.value),
            value: buildExpressionTree(prop.value, bindings, bindingMap, t)
          };
        }
        return { type: 'Property', key: '<spread>', value: { type: 'Literal', value: null } };
      })
    };
  }

  // Fallback: complex node type we don't handle yet
  return {
    type: 'Unknown',
    nodeType: node.type,
    raw: '<unknown>'
  };
}

/**
 * Build template string from expression tree
 *
 * Converts expression tree back to string with {0}, {1} slot placeholders.
 *
 * @param {Object} tree - Expression tree node
 * @returns {string} - Template string
 */
function buildTemplateString(tree) {
  switch (tree.type) {
    case 'Binding':
      return `{${tree.slot}}`;

    case 'Literal':
      return tree.raw;

    case 'BinaryExpression':
      return `${buildTemplateString(tree.left)} ${tree.operator} ${buildTemplateString(tree.right)}`;

    case 'UnaryExpression':
      return tree.prefix
        ? `${tree.operator}${buildTemplateString(tree.argument)}`
        : `${buildTemplateString(tree.argument)}${tree.operator}`;

    case 'LogicalExpression':
      return `${buildTemplateString(tree.left)} ${tree.operator} ${buildTemplateString(tree.right)}`;

    case 'ConditionalExpression':
      return `${buildTemplateString(tree.test)} ? ${buildTemplateString(tree.consequent)} : ${buildTemplateString(tree.alternate)}`;

    case 'CallExpression':
      const args = tree.arguments.map(arg => buildTemplateString(arg)).join(', ');
      return `${tree.callee}(${args})`;

    case 'MemberExpression':
      if (tree.computed) {
        return `${buildTemplateString(tree.object)}[${buildTemplateString(tree.property)}]`;
      }
      return `${buildTemplateString(tree.object)}.${buildTemplateString(tree.property)}`;

    case 'OptionalBinding':
      return `{${tree.slot}}`;

    case 'OptionalMemberExpression':
      const optOperator = tree.optional ? '?.' : '.';
      if (tree.computed) {
        return `${buildTemplateString(tree.object)}${tree.optional ? '?.' : ''}[${buildTemplateString(tree.property)}]`;
      }
      return `${buildTemplateString(tree.object)}${optOperator}${tree.property.name || buildTemplateString(tree.property)}`;

    case 'OptionalCallExpression':
      const optArgs = tree.arguments.map(arg => buildTemplateString(arg)).join(', ');
      return `${tree.callee}${tree.optional ? '?.' : ''}(${optArgs})`;

    case 'ArrayExpression':
      const elements = tree.elements.map(el => buildTemplateString(el)).join(', ');
      return `[${elements}]`;

    case 'ObjectExpression':
      const props = tree.properties
        .map(p => `${p.key}: ${buildTemplateString(p.value)}`)
        .join(', ');
      return `{ ${props} }`;

    case 'Unknown':
      return '<unknown>';

    default:
      return '<complex>';
  }
}

/**
 * Get callee string from call expression
 *
 * Examples:
 * - Math.floor → "Math.floor"
 * - console.log → "console.log"
 * - func → "func"
 *
 * @param {Object} callee - Callee node
 * @param {Object} t - Babel types
 * @returns {string} - Callee string
 */
function getCalleeString(callee, t) {
  if (t.isIdentifier(callee)) {
    return callee.name;
  }

  if (t.isMemberExpression(callee)) {
    return buildMemberPath(callee, t);
  }

  return '<callee>';
}

/**
 * Build member expression path
 *
 * @param {Object} node - Member expression node
 * @param {Object} t - Babel types
 * @returns {string} - Dot-separated path
 */
function buildMemberPath(node, t) {
  const parts = [];
  let current = node;

  while (t.isMemberExpression(current)) {
    if (t.isIdentifier(current.property) && !current.computed) {
      parts.unshift(current.property.name);
    } else {
      parts.unshift('<computed>');
    }
    current = current.object;
  }

  if (t.isIdentifier(current)) {
    parts.unshift(current.name);
  }

  return parts.join('.');
}

/**
 * Build optional member expression path with ?. notation
 *
 * @param {Object} node - Optional member expression node
 * @param {Object} t - Babel types
 * @returns {string|null} - Optional chain path or null if complex
 */
function buildOptionalMemberPath(node, t) {
  const parts = [];
  let current = node;

  while (current) {
    if (t.isOptionalMemberExpression(current)) {
      if (t.isIdentifier(current.property) && !current.computed) {
        parts.unshift(current.property.name + (current.optional ? '?' : ''));
      } else if (current.computed) {
        return null; // Computed optional chaining is complex
      }
      current = current.object;
    } else if (t.isMemberExpression(current)) {
      if (t.isIdentifier(current.property) && !current.computed) {
        parts.unshift(current.property.name);
      } else {
        return null;
      }
      current = current.object;
    } else if (t.isIdentifier(current)) {
      parts.unshift(current.name);
      break;
    } else {
      return null; // Complex base
    }
  }

  return parts.join('.');
}

module.exports = {
  extractComplexExpression,
  buildExpressionTree,
  buildTemplateString
};
