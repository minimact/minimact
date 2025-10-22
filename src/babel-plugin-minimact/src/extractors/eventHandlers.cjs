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
      component.eventHandlers.push({ name: handlerName, body: expr.body });
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
