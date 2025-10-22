/**
 * Babel Plugin: Props-to-State Transform
 *
 * This plugin converts React component props into useState hooks,
 * making all components "prop-less" for Visual Compiler analysis.
 *
 * Transforms:
 *   const Card = ({ title, onClick }: Props) => { return <div>{title}</div>; }
 * Into:
 *   const Card = () => {
 *     const [title, setTitle] = useState('');
 *     const [onClick, setOnClick] = useState(() => () => {});
 *     return <div>{title}</div>;
 *   }
 */

const t = require('@babel/types');

module.exports = function(babel) {
  return {
    name: 'props-to-state',

    visitor: {
      // Handle function declarations: function Card(props) { ... }
      FunctionDeclaration(path) {
        transformPropsToState(path);
      },

      // Handle arrow functions: const Card = (props) => { ... }
      ArrowFunctionExpression(path) {
        transformPropsToState(path);
      },

      // Handle function expressions: const Card = function(props) { ... }
      FunctionExpression(path) {
        transformPropsToState(path);
      }
    }
  };
};

/**
 * Main transformation logic
 */
function transformPropsToState(path) {
  // Get component name
  const componentName = getComponentName(path);
  if (!componentName) return;

  // Skip if component name starts with lowercase (not a React component)
  if (componentName[0] !== componentName[0].toUpperCase()) {
    return;
  }

  // Get function params
  const params = path.node.params;
  if (params.length === 0) {
    // No props, nothing to transform
    return;
  }

  const propsParam = params[0];

  // Extract prop names and their types
  const propInfo = extractPropsInfo(propsParam, path);
  if (propInfo.length === 0) {
    // No props to transform (e.g., just `props` without destructuring)
    // We'll still remove the param to make it prop-less
    // but won't inject useState calls
  }

  // Remove the props parameter
  path.node.params = [];

  // Check for name clashes and generate useState declarations
  const useStateDeclarations = [];
  propInfo.forEach(prop => {
    // Check if variable name already exists in scope
    if (path.scope.hasBinding(prop.name)) {
      console.warn(
        `[babel-plugin-props-to-state] Warning: Variable '${prop.name}' already exists in scope for component '${componentName}'. Skipping transformation.`
      );
      return; // Skip this prop
    }

    // Also check setter name
    const setterName = generateSetterName(prop.name, prop.type);
    if (path.scope.hasBinding(setterName)) {
      console.warn(
        `[babel-plugin-props-to-state] Warning: Variable '${setterName}' already exists in scope for component '${componentName}'. Skipping transformation.`
      );
      return; // Skip this prop
    }

    useStateDeclarations.push(generateUseStateDeclaration(prop));
  });

  // Inject useState declarations at the start of the function body
  if (useStateDeclarations.length > 0) {
    injectUseStateDeclarations(path, useStateDeclarations);
  }

  // Ensure useState is imported from 'react'
  ensureUseStateImport(path);
}

/**
 * Get component name from function path
 */
function getComponentName(path) {
  // Function has a name: function Card() {}
  if (path.node.id && path.node.id.name) {
    return path.node.id.name;
  }

  // Function assigned to variable: const Card = () => {}
  if (path.parent.type === 'VariableDeclarator' && path.parent.id.name) {
    return path.parent.id.name;
  }

  // Export default: export default function() {}
  if (path.parent.type === 'ExportDefaultDeclaration') {
    return 'Component'; // Generic name
  }

  return null;
}

/**
 * Extract props information from the props parameter
 */
function extractPropsInfo(propsParam, path) {
  const props = [];

  // Handle destructured props: ({ title, onClick }: Props)
  if (t.isObjectPattern(propsParam)) {
    propsParam.properties.forEach(property => {
      if (t.isObjectProperty(property)) {
        // Handle aliasing: { data: userData }
        const keyName = property.key.name;
        const valueName = property.value.type === 'AssignmentPattern'
          ? property.value.left.name  // With default: { title = 'Default' }
          : property.value.name;       // Without default: { title }

        const hasDefault = property.value.type === 'AssignmentPattern';
        const defaultValue = hasDefault ? property.value.right : null;

        // Warn about aliasing (optional - can be logged)
        const isAliased = keyName !== valueName && !hasDefault;

        props.push({
          name: valueName || keyName,
          originalName: keyName,
          isAliased,
          defaultValue,
          type: inferPropType(keyName, defaultValue)
        });
      } else if (t.isRestElement(property)) {
        // Handle rest props: { name, ...rest }
        const restName = property.argument.name;
        props.push({
          name: restName,
          originalName: restName,
          isAliased: false,
          defaultValue: null,
          type: 'object'
        });
      }
    });
  } else if (t.isIdentifier(propsParam)) {
    // Handle non-destructured props: (props: Props)
    // Extract props.x usage and convert them to useState
    const propsUsage = findPropsUsage(path, propsParam.name);

    propsUsage.forEach(propName => {
      props.push({
        name: propName,
        originalName: propName,
        isAliased: false,
        defaultValue: null,
        type: inferPropType(propName, null),
        isFromNonDestructured: true
      });
    });
  }

  return props;
}

/**
 * Find props.x usage in non-destructured props
 * Scans the function body for MemberExpression like props.title
 */
function findPropsUsage(path, propsParamName) {
  const usedProps = new Set();

  path.traverse({
    MemberExpression(memberPath) {
      // Check if this is props.something
      if (
        t.isIdentifier(memberPath.node.object) &&
        memberPath.node.object.name === propsParamName &&
        t.isIdentifier(memberPath.node.property)
      ) {
        usedProps.add(memberPath.node.property.name);

        // Replace props.title with just title
        memberPath.replaceWith(t.identifier(memberPath.node.property.name));
      }
    }
  });

  return Array.from(usedProps);
}

/**
 * Infer prop type based on name and default value
 */
function inferPropType(propName, defaultValue) {
  // If there's a default value, use its type
  if (defaultValue) {
    if (t.isStringLiteral(defaultValue)) return 'string';
    if (t.isNumericLiteral(defaultValue)) return 'number';
    if (t.isBooleanLiteral(defaultValue)) return 'boolean';
    if (t.isArrayExpression(defaultValue)) return 'array';
    if (t.isObjectExpression(defaultValue)) return 'object';
    if (t.isArrowFunctionExpression(defaultValue) || t.isFunctionExpression(defaultValue)) {
      return 'function';
    }
  }

  // Infer from prop name patterns
  const lowerName = propName.toLowerCase();

  // Callbacks: onX, handleX
  if (lowerName.startsWith('on') || lowerName.startsWith('handle')) {
    return 'function';
  }

  // Booleans: isX, hasX, shouldX, canX
  if (lowerName.startsWith('is') ||
      lowerName.startsWith('has') ||
      lowerName.startsWith('should') ||
      lowerName.startsWith('can')) {
    return 'boolean';
  }

  // Arrays: Xs (plural), xList, xArray
  if (lowerName.endsWith('s') ||
      lowerName.includes('list') ||
      lowerName.includes('array') ||
      lowerName.includes('items')) {
    return 'array';
  }

  // Numbers: count, index, id (sometimes), size, width, height
  if (lowerName.includes('count') ||
      lowerName.includes('index') ||
      lowerName.includes('size') ||
      lowerName.includes('width') ||
      lowerName.includes('height') ||
      lowerName.includes('length')) {
    return 'number';
  }

  // Default to string for unknown types
  return 'string';
}

/**
 * Generate default value based on type
 */
function getDefaultValueForType(type, defaultValue) {
  // If explicit default value provided, use it
  if (defaultValue) {
    return defaultValue;
  }

  // Generate default based on type
  switch (type) {
    case 'string':
      return t.stringLiteral('');

    case 'number':
      return t.numericLiteral(0);

    case 'boolean':
      return t.booleanLiteral(false);

    case 'array':
      return t.arrayExpression([]);

    case 'object':
      return t.objectExpression([]);

    case 'function':
      // Return a mock function: () => (...args) => console.log('[Mock]', propName, ...args)
      return t.arrowFunctionExpression(
        [],
        t.arrowFunctionExpression(
          [t.restElement(t.identifier('args'))],
          t.blockStatement([])
        )
      );

    default:
      return t.identifier('undefined');
  }
}

/**
 * Generate setter name for a prop
 * Special handling for boolean props like isOpen -> setOpen
 */
function generateSetterName(name, type) {
  if (type === 'boolean' && name.startsWith('is')) {
    // isOpen -> setOpen
    return `set${name.slice(2)}`;
  } else if (type === 'boolean' && name.startsWith('has')) {
    // hasError -> setHasError (keep 'has' for clarity)
    return `set${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  } else {
    // Standard: title -> setTitle
    return `set${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  }
}

/**
 * Generate useState declaration for a prop
 * Example: const [title, setTitle] = useState(''); // transformed from props
 */
function generateUseStateDeclaration(prop) {
  const { name, originalName, isAliased, defaultValue, type, isFromNonDestructured } = prop;

  // Generate setter name
  const setterName = generateSetterName(name, type);

  // Get default value
  const initialValue = getDefaultValueForType(type, defaultValue);

  // Build: const [title, setTitle] = useState('');
  const declaration = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.arrayPattern([
        t.identifier(name),
        t.identifier(setterName)
      ]),
      t.callExpression(
        t.identifier('useState'),
        [initialValue]
      )
    )
  ]);

  // Add source comment for traceability
  let comment = 'transformed from props';
  if (isAliased) {
    comment += ` (originally: ${originalName})`;
  }
  if (isFromNonDestructured) {
    comment += ' (non-destructured)';
  }

  t.addComment(declaration, 'trailing', ` ${comment}`, false);

  return declaration;
}

/**
 * Inject useState declarations at the start of function body
 */
function injectUseStateDeclarations(path, declarations) {
  // Get function body
  let body = path.node.body;

  // Handle arrow functions with direct return: const C = () => <div/>
  if (!t.isBlockStatement(body)) {
    // Wrap in block statement: () => <div/> becomes () => { return <div/>; }
    body = t.blockStatement([
      t.returnStatement(body)
    ]);
    path.node.body = body;
  }

  // Insert useState declarations at the start of the block
  body.body.unshift(...declarations);
}

/**
 * Ensure useState is imported from 'react'
 */
function ensureUseStateImport(path) {
  // Find the program (root) node
  const program = path.findParent(p => p.isProgram());
  if (!program) return;

  // Check if useState is already imported
  let hasUseStateImport = false;
  let reactImportDeclaration = null;

  program.traverse({
    ImportDeclaration(importPath) {
      if (importPath.node.source.value === 'react') {
        reactImportDeclaration = importPath;

        // Check if useState is in the specifiers
        importPath.node.specifiers.forEach(spec => {
          if (t.isImportSpecifier(spec) && spec.imported.name === 'useState') {
            hasUseStateImport = true;
          }
        });
      }
    }
  });

  // Add useState import if not present
  if (!hasUseStateImport) {
    if (reactImportDeclaration) {
      // Add to existing React import
      reactImportDeclaration.node.specifiers.push(
        t.importSpecifier(t.identifier('useState'), t.identifier('useState'))
      );
    } else {
      // Create new import statement: import { useState } from 'react';
      const newImport = t.importDeclaration(
        [t.importSpecifier(t.identifier('useState'), t.identifier('useState'))],
        t.stringLiteral('react')
      );

      // Add at the top of the file
      program.node.body.unshift(newImport);
    }
  }
}
