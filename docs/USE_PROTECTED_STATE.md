# useProtectedState Hook

> **Lifted state with encapsulation - state that parents can't touch**
>
> **Date:** 2025-01-10

---

## Overview

`useProtectedState` is a hook that creates **lifted state with access control**. The state is lifted to the parent's State dictionary (for debugging, prediction, and time travel), but **the parent cannot read or write it** via the state proxy.

This provides **encapsulation** for child components while maintaining full state visibility for tooling.

---

## Problem: Public Lifted State

With regular `useState`, **all child state is public** to the parent:

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  const [animationQueue, setQueue] = useState([]);  // Internal implementation detail
}

// Parent can access EVERYTHING
function App() {
  const count = state["Counter.count"];              // ✅ Public API
  const queue = state["Counter.animationQueue"];     // ❌ Internal implementation!

  // Parent can accidentally break child internals:
  setState("Counter.animationQueue", []);            // 💥 Breaks Counter!
}
```

**Problems:**
- ❌ Parent can break child internals
- ❌ No encapsulation boundary
- ❌ Refactoring child breaks parent

---

## Solution: useProtectedState

```tsx
import { useState, useProtectedState } from '@minimact/core';

function Counter() {
  // Public state (parent can access)
  const [count, setCount] = useState(0);

  // Protected state (parent CANNOT access)
  const [animationQueue, setQueue] = useProtectedState([]);
}

// Parent component
function App() {
  const count = state["Counter.count"];              // ✅ Works (public)

  const queue = state["Counter.animationQueue"];     // ❌ Runtime error!
  // Error: Cannot access protected state "Counter.animationQueue"

  setState("Counter.animationQueue", []);            // ❌ Runtime error!
  // Error: Cannot modify protected state "Counter.animationQueue"
}
```

**Benefits:**
- ✅ Parent can't break child internals
- ✅ Clear public API boundary
- ✅ Safe refactoring (protected state is private contract)

---

## How It Works

### 1. State is Still Lifted (Full Visibility)

```csharp
// Parent's State dictionary contains EVERYTHING:
{
    "Counter.count": 5,                    // Public
    "Counter.animationQueue": [...]        // Protected (lifted but blocked)
}
```

**Why lift protected state?**
- DevTools can see it
- Time travel works
- Prediction system can use it
- Debugging shows full state tree

### 2. Access Control at Runtime

When parent tries to access protected state:

```csharp
// MinimactComponent.GetState<T>()
if (StateNamespace == null && IsProtectedKey(key))
{
    throw new InvalidOperationException(
        $"Cannot access protected state: {key}. " +
        $"This state was declared with useProtectedState() and is " +
        $"only accessible within the child component."
    );
}
```

### 3. Child Can Access Normally

```tsx
function Counter() {
  const [queue, setQueue] = useProtectedState([]);

  // Child accesses via GetState (with namespace prefix)
  const q = queue;           // ✅ Works
  setQueue([...queue, 1]);   // ✅ Works
}
```

---

## API

### useProtectedState(initialValue)

Creates protected lifted state.

**Parameters:**
- `initialValue` - Initial state value (any type)

**Returns:**
- `[value, setValue]` - State value and setter (same as useState)

**Behavior:**
- State is lifted to parent's State dictionary
- Parent cannot read via `state["Child.key"]`
- Parent cannot write via `setState("Child.key", value)`
- Child can read/write normally
- Triggers parent re-render on change (just like useState)

---

## Use Cases

### 1. Internal Caches

```tsx
function DataGrid() {
  // Public state
  const [data, setData] = useState([]);
  const [sortOrder, setSortOrder] = useState("asc");

  // Protected cache (parent doesn't need to know)
  const [sortCache, setSortCache] = useProtectedState({});
  const [filterCache, setFilterCache] = useProtectedState({});
}
```

### 2. Animation State

```tsx
function AnimatedCounter() {
  // Public state
  const [count, setCount] = useState(0);

  // Protected animation internals
  const [animationQueue, setQueue] = useProtectedState([]);
  const [tweenState, setTween] = useProtectedState(null);
}
```

### 3. Debounce/Throttle Timers

```tsx
function SearchInput() {
  // Public state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  // Protected debounce timer
  const [debounceTimer, setTimer] = useProtectedState(null);

  const handleInput = (value: string) => {
    setQuery(value);

    // Clear existing timer
    if (debounceTimer) clearTimeout(debounceTimer);

    // Set new timer
    const timer = setTimeout(() => fetchResults(value), 300);
    setTimer(timer);
  };
}
```

### 4. Validation State

```tsx
function ComplexForm() {
  // Public state (parent observes)
  const [email, setEmail] = useState("");
  const [isValid, setIsValid] = useState(false);

  // Protected validation internals
  const [validationCache, setCache] = useProtectedState({});
  const [lastValidated, setLastValidated] = useProtectedState(0);

  const validateEmail = (value: string) => {
    // Check cache
    if (validationCache[value] !== undefined) {
      setIsValid(validationCache[value]);
      return;
    }

    // Validate and cache
    const valid = value.includes('@');
    setCache({ ...validationCache, [value]: valid });
    setIsValid(valid);
    setLastValidated(Date.now());
  };
}
```

---

## Design Principles

### Public vs Protected State

**Use `useState` (public) when:**
- Parent needs to observe the value
- Parent needs to reset/control the value
- Sibling components coordinate via this state
- State is part of component's public API

**Use `useProtectedState` (protected) when:**
- Implementation detail (caches, buffers, timers)
- Parent should never touch it
- Refactoring this state shouldn't break parent
- Internal optimization state

### Example: Todo List

```tsx
function TodoList() {
  // ✅ Public - parent can observe/control
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState("all");

  // ✅ Protected - internal implementation
  const [renderCache, setCache] = useProtectedState({});
  const [scrollPosition, setScroll] = useProtectedState(0);
}
```

**Parent can:**
- ✅ Read: `state["TodoList.todos"]`
- ✅ Write: `setState("TodoList.todos", [])`
- ✅ Read: `state["TodoList.filter"]`

**Parent cannot:**
- ❌ Read: `state["TodoList.renderCache"]`
- ❌ Write: `setState("TodoList.scrollPosition", 0)`

---

## TypeScript Support

```typescript
function Counter() {
  // Type inference works
  const [count, setCount] = useState(0);              // number
  const [queue, setQueue] = useProtectedState<number[]>([]);  // number[]

  // Type-safe setter
  setCount(5);        // ✅ OK
  setCount("5");      // ❌ Type error

  setQueue([1, 2]);   // ✅ OK
  setQueue([1, "2"]); // ❌ Type error
}
```

---

## Transpilation

### TypeScript Input

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  const [queue, setQueue] = useProtectedState([]);

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

### Generated C#

```csharp
public partial class Counter : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // Regular useState
        var count = GetState<int>("count");

        // useProtectedState (identical access, protection enforced at runtime)
        var queue = GetState<List<dynamic>>("queue");

        return new VElement("button", "1",
            new Dictionary<string, object> { ["data-minimact-onclick"] = "Handle_1_onClick" },
            new VText("1:0", $"Count: {count}")
        );
    }

    public void Handle_1_onClick()
    {
        var count = GetState<int>("count");
        SetState("count", count + 1);
    }
}
```

### VComponentWrapper

```csharp
// Parent component
new VComponentWrapper
{
    ComponentName = "Counter",
    ComponentType = "Counter",
    HexPath = "1.2",
    InitialState = new Dictionary<string, object>
    {
        ["count"] = 0,          // Public
        ["queue"] = new List<dynamic>()  // Protected
    },
    ProtectedKeys = new HashSet<string> { "queue" },  // ← Protection marker
    ParentComponent = this
}
```

---

## Comparison: useState vs useProtectedState

| Feature | useState | useProtectedState |
|---------|----------|-------------------|
| Lifted to parent | ✅ Yes | ✅ Yes |
| Parent can read | ✅ Yes | ❌ No (runtime error) |
| Parent can write | ✅ Yes | ❌ No (runtime error) |
| Child can read | ✅ Yes | ✅ Yes |
| Child can write | ✅ Yes | ✅ Yes |
| Triggers parent re-render | ✅ Yes | ✅ Yes |
| Visible in DevTools | ✅ Yes | ✅ Yes |
| Used in prediction | ✅ Yes | ✅ Yes |
| Time travel works | ✅ Yes | ✅ Yes |
| Encapsulation | ❌ No | ✅ Yes |

---

## Summary

`useProtectedState` provides **the best of both worlds**:

1. **Full state lifting** - DevTools, prediction, time travel all work
2. **Encapsulation** - Parent can't break child internals
3. **Clear boundaries** - Public API vs private implementation
4. **Safe refactoring** - Change protected state without breaking parent

**Use it for:**
- Internal caches
- Animation state
- Debounce/throttle timers
- Validation internals
- Any state that's an implementation detail

**Rule of thumb:**
> If the parent shouldn't touch it, use `useProtectedState`.

---

**Status:** 🟡 Designed (not yet implemented)

**Related Docs:**
- [Lifted State Component System](./LIFTED_STATE_COMPONENT_SYSTEM.md)
- [Lifted State C# Output](./LIFTED_STATE_CSHARP_OUTPUT.md)
