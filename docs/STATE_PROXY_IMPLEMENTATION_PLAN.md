# State Proxy Implementation Plan

> **Problem:** TypeScript/IntelliSense needs a typed `state` object for accessing component state (including lifted child state), but the Babel plugin also needs to transpile it correctly to C# `State` property access.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Architecture](#architecture)
4. [Implementation Details](#implementation-details)
5. [Type Safety](#type-safety)
6. [Babel Plugin Integration](#babel-plugin-integration)
7. [Examples](#examples)
8. [Edge Cases](#edge-cases)

---

## Problem Statement

### Current Issue

In lifted state components, the parent needs to access child state using namespaced keys:

```tsx
// Parent component
export default function Dashboard() {
  // ❌ Problem: 'state' is not defined - no IntelliSense!
  const userLoading = state["UserProfile.isLoading"];
  const cartLoading = state["ShoppingCart.isLoading"];

  return (
    <div>
      {userLoading && <div>Loading...</div>}

      <Component name="UserProfile" state={{ isLoading: false }}>
        <UserProfile />
      </Component>
    </div>
  );
}
```

### Why We Need This

1. **IntelliSense** - TypeScript needs to provide autocomplete and type checking
2. **Compile-time validation** - Catch typos and type mismatches
3. **Babel transpilation** - Must convert to C# `State["key"]` property access
4. **Consistency** - Same pattern for accessing own state and child state

---

## Solution Overview

### Create a Typed State Proxy

```tsx
import { state } from 'minimact';

export default function Dashboard() {
  // ✅ Works: state is a typed proxy object
  const userLoading = state["UserProfile.isLoading"];  // boolean
  const cartTotal = state["ShoppingCart.total"];       // number
  const myOwnState = state.localValue;                 // any

  return <div>{userLoading && <div>Loading...</div>}</div>;
}
```

### Key Features

- **Runtime no-op** - Doesn't execute on client (transpiled away)
- **Type-safe** - Provides IntelliSense for known state keys
- **Babel-aware** - Special handling during transpilation
- **Zero overhead** - No runtime cost in generated C#

---

## Architecture

### Client-Side Export (for TypeScript)

**File:** `src/client-runtime/src/state-proxy.ts`

```typescript
/**
 * State proxy for TypeScript IntelliSense
 *
 * This is a compile-time construct that gets transpiled to C# State property access.
 * It NEVER executes at runtime - the Babel plugin removes it during transpilation.
 *
 * @example
 * import { state } from 'minimact';
 *
 * const value = state.myKey;              // → State["myKey"] in C#
 * const childValue = state["Child.key"];  // → State["Child.key"] in C#
 */
export const state = new Proxy<Record<string, any>>({}, {
  get(target, prop) {
    // This code NEVER runs - it's replaced by Babel plugin
    throw new Error(
      `[Minimact] 'state' proxy is a compile-time construct. ` +
      `If you're seeing this error, the Babel plugin failed to transpile. ` +
      `Key accessed: ${String(prop)}`
    );
  }
});

/**
 * Type-safe state access with lifted state support
 *
 * Define your component state interface for IntelliSense:
 *
 * @example
 * interface MyComponentState {
 *   count: number;
 *   message: string;
 *   "ChildComponent.isOpen": boolean;  // Lifted child state
 * }
 *
 * const typedState = state as ComponentState<MyComponentState>;
 * const count = typedState.count;  // ✅ Type: number
 */
export type ComponentState<T = Record<string, any>> = T;
```

### Export from Main Index

**File:** `src/client-runtime/src/index.ts`

```typescript
// ... existing exports ...

// State proxy (compile-time only)
export { state, ComponentState } from './state-proxy';
export type { ComponentState as State } from './state-proxy';
```

---

## Implementation Details

### 1. State Proxy Object

The `state` proxy is a **sentinel object** that:
- Provides TypeScript types for IntelliSense
- Throws runtime errors if accidentally executed
- Gets completely replaced by Babel plugin

```typescript
// Client-side (TypeScript)
const value = state.myKey;

// ↓ Babel transpiles to ↓

// Server-side (C#)
var value = State["myKey"];
```

### 2. Babel Plugin Detection

**File:** `src/babel-plugin-minimact/src/generators/expressions.cjs`

Add special handling for `state` identifier:

```javascript
function generateCSharpExpression(node, component, indent) {
  // ... existing code ...

  // Special case: 'state' identifier (state proxy)
  if (t.isIdentifier(node) && node.name === 'state') {
    // Check if this is a member expression like state.foo or state["Child.foo"]
    // Should not be transpiled on its own - only as part of member expression
    console.warn('[Babel] Naked state reference detected - should be state.key or state["key"]');
    return 'State';
  }

  // Special case: state.key or state["key"]
  if (t.isMemberExpression(node) &&
      t.isIdentifier(node.object, { name: 'state' })) {

    if (node.computed) {
      // state["someKey"] → State["someKey"]
      const key = generateCSharpExpression(node.property, component, indent);
      return `State[${key}]`;
    } else {
      // state.someKey → State["someKey"]
      const key = node.property.name;
      return `State["${key}"]`;
    }
  }

  // ... rest of existing code ...
}
```

### 3. Import Detection

The Babel plugin should detect if `state` is imported from 'minimact':

```javascript
// In index-full.cjs or visitor setup
Program: {
  enter(path, state) {
    // Track state proxy import
    const imports = path.node.body.filter(n => t.isImportDeclaration(n));

    imports.forEach(importDecl => {
      if (importDecl.source.value === 'minimact') {
        importDecl.specifiers.forEach(spec => {
          if (t.isImportSpecifier(spec) && spec.imported.name === 'state') {
            state.file.metadata.usesStateProxy = true;
          }
        });
      }
    });
  }
}
```

---

## Type Safety

### Basic Usage

```tsx
import { state } from 'minimact';

export default function MyComponent() {
  // Untyped - any key allowed
  const value = state.anything;  // Type: any

  return <div>{value}</div>;
}
```

### Typed Usage (Advanced)

```tsx
import { state, ComponentState } from 'minimact';

interface MyState {
  count: number;
  message: string;
  isOpen: boolean;
  // Lifted child state
  "ChildComponent.value": string;
  "ChildComponent.isValid": boolean;
}

export default function MyComponent() {
  const typedState = state as ComponentState<MyState>;

  // ✅ Full IntelliSense support
  const count = typedState.count;  // Type: number
  const childValue = typedState["ChildComponent.value"];  // Type: string

  // ❌ TypeScript error: Property 'typo' does not exist
  // const oops = typedState.typo;

  return <div>{count}</div>;
}
```

### With Lifted State

```tsx
import { state, ComponentState } from 'minimact';

interface DashboardState {
  // Parent's own state
  theme: "light" | "dark";

  // Child component states (lifted)
  "UserProfile.isEditing": boolean;
  "UserProfile.username": string;
  "ShoppingCart.items": Array<any>;
  "ShoppingCart.total": number;
}

export default function Dashboard() {
  const s = state as ComponentState<DashboardState>;

  // ✅ Type-safe child state access
  const isEditing = s["UserProfile.isEditing"];  // boolean
  const cartTotal = s["ShoppingCart.total"];     // number

  return (
    <div>
      {isEditing && <div>Editing...</div>}
      <div>Cart Total: ${cartTotal}</div>

      <Component name="UserProfile" state={{ isEditing: false, username: "" }}>
        <UserProfile />
      </Component>

      <Component name="ShoppingCart" state={{ items: [], total: 0 }}>
        <ShoppingCart />
      </Component>
    </div>
  );
}
```

---

## Babel Plugin Integration

### Transformation Examples

#### Example 1: Simple Property Access

```tsx
// Input (TSX)
const count = state.count;

// Output (C#)
var count = State["count"];
```

#### Example 2: Computed Property (Lifted State)

```tsx
// Input (TSX)
const userLoading = state["UserProfile.isLoading"];

// Output (C#)
var userLoading = State["UserProfile.isLoading"];
```

#### Example 3: Nested Access

```tsx
// Input (TSX)
const items = state["ShoppingCart.items"];
const count = items.length;

// Output (C#)
var items = State["ShoppingCart.items"];
var count = items.Length;
```

#### Example 4: In Expressions

```tsx
// Input (TSX)
const anyLoading = state["User.loading"] || state["Cart.loading"];

// Output (C#)
var anyLoading = ((State["User.loading"]) ?? (State["Cart.loading"]));
```

### Error Cases

```tsx
// ❌ Naked state reference (should warn)
const x = state;  // No member access

// ❌ Calling state as function (error)
const x = state();

// ✅ Valid usages
const a = state.key;
const b = state["key"];
const c = state["Namespace.key"];
```

---

## Examples

### Example 1: Simple Component

```tsx
import { useState, state } from 'minimact';

export default function Counter() {
  const [count, setCount] = useState(0);

  // Can also access via state proxy
  const currentCount = state.count;

  return (
    <div>
      <span>{currentCount}</span>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

**Transpiles to:**

```csharp
public partial class Counter : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var count = State.TryGetValue("count", out var count_val)
            ? (int)count_val
            : 0;

        // Can also access via State proxy
        var currentCount = State["count"];

        return new VElement("div", "1", /*...*/);
    }

    public void Handle_1_2_onClick()
    {
        var count = State["count"];
        SetState("count", count + 1);
    }
}
```

### Example 2: Lifted State (Parent Observing Children)

```tsx
import { state } from 'minimact';

export function UserProfile() {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <div>
      <button onClick={() => setIsLoading(true)}>Load</button>
      {isLoading && <span>Loading...</span>}
    </div>
  );
}

export default function Dashboard() {
  // Parent observes child state
  const userLoading = state["UserProfile.isLoading"];
  const cartLoading = state["ShoppingCart.isLoading"];
  const anyLoading = userLoading || cartLoading;

  return (
    <div>
      {anyLoading && <div className="overlay">Loading...</div>}

      <Component name="UserProfile" state={{ isLoading: false }}>
        <UserProfile />
      </Component>

      <Component name="ShoppingCart" state={{ isLoading: false }}>
        <ShoppingCart />
      </Component>
    </div>
  );
}
```

**Transpiles to:**

```csharp
public partial class Dashboard : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // Parent observes child state
        var userLoading = State["UserProfile.isLoading"];
        var cartLoading = State["ShoppingCart.isLoading"];
        var anyLoading = ((userLoading) ?? (cartLoading));

        return new VElement("div", "1", /*...*/
            (new MObject(anyLoading))
                ? new VElement("div", /*...*/)
                : new VNull("1.1"),
            new VComponentWrapper
            {
                ComponentName = "UserProfile",
                ComponentType = "UserProfile",
                HexPath = "1.2",
                InitialState = new Dictionary<string, object> { ["isLoading"] = false }
            },
            new VComponentWrapper
            {
                ComponentName = "ShoppingCart",
                ComponentType = "ShoppingCart",
                HexPath = "1.3",
                InitialState = new Dictionary<string, object> { ["isLoading"] = false }
            }
        );
    }
}
```

---

## Edge Cases

### 1. State Not Imported

```tsx
// If 'state' is used but not imported from 'minimact'
export default function BadComponent() {
  const value = state.key;  // ❌ ReferenceError or undefined
}
```

**Babel Plugin Behavior:**
- Warn if `state` identifier used but not imported from 'minimact'
- Transpile anyway (might be from different source)

### 2. Shadowed State Variable

```tsx
import { state as globalState } from 'minimact';

export default function MyComponent() {
  const state = { local: true };  // Shadows imported state

  const local = state.local;      // Uses local variable
  const global = globalState.key; // Uses imported state
}
```

**Babel Plugin Behavior:**
- Track variable scope
- Only transpile `state` if it refers to the imported identifier
- Local variables named `state` are left as-is

### 3. Dynamic Keys

```tsx
export default function MyComponent() {
  const key = "dynamic";
  const value = state[key];  // Dynamic computed property
}
```

**Babel Plugin Behavior:**
- Transpile to `State[key]` (runtime lookup)
- Works in C# as expected

### 4. Destructuring (Not Supported)

```tsx
// ❌ Not supported - state is a compile-time construct
const { count, message } = state;
```

**Babel Plugin Behavior:**
- Error: Cannot destructure state proxy
- Must use explicit property access

---

## Implementation Checklist

### Phase 1: Basic State Proxy (30 minutes)

- [ ] Create `src/client-runtime/src/state-proxy.ts`
- [ ] Export `state` proxy object with Proxy trap
- [ ] Export `ComponentState<T>` type
- [ ] Add exports to `src/client-runtime/src/index.ts`
- [ ] Build client-runtime

### Phase 2: Babel Plugin Integration (1 hour)

- [ ] Add `state` identifier detection in `expressions.cjs`
- [ ] Handle `state.key` member access (non-computed)
- [ ] Handle `state["key"]` member access (computed)
- [ ] Track `state` import from 'minimact'
- [ ] Add warning for naked `state` reference
- [ ] Add error for `state` destructuring

### Phase 3: Testing (30 minutes)

- [ ] Test simple property access: `state.key`
- [ ] Test computed access: `state["key"]`
- [ ] Test lifted state: `state["Child.key"]`
- [ ] Test expressions: `state.a || state.b`
- [ ] Test edge cases (shadowing, dynamic keys)
- [ ] Verify TypeScript IntelliSense works

### Phase 4: Documentation (15 minutes)

- [ ] Update README with state proxy usage
- [ ] Add JSDoc comments to state proxy
- [ ] Document type-safe usage with `ComponentState<T>`
- [ ] Add examples to LIFTED_STATE_COMPONENT_SYSTEM.md

---

## Benefits

### ✅ **Developer Experience**
- Full IntelliSense support
- Type-safe state access
- Consistent API (same for own state and child state)

### ✅ **Compile-Time Safety**
- Catch typos before runtime
- Type checking for state values
- Clear error messages

### ✅ **Zero Runtime Cost**
- Proxy never executes (compile-time only)
- No performance overhead
- Clean generated C# code

### ✅ **Lifted State Integration**
- Natural syntax for accessing child state
- No special APIs needed
- Works with existing `<Component>` syntax

---

## Timeline

**Total Estimated Time:** 2-3 hours

1. **Phase 1** (30 min): Create state proxy TypeScript file
2. **Phase 2** (1 hour): Babel plugin integration
3. **Phase 3** (30 min): Testing and validation
4. **Phase 4** (15 min): Documentation
5. **Buffer** (30 min): Edge cases and polish

---

## Success Criteria

- ✅ `import { state } from 'minimact'` provides IntelliSense
- ✅ `state.key` transpiles to `State["key"]` in C#
- ✅ `state["Child.key"]` transpiles to `State["Child.key"]` in C#
- ✅ TypeScript shows errors for undefined keys (with typed state)
- ✅ No runtime overhead (proxy never executes)
- ✅ All existing tests still pass
- ✅ New lifted state fixtures work correctly

---

**Ready to implement?** This will enable full TypeScript support for the lifted state component system! 🚀
