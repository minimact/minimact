# Babel Transpiler Implementation Plan: Client-Side Execution Support

## Overview

This document outlines the complete implementation plan for extending the Minimact Babel plugin to support client-side execution of event handlers and effects. The goal is to generate JavaScript code that can be bound to hook contexts and executed in the browser with zero global pollution.

---

## Current State vs Target State

### Current State ✅
- Babel generates C# components from TSX
- Event handlers transpiled to C# methods
- `useEffect` generates C# methods with `[OnStateChanged]` attributes
- Hex paths assigned to elements
- Template extraction working

### Target State 🎯
- **Event handlers** generate BOTH:
  - C# methods (for server-side calls via SignalR)
  - JavaScript functions (for client-side execution with state access)
- **Effects** generate BOTH:
  - C# methods (for server-side logging/documentation)
  - JavaScript functions (for client-side execution)
- **Arrow functions → Regular functions** (for `.bind()` compatibility)
- **Hook mappings injected** at top of functions (`const useState = this.useState;`)
- **Zero DOM/window pollution**

---

## Phase 1: Data Structure Updates

### 1.1 Add `clientEffects` Array to Component Object

**File:** `src/babel-plugin-minimact/src/index.cjs`

**Current component structure:**
```javascript
const component = {
  name: componentName,
  props: [],
  useState: [],
  useEffect: [],          // Server-side only
  useRef: [],
  eventHandlers: [],      // Server-side only
  clientHandlers: [],     // Client-side handlers (already exists)
  // ... other fields
};
```

**Add:**
```javascript
const component = {
  // ... existing fields ...
  clientEffects: [],      // ✅ NEW: Client-side effects
};
```

### 1.2 Define EffectDefinition Structure

**Client effect structure:**
```javascript
{
  name: "Effect_0",           // Effect identifier
  jsCode: "function() {...}", // Transformed JavaScript code
  dependencies: [...],        // AST node for dependency array
  hookCalls: ["useState", "useRef"] // Track which hooks are used
}
```

---

## Phase 2: Effect Extraction Enhancement

### 2.1 Update `extractUseEffect` Function

**File:** `src/babel-plugin-minimact/src/extractors/hooks.cjs`

**Current implementation:**
```javascript
function extractUseEffect(path, component) {
  const callback = path.node.arguments[0];
  const dependencies = path.node.arguments[1];

  component.useEffect.push({
    body: callback,
    dependencies: dependencies
  });
}
```

**Enhanced implementation:**
```javascript
function extractUseEffect(path, component) {
  const callback = path.node.arguments[0];
  const dependencies = path.node.arguments[1];

  // 1. Server-side C# (existing)
  component.useEffect.push({
    body: callback,
    dependencies: dependencies
  });

  // 2. ✅ NEW: Client-side JavaScript
  if (!component.clientEffects) {
    component.clientEffects = [];
  }

  const effectIndex = component.clientEffects.length;

  // Analyze what hooks are used in the effect
  const hookCalls = analyzeHookUsage(callback);

  // Transform arrow function to regular function with hook mapping
  const transformedCallback = transformEffectCallback(callback, hookCalls);

  // Generate JavaScript code
  const jsCode = generate(transformedCallback, {
    compact: false,
    retainLines: false
  }).code;

  component.clientEffects.push({
    name: `Effect_${effectIndex}`,
    jsCode: jsCode,
    dependencies: dependencies,
    hookCalls: hookCalls
  });
}
```

### 2.2 Add `analyzeHookUsage` Helper

**Purpose:** Detect which hooks are used in the callback to inject only necessary mappings.

```javascript
/**
 * Analyze which hooks are called in the effect body
 * Returns array like: ["useState", "useRef", "useEffect"]
 */
function analyzeHookUsage(callback) {
  const hooks = new Set();

  // Traverse the callback AST
  traverse(callback, {
    CallExpression(path) {
      const callee = path.node.callee;

      // Check for direct hook calls: useState(), useRef(), etc.
      if (t.isIdentifier(callee)) {
        if (callee.name.startsWith('use') && /^use[A-Z]/.test(callee.name)) {
          hooks.add(callee.name);
        }
      }
    }
  });

  return Array.from(hooks);
}
```

### 2.3 Add `transformEffectCallback` Function

**Purpose:** Convert arrow function → regular function with hook mappings at the top.

```javascript
/**
 * Transform effect callback:
 * - Arrow function → Regular function (for .bind() compatibility)
 * - Inject hook mappings at top: const useState = this.useState;
 * - Preserve async if present
 * - Preserve cleanup return value
 */
function transformEffectCallback(callback, hookCalls) {
  if (!t.isArrowFunctionExpression(callback) && !t.isFunctionExpression(callback)) {
    throw new Error('Effect callback must be a function');
  }

  let functionBody = callback.body;

  // If body is an expression, wrap in block statement
  if (!t.isBlockStatement(functionBody)) {
    functionBody = t.blockStatement([
      t.returnStatement(functionBody)
    ]);
  }

  // Build hook mapping statements
  // const useState = this.useState;
  // const useRef = this.useRef;
  const hookMappings = hookCalls.map(hookName => {
    return t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(hookName),
        t.memberExpression(
          t.thisExpression(),
          t.identifier(hookName)
        )
      )
    ]);
  });

  // Prepend hook mappings to function body
  const newBody = t.blockStatement([
    ...hookMappings,
    ...functionBody.body
  ]);

  // Return regular function expression
  return t.functionExpression(
    null,                    // No name (anonymous)
    callback.params,         // Keep original params (usually empty)
    newBody,                 // Body with hook mappings
    false,                   // Not a generator
    callback.async || false  // Preserve async
  );
}
```

### 2.4 Handle Edge Cases

**Cleanup Functions:**
```javascript
// Input:
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  return () => clearInterval(timer);
}, []);

// Output (must preserve return):
function() {
  const useState = this.useState;
  const useRef = this.useRef;

  const timer = setInterval(() => {}, 1000);
  return () => clearInterval(timer); // ✅ Preserved
}
```

**Async Effects:**
```javascript
// Input:
useEffect(async () => {
  const data = await fetch('/api/data');
  setData(data);
}, []);

// Output:
async function() {  // ✅ async preserved
  const useState = this.useState;

  const data = await fetch('/api/data');
  setData(data);
}
```

**Empty Dependency Array:**
```javascript
// Input:
useEffect(() => {
  console.log('Mounted');
}, []);

// Track dependencies:
{
  dependencies: ArrayExpression { elements: [] }, // Empty array
  hookCalls: []  // No hooks used
}
```

**No Dependency Array:**
```javascript
// Input:
useEffect(() => {
  console.log('Every render');
});

// Track dependencies:
{
  dependencies: undefined,  // No array provided
  hookCalls: []
}
```

---

## Phase 3: Event Handler Enhancement

### 3.1 Update Event Handler Extraction

**File:** `src/babel-plugin-minimact/src/extractors/eventHandlers.cjs`

**Current flow:**
1. Extract inline handlers: `onClick={() => setCount(count + 1)}`
2. Detect if "client-only" (DOM manipulation, no state changes)
3. If client-only → Add to `clientHandlers`
4. Otherwise → Add to `eventHandlers` (server-side)

**Enhanced flow:**
1. Extract inline handlers
2. **ALWAYS generate both**:
   - Server-side C# method (for SignalR calls)
   - Client-side JavaScript function (for direct execution)
3. Detect hook usage and inject mappings

**Key change:** Even handlers with `setState` calls need client-side execution for instant template patches!

### 3.2 Update `extractEventHandler` Logic

**Current:**
```javascript
if (isClientOnly) {
  // Add to clientHandlers only
  component.clientHandlers.push({ name, jsCode });
} else {
  // Add to eventHandlers only
  component.eventHandlers.push({ name, body, params });
}
```

**Enhanced:**
```javascript
// Analyze hook usage
const hookCalls = analyzeHookUsage(body);

// Transform to regular function with hook mappings
const transformedFunction = transformHandlerFunction(body, params, hookCalls);
const jsCode = generate(transformedFunction).code;

// ✅ Always add to clientHandlers (for client-side execution)
if (!component.clientHandlers) {
  component.clientHandlers = [];
}
component.clientHandlers.push({
  name: handlerName,
  jsCode: jsCode,
  hookCalls: hookCalls
});

// ✅ Also add to eventHandlers if it modifies state (for server-side SignalR calls)
if (!isClientOnly) {
  component.eventHandlers.push({
    name: handlerName,
    body: body,
    params: params,
    capturedParams: capturedParams,
    isAsync: isAsync
  });
}
```

### 3.3 Add `transformHandlerFunction`

**Purpose:** Transform handler arrow function to regular function with hook mappings.

```javascript
/**
 * Transform event handler:
 * - Arrow function → Regular function
 * - Inject hook mappings at top
 * - Preserve event parameter (e)
 * - Preserve async if present
 */
function transformHandlerFunction(body, params, hookCalls) {
  let functionBody = body;

  // If body is expression, wrap in block
  if (!t.isBlockStatement(functionBody)) {
    functionBody = t.blockStatement([
      t.expressionStatement(functionBody)
    ]);
  }

  // Build hook mappings
  const hookMappings = hookCalls.map(hookName => {
    return t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(hookName),
        t.memberExpression(t.thisExpression(), t.identifier(hookName))
      )
    ]);
  });

  // Prepend hook mappings
  const newBody = t.blockStatement([
    ...hookMappings,
    ...functionBody.body
  ]);

  // Return regular function
  return t.functionExpression(
    null,
    params,        // Keep event parameter: (e) => ...
    newBody,
    false,
    false          // Handlers are typically not async (unless await inside)
  );
}
```

### 3.4 Example Handler Transformation

**Input:**
```typescript
<button onClick={(e) => {
  e.preventDefault();
  setCount(count + 1);
}}>
```

**Generated Client Handler:**
```javascript
function(e) {
  const useState = this.useState;

  e.preventDefault();
  const [count, setCount] = useState('count');
  setCount(count + 1);
}
```

**Generated Server Handler:**
```csharp
public void HandleClick_10000000()
{
    count++;
    SetState("count", count);
}
```

---

## Phase 4: C# Code Generation Updates

### 4.1 Add `GetClientEffects()` Method Generation

**File:** `src/babel-plugin-minimact/src/generators/component.cjs`

**Location:** After `GetClientHandlers()` generation (around line 469).

```javascript
// GetClientEffects method - returns JavaScript effect callbacks
if (component.clientEffects && component.clientEffects.length > 0) {
  lines.push('');
  lines.push('    /// <summary>');
  lines.push('    /// Returns JavaScript callbacks for useEffect hooks');
  lines.push('    /// These execute in the browser with bound hook context');
  lines.push('    /// </summary>');
  lines.push('    protected override Dictionary<string, EffectDefinition> GetClientEffects()');
  lines.push('    {');
  lines.push('        return new Dictionary<string, EffectDefinition>');
  lines.push('        {');

  for (let i = 0; i < component.clientEffects.length; i++) {
    const effect = component.clientEffects[i];

    // Escape JavaScript for C# string literal
    const escapedJs = escapeForCSharpString(effect.jsCode);

    // Extract dependency names from array
    const deps = [];
    if (effect.dependencies && t.isArrayExpression(effect.dependencies)) {
      for (const dep of effect.dependencies.elements) {
        if (t.isIdentifier(dep)) {
          deps.push(`"${dep.name}"`);
        }
      }
    }
    const depsArray = deps.length > 0 ? deps.join(', ') : '';

    const comma = i < component.clientEffects.length - 1 ? ',' : '';

    lines.push(`            ["${effect.name}"] = new EffectDefinition`);
    lines.push(`            {`);
    lines.push(`                Callback = @"${escapedJs}",`);
    lines.push(`                Dependencies = new[] { ${depsArray} }`);
    lines.push(`            }${comma}`);
  }

  lines.push('        };');
  lines.push('    }');
}
```

### 4.2 Add `escapeForCSharpString` Helper

**Purpose:** Properly escape JavaScript code for C# verbatim strings.

```javascript
/**
 * Escape JavaScript code for embedding in C# @"..." verbatim string
 * - Escape quotes: " → ""
 * - Preserve newlines
 * - Handle backslashes
 */
function escapeForCSharpString(jsCode) {
  return jsCode
    .replace(/\\/g, '\\\\')    // Escape backslashes
    .replace(/"/g, '""')       // Escape quotes (C# verbatim string)
    .replace(/\r/g, '')        // Remove carriage returns
    .replace(/\n/g, '\\n');    // Preserve newlines
}
```

### 4.3 Update `GetClientHandlers()` Generation

**Enhance existing handler generation to use the new transformation:**

```javascript
// GetClientHandlers method - returns JavaScript code for client-only event handlers
if (component.clientHandlers && component.clientHandlers.length > 0) {
  lines.push('');
  lines.push('    /// <summary>');
  lines.push('    /// Returns JavaScript event handlers for client-side execution');
  lines.push('    /// These execute in the browser with bound hook context');
  lines.push('    /// </summary>');
  lines.push('    protected override Dictionary<string, string> GetClientHandlers()');
  lines.push('    {');
  lines.push('        return new Dictionary<string, string>');
  lines.push('        {');

  for (let i = 0; i < component.clientHandlers.length; i++) {
    const handler = component.clientHandlers[i];

    // Escape JavaScript for C# string
    const escapedJs = escapeForCSharpString(handler.jsCode);

    const comma = i < component.clientHandlers.length - 1 ? ',' : '';
    lines.push(`            ["${handler.name}"] = @"${escapedJs}"${comma}`);
  }

  lines.push('        };');
  lines.push('    }');
}
```

---

## Phase 5: C# Runtime Support

### 5.1 Add `EffectDefinition` Class

**File:** `src/Minimact.AspNetCore/Core/MinimactComponent.cs`

**Add new class:**
```csharp
/// <summary>
/// Client-side effect definition (useEffect)
/// </summary>
public class EffectDefinition
{
    /// <summary>
    /// JavaScript callback function (as string)
    /// Will be executed in browser with bound hook context
    /// </summary>
    public string Callback { get; set; } = "";

    /// <summary>
    /// Dependency array (state keys that trigger re-execution)
    /// Empty array = run once on mount
    /// null/undefined = run on every render
    /// </summary>
    public string[] Dependencies { get; set; } = Array.Empty<string>();
}
```

### 5.2 Add `GetClientEffects()` Virtual Method

**In `MinimactComponent.cs`:**

```csharp
/// <summary>
/// Returns client-side effect definitions (JavaScript callbacks)
/// Override this method in generated components to provide useEffect implementations
/// </summary>
/// <returns>Dictionary mapping effect IDs to effect definitions</returns>
protected internal virtual Dictionary<string, EffectDefinition> GetClientEffects()
{
    return new Dictionary<string, EffectDefinition>();
}
```

---

## Phase 6: MinimactPageRenderer Updates

### 6.1 Generate Effects in Constructor Options

**File:** `src/Minimact.AspNetCore/Rendering/MinimactPageRenderer.cs`

**Update `GeneratePageHtml` method:**

```csharp
private string GeneratePageHtml(
    MinimactComponent component,
    string componentHtml,
    string title,
    string viewModelJson,
    MinimactPageRenderOptions options)
{
    var scriptSrc = options.ClientScriptPath ?? "/js/minimact.js";
    var clientHandlers = component.GetClientHandlers();
    var clientEffects = component.GetClientEffects();

    // ... existing head content ...

    return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{EscapeHtml(title)}</title>
    <script src=""{EscapeHtml(scriptSrc)}""></script>
    {extensionScripts}
</head>
<body>
    <div id=""minimact-root"" data-minimact-component=""{component.ComponentId}"">{componentHtml}</div>

    <script id=""minimact-viewmodel"" type=""application/json"">
{viewModelJson}
    </script>

    <script>
        window.__MINIMACT_VIEWMODEL__ = JSON.parse(
            document.getElementById('minimact-viewmodel').textContent
        );

        window.MinimactHandlers = window.MinimactHandlers || {{}};
{GenerateClientHandlersScript(component)}

        const minimact = new Minimact.Minimact('#minimact-root', {{
            componentId: '{component.ComponentId}',
            handlers: [
{GenerateHandlerConfigs(component, clientHandlers)}
            ],
            effects: [
{GenerateEffectConfigs(clientEffects)}
            ]
        }});

        minimact.start();
    </script>
</body>
</html>";
}
```

### 6.2 Add `GenerateHandlerConfigs` Method

**Purpose:** Generate handler configurations with pre-computed DOM paths.

```csharp
/// <summary>
/// Generate handler configurations with DOM paths
/// Walks VNode tree, finds onClick/onChange handlers, converts hex paths to DOM indices
/// </summary>
private string GenerateHandlerConfigs(MinimactComponent component, Dictionary<string, string> clientHandlers)
{
    if (clientHandlers == null || clientHandlers.Count == 0)
    {
        return string.Empty;
    }

    var handlers = new List<string>();
    var vnode = component.CurrentVNode;
    var pathConverter = new PathConverter(vnode);

    // Walk VNode tree to find event handlers
    WalkVNodeForHandlers(vnode, "", (node, hexPath) =>
    {
        foreach (var prop in node.Props)
        {
            // Check for event handlers (onClick, onChange, onSubmit, etc.)
            if (prop.Key.StartsWith("on") && char.IsUpper(prop.Key[2]))
            {
                var handlerName = prop.Value?.ToString();
                if (handlerName != null && clientHandlers.ContainsKey(handlerName))
                {
                    var jsCode = clientHandlers[handlerName];

                    // Convert hex path → DOM indices
                    var domPath = pathConverter.HexPathToDomPath(hexPath);
                    var domPathJson = System.Text.Json.JsonSerializer.Serialize(domPath);

                    // Extract event type (onClick → click, onChange → change)
                    var eventType = prop.Key.Substring(2).ToLowerInvariant();

                    // Escape JavaScript for embedding
                    var escapedJs = jsCode
                        .Replace("\\", "\\\\")
                        .Replace("\"", "\\\"")
                        .Replace("\n", "\\n");

                    handlers.Add($@"                {{
                    domPath: {domPathJson},
                    eventType: ""{eventType}"",
                    jsCode: {jsCode}
                }}");
                }
            }
        });
    });

    return string.Join(",\n", handlers);
}

/// <summary>
/// Walk VNode tree and execute callback for each node with its hex path
/// </summary>
private void WalkVNodeForHandlers(VNode node, string currentPath, Action<VNode, string> callback)
{
    if (node == null) return;

    // Get hex path for this node
    var hexPath = node.Path ?? currentPath;

    // Execute callback for this node
    callback(node, hexPath);

    // Recurse into children
    if (node.Children != null)
    {
        foreach (var child in node.Children)
        {
            WalkVNodeForHandlers(child, hexPath, callback);
        }
    }
}
```

### 6.3 Add `GenerateEffectConfigs` Method

**Purpose:** Generate effect configurations (no DOM paths needed).

```csharp
/// <summary>
/// Generate effect configurations
/// Effects don't need DOM paths - they just execute with hook context
/// </summary>
private string GenerateEffectConfigs(Dictionary<string, EffectDefinition> clientEffects)
{
    if (clientEffects == null || clientEffects.Count == 0)
    {
        return string.Empty;
    }

    var effects = new List<string>();

    foreach (var effect in clientEffects)
    {
        var depsJson = System.Text.Json.JsonSerializer.Serialize(effect.Value.Dependencies);

        effects.Add($@"                {{
                    callback: {effect.Value.Callback},
                    dependencies: {depsJson}
                }}");
    }

    return string.Join(",\n", effects);
}
```

---

## Phase 7: Testing Strategy

### 7.1 Unit Tests for Babel Transformations

**Test file:** `src/babel-plugin-minimact/test/client-execution.test.js`

**Test cases:**

```javascript
describe('Client-side Effect Transformation', () => {
  it('should transform arrow function to regular function', () => {
    const input = `
      useEffect(() => {
        console.log('test');
      }, []);
    `;

    const output = transform(input);

    expect(output).toContain('function()');
    expect(output).not.toContain('=>');
  });

  it('should inject hook mappings at top', () => {
    const input = `
      useEffect(() => {
        const [count, setCount] = useState('count');
        setCount(5);
      }, []);
    `;

    const output = transform(input);

    expect(output).toContain('const useState = this.useState;');
  });

  it('should preserve async effects', () => {
    const input = `
      useEffect(async () => {
        const data = await fetch('/api/data');
        setData(data);
      }, []);
    `;

    const output = transform(input);

    expect(output).toContain('async function()');
  });

  it('should preserve cleanup functions', () => {
    const input = `
      useEffect(() => {
        const timer = setInterval(() => {}, 1000);
        return () => clearInterval(timer);
      }, []);
    `;

    const output = transform(input);

    expect(output).toContain('return () => clearInterval(timer)');
  });

  it('should track dependencies correctly', () => {
    const input = `
      useEffect(() => {
        console.log(count);
      }, [count, name]);
    `;

    const component = extractComponent(input);

    expect(component.clientEffects[0].dependencies).toHaveLength(2);
  });

  it('should handle effects with no hooks', () => {
    const input = `
      useEffect(() => {
        document.title = 'Hello';
      }, []);
    `;

    const output = transform(input);

    // Should not inject hook mappings if none are used
    expect(output).not.toContain('const useState = this.useState');
  });
});

describe('Client-side Handler Transformation', () => {
  it('should transform handler arrow function', () => {
    const input = `
      <button onClick={(e) => setCount(count + 1)}>Click</button>
    `;

    const output = transform(input);

    expect(output).toContain('function(e)');
  });

  it('should inject hook mappings for handlers with state', () => {
    const input = `
      <button onClick={() => {
        const [count, setCount] = useState('count');
        setCount(count + 1);
      }}>Click</button>
    `;

    const output = transform(input);

    expect(output).toContain('const useState = this.useState;');
  });

  it('should preserve event parameter', () => {
    const input = `
      <button onClick={(e) => {
        e.preventDefault();
        handleClick();
      }}>Click</button>
    `;

    const output = transform(input);

    expect(output).toContain('function(e)');
    expect(output).toContain('e.preventDefault()');
  });
});
```

### 7.2 Integration Tests

**Test scenarios:**

1. **Basic Counter Component**
   - Verify handler generates both C# and JavaScript
   - Verify effect generates both C# and JavaScript
   - Test in browser: clicks trigger instant updates

2. **Effect with Cleanup**
   - Timer effect with cleanup function
   - Verify cleanup preserves return statement
   - Test in browser: cleanup runs on unmount

3. **Multiple Effects with Different Dependencies**
   - Effect 1: depends on [count]
   - Effect 2: depends on [name]
   - Effect 3: no dependencies []
   - Verify each tracks dependencies correctly

4. **Handler with Multiple Hook Calls**
   - Handler calls useState multiple times
   - Handler calls useRef
   - Verify all hook mappings injected

### 7.3 End-to-End Tests

**Test full flow:**

1. Write TSX component with effects
2. Run Babel transpiler
3. Verify generated C# has `GetClientEffects()`
4. Build project
5. Load page in browser
6. Verify effects execute
7. Verify handlers execute with instant updates
8. Verify state syncs to server

---

## Phase 8: Migration Guide

### 8.1 Existing Components

**No breaking changes!**
- Existing components continue to work
- `GetClientEffects()` returns empty dictionary by default
- Only components with `useEffect` will generate client effects

### 8.2 Opt-in Enhancement

Developers don't need to do anything:
- Add `useEffect` in TSX
- Babel automatically generates client-side code
- Effects execute in browser automatically

---

## Phase 9: Performance Considerations

### 9.1 Bundle Size Impact

**Before:**
- Initial HTML: ~10KB
- Client runtime: ~20KB

**After:**
- Initial HTML: +2KB per effect (JavaScript code embedded)
- Client runtime: No change (execution logic already exists)

**Mitigation:**
- Minify JavaScript in production
- Compress with gzip (80% reduction)
- Effects only added if component uses them

### 9.2 Execution Performance

**Effect execution:**
- Bound once at initialization: ~0.1ms per effect
- Execution: Native JavaScript speed
- No overhead vs. hand-written code

**Handler execution:**
- Bound once at attachment: ~0.1ms per handler
- Event listener: Native browser performance
- Template patches: 0-5ms (existing system)

---

## Phase 10: Documentation Updates

### 10.1 Update Developer Documentation

**Files to update:**
1. `docs/hooks-api.md` - Document that effects run client-side
2. `docs/babel-plugin.md` - Explain transformation process
3. `docs/getting-started.md` - Show effect examples

### 10.2 Add Code Comments

**In Babel plugin:**
- Explain why arrow → regular function
- Document hook mapping injection
- Link to architecture document

**In generated C#:**
- Comment explaining `GetClientEffects()` purpose
- Note that JavaScript executes in browser

---

## Implementation Checklist

### Phase 1: Data Structures ✅
- [ ] Add `clientEffects` array to component object
- [ ] Define effect definition structure
- [ ] Update TypeScript interfaces

### Phase 2: Effect Extraction ✅
- [ ] Implement `analyzeHookUsage()`
- [ ] Implement `transformEffectCallback()`
- [ ] Update `extractUseEffect()` to generate client effects
- [ ] Handle edge cases (async, cleanup, no deps)

### Phase 3: Handler Enhancement ✅
- [ ] Implement `transformHandlerFunction()`
- [ ] Update `extractEventHandler()` to generate client code
- [ ] Ensure both client and server handlers generated

### Phase 4: C# Generation ✅
- [ ] Generate `GetClientEffects()` method
- [ ] Implement `escapeForCSharpString()`
- [ ] Update `GetClientHandlers()` generation

### Phase 5: C# Runtime ✅
- [ ] Add `EffectDefinition` class
- [ ] Add `GetClientEffects()` virtual method
- [ ] Update base component

### Phase 6: Page Renderer ✅
- [ ] Implement `GenerateHandlerConfigs()`
- [ ] Implement `GenerateEffectConfigs()`
- [ ] Implement `WalkVNodeForHandlers()`
- [ ] Update `GeneratePageHtml()`

### Phase 7: Testing ✅
- [ ] Write unit tests for transformations
- [ ] Write integration tests
- [ ] End-to-end browser tests
- [ ] Performance benchmarks

### Phase 8: Documentation ✅
- [ ] Update API documentation
- [ ] Add examples
- [ ] Migration guide
- [ ] Architecture document (✅ already created)

---

## Example: Complete Transformation

### Input TSX:
```typescript
export function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('Count changed:', count);

    const timer = setInterval(() => {
      setCount(count + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [count]);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

### Generated C#:
```csharp
[Component]
public class Counter : MinimactComponent
{
    [State] private int count = 0;

    [OnStateChanged("count")]
    private void Effect_0()
    {
        Console.WriteLine($"Count changed: {count}");
    }

    public void HandleClick_10000000()
    {
        count++;
        SetState("count", count);
    }

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);
        return new VElement("button", new() { ["onClick"] = "HandleClick_10000000" })
        {
            Path = "10000000",
            Children = new List<VNode> { new VText($"Count: {count}") }
        };
    }

    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["HandleClick_10000000"] = @"function() {
                const useState = this.useState;
                const [count, setCount] = useState('count');
                setCount(count + 1);
            }"
        };
    }

    protected override Dictionary<string, EffectDefinition> GetClientEffects()
    {
        return new Dictionary<string, EffectDefinition>
        {
            ["Effect_0"] = new EffectDefinition
            {
                Callback = @"function() {
                    const useState = this.useState;
                    const [count, setCount] = useState('count');

                    console.log('Count changed:', count);

                    const timer = setInterval(() => {
                        setCount(count + 1);
                    }, 1000);

                    return () => clearInterval(timer);
                }",
                Dependencies = new[] { "count" }
            }
        };
    }
}
```

### Generated HTML:
```html
<div id="minimact-root">
  <button>Count: 0</button>
</div>

<script>
  const minimact = new Minimact.Minimact('#minimact-root', {
    componentId: 'Counter_abc123',

    handlers: [
      {
        domPath: [0],
        eventType: "click",
        jsCode: function() {
          const useState = this.useState;
          const [count, setCount] = useState('count');
          setCount(count + 1);
        }
      }
    ],

    effects: [
      {
        callback: function() {
          const useState = this.useState;
          const [count, setCount] = useState('count');

          console.log('Count changed:', count);

          const timer = setInterval(() => {
            setCount(count + 1);
          }, 1000);

          return () => clearInterval(timer);
        },
        dependencies: ["count"]
      }
    ]
  });

  minimact.start();
</script>
```

---

## Summary

This implementation plan provides:

✅ **Complete transformation pipeline** - TSX → C# + JavaScript
✅ **Zero pollution** - No DOM attributes, no global variables
✅ **Hook context binding** - `.bind(this)` provides useState, useRef, etc.
✅ **Template patch integration** - Instant updates with pre-computed patches
✅ **State synchronization** - Client changes sync to server automatically
✅ **Clean architecture** - Everything scoped to component instance

The result: **React DX with server-side rendering and instant client-side execution.**
