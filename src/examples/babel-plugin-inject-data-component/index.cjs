/**
 * Babel Plugin: Inject data-component attributes
 *
 * This plugin adds data-component attributes to the root JSX element
 * of React components for Visual Compiler analysis.
 *
 * Transforms:
 *   function Card() { return <div>...</div>; }
 * Into:
 *   function Card() { return <div data-component="Card">...</div>; }
 */

const t = require('@babel/types');

module.exports = function(babel) {
  return {
    name: 'inject-data-component',

    visitor: {
      // Handle function declarations: function Card() { ... }
      FunctionDeclaration(path) {
        injectDataComponentIntoFunction(path);
      },

      // Handle function expressions: const Card = function() { ... }
      FunctionExpression(path) {
        injectDataComponentIntoFunction(path);
      },

      // Handle arrow functions: const Card = () => { ... }
      ArrowFunctionExpression(path) {
        injectDataComponentIntoFunction(path);
      },

      // Handle: export default function Card() {}
      ExportDefaultDeclaration(path) {
        const declaration = path.node.declaration;

        if (t.isFunctionDeclaration(declaration) ||
            t.isFunctionExpression(declaration) ||
            t.isArrowFunctionExpression(declaration)) {
          injectDataComponentIntoFunction(path.get('declaration'));
        }
      },

      // Handle: export const Card = () => {}
      ExportNamedDeclaration(path) {
        if (path.node.declaration && path.node.declaration.type === 'VariableDeclaration') {
          path.node.declaration.declarations.forEach(declarator => {
            if (t.isFunction(declarator.init)) {
              // The function expression visitor will handle this
              // Just making sure we don't skip it
            }
          });
        }
      },

      // Handle class components: class Card extends React.Component { render() { ... } }
      ClassDeclaration(path) {
        const componentName = path.node.id ? path.node.id.name : null;
        if (!componentName) return;

        // Check if it's a React component (has render method or extends React.Component)
        const classBody = path.node.body.body;
        const renderMethod = classBody.find(
          node => node.type === 'ClassMethod' && node.key.name === 'render'
        );

        if (renderMethod) {
          // Inject into render method's return
          injectIntoBlockStatement(renderMethod.body, componentName);
        }
      }
    }
  };
};

/**
 * Inject data-component into a function (component)
 */
function injectDataComponentIntoFunction(path) {
  // Get component name from function name or parent variable declarator
  let componentName = null;

  if (path.node.id && path.node.id.name) {
    // Function has a name: function Card() {}
    componentName = path.node.id.name;
  } else if (path.parent.type === 'VariableDeclarator' && path.parent.id.name) {
    // Function assigned to variable: const Card = () => {}
    componentName = path.parent.id.name;
  } else {
    // No name found, skip
    return;
  }

  // Skip if component name starts with lowercase (not a component, just a function)
  if (componentName[0] !== componentName[0].toUpperCase()) {
    return;
  }

  // Inject into function body
  if (path.node.body.type === 'BlockStatement') {
    injectIntoBlockStatement(path.node.body, componentName);
  } else if (t.isJSXElement(path.node.body) || t.isJSXFragment(path.node.body)) {
    // Arrow function with direct JSX return: const Card = () => <div>...</div>
    injectIntoJSXElement(path.node.body, componentName);
  } else if (t.isParenthesizedExpression && path.node.body.type === 'ParenthesizedExpression') {
    // Arrow function with parenthesized JSX: const Card = () => (<div>...</div>)
    let expression = path.node.body.expression;
    while (t.isParenthesizedExpression && expression.type === 'ParenthesizedExpression') {
      expression = expression.expression;
    }
    injectIntoJSXElement(expression, componentName);
  }
}

/**
 * Inject data-component into a block statement (function body)
 */
function injectIntoBlockStatement(blockStatement, componentName) {
  // Use loop to find ALL return statements, including nested ones
  const body = blockStatement.body;

  for (let i = 0; i < body.length; i++) {
    const statement = body[i];

    if (statement.type === 'ReturnStatement' && statement.argument) {
      // Unwrap parenthesized expressions: return (<div>...</div>)
      let argument = statement.argument;
      while (t.isParenthesizedExpression && argument.type === 'ParenthesizedExpression') {
        argument = argument.expression;
      }

      injectIntoJSXElement(argument, componentName);

      // Only inject into first return statement to avoid duplicates
      break;
    }

    // Handle nested blocks (if statements, etc.) if needed
    // This is optional - depends on if you want to handle all code paths
  }
}

/**
 * Inject data-component attribute into JSX element
 */
function injectIntoJSXElement(jsxNode, componentName) {
  if (!jsxNode) return;

  // Handle JSX element
  if (t.isJSXElement(jsxNode)) {
    const openingElement = jsxNode.openingElement;

    // Check if data-component attribute already exists
    const hasDataComponent = openingElement.attributes.some(
      attr => t.isJSXAttribute(attr) && attr.name.name === 'data-component'
    );

    if (!hasDataComponent) {
      // Add data-component attribute
      const dataComponentAttr = t.jsxAttribute(
        t.jsxIdentifier('data-component'),
        t.stringLiteral(componentName)
      );

      openingElement.attributes.push(dataComponentAttr);
    }
  }

  // Handle JSX fragment: <>...</>
  // Fragments can't have attributes, so we skip them
  if (t.isJSXFragment(jsxNode)) {
    // Do nothing - fragments can't have attributes
    return;
  }

  // Handle conditional expressions: condition ? <A/> : <B/>
  if (t.isConditionalExpression(jsxNode)) {
    injectIntoJSXElement(jsxNode.consequent, componentName);
    injectIntoJSXElement(jsxNode.alternate, componentName);
  }

  // Handle logical expressions: condition && <A/>
  if (t.isLogicalExpression(jsxNode)) {
    injectIntoJSXElement(jsxNode.right, componentName);
  }
}
