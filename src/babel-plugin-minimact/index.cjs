/**
 * Babel Plugin: Minimact JSX/TSX to C# Transform
 *
 * Transforms React components with hooks into C# Minimact components.
 *
 * Input (TSX):
 *   import { useState, useEffect, useRef } from 'minimact';
 *
 *   export function Counter() {
 *     const [count, setCount] = useState(0);
 *     const buttonRef = useRef(null);
 *
 *     useEffect(() => {
 *       console.log('Count changed');
 *     }, [count]);
 *
 *     return (
 *       <div className="counter">
 *         <p>Count: {count}</p>
 *         <button ref={buttonRef} onClick={() => setCount(count + 1)}>
 *           Increment
 *         </button>
 *       </div>
 *     );
 *   }
 *
 * Output (C#):
 *   using Minimact;
 *   using System.Collections.Generic;
 *
 *   namespace Generated.Components
 *   {
 *       [MinimactComponent]
 *       public class Counter : MinimactComponent
 *       {
 *           [UseState(0)]
 *           private int count;
 *
 *           [UseRef(null)]
 *           private ElementRef buttonRef;
 *
 *           [UseEffect("count")]
 *           private void Effect_0()
 *           {
 *               Console.WriteLine("Count changed");
 *           }
 *
 *           protected override VNode Render()
 *           {
 *               return new VElement("div", new Dictionary<string, string>
 *               {
 *                   ["className"] = "counter"
 *               }, new VNode[]
 *               {
 *                   new VElement("p", $"Count: {count}"),
 *                   new VElement("button", new Dictionary<string, string>
 *                   {
 *                       ["ref"] = "buttonRef",
 *                       ["onClick"] = "Increment"
 *                   }, "Increment")
 *               });
 *           }
 *
 *           private void Increment()
 *           {
 *               SetState(nameof(count), count + 1);
 *           }
 *       }
 *   }
 */

const t = require('@babel/types');

module.exports = function(babel) {
  return {
    name: 'minimact',

    visitor: {
      Program: {
        exit(path, state) {
          // After processing entire file, generate C# output
          if (state.file.minimactComponents && state.file.minimactComponents.length > 0) {
            const csharpCode = generateCSharpFile(state.file.minimactComponents, state);

            // Store in state for external processing
            state.file.metadata = state.file.metadata || {};
            state.file.metadata.minimactCSharp = csharpCode;
          }
        }
      },

      FunctionDeclaration(path, state) {
        processComponent(path, state);
      },

      ArrowFunctionExpression(path, state) {
        // Only process if it's a component (assigned to uppercase variable)
        if (path.parent.type === 'VariableDeclarator') {
          processComponent(path, state);
        }
      },

      FunctionExpression(path, state) {
        if (path.parent.type === 'VariableDeclarator') {
          processComponent(path, state);
        }
      }
    }
  };
};

/**
 * Process a React component and extract minimact metadata
 */
function processComponent(path, state) {
  const componentName = getComponentName(path);

  if (!componentName) return;
  if (componentName[0] !== componentName[0].toUpperCase()) return; // Not a component

  // Initialize components array
  state.file.minimactComponents = state.file.minimactComponents || [];

  const component = {
    name: componentName,
    useState: [],
    useEffect: [],
    useRef: [],
    eventHandlers: [],
    renderBody: null,
    props: []
  };

  // Extract hooks and JSX
  path.traverse({
    VariableDeclarator(varPath) {
      // Check for useState
      if (isUseStateCall(varPath.node.init)) {
        const stateInfo = extractUseState(varPath);
        if (stateInfo) {
          component.useState.push(stateInfo);
        }
      }

      // Check for useRef
      if (isUseRefCall(varPath.node.init)) {
        const refInfo = extractUseRef(varPath);
        if (refInfo) {
          component.useRef.push(refInfo);
        }
      }
    },

    CallExpression(callPath) {
      // Check for useEffect
      if (isUseEffectCall(callPath.node)) {
        const effectInfo = extractUseEffect(callPath);
        if (effectInfo) {
          component.useEffect.push(effectInfo);
        }
      }
    },

    ReturnStatement(returnPath) {
      // Extract JSX return
      if (returnPath.getFunctionParent() === path) {
        component.renderBody = returnPath.node.argument;
      }
    }
  });

  // Handle direct JSX return in arrow functions
  if (t.isJSXElement(path.node.body) || t.isJSXFragment(path.node.body)) {
    component.renderBody = path.node.body;
  }

  // Extract event handlers from JSX
  if (component.renderBody) {
    component.eventHandlers = extractEventHandlers(component.renderBody, path);
  }

  state.file.minimactComponents.push(component);
}

/**
 * Get component name from function path
 */
function getComponentName(path) {
  if (path.node.id && path.node.id.name) {
    return path.node.id.name;
  }

  if (path.parent.type === 'VariableDeclarator' && path.parent.id.name) {
    return path.parent.id.name;
  }

  if (path.parent.type === 'ExportDefaultDeclaration') {
    return 'Component';
  }

  return null;
}

/**
 * Check if a call expression is useState
 */
function isUseStateCall(node) {
  return t.isCallExpression(node) &&
         t.isIdentifier(node.callee) &&
         node.callee.name === 'useState';
}

/**
 * Check if a call expression is useRef
 */
function isUseRefCall(node) {
  return t.isCallExpression(node) &&
         t.isIdentifier(node.callee) &&
         node.callee.name === 'useRef';
}

/**
 * Check if a call expression is useEffect
 */
function isUseEffectCall(node) {
  return t.isIdentifier(node.callee) &&
         node.callee.name === 'useEffect';
}

/**
 * Extract useState information
 */
function extractUseState(varPath) {
  const id = varPath.node.id;
  const init = varPath.node.init;

  if (!t.isArrayPattern(id)) return null;

  const stateName = id.elements[0] ? id.elements[0].name : null;
  const setterName = id.elements[1] ? id.elements[1].name : null;
  const initialValue = init.arguments[0];

  if (!stateName) return null;

  return {
    name: stateName,
    setter: setterName,
    initialValue: generateCSharpValue(initialValue),
    type: inferCSharpType(initialValue)
  };
}

/**
 * Extract useRef information
 */
function extractUseRef(varPath) {
  const id = varPath.node.id;
  const init = varPath.node.init;

  if (!t.isIdentifier(id)) return null;

  const refName = id.name;
  const initialValue = init.arguments[0];

  return {
    name: refName,
    initialValue: generateCSharpValue(initialValue),
    type: 'ElementRef'
  };
}

/**
 * Extract useEffect information
 */
function extractUseEffect(callPath) {
  const args = callPath.node.arguments;
  if (args.length === 0) return null;

  const effectFunction = args[0];
  const dependencies = args[1];

  let deps = [];
  if (t.isArrayExpression(dependencies)) {
    deps = dependencies.elements.map(dep => {
      if (t.isIdentifier(dep)) return dep.name;
      return null;
    }).filter(Boolean);
  }

  // Extract function body
  let body = '';
  if (t.isArrowFunctionExpression(effectFunction) || t.isFunctionExpression(effectFunction)) {
    if (t.isBlockStatement(effectFunction.body)) {
      body = generateCSharpFromJS(effectFunction.body);
    } else {
      body = generateCSharpFromJS(effectFunction.body);
    }
  }

  return {
    dependencies: deps,
    body: body
  };
}

/**
 * Extract event handlers from JSX
 */
function extractEventHandlers(jsxNode, scope) {
  const handlers = [];

  traverseJSX(jsxNode, (element) => {
    if (!t.isJSXElement(element)) return;

    element.openingElement.attributes.forEach(attr => {
      if (!t.isJSXAttribute(attr)) return;

      const attrName = attr.name.name;
      if (!attrName || !attrName.startsWith('on')) return; // onClick, onChange, etc.

      const value = attr.value;

      if (t.isJSXExpressionContainer(value)) {
        const expr = value.expression;

        // Arrow function: onClick={() => setCount(count + 1)}
        if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
          const handlerName = `Handle${attrName.slice(2)}_${handlers.length}`;
          const body = generateCSharpFromJS(expr.body);

          handlers.push({
            name: handlerName,
            eventType: attrName,
            body: body,
            params: expr.params
          });
        }

        // Identifier: onClick={handleClick}
        if (t.isIdentifier(expr)) {
          // Reference to existing function, will be handled separately
        }
      }
    });
  });

  return handlers;
}

/**
 * Traverse JSX tree
 */
function traverseJSX(node, callback) {
  if (!node) return;

  callback(node);

  if (t.isJSXElement(node)) {
    node.children.forEach(child => traverseJSX(child, callback));
  }

  if (t.isJSXFragment(node)) {
    node.children.forEach(child => traverseJSX(child, callback));
  }
}

/**
 * Infer C# type from JavaScript value
 */
function inferCSharpType(node) {
  if (!node) return 'object';

  if (t.isStringLiteral(node)) return 'string';
  if (t.isNumericLiteral(node)) return 'int';
  if (t.isBooleanLiteral(node)) return 'bool';
  if (t.isArrayExpression(node)) return 'List<object>';
  if (t.isObjectExpression(node)) return 'Dictionary<string, object>';
  if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) return 'Action';

  return 'object';
}

/**
 * Generate C# value from JavaScript AST node
 */
function generateCSharpValue(node) {
  if (!node || t.isNullLiteral(node) || t.isIdentifier(node, { name: 'null' })) {
    return 'null';
  }

  if (t.isStringLiteral(node)) {
    return `"${node.value.replace(/"/g, '\\"')}"`;
  }

  if (t.isNumericLiteral(node)) {
    return node.value.toString();
  }

  if (t.isBooleanLiteral(node)) {
    return node.value ? 'true' : 'false';
  }

  if (t.isArrayExpression(node)) {
    const elements = node.elements.map(el => generateCSharpValue(el)).join(', ');
    return `new List<object> { ${elements} }`;
  }

  if (t.isObjectExpression(node)) {
    return 'new Dictionary<string, object>()';
  }

  if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
    return '() => {}';
  }

  return 'null';
}

/**
 * Generate C# code from JavaScript AST (simplified)
 */
function generateCSharpFromJS(node) {
  if (!node) return '';

  if (t.isBlockStatement(node)) {
    const statements = node.body.map(stmt => generateCSharpFromJS(stmt)).join('\n                ');
    return statements;
  }

  if (t.isExpressionStatement(node)) {
    return generateCSharpFromJS(node.expression) + ';';
  }

  if (t.isCallExpression(node)) {
    // console.log -> Console.WriteLine
    if (t.isMemberExpression(node.callee) &&
        t.isIdentifier(node.callee.object, { name: 'console' }) &&
        t.isIdentifier(node.callee.property, { name: 'log' })) {
      const args = node.arguments.map(arg => generateCSharpFromJS(arg)).join(', ');
      return `Console.WriteLine(${args})`;
    }

    // setCount(count + 1) -> SetState(nameof(count), count + 1)
    const callee = node.callee.name;
    if (callee && callee.startsWith('set') && callee.length > 3) {
      const stateName = callee[3].toLowerCase() + callee.slice(4);
      const value = node.arguments.map(arg => generateCSharpFromJS(arg)).join(', ');
      return `SetState(nameof(${stateName}), ${value})`;
    }
  }

  if (t.isIdentifier(node)) {
    return node.name;
  }

  if (t.isStringLiteral(node)) {
    return `"${node.value}"`;
  }

  if (t.isNumericLiteral(node)) {
    return node.value.toString();
  }

  if (t.isBinaryExpression(node)) {
    const left = generateCSharpFromJS(node.left);
    const right = generateCSharpFromJS(node.right);
    return `${left} ${node.operator} ${right}`;
  }

  return '/* TODO: Unsupported expression */';
}

/**
 * Generate C# VNode from JSX
 */
function generateCSharpVNode(jsxNode, indent = '            ') {
  if (!jsxNode) return 'null';

  // Text node
  if (t.isJSXText(jsxNode)) {
    const text = jsxNode.value.trim();
    if (!text) return null;
    return `new VText("${text.replace(/"/g, '\\"')}")`;
  }

  // Expression: {count}
  if (t.isJSXExpressionContainer(jsxNode)) {
    const expr = jsxNode.expression;
    if (t.isIdentifier(expr)) {
      return `new VText($"{${expr.name}}")`;
    }
    return `new VText($"{${generateCSharpFromJS(expr)}}")`;
  }

  // JSX Element: <div>...</div>
  if (t.isJSXElement(jsxNode)) {
    const tagName = jsxNode.openingElement.name.name;
    const attributes = jsxNode.openingElement.attributes;
    const children = jsxNode.children.filter(child => {
      if (t.isJSXText(child)) {
        return child.value.trim().length > 0;
      }
      return true;
    });

    // Generate props
    let propsCode = 'new Dictionary<string, string>()';
    if (attributes.length > 0) {
      const propPairs = attributes.map(attr => {
        if (!t.isJSXAttribute(attr)) return null;

        const name = attr.name.name;
        let value = '';

        if (t.isStringLiteral(attr.value)) {
          value = `"${attr.value.value}"`;
        } else if (t.isJSXExpressionContainer(attr.value)) {
          const expr = attr.value.expression;
          if (t.isIdentifier(expr)) {
            // ref={buttonRef} -> ["ref"] = "buttonRef"
            if (name === 'ref') {
              value = `"${expr.name}"`;
            } else {
              value = `$"{${expr.name}}"`;
            }
          } else if (t.isArrowFunctionExpression(expr)) {
            // onClick={() => ...} -> ["onClick"] = "HandlerName"
            value = `"Handler${name}_${Math.random().toString(36).slice(2, 7)}"`;
          } else {
            value = `"${generateCSharpFromJS(expr)}"`;
          }
        } else {
          value = '""';
        }

        return `                ["${name}"] = ${value}`;
      }).filter(Boolean);

      if (propPairs.length > 0) {
        propsCode = `new Dictionary<string, string>\n            {\n${propPairs.join(',\n')}\n            }`;
      }
    }

    // Generate children
    if (children.length === 0) {
      return `new VElement("${tagName}", ${propsCode})`;
    }

    const childrenCode = children
      .map(child => generateCSharpVNode(child, indent + '    '))
      .filter(Boolean)
      .join(',\n' + indent + '    ');

    if (children.length === 1 && t.isJSXText(children[0])) {
      // Shorthand for single text child
      const text = children[0].value.trim();
      return `new VElement("${tagName}", ${propsCode}, "${text}")`;
    }

    return `new VElement("${tagName}", ${propsCode}, new VNode[]\n${indent}{\n${indent}    ${childrenCode}\n${indent}})`;
  }

  return 'null';
}

/**
 * Generate complete C# file from components
 */
function generateCSharpFile(components, state) {
  const component = components[0]; // For now, handle single component

  const csharpLines = [];

  // Using directives
  csharpLines.push('using Minimact;');
  csharpLines.push('using System;');
  csharpLines.push('using System.Collections.Generic;');
  csharpLines.push('using System.Linq;');
  csharpLines.push('');

  // Namespace
  csharpLines.push('namespace Generated.Components');
  csharpLines.push('{');

  // Class declaration
  csharpLines.push('    [MinimactComponent]');
  csharpLines.push(`    public class ${component.name} : MinimactComponent`);
  csharpLines.push('    {');

  // useState fields
  component.useState.forEach(state => {
    csharpLines.push(`        [UseState(${state.initialValue})]`);
    csharpLines.push(`        private ${state.type} ${state.name};`);
    csharpLines.push('');
  });

  // useRef fields
  component.useRef.forEach(ref => {
    csharpLines.push(`        [UseRef(${ref.initialValue})]`);
    csharpLines.push(`        private ${ref.type} ${ref.name};`);
    csharpLines.push('');
  });

  // useEffect methods
  component.useEffect.forEach((effect, index) => {
    const deps = effect.dependencies.length > 0
      ? `"${effect.dependencies.join('", "')}"`
      : '';
    csharpLines.push(`        [UseEffect(${deps})]`);
    csharpLines.push(`        private void Effect_${index}()`);
    csharpLines.push('        {');
    csharpLines.push(`            ${effect.body}`);
    csharpLines.push('        }');
    csharpLines.push('');
  });

  // Render method
  csharpLines.push('        protected override VNode Render()');
  csharpLines.push('        {');
  if (component.renderBody) {
    const vnodeCode = generateCSharpVNode(component.renderBody);
    csharpLines.push(`            return ${vnodeCode};`);
  } else {
    csharpLines.push('            return new VElement("div", "No render body");');
  }
  csharpLines.push('        }');

  // Event handler methods
  component.eventHandlers.forEach(handler => {
    csharpLines.push('');
    csharpLines.push(`        private void ${handler.name}()`);
    csharpLines.push('        {');
    csharpLines.push(`            ${handler.body}`);
    csharpLines.push('        }');
  });

  // Close class
  csharpLines.push('    }');

  // Close namespace
  csharpLines.push('}');

  return csharpLines.join('\n');
}
