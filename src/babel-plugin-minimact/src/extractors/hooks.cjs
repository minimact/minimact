/**
 * Hook Extractors
 */

const t = require('@babel/types');
const { generateCSharpExpression } = require('../generators/expressions.cjs');
const { inferType } = require('../types/typeConversion.cjs');

/**
 * Extract hook calls (useState, useClientState, etc.)
 */
function extractHook(path, component) {
  const node = path.node;

  if (!t.isIdentifier(node.callee)) return;

  const hookName = node.callee.name;

  switch (hookName) {
    case 'useState':
      extractUseState(path, component, 'useState');
      break;
    case 'useClientState':
      extractUseState(path, component, 'useClientState');
      break;
    case 'useEffect':
      extractUseEffect(path, component);
      break;
    case 'useRef':
      extractUseRef(path, component);
      break;
    case 'useMarkdown':
      extractUseMarkdown(path, component);
      break;
    case 'useTemplate':
      extractUseTemplate(path, component);
      break;
    case 'useValidation':
      extractUseValidation(path, component);
      break;
    case 'useModal':
      extractUseModal(path, component);
      break;
    case 'useToggle':
      extractUseToggle(path, component);
      break;
    case 'useDropdown':
      extractUseDropdown(path, component);
      break;
    case 'usePub':
      extractUsePub(path, component);
      break;
    case 'useSub':
      extractUseSub(path, component);
      break;
    case 'useMicroTask':
      extractUseMicroTask(path, component);
      break;
    case 'useMacroTask':
      extractUseMacroTask(path, component);
      break;
    case 'useSignalR':
      extractUseSignalR(path, component);
      break;
    case 'usePredictHint':
      extractUsePredictHint(path, component);
      break;
    case 'useServerTask':
      extractUseServerTask(path, component);
      break;
    case 'usePaginatedServerTask':
      extractUsePaginatedServerTask(path, component);
      break;
  }
}

/**
 * Extract useState or useClientState
 */
function extractUseState(path, component, hookType) {
  const parent = path.parent;

  if (!t.isVariableDeclarator(parent)) return;
  if (!t.isArrayPattern(parent.id)) return;

  const [stateVar, setterVar] = parent.id.elements;
  const initialValue = path.node.arguments[0];

  const stateInfo = {
    name: stateVar.name,
    setter: setterVar.name,
    initialValue: generateCSharpExpression(initialValue),
    type: inferType(initialValue)
  };

  if (hookType === 'useState') {
    component.useState.push(stateInfo);
    component.stateTypes.set(stateVar.name, 'server');
  } else {
    component.useClientState.push(stateInfo);
    component.stateTypes.set(stateVar.name, 'client');
  }
}

/**
 * Extract useEffect
 */
function extractUseEffect(path, component) {
  const callback = path.node.arguments[0];
  const dependencies = path.node.arguments[1];

  component.useEffect.push({
    body: callback,
    dependencies: dependencies
  });
}

/**
 * Extract useRef
 */
function extractUseRef(path, component) {
  const parent = path.parent;

  if (!t.isVariableDeclarator(parent)) return;

  const refName = parent.id.name;
  const initialValue = path.node.arguments[0];

  component.useRef.push({
    name: refName,
    initialValue: generateCSharpExpression(initialValue)
  });
}

/**
 * Extract useMarkdown
 */
function extractUseMarkdown(path, component) {
  const parent = path.parent;

  if (!t.isVariableDeclarator(parent)) return;
  if (!t.isArrayPattern(parent.id)) return;

  const [contentVar, setterVar] = parent.id.elements;
  const initialValue = path.node.arguments[0];

  component.useMarkdown.push({
    name: contentVar.name,
    setter: setterVar.name,
    initialValue: generateCSharpExpression(initialValue)
  });

  // Track as markdown state type
  component.stateTypes.set(contentVar.name, 'markdown');
}

/**
 * Extract useTemplate
 */
function extractUseTemplate(path, component) {
  const templateName = path.node.arguments[0];
  const templateProps = path.node.arguments[1];

  if (t.isStringLiteral(templateName)) {
    component.useTemplate = {
      name: templateName.value,
      props: {}
    };

    // Extract template props if provided
    if (templateProps && t.isObjectExpression(templateProps)) {
      for (const prop of templateProps.properties) {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
          const propName = prop.key.name;
          let propValue = '';

          if (t.isStringLiteral(prop.value)) {
            propValue = prop.value.value;
          } else if (t.isNumericLiteral(prop.value)) {
            propValue = prop.value.value.toString();
          } else if (t.isBooleanLiteral(prop.value)) {
            propValue = prop.value.value.toString();
          }

          component.useTemplate.props[propName] = propValue;
        }
      }
    }
  }
}

/**
 * Extract useValidation
 */
function extractUseValidation(path, component) {
  const parent = path.parent;

  if (!t.isVariableDeclarator(parent)) return;

  const fieldName = parent.id.name;
  const fieldKey = path.node.arguments[0];
  const validationRules = path.node.arguments[1];

  const validationInfo = {
    name: fieldName,
    fieldKey: t.isStringLiteral(fieldKey) ? fieldKey.value : fieldName,
    rules: {}
  };

  // Extract validation rules from the object
  if (validationRules && t.isObjectExpression(validationRules)) {
    for (const prop of validationRules.properties) {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
        const ruleName = prop.key.name;
        let ruleValue = null;

        if (t.isStringLiteral(prop.value)) {
          ruleValue = prop.value.value;
        } else if (t.isNumericLiteral(prop.value)) {
          ruleValue = prop.value.value;
        } else if (t.isBooleanLiteral(prop.value)) {
          ruleValue = prop.value.value;
        } else if (t.isRegExpLiteral(prop.value)) {
          ruleValue = `/${prop.value.pattern}/${prop.value.flags || ''}`;
        }

        validationInfo.rules[ruleName] = ruleValue;
      }
    }
  }

  component.useValidation.push(validationInfo);
}

/**
 * Extract useModal
 */
function extractUseModal(path, component) {
  const parent = path.parent;

  if (!t.isVariableDeclarator(parent)) return;

  const modalName = parent.id.name;

  component.useModal.push({
    name: modalName
  });
}

/**
 * Extract useToggle
 */
function extractUseToggle(path, component) {
  const parent = path.parent;

  if (!t.isVariableDeclarator(parent)) return;
  if (!t.isArrayPattern(parent.id)) return;

  const [stateVar, toggleFunc] = parent.id.elements;
  const initialValue = path.node.arguments[0];

  const toggleInfo = {
    name: stateVar.name,
    toggleFunc: toggleFunc.name,
    initialValue: generateCSharpExpression(initialValue)
  };

  component.useToggle.push(toggleInfo);
}

/**
 * Extract useDropdown
 */
function extractUseDropdown(path, component) {
  const parent = path.parent;

  if (!t.isVariableDeclarator(parent)) return;

  const dropdownName = parent.id.name;
  const routeArg = path.node.arguments[0];

  let routeReference = null;

  // Try to extract route reference (e.g., Routes.Api.Units.GetAll)
  if (routeArg && t.isMemberExpression(routeArg)) {
    routeReference = generateCSharpExpression(routeArg);
  }

  component.useDropdown.push({
    name: dropdownName,
    route: routeReference
  });
}

/**
 * Extract usePub
 */
function extractUsePub(path, component) {
  const parent = path.parent;
  if (!t.isVariableDeclarator(parent)) return;

  const pubName = parent.id.name;
  const channel = path.node.arguments[0];

  component.usePub = component.usePub || [];
  component.usePub.push({
    name: pubName,
    channel: t.isStringLiteral(channel) ? channel.value : null
  });
}

/**
 * Extract useSub
 */
function extractUseSub(path, component) {
  const parent = path.parent;
  if (!t.isVariableDeclarator(parent)) return;

  const subName = parent.id.name;
  const channel = path.node.arguments[0];
  const callback = path.node.arguments[1];

  component.useSub = component.useSub || [];
  component.useSub.push({
    name: subName,
    channel: t.isStringLiteral(channel) ? channel.value : null,
    hasCallback: !!callback
  });
}

/**
 * Extract useMicroTask
 */
function extractUseMicroTask(path, component) {
  const callback = path.node.arguments[0];

  component.useMicroTask = component.useMicroTask || [];
  component.useMicroTask.push({
    body: callback
  });
}

/**
 * Extract useMacroTask
 */
function extractUseMacroTask(path, component) {
  const callback = path.node.arguments[0];
  const delay = path.node.arguments[1];

  component.useMacroTask = component.useMacroTask || [];
  component.useMacroTask.push({
    body: callback,
    delay: t.isNumericLiteral(delay) ? delay.value : 0
  });
}

/**
 * Extract useSignalR
 */
function extractUseSignalR(path, component) {
  const parent = path.parent;
  if (!t.isVariableDeclarator(parent)) return;

  const signalRName = parent.id.name;
  const hubUrl = path.node.arguments[0];
  const onMessage = path.node.arguments[1];

  component.useSignalR = component.useSignalR || [];
  component.useSignalR.push({
    name: signalRName,
    hubUrl: t.isStringLiteral(hubUrl) ? hubUrl.value : null,
    hasOnMessage: !!onMessage
  });
}

/**
 * Extract usePredictHint
 */
function extractUsePredictHint(path, component) {
  const hintId = path.node.arguments[0];
  const predictedState = path.node.arguments[1];

  component.usePredictHint = component.usePredictHint || [];
  component.usePredictHint.push({
    hintId: t.isStringLiteral(hintId) ? hintId.value : null,
    predictedState: predictedState
  });
}

/**
 * Extract useServerTask
 *
 * Detects: const task = useServerTask(async () => { ... }, options)
 * Transpiles async function → C# async Task<T>
 * Generates [ServerTask] attribute
 */
function extractUseServerTask(path, component) {
  const parent = path.parent;

  if (!t.isVariableDeclarator(parent)) return;

  const taskName = parent.id.name;
  const asyncFunction = path.node.arguments[0];
  const options = path.node.arguments[1];

  // Validate async function
  if (!asyncFunction || (!t.isArrowFunctionExpression(asyncFunction) && !t.isFunctionExpression(asyncFunction))) {
    console.warn('[useServerTask] First argument must be an async function');
    return;
  }

  if (!asyncFunction.async) {
    console.warn('[useServerTask] Function must be async');
    return;
  }

  // Check if streaming (async function*)
  const isStreaming = asyncFunction.generator === true;

  // Extract parameters
  const parameters = asyncFunction.params.map(param => {
    if (t.isIdentifier(param)) {
      return {
        name: param.name,
        type: param.typeAnnotation ? extractTypeAnnotation(param.typeAnnotation) : 'object'
      };
    }
    return null;
  }).filter(Boolean);

  // Extract options
  let streamingEnabled = isStreaming;
  let estimatedChunks = null;
  let runtime = 'csharp'; // Default to C#
  let parallel = false;

  if (options && t.isObjectExpression(options)) {
    for (const prop of options.properties) {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
        if (prop.key.name === 'stream' && t.isBooleanLiteral(prop.value)) {
          streamingEnabled = prop.value.value;
        }
        if (prop.key.name === 'estimatedChunks' && t.isNumericLiteral(prop.value)) {
          estimatedChunks = prop.value.value;
        }
        if (prop.key.name === 'runtime' && t.isStringLiteral(prop.value)) {
          runtime = prop.value.value; // 'csharp' | 'rust' | 'auto'
        }
        if (prop.key.name === 'parallel' && t.isBooleanLiteral(prop.value)) {
          parallel = prop.value.value;
        }
      }
    }
  }

  // Initialize component.useServerTask if needed
  component.useServerTask = component.useServerTask || [];

  // Store server task info
  component.useServerTask.push({
    name: taskName,
    asyncFunction: asyncFunction,
    parameters: parameters,
    isStreaming: streamingEnabled,
    estimatedChunks: estimatedChunks,
    returnType: extractReturnType(asyncFunction),
    runtime: runtime, // 'csharp' | 'rust' | 'auto'
    parallel: parallel // Enable Rayon parallel processing
  });
}

/**
 * Extract usePaginatedServerTask hook
 *
 * Detects: const users = usePaginatedServerTask(async ({ page, pageSize, filters }) => { ... }, options)
 * Generates TWO server tasks:
 *   1. Fetch task (with page params)
 *   2. Count task (from getTotalCount option)
 */
function extractUsePaginatedServerTask(path, component) {
  const parent = path.parent;

  if (!t.isVariableDeclarator(parent)) return;

  const taskName = parent.id.name;
  const fetchFunction = path.node.arguments[0];
  const options = path.node.arguments[1];

  // Validate fetch function
  if (!fetchFunction || (!t.isArrowFunctionExpression(fetchFunction) && !t.isFunctionExpression(fetchFunction))) {
    console.warn('[usePaginatedServerTask] First argument must be an async function');
    return;
  }

  if (!fetchFunction.async) {
    console.warn('[usePaginatedServerTask] Function must be async');
    return;
  }

  // Extract fetch function parameters
  // Expected: ({ page, pageSize, filters }: PaginationParams<TFilter>) => Promise<T[]>
  const parameters = [
    { name: 'page', type: 'int' },
    { name: 'pageSize', type: 'int' },
    { name: 'filters', type: 'object' }
  ];

  // Extract options
  let runtime = 'csharp'; // Default to C#
  let parallel = false;
  let pageSize = 20;
  let getTotalCountFn = null;

  if (options && t.isObjectExpression(options)) {
    for (const prop of options.properties) {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
        if (prop.key.name === 'runtime' && t.isStringLiteral(prop.value)) {
          runtime = prop.value.value;
        }
        if (prop.key.name === 'parallel' && t.isBooleanLiteral(prop.value)) {
          parallel = prop.value.value;
        }
        if (prop.key.name === 'pageSize' && t.isNumericLiteral(prop.value)) {
          pageSize = prop.value.value;
        }
        if (prop.key.name === 'getTotalCount') {
          getTotalCountFn = prop.value;
        }
      }
    }
  }

  // Initialize component.useServerTask if needed
  component.useServerTask = component.useServerTask || [];
  component.paginatedTasks = component.paginatedTasks || [];

  // 1. Add fetch task
  const fetchTaskName = `${taskName}_fetch`;
  component.useServerTask.push({
    name: fetchTaskName,
    asyncFunction: fetchFunction,
    parameters: parameters,
    isStreaming: false,
    estimatedChunks: null,
    returnType: 'List<object>', // Will be refined by type inference
    runtime: runtime,
    parallel: parallel
  });

  // 2. Add count task (if getTotalCount provided)
  let countTaskName = null;
  if (getTotalCountFn && (t.isArrowFunctionExpression(getTotalCountFn) || t.isFunctionExpression(getTotalCountFn))) {
    countTaskName = `${taskName}_count`;

    const countParameters = [
      { name: 'filters', type: 'object' }
    ];

    component.useServerTask.push({
      name: countTaskName,
      asyncFunction: getTotalCountFn,
      parameters: countParameters,
      isStreaming: false,
      estimatedChunks: null,
      returnType: 'int',
      runtime: runtime,
      parallel: false // Count queries don't need parallelization
    });
  }

  // Store pagination metadata
  component.paginatedTasks.push({
    name: taskName,
    fetchTaskName: fetchTaskName,
    countTaskName: countTaskName,
    pageSize: pageSize,
    runtime: runtime,
    parallel: parallel
  });

  console.log(`[usePaginatedServerTask] Extracted pagination tasks for '${taskName}':`, {
    fetch: fetchTaskName,
    count: countTaskName,
    runtime,
    parallel
  });
}

/**
 * Extract TypeScript type annotation
 */
function extractTypeAnnotation(typeAnnotation) {
  // Strip TSTypeAnnotation wrapper
  const actualType = typeAnnotation.typeAnnotation || typeAnnotation;

  if (t.isTSStringKeyword(actualType)) {
    return 'string';
  }
  if (t.isTSNumberKeyword(actualType)) {
    return 'double';
  }
  if (t.isTSBooleanKeyword(actualType)) {
    return 'bool';
  }
  if (t.isTSArrayType(actualType)) {
    const elementType = extractTypeAnnotation(actualType.elementType);
    return `List<${elementType}>`;
  }
  if (t.isTSTypeReference(actualType) && t.isIdentifier(actualType.typeName)) {
    return actualType.typeName.name; // Use custom type as-is
  }

  return 'object';
}

/**
 * Extract return type from async function
 */
function extractReturnType(asyncFunction) {
  // Check for explicit return type annotation
  if (asyncFunction.returnType) {
    const returnType = asyncFunction.returnType.typeAnnotation;

    // Promise<T> → T
    if (t.isTSTypeReference(returnType) &&
        t.isIdentifier(returnType.typeName) &&
        returnType.typeName.name === 'Promise') {
      if (returnType.typeParameters && returnType.typeParameters.params.length > 0) {
        return extractTypeAnnotation(returnType.typeParameters.params[0]);
      }
    }

    return extractTypeAnnotation(returnType);
  }

  // Try to infer from return statements
  // For now, default to object
  return 'object';
}

module.exports = {
  extractHook,
  extractUseState,
  extractUseEffect,
  extractUseRef,
  extractUseMarkdown,
  extractUseTemplate,
  extractUseValidation,
  extractUseModal,
  extractUseToggle,
  extractUseDropdown,
  extractUsePub,
  extractUseSub,
  extractUseMicroTask,
  extractUseMacroTask,
  extractUseSignalR,
  extractUsePredictHint,
  extractUseServerTask
};