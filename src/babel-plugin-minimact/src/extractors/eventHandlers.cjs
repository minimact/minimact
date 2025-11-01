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

      component.eventHandlers.push({
        name: handlerName,
        body: body,
        params: params
      });
      return handlerName;
    }

    if (t.isIdentifier(expr)) {
      return expr.name;
    }

    if (t.isCallExpression(expr)) {
      // () => someMethod() - extract
      const handlerName = `Handle${component.eventHandlers.length}`;
      component.eventHandlers.push({ name: handlerName, body: expr });
      return handlerName;
    }
  }

  return 'UnknownHandler';
}



module.exports = {
  extractEventHandler
};
