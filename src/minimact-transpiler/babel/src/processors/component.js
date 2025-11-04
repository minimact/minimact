/**
 * Component Processor for Minimact Transpiler
 *
 * PHASE 1 - FIRST PASS: Component structure extraction
 *
 * Handles:
 * - Component name extraction
 * - Return statement location
 * - JSX root identification
 * - JSON generation and file output
 *
 * Reuses logic from:
 * babel-plugin-minimact/src/processComponent.cjs
 * - Component name extraction (lines 27-30)
 * - Return statement finding (lines 179-184)
 * - Component validation (lines 29-30)
 */

const fs = require('fs');
const path = require('path');
const { createComponent, createRenderMethod } = require('../core/nodes');
const { traverseJSX, traverseFragment } = require('../core/traverser');

/**
 * Process a component function declaration and generate JSON output
 *
 * Main entry point for component processing. Validates component,
 * finds JSX return, traverses tree, generates JSON, writes to file.
 *
 * @param {Object} functionNode - Babel function declaration node
 * @param {string} outputDir - Output directory for JSON files
 * @param {number} hexGap - Hex gap for path generation (default: 0x10000000)
 * @param {Object} t - Babel types
 * @param {HexPathGenerator} pathGen - Hex path generator instance
 * @param {Object} context - Traversal context with processors
 * @returns {Object|null} - Generated component JSON or null if skipped
 */
function processComponent(functionNode, outputDir, hexGap, t, pathGen, context) {
  // Extract and validate component name
  const componentName = extractComponentName(functionNode);
  if (!componentName) {
    console.warn('[Minimact Transpiler] Skipping unnamed component');
    return null;
  }

  // Validate component name starts with uppercase (React convention)
  // Pattern from old plugin: lines 29-30
  if (componentName[0] !== componentName[0].toUpperCase()) {
    console.warn(`[Minimact Transpiler] Skipping '${componentName}' - not a component (lowercase)`);
    return null;
  }

  console.log(`\n[Minimact Transpiler] ====== Processing: ${componentName} ======`);

  // Find the return statement containing JSX
  const returnStatement = findReturnStatement(functionNode.body);
  if (!returnStatement) {
    console.warn(`[Minimact Transpiler] No return statement found in ${componentName}`);
    return null;
  }

  const jsxRoot = returnStatement.argument;
  if (!jsxRoot) {
    console.warn(`[Minimact Transpiler] No JSX found in return statement of ${componentName}`);
    return null;
  }

  // Validate JSX root is valid
  if (!t.isJSXElement(jsxRoot) && !t.isJSXFragment(jsxRoot)) {
    console.warn(`[Minimact Transpiler] Invalid JSX root in ${componentName} (type: ${jsxRoot.type})`);
    return null;
  }

  // Traverse JSX and build JSON AST
  const children = [];

  if (t.isJSXElement(jsxRoot)) {
    const rootNode = traverseJSX(jsxRoot, '', pathGen, t, context);
    if (rootNode) {
      children.push(rootNode);
    }
  } else if (t.isJSXFragment(jsxRoot)) {
    // Handle fragments: <>...</> - flatten children
    console.log(`  [Fragment] Root is fragment, flattening children`);
    const fragmentChildren = traverseFragment(jsxRoot, '', pathGen, t, context);
    children.push(...fragmentChildren);
  }

  // Generate component JSON structure
  const componentJson = generateComponentJSON(componentName, children);

  // Write JSON to file
  const outputPath = path.join(outputDir, `${componentName}.json`);
  writeComponentJSON(outputPath, componentJson);

  // Log summary stats
  const stats = calculateStats(componentJson);
  console.log(`[Minimact Transpiler] ✅ Generated: ${outputPath}`);
  console.log(`[Minimact Transpiler] Stats: ${stats.nodeCount} nodes | ${stats.maxDepth} max depth`);

  return componentJson;
}

/**
 * Extract component name from function node
 *
 * Handles:
 * - Named function: function ComponentName() { ... }
 * - Function expression: const ComponentName = function() { ... }
 * - Arrow function: const ComponentName = () => { ... }
 *
 * Pattern from old plugin: lines 27-30
 *
 * @param {Object} functionNode - Babel function node
 * @returns {string|null} - Component name or null if not found
 */
function extractComponentName(functionNode) {
  // Named function declaration: function ComponentName() { ... }
  if (functionNode.id && functionNode.id.name) {
    return functionNode.id.name;
  }

  // Function expression assigned to variable: const ComponentName = function() { ... }
  // Arrow function: const ComponentName = () => { ... }
  // (Handled at the visitor level in index.js - this function receives already-named nodes)

  return null;
}

/**
 * Find the return statement in function body
 *
 * Searches for ReturnStatement at the top level of the function body.
 * Handles both BlockStatement and implicit return (arrow functions).
 *
 * Pattern from old plugin: lines 179-184
 *
 * @param {Object} body - Function body node
 * @returns {Object|null} - Return statement node or null if not found
 */
function findReturnStatement(body) {
  if (body.type === 'BlockStatement') {
    // Explicit block: function() { return <div>...</div> }
    for (const statement of body.body) {
      if (statement.type === 'ReturnStatement') {
        return statement;
      }
    }
  } else {
    // Implicit return (arrow function): () => <div>...</div>
    // Create a synthetic return statement
    return {
      type: 'ReturnStatement',
      argument: body
    };
  }

  return null;
}

/**
 * Generate component JSON structure
 *
 * Creates the root Component node with RenderMethod containing children.
 * This is the final JSON structure that gets written to file and processed by C#.
 *
 * @param {string} componentName - Component name (e.g., "TodoList")
 * @param {Array} children - Processed JSX children nodes
 * @returns {Object} - Component JSON node
 */
function generateComponentJSON(componentName, children) {
  return createComponent(
    componentName,
    createRenderMethod(children)
  );
}

/**
 * Write component JSON to file
 *
 * Writes formatted JSON with 2-space indentation.
 * Creates output directory if it doesn't exist.
 *
 * @param {string} outputPath - Full path to output file
 * @param {Object} componentJson - Component JSON to write
 */
function writeComponentJSON(outputPath, componentJson) {
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write formatted JSON
  fs.writeFileSync(outputPath, JSON.stringify(componentJson, null, 2));
}

/**
 * Calculate component statistics
 *
 * Counts total nodes and calculates maximum depth for logging.
 *
 * @param {Object} componentJson - Component JSON
 * @returns {Object} - { nodeCount: number, maxDepth: number }
 */
function calculateStats(componentJson) {
  return {
    nodeCount: countNodes(componentJson),
    maxDepth: getMaxDepth(componentJson)
  };
}

/**
 * Count total nodes in JSON tree (recursive)
 *
 * @param {Object} node - JSON node
 * @returns {number} - Total node count
 */
function countNodes(node) {
  let count = 1;

  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }

  if (node.renderMethod) {
    count += countNodes(node.renderMethod);
  }

  if (node.attributes) {
    count += node.attributes.length;
  }

  return count;
}

/**
 * Get maximum depth of JSON tree (recursive)
 *
 * @param {Object} node - JSON node
 * @param {number} depth - Current depth (default: 0)
 * @returns {number} - Maximum depth
 */
function getMaxDepth(node, depth = 0) {
  let maxDepth = depth;

  if (node.children) {
    for (const child of node.children) {
      maxDepth = Math.max(maxDepth, getMaxDepth(child, depth + 1));
    }
  }

  if (node.renderMethod) {
    maxDepth = Math.max(maxDepth, getMaxDepth(node.renderMethod, depth + 1));
  }

  return maxDepth;
}

module.exports = {
  processComponent,
  extractComponentName,
  findReturnStatement,
  generateComponentJSON,
  writeComponentJSON,
  calculateStats
};
