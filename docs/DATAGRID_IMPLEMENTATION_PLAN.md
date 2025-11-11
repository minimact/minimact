# DataGrid Implementation Plan

**JSX Templates → Babel → Parameterized Patches → Server Execution → Client Patching**

---

## **Executive Summary**

Implement `useDataGrid` - a revolutionary hook that allows developers to write **JSX in JavaScript arrow functions**, which Babel extracts at build time and converts to **parameterized template patches**. The server executes these templates with data binding, and the client receives **surgical row/cell-level patches** for maximum performance.

### **Key Innovation**

```tsx
// Developer writes JSX in arrow function parameters
const grid = useDataGrid({
  itemTemplate: ({ user }) => (
    <div className={`badge-${user.role.toLowerCase()}`}>
      <span>{user.name}</span>
      <span>{user.email}</span>
    </div>
  ),
  data: users
});
```

**What happens:**
1. **Babel extracts JSX** from arrow function at build time
2. **Converts to parameterized template** with bindings (`user.name`, `user.role.ToLower()`)
3. **Emits C# attribute** with template metadata
4. **Server reads attribute** and executes template with data
5. **Client receives surgical patches** (add/update/delete individual rows)

### **Why This Matters**

- ✅ **JSX in JS** - Not just component renders, but arrow function parameters
- ✅ **Build-time extraction** - Zero runtime overhead for template parsing
- ✅ **100% coverage** - Works for all data values (not just predicted states)
- ✅ **Surgical patching** - Update individual rows/cells, not full grid re-render
- ✅ **Server execution** - No client-side JSX evaluation (dehydrationist architecture)
- ✅ **Perfect integration** - Builds on Template Patch System, Babel plugin, SignalR

---

## **Phase 1: Babel Plugin Extension**

### **Goal**
Extend `babel-plugin-minimact` to recognize `useDataGrid` calls and extract JSX from arrow function templates.

### **Files to Modify**
- `src/babel-plugin-minimact/src/transforms/use-datagrid-extractor.js` (NEW)
- `src/babel-plugin-minimact/src/index.js` (ADD VISITOR)

### **Implementation**

#### **1.1: Create DataGrid Visitor**

**File:** `src/babel-plugin-minimact/src/transforms/use-datagrid-extractor.js`

```javascript
/**
 * Babel Visitor: Extract JSX templates from useDataGrid calls
 *
 * Transforms:
 *   useDataGrid({ itemTemplate: ({ user }) => <span>{user.name}</span> })
 *
 * Into C# attribute:
 *   [LoopTemplate("itemTemplate", "{ \"tag\": \"span\", \"bindings\": [\"user.Name\"] }")]
 */

module.exports = function({ types: t }) {
  return {
    visitor: {
      CallExpression(path, state) {
        // Only process useDataGrid calls
        if (!isUseDataGridCall(path.node)) {
          return;
        }

        const configArg = path.node.arguments[0];
        if (!t.isObjectExpression(configArg)) {
          return;
        }

        const templates = {};
        const componentName = getComponentName(path);

        // Extract templates from config object
        configArg.properties.forEach(prop => {
          if (!t.isObjectProperty(prop)) return;

          const key = prop.key.name;

          // Extract header template (static JSX)
          if (key === 'header' && t.isJSXElement(prop.value)) {
            templates.header = convertJSXToTemplate(prop.value, {
              static: true,
              params: []
            });
          }

          // Extract itemTemplate (parameterized JSX from arrow function)
          if (key === 'itemTemplate' && t.isArrowFunctionExpression(prop.value)) {
            const params = extractParamNames(prop.value);
            const jsxBody = getArrowFunctionBody(prop.value);

            if (jsxBody && t.isJSXElement(jsxBody)) {
              templates.itemTemplate = convertJSXToTemplate(jsxBody, {
                parameterized: true,
                params
              });
            }
          }

          // Extract subitemTemplate (nested parameterized JSX)
          if (key === 'subitemTemplate' && t.isArrowFunctionExpression(prop.value)) {
            const params = extractParamNames(prop.value);
            const jsxBody = getArrowFunctionBody(prop.value);

            if (jsxBody && t.isJSXElement(jsxBody)) {
              templates.subitemTemplate = convertJSXToTemplate(jsxBody, {
                parameterized: true,
                params
              });
            }
          }

          // Extract footer template (can be static or data-bound)
          if (key === 'footer' && t.isJSXElement(prop.value)) {
            templates.footer = convertJSXToTemplate(prop.value, {
              static: false,
              params: []
            });
          }
        });

        // Emit templates to C# codegen
        emitDataGridTemplates(state, componentName, templates);
      }
    }
  };

  /**
   * Check if CallExpression is useDataGrid
   */
  function isUseDataGridCall(node) {
    return (
      t.isCallExpression(node) &&
      t.isIdentifier(node.callee, { name: 'useDataGrid' })
    );
  }

  /**
   * Extract parameter names from arrow function
   * ({ user }) => ... → ['user']
   * ({ user, index }) => ... → ['user', 'index']
   */
  function extractParamNames(arrowFunc) {
    const params = [];
    const param = arrowFunc.params[0];

    if (t.isObjectPattern(param)) {
      // Destructured: ({ user }) => ...
      param.properties.forEach(prop => {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.value)) {
          params.push(prop.value.name);
        }
      });
    } else if (t.isIdentifier(param)) {
      // Direct: (user) => ...
      params.push(param.name);
    }

    return params;
  }

  /**
   * Get JSX body from arrow function
   * ({ user }) => <div>...</div> → JSXElement
   * ({ user }) => ( <div>...</div> ) → JSXElement (unwrap parens)
   */
  function getArrowFunctionBody(arrowFunc) {
    const body = arrowFunc.body;

    // Direct JSX: () => <div>...</div>
    if (t.isJSXElement(body)) {
      return body;
    }

    // Parenthesized JSX: () => (<div>...</div>)
    if (t.isJSXFragment(body)) {
      return body;
    }

    // Block with return: () => { return <div>...</div>; }
    if (t.isBlockStatement(body)) {
      const returnStmt = body.body.find(stmt => t.isReturnStatement(stmt));
      if (returnStmt && t.isJSXElement(returnStmt.argument)) {
        return returnStmt.argument;
      }
    }

    return null;
  }

  /**
   * Convert JSX to template JSON structure
   */
  function convertJSXToTemplate(jsx, options = {}) {
    if (t.isJSXElement(jsx)) {
      return {
        type: 'Element',
        tag: getTagName(jsx),
        props: convertJSXAttributes(jsx.openingElement.attributes, options),
        children: jsx.children
          .map(child => convertJSXToTemplate(child, options))
          .filter(Boolean)
      };
    }

    if (t.isJSXText(jsx)) {
      const value = jsx.value.trim();
      if (!value) return null;
      return {
        type: 'Text',
        value
      };
    }

    if (t.isJSXExpressionContainer(jsx)) {
      return convertJSXExpression(jsx.expression, options);
    }

    return null;
  }

  /**
   * Get tag name from JSX element
   */
  function getTagName(jsxElement) {
    const name = jsxElement.openingElement.name;

    if (t.isJSXIdentifier(name)) {
      return name.name;
    }

    // Handle JSXMemberExpression (e.g., <Foo.Bar />)
    if (t.isJSXMemberExpression(name)) {
      return getFullMemberName(name);
    }

    return 'div';
  }

  /**
   * Convert JSX attributes to props
   */
  function convertJSXAttributes(attributes, options) {
    const props = {};

    attributes.forEach(attr => {
      if (!t.isJSXAttribute(attr)) return;

      const name = attr.name.name;
      const value = attr.value;

      // Static string: className="foo"
      if (t.isStringLiteral(value)) {
        props[name] = {
          type: 'Static',
          value: value.value
        };
        return;
      }

      // Expression: className={expr}
      if (t.isJSXExpressionContainer(value)) {
        props[name] = convertJSXExpression(value.expression, options);
        return;
      }

      // Boolean attribute: disabled
      if (value === null) {
        props[name] = {
          type: 'Static',
          value: true
        };
      }
    });

    return props;
  }

  /**
   * Convert JSX expression to template node
   */
  function convertJSXExpression(expr, options) {
    // Parameterized binding: {user.name}
    if (options.parameterized && t.isMemberExpression(expr)) {
      return {
        type: 'Binding',
        path: generateBindingPath(expr)
      };
    }

    // Method call: {user.role.toLowerCase()}
    if (options.parameterized && t.isCallExpression(expr)) {
      return {
        type: 'ComputedBinding',
        expression: generateComputedExpression(expr)
      };
    }

    // Template literal: `badge-${user.role}`
    if (t.isTemplateLiteral(expr)) {
      return {
        type: 'TemplateString',
        template: generateTemplateFormat(expr),
        bindings: expr.expressions.map(e =>
          options.parameterized
            ? generateBindingPath(e)
            : generateExpression(e)
        )
      };
    }

    // Conditional: {user.isAdmin && <span>Admin</span>}
    if (t.isLogicalExpression(expr, { operator: '&&' })) {
      return {
        type: 'Conditional',
        condition: generateConditionExpression(expr.left, options),
        template: convertJSXToTemplate(expr.right, options)
      };
    }

    // Ternary: {user.active ? 'Yes' : 'No'}
    if (t.isConditionalExpression(expr)) {
      return {
        type: 'Ternary',
        condition: generateConditionExpression(expr.test, options),
        trueTemplate: convertJSXExpressionToValue(expr.consequent, options),
        falseTemplate: convertJSXExpressionToValue(expr.alternate, options)
      };
    }

    // Arrow function (event handler): onClick={() => handleEdit(user.id)}
    if (t.isArrowFunctionExpression(expr)) {
      return convertEventHandler(expr, options);
    }

    // Identifier: {user}
    if (options.parameterized && t.isIdentifier(expr)) {
      return {
        type: 'Binding',
        path: expr.name
      };
    }

    // Fallback: complex expression (server-evaluated)
    return {
      type: 'ComplexExpression',
      expression: generateExpression(expr)
    };
  }

  /**
   * Generate binding path from MemberExpression
   * user.name → "user.name"
   * user.profile.email → "user.profile.email"
   */
  function generateBindingPath(expr) {
    const parts = [];
    let current = expr;

    while (t.isMemberExpression(current)) {
      if (t.isIdentifier(current.property)) {
        parts.unshift(current.property.name);
      }
      current = current.object;
    }

    if (t.isIdentifier(current)) {
      parts.unshift(current.name);
    }

    return parts.join('.');
  }

  /**
   * Generate computed expression (with method calls)
   * user.role.toLowerCase() → "user.Role.ToLower()"
   */
  function generateComputedExpression(expr) {
    if (t.isCallExpression(expr)) {
      const method = expr.callee.property?.name;
      const object = expr.callee.object;
      const args = expr.arguments;

      const objectPath = generateBindingPath(object);
      const csharpMethod = convertJSMethodToCSharp(method);
      const csharpArgs = args.map(arg => convertArgumentToCSharp(arg)).join(', ');

      return `${objectPath}.${csharpMethod}(${csharpArgs})`;
    }

    return generateExpression(expr);
  }

  /**
   * Convert JS method names to C# equivalents
   */
  function convertJSMethodToCSharp(method) {
    const mapping = {
      'toLowerCase': 'ToLower',
      'toUpperCase': 'ToUpper',
      'trim': 'Trim',
      'toString': 'ToString',
      'toFixed': 'ToString',
      'toLocaleDateString': 'ToShortDateString',
      'toLocaleString': 'ToString'
    };

    return mapping[method] || toPascalCase(method);
  }

  /**
   * Convert template literal to format string
   * `badge-${user.role}` → "badge-{0}"
   */
  function generateTemplateFormat(expr) {
    let format = '';
    let index = 0;

    expr.quasis.forEach((quasi, i) => {
      format += quasi.value.raw;
      if (i < expr.expressions.length) {
        format += `{${index++}}`;
      }
    });

    return format;
  }

  /**
   * Convert event handler arrow function
   * onClick={() => handleEdit(user.id)} → { method: "handleEdit", args: ["user.id"] }
   */
  function convertEventHandler(arrowFunc, options) {
    const body = arrowFunc.body;

    // Direct call: () => handleEdit(user.id)
    if (t.isCallExpression(body)) {
      return {
        type: 'EventHandler',
        method: body.callee.name,
        args: body.arguments.map(arg => {
          if (options.parameterized && t.isMemberExpression(arg)) {
            return generateBindingPath(arg);
          }
          if (t.isIdentifier(arg)) {
            return arg.name;
          }
          return generateExpression(arg);
        })
      };
    }

    // Block: () => { handleEdit(user.id); }
    if (t.isBlockStatement(body)) {
      const exprStmt = body.body.find(stmt => t.isExpressionStatement(stmt));
      if (exprStmt && t.isCallExpression(exprStmt.expression)) {
        return convertEventHandler(
          t.arrowFunctionExpression([], exprStmt.expression),
          options
        );
      }
    }

    return {
      type: 'EventHandler',
      method: 'unknown',
      args: []
    };
  }

  /**
   * Generate generic expression string (fallback)
   */
  function generateExpression(expr) {
    // This would use babel generator to convert AST to code string
    // For now, simplified:
    if (t.isIdentifier(expr)) return expr.name;
    if (t.isStringLiteral(expr)) return `"${expr.value}"`;
    if (t.isNumericLiteral(expr)) return expr.value.toString();
    if (t.isBooleanLiteral(expr)) return expr.value.toString();
    return 'unknown';
  }

  /**
   * Emit DataGrid templates to C# codegen
   */
  function emitDataGridTemplates(state, componentName, templates) {
    // Add to state for C# emitter
    if (!state.dataGridTemplates) {
      state.dataGridTemplates = {};
    }

    if (!state.dataGridTemplates[componentName]) {
      state.dataGridTemplates[componentName] = [];
    }

    state.dataGridTemplates[componentName].push(templates);
  }

  // Helper functions
  function toPascalCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function getFullMemberName(memberExpr) {
    const parts = [];
    let current = memberExpr;

    while (t.isJSXMemberExpression(current)) {
      parts.unshift(current.property.name);
      current = current.object;
    }

    if (t.isJSXIdentifier(current)) {
      parts.unshift(current.name);
    }

    return parts.join('.');
  }

  function getComponentName(path) {
    // Walk up to find parent component function/class
    let parent = path.getFunctionParent();
    while (parent && !isFunctionComponent(parent)) {
      parent = parent.getFunctionParent();
    }

    if (parent && parent.node.id) {
      return parent.node.id.name;
    }

    return 'UnknownComponent';
  }

  function isFunctionComponent(path) {
    // Check if function returns JSX
    const returnStatements = [];
    path.traverse({
      ReturnStatement(returnPath) {
        returnStatements.push(returnPath);
      }
    });

    return returnStatements.some(stmt =>
      stmt.node.argument && t.isJSXElement(stmt.node.argument)
    );
  }

  function generateConditionExpression(expr, options) {
    if (options.parameterized && t.isMemberExpression(expr)) {
      return generateBindingPath(expr);
    }
    return generateExpression(expr);
  }

  function convertJSXExpressionToValue(expr, options) {
    if (t.isStringLiteral(expr)) {
      return { type: 'Text', value: expr.value };
    }
    if (t.isJSXElement(expr)) {
      return convertJSXToTemplate(expr, options);
    }
    return convertJSXExpression(expr, options);
  }

  function convertArgumentToCSharp(arg) {
    if (t.isStringLiteral(arg)) return `"${arg.value}"`;
    if (t.isNumericLiteral(arg)) return arg.value.toString();
    if (t.isBooleanLiteral(arg)) return arg.value.toString();
    if (t.isMemberExpression(arg)) return generateBindingPath(arg);
    return generateExpression(arg);
  }
};
```

#### **1.2: Integrate with Main Plugin**

**File:** `src/babel-plugin-minimact/src/index.js`

```javascript
const useDataGridExtractor = require('./transforms/use-datagrid-extractor');

module.exports = function(babel) {
  return {
    name: 'babel-plugin-minimact',
    visitor: {
      Program(path, state) {
        // Initialize state
        state.dataGridTemplates = {};
      },

      // Existing visitors...
      CallExpression: {
        exit(path, state) {
          // Apply useDataGrid extractor
          const dataGridVisitor = useDataGridExtractor(babel);
          dataGridVisitor.visitor.CallExpression.call(this, path, state);
        }
      },

      // After program completes, emit all templates
      ProgramExit(path, state) {
        if (state.dataGridTemplates && Object.keys(state.dataGridTemplates).length > 0) {
          emitDataGridAttributesToCSharp(state.dataGridTemplates);
        }
      }
    }
  };
};

function emitDataGridAttributesToCSharp(templates) {
  // Generate C# file with [LoopTemplate] attributes
  // This will be picked up by the C# partial class generator
  const fs = require('fs');
  const path = require('path');

  const outputPath = path.join(process.cwd(), 'obj', 'datagrid-templates.json');
  fs.writeFileSync(outputPath, JSON.stringify(templates, null, 2));
}
```

### **1.3: Test Cases**

**File:** `src/babel-plugin-minimact/test/use-datagrid.test.js`

```javascript
const babel = require('@babel/core');
const plugin = require('../src/index');

describe('useDataGrid template extraction', () => {
  test('extracts simple itemTemplate', () => {
    const code = `
      const grid = useDataGrid({
        itemTemplate: ({ user }) => (
          <div>{user.name}</div>
        )
      });
    `;

    const result = babel.transform(code, {
      plugins: [plugin]
    });

    expect(result.metadata.dataGridTemplates).toMatchObject({
      itemTemplate: {
        type: 'Element',
        tag: 'div',
        children: [
          { type: 'Binding', path: 'user.name' }
        ]
      }
    });
  });

  test('extracts template strings', () => {
    const code = `
      const grid = useDataGrid({
        itemTemplate: ({ user }) => (
          <div className={\`badge-\${user.role}\`}>
            {user.name}
          </div>
        )
      });
    `;

    const result = babel.transform(code, { plugins: [plugin] });

    expect(result.metadata.dataGridTemplates.itemTemplate.props.className).toMatchObject({
      type: 'TemplateString',
      template: 'badge-{0}',
      bindings: ['user.role']
    });
  });

  test('extracts event handlers', () => {
    const code = `
      const grid = useDataGrid({
        itemTemplate: ({ user }) => (
          <button onClick={() => handleEdit(user.id)}>Edit</button>
        )
      });
    `;

    const result = babel.transform(code, { plugins: [plugin] });

    expect(result.metadata.dataGridTemplates.itemTemplate.props.onClick).toMatchObject({
      type: 'EventHandler',
      method: 'handleEdit',
      args: ['user.id']
    });
  });

  test('extracts conditional rendering', () => {
    const code = `
      const grid = useDataGrid({
        itemTemplate: ({ user }) => (
          <div>
            {user.isAdmin && <span>Admin</span>}
          </div>
        )
      });
    `;

    const result = babel.transform(code, { plugins: [plugin] });

    expect(result.metadata.dataGridTemplates.itemTemplate.children[0]).toMatchObject({
      type: 'Conditional',
      condition: 'user.isAdmin',
      template: {
        type: 'Element',
        tag: 'span',
        children: [{ type: 'Text', value: 'Admin' }]
      }
    });
  });
});
```

---

## **Phase 2: Client-Side Hook**

### **Goal**
Create `useDataGrid` hook in `client-runtime` that registers templates with server and handles grid operations.

### **Files to Create**
- `src/client-runtime/src/use-datagrid.ts` (NEW)
- `src/client-runtime/src/grid-patcher.ts` (NEW)
- `src/client-runtime/src/index.ts` (EXPORT)

### **Implementation**

#### **2.1: useDataGrid Hook**

**File:** `src/client-runtime/src/use-datagrid.ts`

```typescript
import { useRef, useEffect, useCallback } from './hooks';
import { GridPatcher } from './grid-patcher';

/**
 * DataGrid configuration
 * Templates are converted to parameterized patches by Babel
 */
export interface DataGridConfig<T = any> {
  /** Static header JSX (rendered once) */
  header?: React.ReactNode;

  /** Item template (parameterized, rendered per row) */
  itemTemplate: (item: { [key: string]: T }) => React.ReactNode;

  /** Subitem template (nested, rendered per child) */
  subitemTemplate?: (subitem: any) => React.ReactNode;

  /** Footer JSX (can be static or data-bound) */
  footer?: React.ReactNode;

  /** Data source */
  data: T[];

  /** Key field for item identification (default: 'id') */
  keyField?: string;

  /** Grid ID (auto-generated if not provided) */
  gridId?: string;
}

/**
 * DataGrid instance returned by useDataGrid
 */
export interface DataGrid<T = any> {
  /** Render the grid */
  render: () => React.ReactNode;

  /** Current data */
  data: T[];

  /** Refresh entire grid from server */
  refresh: () => void;

  /** Update a single item */
  updateItem: (id: string | number, updates: Partial<T>) => void;

  /** Delete an item */
  deleteItem: (id: string | number) => void;

  /** Add a new item */
  addItem: (item: T) => void;

  /** Sort by field */
  sort: (field: keyof T, direction: 'asc' | 'desc') => void;

  /** Filter items */
  filter: (predicate: (item: T) => boolean) => void;
}

/**
 * useDataGrid - Server-side JSX templates with client-side surgical patching
 *
 * @example
 * const grid = useDataGrid({
 *   itemTemplate: ({ user }) => (
 *     <div className="user-row">
 *       <span>{user.name}</span>
 *       <button onClick={() => handleEdit(user.id)}>Edit</button>
 *     </div>
 *   ),
 *   data: users
 * });
 *
 * return grid.render();
 */
export function useDataGrid<T extends Record<string, any>>(
  config: DataGridConfig<T>
): DataGrid<T> {

  if (!currentContext) {
    throw new Error('useDataGrid must be called within a component render');
  }

  const context = currentContext;
  const gridId = useRef(config.gridId || `grid-${Math.random().toString(36).slice(2, 11)}`);
  const gridPatcher = useRef<GridPatcher | null>(null);

  // Initialize grid patcher
  useEffect(() => {
    const container = document.querySelector(`[data-grid-id="${gridId.current}"]`);
    if (container instanceof HTMLElement) {
      gridPatcher.current = new GridPatcher(container, gridId.current);
    }
  }, []);

  // Register grid with server on mount
  useEffect(() => {
    // Templates are already extracted by Babel and stored as C# attributes
    // We just need to tell the server this grid instance exists
    context.signalR.invoke('RegisterDataGridInstance', {
      componentId: context.componentId,
      gridId: gridId.current,
      keyField: config.keyField || 'id'
    }).catch(err => {
      console.error('[useDataGrid] Failed to register grid:', err);
    });

    // Cleanup on unmount
    return () => {
      context.signalR.invoke('UnregisterDataGridInstance', {
        componentId: context.componentId,
        gridId: gridId.current
      }).catch(err => {
        console.error('[useDataGrid] Failed to unregister grid:', err);
      });
    };
  }, []);

  // Listen for grid patches from server
  useEffect(() => {
    const handlePatch = (patch: GridPatch) => {
      if (gridPatcher.current) {
        gridPatcher.current.applyPatch(patch);
      }
    };

    context.signalR.on(`GridPatch_${gridId.current}`, handlePatch);

    return () => {
      context.signalR.off(`GridPatch_${gridId.current}`, handlePatch);
    };
  }, []);

  // Grid operations
  const updateItem = useCallback((id: string | number, updates: Partial<T>) => {
    context.signalR.invoke('UpdateGridItem', {
      componentId: context.componentId,
      gridId: gridId.current,
      itemId: id,
      updates
    }).catch(err => {
      console.error('[useDataGrid] Failed to update item:', err);
    });
  }, []);

  const deleteItem = useCallback((id: string | number) => {
    context.signalR.invoke('DeleteGridItem', {
      componentId: context.componentId,
      gridId: gridId.current,
      itemId: id
    }).catch(err => {
      console.error('[useDataGrid] Failed to delete item:', err);
    });
  }, []);

  const addItem = useCallback((item: T) => {
    context.signalR.invoke('AddGridItem', {
      componentId: context.componentId,
      gridId: gridId.current,
      item
    }).catch(err => {
      console.error('[useDataGrid] Failed to add item:', err);
    });
  }, []);

  const refresh = useCallback(() => {
    context.signalR.invoke('RefreshGrid', {
      componentId: context.componentId,
      gridId: gridId.current
    }).catch(err => {
      console.error('[useDataGrid] Failed to refresh grid:', err);
    });
  }, []);

  const sort = useCallback((field: keyof T, direction: 'asc' | 'desc') => {
    context.signalR.invoke('SortGrid', {
      componentId: context.componentId,
      gridId: gridId.current,
      field: field.toString(),
      direction
    }).catch(err => {
      console.error('[useDataGrid] Failed to sort grid:', err);
    });
  }, []);

  const filter = useCallback((predicate: (item: T) => boolean) => {
    // Convert predicate to serializable filter expression
    // For now, just refresh with filter
    context.signalR.invoke('FilterGrid', {
      componentId: context.componentId,
      gridId: gridId.current,
      // TODO: Serialize predicate function
    }).catch(err => {
      console.error('[useDataGrid] Failed to filter grid:', err);
    });
  }, []);

  const render = useCallback(() => {
    // Server renders initial HTML with data-grid-id
    // Client applies patches
    return null; // Actual rendering handled by server
  }, []);

  return {
    render,
    data: config.data,
    refresh,
    updateItem,
    deleteItem,
    addItem,
    sort,
    filter
  };
}

/**
 * Grid patch types from server
 */
export interface GridPatch {
  type: 'insertRow' | 'updateRow' | 'deleteRow' | 'updateCell' | 'replaceGrid';
  gridId: string;
  rowIndex?: number;
  cellIndex?: number;
  html?: string;
  value?: any;
}
```

#### **2.2: Grid Patcher**

**File:** `src/client-runtime/src/grid-patcher.ts`

```typescript
import { GridPatch } from './use-datagrid';

/**
 * GridPatcher - Applies surgical patches to grid DOM
 *
 * Handles:
 * - Insert row at index
 * - Update row at index
 * - Delete row at index
 * - Update cell value
 * - Replace entire grid
 */
export class GridPatcher {
  constructor(
    private container: HTMLElement,
    private gridId: string
  ) {}

  /**
   * Apply a grid patch
   */
  applyPatch(patch: GridPatch): void {
    const startTime = performance.now();

    switch (patch.type) {
      case 'insertRow':
        this.insertRow(patch);
        break;
      case 'updateRow':
        this.updateRow(patch);
        break;
      case 'deleteRow':
        this.deleteRow(patch);
        break;
      case 'updateCell':
        this.updateCell(patch);
        break;
      case 'replaceGrid':
        this.replaceGrid(patch);
        break;
      default:
        console.warn('[GridPatcher] Unknown patch type:', patch.type);
    }

    const latency = performance.now() - startTime;
    console.log(`[GridPatcher] Applied ${patch.type} patch in ${latency.toFixed(2)}ms`);
  }

  /**
   * Insert a new row at specified index
   */
  private insertRow(patch: GridPatch): void {
    if (patch.rowIndex === undefined || !patch.html) {
      console.error('[GridPatcher] insertRow missing rowIndex or html');
      return;
    }

    const tbody = this.getGridBody();
    if (!tbody) return;

    const rows = Array.from(tbody.children);

    // Create new row element
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = patch.html;
    const newRow = tempDiv.firstElementChild;

    if (!newRow) {
      console.error('[GridPatcher] Failed to create row from html');
      return;
    }

    // Insert at index
    if (patch.rowIndex >= rows.length) {
      tbody.appendChild(newRow);
    } else {
      tbody.insertBefore(newRow, rows[patch.rowIndex]);
    }

    // Animate row insertion
    this.animateRowInsert(newRow as HTMLElement);
  }

  /**
   * Update existing row at index
   */
  private updateRow(patch: GridPatch): void {
    if (patch.rowIndex === undefined || !patch.html) {
      console.error('[GridPatcher] updateRow missing rowIndex or html');
      return;
    }

    const tbody = this.getGridBody();
    if (!tbody) return;

    const row = tbody.children[patch.rowIndex];
    if (!row) {
      console.error('[GridPatcher] Row not found at index:', patch.rowIndex);
      return;
    }

    // Create new row element
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = patch.html;
    const newRow = tempDiv.firstElementChild;

    if (!newRow) {
      console.error('[GridPatcher] Failed to create row from html');
      return;
    }

    // Replace row
    tbody.replaceChild(newRow, row);

    // Animate row update
    this.animateRowUpdate(newRow as HTMLElement);
  }

  /**
   * Delete row at index
   */
  private deleteRow(patch: GridPatch): void {
    if (patch.rowIndex === undefined) {
      console.error('[GridPatcher] deleteRow missing rowIndex');
      return;
    }

    const tbody = this.getGridBody();
    if (!tbody) return;

    const row = tbody.children[patch.rowIndex];
    if (!row) {
      console.error('[GridPatcher] Row not found at index:', patch.rowIndex);
      return;
    }

    // Animate row deletion
    this.animateRowDelete(row as HTMLElement, () => {
      tbody.removeChild(row);
    });
  }

  /**
   * Update single cell value
   */
  private updateCell(patch: GridPatch): void {
    if (patch.rowIndex === undefined || patch.cellIndex === undefined || patch.value === undefined) {
      console.error('[GridPatcher] updateCell missing rowIndex, cellIndex, or value');
      return;
    }

    const tbody = this.getGridBody();
    if (!tbody) return;

    const row = tbody.children[patch.rowIndex];
    if (!row) {
      console.error('[GridPatcher] Row not found at index:', patch.rowIndex);
      return;
    }

    const cell = row.children[patch.cellIndex];
    if (!cell) {
      console.error('[GridPatcher] Cell not found at index:', patch.cellIndex);
      return;
    }

    // Update cell content
    const oldValue = cell.textContent;
    cell.textContent = patch.value;

    // Animate cell update
    if (oldValue !== patch.value) {
      this.animateCellUpdate(cell as HTMLElement);
    }
  }

  /**
   * Replace entire grid
   */
  private replaceGrid(patch: GridPatch): void {
    if (!patch.html) {
      console.error('[GridPatcher] replaceGrid missing html');
      return;
    }

    this.container.innerHTML = patch.html;
  }

  /**
   * Get grid body element (usually <div> containing rows)
   */
  private getGridBody(): Element | null {
    // Assume grid structure: <div data-grid-id="..."><div class="grid-body">rows...</div></div>
    const body = this.container.querySelector('.grid-body') || this.container;
    return body;
  }

  /**
   * Animate row insertion
   */
  private animateRowInsert(row: HTMLElement): void {
    row.style.opacity = '0';
    row.style.transform = 'translateY(-10px)';

    requestAnimationFrame(() => {
      row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      row.style.opacity = '1';
      row.style.transform = 'translateY(0)';
    });
  }

  /**
   * Animate row update
   */
  private animateRowUpdate(row: HTMLElement): void {
    row.style.backgroundColor = '#fffacd'; // Light yellow flash

    setTimeout(() => {
      row.style.transition = 'background-color 0.5s ease';
      row.style.backgroundColor = '';
    }, 100);
  }

  /**
   * Animate row deletion
   */
  private animateRowDelete(row: HTMLElement, callback: () => void): void {
    row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    row.style.opacity = '0';
    row.style.transform = 'translateX(-20px)';

    setTimeout(callback, 300);
  }

  /**
   * Animate cell update
   */
  private animateCellUpdate(cell: HTMLElement): void {
    cell.style.backgroundColor = '#90ee90'; // Light green flash

    setTimeout(() => {
      cell.style.transition = 'background-color 0.5s ease';
      cell.style.backgroundColor = '';
    }, 100);
  }
}
```

#### **2.3: Export from Index**

**File:** `src/client-runtime/src/index.ts`

```typescript
export { useDataGrid } from './use-datagrid';
export type { DataGridConfig, DataGrid, GridPatch } from './use-datagrid';
export { GridPatcher } from './grid-patcher';
```

---

## **Phase 3: Server-Side Templates**

### **Goal**
Create C# template classes and renderer that execute parameterized templates with data binding.

### **Files to Create**
- `src/Minimact.AspNetCore/Templates/ITemplate.cs` (NEW)
- `src/Minimact.AspNetCore/Templates/ElementTemplate.cs` (NEW)
- `src/Minimact.AspNetCore/Templates/LoopTemplate.cs` (NEW)
- `src/Minimact.AspNetCore/Templates/BindingTemplate.cs` (NEW)
- `src/Minimact.AspNetCore/Templates/TemplateRenderer.cs` (NEW)
- `src/Minimact.AspNetCore/DataGrid/DataGridDefinition.cs` (NEW)
- `src/Minimact.AspNetCore/DataGrid/DataGridManager.cs` (NEW)
- `src/Minimact.AspNetCore/Attributes/LoopTemplateAttribute.cs` (NEW)

### **Implementation**

#### **3.1: Template Interfaces**

**File:** `src/Minimact.AspNetCore/Templates/ITemplate.cs`

```csharp
namespace Minimact.AspNetCore.Templates;

/// <summary>
/// Base interface for all template types
/// </summary>
public interface ITemplate
{
    string Type { get; }
}

/// <summary>
/// Element template (div, span, button, etc.)
/// </summary>
public class ElementTemplate : ITemplate
{
    public string Type => "Element";
    public string Tag { get; set; } = "div";
    public Dictionary<string, IProp> Props { get; set; } = new();
    public List<ITemplate> Children { get; set; } = new();
}

/// <summary>
/// Text template (plain text node)
/// </summary>
public class TextTemplate : ITemplate
{
    public string Type => "Text";
    public string Value { get; set; } = "";
}

/// <summary>
/// Binding template (dynamic value from data)
/// </summary>
public class BindingTemplate : ITemplate
{
    public string Type => "Binding";
    public string Path { get; set; } = "";
}

/// <summary>
/// Computed binding (method call: user.Role.ToLower())
/// </summary>
public class ComputedBindingTemplate : ITemplate
{
    public string Type => "ComputedBinding";
    public string Expression { get; set; } = "";
}

/// <summary>
/// Template string (with slot filling: "badge-{0}")
/// </summary>
public class TemplateStringTemplate : ITemplate
{
    public string Type => "TemplateString";
    public string Template { get; set; } = "";
    public List<string> Bindings { get; set; } = new();
}

/// <summary>
/// Conditional template (if condition, render template)
/// </summary>
public class ConditionalTemplate : ITemplate
{
    public string Type => "Conditional";
    public string Condition { get; set; } = "";
    public ITemplate? Template { get; set; }
}

/// <summary>
/// Ternary template (condition ? trueTemplate : falseTemplate)
/// </summary>
public class TernaryTemplate : ITemplate
{
    public string Type => "Ternary";
    public string Condition { get; set; } = "";
    public ITemplate? TrueTemplate { get; set; }
    public ITemplate? FalseTemplate { get; set; }
}

/// <summary>
/// Loop template (render template for each item in collection)
/// </summary>
public class LoopTemplate : ITemplate
{
    public string Type => "Loop";
    public string StateKey { get; set; } = "";
    public ITemplate? Template { get; set; }
}

/// <summary>
/// Base interface for prop values
/// </summary>
public interface IProp
{
    string Type { get; }
}

/// <summary>
/// Static prop (string literal)
/// </summary>
public class StaticProp : IProp
{
    public string Type => "Static";
    public string Value { get; set; } = "";
}

/// <summary>
/// Binding prop (dynamic value from data)
/// </summary>
public class BindingProp : IProp
{
    public string Type => "Binding";
    public string Path { get; set; } = "";
}

/// <summary>
/// Template string prop (with slot filling)
/// </summary>
public class TemplateStringProp : IProp
{
    public string Type => "TemplateString";
    public string Template { get; set; } = "";
    public List<string> Bindings { get; set; } = new();
}

/// <summary>
/// Event handler prop (onClick, onChange, etc.)
/// </summary>
public class EventHandlerProp : IProp
{
    public string Type => "EventHandler";
    public string Method { get; set; } = "";
    public List<string> Args { get; set; } = new();
}
```

#### **3.2: Template Renderer**

**File:** `src/Minimact.AspNetCore/Templates/TemplateRenderer.cs`

```csharp
using System.Collections;
using System.Reflection;
using System.Text;

namespace Minimact.AspNetCore.Templates;

/// <summary>
/// Renders templates with data binding
/// </summary>
public class TemplateRenderer
{
    /// <summary>
    /// Render a template with data
    /// </summary>
    public string RenderTemplate(ITemplate template, object? data)
    {
        return template switch
        {
            ElementTemplate el => RenderElement(el, data),
            TextTemplate txt => txt.Value,
            BindingTemplate binding => ResolveBinding(binding.Path, data)?.ToString() ?? "",
            ComputedBindingTemplate computed => EvaluateComputedBinding(computed.Expression, data)?.ToString() ?? "",
            TemplateStringTemplate templateStr => RenderTemplateString(templateStr, data),
            ConditionalTemplate cond => RenderConditional(cond, data),
            TernaryTemplate ternary => RenderTernary(ternary, data),
            LoopTemplate loop => RenderLoop(loop, data),
            _ => ""
        };
    }

    /// <summary>
    /// Render an element template
    /// </summary>
    private string RenderElement(ElementTemplate template, object? data)
    {
        var sb = new StringBuilder();

        sb.Append($"<{template.Tag}");

        // Render props
        foreach (var (key, prop) in template.Props)
        {
            var value = RenderProp(prop, data);

            if (value != null)
            {
                var attrName = ConvertPropName(key);

                // Skip event handlers (handled by client)
                if (prop is EventHandlerProp)
                {
                    var eventHandler = prop as EventHandlerProp;
                    sb.Append($" {attrName}=\"{eventHandler!.Method}\"");
                    // Store args in data attribute for client
                    if (eventHandler.Args.Any())
                    {
                        var argsJson = System.Text.Json.JsonSerializer.Serialize(eventHandler.Args);
                        sb.Append($" data-{attrName}-args='{argsJson}'");
                    }
                }
                else
                {
                    sb.Append($" {attrName}=\"{EscapeHtml(value)}\"");
                }
            }
        }

        sb.Append(">");

        // Render children
        foreach (var child in template.Children)
        {
            sb.Append(RenderTemplate(child, data));
        }

        sb.Append($"</{template.Tag}>");

        return sb.ToString();
    }

    /// <summary>
    /// Render a prop
    /// </summary>
    private string? RenderProp(IProp prop, object? data)
    {
        return prop switch
        {
            StaticProp s => s.Value,
            BindingProp b => ResolveBinding(b.Path, data)?.ToString(),
            TemplateStringProp t => RenderTemplateString(t, data),
            EventHandlerProp e => null, // Handled separately
            _ => null
        };
    }

    /// <summary>
    /// Render a template string with slot filling
    /// </summary>
    private string RenderTemplateString(TemplateStringTemplate template, object? data)
    {
        var values = template.Bindings
            .Select(b => ResolveBinding(b, data))
            .ToArray();

        return string.Format(template.Template, values);
    }

    /// <summary>
    /// Render a template string prop
    /// </summary>
    private string RenderTemplateString(TemplateStringProp prop, object? data)
    {
        var values = prop.Bindings
            .Select(b => ResolveBinding(b, data))
            .ToArray();

        return string.Format(prop.Template, values);
    }

    /// <summary>
    /// Render a loop template
    /// </summary>
    private string RenderLoop(LoopTemplate template, object? data)
    {
        var collection = ResolveBinding(template.StateKey, data) as IEnumerable;
        if (collection == null) return "";

        var sb = new StringBuilder();

        foreach (var item in collection)
        {
            sb.Append(RenderTemplate(template.Template!, item));
        }

        return sb.ToString();
    }

    /// <summary>
    /// Render a conditional template
    /// </summary>
    private string RenderConditional(ConditionalTemplate template, object? data)
    {
        var condition = EvaluateCondition(template.Condition, data);

        return condition && template.Template != null
            ? RenderTemplate(template.Template, data)
            : "";
    }

    /// <summary>
    /// Render a ternary template
    /// </summary>
    private string RenderTernary(TernaryTemplate template, object? data)
    {
        var condition = EvaluateCondition(template.Condition, data);

        var chosenTemplate = condition ? template.TrueTemplate : template.FalseTemplate;

        return chosenTemplate != null
            ? RenderTemplate(chosenTemplate, data)
            : "";
    }

    /// <summary>
    /// Resolve a binding path (user.name, user.profile.email)
    /// </summary>
    private object? ResolveBinding(string path, object? data)
    {
        if (data == null) return null;

        var parts = path.Split('.');
        object? current = data;

        foreach (var part in parts)
        {
            if (current == null) return null;

            // Handle method calls like "ToLower()"
            if (part.EndsWith("()"))
            {
                var methodName = part.TrimEnd('(', ')');
                var method = current.GetType().GetMethod(methodName, BindingFlags.Public | BindingFlags.Instance);

                if (method == null)
                {
                    Console.WriteLine($"[TemplateRenderer] Method not found: {methodName} on {current.GetType().Name}");
                    return null;
                }

                current = method.Invoke(current, null);
            }
            else
            {
                // Property access
                var prop = current.GetType().GetProperty(part, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);

                if (prop == null)
                {
                    Console.WriteLine($"[TemplateRenderer] Property not found: {part} on {current.GetType().Name}");
                    return null;
                }

                current = prop.GetValue(current);
            }
        }

        return current;
    }

    /// <summary>
    /// Evaluate a computed binding expression
    /// </summary>
    private object? EvaluateComputedBinding(string expression, object? data)
    {
        // For now, just resolve as binding path
        // TODO: Support complex expressions
        return ResolveBinding(expression, data);
    }

    /// <summary>
    /// Evaluate a condition
    /// </summary>
    private bool EvaluateCondition(string condition, object? data)
    {
        var value = ResolveBinding(condition, data);

        if (value == null) return false;
        if (value is bool b) return b;
        if (value is string s) return !string.IsNullOrEmpty(s);
        if (value is int i) return i != 0;

        return true;
    }

    /// <summary>
    /// Convert JSX prop name to HTML attribute name
    /// </summary>
    private string ConvertPropName(string jsxProp)
    {
        return jsxProp switch
        {
            "className" => "class",
            "htmlFor" => "for",
            _ => jsxProp.ToLower()
        };
    }

    /// <summary>
    /// Escape HTML special characters
    /// </summary>
    private string EscapeHtml(string? text)
    {
        if (string.IsNullOrEmpty(text)) return "";

        return text
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&#39;");
    }
}
```

#### **3.3: DataGrid Definition**

**File:** `src/Minimact.AspNetCore/DataGrid/DataGridDefinition.cs`

```csharp
using Minimact.AspNetCore.Templates;

namespace Minimact.AspNetCore.DataGrid;

/// <summary>
/// DataGrid definition with templates
/// </summary>
public class DataGridDefinition
{
    public string GridId { get; set; } = "";
    public string KeyField { get; set; } = "id";

    public ITemplate? HeaderTemplate { get; set; }
    public ITemplate? ItemTemplate { get; set; }
    public ITemplate? SubitemTemplate { get; set; }
    public ITemplate? FooterTemplate { get; set; }

    public List<object> Data { get; set; } = new();
}
```

#### **3.4: DataGrid Manager**

**File:** `src/Minimact.AspNetCore/DataGrid/DataGridManager.cs`

```csharp
using Minimact.AspNetCore.Templates;
using System.Text;

namespace Minimact.AspNetCore.DataGrid;

/// <summary>
/// Manages DataGrid instances and operations
/// </summary>
public class DataGridManager
{
    private readonly TemplateRenderer _renderer = new();
    private readonly Dictionary<string, DataGridDefinition> _grids = new();

    /// <summary>
    /// Register a DataGrid instance
    /// </summary>
    public void RegisterGrid(string componentId, DataGridDefinition grid)
    {
        var key = $"{componentId}_{grid.GridId}";
        _grids[key] = grid;
    }

    /// <summary>
    /// Get a DataGrid instance
    /// </summary>
    public DataGridDefinition? GetGrid(string componentId, string gridId)
    {
        var key = $"{componentId}_{gridId}";
        return _grids.TryGetValue(key, out var grid) ? grid : null;
    }

    /// <summary>
    /// Render entire grid to HTML
    /// </summary>
    public string RenderGrid(DataGridDefinition grid)
    {
        var sb = new StringBuilder();

        sb.Append($"<div data-grid-id=\"{grid.GridId}\" class=\"minimact-datagrid\">");

        // Render header
        if (grid.HeaderTemplate != null)
        {
            sb.Append("<div class=\"grid-header\">");
            sb.Append(_renderer.RenderTemplate(grid.HeaderTemplate, null));
            sb.Append("</div>");
        }

        // Render body (items)
        sb.Append("<div class=\"grid-body\">");

        if (grid.ItemTemplate != null)
        {
            foreach (var item in grid.Data)
            {
                sb.Append(_renderer.RenderTemplate(grid.ItemTemplate, item));
            }
        }

        sb.Append("</div>");

        // Render footer
        if (grid.FooterTemplate != null)
        {
            sb.Append("<div class=\"grid-footer\">");
            sb.Append(_renderer.RenderTemplate(grid.FooterTemplate, new { grid }));
            sb.Append("</div>");
        }

        sb.Append("</div>");

        return sb.ToString();
    }

    /// <summary>
    /// Render a single row
    /// </summary>
    public string RenderRow(DataGridDefinition grid, object item)
    {
        if (grid.ItemTemplate == null)
            return "";

        return _renderer.RenderTemplate(grid.ItemTemplate, item);
    }

    /// <summary>
    /// Update an item in the grid
    /// </summary>
    public int UpdateItem(DataGridDefinition grid, object itemId, Dictionary<string, object> updates)
    {
        var index = FindItemIndex(grid, itemId);
        if (index == -1) return -1;

        var item = grid.Data[index];

        // Apply updates to item
        foreach (var (key, value) in updates)
        {
            var prop = item.GetType().GetProperty(key, System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.IgnoreCase);
            prop?.SetValue(item, value);
        }

        return index;
    }

    /// <summary>
    /// Delete an item from the grid
    /// </summary>
    public int DeleteItem(DataGridDefinition grid, object itemId)
    {
        var index = FindItemIndex(grid, itemId);
        if (index == -1) return -1;

        grid.Data.RemoveAt(index);
        return index;
    }

    /// <summary>
    /// Add an item to the grid
    /// </summary>
    public int AddItem(DataGridDefinition grid, object item)
    {
        grid.Data.Add(item);
        return grid.Data.Count - 1;
    }

    /// <summary>
    /// Find item index by ID
    /// </summary>
    private int FindItemIndex(DataGridDefinition grid, object itemId)
    {
        for (int i = 0; i < grid.Data.Count; i++)
        {
            var item = grid.Data[i];
            var idProp = item.GetType().GetProperty(grid.KeyField, System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.IgnoreCase);

            if (idProp != null)
            {
                var idValue = idProp.GetValue(item);
                if (idValue?.ToString() == itemId.ToString())
                {
                    return i;
                }
            }
        }

        return -1;
    }
}
```

#### **3.5: LoopTemplate Attribute**

**File:** `src/Minimact.AspNetCore/Attributes/LoopTemplateAttribute.cs`

```csharp
namespace Minimact.AspNetCore.Attributes;

/// <summary>
/// Attribute for storing loop template metadata
/// Emitted by Babel plugin from useDataGrid calls
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = true)]
public class LoopTemplateAttribute : Attribute
{
    public string TemplateName { get; set; }
    public string TemplateJson { get; set; }

    public LoopTemplateAttribute(string templateName, string templateJson)
    {
        TemplateName = templateName;
        TemplateJson = templateJson;
    }
}
```

---

## **Phase 4: SignalR Hub Integration**

### **Goal**
Add DataGrid operations to `MinimactHub` for handling client grid updates.

### **Files to Modify**
- `src/Minimact.AspNetCore/SignalR/MinimactHub.cs` (ADD METHODS)

### **Implementation**

**File:** `src/Minimact.AspNetCore/SignalR/MinimactHub.cs`

```csharp
// Add to MinimactHub.cs

private readonly DataGridManager _dataGridManager;

// Constructor: inject DataGridManager
public MinimactHub(
    ComponentRegistry registry,
    // ... existing params ...
    DataGridManager dataGridManager)
{
    // ... existing assignments ...
    _dataGridManager = dataGridManager;
}

/// <summary>
/// Register a DataGrid instance
/// </summary>
public async Task RegisterDataGridInstance(string componentId, string gridId, string keyField)
{
    var component = _registry.GetComponent(componentId);
    if (component == null)
    {
        await Clients.Caller.SendAsync("Error", $"Component {componentId} not found");
        return;
    }

    // Read [LoopTemplate] attributes from component class
    var templates = component.GetType()
        .GetCustomAttributes(typeof(LoopTemplateAttribute), false)
        .Cast<LoopTemplateAttribute>()
        .ToList();

    if (!templates.Any())
    {
        await Clients.Caller.SendAsync("Error", $"No templates found for grid {gridId}");
        return;
    }

    // Parse templates and create DataGridDefinition
    var gridDef = new DataGridDefinition
    {
        GridId = gridId,
        KeyField = keyField
    };

    foreach (var attr in templates)
    {
        var template = System.Text.Json.JsonSerializer.Deserialize<ITemplate>(attr.TemplateJson);

        if (attr.TemplateName == "itemTemplate")
        {
            gridDef.ItemTemplate = template;
        }
        else if (attr.TemplateName == "headerTemplate")
        {
            gridDef.HeaderTemplate = template;
        }
        // ... other templates
    }

    _dataGridManager.RegisterGrid(componentId, gridDef);

    await Task.CompletedTask;
}

/// <summary>
/// Unregister a DataGrid instance
/// </summary>
public async Task UnregisterDataGridInstance(string componentId, string gridId)
{
    // Cleanup if needed
    await Task.CompletedTask;
}

/// <summary>
/// Update a grid item
/// </summary>
public async Task UpdateGridItem(string componentId, string gridId, object itemId, Dictionary<string, object> updates)
{
    var grid = _dataGridManager.GetGrid(componentId, gridId);
    if (grid == null)
    {
        await Clients.Caller.SendAsync("Error", $"Grid {gridId} not found");
        return;
    }

    // Update item
    var rowIndex = _dataGridManager.UpdateItem(grid, itemId, updates);

    if (rowIndex == -1)
    {
        await Clients.Caller.SendAsync("Error", $"Item {itemId} not found in grid");
        return;
    }

    // Render updated row
    var item = grid.Data[rowIndex];
    var rowHtml = _dataGridManager.RenderRow(grid, item);

    // Send patch to client
    await Clients.Client(Context.ConnectionId).SendAsync($"GridPatch_{gridId}", new
    {
        type = "updateRow",
        gridId,
        rowIndex,
        html = rowHtml
    });
}

/// <summary>
/// Delete a grid item
/// </summary>
public async Task DeleteGridItem(string componentId, string gridId, object itemId)
{
    var grid = _dataGridManager.GetGrid(componentId, gridId);
    if (grid == null)
    {
        await Clients.Caller.SendAsync("Error", $"Grid {gridId} not found");
        return;
    }

    // Delete item
    var rowIndex = _dataGridManager.DeleteItem(grid, itemId);

    if (rowIndex == -1)
    {
        await Clients.Caller.SendAsync("Error", $"Item {itemId} not found in grid");
        return;
    }

    // Send patch to client
    await Clients.Client(Context.ConnectionId).SendAsync($"GridPatch_{gridId}", new
    {
        type = "deleteRow",
        gridId,
        rowIndex
    });
}

/// <summary>
/// Add a grid item
/// </summary>
public async Task AddGridItem(string componentId, string gridId, object item)
{
    var grid = _dataGridManager.GetGrid(componentId, gridId);
    if (grid == null)
    {
        await Clients.Caller.SendAsync("Error", $"Grid {gridId} not found");
        return;
    }

    // Add item
    var rowIndex = _dataGridManager.AddItem(grid, item);

    // Render new row
    var rowHtml = _dataGridManager.RenderRow(grid, item);

    // Send patch to client
    await Clients.Client(Context.ConnectionId).SendAsync($"GridPatch_{gridId}", new
    {
        type = "insertRow",
        gridId,
        rowIndex,
        html = rowHtml
    });
}

/// <summary>
/// Refresh entire grid
/// </summary>
public async Task RefreshGrid(string componentId, string gridId)
{
    var grid = _dataGridManager.GetGrid(componentId, gridId);
    if (grid == null)
    {
        await Clients.Caller.SendAsync("Error", $"Grid {gridId} not found");
        return;
    }

    // Render entire grid
    var gridHtml = _dataGridManager.RenderGrid(grid);

    // Send patch to client
    await Clients.Client(Context.ConnectionId).SendAsync($"GridPatch_{gridId}", new
    {
        type = "replaceGrid",
        gridId,
        html = gridHtml
    });
}

/// <summary>
/// Sort grid
/// </summary>
public async Task SortGrid(string componentId, string gridId, string field, string direction)
{
    var grid = _dataGridManager.GetGrid(componentId, gridId);
    if (grid == null)
    {
        await Clients.Caller.SendAsync("Error", $"Grid {gridId} not found");
        return;
    }

    // Sort data
    var ascending = direction == "asc";

    grid.Data = grid.Data
        .OrderBy(item =>
        {
            var prop = item.GetType().GetProperty(field, System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.IgnoreCase);
            return prop?.GetValue(item);
        })
        .ToList();

    if (!ascending)
    {
        grid.Data.Reverse();
    }

    // Refresh grid
    await RefreshGrid(componentId, gridId);
}
```

---

## **Phase 5: MinimactComponent Integration**

### **Goal**
Add `RenderDataGrid` method to `MinimactComponent` for rendering grids in component `Render()` method.

### **Files to Modify**
- `src/Minimact.AspNetCore/Core/MinimactComponent.cs` (ADD METHOD)

### **Implementation**

**File:** `src/Minimact.AspNetCore/Core/MinimactComponent.cs`

```csharp
// Add to MinimactComponent.cs

private readonly DataGridManager _dataGridManager;

// Constructor: inject DataGridManager
protected MinimactComponent(DataGridManager dataGridManager)
{
    // ... existing initialization ...
    _dataGridManager = dataGridManager;
}

/// <summary>
/// Render a DataGrid with templates
/// </summary>
/// <param name="gridId">Grid identifier</param>
/// <param name="data">Grid data</param>
/// <param name="keyField">Key field for item identification (default: "id")</param>
/// <returns>VNode containing rendered grid HTML</returns>
protected VNode RenderDataGrid(string gridId, object data, string keyField = "id")
{
    // Get templates from [LoopTemplate] attributes
    var templates = this.GetType()
        .GetCustomAttributes(typeof(LoopTemplateAttribute), false)
        .Cast<LoopTemplateAttribute>()
        .Where(t => t.TemplateName.Contains(gridId))
        .ToList();

    if (!templates.Any())
    {
        return VNode.Element("div", new Dictionary<string, object>
        {
            ["data-error"] = $"No templates found for grid {gridId}"
        });
    }

    // Create DataGridDefinition
    var gridDef = new DataGridDefinition
    {
        GridId = gridId,
        KeyField = keyField
    };

    // Parse templates
    foreach (var attr in templates)
    {
        var template = System.Text.Json.JsonSerializer.Deserialize<ITemplate>(attr.TemplateJson);

        if (attr.TemplateName.EndsWith("_itemTemplate"))
        {
            gridDef.ItemTemplate = template;
        }
        else if (attr.TemplateName.EndsWith("_headerTemplate"))
        {
            gridDef.HeaderTemplate = template;
        }
        else if (attr.TemplateName.EndsWith("_subitemTemplate"))
        {
            gridDef.SubitemTemplate = template;
        }
        else if (attr.TemplateName.EndsWith("_footerTemplate"))
        {
            gridDef.FooterTemplate = template;
        }
    }

    // Convert data to list
    if (data is IEnumerable<object> enumerable)
    {
        gridDef.Data = enumerable.ToList();
    }
    else if (data is IEnumerable)
    {
        gridDef.Data = ((IEnumerable)data).Cast<object>().ToList();
    }

    // Register grid
    _dataGridManager.RegisterGrid(ComponentId, gridDef);

    // Render grid to HTML
    var html = _dataGridManager.RenderGrid(gridDef);

    // Return as raw HTML VNode
    return VNode.RawHtml(html);
}
```

---

## **Phase 6: Swig Integration**

### **Goal**
Add `useDataGrid` to Swig's hook library for project scaffolding.

### **Files to Modify**
- `src/minimact-swig-electron/src/main/data/hook-library.ts` (ADD HOOK)

### **Implementation**

**File:** `src/minimact-swig-electron/src/main/data/hook-library.ts`

```typescript
{
  id: 'useDataGrid',
  name: 'useDataGrid',
  description: 'Server-side JSX templates with surgical client-side patching for data grids',
  category: 'advanced',
  imports: ["import { useDataGrid } from '@minimact/core';", "import { useState } from '@minimact/core';"],
  example: `interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin', active: true },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'User', active: true },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'User', active: false }
  ]);

  const grid = useDataGrid({
    header: (
      <div className="grid-header">
        <h2>User Management</h2>
        <button onClick={() => handleAddUser()}>Add User</button>
      </div>
    ),

    itemTemplate: ({ user }) => (
      <div className="user-row" data-id={user.id}>
        <span className="user-name">{user.name}</span>
        <span className="user-email">{user.email}</span>
        <span className={\`badge badge-\${user.role.toLowerCase()}\`}>
          {user.role}
        </span>
        <span className={user.active ? "status-active" : "status-inactive"}>
          {user.active ? "Active" : "Inactive"}
        </span>
        <div className="user-actions">
          <button onClick={() => handleEdit(user.id)}>Edit</button>
          <button onClick={() => handleDelete(user.id)}>Delete</button>
        </div>
      </div>
    ),

    footer: (
      <div className="grid-footer">
        <span>Total Users: {users.length}</span>
        <span>Active: {users.filter(u => u.active).length}</span>
      </div>
    ),

    data: users
  });

  const handleEdit = (userId: number) => {
    // Update user
    grid.updateItem(userId, { name: 'Updated Name' });
  };

  const handleDelete = (userId: number) => {
    // Delete user
    grid.deleteItem(userId);
  };

  const handleAddUser = () => {
    // Add new user
    grid.addItem({
      id: Date.now(),
      name: 'New User',
      email: 'new@example.com',
      role: 'User',
      active: true
    });
  };

  return (
    <div className="user-management">
      {grid.render()}
    </div>
  );
}

// 🎯 Features:
// ✅ JSX in arrow functions (Babel extracts at build time)
// ✅ Parameterized templates (bindings: user.name, user.role.toLowerCase())
// ✅ Server execution (fills slots with data)
// ✅ Surgical patching (update individual rows/cells)
// ✅ Event handlers (onClick with args)
// ✅ Template strings (\`badge-\${user.role}\`)
// ✅ Conditional rendering (ternary: user.active ? 'Yes' : 'No')`,
  isDefault: false,
  dependencies: ['useState']
}
```

---

## **Phase 7: Testing**

### **Goal**
Create comprehensive tests for all DataGrid components.

### **Test Files to Create**

1. **Babel Plugin Tests**: `src/babel-plugin-minimact/test/use-datagrid.test.js`
2. **Template Renderer Tests**: `src/Minimact.AspNetCore.Tests/Templates/TemplateRendererTests.cs`
3. **DataGrid Manager Tests**: `src/Minimact.AspNetCore.Tests/DataGrid/DataGridManagerTests.cs`
4. **Integration Tests**: `src/Minimact.AspNetCore.Tests/Integration/DataGridIntegrationTests.cs`
5. **Client Hook Tests**: `src/client-runtime/test/use-datagrid.test.ts`

### **Test Scenarios**

1. **Babel extraction**:
   - Simple binding: `{user.name}`
   - Template string: `` `badge-${user.role}` ``
   - Event handler: `onClick={() => handleEdit(user.id)}`
   - Conditional: `{user.isAdmin && <span>Admin</span>}`
   - Ternary: `{user.active ? 'Yes' : 'No'}`

2. **Template rendering**:
   - Element with props
   - Nested elements
   - Loops with data binding
   - Conditionals
   - Template strings with multiple slots

3. **DataGrid operations**:
   - Register grid
   - Render grid
   - Update item
   - Delete item
   - Add item
   - Sort grid

4. **Integration**:
   - Full flow: TSX → Babel → C# → SignalR → Client
   - Multiple grids in one component
   - Nested grids (with subitems)

---

## **Phase 8: Documentation**

### **Goal**
Create comprehensive documentation for developers.

### **Documentation to Create**

1. **User Guide**: `docs/DATAGRID_USER_GUIDE.md`
   - Getting started
   - Basic examples
   - Advanced patterns
   - API reference

2. **Architecture Doc**: `docs/DATAGRID_ARCHITECTURE.md`
   - How it works
   - Template extraction flow
   - Rendering pipeline
   - Patching system

3. **Migration Guide**: `docs/DATAGRID_MIGRATION.md`
   - From `.map()` to `useDataGrid`
   - Performance benefits
   - Breaking changes

---

## **Success Criteria**

- ✅ **Babel plugin extracts JSX from arrow functions**
- ✅ **Templates converted to parameterized patches**
- ✅ **Server executes templates with data binding**
- ✅ **Client receives surgical row/cell patches**
- ✅ **All grid operations work (add/update/delete)**
- ✅ **Performance: 100x faster than full re-render**
- ✅ **Developer experience: Write JSX once, runs on server**

---

## **Timeline**

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Babel Plugin | 1 week | None |
| Phase 2: Client Hook | 3 days | None |
| Phase 3: Server Templates | 1 week | None |
| Phase 4: SignalR Integration | 3 days | Phase 3 |
| Phase 5: Component Integration | 2 days | Phase 3, 4 |
| Phase 6: Swig Integration | 1 day | Phase 1, 2 |
| Phase 7: Testing | 1 week | All phases |
| Phase 8: Documentation | 3 days | All phases |

**Total:** ~4 weeks

---

## **Open Questions**

1. **Template Serialization**: Should we serialize templates to JSON or use binary format for performance?
2. **Caching**: Should rendered rows be cached on server or regenerated on each update?
3. **Pagination**: Should pagination be built-in or separate hook?
4. **Filtering**: Should client-side filtering be supported or always server-side?
5. **Virtualization**: Should we support virtual scrolling for large datasets?
6. **TypeScript Types**: How to maintain type safety for template data bindings?

---

## **Next Steps**

1. Review this implementation plan
2. Validate architecture with team
3. Create prototypes for Babel plugin and template renderer
4. Gather feedback from early testing
5. Proceed with full implementation

---

**This is the holy grail of server-side React.** 🚀

Write JSX once → Runs on server → Patches on client
