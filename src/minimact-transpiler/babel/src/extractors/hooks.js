/**
 * Hook Extractors for Minimact Transpiler
 *
 * Extracts hook metadata (useState, useMvcState, etc.) and stores in JSON IR
 * so C# code generator has all the information it needs.
 *
 * Ported from: babel-plugin-minimact/src/extractors/hooks.cjs
 */

/**
 * Extract all hook calls from component function body
 *
 * @param {Object} functionPath - Babel path to component function
 * @param {Object} t - Babel types
 * @returns {Object} - Hook metadata for JSON IR
 */
function extractHooks(functionPath, t) {
  const hooks = {
    useState: [],
    useMvcState: [],
    useMvcViewModel: null,
    useEffect: [],
    useRef: []
  };

  // Traverse function body to find hook calls
  functionPath.traverse({
    CallExpression(callPath) {
      if (!t.isIdentifier(callPath.node.callee)) return;

      const hookName = callPath.node.callee.name;

      switch (hookName) {
        case 'useState':
          const stateInfo = extractUseState(callPath, t);
          if (stateInfo) hooks.useState.push(stateInfo);
          break;

        case 'useMvcState':
          const mvcStateInfo = extractUseMvcState(callPath, t);
          if (mvcStateInfo) hooks.useMvcState.push(mvcStateInfo);
          break;

        case 'useMvcViewModel':
          hooks.useMvcViewModel = extractUseMvcViewModel(callPath, t);
          break;

        case 'useEffect':
          const effectInfo = extractUseEffect(callPath, t);
          if (effectInfo) hooks.useEffect.push(effectInfo);
          break;

        case 'useRef':
          const refInfo = extractUseRef(callPath, t);
          if (refInfo) hooks.useRef.push(refInfo);
          break;
      }
    }
  });

  return hooks;
}

/**
 * Extract useState hook
 *
 * Pattern: const [count, setCount] = useState<number>(0)
 *
 * @param {Object} callPath - Babel path to useState call
 * @param {Object} t - Babel types
 * @returns {Object|null} - State info or null
 */
function extractUseState(callPath, t) {
  const parent = callPath.parent;

  // Must be: const [x, setX] = useState(...)
  if (!t.isVariableDeclarator(parent)) return null;
  if (!t.isArrayPattern(parent.id)) return null;

  const elements = parent.id.elements;
  if (elements.length === 0) return null;

  const stateVar = elements[0];
  const setterVar = elements.length > 1 ? elements[1] : null;

  if (!stateVar) return null;

  const initialValue = callPath.node.arguments[0];

  // Extract explicit type from generic: useState<decimal>(0)
  let explicitType = null;
  if (callPath.node.typeParameters && callPath.node.typeParameters.params.length > 0) {
    const typeParam = callPath.node.typeParameters.params[0];
    explicitType = tsTypeToCSharpType(typeParam, t);
  }

  // Infer type from initial value if no explicit type
  const inferredType = inferTypeFromValue(initialValue, t);
  const finalType = explicitType || inferredType;

  return {
    stateVar: stateVar.name,
    setter: setterVar ? setterVar.name : null,
    initialValue: getValueLiteral(initialValue, t),
    type: finalType
  };
}

/**
 * Extract useMvcState hook
 *
 * Pattern: const [productName, setProductName] = useMvcState<string>('productName')
 * Pattern: const [price] = useMvcState<decimal>('price') // Read-only
 *
 * @param {Object} callPath - Babel path to useMvcState call
 * @param {Object} t - Babel types
 * @returns {Object|null} - MVC state info or null
 */
function extractUseMvcState(callPath, t) {
  const parent = callPath.parent;

  if (!t.isVariableDeclarator(parent)) return null;
  if (!t.isArrayPattern(parent.id)) return null;

  const elements = parent.id.elements;
  const propertyNameArg = callPath.node.arguments[0];

  // Property name must be string literal
  if (!t.isStringLiteral(propertyNameArg)) {
    console.warn('[useMvcState] Property name must be string literal');
    return null;
  }

  const propertyName = propertyNameArg.value;
  const stateVar = elements[0];
  const setterVar = elements.length > 1 ? elements[1] : null;

  // Extract type from generic: useMvcState<string>('productName')
  let csharpType = 'dynamic';
  if (callPath.node.typeParameters && callPath.node.typeParameters.params.length > 0) {
    const typeParam = callPath.node.typeParameters.params[0];
    csharpType = tsTypeToCSharpType(typeParam, t);
  }

  // Try to find type from ViewModel interface in the file
  const interfaceType = findViewModelPropertyType(callPath, propertyName, t);
  if (interfaceType) {
    csharpType = interfaceType;
  }

  return {
    stateVar: stateVar ? stateVar.name : null,
    setter: setterVar ? setterVar.name : null,
    propertyName: propertyName,
    mvcKey: propertyName,
    type: csharpType,
    readOnly: !setterVar
  };
}

/**
 * Extract useMvcViewModel hook
 *
 * Pattern: const viewModel = useMvcViewModel<ProductViewModel>()
 *
 * @param {Object} callPath - Babel path to useMvcViewModel call
 * @param {Object} t - Babel types
 * @returns {Object|null} - ViewModel info or null
 */
function extractUseMvcViewModel(callPath, t) {
  const parent = callPath.parent;

  if (!t.isVariableDeclarator(parent)) return null;
  if (!t.isIdentifier(parent.id)) return null;

  return {
    name: parent.id.name
  };
}

/**
 * Extract useEffect hook
 *
 * Pattern: useEffect(() => { ... }, [deps])
 *
 * @param {Object} callPath - Babel path to useEffect call
 * @param {Object} t - Babel types
 * @returns {Object|null} - Effect info or null
 */
function extractUseEffect(callPath, t) {
  const callback = callPath.node.arguments[0];
  const dependencies = callPath.node.arguments[1];

  // Store callback AST node (for later C# generation if needed)
  return {
    hasCallback: !!callback,
    hasDependencies: !!dependencies
  };
}

/**
 * Extract useRef hook
 *
 * Pattern: const myRef = useRef<HTMLDivElement>(null)
 *
 * @param {Object} callPath - Babel path to useRef call
 * @param {Object} t - Babel types
 * @returns {Object|null} - Ref info or null
 */
function extractUseRef(callPath, t) {
  const parent = callPath.parent;

  if (!t.isVariableDeclarator(parent)) return null;
  if (!t.isIdentifier(parent.id)) return null;

  const refName = parent.id.name;
  const initialValue = callPath.node.arguments[0];

  return {
    name: refName,
    initialValue: getValueLiteral(initialValue, t)
  };
}

// ============================================================================
// Type Conversion Utilities
// ============================================================================

/**
 * Convert TypeScript type to C# type
 *
 * @param {Object} typeNode - Babel type node
 * @param {Object} t - Babel types
 * @returns {string} - C# type name
 */
function tsTypeToCSharpType(typeNode, t) {
  if (!typeNode) return 'dynamic';

  // Handle TSTypeAnnotation wrapper
  const actualType = typeNode.typeAnnotation || typeNode;

  // Primitives
  if (t.isTSStringKeyword(actualType)) return 'string';
  if (t.isTSNumberKeyword(actualType)) return 'double';
  if (t.isTSBooleanKeyword(actualType)) return 'bool';
  if (t.isTSVoidKeyword(actualType)) return 'void';
  if (t.isTSAnyKeyword(actualType)) return 'dynamic';
  if (t.isTSNullKeyword(actualType)) return 'null';
  if (t.isTSUndefinedKeyword(actualType)) return 'null';

  // Arrays
  if (t.isTSArrayType(actualType)) {
    const elementType = tsTypeToCSharpType(actualType.elementType, t);
    return `List<${elementType}>`;
  }

  // Type references (e.g., decimal, int, Date, custom types)
  if (t.isTSTypeReference(actualType) && t.isIdentifier(actualType.typeName)) {
    const typeName = actualType.typeName.name;

    // C# type mappings
    const typeMap = {
      'decimal': 'decimal',
      'int': 'int',
      'long': 'long',
      'float': 'float',
      'Date': 'DateTime',
      'RegExp': 'Regex',
      'Promise': 'Task'
    };

    if (typeMap[typeName]) {
      return typeMap[typeName];
    }

    // Generic types: Promise<T> → Task<T>
    if (typeName === 'Promise' && actualType.typeParameters) {
      const innerType = tsTypeToCSharpType(actualType.typeParameters.params[0], t);
      return `Task<${innerType}>`;
    }

    // Custom types: use as-is
    return typeName;
  }

  // Union types: T | null → Nullable<T>
  if (t.isTSUnionType(actualType)) {
    // For now, just use the first non-null type
    for (const type of actualType.types) {
      if (!t.isTSNullKeyword(type) && !t.isTSUndefinedKeyword(type)) {
        return tsTypeToCSharpType(type, t) + '?';
      }
    }
  }

  // Literal types
  if (t.isTSLiteralType(actualType)) {
    if (t.isStringLiteral(actualType.literal)) return 'string';
    if (t.isNumericLiteral(actualType.literal)) return 'double';
    if (t.isBooleanLiteral(actualType.literal)) return 'bool';
  }

  return 'dynamic';
}

/**
 * Infer C# type from initial value
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {string} - C# type name
 */
function inferTypeFromValue(node, t) {
  if (!node) return 'dynamic';

  if (t.isStringLiteral(node)) return 'string';
  if (t.isBooleanLiteral(node)) return 'bool';

  if (t.isNumericLiteral(node)) {
    // Check if integer or decimal
    return node.value % 1 === 0 ? 'int' : 'decimal';
  }

  if (t.isArrayExpression(node)) return 'List<object>';
  if (t.isObjectExpression(node)) return 'object';
  if (t.isNullLiteral(node)) return 'null';

  return 'dynamic';
}

/**
 * Get literal value as string for C# generation
 *
 * @param {Object} node - Babel AST node
 * @param {Object} t - Babel types
 * @returns {string} - Literal value
 */
function getValueLiteral(node, t) {
  if (!node) return 'null';

  if (t.isStringLiteral(node)) return `"${node.value}"`;
  if (t.isBooleanLiteral(node)) return node.value ? 'true' : 'false';
  if (t.isNumericLiteral(node)) return node.value.toString();
  if (t.isNullLiteral(node)) return 'null';
  if (t.isArrayExpression(node)) return 'new List<object>()';
  if (t.isObjectExpression(node)) return 'new {}';

  // For complex expressions, return placeholder
  return '<complex>';
}

/**
 * Find property type from ViewModel interface in the same file
 *
 * @param {Object} callPath - Babel path
 * @param {string} propertyName - Property name to find
 * @param {Object} t - Babel types
 * @returns {string|null} - C# type or null
 */
function findViewModelPropertyType(callPath, propertyName, t) {
  // Navigate to Program node
  let programPath = callPath;
  while (programPath && !t.isProgram(programPath.node)) {
    programPath = programPath.parentPath;
  }

  if (!programPath || !programPath.node || !programPath.node.body) {
    return null;
  }

  // Search for interface ending with "ViewModel"
  for (const statement of programPath.node.body) {
    if (t.isTSInterfaceDeclaration(statement)) {
      const interfaceName = statement.id.name;

      if (interfaceName.endsWith('ViewModel')) {
        // Found ViewModel interface - search for property
        for (const member of statement.body.body) {
          if (t.isTSPropertySignature(member)) {
            const key = member.key;

            if (t.isIdentifier(key) && key.name === propertyName) {
              // Found the property!
              const typeAnnotation = member.typeAnnotation?.typeAnnotation;
              if (typeAnnotation) {
                return tsTypeToCSharpType(typeAnnotation, t);
              }
            }
          }
        }
      }
    }
  }

  return null;
}

module.exports = {
  extractHooks,
  extractUseState,
  extractUseMvcState,
  extractUseMvcViewModel,
  extractUseEffect,
  extractUseRef,
  tsTypeToCSharpType,
  inferTypeFromValue
};
