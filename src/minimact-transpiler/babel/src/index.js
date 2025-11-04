/**
 * Minimact Transpiler - Babel Plugin
 *
 * FIRST PASS: JSX → JSON AST (Structure + Hex Paths Only)
 *
 * This plugin performs the FIRST PASS of transpilation:
 * - Traverse complete JSX tree
 * - Assign hex paths to every node (tag-agnostic!)
 * - Capture raw expressions (NO template extraction yet!)
 * - Build complete structural JSON
 *
 * SECOND PASS (future): Template extraction from raw expressions
 */

const fs = require('fs');
const path = require('path');
const { HexPathGenerator } = require('./core/hexPath');
const { createDefaultContext } = require('./core/traverser');
const { processComponent: processComponentFn } = require('./processors/component');
const { processAttributes } = require('./processors/attributes');
const { processExpression } = require('./processors/expressions');

module.exports = function (babel) {
  const { types: t } = babel;

  return {
    name: 'minimact-transpiler-babel',

    visitor: {
      /**
       * Visit each Program (file) and process exported components
       */
      Program(programPath, state) {
        const outputDir = state.opts.outputDir || './Generated';
        const hexGap = state.opts.hexGap || 0x10000000;

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Find all exported function components
        programPath.traverse({
          ExportNamedDeclaration(exportPath) {
            const declaration = exportPath.node.declaration;

            // export function ComponentName() { ... }
            if (t.isFunctionDeclaration(declaration)) {
              processComponent(declaration, outputDir, hexGap, t);
            }
          },

          ExportDefaultDeclaration(exportPath) {
            const declaration = exportPath.node.declaration;

            // export default function ComponentName() { ... }
            if (t.isFunctionDeclaration(declaration)) {
              processComponent(declaration, outputDir, hexGap, t);
            }
          }
        });
      }
    }
  };
};

/**
 * Process a component function and generate JSON output
 * (Wrapper for processors/component.js)
 */
function processComponent(functionNode, outputDir, hexGap, t) {
  // Create hex path generator
  const pathGen = new HexPathGenerator(hexGap);

  // Create traversal context with processors
  const context = createDefaultContext();
  context.processAttributes = processAttributes;
  context.processExpression = processExpression;

  // Delegate to component processor
  return processComponentFn(functionNode, outputDir, hexGap, t, pathGen, context);
}

// findReturnStatement moved to processors/component.js

// traverseJSX moved to core/traverser.js

// processAttributes moved to processors/attributes.js

/**
 * Process JSX expression - Extract bindings and structure for C# template generation
 */
function processExpression(expr, parentPath, pathGen, t) {
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

  // Extract detailed binding information based on expression type
  if (t.isIdentifier(expr)) {
    // Simple binding: {count}
    node.bindings = [{
      type: 'Identifier',
      path: expr.name
    }];
    node.template = '{0}';
  } else if (t.isMemberExpression(expr)) {
    // Member expression: {user.name}
    node.bindings = [{
      type: 'MemberExpression',
      path: buildMemberPath(expr, t)
    }];
    node.template = '{0}';
  } else if (t.isTemplateLiteral(expr)) {
    // Template literal: {`Count: ${count}`}
    const templateInfo = extractTemplateLiteral(expr, t);
    node.template = templateInfo.template;
    node.bindings = templateInfo.bindings;
  } else if (t.isLogicalExpression(expr)) {
    // Logical: {isVisible && <div>...</div>}
    const logicalInfo = extractLogicalExpression(expr, parentPath, pathGen, t);
    node.operator = expr.operator; // '&&' or '||'
    node.condition = logicalInfo.condition;
    node.branches = logicalInfo.branches;
  } else if (t.isConditionalExpression(expr)) {
    // Ternary: {count > 5 ? <span>High</span> : <span>Low</span>}
    const ternaryInfo = extractConditionalExpression(expr, parentPath, pathGen, t);
    node.condition = ternaryInfo.condition;
    node.consequent = ternaryInfo.consequent;
    node.alternate = ternaryInfo.alternate;
  } else if (t.isCallExpression(expr)) {
    // Function call: {items.map(item => <li>{item}</li>)}
    const callInfo = extractCallExpression(expr, parentPath, pathGen, t);
    if (callInfo) {
      Object.assign(node, callInfo);
    } else {
      node.raw = '<complex call>';
    }
  } else {
    // Complex expression - store raw for C# to handle
    node.raw = '<complex>';
  }

  return node;
}

/**
 * Get expression type as string
 */
function getExpressionType(expr, t) {
  if (t.isIdentifier(expr)) return 'Identifier';
  if (t.isMemberExpression(expr)) return 'MemberExpression';
  if (t.isTemplateLiteral(expr)) return 'TemplateLiteral';
  if (t.isCallExpression(expr)) return 'CallExpression';
  if (t.isConditionalExpression(expr)) return 'ConditionalExpression';
  if (t.isLogicalExpression(expr)) return 'LogicalExpression';
  if (t.isBinaryExpression(expr)) return 'BinaryExpression';
  if (t.isObjectExpression(expr)) return 'ObjectExpression';
  if (t.isArrayExpression(expr)) return 'ArrayExpression';
  if (t.isArrowFunctionExpression(expr)) return 'ArrowFunctionExpression';
  return 'Unknown';
}

/**
 * Get raw expression as string (simplified for first pass)
 */
function getExpressionRaw(expr, t) {
  if (t.isIdentifier(expr)) return expr.name;
  if (t.isMemberExpression(expr)) return buildMemberPath(expr, t);
  if (t.isTemplateLiteral(expr)) return '`..template..`';
  if (t.isCallExpression(expr)) {
    if (t.isMemberExpression(expr.callee) && t.isIdentifier(expr.callee.property)) {
      return `${buildMemberPath(expr.callee.object, t)}.${expr.callee.property.name}(...)`;
    }
    return '<call>';
  }
  if (t.isConditionalExpression(expr)) return '... ? ... : ...';
  if (t.isLogicalExpression(expr)) return `... ${expr.operator} ...`;
  return '<complex>';
}

/**
 * Build member expression path (e.g., user.name → "user.name")
 */
function buildMemberPath(node, t) {
  if (t.isIdentifier(node)) {
    return node.name;
  }

  if (t.isMemberExpression(node)) {
    const object = buildMemberPath(node.object, t);
    const property = t.isIdentifier(node.property) ? node.property.name : '<computed>';
    return `${object}.${property}`;
  }

  return '<unknown>';
}

// countNodes and getMaxDepth moved to processors/component.js

/**
 * Extract template literal bindings
 * Example: `Count: ${count}` → { template: "Count: {0}", bindings: [{type: 'Identifier', path: 'count'}] }
 */
function extractTemplateLiteral(node, t) {
  let template = '';
  const bindings = [];
  let slotIndex = 0;

  for (let i = 0; i < node.quasis.length; i++) {
    template += node.quasis[i].value.raw;

    if (i < node.expressions.length) {
      const expr = node.expressions[i];
      template += `{${slotIndex}}`;

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

      slotIndex++;
    }
  }

  return { template, bindings };
}

/**
 * Extract logical expression (&&, ||)
 * Example: {isVisible && <div>...</div>}
 */
function extractLogicalExpression(expr, parentPath, pathGen, t) {
  const result = {
    condition: null,
    branches: []
  };

  // Extract condition (left side)
  if (t.isIdentifier(expr.left)) {
    result.condition = expr.left.name;
  } else if (t.isMemberExpression(expr.left)) {
    result.condition = buildMemberPath(expr.left, t);
  } else if (t.isBinaryExpression(expr.left)) {
    result.condition = extractBinaryExpression(expr.left, t);
  } else {
    result.condition = '<complex>';
  }

  // Extract branches (right side - JSX or value)
  if (t.isJSXElement(expr.right)) {
    const branchNode = traverseJSX(expr.right, parentPath, pathGen, t);
    if (branchNode) {
      result.branches.push(branchNode);
    }
  } else {
    result.branches.push({
      type: 'Expression',
      expressionType: getExpressionType(expr.right, t),
      raw: getExpressionRaw(expr.right, t)
    });
  }

  return result;
}

/**
 * Extract conditional expression (ternary)
 * Example: {count > 5 ? <span>High</span> : <span>Low</span>}
 */
function extractConditionalExpression(expr, parentPath, pathGen, t) {
  const result = {
    condition: null,
    consequent: null,
    alternate: null
  };

  // Extract condition
  if (t.isBinaryExpression(expr.test)) {
    result.condition = extractBinaryExpression(expr.test, t);
  } else if (t.isIdentifier(expr.test)) {
    result.condition = expr.test.name;
  } else if (t.isMemberExpression(expr.test)) {
    result.condition = buildMemberPath(expr.test, t);
  } else {
    result.condition = '<complex>';
  }

  // Extract consequent (true branch)
  if (t.isJSXElement(expr.consequent)) {
    result.consequent = traverseJSX(expr.consequent, parentPath, pathGen, t);
  } else {
    result.consequent = {
      type: 'Expression',
      expressionType: getExpressionType(expr.consequent, t),
      raw: getExpressionRaw(expr.consequent, t)
    };
  }

  // Extract alternate (false branch)
  if (t.isJSXElement(expr.alternate)) {
    result.alternate = traverseJSX(expr.alternate, parentPath, pathGen, t);
  } else {
    result.alternate = {
      type: 'Expression',
      expressionType: getExpressionType(expr.alternate, t),
      raw: getExpressionRaw(expr.alternate, t)
    };
  }

  return result;
}

/**
 * Extract binary expression (>, <, ===, etc.)
 * Example: count > 5 → { left: "count", operator: ">", right: "5" }
 */
function extractBinaryExpression(expr, t) {
  const left = t.isIdentifier(expr.left) ? expr.left.name :
               t.isMemberExpression(expr.left) ? buildMemberPath(expr.left, t) :
               t.isLiteral(expr.left) ? String(expr.left.value) : '<complex>';

  const right = t.isIdentifier(expr.right) ? expr.right.name :
                t.isMemberExpression(expr.right) ? buildMemberPath(expr.right, t) :
                t.isLiteral(expr.right) ? String(expr.right.value) : '<complex>';

  return {
    left,
    operator: expr.operator,
    right
  };
}

/**
 * Extract call expression (e.g., array.map)
 * Example: {items.map(item => <li>{item}</li>)}
 */
function extractCallExpression(expr, parentPath, pathGen, t) {
  // Check if it's a .map() call
  if (t.isMemberExpression(expr.callee) &&
      t.isIdentifier(expr.callee.property) &&
      expr.callee.property.name === 'map') {

    const arrayBinding = buildMemberPath(expr.callee.object, t);

    // Extract arrow function parameters
    const arrowFunc = expr.arguments[0];
    if (t.isArrowFunctionExpression(arrowFunc)) {
      const itemVar = arrowFunc.params[0] && t.isIdentifier(arrowFunc.params[0])
        ? arrowFunc.params[0].name
        : 'item';

      const indexVar = arrowFunc.params[1] && t.isIdentifier(arrowFunc.params[1])
        ? arrowFunc.params[1].name
        : null;

      // Extract loop body (JSX)
      let body = null;
      if (t.isJSXElement(arrowFunc.body)) {
        body = traverseJSX(arrowFunc.body, parentPath, pathGen, t);
      } else if (t.isBlockStatement(arrowFunc.body)) {
        // Handle: items.map(item => { return <li>{item}</li> })
        const returnStatement = arrowFunc.body.body.find(s => t.isReturnStatement(s));
        if (returnStatement && t.isJSXElement(returnStatement.argument)) {
          body = traverseJSX(returnStatement.argument, parentPath, pathGen, t);
        }
      }

      return {
        loopType: 'map',
        arrayBinding,
        itemVar,
        indexVar,
        body
      };
    }
  }

  return null;
}

/**
 * Extract style object
 * Example: { fontSize: '32px', opacity: isVisible ? 1 : 0.5 }
 */
function extractStyleObject(expr, t) {
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
      } else if (t.isConditionalExpression(value)) {
        // Conditional value: opacity: isVisible ? 1 : 0.5
        properties.push({
          key,
          conditional: extractConditionalValue(value, t),
          isStatic: false
        });
      } else {
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
 * Extract conditional value (for style properties)
 */
function extractConditionalValue(expr, t) {
  const condition = t.isIdentifier(expr.test) ? expr.test.name :
                    t.isMemberExpression(expr.test) ? buildMemberPath(expr.test, t) :
                    '<complex>';

  const consequent = t.isLiteral(expr.consequent) ? String(expr.consequent.value) :
                     t.isIdentifier(expr.consequent) ? expr.consequent.name :
                     '<complex>';

  const alternate = t.isLiteral(expr.alternate) ? String(expr.alternate.value) :
                    t.isIdentifier(expr.alternate) ? expr.alternate.name :
                    '<complex>';

  return { condition, consequent, alternate };
}
