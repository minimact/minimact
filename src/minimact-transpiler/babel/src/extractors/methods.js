/**
 * Method Extractor for Minimact Transpiler
 *
 * Extracts helper method metadata with Roslyn-compatible AST representation.
 * Node types map directly to Roslyn SyntaxFactory methods:
 * - LocalDeclaration → SyntaxFactory.LocalDeclarationStatement
 * - ExpressionStatement → SyntaxFactory.ExpressionStatement
 * - Invocation → SyntaxFactory.InvocationExpression
 * - Identifier → SyntaxFactory.IdentifierName
 * - Literal → SyntaxFactory.LiteralExpression
 * - BinaryExpression → SyntaxFactory.BinaryExpression
 * - MemberAccess → SyntaxFactory.MemberAccessExpression
 *
 * Based on: babel-plugin-minimact/src/processComponent.cjs (lines 147-177)
 */

/**
 * Extract helper methods with Roslyn-compatible AST
 */
function extractMethods(functionPath, t) {
  const methods = [];

  functionPath.traverse({
    FunctionDeclaration(funcPath) {
      if (funcPath.getFunctionParent() === functionPath && funcPath.parent.type === 'BlockStatement') {
        const funcName = funcPath.node.id.name;

        const params = funcPath.node.params.map(param => {
          if (t.isIdentifier(param)) {
            const paramType = param.typeAnnotation?.typeAnnotation
              ? tsTypeToCSharpType(param.typeAnnotation.typeAnnotation, t)
              : 'dynamic';
            return { name: param.name, type: paramType };
          }
          return { name: 'param', type: 'dynamic' };
        });

        const returnType = funcPath.node.returnType?.typeAnnotation
          ? tsTypeToCSharpType(funcPath.node.returnType.typeAnnotation, t)
          : 'void';

        const isAsync = funcPath.node.async;

        // Serialize function body to Roslyn-compatible AST
        const body = funcPath.node.body && t.isBlockStatement(funcPath.node.body)
          ? funcPath.node.body.body.map(stmt => serializeStatement(stmt, t))
          : [];

        methods.push({
          name: funcName,
          params,
          returnType,
          isAsync,
          body
        });

        console.log(`[Methods] Extracted: ${funcName}(${params.map(p => `${p.type} ${p.name}`).join(', ')}) → ${returnType}`);
      }
    }
  });

  return methods;
}

/**
 * Serialize a statement to Roslyn-compatible AST
 */
function serializeStatement(node, t) {
  switch (node.type) {
    case 'ExpressionStatement':
      return {
        type: 'ExpressionStatement',
        expression: serializeExpression(node.expression, t)
      };

    case 'VariableDeclaration':
      // Map to Roslyn LocalDeclaration
      return node.declarations.map(decl => ({
        type: 'LocalDeclaration',
        name: decl.id.name,
        variableType: 'var', // Use var for type inference
        initializer: decl.init ? serializeExpression(decl.init, t) : null
      }))[0];

    case 'ReturnStatement':
      return {
        type: 'ReturnStatement',
        expression: node.argument ? serializeExpression(node.argument, t) : null
      };

    case 'IfStatement':
      return {
        type: 'IfStatement',
        condition: serializeExpression(node.test, t),
        thenBranch: serializeStatement(node.consequent, t),
        elseBranch: node.alternate ? serializeStatement(node.alternate, t) : null
      };

    case 'BlockStatement':
      return {
        type: 'Block',
        statements: node.body.map(stmt => serializeStatement(stmt, t))
      };

    default:
      return { type: 'Unknown', raw: node.type };
  }
}

/**
 * Serialize an expression to Roslyn-compatible AST
 */
function serializeExpression(node, t) {
  if (!node) return null;

  switch (node.type) {
    case 'CallExpression':
      return {
        type: 'Invocation',
        expression: serializeExpression(node.callee, t),
        arguments: node.arguments.map(arg => serializeExpression(arg, t))
      };

    case 'MemberExpression':
      return {
        type: 'MemberAccess',
        expression: serializeExpression(node.object, t),
        name: node.property.name || node.property.value,
        computed: node.computed
      };

    case 'Identifier':
      return {
        type: 'Identifier',
        name: node.name
      };

    case 'NumericLiteral':
      return {
        type: 'Literal',
        valueType: 'int',
        value: node.value
      };

    case 'StringLiteral':
      return {
        type: 'Literal',
        valueType: 'string',
        value: node.value
      };

    case 'BooleanLiteral':
      return {
        type: 'Literal',
        valueType: 'bool',
        value: node.value
      };

    case 'BinaryExpression':
      return {
        type: 'BinaryExpression',
        operator: mapOperator(node.operator),
        left: serializeExpression(node.left, t),
        right: serializeExpression(node.right, t)
      };

    case 'UnaryExpression':
      return {
        type: 'UnaryExpression',
        operator: mapOperator(node.operator),
        operand: serializeExpression(node.argument, t),
        prefix: node.prefix
      };

    case 'LogicalExpression':
      return {
        type: 'BinaryExpression',
        operator: mapOperator(node.operator),
        left: serializeExpression(node.left, t),
        right: serializeExpression(node.right, t)
      };

    case 'ConditionalExpression':
      return {
        type: 'ConditionalExpression',
        condition: serializeExpression(node.test, t),
        whenTrue: serializeExpression(node.consequent, t),
        whenFalse: serializeExpression(node.alternate, t)
      };

    case 'TemplateLiteral':
      // Convert template literal to string concatenation
      return serializeTemplateLiteral(node, t);

    default:
      return { type: 'Unknown', raw: node.type };
  }
}

/**
 * Map JavaScript operators to C# operators
 */
function mapOperator(op) {
  const map = {
    '===': '==',
    '!==': '!=',
    '&&': '&&',
    '||': '||'
  };
  return map[op] || op;
}

/**
 * Convert template literal to string concatenation
 */
function serializeTemplateLiteral(node, t) {
  const parts = [];
  for (let i = 0; i < node.quasis.length; i++) {
    if (node.quasis[i].value.raw) {
      parts.push({
        type: 'Literal',
        valueType: 'string',
        value: node.quasis[i].value.raw
      });
    }
    if (i < node.expressions.length) {
      parts.push(serializeExpression(node.expressions[i], t));
    }
  }

  // Build nested binary expressions for string concatenation
  if (parts.length === 0) return { type: 'Literal', valueType: 'string', value: '' };
  if (parts.length === 1) return parts[0];

  let result = parts[0];
  for (let i = 1; i < parts.length; i++) {
    result = {
      type: 'BinaryExpression',
      operator: '+',
      left: result,
      right: parts[i]
    };
  }
  return result;
}

/**
 * Convert TypeScript type to C# type
 */
function tsTypeToCSharpType(typeAnnotation, t) {
  if (!typeAnnotation) return 'dynamic';

  switch (typeAnnotation.type) {
    case 'TSStringKeyword':
      return 'string';
    case 'TSNumberKeyword':
      return 'double';
    case 'TSBooleanKeyword':
      return 'bool';
    case 'TSVoidKeyword':
      return 'void';
    case 'TSAnyKeyword':
      return 'dynamic';
    default:
      return 'dynamic';
  }
}

module.exports = {
  extractMethods
};
