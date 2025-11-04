/**
 * Style Object Extractor for Minimact Transpiler
 *
 * Extracts style={{...}} objects and converts them to CSS format.
 * Handles static and dynamic style properties.
 *
 * Examples:
 * - style={{ fontSize: '32px' }} → "font-size: 32px"
 * - style={{ opacity: isVisible ? 1 : 0.5 }} → "opacity: {0}" with binding
 * - style={{ color: user.color, fontSize: size }} → "color: {0}; font-size: {1}"
 *
 * Reuses from old plugin:
 * - babel-plugin-minimact/src/utils/styleConverter.cjs → Style conversion logic (FULL FILE)
 * - babel-plugin-minimact/src/extractors/templates.cjs → extractStyleObjectTemplate()
 */

const { extractBindings } = require('./bindings');

/**
 * Extract style object
 *
 * Converts JavaScript style object to CSS string with bindings.
 * Handles both static and dynamic property values.
 *
 * Pattern from babel-plugin-minimact/src/extractors/templates.cjs (extractStyleObjectTemplate)
 * and babel-plugin-minimact/src/utils/styleConverter.cjs
 *
 * @param {Object} expr - Babel ObjectExpression node
 * @param {Object} t - Babel types
 * @returns {Object} - Style info with css, bindings, properties
 */
function extractStyleObject(expr, t) {
  if (!t.isObjectExpression(expr)) {
    console.warn('[Style Extractor] Expected ObjectExpression for style');
    return null;
  }

  const properties = [];
  const cssProperties = [];
  const bindings = [];
  const slots = [];
  let slotIndex = 0;
  let hasBindings = false;

  // Process each property
  for (const prop of expr.properties) {
    if (t.isObjectProperty(prop) && !prop.computed) {
      const propertyInfo = extractStyleProperty(prop, slotIndex, t);

      if (propertyInfo) {
        properties.push(propertyInfo);
        cssProperties.push(propertyInfo.css);

        if (propertyInfo.binding) {
          hasBindings = true;
          bindings.push(propertyInfo.binding);
          slots.push(propertyInfo.slotPosition);
          slotIndex++;
        }
      }
    } else if (t.isSpreadElement(prop)) {
      // Handle spread: style={{ ...baseStyle }}
      console.warn('[Style Extractor] Spread elements in style not yet supported');
    }
  }

  // Join CSS properties
  const css = cssProperties.join('; ');

  return {
    css,
    bindings,
    slots,
    properties,
    hasBindings,
    isStatic: !hasBindings
  };
}

/**
 * Extract individual style property
 *
 * Processes a single property from the style object.
 * Handles static values, dynamic bindings, and conditional values.
 *
 * @param {Object} prop - Babel ObjectProperty node
 * @param {number} currentSlotIndex - Current slot index for bindings
 * @param {Object} t - Babel types
 * @returns {Object|null} - Property info with key, value, binding, css
 */
function extractStyleProperty(prop, currentSlotIndex, t) {
  // Get property key (camelCase)
  const key = t.isIdentifier(prop.key)
    ? prop.key.name
    : String(prop.key.value);

  // Convert to CSS key (kebab-case)
  const cssKey = convertCamelToKebab(key);

  const value = prop.value;

  // Check if value is dynamic
  if (isDynamicValue(value, t)) {
    // Dynamic value - extract binding
    const binding = extractBindings(value, t);

    if (binding) {
      // Determine the actual binding string
      const bindingStr = typeof binding === 'object'
        ? (binding.binding || binding.conditional || binding.left || '<complex>')
        : binding;

      const slotPosition = cssKey.length + 2; // Position after "key: "

      return {
        key,
        cssKey,
        value: `{${currentSlotIndex}}`,
        binding: bindingStr,
        css: `${cssKey}: {${currentSlotIndex}}`,
        slotPosition,
        isDynamic: true,
        isConditional: typeof binding === 'object' && binding.type === 'conditional'
      };
    } else {
      // Complex expression - fall back to static conversion
      const cssValue = convertStyleValue(value, t);
      return {
        key,
        cssKey,
        value: cssValue,
        css: `${cssKey}: ${cssValue}`,
        isDynamic: false
      };
    }
  } else {
    // Static value
    const cssValue = convertStyleValue(value, t);
    return {
      key,
      cssKey,
      value: cssValue,
      css: `${cssKey}: ${cssValue}`,
      isDynamic: false
    };
  }
}

/**
 * Convert style value to CSS string
 *
 * Handles literals (strings, numbers) and converts to CSS format.
 *
 * Pattern from babel-plugin-minimact/src/utils/styleConverter.cjs (convertStyleValue)
 *
 * @param {Object} value - Babel expression node
 * @param {Object} t - Babel types
 * @returns {string} - CSS value string
 */
function convertStyleValue(value, t) {
  if (t.isStringLiteral(value)) {
    return value.value;
  } else if (t.isNumericLiteral(value)) {
    // Add 'px' for numeric values (except unitless properties)
    const num = value.value;
    return shouldAddPx(num) ? `${num}px` : String(num);
  } else if (t.isBooleanLiteral(value)) {
    return String(value.value);
  } else if (t.isNullLiteral(value)) {
    return 'null';
  } else if (t.isIdentifier(value)) {
    return value.name;
  } else {
    return '<complex>';
  }
}

/**
 * Extract conditional value from ternary expression
 *
 * Handles conditional style values: opacity: isVisible ? 1 : 0.5
 *
 * @param {Object} expr - Babel ConditionalExpression node
 * @param {Object} t - Babel types
 * @returns {Object} - Conditional value info
 */
function extractConditionalValue(expr, t) {
  if (!t.isConditionalExpression(expr)) {
    return null;
  }

  // Extract condition
  let condition = null;
  if (t.isIdentifier(expr.test)) {
    condition = expr.test.name;
  } else if (t.isMemberExpression(expr.test)) {
    const { buildMemberPath } = require('./bindings');
    condition = buildMemberPath(expr.test, t);
  } else {
    condition = '<complex>';
  }

  // Extract values
  const trueValue = convertStyleValue(expr.consequent, t);
  const falseValue = convertStyleValue(expr.alternate, t);

  return {
    condition,
    trueValue,
    falseValue
  };
}

/**
 * Convert camelCase to kebab-case
 *
 * Converts JavaScript property names to CSS property names.
 *
 * Examples:
 * - marginTop → margin-top
 * - backgroundColor → background-color
 * - fontSize → font-size
 *
 * Pattern from babel-plugin-minimact/src/utils/styleConverter.cjs (camelToKebab)
 *
 * @param {string} camelCase - camelCase string
 * @returns {string} - kebab-case string
 */
function convertCamelToKebab(camelCase) {
  return camelCase.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

/**
 * Check if value is dynamic (needs binding)
 *
 * @param {Object} value - Babel expression node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if dynamic
 */
function isDynamicValue(value, t) {
  return t.isConditionalExpression(value) ||
         t.isIdentifier(value) ||
         t.isMemberExpression(value) ||
         t.isLogicalExpression(value) ||
         t.isBinaryExpression(value) ||
         t.isCallExpression(value);
}

/**
 * Check if numeric value should have 'px' added
 *
 * Some CSS properties are unitless (e.g., opacity, zIndex).
 *
 * @param {number} num - Numeric value
 * @returns {boolean} - True if should add px
 */
function shouldAddPx(num) {
  // These properties should remain unitless
  const unitlessProperties = new Set([
    'opacity',
    'zIndex',
    'fontWeight',
    'lineHeight',
    'flex',
    'flexGrow',
    'flexShrink',
    'order'
  ]);

  // For now, add px to all numbers
  // TODO: Track which property this value belongs to
  return num !== 0;
}

/**
 * Convert full style object to CSS string (static only)
 *
 * Quick conversion for fully static style objects.
 *
 * @param {Object} expr - Babel ObjectExpression node
 * @param {Object} t - Babel types
 * @returns {string|null} - CSS string or null if has bindings
 */
function convertToStaticCSS(expr, t) {
  const styleInfo = extractStyleObject(expr, t);

  if (!styleInfo || styleInfo.hasBindings) {
    return null;
  }

  return styleInfo.css;
}

/**
 * Check if style object is static (no bindings)
 *
 * @param {Object} expr - Babel ObjectExpression node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if static
 */
function isStaticStyle(expr, t) {
  if (!t.isObjectExpression(expr)) {
    return false;
  }

  for (const prop of expr.properties) {
    if (t.isObjectProperty(prop) && !prop.computed) {
      if (isDynamicValue(prop.value, t)) {
        return false;
      }
    } else if (t.isSpreadElement(prop)) {
      return false; // Spread makes it dynamic
    }
  }

  return true;
}

/**
 * Get binding count from style object
 *
 * @param {Object} styleInfo - Style info from extractStyleObject
 * @returns {number} - Number of bindings
 */
function getBindingCount(styleInfo) {
  return styleInfo ? styleInfo.bindings.length : 0;
}

/**
 * Validate style info
 *
 * @param {Object} styleInfo - Style info from extractStyleObject
 * @returns {boolean} - True if valid
 */
function validateStyle(styleInfo) {
  if (!styleInfo) return false;

  if (styleInfo.hasBindings) {
    if (styleInfo.bindings.length !== styleInfo.slots.length) {
      console.warn('[Style Extractor] Binding count mismatch:', {
        bindings: styleInfo.bindings.length,
        slots: styleInfo.slots.length
      });
      return false;
    }
  }

  return true;
}

/**
 * Merge multiple style objects
 *
 * Combines multiple style objects into one.
 *
 * @param {Array} styles - Array of style info objects
 * @returns {Object} - Merged style info
 */
function mergeStyles(styles) {
  const mergedProperties = [];
  const mergedBindings = [];
  const mergedSlots = [];
  let hasBindings = false;

  for (const style of styles) {
    if (!style) continue;

    mergedProperties.push(...style.properties);

    if (style.hasBindings) {
      hasBindings = true;
      mergedBindings.push(...style.bindings);
      mergedSlots.push(...style.slots);
    }
  }

  const css = mergedProperties.map(p => p.css).join('; ');

  return {
    css,
    bindings: mergedBindings,
    slots: mergedSlots,
    properties: mergedProperties,
    hasBindings,
    isStatic: !hasBindings
  };
}

module.exports = {
  extractStyleObject,
  extractStyleProperty,
  extractConditionalValue,
  convertCamelToKebab,
  convertStyleValue,
  isDynamicValue,
  shouldAddPx,
  convertToStaticCSS,
  isStaticStyle,
  getBindingCount,
  validateStyle,
  mergeStyles
};
