/**
 * Local Variables Extractor
 */

const t = require('@babel/types');
const { generateCSharpExpression } = require('../generators/expressions.cjs');
const { tsTypeToCSharpType } = require('../types/typeConversion.cjs');

/**
 * Extract local variables (const/let/var) from function body
 */
function extractLocalVariables(path, component) {
  const declarations = path.node.declarations;

  for (const declarator of declarations) {
    // Skip if it's a hook call (already handled)
    if (t.isCallExpression(declarator.init)) {
      const callee = declarator.init.callee;
      if (t.isIdentifier(callee) && callee.name.startsWith('use')) {
        continue; // Skip hook calls
      }
    }

    // Check if this is an event handler (arrow function or function expression)
    if (t.isIdentifier(declarator.id) && declarator.init) {
      const varName = declarator.id.name;

      // If it's an arrow function or function expression, treat it as an event handler
      if (t.isArrowFunctionExpression(declarator.init) || t.isFunctionExpression(declarator.init)) {
        component.eventHandlers.push({
          name: varName,
          body: declarator.init.body,
          params: declarator.init.params
        });
        continue;
      }

      // Otherwise, treat as a regular local variable
      const initValue = generateCSharpExpression(declarator.init);

      // Try to infer type from TypeScript annotation or initial value
      let varType = 'var'; // C# var for type inference
      if (declarator.id.typeAnnotation?.typeAnnotation) {
        varType = tsTypeToCSharpType(declarator.id.typeAnnotation.typeAnnotation);
      }

      component.localVariables.push({
        name: varName,
        type: varType,
        initialValue: initValue
      });
    }
  }
}

module.exports = {
  extractLocalVariables
};
