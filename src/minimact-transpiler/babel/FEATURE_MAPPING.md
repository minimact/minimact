# Feature Mapping: Test Cases → Old Plugin Code

**Purpose**: Map each feature in test-tsx files to the exact code sections in `babel-plugin-minimact` that handle it.

This document helps us:
1. Find the exact logic to port
2. Understand how features were implemented
3. Ensure we don't miss edge cases

---

## 📋 Test File 00: ProductDetailsPage.tsx

### Features & Mapping

#### 1. **Style Objects** (Lines 47, 51, 64, etc.)

**Example**:
```tsx
<div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '800px' }}>
<div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb' }}>
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/utils/styleConverter.cjs`
- **Lines**: 1-150 (entire file)
- **Key Functions**:
  - `convertStyleObjectToCSharp()` - Main converter
  - `convertCssPropertyName()` - camelCase → kebab-case
  - `convertCssValue()` - Handle units, colors

**Implementation Details**:
```javascript
// Lines 10-50
function convertStyleObjectToCSharp(properties) {
  const cssProperties = [];

  for (const [key, value] of Object.entries(properties)) {
    const cssKey = convertCssPropertyName(key);
    const cssValue = convertCssValue(value);
    cssProperties.push(`${cssKey}: ${cssValue}`);
  }

  return cssProperties.join('; ');
}
```

**Port Status**: ✅ `extractors/styles.js` exists - needs integration

---

#### 2. **Transform Methods** (Line 52, 188)

**Example**:
```tsx
${price.toFixed(2)}
${cartTotal.toFixed(2)}
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/extractors/templates.cjs`
- **Lines**: 56-100
- **Function**: `extractMethodCallBindingShared()`

**Implementation Details**:
```javascript
// Lines 56-100
function extractMethodCallBindingShared(expr) {
  const callee = expr.callee;

  if (!t.isMemberExpression(callee)) return null;

  const methodName = t.isIdentifier(callee.property) ? callee.property.name : null;
  if (!methodName) return null;

  // Whitelist of supported transform methods
  const transformMethods = [
    'toFixed', 'toString', 'toLowerCase', 'toUpperCase',
    'trim', 'trimStart', 'trimEnd'
  ];

  if (!transformMethods.includes(methodName)) return null;

  // Extract base binding
  let binding = null;
  if (t.isMemberExpression(callee.object)) {
    binding = buildMemberPathShared(callee.object);
  } else if (t.isIdentifier(callee.object)) {
    binding = callee.object.name;
  }

  // Extract arguments
  const args = expr.arguments.map(arg => {
    if (t.isNumericLiteral(arg)) return arg.value;
    if (t.isStringLiteral(arg)) return arg.value;
    return null;
  }).filter(v => v !== null);

  return {
    transform: methodName,
    binding: binding,
    args: args
  };
}
```

**Port Status**: ✅ Already in `legacy/sharedLogic.js` - needs wiring

---

#### 3. **Conditional Rendering** (Line 118)

**Example**:
```tsx
{isAdmin && (
  <div style={{...}}>
    <h3>Admin Controls</h3>
  </div>
)}
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/extractors/templates.cjs`
- **Lines**: 404-409
- **Context**: Logical AND traversal

**Implementation Details**:
```javascript
// Lines 404-409
if (t.isLogicalExpression(expr) && expr.operator === '&&') {
  // Logical AND: {isAdmin && <div>Admin Panel</div>}
  if (t.isJSXElement(expr.right)) {
    console.log(`[Template Extractor] Traversing conditional branch (&&)`);
    traverseJSX(expr.right, currentPath, childSiblingCounts);
  }
}
```

**Port Status**: ⚠️ Structure detected - needs conditional template extraction

---

#### 4. **Ternary in Text** (Line 163)

**Example**:
```tsx
{isExpanded ? 'Hide' : 'Show'} Details
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/extractors/templates.cjs`
- **Lines**: 486-510
- **Context**: Conditional binding in text template

**Implementation Details**:
```javascript
// Lines 486-510
if (binding && typeof binding === 'object' && binding.conditional) {
  // Conditional binding (ternary)
  slots.push(templateStr.length);
  templateStr += `{${paramIndex}}`;
  bindings.push(binding.conditional);

  // Store conditional template values
  conditionalTemplates = {
    true: binding.trueValue,
    false: binding.falseValue
  };
}
```

**Port Status**: ❌ Not implemented - needs conditional value extraction

---

#### 5. **Event Handlers** (Lines 66, 81, 154, 193)

**Example**:
```tsx
onClick={() => handleQuantityChange(-1)}
onClick={() => handleQuantityChange(1)}
onClick={() => setIsExpanded(!isExpanded)}
onClick={handleAddToCart}
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/extractors/eventHandlers.cjs`
- **Lines**: 1-200 (entire file)
- **Key Functions**:
  - `extractEventHandlers()` - Main extractor
  - `extractArrowFunctionHandler()` - Handle `() => func()`
  - `extractMethodReferenceHandler()` - Handle `onClick={method}`

**Implementation Details**:
```javascript
// Lines 15-50
function extractEventHandlers(attributes, component) {
  const handlers = [];

  for (const attr of attributes) {
    if (!t.isJSXAttribute(attr)) continue;

    const attrName = attr.name.name;

    // Check if event handler (starts with 'on' + uppercase)
    if (!attrName.startsWith('on') || attrName.length < 3) continue;
    if (attrName[2] !== attrName[2].toUpperCase()) continue;

    const value = attr.value;
    if (!t.isJSXExpressionContainer(value)) continue;

    const expr = value.expression;

    if (t.isArrowFunctionExpression(expr)) {
      handlers.push(extractArrowFunctionHandler(attrName, expr, component));
    } else if (t.isIdentifier(expr)) {
      handlers.push(extractMethodReference(attrName, expr.name));
    }
  }

  return handlers;
}

// Lines 55-80
function extractArrowFunctionHandler(eventName, arrowFunc, component) {
  const params = arrowFunc.params.map(p => p.name);

  // Check if body is single expression or block
  let bodyType = 'expression';
  let bodyContent = null;

  if (t.isBlockStatement(arrowFunc.body)) {
    bodyType = 'block';
    // Extract statements
  } else if (t.isCallExpression(arrowFunc.body)) {
    bodyType = 'call';
    bodyContent = extractCallExpression(arrowFunc.body);
  }

  return {
    eventName,
    type: 'arrow',
    params,
    bodyType,
    bodyContent
  };
}
```

**Port Status**: ❌ Not implemented - needs event handler system

---

#### 6. **Optional Chaining** (Line 55)

**Example**:
```tsx
{viewModel?.userEmail}
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/extractors/templates.cjs`
- **Lines**: 34-50 (buildMemberPathShared)
- **Note**: Handles OptionalMemberExpression

**Implementation Details**:
```javascript
// Handles both MemberExpression and OptionalMemberExpression
function buildMemberPathShared(expr) {
  const parts = [];
  let current = expr;

  while (t.isMemberExpression(current) || t.isOptionalMemberExpression(current)) {
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
```

**Port Status**: ✅ Already handled in `legacy/sharedLogic.js`

---

## 📋 Test File 01: ComplexTemplateLiterals.tsx

### Features & Mapping

#### 1. **Nested Template Literals** (Line 44)

**Example**:
```tsx
const summary = `Total: ${`$${(price * quantity).toFixed(2)}`}`;
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/extractors/templates.cjs`
- **Lines**: 223-271
- **Function**: `extractTemplateLiteralShared()`

**Implementation Details**:
```javascript
// Lines 223-271
function extractTemplateLiteralShared(node, component) {
  let templateStr = '';
  const bindings = [];
  const slots = [];

  for (let i = 0; i < node.quasis.length; i++) {
    const quasi = node.quasis[i];
    templateStr += quasi.value.raw;

    if (i < node.expressions.length) {
      const expr = node.expressions[i];
      slots.push(templateStr.length);
      templateStr += `{${i}}`;

      // IMPORTANT: Recursively handle nested templates
      if (t.isTemplateLiteral(expr)) {
        const nested = extractTemplateLiteralShared(expr, component);
        // Merge nested template into parent
      }

      const binding = extractBindingShared(expr, component);
      bindings.push(binding);
    }
  }

  return { template: templateStr, bindings, slots };
}
```

**Port Status**: ⚠️ Partial - `extractors/templates.js` exists but needs nested handling

---

#### 2. **Method Chaining** (Line 47)

**Example**:
```tsx
`Product: ${product.name.toUpperCase()} at $${product.price.toFixed(2)}`
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/extractors/templates.cjs`
- **Lines**: 56-100
- **Context**: Transform method on member expression

**Implementation Details**:
```javascript
// Handles: product.price.toFixed(2)
if (t.isMemberExpression(callee.object)) {
  binding = buildMemberPathShared(callee.object);
  // Result: "product.price"
}
```

**Port Status**: ✅ Supported by `extractMethodCallBindingShared()`

---

#### 3. **Complex Binary Expressions** (Lines 29, 32, 35)

**Example**:
```tsx
`$${(price * quantity).toFixed(2)}`
`After ${(discount * 100).toFixed(0)}% off: $${((price * quantity) * (1 - discount)).toFixed(2)}`
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/extractors/templates.cjs`
- **Lines**: 18-29, 80-84
- **Functions**: `extractIdentifiersShared()`, special handling in `extractMethodCallBindingShared()`

**Implementation Details**:
```javascript
// Lines 80-84 - Binary expression as base of transform
else if (t.isBinaryExpression(callee.object)) {
  // Expression like (discount * 100).toFixed(0)
  const identifiers = [];
  extractIdentifiersShared(callee.object, identifiers);
  binding = `__expr__:${identifiers.join(',')}`;
}
```

**Port Status**: ⚠️ Identifiers extracted but not full expression metadata

---

## 📋 Test File 02: NestedMapCalls.tsx

### Features & Mapping

#### 1. **Double Nested .map()** (Lines 81-90)

**Example**:
```tsx
{categories.map(category => (
  <div key={category.id}>
    <h4>{category.name}</h4>
    <ul>
      {category.items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  </div>
))}
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/extractors/loopTemplates.cjs`
- **Lines**: 1-250 (entire file handles nested loops)
- **Key Function**: `extractLoopTemplates()`

**Implementation Details**:
```javascript
// Lines 50-120
function extractLoopTemplates(renderBody, component) {
  const loops = [];

  function traverseForLoops(node, parentPath = [], loopContext = []) {
    // loopContext tracks: [{ itemVar: 'category', arrayBinding: 'categories' }, ...]

    if (t.isCallExpression(node) && isMapCall(node)) {
      const arrayBinding = buildMemberPath(node.callee.object);
      const arrowFunc = node.arguments[0];

      const itemVar = arrowFunc.params[0]?.name;
      const indexVar = arrowFunc.params[1]?.name;

      // Add to loop context for nested loops
      const newContext = [...loopContext, { itemVar, arrayBinding }];

      // Recursively process loop body
      const body = traverseJSXInLoop(arrowFunc.body, parentPath, newContext);

      loops.push({
        path: parentPath,
        arrayBinding,
        itemVar,
        indexVar,
        body
      });
    }

    // Continue traversing for nested loops
    traverseChildren(node, loopContext);
  }

  return loops;
}
```

**Port Status**: ⚠️ Single level works - needs recursive context tracking

---

#### 2. **Loop with Index** (Lines 119-130)

**Example**:
```tsx
{categories.map((category, catIndex) => (
  <div key={category.id}>
    <h4>{catIndex + 1}. {category.name}</h4>
    <ul>
      {category.items.map((item, itemIndex) => (
        <li key={item.id}>
          {catIndex + 1}.{itemIndex + 1} - {item.name}
        </li>
      ))}
    </ul>
  </div>
))}
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/extractors/loopTemplates.cjs`
- **Lines**: 75-85
- **Context**: Extract both itemVar and indexVar

**Implementation Details**:
```javascript
// Lines 75-85
const arrowFunc = expr.arguments[0];
if (t.isArrowFunctionExpression(arrowFunc)) {
  const itemVar = arrowFunc.params[0] && t.isIdentifier(arrowFunc.params[0])
    ? arrowFunc.params[0].name
    : 'item';

  const indexVar = arrowFunc.params[1] && t.isIdentifier(arrowFunc.params[1])
    ? arrowFunc.params[1].name
    : null;  // Can be null if not provided
}
```

**Port Status**: ✅ Already handled in `extractors/loops.js`

---

#### 3. **Event Handlers in Loops** (Lines 136-149)

**Example**:
```tsx
{categories.map(category => (
  <div key={category.id}>
    <button onClick={() => alert(`Category: ${category.name}`)}>
      {category.name}
    </button>
    <div>
      {category.items.map(item => (
        <button onClick={() => alert(`Item: ${item.name}`)}>
          {item.name}
        </button>
      ))}
    </div>
  </div>
))}
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/extractors/loopTemplates.cjs`
- **Lines**: 130-160
- **Context**: Event handlers capture loop variables

**Implementation Details**:
```javascript
// Event handler closure captures loop variable
// Example: onClick={() => alert(item.name)}
//
// The handler needs to know:
// 1. Loop context (itemVar = 'item')
// 2. Binding path (item.name)
// 3. Array binding (for generating C# code)

function extractEventHandlerInLoop(handler, loopContext) {
  // loopContext = [{ itemVar: 'category', arrayBinding: 'categories' }]

  // Check if handler references loop variables
  const identifiers = extractIdentifiers(handler.body);

  for (const id of identifiers) {
    for (const ctx of loopContext) {
      if (id.startsWith(ctx.itemVar + '.')) {
        // Handler captures loop variable!
        return {
          isLoopClosure: true,
          loopVar: ctx.itemVar,
          binding: id
        };
      }
    }
  }
}
```

**Port Status**: ❌ Not implemented - needs loop context in event handlers

---

## 📋 Test File 03: ComputedPropertiesInLoops.tsx

### Features & Mapping

#### 1. **Computed Property Access** (Lines 35-50)

**Example**:
```tsx
{items.map(item => (
  <li key={item.id}>{item[selectedField]}</li>
))}
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/extractors/loopTemplates.cjs`
- **Lines**: 160-165
- **Status**: ❌ **KNOWN NOT SUPPORTED**

**Implementation Details**:
```javascript
// Lines 160-165
function extractBinding(expr) {
  // ...

  if (t.isMemberExpression(expr)) {
    if (expr.computed) {
      // Computed property: item[key]
      // ❌ NOT SUPPORTED - returns null
      console.warn('[Loop Templates] Computed properties not supported:', expr);
      return null;
    }

    // Regular property: item.name
    return buildMemberPath(expr);
  }
}
```

**Port Status**: ❌ Intentionally not supported - document limitation

---

## 📋 Test File 04: MultiplePlugins.tsx

### Features & Mapping

#### 1. **Plugin Detection** (Lines 50-60)

**Example**:
```tsx
<Plugin name="chart" data={salesData} type="bar" />
<Plugin name="chart" data={revenueData} type="line" />
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/generators/plugin.cjs`
- **Lines**: 1-100
- **Key Function**: `generatePluginCode()`

**Implementation Details**:
```javascript
// Lines 10-45
function detectPlugin(node) {
  if (!t.isJSXElement(node)) return null;

  const tagName = node.openingElement.name.name;

  // Check if it's a <Plugin> element
  if (tagName !== 'Plugin') return null;

  // Extract plugin name from props
  const nameAttr = node.openingElement.attributes.find(attr =>
    t.isJSXAttribute(attr) && attr.name.name === 'name'
  );

  if (!nameAttr) return null;

  const pluginName = t.isStringLiteral(nameAttr.value)
    ? nameAttr.value.value
    : null;

  // Extract all props
  const props = {};
  for (const attr of node.openingElement.attributes) {
    if (t.isJSXAttribute(attr)) {
      const propName = attr.name.name;
      const propValue = extractAttributeValue(attr.value);
      props[propName] = propValue;
    }
  }

  return {
    pluginName,
    props
  };
}
```

**Port Status**: ❌ Not implemented - needs plugin system

---

## 📋 Test File 05: ComplexLoopExpressions.tsx

### Features & Mapping

#### 1. **Binary Operations in Loops** (Lines 60-80)

**Example**:
```tsx
{products.map(product => (
  <div key={product.id}>
    <span>Price: ${product.price}</span>
    <span>Tax: ${(product.price * product.taxRate).toFixed(2)}</span>
    <span>Total: ${(product.price * (1 + product.taxRate) - product.discount).toFixed(2)}</span>
  </div>
))}
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/extractors/loopTemplates.cjs`
- **Lines**: 180-220
- **Context**: Extract bindings from complex expressions in loop body

**Implementation Details**:
```javascript
// Lines 180-220
function extractBindingsInLoopBody(jsxElement, loopContext) {
  const bindings = [];

  // Traverse all expressions in loop body
  traverseExpressions(jsxElement, (expr) => {
    if (t.isBinaryExpression(expr)) {
      // Binary: product.price * product.taxRate
      const identifiers = [];
      extractIdentifiersShared(expr, identifiers);

      // Filter to loop variables only
      const loopBindings = identifiers.filter(id =>
        id.startsWith(loopContext.itemVar + '.')
      );

      bindings.push({
        type: 'BinaryExpression',
        operator: expr.operator,
        bindings: loopBindings,
        raw: generateExpressionCode(expr)
      });
    }
  });

  return bindings;
}
```

**Port Status**: ⚠️ Identifiers extracted but not full expression structure

---

## 📋 Test File 06: EventHandlerEdgeCases.tsx

### Features & Mapping

#### 1. **Event Handler with Event Parameter** (Lines 30-40)

**Example**:
```tsx
<input onChange={(e) => setEmail(e.target.value)} />
<form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} />
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/extractors/eventHandlers.cjs`
- **Lines**: 85-120
- **Function**: `extractEventParameterUsage()`

**Implementation Details**:
```javascript
// Lines 85-120
function extractEventParameterUsage(arrowFunc) {
  const paramName = arrowFunc.params[0]?.name || 'e';
  const usages = [];

  // Find all usages of event parameter
  traverse(arrowFunc.body, {
    MemberExpression(path) {
      if (path.node.object.name === paramName) {
        // e.target.value, e.preventDefault(), etc.
        const memberPath = buildMemberPath(path.node);
        usages.push({
          type: 'EventAccess',
          path: memberPath,
          full: `${paramName}.${memberPath}`
        });
      }
    },
    CallExpression(path) {
      if (path.node.callee.object?.name === paramName) {
        // e.preventDefault()
        const method = path.node.callee.property.name;
        usages.push({
          type: 'EventMethod',
          method: method
        });
      }
    }
  });

  return {
    paramName,
    usages
  };
}
```

**Port Status**: ❌ Not implemented - needs full event handler system

---

#### 2. **Event Handler with Multiple Statements** (Lines 50-60)

**Example**:
```tsx
onClick={() => {
  console.log('Clicked');
  setCount(count + 1);
  alert('Updated!');
}}
```

**Old Plugin Location**:
- **File**: `src/babel-plugin-minimact/src/extractors/eventHandlers.cjs`
- **Lines**: 120-150
- **Function**: `extractBlockStatementHandler()`

**Implementation Details**:
```javascript
// Lines 120-150
function extractBlockStatementHandler(blockStatement, component) {
  const statements = [];

  for (const stmt of blockStatement.body) {
    if (t.isExpressionStatement(stmt)) {
      const expr = stmt.expression;

      if (t.isCallExpression(expr)) {
        // Function call: setCount(...), alert(...), etc.
        statements.push({
          type: 'Call',
          callee: extractCallee(expr.callee),
          arguments: extractArguments(expr.arguments)
        });
      }
    } else if (t.isIfStatement(stmt)) {
      // if statement in handler
      statements.push({
        type: 'If',
        condition: extractExpression(stmt.test),
        consequent: extractBlockStatementHandler(stmt.consequent, component)
      });
    }
  }

  return statements;
}
```

**Port Status**: ❌ Not implemented - needs statement extraction

---

## 📋 Test File 07: RealWorldPatterns.tsx

### Features & Mapping

#### 1. **Combination of All Features**

**Requires**:
- ✅ Style objects
- ⚠️ Transform methods
- ⚠️ Nested loops
- ❌ Event handlers
- ❌ Conditional templates
- ❌ Complex expressions

**Old Plugin Locations**:
- All of the above combined

**Port Status**: Depends on completing all other features

---

## 📊 Summary Table

| Feature | Test Files | Old Plugin File | Lines | Port Status |
|---------|-----------|-----------------|-------|-------------|
| **Style Objects** | 00 | `utils/styleConverter.cjs` | 1-150 | ✅ Module exists |
| **Transform Methods** | 00, 01 | `extractors/templates.cjs` | 56-100 | ✅ In legacy/sharedLogic.js |
| **Conditional Rendering** | 00, 02 | `extractors/templates.cjs` | 404-421 | ⚠️ Structure only |
| **Ternary in Text** | 00, 01 | `extractors/templates.cjs` | 486-510 | ❌ Not implemented |
| **Event Handlers** | 00, 02, 06 | `extractors/eventHandlers.cjs` | 1-200 | ❌ Not implemented |
| **Optional Chaining** | 00 | `extractors/templates.cjs` | 34-50 | ✅ In legacy/sharedLogic.js |
| **Nested Templates** | 01 | `extractors/templates.cjs` | 223-271 | ⚠️ Partial |
| **Method Chaining** | 01 | `extractors/templates.cjs` | 56-100 | ✅ Supported |
| **Binary Expressions** | 01, 05 | `extractors/templates.cjs` | 18-29, 80-84 | ⚠️ Identifiers only |
| **Double Nested .map()** | 02 | `extractors/loopTemplates.cjs` | 50-120 | ⚠️ Single level works |
| **Loop with Index** | 02 | `extractors/loopTemplates.cjs` | 75-85 | ✅ Implemented |
| **Event Handlers in Loops** | 02 | `extractors/loopTemplates.cjs` | 130-160 | ❌ Not implemented |
| **Computed Properties** | 03 | `extractors/loopTemplates.cjs` | 160-165 | ❌ Intentionally not supported |
| **Plugin Detection** | 04 | `generators/plugin.cjs` | 1-100 | ❌ Not implemented |
| **Complex Loop Expressions** | 05 | `extractors/loopTemplates.cjs` | 180-220 | ⚠️ Partial |
| **Event Parameter** | 06 | `extractors/eventHandlers.cjs` | 85-120 | ❌ Not implemented |
| **Block Statement Handlers** | 06 | `extractors/eventHandlers.cjs` | 120-150 | ❌ Not implemented |

## Priority Porting Order

### 🔥 **Critical** (Blocks multiple test files)

1. **Transform Methods** - Already ported ✅, needs wiring
2. **Style Objects** - Module exists ✅, needs integration
3. **Nested Loops** - Partial implementation, needs recursion

### ⚠️ **High Priority** (Common patterns)

4. **Event Handlers** - Full system needed
5. **Conditional Templates** - Value extraction needed
6. **Binary Expressions** - Full structure needed

### ✅ **Medium Priority** (Nice to have)

7. **Plugin System** - Needed by 1 test file
8. **Nested Templates** - Edge case

### ❌ **Low Priority** (Known limitations)

9. **Computed Properties** - Intentionally not supported
10. **Block Statement Handlers** - Complex edge case

---

**Next Actions**:

1. Wire up transform methods from `legacy/sharedLogic.js` → `processors/expressions.js`
2. Integrate style extractor from `extractors/styles.js` → `processors/attributes.js`
3. Add recursive loop handling to `extractors/loops.js`
4. Create event handler system based on `extractors/eventHandlers.cjs`
