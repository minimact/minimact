/**
 * Validation and Error Handling for Minimact Transpiler
 *
 * Provides validation functions and structured error handling.
 * Ensures data integrity throughout the transpilation process.
 */

/**
 * Validate hex path format
 *
 * Ensures path follows the hex format: 10000000.20000000.30000000
 * Each segment should be an 8-digit hex number.
 *
 * @param {string} path - Hex path to validate
 * @returns {boolean} - True if valid
 */
function validatePath(path) {
  if (!path || typeof path !== 'string') {
    return false;
  }

  // Split into segments
  const segments = path.split('.');

  // Each segment should be 8-digit hex
  const hexPattern = /^[0-9a-f]{8}$/i;

  for (const segment of segments) {
    // Skip attribute paths (@className, @style)
    if (segment.startsWith('@')) {
      continue;
    }

    if (!hexPattern.test(segment)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate bindings array
 *
 * Ensures bindings are valid strings or objects.
 *
 * @param {Array} bindings - Array of binding strings/objects
 * @returns {boolean} - True if valid
 */
function validateBindings(bindings) {
  if (!Array.isArray(bindings)) {
    return false;
  }

  for (const binding of bindings) {
    if (!binding) {
      return false;
    }

    // Binding can be string or object
    if (typeof binding !== 'string' && typeof binding !== 'object') {
      return false;
    }

    // If string, should not be empty
    if (typeof binding === 'string' && binding.trim().length === 0) {
      return false;
    }
  }

  return true;
}

/**
 * Validate template string
 *
 * Ensures template has correct number of placeholders matching binding count.
 *
 * @param {string} template - Template string with {0}, {1}, etc.
 * @param {number} bindingCount - Expected number of bindings
 * @returns {boolean} - True if valid
 */
function validateTemplate(template, bindingCount) {
  if (!template || typeof template !== 'string') {
    return false;
  }

  // Count placeholders in template
  const placeholderPattern = /\{(\d+)\}/g;
  const matches = template.match(placeholderPattern);
  const placeholderCount = matches ? matches.length : 0;

  // Placeholder count should match binding count
  if (placeholderCount !== bindingCount) {
    return false;
  }

  // Extract placeholder indices
  const indices = matches ? matches.map(m => parseInt(m.match(/\d+/)[0])) : [];

  // Indices should be sequential starting from 0
  for (let i = 0; i < indices.length; i++) {
    if (!indices.includes(i)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate component JSON structure
 *
 * Ensures component has required fields.
 *
 * @param {Object} component - Component JSON object
 * @returns {boolean} - True if valid
 */
function validateComponent(component) {
  if (!component || typeof component !== 'object') {
    return false;
  }

  // Required fields
  if (!component.type || component.type !== 'Component') {
    return false;
  }

  if (!component.componentName || typeof component.componentName !== 'string') {
    return false;
  }

  if (!component.renderMethod || typeof component.renderMethod !== 'object') {
    return false;
  }

  return true;
}

/**
 * Validate node structure
 *
 * Ensures node has required fields based on type.
 *
 * @param {Object} node - JSON node object
 * @returns {boolean} - True if valid
 */
function validateNode(node) {
  if (!node || typeof node !== 'object') {
    return false;
  }

  if (!node.type) {
    return false;
  }

  // Type-specific validation
  switch (node.type) {
    case 'JSXElement':
      return !!(node.tag && node.path && node.pathSegments);

    case 'StaticText':
      return !!(node.path && node.pathSegments && node.content !== undefined);

    case 'Expression':
      return !!(node.path && node.pathSegments && node.expressionType);

    case 'TextTemplate':
      return !!(node.path && node.pathSegments && node.template && node.bindings);

    case 'AttributeTemplate':
      return !!(node.path && node.pathSegments && node.attribute && node.template);

    case 'ConditionalExpression':
      return !!(node.condition !== undefined && node.consequent && node.alternate);

    case 'LogicalExpression':
      return !!(node.operator && node.condition !== undefined && node.branches);

    case 'MapLoop':
      return !!(node.arrayBinding && node.itemVar && node.body);

    default:
      return true; // Unknown types pass
  }
}

/**
 * Create structured error object
 *
 * Builds detailed error with context information.
 *
 * @param {string} message - Error message
 * @param {Object} node - Babel AST node (optional)
 * @param {Object} context - Additional context (optional)
 * @returns {Error} - Error object with metadata
 */
function createError(message, node = null, context = {}) {
  const error = new Error(message);

  // Add metadata
  error.transpilerError = true;
  error.phase = context.phase || 'unknown';

  // Add node location if available
  if (node && node.loc) {
    error.location = {
      line: node.loc.start.line,
      column: node.loc.start.column,
      file: context.filename || 'unknown'
    };
  }

  // Add context
  error.context = context;

  // Add formatted message
  error.formattedMessage = formatErrorMessage(message, node, context);

  return error;
}

/**
 * Format error message with context
 *
 * @param {string} message - Base error message
 * @param {Object} node - Babel AST node (optional)
 * @param {Object} context - Additional context
 * @returns {string} - Formatted message
 */
function formatErrorMessage(message, node, context) {
  let formatted = `[Minimact Transpiler Error] ${message}`;

  if (node && node.loc) {
    formatted += `\n  at ${context.filename || 'unknown'}:${node.loc.start.line}:${node.loc.start.column}`;
  }

  if (context.componentName) {
    formatted += `\n  in component: ${context.componentName}`;
  }

  if (context.phase) {
    formatted += `\n  during phase: ${context.phase}`;
  }

  return formatted;
}

/**
 * Log warning with context
 *
 * Logs a warning with structured information.
 * Does not throw - allows compilation to continue.
 *
 * @param {string} message - Warning message
 * @param {Object} node - Babel AST node (optional)
 * @param {Object} context - Additional context (optional)
 */
function logWarning(message, node = null, context = {}) {
  const formatted = formatWarningMessage(message, node, context);
  console.warn(formatted);
}

/**
 * Format warning message with context
 *
 * @param {string} message - Base warning message
 * @param {Object} node - Babel AST node (optional)
 * @param {Object} context - Additional context
 * @returns {string} - Formatted message
 */
function formatWarningMessage(message, node, context) {
  let formatted = `[Minimact Transpiler Warning] ${message}`;

  if (node && node.loc) {
    formatted += `\n  at ${context.filename || 'unknown'}:${node.loc.start.line}:${node.loc.start.column}`;
  }

  if (context.componentName) {
    formatted += `\n  in component: ${context.componentName}`;
  }

  return formatted;
}

/**
 * Validate path uniqueness
 *
 * Ensures all paths in a tree are unique.
 *
 * @param {Object} node - Root node
 * @returns {Object} - { valid: boolean, duplicates: Array }
 */
function validatePathUniqueness(node) {
  const paths = new Set();
  const duplicates = [];

  function collectPaths(currentNode) {
    if (!currentNode) return;

    if (currentNode.path) {
      if (paths.has(currentNode.path)) {
        duplicates.push(currentNode.path);
      } else {
        paths.add(currentNode.path);
      }
    }

    // Recurse children
    if (currentNode.children) {
      for (const child of currentNode.children) {
        collectPaths(child);
      }
    }

    // Recurse attributes
    if (currentNode.attributes) {
      for (const attr of currentNode.attributes) {
        collectPaths(attr);
      }
    }
  }

  collectPaths(node);

  return {
    valid: duplicates.length === 0,
    duplicates
  };
}

/**
 * Validate path segments
 *
 * Ensures path segments match the path string.
 *
 * @param {string} path - Path string
 * @param {Array} pathSegments - Array of path segments
 * @returns {boolean} - True if valid
 */
function validatePathSegments(path, pathSegments) {
  if (!path || !Array.isArray(pathSegments)) {
    return false;
  }

  const reconstructed = pathSegments.join('.');
  return reconstructed === path;
}

/**
 * Validate hex gap size
 *
 * Ensures there's sufficient gap between hex codes.
 *
 * @param {string} path1 - First path
 * @param {string} path2 - Second path
 * @param {number} minGap - Minimum required gap (default: 0x00100000)
 * @returns {boolean} - True if sufficient gap
 */
function validateHexGap(path1, path2, minGap = 0x00100000) {
  // Get last segments
  const seg1 = parseInt(path1.split('.').pop(), 16);
  const seg2 = parseInt(path2.split('.').pop(), 16);

  const gap = Math.abs(seg2 - seg1);
  return gap >= minGap;
}

/**
 * Validate binding format
 *
 * Ensures binding follows expected format.
 *
 * @param {string} binding - Binding string
 * @returns {boolean} - True if valid
 */
function validateBindingFormat(binding) {
  if (typeof binding !== 'string') {
    return false;
  }

  // Empty binding
  if (binding.trim().length === 0) {
    return false;
  }

  // Complex expressions marked with __expr__
  if (binding.startsWith('__expr__:')) {
    return true;
  }

  // Complex markers
  if (binding === '__complex__') {
    return true;
  }

  // Simple identifier: letters, numbers, underscore
  const identifierPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  if (identifierPattern.test(binding)) {
    return true;
  }

  // Member expression: identifier.identifier.identifier
  const memberPattern = /^[a-zA-Z_$][a-zA-Z0-9_$.]*$/;
  if (memberPattern.test(binding)) {
    return true;
  }

  return false;
}

/**
 * Assert condition with error
 *
 * Throws error if condition is false.
 *
 * @param {boolean} condition - Condition to check
 * @param {string} message - Error message
 * @param {Object} node - Babel AST node (optional)
 * @param {Object} context - Additional context (optional)
 * @throws {Error} - If condition is false
 */
function assert(condition, message, node = null, context = {}) {
  if (!condition) {
    throw createError(message, node, context);
  }
}

/**
 * Safe validation wrapper
 *
 * Wraps validation function to catch and log errors.
 *
 * @param {Function} validationFn - Validation function
 * @param {string} fallbackMessage - Message if validation throws
 * @returns {Function} - Wrapped validation function
 */
function safeValidate(validationFn, fallbackMessage = 'Validation failed') {
  return (...args) => {
    try {
      return validationFn(...args);
    } catch (error) {
      console.warn(`[Validation] ${fallbackMessage}:`, error.message);
      return false;
    }
  };
}

module.exports = {
  // Core validation
  validatePath,
  validateBindings,
  validateTemplate,
  validateComponent,
  validateNode,

  // Error handling
  createError,
  formatErrorMessage,
  logWarning,
  formatWarningMessage,

  // Path validation
  validatePathUniqueness,
  validatePathSegments,
  validateHexGap,

  // Binding validation
  validateBindingFormat,

  // Utilities
  assert,
  safeValidate
};
