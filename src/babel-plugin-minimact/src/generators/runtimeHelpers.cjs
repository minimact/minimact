/**
 * Runtime Helper Generators
 */

const t = require('@babel/types');
const { escapeCSharpString } = require('../utils/helpers.cjs');
// Lazy load to avoid circular dependencies with jsx.cjs and expressions.cjs

/**
 * Generate runtime helper call for complex JSX patterns
 * Uses MinimactHelpers.createElement() for dynamic scenarios
 */
function generateRuntimeHelperCall(tagName, attributes, children, component, indent) {
  // Lazy load to avoid circular dependency
  const { generateCSharpExpression } = require('./expressions.cjs');
  const { generateJSXElement } = require('./jsx.cjs');

  const indentStr = '    '.repeat(indent);

  // Build props object
  let propsCode = 'null';
  const regularProps = [];
  const spreadProps = [];

  for (const attr of attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      // Spread operator: {...props}
      spreadProps.push(generateCSharpExpression(attr.argument));
    } else if (t.isJSXAttribute(attr)) {
      const name = attr.name.name;
      const value = attr.value;

      // Convert attribute value to C# expression
      let propValue;
      if (t.isStringLiteral(value)) {
        propValue = `"${escapeCSharpString(value.value)}"`;
      } else if (t.isJSXExpressionContainer(value)) {
        propValue = generateCSharpExpression(value.expression);
      } else if (value === null) {
        propValue = '"true"'; // Boolean attribute like <input disabled />
      } else {
        propValue = `"${value}"`;
      }

      regularProps.push(`${name} = ${propValue}`);
    }
  }

  // Build props with potential spread merging
  if (regularProps.length > 0 && spreadProps.length > 0) {
    // Need to merge: ((object)new { prop1 = val1 }).MergeWith((object)spreadObj)
    // Cast both to object to avoid dynamic dispatch issues
    const regularPropsObj = `new { ${regularProps.join(', ')} }`;
    propsCode = `((object)${regularPropsObj})`;
    for (const spreadProp of spreadProps) {
      propsCode = `${propsCode}.MergeWith((object)${spreadProp})`;
    }
  } else if (regularProps.length > 0) {
    // Just regular props
    propsCode = `new { ${regularProps.join(', ')} }`;
  } else if (spreadProps.length > 0) {
    // Just spread props
    propsCode = spreadProps[0];
    for (let i = 1; i < spreadProps.length; i++) {
      propsCode = `((object)${propsCode}).MergeWith((object)${spreadProps[i]})`;
    }
  }

  // Build children
  const childrenArgs = [];
  for (const child of children) {
    if (t.isJSXText(child)) {
      const text = child.value.trim();
      if (text) {
        childrenArgs.push(`"${escapeCSharpString(text)}"`);
      }
    } else if (t.isJSXElement(child)) {
      childrenArgs.push(generateJSXElement(child, component, indent + 1));
    } else if (t.isJSXExpressionContainer(child)) {
      const expr = child.expression;

      // Handle conditionals with JSX: {condition ? <A/> : <B/>}
      if (t.isConditionalExpression(expr)) {
        const { generateBooleanExpression } = require('./expressions.cjs');
        const condition = generateBooleanExpression(expr.test);
        const consequent = t.isJSXElement(expr.consequent) || t.isJSXFragment(expr.consequent)
          ? generateJSXElement(expr.consequent, component, indent + 1)
          : generateCSharpExpression(expr.consequent);
        const alternate = t.isJSXElement(expr.alternate) || t.isJSXFragment(expr.alternate)
          ? generateJSXElement(expr.alternate, component, indent + 1)
          : generateCSharpExpression(expr.alternate);
        childrenArgs.push(`(${condition}) ? ${consequent} : ${alternate}`);
      }
      // Handle logical expressions with JSX: {condition && <Element/>}
      else if (t.isLogicalExpression(expr) && expr.operator === '&&') {
        const { generateBooleanExpression } = require('./expressions.cjs');
        const left = generateBooleanExpression(expr.left);
        const right = t.isJSXElement(expr.right) || t.isJSXFragment(expr.right)
          ? generateJSXElement(expr.right, component, indent + 1)
          : generateCSharpExpression(expr.right);
        childrenArgs.push(`(${left}) ? ${right} : null`);
      }
      // Handle .map() with JSX callback
      else if (t.isCallExpression(expr) &&
               t.isMemberExpression(expr.callee) &&
               t.isIdentifier(expr.callee.property, { name: 'map' })) {
        // Lazy load generateMapExpression
        const { generateMapExpression } = require('./expressions.cjs');
        childrenArgs.push(generateMapExpression(expr, component, indent));
      }
      // Dynamic children (e.g., items.Select(...))
      else {
        childrenArgs.push(generateCSharpExpression(child.expression));
      }
    }
  }

  // Generate the createElement call
  if (childrenArgs.length === 0) {
    return `MinimactHelpers.createElement("${tagName}", ${propsCode})`;
  } else if (childrenArgs.length === 1) {
    return `MinimactHelpers.createElement("${tagName}", ${propsCode}, ${childrenArgs[0]})`;
  } else {
    const childrenStr = childrenArgs.join(', ');
    return `MinimactHelpers.createElement("${tagName}", ${propsCode}, ${childrenStr})`;
  }
}

/**
 * Force runtime helper generation for a JSX node (used in conditionals/logical expressions)
 */
function generateRuntimeHelperForJSXNode(node, component, indent) {
  // Lazy load to avoid circular dependency
  const { generateCSharpExpression } = require('./expressions.cjs');

  if (t.isJSXFragment(node)) {
    // Handle fragments
    const children = node.children;
    const childrenArgs = [];
    for (const child of children) {
      if (t.isJSXText(child)) {
        const text = child.value.trim();
        if (text) {
          childrenArgs.push(`"${escapeCSharpString(text)}"`);
        }
      } else if (t.isJSXElement(child)) {
        childrenArgs.push(generateRuntimeHelperForJSXNode(child, component, indent + 1));
      } else if (t.isJSXExpressionContainer(child)) {
        childrenArgs.push(generateCSharpExpression(child.expression));
      }
    }
    if (childrenArgs.length === 0) {
      return 'MinimactHelpers.Fragment()';
    }
    return `MinimactHelpers.Fragment(${childrenArgs.join(', ')})`;
  }

  if (t.isJSXElement(node)) {
    const tagName = node.openingElement.name.name;
    const attributes = node.openingElement.attributes;
    const children = node.children;
    return generateRuntimeHelperCall(tagName, attributes, children, component, indent);
  }

  return 'null';
}




module.exports = {
  generateRuntimeHelperCall,
  generateRuntimeHelperForJSXNode
};
