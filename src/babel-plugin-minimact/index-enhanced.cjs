/**
 * Babel Plugin: Minimact JSX/TSX to C# Transform (Enhanced)
 *
 * NEW FEATURES from convo.txt:
 * - Partial classes for codebehind with EF Core
 * - useMarkdown hook for server-side markdown rendering
 * - useTemplate hook for layout inheritance
 * - [State] attribute instead of [UseState]
 * - Lifecycle methods (OnInitializedAsync, etc.)
 *
 * Example with EF Core codebehind:
 *
 * TSX:
 *   export function UserProfile() {
 *     const [user, setUser] = useState(null);
 *     return user ? <div>{user.name}</div> : <div>Loading...</div>;
 *   }
 *
 * Generated C# (partial):
 *   [Component]
 *   public partial class UserProfile : MinimactComponent
 *   {
 *       [State]
 *       private User user;
 *
 *       public override VNode Render()
 *       {
 *           if (user == null)
 *               return new Div("Loading...");
 *           return new Div(user.Name);
 *       }
 *   }
 *
 * Codebehind file (User creates):
 *   public partial class UserProfile
 *   {
 *       private readonly AppDbContext _db;
 *
 *       public UserProfile(AppDbContext db)
 *       {
 *           _db = db;
 *       }
 *
 *       public override async Task OnInitializedAsync()
 *       {
 *           user = await _db.Users.FirstOrDefaultAsync();
 *           TriggerRender();
 *       }
 *   }
 */

const t = require('@babel/types');

module.exports = function(babel) {
  return {
    name: 'minimact-enhanced',

    visitor: {
      Program: {
        exit(path, state) {
          if (state.file.minimactComponents && state.file.minimactComponents.length > 0) {
            const csharpCode = generateCSharpFile(state.file.minimactComponents, state);

            state.file.metadata = state.file.metadata || {};
            state.file.metadata.minimactCSharp = csharpCode;
          }
        }
      },

      FunctionDeclaration(path, state) {
        processComponent(path, state);
      },

      ArrowFunctionExpression(path, state) {
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

function processComponent(path, state) {
  const componentName = getComponentName(path);

  if (!componentName) return;
  if (componentName[0] !== componentName[0].toUpperCase()) return;

  state.file.minimactComponents = state.file.minimactComponents || [];

  const component = {
    name: componentName,
    useState: [],
    useEffect: [],
    useRef: [],
    useMarkdown: [],      // NEW
    useTemplate: null,    // NEW
    eventHandlers: [],
    renderBody: null,
    props: []
  };

  // Extract hooks
  path.traverse({
    VariableDeclarator(varPath) {
      // useState
      if (isUseStateCall(varPath.node.init)) {
        const stateInfo = extractUseState(varPath);
        if (stateInfo) component.useState.push(stateInfo);
      }

      // useRef
      if (isUseRefCall(varPath.node.init)) {
        const refInfo = extractUseRef(varPath);
        if (refInfo) component.useRef.push(refInfo);
      }

      // useMarkdown - NEW
      if (isUseMarkdownCall(varPath.node.init)) {
        const markdownInfo = extractUseMarkdown(varPath);
        if (markdownInfo) component.useMarkdown.push(markdownInfo);
      }
    },

    CallExpression(callPath) {
      // useEffect
      if (isUseEffectCall(callPath.node)) {
        const effectInfo = extractUseEffect(callPath);
        if (effectInfo) component.useEffect.push(effectInfo);
      }

      // useTemplate - NEW
      if (isUseTemplateCall(callPath.node)) {
        component.useTemplate = extractUseTemplate(callPath);
      }
    },

    ReturnStatement(returnPath) {
      if (returnPath.getFunctionParent() === path) {
        component.renderBody = returnPath.node.argument;
      }
    }
  });

  // Direct JSX return in arrow functions
  if (t.isJSXElement(path.node.body) || t.isJSXFragment(path.node.body)) {
    component.renderBody = path.node.body;
  }

  // Extract event handlers
  if (component.renderBody) {
    component.eventHandlers = extractEventHandlers(component.renderBody, path);
  }

  state.file.minimactComponents.push(component);
}

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

// Hook detection
function isUseStateCall(node) {
  return t.isCallExpression(node) &&
         t.isIdentifier(node.callee) &&
         node.callee.name === 'useState';
}

function isUseRefCall(node) {
  return t.isCallExpression(node) &&
         t.isIdentifier(node.callee) &&
         node.callee.name === 'useRef';
}

function isUseEffectCall(node) {
  return t.isIdentifier(node.callee) &&
         node.callee.name === 'useEffect';
}

// NEW: useMarkdown detection
function isUseMarkdownCall(node) {
  return t.isCallExpression(node) &&
         t.isIdentifier(node.callee) &&
         node.callee.name === 'useMarkdown';
}

// NEW: useTemplate detection
function isUseTemplateCall(node) {
  return t.isIdentifier(node.callee) &&
         node.callee.name === 'useTemplate';
}

// Extract hooks
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

// NEW: Extract useMarkdown
function extractUseMarkdown(varPath) {
  const id = varPath.node.id;
  const init = varPath.node.init;

  if (!t.isArrayPattern(id)) return null;

  const mdName = id.elements[0] ? id.elements[0].name : null;
  const setterName = id.elements[1] ? id.elements[1].name : null;
  const initialValue = init.arguments[0];

  if (!mdName) return null;

  // Extract markdown content (usually a template string)
  let markdownContent = '';
  if (t.isStringLiteral(initialValue)) {
    markdownContent = initialValue.value;
  } else if (t.isTemplateLiteral(initialValue)) {
    markdownContent = initialValue.quasis.map(q => q.value.raw).join('${...}');
  }

  return {
    name: mdName,
    setter: setterName,
    initialValue: markdownContent,
    type: 'string' // Markdown is stored as string in C#
  };
}

// NEW: Extract useTemplate
function extractUseTemplate(callPath) {
  const args = callPath.node.arguments;
  if (args.length === 0) return null;

  const templateName = args[0];
  const templateProps = args[1];

  let name = '';
  if (t.isStringLiteral(templateName)) {
    name = templateName.value;
  }

  let props = {};
  if (t.isObjectExpression(templateProps)) {
    templateProps.properties.forEach(prop => {
      if (t.isObjectProperty(prop)) {
        const key = prop.key.name || prop.key.value;
        const value = generateCSharpValue(prop.value);
        props[key] = value;
      }
    });
  }

  return {
    name,
    props
  };
}

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

function extractEventHandlers(jsxNode, scope) {
  const handlers = [];

  traverseJSX(jsxNode, (element) => {
    if (!t.isJSXElement(element)) return;

    element.openingElement.attributes.forEach(attr => {
      if (!t.isJSXAttribute(attr)) return;

      const attrName = attr.name.name;
      if (!attrName || !attrName.startsWith('on')) return;

      const value = attr.value;

      if (t.isJSXExpressionContainer(value)) {
        const expr = value.expression;

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
      }
    });
  });

  return handlers;
}

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

function inferCSharpType(node) {
  if (!node) return 'object';

  if (t.isStringLiteral(node)) return 'string';
  if (t.isNumericLiteral(node)) return 'int';
  if (t.isBooleanLiteral(node)) return 'bool';
  if (t.isArrayExpression(node)) return 'List<object>';
  if (t.isObjectExpression(node)) return 'Dictionary<string, object>';
  if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) return 'Action';
  if (t.isNullLiteral(node)) return 'object';

  return 'object';
}

function generateCSharpValue(node) {
  if (!node || t.isNullLiteral(node) || t.isIdentifier(node, { name: 'null' })) {
    return 'null';
  }

  if (t.isStringLiteral(node)) {
    return `"${node.value.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
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

  if (t.isTemplateLiteral(node)) {
    return `"${node.quasis.map(q => q.value.raw).join('${...}')}"`;
  }

  return 'null';
}

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

  if (t.isTemplateLiteral(node)) {
    // Template string with expressions
    return `$"${node.quasis.map((q, i) => {
      let str = q.value.raw;
      if (i < node.expressions.length) {
        str += `{${generateCSharpFromJS(node.expressions[i])}}`;
      }
      return str;
    }).join('')}"`;
  }

  return '/* TODO: Unsupported expression */';
}

function generateCSharpVNode(jsxNode, indent = '            ') {
  if (!jsxNode) return 'null';

  // Text node
  if (t.isJSXText(jsxNode)) {
    const text = jsxNode.value.trim();
    if (!text) return null;
    return `new VText("${text.replace(/"/g, '\\"')}")`;
  }

  // Expression
  if (t.isJSXExpressionContainer(jsxNode)) {
    const expr = jsxNode.expression;
    if (t.isIdentifier(expr)) {
      return `new VText($"{${expr.name}}")`;
    }
    return `new VText($"{${generateCSharpFromJS(expr)}}")`;
  }

  // JSX Element
  if (t.isJSXElement(jsxNode)) {
    const tagName = jsxNode.openingElement.name.name;
    const attributes = jsxNode.openingElement.attributes;
    const children = jsxNode.children.filter(child => {
      if (t.isJSXText(child)) {
        return child.value.trim().length > 0;
      }
      return true;
    });

    // Check for markdown attribute (NEW)
    const hasMarkdown = attributes.some(attr =>
      t.isJSXAttribute(attr) && attr.name.name === 'markdown'
    );

    // Generate props
    let propsCode = 'new Dictionary<string, string>()';
    if (attributes.length > 0) {
      const propPairs = attributes
        .filter(attr => t.isJSXAttribute(attr) && attr.name.name !== 'markdown') // Exclude markdown attr
        .map(attr => {
          const name = attr.name.name;
          let value = '';

          if (t.isStringLiteral(attr.value)) {
            value = `"${attr.value.value}"`;
          } else if (t.isJSXExpressionContainer(attr.value)) {
            const expr = attr.value.expression;
            if (t.isIdentifier(expr)) {
              if (name === 'ref') {
                value = `"${expr.name}"`;
              } else {
                value = `$"{${expr.name}}"`;
              }
            } else if (t.isArrowFunctionExpression(expr)) {
              value = `"Handler${name}_${Math.random().toString(36).slice(2, 7)}"`;
            } else {
              value = `"${generateCSharpFromJS(expr)}"`;
            }
          } else {
            value = '""';
          }

          return `                ["${name}"] = ${value}`;
        })
        .filter(Boolean);

      if (propPairs.length > 0) {
        propsCode = `new Dictionary<string, string>\n            {\n${propPairs.join(',\n')}\n            }`;
      }
    }

    // NEW: If element has markdown attribute, use RawHtml renderer
    if (hasMarkdown && children.length === 1 && t.isJSXExpressionContainer(children[0])) {
      const expr = children[0].expression;
      if (t.isIdentifier(expr)) {
        return `new DivRawHtml(${expr.name})`;
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
      const text = children[0].value.trim();
      return `new VElement("${tagName}", ${propsCode}, "${text}")`;
    }

    return `new VElement("${tagName}", ${propsCode}, new VNode[]\n${indent}{\n${indent}    ${childrenCode}\n${indent}})`;
  }

  return 'null';
}

/**
 * NEW: Generate partial C# class (allows codebehind)
 */
function generateCSharpFile(components, state) {
  const component = components[0];

  const csharpLines = [];

  // Using directives
  csharpLines.push('using Minimact;');
  csharpLines.push('using System;');
  csharpLines.push('using System.Collections.Generic;');
  csharpLines.push('using System.Linq;');
  csharpLines.push('using System.Threading.Tasks;');
  csharpLines.push('');

  // Namespace
  csharpLines.push('namespace Generated.Components');
  csharpLines.push('{');

  // Component attribute
  csharpLines.push('    [Component]');

  // NEW: Partial class for codebehind support
  // NEW: Base class from useTemplate if specified
  const baseClass = component.useTemplate
    ? component.useTemplate.name
    : 'MinimactComponent';

  csharpLines.push(`    public partial class ${component.name} : ${baseClass}`);
  csharpLines.push('    {');

  // useState fields (NEW: [State] instead of [UseState])
  component.useState.forEach(state => {
    csharpLines.push(`        [State]`);
    csharpLines.push(`        private ${state.type} ${state.name} = ${state.initialValue};`);
    csharpLines.push('');
  });

  // useRef fields
  component.useRef.forEach(ref => {
    csharpLines.push(`        [Ref]`);
    csharpLines.push(`        private ${ref.type} ${ref.name};`);
    csharpLines.push('');
  });

  // NEW: useMarkdown fields
  component.useMarkdown.forEach(md => {
    csharpLines.push(`        [Markdown]`);
    csharpLines.push(`        [State]`);
    csharpLines.push(`        private string ${md.name} = @"${md.initialValue}";`);
    csharpLines.push('');
  });

  // useEffect methods (lifecycle hooks)
  component.useEffect.forEach((effect, index) => {
    const deps = effect.dependencies.length > 0
      ? `"${effect.dependencies.join('", "')}"`
      : '';

    // If no dependencies, it's OnInitializedAsync equivalent
    if (effect.dependencies.length === 0) {
      csharpLines.push(`        // Effect runs on mount (no dependencies)`);
      csharpLines.push(`        partial void OnComponentMounted();`);
    } else {
      csharpLines.push(`        // Effect runs when [${effect.dependencies.join(', ')}] change`);
      csharpLines.push(`        [OnStateChanged(${deps})]`);
      csharpLines.push(`        private void Effect_${index}()`);
      csharpLines.push('        {');
      csharpLines.push(`            ${effect.body}`);
      csharpLines.push('        }');
    }
    csharpLines.push('');
  });

  // Render method
  if (component.useTemplate) {
    // Override RenderContent() if using template
    csharpLines.push('        protected override VNode RenderContent()');
  } else {
    csharpLines.push('        protected override VNode Render()');
  }
  csharpLines.push('        {');
  if (component.renderBody) {
    const vnodeCode = generateCSharpVNode(component.renderBody);
    csharpLines.push(`            return ${vnodeCode};`);
  } else {
    csharpLines.push('            return new VElement("div", "No render body");');
  }
  csharpLines.push('        }');

  // Event handlers
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
