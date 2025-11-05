/**
 * AST Helper Utilities
 *
 * Shared utility functions for working with Babel AST nodes.
 * Extracted here to avoid circular dependencies.
 */

/**
 * Build member expression path (e.g., user.profile.name)
 *
 * @param {Object} expr - Member expression node
 * @param {Object} t - Babel types
 * @returns {string} - Dot-separated path
 */
function buildMemberPath(expr, t) {
  const parts = [];
  let current = expr;

  // Walk up the member expression chain
  while (t.isMemberExpression(current)) {
    if (t.isIdentifier(current.property) && !current.computed) {
      parts.unshift(current.property.name);
    } else if (current.computed) {
      // Computed property: obj[key] - use placeholder
      parts.unshift('[computed]');
    }
    current = current.object;
  }

  // Add the root identifier
  if (t.isIdentifier(current)) {
    parts.unshift(current.name);
  } else if (t.isThisExpression(current)) {
    parts.unshift('this');
  }

  return parts.join('.');
}

module.exports = {
  buildMemberPath
};
