/**
 * Event Handlers Extractor
 */

const t = require('@babel/types');

/**
 * Extract event handler name
 */
function extractEventHandler(value, component) {
  if (t.isStringLiteral(value)) {
    return value.value;
  }

  if (t.isJSXExpressionContainer(value)) {
    const expr = value.expression;

    if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
      // Inline arrow function - extract to named method
      const handlerName = `Handle${component.eventHandlers.length}`;

      // Check if the function is async
      const isAsync = expr.async || false;

      // Detect curried functions (functions that return functions)
      // Pattern: (e) => (id) => action(id)
      // This is invalid for event handlers because the returned function is never called
      if (t.isArrowFunctionExpression(expr.body) || t.isFunctionExpression(expr.body)) {
        // Generate a handler that throws a helpful error
        component.eventHandlers.push({
          name: handlerName,
          body: null, // Will be handled specially in component generator
          params: expr.params,
          capturedParams: [],
          isAsync: false,
          isCurriedError: true // Flag to generate error throw
        });

        return handlerName;
      }

      // Simplify common pattern: (e) => func(e.target.value)
      // Transform to: (value) => func(value)
      let body = expr.body;
      let params = expr.params;

      if (t.isCallExpression(body) && params.length === 1 && t.isIdentifier(params[0])) {
        const eventParam = params[0].name; // e.g., "e"
        const args = body.arguments;

        // Check if any argument is e.target.value
        const transformedArgs = args.map(arg => {
          if (t.isMemberExpression(arg) &&
              t.isMemberExpression(arg.object) &&
              t.isIdentifier(arg.object.object, { name: eventParam }) &&
              t.isIdentifier(arg.object.property, { name: 'target' }) &&
              t.isIdentifier(arg.property, { name: 'value' })) {
            // Replace e.target.value with direct value parameter
            return t.identifier('value');
          }
          return arg;
        });

        // If we transformed any args, update the body and param name
        if (transformedArgs.some((arg, i) => arg !== args[i])) {
          body = t.callExpression(body.callee, transformedArgs);
          params = [t.identifier('value')];
        }
      }

      // Check if we're inside a .map() context and capture those variables
      const capturedParams = component.currentMapContext ? component.currentMapContext.params : [];

      // Handle parameter destructuring
      // Convert ({ target: { value } }) => ... into (e) => ... with unpacking in body
      const hasDestructuring = params.some(p => t.isObjectPattern(p));
      let processedBody = body;
      let processedParams = params;

      if (hasDestructuring && params.length === 1 && t.isObjectPattern(params[0])) {
        // Extract destructured properties
        const destructuringStatements = [];
        const eventParam = t.identifier('e');

        function extractDestructured(pattern, path = []) {
          if (t.isObjectPattern(pattern)) {
            for (const prop of pattern.properties) {
              if (t.isObjectProperty(prop)) {
                const key = t.isIdentifier(prop.key) ? prop.key.name : null;
                if (key && t.isIdentifier(prop.value)) {
                  // Simple: { value } or { target: { value } }
                  const varName = prop.value.name;
                  const accessPath = [...path, key];
                  destructuringStatements.push({ varName, accessPath });
                } else if (key && t.isObjectPattern(prop.value)) {
                  // Nested: { target: { value } }
                  extractDestructured(prop.value, [...path, key]);
                }
              }
            }
          }
        }

        extractDestructured(params[0]);
        processedParams = [eventParam];

        // Prepend destructuring assignments to body
        if (destructuringStatements.length > 0) {
          const assignments = destructuringStatements.map(({ varName, accessPath }) => {
            // Build e.Target.Value access chain
            let access = eventParam;
            for (const key of accessPath) {
              const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
              access = t.memberExpression(access, t.identifier(capitalizedKey));
            }
            return t.variableDeclaration('var', [
              t.variableDeclarator(t.identifier(varName), access)
            ]);
          });

          // Wrap body in block statement with destructuring
          if (t.isBlockStatement(body)) {
            processedBody = t.blockStatement([...assignments, ...body.body]);
          } else {
            processedBody = t.blockStatement([...assignments, t.expressionStatement(body)]);
          }
        }
      }

      component.eventHandlers.push({
        name: handlerName,
        body: processedBody,
        params: processedParams,
        capturedParams: capturedParams,  // e.g., ['item', 'index']
        isAsync: isAsync  // Track if handler is async
      });

      // Return handler registration string
      // If there are captured params, append them as colon-separated interpolations
      // Format: "Handle0:{item}:{index}" - matches client's existing "Method:arg1:arg2" parser
      if (capturedParams.length > 0) {
        const capturedRefs = capturedParams.map(p => `{${p}}`).join(':');
        return `${handlerName}:${capturedRefs}`;
      }

      return handlerName;
    }

    if (t.isIdentifier(expr)) {
      return expr.name;
    }

    if (t.isCallExpression(expr)) {
      // () => someMethod() - extract
      const handlerName = `Handle${component.eventHandlers.length}`;

      // Check if we're inside a .map() context and capture those variables
      const capturedParams = component.currentMapContext ? component.currentMapContext.params : [];

      component.eventHandlers.push({
        name: handlerName,
        body: expr,
        capturedParams: capturedParams  // e.g., ['item', 'index']
      });

      // Return handler registration string
      // If there are captured params, append them as colon-separated interpolations
      // Format: "Handle0:{item}:{index}" - matches client's existing "Method:arg1:arg2" parser
      if (capturedParams.length > 0) {
        const capturedRefs = capturedParams.map(p => `{${p}}`).join(':');
        return `${handlerName}:${capturedRefs}`;
      }

      return handlerName;
    }
  }

  return 'UnknownHandler';
}



module.exports = {
  extractEventHandler
};
