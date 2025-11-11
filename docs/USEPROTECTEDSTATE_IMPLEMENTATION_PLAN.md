# useProtectedState Implementation Plan

> **Protected state for lifted state components - Full encapsulation while maintaining state visibility**
>
> **Date:** 2025-01-10
> **Status:** Planning

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Solution Design](#solution-design)
4. [API Design](#api-design)
5. [Implementation Phases](#implementation-phases)
6. [Technical Specification](#technical-specification)
7. [Examples](#examples)
8. [Testing Strategy](#testing-strategy)
9. [Migration Guide](#migration-guide)

---

## Overview

The `useProtectedState` hook provides **encapsulation** for child component state in the lifted state system, while maintaining **full state visibility** for debugging, prediction, and time travel.

### Key Principles

- ✅ **All state is lifted** to parent's State dictionary (including protected state)
- ✅ **Parent cannot access** protected state via `state["Child.key"]` proxy
- ✅ **Parent cannot modify** protected state via `setState("Child.key", value)`
- ✅ **Child accesses normally** via `const [value, setValue] = useProtectedState(initial)`
- ✅ **Full visibility** for DevTools, prediction, and debugging

---

## Problem Statement

### Current Limitation

With the lifted state system, **all child state is public**:

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  const [internalCache, setCache] = useState({});  // ⚠️ Parent can access this!
}

function Dashboard() {
  const count = state["Counter.count"];           // ✅ Public API
  const cache = state["Counter.internalCache"];   // ⚠️ Should be private!

  // Parent can break child internals
  setState("Counter.internalCache", {});  // 💥 Dangerous!
}
```

### Requirements

1. **Encapsulation** - Child components need private implementation details
2. **State Visibility** - All state must be in parent State dict for prediction/debugging
3. **Clear API** - Explicit hook for declaring protected state
4. **Type Safety** - TypeScript should enforce protection at compile-time
5. **Runtime Safety** - C# should throw helpful errors on violations

---

## Solution Design

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Parent Component State Dictionary                           │
├─────────────────────────────────────────────────────────────┤
│ "Counter.count": 5              ← Public (parent can access)│
│ "Counter.internalCache": {...}  ← Protected (blocked!)      │
│ "Form.email": "test@example.com" ← Public                   │
│ "Form._validationCache": {...}  ← Protected (blocked!)      │
└─────────────────────────────────────────────────────────────┘
                     ▲
                     │ All state lifted here
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────────┐    ┌────────▼────────┐
│ Counter Child    │    │ Form Child      │
├──────────────────┤    ├─────────────────┤
│ count (public)   │    │ email (public)  │
│ cache (protected)│    │ cache (protected)│
└──────────────────┘    └─────────────────┘
```

### Access Control Flow

```
Parent reads state["Counter.internalCache"]
    ↓
GetState("Counter.internalCache") called
    ↓
Check: Is "Counter.internalCache" in ProtectedKeys?
    ↓ Yes
Throw InvalidOperationException
    ↓
❌ Access denied
```

---

## API Design

### TypeScript Hook Signature

```typescript
function useProtectedState<T>(initialValue: T): [T, (value: T | ((prev: T) => T)) => void];
```

### Usage Pattern

```tsx
import { useState, useProtectedState } from '@minimact/core';

function MyComponent() {
  // Public state (parent can access)
  const [publicData, setPublicData] = useState(initialValue);

  // Protected state (parent CANNOT access)
  const [privateData, setPrivateData] = useProtectedState(initialValue);

  return <div>...</div>;
}
```

### Parent Access Rules

```tsx
function ParentComponent() {
  // ✅ ALLOWED: Read public state
  const value = state["Child.publicData"];

  // ✅ ALLOWED: Write public state
  setState("Child.publicData", newValue);

  // ❌ BLOCKED: Read protected state (runtime error)
  const cache = state["Child.privateData"];
  // Error: Cannot access protected state: "Child.privateData"

  // ❌ BLOCKED: Write protected state (runtime error)
  setState("Child.privateData", newValue);
  // Error: Cannot modify protected state: "Child.privateData"
}
```

---

## Implementation Phases

### Phase 1: Babel Plugin Hook Detection (Week 1)

**Goal:** Detect and track `useProtectedState` calls in child components

**Tasks:**
1. Update `src/extractors/hooks.cjs` to detect `useProtectedState`
2. Track protected state in `component.protectedState` Map
3. Add logging for detected protected state
4. Write unit tests for hook detection

**Output:**
```javascript
component.protectedState = new Map([
  ['cache', { initialValue: '{}', index: 0, isProtected: true }],
  ['timer', { initialValue: 'null', index: 1, isProtected: true }]
]);
```

**Acceptance Criteria:**
- ✅ Babel plugin detects `useProtectedState` calls
- ✅ Protected state tracked separately from regular `useState`
- ✅ Console logs show "Found useProtectedState: varName"

---

### Phase 2: VComponentWrapper Generation (Week 1-2)

**Goal:** Generate `VComponentWrapper` with `ProtectedKeys` set

**Tasks:**
1. Update `src/generators/jsx.cjs` `generateComponentWrapper` function
2. Extract protected state keys from `component.protectedState`
3. Generate `ProtectedKeys = new HashSet<string> { ... }` in C# output
4. Update `InitialState` to include protected state values
5. Write integration tests for wrapper generation

**Output:**
```csharp
new VComponentWrapper
{
    ComponentName = "Counter",
    ComponentType = "Counter",
    HexPath = "1.2",
    InitialState = new Dictionary<string, object>
    {
        ["count"] = 0,          // Public
        ["cache"] = new {}      // Protected (lifted but blocked)
    },
    ProtectedKeys = new HashSet<string> { "cache" },
    ParentComponent = this
}
```

**Acceptance Criteria:**
- ✅ `ProtectedKeys` property generated in `VComponentWrapper`
- ✅ Protected state included in `InitialState`
- ✅ Transpiled C# compiles without errors

---

### Phase 3: C# VComponentWrapper Class (Week 2)

**Goal:** Update `VComponentWrapper` to store and pass protected keys

**Tasks:**
1. Add `ProtectedKeys` property to `VComponentWrapper.cs`
2. Update `Render()` to call `_childInstance.SetProtectedKeys()`
3. Pass protected keys to child during initialization
4. Write unit tests for VComponentWrapper

**C# Changes:**
```csharp
// VComponentWrapper.cs
public class VComponentWrapper : VNode
{
    public HashSet<string> ProtectedKeys { get; set; } = new();

    public VNode Render()
    {
        if (_childInstance == null)
        {
            _childInstance = CreateChildInstance();
            _childInstance.SetStateNamespace(ComponentName, ParentComponent);

            // ✅ NEW: Register protected keys with parent
            _childInstance.SetProtectedKeys(ComponentName, ProtectedKeys);

            InitializeLiftedState();
        }

        var childVNode = _childInstance.Render();
        HexPathManager.PrefixChildPaths(childVNode, HexPath);
        return childVNode;
    }
}
```

**Acceptance Criteria:**
- ✅ `VComponentWrapper` compiles successfully
- ✅ `SetProtectedKeys()` called during initialization
- ✅ Protected keys registered with parent component

---

### Phase 4: C# MinimactComponent Protection Logic (Week 2-3)

**Goal:** Enforce access control in `GetState` and `SetState`

**Tasks:**
1. Add `_protectedKeys` dictionary to `MinimactComponent`
2. Implement `SetProtectedKeys()` method
3. Implement `IsProtectedKey()` helper
4. Add protection checks to `GetState<T>()`
5. Add protection checks to `SetState<T>()`
6. Write unit tests for access control

**C# Changes:**
```csharp
// MinimactComponent.cs
public abstract class MinimactComponent
{
    private Dictionary<string, bool> _protectedKeys = new();

    public void SetProtectedKeys(string componentName, HashSet<string> protectedKeys)
    {
        foreach (var key in protectedKeys)
        {
            var namespacedKey = $"{componentName}.{key}";
            _protectedKeys[namespacedKey] = true;
        }
    }

    private bool IsProtectedKey(string key)
    {
        return _protectedKeys.ContainsKey(key);
    }

    protected T GetState<T>(string key)
    {
        // ✅ NEW: Check if parent is accessing protected child state
        if (StateNamespace == null && IsProtectedKey(key))
        {
            throw new InvalidOperationException(
                $"Cannot access protected state: {key}. " +
                $"This state was declared with useProtectedState() and is only accessible within the child component."
            );
        }

        // ... rest of GetState logic
    }

    protected void SetState<T>(string key, T value)
    {
        // ✅ NEW: Check if parent is modifying protected child state
        if (StateNamespace == null && IsProtectedKey(key))
        {
            throw new InvalidOperationException(
                $"Cannot modify protected state: {key}. " +
                $"This state was declared with useProtectedState() and is only accessible within the child component."
            );
        }

        // ... rest of SetState logic
    }
}
```

**Acceptance Criteria:**
- ✅ `GetState` throws exception when parent accesses protected state
- ✅ `SetState` throws exception when parent modifies protected state
- ✅ Child components can access their own protected state normally
- ✅ Error messages are clear and actionable

---

### Phase 5: Client-Runtime TypeScript Integration (Week 3)

**Goal:** Export `useProtectedState` from client-runtime

**Tasks:**
1. Add `useProtectedState` to `src/client-runtime/src/hooks.ts`
2. Implement identical API to `useState` (setter, state tracking)
3. Mark state as protected in component context
4. Export from `src/client-runtime/src/index.ts`
5. Update TypeScript types

**TypeScript Changes:**
```typescript
// src/client-runtime/src/hooks.ts

/**
 * Protected state hook - state is lifted to parent but parent cannot access it
 * Use for internal implementation details that should not be exposed
 */
export function useProtectedState<T>(initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  if (!currentContext) {
    throw new Error('useProtectedState must be called within a component render');
  }

  const context = currentContext;
  const index = stateIndex++;
  const stateKey = `state_${index}`;

  // Initialize state if not present
  if (!context.state.has(stateKey)) {
    context.state.set(stateKey, initialValue);

    // ✅ Mark as protected
    if (!context.protectedStateKeys) {
      context.protectedStateKeys = new Set();
    }
    context.protectedStateKeys.add(stateKey);
  }

  const currentValue = context.state.get(stateKey) as T;

  const setState = (newValue: T | ((prev: T) => T)) => {
    const actualNewValue = typeof newValue === 'function'
      ? (newValue as (prev: T) => T)(context.state.get(stateKey) as T)
      : newValue;

    context.state.set(stateKey, actualNewValue);

    const stateChanges: Record<string, any> = {
      [stateKey]: actualNewValue
    };

    const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

    if (hint) {
      context.domPatcher.applyPatches(context.element, hint.patches);
    }

    // Sync to server (same as useState)
    context.signalR.updateComponentState(context.componentId, stateKey, actualNewValue)
      .catch(err => {
        console.error('[Minimact] Failed to sync protected state to server:', err);
      });
  };

  return [currentValue, setState];
}
```

**Acceptance Criteria:**
- ✅ `useProtectedState` exported from minimact
- ✅ Hook works identically to `useState` from child's perspective
- ✅ State changes sync to server
- ✅ TypeScript types correct

---

### Phase 6: Testing & Validation (Week 3-4)

**Goal:** Comprehensive testing of protected state feature

**Tasks:**
1. Create test fixtures for protected state patterns
2. Write unit tests for Babel plugin
3. Write unit tests for C# runtime
4. Write integration tests (TypeScript → C# → Runtime)
5. Test error messages and edge cases
6. Performance testing (no overhead for regular useState)

**Test Fixtures:**
```tsx
// Test 1: Basic protection
function Counter() {
  const [count, setCount] = useState(0);
  const [cache, setCache] = useProtectedState({});
}

// Test 2: Parent access (should fail)
function Dashboard() {
  const cache = state["Counter.cache"];  // Should throw error
}

// Test 3: Complex workflow
function Form() {
  const [email, setEmail] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [validationCache, setValidationCache] = useProtectedState({});
  const [debounceTimer, setDebounceTimer] = useProtectedState(null);
}
```

**Acceptance Criteria:**
- ✅ All unit tests pass
- ✅ Integration tests pass
- ✅ Error messages tested and validated
- ✅ No performance regression vs regular useState

---

### Phase 7: Documentation & Examples (Week 4)

**Goal:** Complete documentation for developers

**Tasks:**
1. Update `docs/LIFTED_STATE_COMPONENT_SYSTEM.md`
2. Create `docs/USEPROTECTEDSTATE_GUIDE.md`
3. Add examples to `src/fixtures/`
4. Update API reference
5. Create migration guide for existing code

**Documentation Files:**
- ✅ Implementation plan (this document)
- ✅ User guide with examples
- ✅ API reference
- ✅ Migration guide
- ✅ Troubleshooting guide

**Example Fixtures:**
- `UseProtectedState_01_BasicUsage.tsx`
- `UseProtectedState_02_FormValidation.tsx`
- `UseProtectedState_03_Animation.tsx`

**Acceptance Criteria:**
- ✅ Complete user guide published
- ✅ 3+ example fixtures created
- ✅ API reference updated
- ✅ Migration guide for existing code

---

## Technical Specification

### TypeScript Hook Signature

```typescript
function useProtectedState<T>(initialValue: T): [T, Dispatch<SetStateAction<T>>];

type Dispatch<A> = (value: A) => void;
type SetStateAction<S> = S | ((prevState: S) => S);
```

### Babel Plugin Metadata

```javascript
// component.protectedState Map structure
{
  variableName: {
    initialValue: ASTNode,    // Initial value expression
    index: number,            // State index (for unique keys)
    isProtected: true         // Protection flag
  }
}
```

### C# Generated Code

**Child Component:**
```csharp
// Counter.cs (child with protected state)
public partial class Counter : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // Public state (namespaced: "Counter.count")
        var count = GetState<int>("count");

        // Protected state (namespaced: "Counter.cache")
        // Child can access via GetState because StateNamespace is set
        var cache = GetState<Dictionary>("cache");

        return new VElement("button", "1",
            new Dictionary<string, object> { ["data-minimact-onclick"] = "Handle_1_onClick" },
            new VText("1:0", $"Count: {count}")
        );
    }

    public void Handle_1_onClick()
    {
        var count = GetState<int>("count");
        var cache = GetState<Dictionary>("cache");

        // Both work normally within child
        SetState("count", count + 1);
        SetState("cache", new Dictionary { ["key"] = count });
    }
}
```

**Parent Component:**
```csharp
// Dashboard.cs (parent)
public partial class Dashboard : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // ✅ Can access public child state
        var counterValue = State["Counter.count"];

        // ❌ CANNOT access protected child state (throws exception)
        // var cache = State["Counter.cache"];

        return new VElement("div", "1",
            new VElement("p", "1.1", new VText("1.1:0", $"Counter: {counterValue}")),

            new VComponentWrapper
            {
                ComponentName = "Counter",
                ComponentType = "Counter",
                HexPath = "1.2",
                InitialState = new Dictionary<string, object>
                {
                    ["count"] = 0,
                    ["cache"] = new Dictionary<string, object>()
                },
                ProtectedKeys = new HashSet<string> { "cache" },
                ParentComponent = this
            }
        );
    }

    public void Handle_ResetButton_onClick()
    {
        // ✅ Can modify public child state
        SetState("Counter.count", 0);

        // ❌ CANNOT modify protected child state (throws exception)
        // SetState("Counter.cache", new Dictionary<string, object>());
    }
}
```

### VComponentWrapper Structure

```csharp
public class VComponentWrapper : VNode
{
    /// <summary>
    /// Component name for state namespacing (e.g., "Counter")
    /// </summary>
    public string ComponentName { get; set; } = "";

    /// <summary>
    /// Actual component type to instantiate
    /// </summary>
    public string ComponentType { get; set; } = "";

    /// <summary>
    /// Hex path for this wrapper node
    /// </summary>
    public string HexPath { get; set; } = "";

    /// <summary>
    /// Initial state values (public + protected, all lifted)
    /// </summary>
    public Dictionary<string, object> InitialState { get; set; } = new();

    /// <summary>
    /// ✅ NEW: Protected state keys (parent cannot access)
    /// </summary>
    public HashSet<string> ProtectedKeys { get; set; } = new();

    /// <summary>
    /// Reference to parent component (owns the state)
    /// </summary>
    public MinimactComponent ParentComponent { get; set; } = null!;

    private MinimactComponent? _childInstance;

    public VNode Render()
    {
        if (_childInstance == null)
        {
            _childInstance = CreateChildInstance();
            _childInstance.SetStateNamespace(ComponentName, ParentComponent);

            // ✅ NEW: Register protected keys with parent
            _childInstance.SetProtectedKeys(ComponentName, ProtectedKeys);

            InitializeLiftedState();
        }

        var childVNode = _childInstance.Render();
        HexPathManager.PrefixChildPaths(childVNode, HexPath);
        return childVNode;
    }
}
```

### MinimactComponent Protection Methods

```csharp
public abstract class MinimactComponent
{
    // ✅ NEW: Protected keys registry (namespaced)
    private Dictionary<string, bool> _protectedKeys = new();

    /// <summary>
    /// ✅ NEW: Register protected state keys from child component
    /// Called by VComponentWrapper during initialization
    /// </summary>
    public void SetProtectedKeys(string componentName, HashSet<string> protectedKeys)
    {
        foreach (var key in protectedKeys)
        {
            var namespacedKey = $"{componentName}.{key}";
            _protectedKeys[namespacedKey] = true;

            Console.WriteLine($"[Minimact] Registered protected state: {namespacedKey}");
        }
    }

    /// <summary>
    /// ✅ NEW: Check if a state key is protected
    /// </summary>
    private bool IsProtectedKey(string key)
    {
        return _protectedKeys.ContainsKey(key);
    }

    protected T GetState<T>(string key)
    {
        // ✅ NEW: Protection check (parent accessing child's protected state)
        if (StateNamespace == null && IsProtectedKey(key))
        {
            throw new InvalidOperationException(
                $"Cannot access protected state: {key}. " +
                $"This state was declared with useProtectedState() and is only accessible within the child component."
            );
        }

        // Apply namespace prefix if configured
        var actualKey = StateNamespace != null
            ? $"{StateNamespace}.{key}"
            : key;

        var stateSource = ParentComponent?.State ?? State;

        if (stateSource.TryGetValue(actualKey, out var value))
        {
            return (T)Convert.ChangeType(value, typeof(T));
        }

        return default(T)!;
    }

    protected void SetState<T>(string key, T value)
    {
        // ✅ NEW: Protection check (parent modifying child's protected state)
        if (StateNamespace == null && IsProtectedKey(key))
        {
            throw new InvalidOperationException(
                $"Cannot modify protected state: {key}. " +
                $"This state was declared with useProtectedState() and is only accessible within the child component."
            );
        }

        // Apply namespace prefix if configured
        var actualKey = StateNamespace != null
            ? $"{StateNamespace}.{key}"
            : key;

        if (ParentComponent != null)
        {
            if (ParentComponent.State.TryGetValue(actualKey, out var oldValue))
            {
                ParentComponent.PreviousState[actualKey] = oldValue;
            }

            ParentComponent.State[actualKey] = value!;
            ParentComponent.TriggerRender();
        }
        else
        {
            if (State.TryGetValue(actualKey, out var oldValue))
            {
                PreviousState[actualKey] = oldValue;
            }

            State[actualKey] = value!;
            TriggerRender();
        }
    }
}
```

---

## Examples

### Example 1: Form with Validation Cache

```tsx
import { useState, useProtectedState, Component } from '@minimact/core';

// Child component
export function EmailForm() {
  // Public state (parent can observe)
  const [email, setEmail] = useState("");
  const [isValid, setIsValid] = useState(false);

  // Protected state (parent CANNOT access)
  const [validationCache, setValidationCache] = useProtectedState({});
  const [debounceTimer, setDebounceTimer] = useProtectedState(null);

  const validateEmail = (value: string) => {
    // Check cache first
    if (validationCache[value] !== undefined) {
      setIsValid(validationCache[value]);
      return;
    }

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounce validation
    const timer = setTimeout(() => {
      const valid = value.includes('@') && value.includes('.');
      setValidationCache({ ...validationCache, [value]: valid });
      setIsValid(valid);
    }, 300);

    setDebounceTimer(timer);
  };

  return (
    <div>
      <input
        type="email"
        value={email}
        onInput={(e) => {
          const value = e.target.value;
          setEmail(value);
          validateEmail(value);
        }}
      />
      {isValid && <span className="success">✓</span>}
    </div>
  );
}

// Parent component
export default function RegistrationPage() {
  // ✅ Can observe public state
  const emailValid = state["EmailForm.isValid"];
  const emailValue = state["EmailForm.email"];

  // ❌ Cannot access protected state (runtime error)
  // const cache = state["EmailForm.validationCache"];

  const handleReset = () => {
    // ✅ Can reset public state
    setState("EmailForm.email", "");
    setState("EmailForm.isValid", false);

    // ❌ Cannot reset protected state (runtime error)
    // setState("EmailForm.validationCache", {});
  };

  return (
    <div>
      <h1>Registration</h1>

      <Component name="EmailForm" state={{
        email: "",
        isValid: false,
        validationCache: {},  // Protected (lifted but blocked)
        debounceTimer: null   // Protected (lifted but blocked)
      }}>
        <EmailForm />
      </Component>

      <button onClick={handleReset} disabled={!emailValue}>
        Reset Form
      </button>

      <button disabled={!emailValid}>
        Continue
      </button>
    </div>
  );
}
```

**Key Points:**
- ✅ Parent can observe `isValid` to enable/disable Continue button
- ✅ Parent can reset `email` with Reset button
- ❌ Parent cannot access or corrupt `validationCache`
- ❌ Parent cannot interfere with `debounceTimer`

---

### Example 2: Counter with Animation Queue

```tsx
import { useState, useProtectedState, Component } from '@minimact/core';

// Child component
export function AnimatedCounter() {
  // Public state
  const [count, setCount] = useState(0);

  // Protected state (animation internals)
  const [animationQueue, setAnimationQueue] = useProtectedState([]);
  const [isAnimating, setIsAnimating] = useProtectedState(false);

  const increment = () => {
    const newCount = count + 1;
    setCount(newCount);

    // Queue animation
    const animation = {
      type: 'increment',
      from: count,
      to: newCount,
      timestamp: Date.now()
    };

    setAnimationQueue([...animationQueue, animation]);

    // Process animation queue
    if (!isAnimating) {
      processAnimationQueue();
    }
  };

  const processAnimationQueue = async () => {
    setIsAnimating(true);

    // Process each animation in queue
    while (animationQueue.length > 0) {
      const anim = animationQueue[0];
      await animateValue(anim);
      setAnimationQueue(animationQueue.slice(1));
    }

    setIsAnimating(false);
  };

  const animateValue = (anim) => {
    return new Promise(resolve => {
      // Animation logic here
      setTimeout(resolve, 300);
    });
  };

  return (
    <button onClick={increment}>
      Count: {count}
    </button>
  );
}

// Parent component
export default function Dashboard() {
  // ✅ Can observe count
  const counterValue = state["AnimatedCounter.count"];

  // ❌ Cannot access animation internals (runtime error)
  // const queue = state["AnimatedCounter.animationQueue"];

  const handleReset = () => {
    // ✅ Can reset count
    setState("AnimatedCounter.count", 0);

    // ❌ Cannot reset animation queue (runtime error)
    // setState("AnimatedCounter.animationQueue", []);
  };

  return (
    <div>
      <p>Counter is at: {counterValue}</p>

      <Component name="AnimatedCounter" state={{
        count: 0,
        animationQueue: [],   // Protected
        isAnimating: false    // Protected
      }}>
        <AnimatedCounter />
      </Component>

      <button onClick={handleReset}>Reset Counter</button>
    </div>
  );
}
```

**Key Points:**
- ✅ Parent can observe `count` value
- ✅ Parent can reset `count`
- ❌ Parent cannot interfere with animation queue
- ❌ Parent cannot corrupt animation state

---

### Example 3: Search with Debounce and Cache

```tsx
import { useState, useProtectedState, Component } from '@minimact/core';

// Child component
export function SearchBox() {
  // Public state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Protected state
  const [searchCache, setSearchCache] = useProtectedState({});
  const [debounceTimer, setDebounceTimer] = useProtectedState(null);
  const [requestId, setRequestId] = useProtectedState(0);

  const handleSearch = (value: string) => {
    setQuery(value);

    // Check cache
    if (searchCache[value]) {
      setResults(searchCache[value]);
      return;
    }

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounce search
    const timer = setTimeout(async () => {
      const currentRequestId = requestId + 1;
      setRequestId(currentRequestId);
      setIsLoading(true);

      try {
        const response = await fetch(`/api/search?q=${value}`);
        const data = await response.json();

        // Only update if this is still the latest request
        if (currentRequestId === requestId) {
          setResults(data.results);
          setSearchCache({ ...searchCache, [value]: data.results });
          setIsLoading(false);
        }
      } catch (err) {
        if (currentRequestId === requestId) {
          setIsLoading(false);
        }
      }
    }, 300);

    setDebounceTimer(timer);
  };

  return (
    <div>
      <input
        type="search"
        value={query}
        onInput={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
      />
      {isLoading && <span>Loading...</span>}
      <ul>
        {results.map(result => (
          <li key={result.id}>{result.title}</li>
        ))}
      </ul>
    </div>
  );
}

// Parent component
export default function SearchPage() {
  // ✅ Can observe search state
  const query = state["SearchBox.query"];
  const results = state["SearchBox.results"];
  const isLoading = state["SearchBox.isLoading"];

  // ❌ Cannot access internals (runtime error)
  // const cache = state["SearchBox.searchCache"];

  const handleClear = () => {
    // ✅ Can clear public state
    setState("SearchBox.query", "");
    setState("SearchBox.results", []);
    setState("SearchBox.isLoading", false);

    // ❌ Cannot clear cache (runtime error)
    // setState("SearchBox.searchCache", {});
  };

  return (
    <div>
      <h1>Search</h1>

      {query && (
        <div className="search-summary">
          Searching for "{query}"
          {isLoading && " (loading...)"}
          {!isLoading && ` - ${results.length} results`}
        </div>
      )}

      <Component name="SearchBox" state={{
        query: "",
        results: [],
        isLoading: false,
        searchCache: {},    // Protected
        debounceTimer: null, // Protected
        requestId: 0        // Protected
      }}>
        <SearchBox />
      </Component>

      <button onClick={handleClear}>Clear Search</button>
    </div>
  );
}
```

**Key Points:**
- ✅ Parent can display search summary (query, results, loading state)
- ✅ Parent can clear search
- ❌ Parent cannot corrupt search cache
- ❌ Parent cannot interfere with debounce timer or request ID

---

## Testing Strategy

### Unit Tests

#### Babel Plugin Tests

```javascript
// Test 1: Detect useProtectedState
test('detects useProtectedState call', () => {
  const code = `
    function MyComponent() {
      const [cache, setCache] = useProtectedState({});
    }
  `;

  const component = extractHooks(code);

  expect(component.protectedState.has('cache')).toBe(true);
  expect(component.protectedState.get('cache').isProtected).toBe(true);
});

// Test 2: Generate ProtectedKeys in VComponentWrapper
test('generates ProtectedKeys in VComponentWrapper', () => {
  const code = `
    function Parent() {
      return (
        <Component name="Child" state={{ cache: {} }}>
          <Child />
        </Component>
      );
    }

    function Child() {
      const [cache, setCache] = useProtectedState({});
    }
  `;

  const output = transpile(code);

  expect(output).toContain('ProtectedKeys = new HashSet<string> { "cache" }');
});

// Test 3: Multiple protected state keys
test('handles multiple useProtectedState calls', () => {
  const code = `
    function Child() {
      const [cache, setCache] = useProtectedState({});
      const [timer, setTimer] = useProtectedState(null);
      const [buffer, setBuffer] = useProtectedState([]);
    }
  `;

  const output = transpile(code);

  expect(output).toContain('ProtectedKeys = new HashSet<string> { "cache", "timer", "buffer" }');
});
```

#### C# Runtime Tests

```csharp
// Test 1: Parent cannot read protected state
[Test]
public void Parent_CannotRead_ProtectedState()
{
    var parent = new TestParentComponent();
    parent.State["Counter.cache"] = new Dictionary<string, object>();
    parent.SetProtectedKeys("Counter", new HashSet<string> { "cache" });

    Assert.Throws<InvalidOperationException>(() => {
        var cache = parent.GetState<Dictionary>("Counter.cache");
    });
}

// Test 2: Parent cannot write protected state
[Test]
public void Parent_CannotWrite_ProtectedState()
{
    var parent = new TestParentComponent();
    parent.SetProtectedKeys("Counter", new HashSet<string> { "cache" });

    Assert.Throws<InvalidOperationException>(() => {
        parent.SetState("Counter.cache", new Dictionary<string, object>());
    });
}

// Test 3: Child can access protected state
[Test]
public void Child_CanAccess_ProtectedState()
{
    var parent = new TestParentComponent();
    var child = new TestChildComponent();

    child.SetStateNamespace("Counter", parent);
    parent.State["Counter.cache"] = new Dictionary<string, object> { ["key"] = "value" };

    // Child can read
    var cache = child.GetState<Dictionary>("cache");  // Reads "Counter.cache" with namespace
    Assert.IsNotNull(cache);

    // Child can write
    child.SetState("cache", new Dictionary<string, object> { ["key"] = "newValue" });
    Assert.AreEqual("newValue", parent.State["Counter.cache"]["key"]);
}

// Test 4: Error message is helpful
[Test]
public void Error_Message_Is_Helpful()
{
    var parent = new TestParentComponent();
    parent.SetProtectedKeys("Form", new HashSet<string> { "validationCache" });

    var ex = Assert.Throws<InvalidOperationException>(() => {
        parent.GetState<Dictionary>("Form.validationCache");
    });

    Assert.That(ex.Message, Does.Contain("useProtectedState"));
    Assert.That(ex.Message, Does.Contain("Form.validationCache"));
}
```

### Integration Tests

```typescript
// Test 1: Full workflow (TypeScript → C# → Runtime)
test('protected state blocks parent access end-to-end', async () => {
  // 1. Transpile TypeScript to C#
  const tsCode = `
    function Parent() {
      const cache = state["Child.cache"];  // Should fail
      return <Component name="Child" state={{ cache: {} }}><Child /></Component>;
    }

    function Child() {
      const [cache, setCache] = useProtectedState({});
      return <div>{JSON.stringify(cache)}</div>;
    }
  `;

  // 2. Transpilation should detect violation
  expect(() => transpile(tsCode)).toThrow('Cannot access protected state');
});

// Test 2: Child modifies protected state
test('child can modify protected state', async () => {
  const component = mount(<TestComponent />);

  // Child updates protected state
  await component.find('button').click();

  // Verify state changed (visible in DevTools, not accessible to parent)
  expect(component.state['Child.cache']).toBeDefined();

  // Parent cannot access
  expect(() => component.parent.getState('Child.cache')).toThrow();
});
```

### Performance Tests

```csharp
// Test: No overhead for regular useState
[Test]
public void ProtectedState_NoOverhead_ForRegularState()
{
    var parent = new TestParentComponent();
    var iterations = 100000;

    // Benchmark regular state access
    var sw1 = Stopwatch.StartNew();
    for (int i = 0; i < iterations; i++)
    {
        parent.State["regularKey"] = i;
        var value = parent.State["regularKey"];
    }
    sw1.Stop();

    // Benchmark with protected keys registered (but not accessed)
    parent.SetProtectedKeys("Child", new HashSet<string> { "protectedKey" });

    var sw2 = Stopwatch.StartNew();
    for (int i = 0; i < iterations; i++)
    {
        parent.State["regularKey"] = i;
        var value = parent.State["regularKey"];
    }
    sw2.Stop();

    // Should have < 5% overhead
    Assert.That(sw2.ElapsedMilliseconds, Is.LessThan(sw1.ElapsedMilliseconds * 1.05));
}
```

---

## Migration Guide

### For Existing Code

**Before (without useProtectedState):**
```tsx
function MyComponent() {
  const [publicData, setPublicData] = useState("");
  const [internalCache, setInternalCache] = useState({});  // Parent can access!
}
```

**After (with useProtectedState):**
```tsx
function MyComponent() {
  const [publicData, setPublicData] = useState("");
  const [internalCache, setInternalCache] = useProtectedState({});  // Protected!
}
```

### Breaking Changes

**None!** This is a **fully additive feature**. Existing code continues to work:
- ✅ Existing `useState` calls unchanged
- ✅ Existing parent access patterns unchanged
- ✅ `useProtectedState` is opt-in

### Recommended Adoption

1. **Identify internal state** - State that's implementation detail
2. **Change to useProtectedState** - One hook at a time
3. **Test** - Ensure parent doesn't depend on that state
4. **Deploy** - Feature is backwards compatible

---

## Timeline

| Phase | Duration | Tasks | Deliverables |
|-------|----------|-------|--------------|
| Phase 1 | 3 days | Babel hook detection | Hook tracking, tests |
| Phase 2 | 3 days | VComponentWrapper generation | C# output with ProtectedKeys |
| Phase 3 | 2 days | C# VComponentWrapper class | Updated class, tests |
| Phase 4 | 3 days | C# MinimactComponent protection | Access control, tests |
| Phase 5 | 2 days | Client-runtime integration | TypeScript hook export |
| Phase 6 | 4 days | Testing & validation | Full test suite |
| Phase 7 | 3 days | Documentation & examples | User guide, examples |
| **Total** | **20 days** | **~4 weeks** | **Production-ready feature** |

---

## Success Criteria

- ✅ `useProtectedState` hook available in client-runtime
- ✅ Babel plugin generates `ProtectedKeys` in `VComponentWrapper`
- ✅ C# runtime enforces access control (throws exceptions)
- ✅ All unit tests pass (Babel, C#, integration)
- ✅ Performance: < 5% overhead vs regular `useState`
- ✅ Documentation complete with examples
- ✅ Zero breaking changes to existing code

---

## Future Enhancements

### Phase 8: TypeScript Type Safety (Optional)

Add TypeScript types to enforce protection at compile-time:

```typescript
type LiftedState<T> = {
  [K in keyof T]: T[K];
};

type ProtectedState<T> = {
  readonly [K in keyof T]: never;  // Cannot access
};

// Parent component type
interface ParentState {
  "Child.publicData": string;    // ✅ Accessible
  "Child.cache": never;           // ❌ Not accessible (TypeScript error)
}
```

### Phase 9: DevTools Integration (Optional)

Add DevTools features:
- Visual indicator for protected state
- "Show Protected State" toggle
- Warning when parent tries to access protected state

---

## Questions & Answers

**Q: Why lift protected state at all? Why not keep it local to child?**

A: Lifting ensures full state visibility for:
- Debugging (DevTools see all state)
- Prediction (Rust predictor sees full state tree)
- Time travel (snapshot includes all state)
- Hot reload (state preserved across reloads)

**Q: Can child access other children's protected state?**

A: No. Protected state is only accessible to the component that declared it. Siblings cannot access each other's protected state.

**Q: What about grandchildren (nested components)?**

A: Protection works recursively. If `Child` has a `<Component>` wrapper for `GrandChild`, then:
- `Child` cannot access `GrandChild`'s protected state
- `Parent` cannot access `Child`'s or `GrandChild`'s protected state

**Q: Performance impact?**

A: Minimal. Protected key check is `O(1)` dictionary lookup, only runs when accessing state. Benchmark target: < 5% overhead.

**Q: Can I make ALL state protected by default?**

A: No. You must explicitly use `useProtectedState`. This is intentional - lifted state is about coordination, so public-by-default is correct.

---

**This is the complete implementation plan for `useProtectedState`!** 🚀
