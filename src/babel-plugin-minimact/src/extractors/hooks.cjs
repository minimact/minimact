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
  extractUseDropdown
};