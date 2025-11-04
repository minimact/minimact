/**
 * JSX Element Processor for Minimact Transpiler
 *
 * PHASE 1 - FIRST PASS: JSX element analysis
 *
 * Handles:
 * - Tag name extraction
 * - Structural element detection
 * - Element filtering/skipping
 * - JSX element validation
 *
 * Reuses analysis patterns from:
 * babel-plugin-minimact/src/generators/jsx.cjs
 * - Tag name extraction (line 39)
 * - Structural detection (lines 205-211)
 * - Element validation (lines 34-37)
 */

/**
 * Process a JSX element node
 *
 * Main processor for individual JSX elements. Currently delegated to traverser,
 * but this module provides utilities for element analysis and validation.
 *
 * NOTE: In Phase 1, actual element processing happens in traverser.js.
 * This module provides helper functions used by the traverser.
 *
 * @param {Object} node - Babel JSX element node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @param {Object} context - Traversal context
 * @returns {Object|null} - Processed JSX element node or null
 */
function processJSXElement(node, parentPath, pathGen, t, context) {
  // Validate node is JSX element
  if (!isJSXElement(node, t)) {
    console.warn('[JSX Processor] processJSXElement called with non-JSX node:', node?.type || 'undefined');
    return null;
  }

  // Check if element should be skipped
  if (shouldSkipElement(node, t)) {
    return null;
  }

  // Extract tag name
  const tagName = getTagName(node, t);
  if (!tagName) {
    console.warn('[JSX Processor] Unable to extract tag name from element');
    return null;
  }

  // NOTE: Actual processing delegated to traverser.js
  // This is a placeholder for future Phase 2 enhancements
  return null;
}

/**
 * Extract tag name from JSX element
 *
 * Handles standard HTML elements (div, span, etc.).
 * Does NOT handle component references or member expressions (Phase 2).
 *
 * Pattern from old plugin: line 39
 * const tagName = node.openingElement.name.name;
 *
 * @param {Object} node - Babel JSX element node
 * @param {Object} t - Babel types
 * @returns {string|null} - Tag name or null if not extractable
 */
function getTagName(node, t) {
  if (!node || !node.openingElement) {
    return null;
  }

  const name = node.openingElement.name;

  // Standard element: <div>, <span>, <button>
  if (t.isJSXIdentifier(name)) {
    return name.name;
  }

  // Member expression: <Component.Child> (Phase 2)
  if (t.isJSXMemberExpression(name)) {
    // For now, return string representation
    return buildMemberExpressionName(name, t);
  }

  // Namespaced name: <svg:path> (rare, Phase 2)
  if (t.isJSXNamespacedName(name)) {
    return `${name.namespace.name}:${name.name.name}`;
  }

  return null;
}

/**
 * Build member expression name as string
 *
 * Example: <Component.Child> → "Component.Child"
 *
 * @param {Object} memberExpr - JSX member expression node
 * @param {Object} t - Babel types
 * @returns {string} - Member expression as string
 */
function buildMemberExpressionName(memberExpr, t) {
  if (t.isJSXIdentifier(memberExpr.object)) {
    return `${memberExpr.object.name}.${memberExpr.property.name}`;
  }

  if (t.isJSXMemberExpression(memberExpr.object)) {
    return `${buildMemberExpressionName(memberExpr.object, t)}.${memberExpr.property.name}`;
  }

  return memberExpr.property.name;
}

/**
 * Check if element is fully structural (no dynamic content)
 *
 * A structural element has:
 * - Only static or boolean attributes
 * - Only JSXElement or StaticText children
 * - No dynamic bindings or expressions
 *
 * This is an optimization hint for C# code generation.
 *
 * @param {Object} node - JSX element node
 * @param {Array} attributes - Processed attribute nodes
 * @param {Array} children - Processed child nodes
 * @returns {boolean} - True if fully structural
 */
function isStructuralElement(node, attributes, children) {
  // Check attributes - must be static or boolean only
  const hasOnlyStaticAttributes = attributes.every(attr =>
    attr.type === 'StaticAttribute' || attr.type === 'BooleanAttribute'
  );

  // Check children - must be JSXElement or StaticText only
  const hasOnlyStaticChildren = children.every(child =>
    child.type === 'JSXElement' || child.type === 'StaticText'
  );

  return hasOnlyStaticAttributes && hasOnlyStaticChildren;
}

/**
 * Check if element should be skipped during processing
 *
 * Filters out:
 * - Invalid/malformed elements
 * - Elements with unsupported features (Phase 1)
 * - Special elements (Fragment, Plugin, etc.) handled separately
 *
 * @param {Object} node - JSX element node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if should skip
 */
function shouldSkipElement(node, t) {
  // Skip null/undefined
  if (!node) {
    return true;
  }

  // Skip fragments (handled separately)
  if (t.isJSXFragment(node)) {
    return true;
  }

  // Skip empty expressions
  if (t.isJSXEmptyExpression(node)) {
    return true;
  }

  // All standard elements are processable in Phase 1
  return false;
}

/**
 * Check if node is a JSX element
 *
 * Pattern from old plugin: lines 34-37
 * Validates that node is actually a JSXElement before processing.
 *
 * @param {Object} node - Babel node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if JSX element
 */
function isJSXElement(node, t) {
  return node && t.isJSXElement(node);
}

/**
 * Check if expression container holds structural JSX
 *
 * Structural JSX includes:
 * - Direct JSX elements: {<div>...</div>}
 * - Fragments: {<>...</>}
 * - Logical expressions with JSX: {isVisible && <Modal />}
 * - Ternary with JSX: {isAdmin ? <Admin /> : <User />}
 * - Array.map: {items.map(item => <li>{item}</li>)}
 *
 * Pattern from old plugin: lines 205-211
 *
 * @param {Object} expr - Expression node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if structural JSX
 */
function isStructuralExpression(expr, t) {
  // Direct JSX element or fragment
  if (t.isJSXElement(expr) || t.isJSXFragment(expr)) {
    return true;
  }

  // Empty expression (skip)
  if (t.isJSXEmptyExpression(expr)) {
    return false;
  }

  // Logical expression with JSX: {isVisible && <Modal />}
  if (t.isLogicalExpression(expr) &&
      (t.isJSXElement(expr.right) || t.isJSXFragment(expr.right))) {
    return true;
  }

  // Ternary with JSX: {isAdmin ? <Admin /> : <User />}
  if (t.isConditionalExpression(expr) &&
      (t.isJSXElement(expr.consequent) || t.isJSXElement(expr.alternate) ||
       t.isJSXFragment(expr.consequent) || t.isJSXFragment(expr.alternate))) {
    return true;
  }

  // Array.map: {items.map(item => <li>{item}</li>)}
  if (t.isCallExpression(expr) &&
      t.isMemberExpression(expr.callee) &&
      t.isIdentifier(expr.callee.property) &&
      expr.callee.property.name === 'map') {
    return true;
  }

  return false;
}

/**
 * Check if children contain mixed content (text + expressions)
 *
 * Mixed content example: <div>Count: {count}</div>
 * This requires special handling in template extraction (Phase 2).
 *
 * Pattern from old plugin: lines 230-257 (mixed content merging)
 *
 * @param {Array} children - Array of child nodes
 * @param {Object} t - Babel types
 * @returns {boolean} - True if has mixed content
 */
function hasMixedContent(children, t) {
  let hasText = false;
  let hasExpression = false;

  for (const child of children) {
    if (t.isJSXText(child)) {
      const text = child.value.trim();
      if (text) {
        hasText = true;
      }
    } else if (t.isJSXExpressionContainer(child)) {
      const expr = child.expression;
      // Only count non-structural expressions
      if (!isStructuralExpression(expr, t)) {
        hasExpression = true;
      }
    }

    // Early exit if both found
    if (hasText && hasExpression) {
      return true;
    }
  }

  return false;
}

/**
 * Validate JSX element structure
 *
 * Ensures element has required properties and valid structure.
 *
 * @param {Object} node - JSX element node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if valid
 */
function validateJSXElement(node, t) {
  if (!node) {
    return false;
  }

  if (!t.isJSXElement(node)) {
    return false;
  }

  if (!node.openingElement) {
    return false;
  }

  if (!node.openingElement.name) {
    return false;
  }

  return true;
}

module.exports = {
  processJSXElement,
  getTagName,
  isStructuralElement,
  shouldSkipElement,
  isJSXElement,
  isStructuralExpression,
  hasMixedContent,
  validateJSXElement
};
