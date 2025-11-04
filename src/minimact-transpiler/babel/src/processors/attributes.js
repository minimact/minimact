/**
 * Attribute Processor for Minimact Transpiler
 *
 * PHASE 1 - FIRST PASS: Attribute structure capture
 *
 * Handles all JSX attribute types:
 * - Static strings: className="btn"
 * - Boolean: disabled, checked={true}
 * - Dynamic expressions: className={style}
 * - Template literals: className={`count-${count}`}
 * - Style objects: style={{ color: 'red' }}
 * - Spread: {...props}
 *
 * Reuses patterns from:
 * babel-plugin-minimact/src/extractors/templates.cjs (lines 850-900)
 * babel-plugin-minimact/src/generators/jsx.cjs (lines 102-140)
 */

/**
 * Process all attributes on a JSX element
 *
 * Main entry point for attribute processing. Iterates through attributes
 * and delegates to specific processors based on attribute type.
 *
 * Pattern from old plugin: templates.cjs lines 850-900
 *
 * @param {Array} attributes - Array of JSX attribute nodes
 * @param {string} parentPath - Parent element hex path
 * @param {Array} parentSegments - Parent path segments
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @returns {Array} - Array of processed attribute nodes
 */
function processAttributes(attributes, parentPath, parentSegments, pathGen, t) {
  const result = [];

  for (const attr of attributes) {
    if (t.isJSXAttribute(attr)) {
      // Standard attribute: name="value" or name={expression}
      const processed = processJSXAttribute(attr, parentPath, parentSegments, t);
      if (processed) {
        result.push(processed);
      }
    } else if (t.isJSXSpreadAttribute(attr)) {
      // Spread attribute: {...props}
      const processed = processSpreadAttribute(attr, parentPath, parentSegments, t);
      if (processed) {
        result.push(processed);
      }
    }
  }

  return result;
}

/**
 * Process a standard JSX attribute
 *
 * Determines attribute type and delegates to appropriate processor.
 *
 * @param {Object} attr - JSX attribute node
 * @param {string} parentPath - Parent element hex path
 * @param {Array} parentSegments - Parent path segments
 * @param {Object} t - Babel types
 * @returns {Object|null} - Processed attribute node
 */
function processJSXAttribute(attr, parentPath, parentSegments, t) {
  const attrName = attr.name.name;
  const attrValue = attr.value;

  // Generate attribute path with @ prefix
  const attrPath = `${parentPath}.@${attrName}`;
  const attrSegments = [...parentSegments, `@${attrName}`];

  // 1. Boolean attribute: <button disabled> or <input checked />
  if (!attrValue || attrValue === null) {
    return processBooleanAttribute(attr, attrPath, attrSegments);
  }

  // 2. Static string: className="container"
  if (t.isStringLiteral(attrValue)) {
    return processStaticAttribute(attr, attrPath, attrSegments, t);
  }

  // 3. Dynamic expression: className={expression}
  if (t.isJSXExpressionContainer(attrValue)) {
    return processDynamicAttribute(attr, attrPath, attrSegments, t);
  }

  // Unknown attribute type
  console.warn('[Attributes] Unknown attribute type:', attr.type);
  return null;
}

/**
 * Process static string attribute
 *
 * Example: className="btn-primary"
 * Pattern from old plugin: templates.cjs lines 879-890
 *
 * @param {Object} attr - JSX attribute node
 * @param {string} attrPath - Attribute hex path
 * @param {Array} attrSegments - Attribute path segments
 * @param {Object} t - Babel types
 * @returns {Object} - StaticAttribute node
 */
function processStaticAttribute(attr, attrPath, attrSegments, t) {
  const attrName = attr.name.name;
  const value = attr.value.value;

  console.log(`    [Attr] ${attrName}="${value}" (static) → ${attrPath}`);

  return {
    type: 'StaticAttribute',
    name: attrName,
    value: value,
    path: attrPath,
    pathSegments: attrSegments
  };
}

/**
 * Process dynamic expression attribute
 *
 * Handles:
 * - Simple identifier: className={myClass}
 * - Member expression: className={user.role}
 * - Template literal: className={`count-${count}`}
 * - Style object: style={{ color: 'red' }}
 * - Other expressions: className={condition ? 'a' : 'b'}
 *
 * Pattern from old plugin: templates.cjs lines 856-877
 *
 * @param {Object} attr - JSX attribute node
 * @param {string} attrPath - Attribute hex path
 * @param {Array} attrSegments - Attribute path segments
 * @param {Object} t - Babel types
 * @returns {Object} - DynamicAttribute node
 */
function processDynamicAttribute(attr, attrPath, attrSegments, t) {
  const attrName = attr.name.name;
  const expr = attr.value.expression;
  const expressionType = getExpressionType(expr, t);

  console.log(`    [Attr] ${attrName}={...} (${expressionType}) → ${attrPath}`);

  const attrNode = {
    type: 'DynamicAttribute',
    name: attrName,
    expressionType,
    path: attrPath,
    pathSegments: attrSegments
  };

  // Extract bindings based on expression type
  if (t.isIdentifier(expr)) {
    // Simple binding: className={myClass}
    attrNode.bindings = [{
      type: 'Identifier',
      path: expr.name
    }];
    attrNode.template = '{0}';
  } else if (t.isMemberExpression(expr)) {
    // Member expression: className={user.role}
    attrNode.bindings = [{
      type: 'MemberExpression',
      path: buildMemberPath(expr, t)
    }];
    attrNode.template = '{0}';
  } else if (t.isTemplateLiteral(expr)) {
    // Template literal: className={`count-${count}`}
    // Will be extracted in Phase 2
    attrNode.bindings = extractTemplateLiteralBindings(expr, t);
    attrNode.template = buildTemplateString(expr, t);
  } else if (t.isObjectExpression(expr) && attrName === 'style') {
    // Style object: style={{ fontSize: '32px', opacity: isVisible ? 1 : 0.5 }}
    // Will be extracted in Phase 2
    attrNode.subtype = 'style-object';
    attrNode.styleObject = extractStyleObjectStructure(expr, t);
  } else {
    // Complex expression - store raw for Phase 2
    attrNode.raw = '<complex>';
  }

  return attrNode;
}

/**
 * Process boolean attribute
 *
 * Example: <button disabled> or <input checked />
 * Pattern from old plugin: jsx.cjs (implicit boolean handling)
 *
 * @param {Object} attr - JSX attribute node
 * @param {string} attrPath - Attribute hex path
 * @param {Array} attrSegments - Attribute path segments
 * @returns {Object} - BooleanAttribute node
 */
function processBooleanAttribute(attr, attrPath, attrSegments) {
  const attrName = attr.name.name;

  console.log(`    [Attr] ${attrName}=true (boolean) → ${attrPath}`);

  return {
    type: 'BooleanAttribute',
    name: attrName,
    value: true,
    path: attrPath,
    pathSegments: attrSegments
  };
}

/**
 * Process spread attribute
 *
 * Example: <div {...props}>
 * Pattern from old plugin: jsx.cjs lines 86-94 (spread detection)
 *
 * @param {Object} attr - JSX spread attribute node
 * @param {string} parentPath - Parent element hex path
 * @param {Array} parentSegments - Parent path segments
 * @param {Object} t - Babel types
 * @returns {Object} - SpreadAttribute node
 */
function processSpreadAttribute(attr, parentPath, parentSegments, t) {
  const attrPath = `${parentPath}.@spread`;
  const attrSegments = [...parentSegments, `@spread`];

  // Extract spread argument (usually an identifier)
  const raw = t.isIdentifier(attr.argument) ? attr.argument.name : '<complex>';

  console.log(`    [Attr] {...${raw}} (spread) → ${attrPath}`);

  return {
    type: 'SpreadAttribute',
    expressionType: 'SpreadElement',
    raw,
    path: attrPath,
    pathSegments: attrSegments
  };
}

/**
 * Get expression type as string
 *
 * @param {Object} expr - Babel expression node
 * @param {Object} t - Babel types
 * @returns {string} - Expression type name
 */
function getExpressionType(expr, t) {
  if (t.isIdentifier(expr)) return 'Identifier';
  if (t.isMemberExpression(expr)) return 'MemberExpression';
  if (t.isTemplateLiteral(expr)) return 'TemplateLiteral';
  if (t.isObjectExpression(expr)) return 'ObjectExpression';
  if (t.isConditionalExpression(expr)) return 'ConditionalExpression';
  if (t.isLogicalExpression(expr)) return 'LogicalExpression';
  if (t.isBinaryExpression(expr)) return 'BinaryExpression';
  if (t.isCallExpression(expr)) return 'CallExpression';
  return 'Unknown';
}

/**
 * Build member expression path
 *
 * Example: user.profile.name → "user.profile.name"
 * Pattern from old plugin: templates.cjs lines 767-783
 *
 * @param {Object} expr - Member expression node
 * @param {Object} t - Babel types
 * @returns {string} - Dotted path string
 */
function buildMemberPath(expr, t) {
  const parts = [];
  let current = expr;

  while (t.isMemberExpression(current)) {
    if (t.isIdentifier(current.property)) {
      parts.unshift(current.property.name);
    } else {
      // Computed property: obj[key]
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
 * Extract bindings from template literal (Phase 1 - basic structure only)
 *
 * Example: `Count: ${count}` → [{ type: 'Identifier', path: 'count' }]
 * Pattern from old plugin: templates.cjs lines 223-270
 *
 * @param {Object} node - Template literal node
 * @param {Object} t - Babel types
 * @returns {Array} - Array of binding objects
 */
function extractTemplateLiteralBindings(node, t) {
  const bindings = [];

  for (const expr of node.expressions) {
    if (t.isIdentifier(expr)) {
      bindings.push({
        type: 'Identifier',
        path: expr.name
      });
    } else if (t.isMemberExpression(expr)) {
      bindings.push({
        type: 'MemberExpression',
        path: buildMemberPath(expr, t)
      });
    } else {
      bindings.push({
        type: 'Complex',
        path: '<complex>'
      });
    }
  }

  return bindings;
}

/**
 * Build template string with slot placeholders
 *
 * Example: `Count: ${count}` → "Count: {0}"
 *
 * @param {Object} node - Template literal node
 * @param {Object} t - Babel types
 * @returns {string} - Template string with {0}, {1}... placeholders
 */
function buildTemplateString(node, t) {
  let template = '';
  let slotIndex = 0;

  for (let i = 0; i < node.quasis.length; i++) {
    template += node.quasis[i].value.raw;

    if (i < node.expressions.length) {
      template += `{${slotIndex}}`;
      slotIndex++;
    }
  }

  return template;
}

/**
 * Extract style object structure (Phase 1 - basic capture only)
 *
 * Example: { fontSize: '32px', opacity: isVisible ? 1 : 0.5 }
 * Full extraction happens in Phase 2
 *
 * @param {Object} expr - Object expression node
 * @param {Object} t - Babel types
 * @returns {Array} - Array of property objects
 */
function extractStyleObjectStructure(expr, t) {
  const properties = [];

  for (const prop of expr.properties) {
    if (t.isObjectProperty(prop)) {
      const key = t.isIdentifier(prop.key) ? prop.key.name : String(prop.key.value);
      const value = prop.value;

      if (t.isStringLiteral(value) || t.isNumericLiteral(value)) {
        // Static value
        properties.push({
          key,
          value: String(value.value),
          isStatic: true
        });
      } else if (t.isIdentifier(value)) {
        // Dynamic binding
        properties.push({
          key,
          binding: value.name,
          isStatic: false
        });
      } else if (t.isMemberExpression(value)) {
        // Dynamic member expression
        properties.push({
          key,
          binding: buildMemberPath(value, t),
          isStatic: false
        });
      } else {
        // Complex (conditional, etc.) - Phase 2
        properties.push({
          key,
          value: '<complex>',
          isStatic: false
        });
      }
    }
  }

  return properties;
}

/**
 * Check if attribute is an event handler
 *
 * Examples: onClick, onChange, onSubmit
 *
 * @param {string} attrName - Attribute name
 * @returns {boolean} - True if event handler
 */
function isEventHandler(attrName) {
  return attrName.startsWith('on') && attrName.length > 2 && attrName[2] === attrName[2].toUpperCase();
}

/**
 * Convert className to class (HTML compatibility)
 *
 * Pattern from old plugin: jsx.cjs line 108
 *
 * @param {string} attrName - Attribute name
 * @returns {string} - HTML attribute name
 */
function normalizeAttributeName(attrName) {
  if (attrName === 'className') {
    return 'class';
  }
  return attrName;
}

module.exports = {
  processAttributes,
  processStaticAttribute,
  processDynamicAttribute,
  processBooleanAttribute,
  processSpreadAttribute,
  isEventHandler,
  normalizeAttributeName,
  buildMemberPath,
  getExpressionType
};
