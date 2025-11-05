/**
 * Plugin Element Extractor for Minimact Transpiler
 *
 * Detects and extracts <Plugin> JSX elements for predictive rendering.
 * Plugins are special elements that bridge Minimact with external JS libraries.
 *
 * Examples:
 * - <Plugin name="chart" data={salesData} type="bar" />
 * - <Plugin name="calendar" state={currentDate} />
 * - <Plugin name="map" config={mapConfig} version="2.0.0" />
 *
 * Ported from:
 * - babel-plugin-minimact/src/analyzers/analyzePluginUsage.cjs (lines 1-318)
 * - babel-plugin-minimact/src/generators/plugin.cjs (lines 1-139)
 */

const { buildMemberPath } = require('./bindings');

/**
 * Check if JSX element is a <Plugin> component
 *
 * Detects both direct <Plugin> usage and namespaced <Plugin.Something>.
 *
 * Pattern from babel-plugin-minimact/src/analyzers/analyzePluginUsage.cjs (lines 55-68)
 *
 * @param {Object} node - Babel JSXElement node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if Plugin element
 */
function isPluginElement(node, t) {
  if (!t.isJSXElement(node)) {
    return false;
  }

  const name = node.openingElement.name;

  // Direct: <Plugin>
  if (t.isJSXIdentifier(name) && name.name === 'Plugin') {
    return true;
  }

  // Namespaced: <Plugin.Chart>
  if (t.isJSXMemberExpression(name) &&
      t.isJSXIdentifier(name.object) &&
      name.object.name === 'Plugin') {
    return true;
  }

  return false;
}

/**
 * Extract plugin metadata from JSX element
 *
 * Extracts plugin name, state binding, version, and all attributes.
 *
 * Pattern from babel-plugin-minimact/src/analyzers/analyzePluginUsage.cjs (lines 76-106)
 *
 * @param {Object} node - Babel JSXElement node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @returns {Object|null} - Plugin metadata or null if invalid
 */
function extractPlugin(node, parentPath, pathGen, t) {
  if (!isPluginElement(node, t)) {
    return null;
  }

  const attributes = node.openingElement.attributes;

  // Find required attributes
  const nameAttr = findAttribute(attributes, 'name', t);
  const stateAttr = findAttribute(attributes, 'state', t);

  // Validate required attributes
  if (!nameAttr) {
    console.error('[Plugin Extractor] <Plugin> requires "name" attribute');
    return null;
  }

  if (!stateAttr) {
    console.error('[Plugin Extractor] <Plugin> requires "state" attribute');
    return null;
  }

  // Extract plugin name (must be string literal)
  const pluginName = extractPluginName(nameAttr, t);
  if (!pluginName) {
    console.error('[Plugin Extractor] Plugin "name" must be a string literal');
    return null;
  }

  // Extract state binding
  const stateBinding = extractStateBinding(stateAttr, t);
  if (!stateBinding) {
    console.error('[Plugin Extractor] Failed to extract state binding');
    return null;
  }

  // Extract optional version
  const versionAttr = findAttribute(attributes, 'version', t);
  const version = versionAttr ? extractVersion(versionAttr, t) : null;

  // Extract all other attributes as plugin config
  const config = extractPluginConfig(attributes, t);

  // Generate hex path for plugin element
  const pluginHex = pathGen.next(parentPath);
  const pluginPath = pathGen.buildPath(parentPath, pluginHex);
  const pathSegments = pathGen.parsePath(pluginPath);

  return {
    type: 'Plugin',
    pluginName,
    stateBinding,
    version,
    config,
    path: pluginPath,
    pathSegments,
    // Validation
    isValid: validatePluginName(pluginName) && validateVersion(version)
  };
}

/**
 * Find attribute by name in JSX attributes
 *
 * Pattern from babel-plugin-minimact/src/analyzers/analyzePluginUsage.cjs (lines 114-118)
 *
 * @param {Array} attributes - JSX attributes
 * @param {string} name - Attribute name
 * @param {Object} t - Babel types
 * @returns {Object|null} - JSX attribute or null
 */
function findAttribute(attributes, name, t) {
  return attributes.find(attr =>
    t.isJSXAttribute(attr) &&
    t.isJSXIdentifier(attr.name) &&
    attr.name.name === name
  );
}

/**
 * Extract plugin name from name attribute
 *
 * Plugin name must be a string literal.
 *
 * Pattern from babel-plugin-minimact/src/analyzers/analyzePluginUsage.cjs (lines 126-140)
 *
 * @param {Object} nameAttr - JSX attribute
 * @param {Object} t - Babel types
 * @returns {string|null} - Plugin name or null
 */
function extractPluginName(nameAttr, t) {
  const value = nameAttr.value;

  // String literal: name="chart"
  if (t.isStringLiteral(value)) {
    return value.value;
  }

  // JSX expression: name={"chart"}
  if (t.isJSXExpressionContainer(value) &&
      t.isStringLiteral(value.expression)) {
    return value.expression.value;
  }

  return null;
}

/**
 * Extract state binding from state attribute
 *
 * State can be an identifier, member expression, object expression, or complex expression.
 *
 * Pattern from babel-plugin-minimact/src/analyzers/analyzePluginUsage.cjs (lines 149-195)
 *
 * @param {Object} stateAttr - JSX attribute
 * @param {Object} t - Babel types
 * @returns {Object|null} - State binding metadata or null
 */
function extractStateBinding(stateAttr, t) {
  const value = stateAttr.value;

  if (!t.isJSXExpressionContainer(value)) {
    return null;
  }

  const expression = value.expression;

  // Simple identifier: state={salesData}
  if (t.isIdentifier(expression)) {
    return {
      type: 'identifier',
      name: expression.name,
      binding: expression.name
    };
  }

  // Member expression: state={data.sales}
  if (t.isMemberExpression(expression)) {
    const binding = buildMemberPath(expression, t);
    return {
      type: 'memberExpression',
      binding,
      expression
    };
  }

  // Object expression: state={{ x: 10, y: 20 }}
  if (t.isObjectExpression(expression)) {
    return {
      type: 'objectExpression',
      binding: '__inline_object__',
      properties: expression.properties,
      expression
    };
  }

  // Complex expression (will be evaluated at runtime)
  return {
    type: 'complexExpression',
    binding: '__complex__',
    expression
  };
}

/**
 * Extract version from version attribute
 *
 * Pattern from babel-plugin-minimact/src/analyzers/analyzePluginUsage.cjs (lines 202-214)
 *
 * @param {Object} versionAttr - JSX attribute
 * @param {Object} t - Babel types
 * @returns {string|null} - Version string or null
 */
function extractVersion(versionAttr, t) {
  const value = versionAttr.value;

  // String literal: version="1.0.0"
  if (t.isStringLiteral(value)) {
    return value.value;
  }

  // JSX expression: version={"1.0.0"}
  if (t.isJSXExpressionContainer(value) &&
      t.isStringLiteral(value.expression)) {
    return value.expression.value;
  }

  return null;
}

/**
 * Extract plugin config from remaining attributes
 *
 * Captures all attributes except name, state, version as plugin configuration.
 *
 * @param {Array} attributes - JSX attributes
 * @param {Object} t - Babel types
 * @returns {Object} - Config object with attribute name->value mapping
 */
function extractPluginConfig(attributes, t) {
  const config = {};
  const reservedAttrs = ['name', 'state', 'version'];

  for (const attr of attributes) {
    if (!t.isJSXAttribute(attr)) continue;

    const attrName = attr.name.name;

    // Skip reserved attributes
    if (reservedAttrs.includes(attrName)) continue;

    // Extract attribute value
    const value = extractAttributeValue(attr.value, t);
    if (value !== null) {
      config[attrName] = value;
    }
  }

  return config;
}

/**
 * Extract attribute value (static or expression)
 *
 * @param {Object} value - JSX attribute value node
 * @param {Object} t - Babel types
 * @returns {any} - Extracted value
 */
function extractAttributeValue(value, t) {
  if (!value) return true; // Boolean attribute

  if (t.isStringLiteral(value)) {
    return value.value;
  }

  if (t.isJSXExpressionContainer(value)) {
    const expr = value.expression;

    if (t.isStringLiteral(expr)) return expr.value;
    if (t.isNumericLiteral(expr)) return expr.value;
    if (t.isBooleanLiteral(expr)) return expr.value;
    if (t.isNullLiteral(expr)) return null;

    // For complex expressions, return raw string representation
    if (t.isIdentifier(expr)) {
      return { type: 'binding', name: expr.name };
    }

    if (t.isMemberExpression(expr)) {
      return { type: 'binding', path: buildMemberPath(expr, t) };
    }

    // Return expression reference for complex cases
    return { type: 'expression', raw: '__complex__' };
  }

  return null;
}

/**
 * Validate plugin name format
 *
 * Plugin names must start with a letter and contain only alphanumeric characters.
 *
 * Pattern from babel-plugin-minimact/src/analyzers/analyzePluginUsage.cjs (lines 288-294)
 *
 * @param {string} pluginName - Plugin name
 * @returns {boolean} - True if valid
 */
function validatePluginName(pluginName) {
  if (!pluginName) return false;

  const isValid = /^[A-Za-z][A-Za-z0-9]*$/.test(pluginName);

  if (!isValid) {
    console.warn(
      `[Plugin Extractor] Invalid plugin name "${pluginName}". ` +
      `Plugin names must start with a letter and contain only letters and numbers.`
    );
  }

  return isValid;
}

/**
 * Validate version format (semver)
 *
 * Pattern from babel-plugin-minimact/src/analyzers/analyzePluginUsage.cjs (lines 304-309)
 *
 * @param {string|null} version - Version string
 * @returns {boolean} - True if valid or null
 */
function validateVersion(version) {
  if (!version) return true; // Version is optional

  const isValid = /^\d+\.\d+\.\d+$/.test(version);

  if (!isValid) {
    console.warn(
      `[Plugin Extractor] Invalid semver format: ${version}. ` +
      `Expected format: X.Y.Z (e.g., "1.0.0")`
    );
  }

  return isValid;
}

/**
 * Get plugin type from config
 *
 * Some plugins have a "type" attribute for variants.
 * Example: <Plugin name="chart" type="bar" />
 *
 * @param {Object} pluginInfo - Plugin metadata
 * @returns {string|null} - Plugin type or null
 */
function getPluginType(pluginInfo) {
  return pluginInfo.config && pluginInfo.config.type
    ? pluginInfo.config.type
    : null;
}

/**
 * Check if plugin has required config
 *
 * @param {Object} pluginInfo - Plugin metadata
 * @param {Array} requiredKeys - Required config keys
 * @returns {boolean} - True if all required keys present
 */
function hasRequiredConfig(pluginInfo, requiredKeys) {
  if (!pluginInfo.config) return false;

  return requiredKeys.every(key => key in pluginInfo.config);
}

/**
 * Format plugin for JSON output
 *
 * @param {Object} pluginInfo - Plugin metadata
 * @returns {Object} - Formatted plugin for JSON AST
 */
function formatPluginForJSON(pluginInfo) {
  return {
    type: 'Plugin',
    pluginName: pluginInfo.pluginName,
    stateBinding: pluginInfo.stateBinding,
    version: pluginInfo.version,
    config: pluginInfo.config,
    path: pluginInfo.path,
    pathSegments: pluginInfo.pathSegments
  };
}

module.exports = {
  isPluginElement,
  extractPlugin,
  findAttribute,
  extractPluginName,
  extractStateBinding,
  extractVersion,
  extractPluginConfig,
  extractAttributeValue,
  validatePluginName,
  validateVersion,
  getPluginType,
  hasRequiredConfig,
  formatPluginForJSON
};
