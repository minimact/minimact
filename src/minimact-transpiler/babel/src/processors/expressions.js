/**
 * Expression Processor for Minimact Transpiler
 *
 * PHASE 1 - FIRST PASS: Expression structure capture
 *
 * Handles JSX expression containers:
 * - Simple identifiers: {count}
 * - Member expressions: {user.name}
 * - Template literals: {`Count: ${count}`}
 * - Conditionals: {isVisible ? <A/> : <B/>}
 * - Loops: {items.map(item => <li>{item}</li>)}
 * - Method calls: {price.toFixed(2)} (Phase 2)
 * - Binary expressions: {count * 2} (Phase 2)
 *
 * Reuses patterns from:
 * babel-plugin-minimact/src/extractors/expressionTemplates.cjs
 * - Expression type detection (lines 104-136)
 * - Simple vs complex classification (lines 106-108)
 * - Binding extraction (lines 389-396)
 */

const { extractBindings } = require('../extractors/bindings');
const { extractTemplateLiteral } = require('../extractors/templates');
const { extractLogicalExpression, extractConditionalExpression } = require('../extractors/conditionals');

const { buildMemberPath } = require('./attributes');

/**
 * Process a JSX expression container
 *
 * Main entry point for expression processing. Identifies expression type,
 * extracts bindings, and builds appropriate node structure.
 *
 * Pattern from old plugin: expressionTemplates.cjs lines 104-136
 *
 * @param {Object} expr - Expression node from JSXExpressionContainer
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @returns {Object|null} - Expression node or null
 */
function processExpression(expr, parentPath, pathGen, t) {
  // Generate hex path for expression
  const exprHex = pathGen.next(parentPath);
  const exprPath = pathGen.buildPath(parentPath, exprHex);
  const exprSegments = pathGen.parsePath(exprPath);

  const expressionType = getExpressionType(expr, t);
  const raw = getExpressionRaw(expr, t);

  console.log(`    [Expr] {${raw.substring(0, 30)}${raw.length > 30 ? '...' : ''}} (${expressionType}) → ${exprPath}`);

  // Base node structure
  const node = {
    type: 'Expression',
    expressionType,
    path: exprPath,
    pathSegments: exprSegments
  };

  // Extract binding information based on expression type
  if (t.isIdentifier(expr)) {
    // Simple identifier: {count}
    node.bindings = [{
      type: 'Identifier',
      path: expr.name
    }];
    node.template = '{0}';
    node.isSimple = true;
  } else if (t.isMemberExpression(expr)) {
    // Member expression: {user.name}
    node.bindings = [{
      type: 'MemberExpression',
      path: buildMemberPath(expr, t)
    }];
    node.template = '{0}';
    node.isSimple = true;
  } else if (t.isTemplateLiteral(expr)) {
    // Template literal: {`Count: ${count}`}
    // Will be fully extracted in Phase 2
    const { template, bindings } = extractTemplateLiteralBasic(expr, t);
    node.template = template;
    node.bindings = bindings;
    node.isSimple = bindings.every(b => b.type !== 'Complex');
  } else if (t.isLogicalExpression(expr)) {
    // Logical: {isVisible && <div>...</div>}
    // Extract conditional structure
    const logicalInfo = extractLogicalExpression(expr, parentPath, pathGen, t);

    node.operator = expr.operator;
    node.condition = logicalInfo.condition;
    node.branches = logicalInfo.branches;
    node.isSimple = false;
    node.isStructural = true;
    node.isConditional = true;

    // Check if it contains JSX
    const hasJSX = t.isJSXElement(expr.right) || t.isJSXFragment(expr.right);
    if (hasJSX) {
      console.log(`      [Conditional] ${typeof logicalInfo.condition === 'string' ? logicalInfo.condition : JSON.stringify(logicalInfo.condition)} ${expr.operator} <JSX>`);
    }
  } else if (t.isConditionalExpression(expr)) {
    // Ternary: {count > 5 ? <span>High</span> : <span>Low</span>}
    // Extract conditional structure
    const ternaryInfo = extractConditionalExpression(expr, parentPath, pathGen, t);

    node.condition = ternaryInfo.condition;
    node.consequent = ternaryInfo.consequent;
    node.alternate = ternaryInfo.alternate;
    node.isSimple = false;
    node.isStructural = true;
    node.isConditional = true;

    // Check if it contains JSX
    const hasJSX = ternaryInfo.consequent.type === 'JSXElement' || ternaryInfo.alternate.type === 'JSXElement';
    if (hasJSX) {
      console.log(`      [Conditional] ${typeof ternaryInfo.condition === 'string' ? ternaryInfo.condition : JSON.stringify(ternaryInfo.condition)} ? <JSX> : <JSX>`);
    }
  } else if (t.isCallExpression(expr)) {
    // Function call: {items.map(...)} or {price.toFixed(2)}
    // Check if it's a .map() (structural) or method call (transform)
    if (isMapCall(expr, t)) {
      node.isSimple = false;
      node.isStructural = true;
    } else {
      // Try to extract as transform method call
      const binding = extractBindings(expr, t);

      if (binding && typeof binding === 'object' && binding.type === 'transform') {
        // Transform method: price.toFixed(2)
        node.binding = binding.binding;
        node.transform = binding.transform;
        node.transformArgs = binding.args;
        node.isSimple = false;
        node.isTransform = true;

        console.log(`      [Transform] ${binding.binding}.${binding.transform}(${binding.args.join(', ')})`);
      } else {
        // Complex method call (Phase 2)
        node.isSimple = false;
        node.isComplex = true;
      }
    }
  } else if (t.isBinaryExpression(expr)) {
    // Binary expression: {count * 2 + 1}
    // Phase 2: arithmetic template extraction
    node.isSimple = false;
    node.isComplex = true;
  } else if (t.isUnaryExpression(expr)) {
    // Unary expression: {-count}, {+value}
    // Phase 2: unary transformation
    node.isSimple = false;
    node.isComplex = true;
  } else {
    // Complex expression - Phase 2
    node.raw = '<complex>';
    node.isSimple = false;
    node.isComplex = true;
  }

  return node;
}

/**
 * Get expression type as string
 *
 * Pattern from old plugin: Similar to templates.cjs type checking
 *
 * @param {Object} expr - Expression node
 * @param {Object} t - Babel types
 * @returns {string} - Expression type name
 */
function getExpressionType(expr, t) {
  if (t.isIdentifier(expr)) return 'Identifier';
  if (t.isMemberExpression(expr)) return 'MemberExpression';
  if (t.isTemplateLiteral(expr)) return 'TemplateLiteral';
  if (t.isCallExpression(expr)) return 'CallExpression';
  if (t.isConditionalExpression(expr)) return 'ConditionalExpression';
  if (t.isLogicalExpression(expr)) return 'LogicalExpression';
  if (t.isBinaryExpression(expr)) return 'BinaryExpression';
  if (t.isUnaryExpression(expr)) return 'UnaryExpression';
  if (t.isObjectExpression(expr)) return 'ObjectExpression';
  if (t.isArrayExpression(expr)) return 'ArrayExpression';
  if (t.isArrowFunctionExpression(expr)) return 'ArrowFunctionExpression';
  return 'Unknown';
}

/**
 * Get raw expression as string (simplified for Phase 1)
 *
 * Used for logging and debugging.
 *
 * @param {Object} expr - Expression node
 * @param {Object} t - Babel types
 * @returns {string} - Human-readable expression string
 */
function getExpressionRaw(expr, t) {
  if (t.isIdentifier(expr)) return expr.name;
  if (t.isMemberExpression(expr)) return buildMemberPath(expr, t);
  if (t.isTemplateLiteral(expr)) return '`..template..`';
  if (t.isCallExpression(expr)) {
    if (t.isMemberExpression(expr.callee) && t.isIdentifier(expr.callee.property)) {
      const obj = t.isIdentifier(expr.callee.object)
        ? expr.callee.object.name
        : buildMemberPath(expr.callee.object, t);
      return `${obj}.${expr.callee.property.name}(...)`;
    }
    return '<call>';
  }
  if (t.isConditionalExpression(expr)) return '... ? ... : ...';
  if (t.isLogicalExpression(expr)) return `... ${expr.operator} ...`;
  if (t.isBinaryExpression(expr)) return `... ${expr.operator} ...`;
  if (t.isUnaryExpression(expr)) return `${expr.operator}...`;
  return '<complex>';
}

/**
 * Check if expression is simple (single binding, no transformation)
 *
 * Simple expressions:
 * - {count}
 * - {user.name}
 * - {`Hello ${name}`} with simple bindings
 *
 * Pattern from old plugin: expressionTemplates.cjs lines 106-108
 *
 * @param {Object} expr - Expression node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if simple expression
 */
function isSimpleExpression(expr, t) {
  // Simple identifier
  if (t.isIdentifier(expr)) {
    return true;
  }

  // Member expression (no computed properties)
  if (t.isMemberExpression(expr) && !expr.computed) {
    return true;
  }

  // Template literal with only simple bindings
  if (t.isTemplateLiteral(expr)) {
    return expr.expressions.every(e =>
      t.isIdentifier(e) || (t.isMemberExpression(e) && !e.computed)
    );
  }

  return false;
}

/**
 * Check if expression is complex (needs C# evaluation)
 *
 * Complex expressions:
 * - {count * 2 + 1}
 * - {price.toFixed(2)}
 * - {condition ? 'A' : 'B'}
 * - {obj[computedKey]}
 *
 * Pattern from old plugin: expressionTemplates.cjs
 * - Identifies expressions that need runtime transformation
 *
 * @param {Object} expr - Expression node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if complex expression
 */
function isComplexExpression(expr, t) {
  // Binary/unary expressions (arithmetic)
  if (t.isBinaryExpression(expr) || t.isUnaryExpression(expr)) {
    return true;
  }

  // Conditional expressions
  if (t.isConditionalExpression(expr) || t.isLogicalExpression(expr)) {
    return true;
  }

  // Method calls (transformations)
  if (t.isCallExpression(expr) && !isMapCall(expr, t)) {
    return true;
  }

  // Computed property access: obj[key]
  if (t.isMemberExpression(expr) && expr.computed) {
    return true;
  }

  // Template literals with complex expressions
  if (t.isTemplateLiteral(expr)) {
    return expr.expressions.some(e => isComplexExpression(e, t));
  }

  return false;
}

/**
 * Check if call expression is Array.map()
 *
 * Pattern from traverser.js structural expression detection
 *
 * @param {Object} expr - Call expression node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if .map() call
 */
function isMapCall(expr, t) {
  return t.isCallExpression(expr) &&
         t.isMemberExpression(expr.callee) &&
         t.isIdentifier(expr.callee.property) &&
         expr.callee.property.name === 'map';
}

/**
 * Extract basic template literal structure (Phase 1)
 *
 * Full extraction happens in Phase 2.
 * For now, just capture bindings and build template string.
 *
 * Pattern from old plugin: expressionTemplates.cjs (similar to extractTemplateLiteral)
 *
 * @param {Object} node - Template literal node
 * @param {Object} t - Babel types
 * @returns {Object} - { template, bindings }
 */
function extractTemplateLiteralBasic(node, t) {
  let template = '';
  const bindings = [];
  let slotIndex = 0;

  for (let i = 0; i < node.quasis.length; i++) {
    template += node.quasis[i].value.raw;

    if (i < node.expressions.length) {
      const expr = node.expressions[i];
      template += `{${slotIndex}}`;

      // Extract binding
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
        // Complex expression - mark for Phase 2
        bindings.push({
          type: 'Complex',
          path: '<complex>'
        });
      }

      slotIndex++;
    }
  }

  return { template, bindings };
}

/**
 * Check if expression is structural (contains JSX)
 *
 * Delegates to processors/jsx.js isStructuralExpression helper.
 *
 * @param {Object} expr - Expression node
 * @param {Object} t - Babel types
 * @returns {boolean} - True if structural
 */
function isStructuralExpression(expr, t) {
  const { isStructuralExpression: isStructural } = require('./jsx');
  return isStructural(expr, t);
}

/**
 * Extract identifiers from expression (recursive)
 *
 * Pattern from old plugin: expressionTemplates.cjs lines 440-452
 *
 * @param {Object} expr - Expression node
 * @param {Array} result - Accumulator array for identifiers
 * @param {Object} t - Babel types
 */
function extractIdentifiers(expr, result, t) {
  if (t.isIdentifier(expr)) {
    result.push(expr.name);
  } else if (t.isBinaryExpression(expr) || t.isLogicalExpression(expr)) {
    extractIdentifiers(expr.left, result, t);
    extractIdentifiers(expr.right, result, t);
  } else if (t.isUnaryExpression(expr)) {
    extractIdentifiers(expr.argument, result, t);
  } else if (t.isMemberExpression(expr)) {
    const path = buildMemberPath(expr, t);
    if (path) result.push(path);
  } else if (t.isCallExpression(expr)) {
    // Extract from callee and arguments
    if (t.isMemberExpression(expr.callee)) {
      extractIdentifiers(expr.callee.object, result, t);
    }
    expr.arguments.forEach(arg => extractIdentifiers(arg, result, t));
  }
}

/**
 * Get root state key from expression
 *
 * Example: user.profile.name → "user"
 * Pattern from old plugin: expressionTemplates.cjs lines 401-414
 *
 * @param {Object} expr - Expression node
 * @param {Object} t - Babel types
 * @returns {string|null} - Root state key or null
 */
function getStateKey(expr, t) {
  if (t.isIdentifier(expr)) {
    return expr.name;
  } else if (t.isMemberExpression(expr)) {
    let current = expr;
    while (t.isMemberExpression(current)) {
      current = current.object;
    }
    if (t.isIdentifier(current)) {
      return current.name;
    }
  }
  return null;
}

module.exports = {
  processExpression,
  getExpressionType,
  getExpressionRaw,
  isSimpleExpression,
  isComplexExpression,
  isMapCall,
  isStructuralExpression,
  extractIdentifiers,
  getStateKey
};
