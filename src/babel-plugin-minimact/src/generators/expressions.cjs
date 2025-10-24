/**
 * Expression Generators
 */

const t = require('@babel/types');
const { escapeCSharpString } = require('../utils/helpers.cjs');
const { analyzeDependencies } = require('../analyzers/dependencies.cjs');
const { classifyNode } = require('../analyzers/classification.cjs');
const { generateRuntimeHelperForJSXNode } = require('./runtimeHelpers.cjs');
const { generateJSXElement } = require('./jsx.cjs');

// Module-level variable to store current component context
// This allows useState setter detection without threading component through all calls
let currentComponent = null;

/**
 * Generate expression for use in boolean context (conditionals, logical operators)
 * Wraps expressions in MObject for JavaScript truthiness semantics
 */
function generateBooleanExpression(expr) {
  const generated = generateCSharpExpression(expr);

  // Check if this is a member expression on dynamic object (like user.isAdmin)
  if (t.isMemberExpression(expr) && !expr.computed && t.isIdentifier(expr.object)) {
    // Wrap dynamic member access in MObject for proper truthiness
    return `new MObject(${generated})`;
  }

  // Check if this is a simple identifier that might be dynamic
  if (t.isIdentifier(expr)) {
    // Wrap in MObject for null/truthiness handling
    return `new MObject(${generated})`;
  }

  // For other expressions (literals, etc.), use as-is
  return generated;
}

/**
 * Generate JSX expression (e.g., {count}, {user.name})
 */
function generateJSXExpression(expr, component, indent) {
  // Analyze dependencies
  const deps = analyzeDependencies(expr, component);
  const zone = classifyNode(deps);

  // For hybrid zones, we need to split
  if (zone === 'hybrid') {
    return generateHybridExpression(expr, component, deps, indent);
  }

  // Add zone attribute if needed
  const zoneAttr = zone === 'client'
    ? 'data-minimact-client-scope'
    : zone === 'server'
      ? 'data-minimact-server-scope'
      : '';

  // Handle special JSX expression types
  if (t.isConditionalExpression(expr)) {
    // Ternary with JSX: condition ? <A/> : <B/>
    // Force runtime helpers for JSX in conditionals
    const condition = generateBooleanExpression(expr.test);
    const consequent = t.isJSXElement(expr.consequent) || t.isJSXFragment(expr.consequent)
      ? generateRuntimeHelperForJSXNode(expr.consequent, component, indent)
      : generateCSharpExpression(expr.consequent);
    const alternate = t.isJSXElement(expr.alternate) || t.isJSXFragment(expr.alternate)
      ? generateRuntimeHelperForJSXNode(expr.alternate, component, indent)
      : generateCSharpExpression(expr.alternate);
    return `(${condition}) ? ${consequent} : ${alternate}`;
  }

  if (t.isLogicalExpression(expr) && expr.operator === '&&') {
    // Short-circuit with JSX: condition && <Element/>
    // Force runtime helpers for JSX in logical expressions
    const left = generateBooleanExpression(expr.left);
    const right = t.isJSXElement(expr.right) || t.isJSXFragment(expr.right)
      ? generateRuntimeHelperForJSXNode(expr.right, component, indent)
      : generateCSharpExpression(expr.right);
    // Use != null for truthy check (works for bool, object, int, etc.)
    return `(${left}) ? ${right} : null`;
  }

  if (t.isCallExpression(expr) &&
      t.isMemberExpression(expr.callee) &&
      t.isIdentifier(expr.callee.property, { name: 'map' })) {
    // Array.map() with JSX callback
    return generateMapExpression(expr, component, indent);
  }

  // Generate C# expression
  return generateCSharpExpression(expr);
}

/**
 * Generate conditional (ternary)
 */
function generateConditional(node, component, indent) {
  const indentStr = '    '.repeat(indent);
  const condition = generateCSharpExpression(node.test);
  const consequent = generateJSXElement(node.consequent, component, indent);
  const alternate = generateJSXElement(node.alternate, component, indent);

  return `${indentStr}return ${condition}\n${indentStr}    ? ${consequent}\n${indentStr}    : ${alternate};`;
}

/**
 * Generate short-circuit (&&)
 */
function generateShortCircuit(node, component, indent) {
  const indentStr = '    '.repeat(indent);
  const condition = generateCSharpExpression(node.left);
  const element = generateJSXElement(node.right, component, indent);

  return `${indentStr}if (${condition})\n${indentStr}{\n${indentStr}    return ${element};\n${indentStr}}\n${indentStr}return new VText("");`;
}

/**
 * Generate .map() expression
 */
function generateMapExpression(node, component, indent) {
  const indentStr = '    '.repeat(indent);
  const array = node.callee.object;
  const callback = node.arguments[0];

  const arrayName = array.name || generateCSharpExpression(array);
  const itemParam = callback.params[0].name;
  const indexParam = callback.params[1] ? callback.params[1].name : null;
  const body = callback.body;

  const itemCode = t.isJSXElement(body)
    ? generateJSXElement(body, component, indent + 1)
    : generateJSXElement(body.body, component, indent + 1);

  // C# Select supports (item, index) => ...
  if (indexParam) {
    return `${arrayName}.Select((${itemParam}, ${indexParam}) => ${itemCode}).ToArray()`;
  } else {
    return `${arrayName}.Select(${itemParam} => ${itemCode}).ToArray()`;
  }
}

/**
 * Generate C# statement from JavaScript AST node
 */
function generateCSharpStatement(node) {
  if (!node) return '';

  if (t.isExpressionStatement(node)) {
    return generateCSharpExpression(node.expression) + ';';
  }

  if (t.isReturnStatement(node)) {
    return `return ${generateCSharpExpression(node.argument)};`;
  }

  if (t.isVariableDeclaration(node)) {
    const declarations = node.declarations.map(d => {
      const name = d.id.name;
      const value = generateCSharpExpression(d.init);
      return `var ${name} = ${value};`;
    }).join(' ');
    return declarations;
  }

  // Fallback: try to convert as expression
  return generateCSharpExpression(node) + ';';
}

/**
 * Generate C# expression from JS expression
 */
function generateCSharpExpression(node) {
  if (!node) return 'null';

  if (t.isStringLiteral(node)) {
    return `"${escapeCSharpString(node.value)}"`;
  }

  if (t.isNumericLiteral(node)) {
    return String(node.value);
  }

  if (t.isBooleanLiteral(node)) {
    return node.value ? 'true' : 'false';
  }

  if (t.isNullLiteral(node)) {
    return 'null';
  }

  if (t.isIdentifier(node)) {
    return node.name;
  }

  if (t.isMemberExpression(node)) {
    const object = generateCSharpExpression(node.object);
    const propertyName = t.isIdentifier(node.property) ? node.property.name : null;

    // Handle JavaScript to C# API conversions
    if (propertyName === 'length' && !node.computed) {
      // array.length → array.Count
      return `${object}.Count`;
    }

    const property = node.computed
      ? `[${generateCSharpExpression(node.property)}]`
      : `.${propertyName}`;
    return `${object}${property}`;
  }

  if (t.isArrayExpression(node)) {
    const elements = node.elements.map(e => generateCSharpExpression(e)).join(', ');
    return `new List<object> { ${elements} }`;
  }

  if (t.isBinaryExpression(node)) {
    const left = generateCSharpExpression(node.left);
    const right = generateCSharpExpression(node.right);
    // Convert JavaScript operators to C# operators
    let operator = node.operator;
    if (operator === '===') operator = '==';
    if (operator === '!==') operator = '!=';
    return `${left} ${operator} ${right}`;
  }

  if (t.isConditionalExpression(node)) {
    // Handle ternary operator: test ? consequent : alternate
    const test = generateCSharpExpression(node.test);
    const consequent = generateCSharpExpression(node.consequent);
    const alternate = generateCSharpExpression(node.alternate);
    return `(${test}) ? ${consequent} : ${alternate}`;
  }

  if (t.isCallExpression(node)) {
    // Handle console.log → Console.WriteLine
    if (t.isMemberExpression(node.callee) &&
        t.isIdentifier(node.callee.object, { name: 'console' }) &&
        t.isIdentifier(node.callee.property, { name: 'log' })) {
      const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(' + ');
      return `Console.WriteLine(${args})`;
    }

    // Handle .toFixed(n) → .ToString("Fn")
    if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property, { name: 'toFixed' })) {
      const object = generateCSharpExpression(node.callee.object);
      const decimals = node.arguments.length > 0 && t.isNumericLiteral(node.arguments[0])
        ? node.arguments[0].value
        : 2;
      return `${object}.ToString("F${decimals}")`;
    }

    // Handle useState/useClientState setters → SetState calls
    if (t.isIdentifier(node.callee) && currentComponent) {
      const setterName = node.callee.name;

      // Check if this is a useState setter
      const useState = [...(currentComponent.useState || []), ...(currentComponent.useClientState || [])]
        .find(state => state.setter === setterName);

      if (useState && node.arguments.length > 0) {
        const newValue = generateCSharpExpression(node.arguments[0]);
        return `SetState(nameof(${useState.name}), ${newValue})`;
      }
    }

    // Generic function call
    const callee = generateCSharpExpression(node.callee);
    const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(', ');
    return `${callee}(${args})`;
  }

  if (t.isTemplateLiteral(node)) {
    // Convert template literal to C# string interpolation
    let result = '$"';
    for (let i = 0; i < node.quasis.length; i++) {
      result += node.quasis[i].value.raw;
      if (i < node.expressions.length) {
        result += '{' + generateCSharpExpression(node.expressions[i]) + '}';
      }
    }
    result += '"';
    return result;
  }

  if (t.isObjectExpression(node)) {
    // Convert JS object literal to C# anonymous object or Dictionary
    // Check if any key has hyphens (invalid for C# anonymous types)
    const hasHyphenatedKeys = node.properties.some(prop => {
      if (t.isObjectProperty(prop)) {
        const key = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value;
        return typeof key === 'string' && key.includes('-');
      }
      return false;
    });

    const properties = node.properties.map(prop => {
      if (t.isObjectProperty(prop)) {
        const key = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value;
        const value = generateCSharpExpression(prop.value);

        if (hasHyphenatedKeys) {
          // Use Dictionary syntax with quoted keys
          return `["${key}"] = ${value}`;
        } else {
          // Use anonymous object syntax
          return `${key} = ${value}`;
        }
      }
      return '';
    }).filter(p => p !== '');

    if (properties.length === 0) return 'null';

    if (hasHyphenatedKeys) {
      return `new Dictionary<string, object> { ${properties.join(', ')} }`;
    } else {
      return `new { ${properties.join(', ')} }`;
    }
  }

  return 'null';
}

/**
 * Generate attribute value
 */
function generateAttributeValue(value) {
  if (!value) return '""';

  if (t.isStringLiteral(value)) {
    return `"${escapeCSharpString(value.value)}"`;
  }

  if (t.isJSXExpressionContainer(value)) {
    return generateCSharpExpression(value.expression);
  }

  return '""';
}

/**
 * Generate hybrid expression with smart span splitting
 */
function generateHybridExpression(expr, component, deps, indent) {
  // For now, return a simplified version
  // TODO: Implement full AST splitting logic
  return `new VText(${generateCSharpExpression(expr)})`;
}




/**
 * Set the current component context for useState setter detection
 */
function setCurrentComponent(component) {
  currentComponent = component;
}

module.exports = {
  generateAttributeValue,
  generateCSharpExpression,
  generateCSharpStatement,
  generateMapExpression,
  generateConditional,
  generateShortCircuit,
  generateHybridExpression,
  generateJSXExpression,
  generateBooleanExpression,
  setCurrentComponent
};
