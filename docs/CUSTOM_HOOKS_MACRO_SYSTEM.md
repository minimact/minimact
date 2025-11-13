# Custom Hooks: Compile-Time Macro System

**Status:** Design Document
**Version:** 1.0
**Last Updated:** 2025-01-12

---

## Executive Summary

This document defines Minimact's revolutionary approach to custom hooks: **compile-time code generation macros** that transpile to strongly-typed C# code and client-side runtime hints. Unlike React's runtime-based hooks, Minimact hooks are **build-time transformations** that produce zero-overhead, traceable, type-safe code.

**Key Innovation:** Hooks don't manage state at runtime—they generate code or attach behavior at compile-time.

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [Architecture Overview](#architecture-overview)
3. [Hook Registry System](#hook-registry-system)
4. [Macro Implementation API](#macro-implementation-api)
5. [Core Hook Macros](#core-hook-macros)
6. [Code Generation Targets](#code-generation-targets)
7. [Dependency Analysis](#dependency-analysis)
8. [Extensibility Model](#extensibility-model)
9. [Implementation Phases](#implementation-phases)
10. [Examples](#examples)
11. [Comparison with React](#comparison-with-react)

---

## Philosophy

### The Problem with React Hooks

In React, hooks are runtime functions that:
- Manage opaque internal state via index-based ordering
- Have limited compile-time visibility
- Require manual dependency arrays
- Introduce runtime overhead
- Are difficult to trace and debug

### The Minimact Solution

In Minimact, hooks are **compile-time macros** that:
- Generate strongly-typed C# code
- Have perfect static analysis
- Automatically extract dependencies from AST
- Produce zero runtime overhead (code compiles away)
- Are fully traceable (you can read the generated C#)

**Mental Model:**
```
React Hook  = Runtime function call
Minimact Hook = Babel macro → C# codegen
```

---

## Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. TSX Source Code                                          │
│    const fullName = useDerived(() => `${first} ${last}`);  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Babel Plugin (AST Analysis)                              │
│    - Detects useDerived() call                              │
│    - Routes to hook macro registry                          │
│    - Extracts arrow function body                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Hook Macro Execution                                     │
│    - Analyzes dependencies (state.first, state.last)        │
│    - Transpiles JS expression to C#                         │
│    - Generates C# property metadata                         │
│    - Removes original hook call from output                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. C# Code Generation                                       │
│    [Computed(Dependencies = new[] { "first", "last" })]     │
│    public string fullName => $"{first} {last}";             │
└─────────────────────────────────────────────────────────────┘
```

### Component Flow

```
Component.tsx
    ↓ (Babel transpilation)
Component.cs (generated)
    ↓ (C# compilation)
MinimactComponent.dll
    ↓ (Runtime)
VNode tree → Rust reconciliation → DOM patches
```

---

## Hook Registry System

### Registry Structure

```javascript
// babel-plugin-minimact/src/hooks/hookRegistry.cjs

const hookMacros = new Map();

// Register built-in macros
hookMacros.set('useDerived', require('./macros/useDerived.cjs'));
hookMacros.set('useWatch', require('./macros/useWatch.cjs'));
hookMacros.set('useTimer', require('./macros/useTimer.cjs'));
hookMacros.set('usePagination', require('./macros/usePagination.cjs'));
hookMacros.set('useDebounce', require('./macros/useDebounce.cjs'));
hookMacros.set('useThrottle', require('./macros/useThrottle.cjs'));
hookMacros.set('useLocalStorage', require('./macros/useLocalStorage.cjs'));
hookMacros.set('useAsync', require('./macros/useAsync.cjs'));

/**
 * Register a hook macro
 * @param {string} name - Hook name (e.g., 'useDerived')
 * @param {HookMacro} macro - Macro implementation
 */
function registerHookMacro(name, macro) {
  if (!name.startsWith('use')) {
    throw new Error(`Hook name must start with 'use': ${name}`);
  }

  if (typeof macro.expand !== 'function') {
    throw new Error(`Hook macro must have an 'expand' method: ${name}`);
  }

  hookMacros.set(name, macro);
}

/**
 * Expand a hook macro if registered
 * @param {string} hookName - Name of the hook
 * @param {Array} args - Arguments passed to the hook
 * @param {NodePath} path - Babel AST path
 * @param {Component} component - Component metadata
 * @returns {boolean} - True if hook was expanded, false otherwise
 */
function expandHookMacro(hookName, args, path, component) {
  const macro = hookMacros.get(hookName);
  if (!macro) return false; // Not a macro hook

  return macro.expand(args, path, component);
}

/**
 * Check if a hook is a macro
 */
function isHookMacro(hookName) {
  return hookMacros.has(hookName);
}

module.exports = {
  registerHookMacro,
  expandHookMacro,
  isHookMacro,
  hookMacros
};
```

### Discovery Process

When processing a component, Babel:

1. **Traverses the AST** looking for `CallExpression` nodes
2. **Checks if callee starts with `use`** (hook naming convention)
3. **Looks up the hook in the registry**
4. **If found:** Calls `macro.expand()` and processes the result
5. **If not found:** Processes as regular built-in hook (useState, useEffect, etc.)

---

## Macro Implementation API

### Macro Interface

Every hook macro must implement this interface:

```typescript
interface HookMacro {
  /**
   * Expand the hook macro into generated code
   *
   * @param args - AST nodes for hook arguments
   * @param path - Babel NodePath for the hook call
   * @param component - Component metadata object
   * @returns true if handled, false to fallback
   */
  expand(
    args: Array<t.Node>,
    path: NodePath<t.CallExpression>,
    component: ComponentMetadata
  ): boolean;

  /**
   * Optional: Type signature for validation
   */
  signature?: {
    params: Array<{ name: string, type: string, optional?: boolean }>;
    returns: string;
  };

  /**
   * Optional: Documentation
   */
  docs?: {
    description: string;
    examples: string[];
  };
}
```

### Component Metadata Structure

```typescript
interface ComponentMetadata {
  name: string;                    // Component name
  states: StateDeclaration[];      // [State] fields
  computedProperties: ComputedProperty[]; // [Computed] properties
  effects: EffectMethod[];         // [Effect] methods
  handlers: HandlerMethod[];       // Event handlers
  props: PropDeclaration[];        // Component props
  imports: ImportDeclaration[];    // Using statements for C#
  localVariables: Map<string, any>; // Local vars in Render()
}

interface ComputedProperty {
  name: string;         // Property name
  type: string;         // C# type (string, int, etc.)
  expression: string;   // C# expression
  dependencies: string[]; // State keys this depends on
  attribute: string;    // C# attribute text
}

interface EffectMethod {
  name: string;         // Method name
  body: string;         // C# method body
  dependencies: string[]; // State keys to watch
  attribute: string;    // [Effect(...)] attribute
  triggers: 'mount' | 'change' | 'always'; // When to run
}
```

---

## Core Hook Macros

### 1. `useDerived` - Computed Properties

**Purpose:** Generate `[Computed]` properties with automatic dependency tracking.

**TSX Usage:**
```tsx
const fullName = useDerived(() => `${state.first} ${state.last}`);
```

**Generated C#:**
```csharp
[Computed(Dependencies = new[] { "first", "last" })]
public string fullName => $"{first} {last}";
```

**Implementation:**
```javascript
// babel-plugin-minimact/src/hooks/macros/useDerived.cjs
const t = require('@babel/types');
const { extractStateDependencies } = require('../../analyzers/dependencies.cjs');
const { transpileExpression } = require('../../transpilers/expressions.cjs');
const { inferType } = require('../../types/typeConversion.cjs');

module.exports = {
  expand(args, path, component) {
    // Validate arguments
    if (args.length !== 1) {
      throw path.buildCodeFrameError(
        'useDerived expects exactly 1 argument: () => expression'
      );
    }

    const computeFn = args[0];

    if (!t.isArrowFunctionExpression(computeFn) && !t.isFunctionExpression(computeFn)) {
      throw path.buildCodeFrameError(
        'useDerived argument must be an arrow function or function expression'
      );
    }

    // Extract property name from variable declarator
    const declarator = path.findParent(p => p.isVariableDeclarator());
    if (!declarator || !t.isIdentifier(declarator.node.id)) {
      throw path.buildCodeFrameError(
        'useDerived must be assigned to a variable: const name = useDerived(...)'
      );
    }

    const propertyName = declarator.node.id.name;

    // Analyze dependencies
    const fnBody = computeFn.body;
    const dependencies = extractStateDependencies(fnBody, component);

    // Transpile function body to C#
    const csharpExpression = transpileExpression(fnBody);

    // Infer return type
    const returnType = inferType(fnBody) || 'object';

    // Add computed property to component metadata
    component.computedProperties.push({
      name: propertyName,
      type: returnType,
      expression: csharpExpression,
      dependencies: dependencies,
      attribute: `[Computed(Dependencies = new[] { ${dependencies.map(d => `"${d}"`).join(', ')} })]`
    });

    // Remove the hook call from TSX output
    // (The property will be generated in C# instead)
    declarator.remove();

    return true; // Successfully handled
  },

  signature: {
    params: [
      { name: 'compute', type: '() => T' }
    ],
    returns: 'T'
  },

  docs: {
    description: 'Creates a computed property that automatically recalculates when dependencies change',
    examples: [
      'const fullName = useDerived(() => `${first} ${last}`);',
      'const total = useDerived(() => items.reduce((sum, item) => sum + item.price, 0));'
    ]
  }
};
```

---

### 2. `useWatch` - Effect Watchers

**Purpose:** Generate `[Effect]` methods that run when specific state changes.

**TSX Usage:**
```tsx
useWatch(['cart.items', 'cart.total'], () => {
  validateCart();
});
```

**Generated C#:**
```csharp
[Effect(OnStateChanged = new[] { "cart.items", "cart.total" })]
private void _watch_0()
{
    validateCart();
}
```

**Implementation:**
```javascript
// babel-plugin-minimact/src/hooks/macros/useWatch.cjs
const t = require('@babel/types');
const { transpileStatements } = require('../../transpilers/statements.cjs');

let watchIndex = 0;

module.exports = {
  expand(args, path, component) {
    if (args.length !== 2) {
      throw path.buildCodeFrameError(
        'useWatch expects 2 arguments: (keys[], callback)'
      );
    }

    const [keysArg, callbackArg] = args;

    // Extract dependency keys
    if (!t.isArrayExpression(keysArg)) {
      throw path.buildCodeFrameError(
        'useWatch first argument must be an array of state keys'
      );
    }

    const dependencies = keysArg.elements.map(elem => {
      if (!t.isStringLiteral(elem)) {
        throw path.buildCodeFrameError(
          'useWatch dependencies must be string literals'
        );
      }
      return elem.value;
    });

    // Extract callback body
    if (!t.isArrowFunctionExpression(callbackArg) && !t.isFunctionExpression(callbackArg)) {
      throw path.buildCodeFrameError(
        'useWatch second argument must be a function'
      );
    }

    const callbackBody = callbackArg.body;
    const csharpBody = t.isBlockStatement(callbackBody)
      ? transpileStatements(callbackBody.body)
      : transpileExpression(callbackBody) + ';';

    // Generate unique method name
    const methodName = `_watch_${watchIndex++}`;

    // Add effect to component metadata
    component.effects.push({
      name: methodName,
      body: csharpBody,
      dependencies: dependencies,
      attribute: `[Effect(OnStateChanged = new[] { ${dependencies.map(d => `"${d}"`).join(', ')} })]`,
      triggers: 'change'
    });

    // Remove hook call from output
    path.remove();

    return true;
  },

  signature: {
    params: [
      { name: 'keys', type: 'string[]' },
      { name: 'callback', type: '() => void' }
    ],
    returns: 'void'
  },

  docs: {
    description: 'Run a callback when specific state values change',
    examples: [
      'useWatch(["count"], () => console.log("Count changed"));',
      'useWatch(["cart.items"], () => recalculateTotal());'
    ]
  }
};
```

---

### 3. `useTimer` - Interval-based State Updates

**Purpose:** Generate recurring state updates at fixed intervals.

**TSX Usage:**
```tsx
useTimer("currentTime", 1000); // Update every second
```

**Generated C# (Server-side):**
```csharp
[Effect(OnMounted = true)]
private void _timer_currentTime()
{
    System.Threading.Timer timer = null;
    timer = new System.Threading.Timer(_ => {
        currentTime = DateTime.Now;
        TriggerRender();
    }, null, 0, 1000);

    // Cleanup on unmount
    OnDispose(() => timer?.Dispose());
}
```

**Generated JS (Client-side):**
```javascript
// Added to client runtime initialization
setInterval(() => {
  setState('currentTime', new Date().toISOString());
}, 1000);
```

**Implementation:**
```javascript
// babel-plugin-minimact/src/hooks/macros/useTimer.cjs
module.exports = {
  expand(args, path, component) {
    if (args.length !== 2) {
      throw path.buildCodeFrameError(
        'useTimer expects 2 arguments: (stateKey, intervalMs)'
      );
    }

    const [stateKeyArg, intervalArg] = args;

    if (!t.isStringLiteral(stateKeyArg)) {
      throw path.buildCodeFrameError(
        'useTimer first argument must be a string literal'
      );
    }

    const stateKey = stateKeyArg.value;
    const interval = t.isNumericLiteral(intervalArg)
      ? intervalArg.value
      : 1000;

    // Generate server-side effect
    const methodName = `_timer_${stateKey}`;

    component.effects.push({
      name: methodName,
      body: `
System.Threading.Timer timer = null;
timer = new System.Threading.Timer(_ => {
    ${stateKey} = DateTime.Now;
    TriggerRender();
}, null, 0, ${interval});

OnDispose(() => timer?.Dispose());
      `.trim(),
      dependencies: [],
      attribute: '[Effect(OnMounted = true)]',
      triggers: 'mount'
    });

    // Add state declaration if not exists
    if (!component.states.find(s => s.name === stateKey)) {
      component.states.push({
        name: stateKey,
        type: 'DateTime',
        initialValue: 'DateTime.Now',
        attribute: '[State]'
      });
    }

    // Remove hook call
    path.remove();

    return true;
  }
};
```

---

### 4. `usePagination` - Complex State Pattern

**Purpose:** Generate pagination state, computed properties, and navigation methods.

**TSX Usage:**
```tsx
const { page, pageSize, totalPages, next, prev, goto } = usePagination({
  totalItems: items.length,
  pageSize: 10
});
```

**Generated C#:**
```csharp
[State] private int page = 1;
[State] private int pageSize = 10;

[Computed]
private int totalPages => (int)Math.Ceiling((double)items.Count / pageSize);

private void next()
{
    page = Math.Min(page + 1, totalPages);
}

private void prev()
{
    page = Math.Max(page - 1, 1);
}

private void goto(int p)
{
    page = Math.Clamp(p, 1, totalPages);
}
```

---

### 5. `useDebounce` - Delayed State Updates

**Purpose:** Debounce state changes to reduce re-renders and server calls.

**TSX Usage:**
```tsx
const [query, setQuery] = useState('');
const debouncedQuery = useDebounce(query, 500);
```

**Client-side Generation:**
```javascript
let debounceTimer_query;
const setQuery = (value) => {
  setState('query', value);

  clearTimeout(debounceTimer_query);
  debounceTimer_query = setTimeout(() => {
    setState('debouncedQuery', value);
    signalR.updateComponentState(componentId, 'debouncedQuery', value);
  }, 500);
};
```

**Server-side:**
```csharp
[State] private string query = "";
[State] private string debouncedQuery = "";
```

---

## Code Generation Targets

### Target 1: C# Server-Side Component

**Purpose:** Server-side rendering and state management

**Outputs:**
- `[State]` fields
- `[Computed]` properties
- `[Effect]` methods
- Event handler methods
- `Render()` method (VNode tree)

**Example:**
```csharp
[Component]
public partial class MyComponent : MinimactComponent
{
    [State]
    private string first = "";

    [State]
    private string last = "";

    [Computed(Dependencies = new[] { "first", "last" })]
    public string fullName => $"{first} {last}";

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(),
            new VText(fullName, "1.1")
        );
    }
}
```

---

### Target 2: Client-Side Runtime Hints

**Purpose:** Predictive rendering and instant feedback

**Outputs:**
- Template metadata JSON
- Hook initialization code
- State sync callbacks

**Example:**
```json
{
  "templates": {
    "fullName_change": {
      "bindings": ["first", "last"],
      "patches": [
        { "path": "1.1", "op": "setText", "value": "{first} {last}" }
      ]
    }
  },
  "hooks": {
    "effects": [
      { "name": "_watch_0", "deps": ["cart.items", "cart.total"] }
    ]
  }
}
```

---

### Target 3: TypeScript Declarations

**Purpose:** Type safety and IntelliSense in TSX files

**Outputs:**
- `.d.ts` files for custom hooks
- Component prop types
- Hook return types

**Example:**
```typescript
export function useDerived<T>(compute: () => T): T;
export function useWatch(keys: string[], callback: () => void): void;
export function usePagination(options: {
  totalItems: number;
  pageSize: number;
}): {
  page: number;
  pageSize: number;
  totalPages: number;
  next: () => void;
  prev: () => void;
  goto: (page: number) => void;
};
```

---

## Dependency Analysis

### Automatic Dependency Extraction

The Babel plugin analyzes AST to extract state dependencies:

```javascript
// babel-plugin-minimact/src/analyzers/dependencies.cjs
function extractStateDependencies(node, component) {
  const dependencies = new Set();

  traverse(node, {
    MemberExpression(path) {
      // Detect: state.foo, this.bar, component.baz
      if (isStateMemberExpression(path, component)) {
        const propertyName = getPropertyName(path);
        dependencies.add(propertyName);
      }
    },
    Identifier(path) {
      // Detect: foo (when foo is a state variable)
      if (isStateVariable(path, component)) {
        dependencies.add(path.node.name);
      }
    }
  });

  return Array.from(dependencies);
}
```

**Example Analysis:**

```tsx
useDerived(() => `${first} ${last} (${age} years old)`)
```

**Extracted Dependencies:**
```javascript
["first", "last", "age"]
```

**Generated Attribute:**
```csharp
[Computed(Dependencies = new[] { "first", "last", "age" })]
```

---

## Extensibility Model

### Third-Party Hook Macros

Developers can publish hook macro packages:

```bash
npm install @minimact-hooks/animation
```

**Package Structure:**
```
@minimact-hooks/animation/
├── package.json
├── macros/
│   ├── useSpring.cjs
│   ├── useGesture.cjs
│   └── useTransition.cjs
└── index.d.ts
```

**package.json:**
```json
{
  "name": "@minimact-hooks/animation",
  "version": "1.0.0",
  "minimact": {
    "hooks": {
      "useSpring": "./macros/useSpring.cjs",
      "useGesture": "./macros/useGesture.cjs",
      "useTransition": "./macros/useTransition.cjs"
    }
  }
}
```

**Auto-Discovery:**

The Babel plugin scans `node_modules/` for packages with `minimact.hooks` in `package.json` and automatically registers them.

---

### Hook Macro Template

```javascript
// macros/myCustomHook.cjs
const t = require('@babel/types');

module.exports = {
  /**
   * Expand the hook macro
   */
  expand(args, path, component) {
    // 1. Validate arguments
    if (args.length !== 1) {
      throw path.buildCodeFrameError('Expected 1 argument');
    }

    // 2. Extract information from AST
    const config = evaluateConfig(args[0]);

    // 3. Generate code
    component.states.push({
      name: 'myState',
      type: 'int',
      initialValue: '0',
      attribute: '[State]'
    });

    // 4. Remove hook call (optional)
    path.remove();

    return true;
  },

  /**
   * Type signature (optional)
   */
  signature: {
    params: [{ name: 'config', type: 'MyConfig' }],
    returns: 'MyReturn'
  },

  /**
   * Documentation (optional)
   */
  docs: {
    description: 'My custom hook description',
    examples: ['const x = useMyHook({ foo: "bar" });']
  }
};
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goals:**
- ✅ Create hook registry system
- ✅ Integrate registry into Babel plugin
- ✅ Implement dependency analyzer
- ✅ Implement 3 core macros: `useDerived`, `useWatch`, `useTimer`

**Deliverables:**
- `src/babel-plugin-minimact/src/hooks/hookRegistry.cjs`
- `src/babel-plugin-minimact/src/hooks/macros/useDerived.cjs`
- `src/babel-plugin-minimact/src/hooks/macros/useWatch.cjs`
- `src/babel-plugin-minimact/src/hooks/macros/useTimer.cjs`
- `src/babel-plugin-minimact/src/analyzers/dependencies.cjs`

**Tests:**
- Dependency extraction accuracy
- C# code generation correctness
- Hook call removal from output

---

### Phase 2: Advanced Macros (Week 3-4)

**Goals:**
- ✅ Implement `usePagination`
- ✅ Implement `useDebounce`
- ✅ Implement `useThrottle`
- ✅ Implement `useLocalStorage`
- ✅ Implement `useAsync`

**Deliverables:**
- 5 additional hook macros
- Documentation for each hook
- Example components using hooks

---

### Phase 3: Extensibility (Week 5-6)

**Goals:**
- ✅ Package.json hook discovery
- ✅ Third-party macro API documentation
- ✅ Create `@minimact/hooks-core` package
- ✅ Create `@minimact/hooks-animation` example package

**Deliverables:**
- Auto-discovery system
- Macro authoring guide
- Published npm packages

---

### Phase 4: Declarative Syntax (Week 7-8)

**Goals:**
- ✅ Support `<Hook>` JSX component syntax
- ✅ Visual editor integration hooks
- ✅ Minimact Swig IDE support

**Deliverables:**
- JSX `<Hook>` component transpilation
- Swig drag-drop hook UI
- Visual hook composer

---

## Examples

### Example 1: Form Validation Hook

**TSX:**
```tsx
const { values, errors, touched, validate, handleChange, handleBlur } = useForm({
  initialValues: { email: '', password: '' },
  validation: {
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    password: (v) => v.length >= 8
  }
});
```

**Generated C#:**
```csharp
[State] private Dictionary<string, string> values = new() {
  ["email"] = "",
  ["password"] = ""
};

[State] private Dictionary<string, string> errors = new();
[State] private Dictionary<string, bool> touched = new();

private void validate()
{
    errors.Clear();

    if (!Regex.IsMatch(values["email"], @"^[^\s@]+@[^\s@]+\.[^\s@]+$"))
        errors["email"] = "Invalid email";

    if (values["password"].Length < 8)
        errors["password"] = "Password must be at least 8 characters";
}

private void handleChange(string field, string value)
{
    values[field] = value;
    validate();
}

private void handleBlur(string field)
{
    touched[field] = true;
    validate();
}
```

---

### Example 2: WebSocket Connection Hook

**TSX:**
```tsx
const { connected, send, messages } = useWebSocket('wss://api.example.com');
```

**Generated C#:**
```csharp
[State] private bool connected = false;
[State] private List<string> messages = new();

private System.Net.WebSockets.ClientWebSocket _ws;

[Effect(OnMounted = true)]
private async void _connectWebSocket()
{
    _ws = new ClientWebSocket();
    await _ws.ConnectAsync(new Uri("wss://api.example.com"), CancellationToken.None);
    connected = true;

    _ = ReceiveMessages();

    OnDispose(() => _ws?.Dispose());
}

private async Task ReceiveMessages()
{
    var buffer = new byte[1024];
    while (_ws.State == WebSocketState.Open)
    {
        var result = await _ws.ReceiveAsync(buffer, CancellationToken.None);
        var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
        messages.Add(message);
        TriggerRender();
    }
}

private async void send(string message)
{
    var bytes = Encoding.UTF8.GetBytes(message);
    await _ws.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
}
```

---

### Example 3: Infinite Scroll Hook

**TSX:**
```tsx
const { items, loadMore, hasMore, loading } = useInfiniteScroll({
  fetchPage: async (page) => {
    const res = await fetch(`/api/items?page=${page}`);
    return res.json();
  },
  pageSize: 20
});
```

**Generated C#:**
```csharp
[State] private List<Item> items = new();
[State] private int currentPage = 1;
[State] private bool hasMore = true;
[State] private bool loading = false;

private async void loadMore()
{
    if (loading || !hasMore) return;

    loading = true;

    var newItems = await FetchPage(currentPage);
    items.AddRange(newItems);

    hasMore = newItems.Count == 20;
    currentPage++;
    loading = false;

    TriggerRender();
}

private async Task<List<Item>> FetchPage(int page)
{
    using var client = new HttpClient();
    var response = await client.GetStringAsync($"/api/items?page={page}");
    return JsonSerializer.Deserialize<List<Item>>(response);
}
```

---

## Comparison with React

| Feature | React Hooks | Minimact Hooks |
|---------|-------------|----------------|
| **Execution Model** | Runtime function calls | Compile-time macros |
| **State Management** | Hidden internal array | Explicit C# fields with `[State]` |
| **Dependency Tracking** | Manual arrays (`[dep1, dep2]`) | AST auto-extraction |
| **Type Safety** | TypeScript (optional) | C# (enforced) |
| **Performance** | Runtime overhead | Zero overhead (compiles away) |
| **Traceability** | Opaque (React DevTools) | Transparent (read generated C#) |
| **Custom Hooks** | Runtime composition | Macro expansion |
| **Third-party Hooks** | npm packages (runtime) | npm packages (build-time) |
| **Rules of Hooks** | Strict ordering required | Order-independent (named state) |
| **Debugging** | Breakpoint in hook function | Breakpoint in generated C# |
| **Bundle Size** | Hooks included in bundle | Hooks compiled away |
| **Server Rendering** | Separate implementation | Same code for client/server |

---

## Advantages of Minimact's Approach

### 1. **Perfect Static Analysis**
```tsx
// React - manual dependency array (can be wrong!)
useEffect(() => {
  doSomething(a, b, c);
}, [a, b]); // ❌ Missing 'c'!

// Minimact - auto-extracted dependencies
useWatch(['a', 'b', 'c'], () => {
  doSomething(a, b, c);
}); // ✅ Compiler enforces correctness
```

### 2. **Zero Runtime Overhead**
```tsx
// React - hook executes every render
const fullName = useMemo(() => `${first} ${last}`, [first, last]);

// Minimact - compiles to C# property (no function call)
const fullName = useDerived(() => `${first} ${last}`);
// → public string fullName => $"{first} {last}";
```

### 3. **Transparent Behavior**
```tsx
// React - state is hidden
const [count, setCount] = useState(0); // Where is 'count' stored? 🤷

// Minimact - generates visible C# field
const [count, setCount] = useState(0);
// → [State] private int count = 0;  ✅ Clear!
```

### 4. **Type Safety**
```tsx
// React - TypeScript helps, but runtime can differ
const [value, setValue] = useState<string>(''); // Type erasure at runtime

// Minimact - C# enforces types at runtime
const [value, setValue] = useState('');
// → [State] private string value = ""; ✅ Runtime type safety
```

### 5. **Extensibility**
```tsx
// React - custom hooks are runtime functions
function useToggle(init) {
  const [on, setOn] = useState(init);
  return [on, () => setOn(!on)];
}

// Minimact - custom hooks are code generators
function useToggle(init) {
  // Macro generates:
  // [State] private bool on = init;
  // private void toggle() => on = !on;
}
```

---

## Future Enhancements

### 1. **Visual Hook Composer (Minimact Swig)**
Drag-and-drop hook builder:
```
[useState] → [useDerived] → [useWatch] → [useDebounce]
    ↓            ↓             ↓             ↓
  "count"    "doubled"    "log change"  "save to DB"
```

### 2. **Hook Optimizer**
Analyze hook usage and suggest optimizations:
```
⚠️ Warning: useDerived(() => expensiveCalc()) has no dependencies
💡 Suggestion: Move to [Computed] property or add dependencies
```

### 3. **Hook Debugger**
Step through hook macro expansion in real-time:
```
useWatch(['a', 'b'], () => { ... })
    ↓ [Macro Expansion]
[Effect(OnStateChanged = new[] { "a", "b" })]
private void _watch_0() { ... }
```

### 4. **Hook Marketplace**
Browse and install community hooks:
```bash
minimact install @community/hooks-animation
minimact install @community/hooks-forms
minimact install @community/hooks-data-fetching
```

---

## Conclusion

Minimact's compile-time hook macro system represents a **paradigm shift** from React's runtime model. By treating hooks as **code generators** rather than function calls, Minimact achieves:

✅ **Zero runtime overhead**
✅ **Perfect static analysis**
✅ **Full type safety**
✅ **Complete traceability**
✅ **Extensible architecture**

This approach makes Minimact hooks **more powerful, more performant, and more maintainable** than React hooks, while maintaining a familiar developer experience.

---

**Next Steps:**
1. Review this design document
2. Approve implementation phases
3. Begin Phase 1 development
4. Iterate based on feedback

**Questions? Feedback?**
Open an issue or discussion in the Minimact repository.
