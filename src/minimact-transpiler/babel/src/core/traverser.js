/**
 * JSX Tree Traverser for Minimact Transpiler
 *
 * PHASE 1 - FIRST PASS: Structure + Hex Paths Only
 *
 * This module handles recursive traversal of JSX trees, delegating to processors
 * for actual node processing. It maintains path state and handles special cases
 * like fragments and conditional branches.
 *
 * Reuses traversal structure from:
 * babel-plugin-minimact/src/extractors/templates.cjs (lines 298-434)
 */

const { createJSXElement, createStaticText } = require('../nodes');
const { processChildren: processChildrenHelper } = require('../processors/children');
const { isStructuralExpression: isStructuralExpressionHelper } = require('../processors/jsx');

/**
 * Main JSX traversal function
 *
 * Recursively walks JSX tree and builds JSON AST with hex paths.
 * Delegates to processors for element/attribute/expression handling.
 *
 * @param {Object} node - Babel AST node (JSXElement)
 * @param {string} parentPath - Parent hex path (e.g., "10000000")
 * @param {HexPathGenerator} pathGen - Hex path generator instance
 * @param {Object} t - Babel types
 * @param {Object} context - Traversal context with processors
 * @returns {Object|null} - JSON node or null if skipped
 */
function traverseJSX(node, parentPath, pathGen, t, context) {
  // Validate node type
  if (!t.isJSXElement(node)) {
    return null;
  }

  // Extract tag name
  const tagName = node.openingElement.name.name;

  // Generate hex path for this element (TAG-AGNOSTIC!)
  // A <div> gets 10000000, a <span> gets 20000000 - tags don't matter!
  const childHex = pathGen.next(parentPath);
  const currentPath = pathGen.buildPath(parentPath, childHex);
  const pathSegments = pathGen.parsePath(currentPath);

  context.log(`  [Element] <${tagName}> → ${currentPath}`);

  // Process attributes using provided processor
  const attributes = context.processAttributes
    ? context.processAttributes(node.openingElement.attributes, currentPath, pathSegments, pathGen, t, context.component)
    : [];

  // Process children
  const children = traverseChildren(node.children, currentPath, pathGen, t, context);

  // Determine if element is fully structural (optimization hint for C#)
  const isStructural = attributes.every(a =>
    a.type === 'StaticAttribute' || a.type === 'BooleanAttribute'
  ) && children.every(c =>
    c.type === 'JSXElement' || c.type === 'StaticText'
  );

  // Build and return JSXElement node
  return createJSXElement(tagName, currentPath, pathSegments, attributes, children, isStructural);
}

/**
 * Traverse JSX Fragment (<>...</>)
 *
 * Fragments don't create wrapper nodes - children become direct siblings.
 * Each child gets its own hex path at the parent level.
 *
 * @param {Object} fragment - Babel AST node (JSXFragment)
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @param {Object} context - Traversal context
 * @returns {Array} - Array of processed child nodes
 */
function traverseFragment(fragment, parentPath, pathGen, t, context) {
  context.log(`    [Fragment] Flattening fragment children`);

  const children = [];

  for (const child of fragment.children) {
    if (t.isJSXElement(child)) {
      // Nested JSX element - traverse it
      const childNode = traverseJSX(child, parentPath, pathGen, t, context);
      if (childNode) {
        children.push(childNode);
      }
    } else if (t.isJSXText(child)) {
      // Static text node
      const text = child.value.trim();
      if (text) {
        const textHex = pathGen.next(parentPath);
        const textPath = pathGen.buildPath(parentPath, textHex);
        const textSegments = pathGen.parsePath(textPath);
        children.push(createStaticText(textPath, textSegments, text));
      }
    } else if (t.isJSXExpressionContainer(child)) {
      // Expression container - delegate to processor
      const exprNode = context.processExpression
        ? context.processExpression(child.expression, parentPath, pathGen, t)
        : null;
      if (exprNode) {
        children.push(exprNode);
      }
    }
  }

  return children;
}

/**
 * Traverse children array of JSX element
 *
 * Handles mixed content: JSXElement, JSXText, JSXExpressionContainer, JSXFragment.
 * Maintains sibling order and assigns sequential hex paths.
 *
 * Key insight from old plugin:
 * - First pass: Identify child types (text, expressions, elements)
 * - Second pass: Process structural JSX (elements)
 * - Third pass: Process dynamic content (expressions)
 *
 * @param {Array} children - Array of Babel AST nodes
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @param {Object} context - Traversal context
 * @returns {Array} - Array of processed child nodes
 */
function traverseChildren(children, parentPath, pathGen, t, context) {
  const result = [];

  for (const child of children) {
    if (t.isJSXElement(child)) {
      // Nested JSX element - recurse
      const childNode = traverseJSX(child, parentPath, pathGen, t, context);
      if (childNode) {
        result.push(childNode);
      }
    } else if (t.isJSXText(child)) {
      // Static text node
      const text = child.value.trim();
      if (text) {
        const textHex = pathGen.next(parentPath);
        const textPath = pathGen.buildPath(parentPath, textHex);
        const textSegments = pathGen.parsePath(textPath);

        context.log(`    [Text] "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}" → ${textPath}`);
        result.push(createStaticText(textPath, textSegments, text));
      }
    } else if (t.isJSXExpressionContainer(child)) {
      // Expression container - could be structural JSX or dynamic content
      const expr = child.expression;

      // Check if structural (JSX elements in conditionals/loops)
      // Uses helper from processors/jsx.js
      const isStructural = isStructuralExpressionHelper(expr, t);

      if (isStructural) {
        // Structural JSX - traverse branches
        const structuralNode = traverseStructuralExpression(expr, parentPath, pathGen, t, context);
        if (structuralNode) {
          result.push(structuralNode);
        }
      } else {
        // Dynamic content - delegate to expression processor
        const exprNode = context.processExpression
          ? context.processExpression(expr, parentPath, pathGen, t)
          : null;
        if (exprNode) {
          result.push(exprNode);
        }
      }
    } else if (t.isJSXFragment(child)) {
      // Fragment: <>...</> - flatten children into parent
      // Pattern from old plugin: lines 425-433
      const fragmentChildren = traverseFragment(child, parentPath, pathGen, t, context);
      result.push(...fragmentChildren);
    }
  }

  return result;
}

/**
 * Traverse structural expressions (conditionals, loops)
 *
 * These are JSX expressions that contain JSX elements:
 * - Logical AND: {isVisible && <Modal />}
 * - Ternary: {isAdmin ? <AdminPanel /> : <UserPanel />}
 * - Array.map: {items.map(item => <li>{item}</li>)}
 *
 * Pattern from old plugin: lines 404-421
 *
 * @param {Object} expr - Babel expression node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @param {Object} context - Traversal context
 * @returns {Object|null} - Processed node or null
 */
function traverseStructuralExpression(expr, parentPath, pathGen, t, context) {
  if (t.isLogicalExpression(expr) && expr.operator === '&&') {
    // Logical AND: {isAdmin && <div>Admin Panel</div>}
    context.log(`    [Structural] Logical AND (&&) - traversing consequent`);

    if (t.isJSXElement(expr.right)) {
      // Delegate to expression processor which will handle conditional extraction
      return context.processExpression
        ? context.processExpression(expr, parentPath, pathGen, t)
        : null;
    }
  } else if (t.isConditionalExpression(expr)) {
    // Ternary: {isAdmin ? <AdminPanel/> : <UserPanel/>}
    context.log(`    [Structural] Ternary (? :) - traversing both branches`);

    // Delegate to expression processor which will handle conditional extraction
    return context.processExpression
      ? context.processExpression(expr, parentPath, pathGen, t)
      : null;
  } else if (t.isCallExpression(expr) &&
             t.isMemberExpression(expr.callee) &&
             t.isIdentifier(expr.callee.property) &&
             expr.callee.property.name === 'map') {
    // Array.map: {items.map(item => <li>{item}</li>)}
    context.log(`    [Structural] Array.map - traversing loop body`);

    // Delegate to expression processor which will handle loop extraction
    return context.processExpression
      ? context.processExpression(expr, parentPath, pathGen, t)
      : null;
  } else if (t.isJSXFragment(expr)) {
    // Fragment
    return traverseFragment(expr, parentPath, pathGen, t, context);
  } else if (t.isJSXElement(expr)) {
    // Direct JSX element
    return traverseJSX(expr, parentPath, pathGen, t, context);
  }

  return null;
}

/**
 * Create a default context object
 *
 * Provides default no-op implementations for processors.
 * Can be overridden by passing custom processors.
 */
function createDefaultContext() {
  return {
    processAttributes: null,
    processExpression: null,
    log: (message) => console.log(message)
  };
}

module.exports = {
  traverseJSX,
  traverseFragment,
  traverseChildren,
  traverseStructuralExpression,
  createDefaultContext
};
