/**
 * JSX Generators
 */

const t = require('@babel/types');
const { escapeCSharpString } = require('../utils/helpers.cjs');
const { hasSpreadProps, hasDynamicChildren, hasComplexProps } = require('../analyzers/detection.cjs');
const { extractEventHandler } = require('../extractors/eventHandlers.cjs');
// Note: generateCSharpExpression, generateRuntimeHelperCall and generateJSXExpression will be lazy-loaded to avoid circular dependencies

/**
 * Generate Fragment
 */
function generateFragment(node, component, indent) {
  const children = generateChildren(node.children, component, indent);
  const childrenArray = children.map(c => c.code).join(', ');
  return `new Fragment(${childrenArray})`;
}

/**
 * Generate C# for JSX element
 */
function generateJSXElement(node, component, indent) {
  // Lazy load to avoid circular dependencies
  const { generateCSharpExpression: _generateCSharpExpression } = require('./expressions.cjs');

  const indentStr = '    '.repeat(indent);

  if (t.isJSXFragment(node)) {
    return generateFragment(node, component, indent);
  }

  const tagName = node.openingElement.name.name;
  const attributes = node.openingElement.attributes;
  const children = node.children;

  // Check if this is a Plugin element
  if (tagName === 'Plugin') {
    const { generatePluginNode } = require('./plugin.cjs');
    // Find the matching plugin metadata from component.pluginUsages
    const pluginMetadata = component.pluginUsages.find(p => {
      // Match by finding the plugin in the same location in the tree
      // For now, just use the first match (simple case)
      return true; // TODO: Improve matching logic if multiple plugins
    });

    if (pluginMetadata) {
      return generatePluginNode(pluginMetadata, component);
    } else {
      // Fallback if plugin metadata not found (shouldn't happen)
      console.warn(`[jsx.cjs] Plugin metadata not found for <Plugin> element`);
      return 'new VText("<!-- Plugin not found -->")'
    }
  }

  // Check if this element has markdown attribute and markdown content
  const hasMarkdownAttr = attributes.some(attr =>
    t.isJSXAttribute(attr) && attr.name.name === 'markdown'
  );

  if (hasMarkdownAttr) {
    // Check if child is a markdown state variable
    if (children.length === 1 && t.isJSXExpressionContainer(children[0])) {
      const expr = children[0].expression;
      if (t.isIdentifier(expr)) {
        const varName = expr.name;
        // Check if this is a markdown state variable
        if (component.stateTypes.get(varName) === 'markdown') {
          // Return DivRawHtml with MarkdownHelper.ToHtml()
          return `new DivRawHtml(MarkdownHelper.ToHtml(${varName}))`;
        }
      }
    }
  }

  // Detect if this needs runtime helpers (hybrid approach)
  const needsRuntimeHelper = hasSpreadProps(attributes) ||
                              hasDynamicChildren(children) ||
                              hasComplexProps(attributes);

  if (needsRuntimeHelper) {
    // Lazy load to avoid circular dependency
    const { generateRuntimeHelperCall } = require('./runtimeHelpers.cjs');
    return generateRuntimeHelperCall(tagName, attributes, children, component, indent);
  }

  // Direct VNode construction (compile-time approach)
  // Extract props and event handlers
  const props = [];
  const eventHandlers = [];
  let dataMinimactAttrs = [];

  for (const attr of attributes) {
    if (t.isJSXAttribute(attr)) {
      const name = attr.name.name;
      const value = attr.value;

      // Convert className to class for HTML compatibility
      const htmlAttrName = name === 'className' ? 'class' : name;

      if (name.startsWith('on')) {
        // Event handler
        const handlerName = extractEventHandler(value, component);
        eventHandlers.push(`["${name.toLowerCase()}"] = "${handlerName}"`);
      } else if (name.startsWith('data-minimact-')) {
        // Keep minimact attributes as-is
        const val = t.isStringLiteral(value) ? value.value : _generateCSharpExpression(value.expression);
        dataMinimactAttrs.push(`["${htmlAttrName}"] = "${val}"`);
      } else {
        // Regular prop
        if (t.isStringLiteral(value)) {
          // String literal - use as-is with quotes
          props.push(`["${htmlAttrName}"] = "${escapeCSharpString(value.value)}"`);
        } else if (t.isJSXExpressionContainer(value)) {
          // Special handling for style attribute with object expression
          if (name === 'style' && t.isObjectExpression(value.expression)) {
            const { convertStyleObjectToCss } = require('../utils/styleConverter.cjs');
            const cssString = convertStyleObjectToCss(value.expression);
            props.push(`["style"] = "${cssString}"`);
          } else {
            // Expression - wrap in string interpolation
            const expr = _generateCSharpExpression(value.expression);
            props.push(`["${htmlAttrName}"] = $"{${expr}}"`);
          }
        } else {
          // Fallback
          props.push(`["${htmlAttrName}"] = ""`);
        }
      }
    }
  }

  // Build props dictionary
  const allProps = [...props, ...eventHandlers, ...dataMinimactAttrs];
  const propsStr = allProps.length > 0
    ? `new Dictionary<string, string> { ${allProps.join(', ')} }`
    : 'new Dictionary<string, string>()';

  // Generate children
  const childrenCode = generateChildren(children, component, indent);

  // Build VElement construction
  if (childrenCode.length === 0) {
    return `new VElement("${tagName}", ${propsStr})`;
  } else if (childrenCode.length === 1 && childrenCode[0].type === 'text') {
    return `new VElement("${tagName}", ${propsStr}, ${childrenCode[0].code})`;
  } else {
    // Wrap children appropriately for VNode array
    const childrenArray = childrenCode.map(c => {
      if (c.type === 'text') {
        // Text already has quotes, wrap in VText
        return `new VText(${c.code})`;
      } else if (c.type === 'expression') {
        // Expression needs string interpolation wrapper with extra parentheses for complex expressions
        return `new VText($"{(${c.code})}")`;
      } else {
        // Element is already a VNode
        return c.code;
      }
    }).join(',\n' + indentStr + '    ');
    return `new VElement("${tagName}", ${propsStr}, new VNode[]\n${indentStr}{\n${indentStr}    ${childrenArray}\n${indentStr}})`;
  }
}

/**
 * Generate children
 */
function generateChildren(children, component, indent) {
  const result = [];

  // Lazy load to avoid circular dependency
  const { generateJSXExpression } = require('./expressions.cjs');

  for (const child of children) {
    if (t.isJSXText(child)) {
      const text = child.value.trim();
      if (text) {
        result.push({ type: 'text', code: `"${escapeCSharpString(text)}"` });
      }
    } else if (t.isJSXElement(child)) {
      result.push({ type: 'element', code: generateJSXElement(child, component, indent + 1) });
    } else if (t.isJSXExpressionContainer(child)) {
      result.push({ type: 'expression', code: generateJSXExpression(child.expression, component, indent) });
    }
  }

  return result;
}

module.exports = {
  generateFragment,
  generateJSXElement,
  generateChildren
};
