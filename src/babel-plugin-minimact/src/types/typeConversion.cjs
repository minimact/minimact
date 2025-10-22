/**
 * Type Conversion
 */

const t = require('@babel/types');

/**
 * Convert TypeScript type annotation to C# type
 */
function tsTypeToCSharpType(tsType) {
  if (!tsType) return 'dynamic';

  // TSStringKeyword -> string
  if (t.isTSStringKeyword(tsType)) return 'string';

  // TSNumberKeyword -> double
  if (t.isTSNumberKeyword(tsType)) return 'double';

  // TSBooleanKeyword -> bool
  if (t.isTSBooleanKeyword(tsType)) return 'bool';

  // TSAnyKeyword -> dynamic
  if (t.isTSAnyKeyword(tsType)) return 'dynamic';

  // TSArrayType -> List<T>
  if (t.isTSArrayType(tsType)) {
    const elementType = tsTypeToCSharpType(tsType.elementType);
    return `List<${elementType}>`;
  }

  // TSTypeLiteral (object type) -> dynamic
  if (t.isTSTypeLiteral(tsType)) return 'dynamic';

  // TSTypeReference (custom types, interfaces) -> dynamic
  if (t.isTSTypeReference(tsType)) return 'dynamic';

  // Default to dynamic for full JSX semantics
  return 'dynamic';
}

/**
 * Infer C# type from initial value
 */
function inferType(node) {
  if (!node) return 'dynamic';

  if (t.isStringLiteral(node)) return 'string';
  if (t.isNumericLiteral(node)) return 'int';
  if (t.isBooleanLiteral(node)) return 'bool';
  if (t.isNullLiteral(node)) return 'dynamic';
  if (t.isArrayExpression(node)) return 'List<dynamic>';
  if (t.isObjectExpression(node)) return 'dynamic';

  return 'dynamic';
}


module.exports = {
  inferType,
  tsTypeToCSharpType
};
