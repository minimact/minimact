# Custom Hooks Implementation Guide

## Overview

Custom hooks in Minimact are **NOT** traditional functions - they are **child components with syntactic sugar**. This design reuses the existing VComponentWrapper infrastructure for child components (Lifted State Pattern).

## Key Insight

```tsx
// This custom hook syntax:
const [count, increment, , , counterUI] = useCounter('counter1', 0);
{counterUI}

// Is just syntactic sugar for:
<Component name="counter1" type="UseCounterHook" config={{ start: 0 }}>
  <UseCounterHook />
</Component>
```

Both compile to the same C# VComponentWrapper!

## Architecture

### 1. Hook Definition (Function with Namespace Parameter)

```tsx
// src/hooks/useCounter.tsx
import { useState } from '@minimact/core';

/**
 * Custom Hook: useCounter
 *
 * @param namespace - Unique identifier for this hook instance (REQUIRED)
 * @param start - Initial count value
 * @returns [count, increment, decrement, reset, ui]
 */
function useCounter(namespace: string, start: number = 0) {
  const [count, setCount] = useState(start);

  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => setCount(start);

  // Hooks can return JSX! (unlike React)
  const ui = (
    <div className="counter-widget">
      <button onClick={decrement}>-</button>
      <span className="count-display">{count}</span>
      <button onClick={increment}>+</button>
      <button onClick={reset}>Reset</button>
    </div>
  );

  return [count, increment, decrement, reset, ui];
}

export default useCounter;
```

### 2. Babel Transpilation

The Babel plugin performs these transformations:

#### Step 1: Detect Custom Hook Definition

```javascript
// In babel-plugin-minimact/src/analyzers/hookDetector.cjs
function isCustomHook(path) {
  // 1. Function name starts with 'use'
  // 2. First parameter is named 'namespace' with type string
  // 3. Contains useState calls OR returns JSX
}
```

#### Step 2: Generate [Hook] Class

```csharp
// Generated: UseCounterHook.cs
[Hook]
public partial class UseCounterHook : MinimactComponent
{
    // Configuration (from hook arguments)
    private int start => GetState<int>("_config.param0");

    // Hook state
    [State]
    private int count = 0;

    // State setters
    private void setCount(int value)
    {
        SetState(nameof(count), value);
    }

    // Hook methods
    private void increment()
    {
        setCount(count + 1);
    }

    private void decrement()
    {
        setCount(count - 1);
    }

    private void reset()
    {
        setCount(start);
    }

    // Render method (from 'ui' variable)
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "counter-widget" }, new VNode[]
        {
            new VElement("button", "1.1", new Dictionary<string, string> { ["onclick"] = "decrement" }, "-"),
            new VElement("span", "1.2", new Dictionary<string, string> { ["class"] = "count-display" }, new VNode[]
            {
                new VText($"{(count)}", "1.2.1")
            }),
            new VElement("button", "1.3", new Dictionary<string, string> { ["onclick"] = "increment" }, "+"),
            new VElement("button", "1.4", new Dictionary<string, string> { ["onclick"] = "reset" }, "Reset")
        });
    }
}
```

#### Step 3: Track Hook Call Sites

```javascript
// In babel-plugin-minimact/src/extractors/hooks.cjs
function extractCustomHookCall(path, component, hookName) {
  // Extract: const [count, increment, decrement, reset, counterUI] = useCounter('counter1', 0);

  const namespace = args[0].value;  // 'counter1'
  const params = args.slice(1);     // [0]
  const uiVarName = elements[elements.length - 1].name;  // 'counterUI'

  // Store in component.customHooks array
  component.customHooks.push({
    hookName: 'useCounter',
    className: 'UseCounterHook',
    namespace: 'counter1',
    uiVarName: 'counterUI',
    params: ['0']
  });
}
```

#### Step 4: Replace {counterUI} with VComponentWrapper

```javascript
// In babel-plugin-minimact/src/generators/jsx.cjs
function generateChildren(children, component, indent) {
  for (const child of children) {
    if (t.isJSXExpressionContainer(child)) {
      const expr = child.expression;

      // Check if this is a custom hook UI variable
      if (t.isIdentifier(expr) && component.customHooks) {
        const hookInstance = component.customHooks.find(h => h.uiVarName === expr.name);
        if (hookInstance) {
          // Generate VComponentWrapper instead of normal expression!
          return generateCustomHookWrapper(hookInstance, hexPath, component, indent);
        }
      }
    }
  }
}
```

#### Step 5: Generate VComponentWrapper

```csharp
// Generated C# for {counterUI}:
new VComponentWrapper
{
  ComponentName = "counter1",
  ComponentType = "UseCounterHook",
  HexPath = "1.2.4",
  InitialState = new Dictionary<string, object> {
    ["_config.param0"] = 0
  }
}
```

### 3. Usage in Parent Component

```tsx
// src/components/Dashboard.tsx
import useCounter from '../hooks/useCounter';

export default function Dashboard() {
  // Two independent instances of the same hook
  const [count1, increment1, , , counterUI1] = useCounter('counter1', 0);
  const [count2, increment2, , , counterUI2] = useCounter('counter2', 10);

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      <div className="section">
        <h2>Counter 1</h2>
        <p>External count: {count1}</p>
        <button onClick={increment1}>External +1</button>
        {counterUI1}
      </div>

      <div className="section">
        <h2>Counter 2</h2>
        <p>External count: {count2}</p>
        <button onClick={increment2}>External +1</button>
        {counterUI2}
      </div>
    </div>
  );
}
```

### 4. Generated Parent Component C#

```csharp
[Component]
public partial class Dashboard : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "dashboard" }, new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), "Dashboard"),
            new VElement("div", "1.2", new Dictionary<string, string> { ["class"] = "section" }, new VNode[]
            {
                new VElement("h2", "1.2.1", new Dictionary<string, string>(), "Counter 1"),
                new VElement("p", "1.2.2", new Dictionary<string, string>(), $"External count: {count1}"),
                new VElement("button", "1.2.3", new Dictionary<string, string> { ["onclick"] = "increment1" }, "External +1"),
                // 🎯 Hook UI replaced with VComponentWrapper!
                new VComponentWrapper
                {
                    ComponentName = "counter1",
                    ComponentType = "UseCounterHook",
                    HexPath = "1.2.4",
                    InitialState = new Dictionary<string, object> { ["_config.param0"] = 0 }
                }
            }),
            new VElement("div", "1.3", new Dictionary<string, string> { ["class"] = "section" }, new VNode[]
            {
                new VElement("h2", "1.3.1", new Dictionary<string, string>(), "Counter 2"),
                new VElement("p", "1.3.2", new Dictionary<string, string>(), $"External count: {count2}"),
                new VElement("button", "1.3.3", new Dictionary<string, string> { ["onclick"] = "increment2" }, "External +1"),
                // 🎯 Second hook instance with different namespace!
                new VComponentWrapper
                {
                    ComponentName = "counter2",
                    ComponentType = "UseCounterHook",
                    HexPath = "1.3.4",
                    InitialState = new Dictionary<string, object> { ["_config.param0"] = 10 }
                }
            })
        });
    }
}
```

## Runtime Behavior

### Server-Side (ASP.NET Core)

1. **Component Registration**: `UseCounterHook` is registered as a child component type
2. **Instance Creation**: When rendering `Dashboard`, the VComponentWrapper creates two instances:
   - `counter1` → UseCounterHook with `_config.param0 = 0`
   - `counter2` → UseCounterHook with `_config.param0 = 10`
3. **Lifted State**: Parent component can access: `State["counter1.count"]` and `State["counter2.count"]`
4. **Render Tree**: Each hook renders its UI subtree independently

### Client-Side (Browser)

1. **State Hydration**: Hook instances receive their initial state from InitialState dictionary
2. **Event Handlers**: Button clicks (`increment`, `decrement`) trigger SignalR calls to server
3. **State Updates**: Server updates `counter1.count`, re-renders, sends patches
4. **DOM Patching**: Client applies patches to update `<span class="count-display">`

## Lifted State Pattern

Custom hooks automatically participate in the **Lifted State Pattern**:

```csharp
// Parent can access hook state
int counter1Value = GetState<int>("counter1.count");

// Parent can update hook state
SetState("counter1.count", 42);

// Hook state is namespaced
State["counter1.count"]  // Counter 1's count
State["counter2.count"]  // Counter 2's count (independent)
```

## Key Differences from React Hooks

| Feature | React Hooks | Minimact Hooks |
|---------|-------------|----------------|
| **Type** | Functions | Child Components |
| **State Location** | Parent closure | Parent State dictionary (namespaced) |
| **UI Return** | ❌ Not allowed | ✅ Can return JSX |
| **Multiple Instances** | ❌ Single closure | ✅ Independent namespaces |
| **State Inspection** | ❌ Hidden in closure | ✅ Parent can observe `State["namespace.key"]` |
| **First Parameter** | Any | **Must be `namespace: string`** |
| **Reconciliation** | React reconciler | Rust reconciler (same as components) |

## Implementation Checklist

- [x] **Hook Detector** - Identify custom hooks (name starts with 'use', first param is 'namespace')
- [x] **Hook Analyzer** - Extract states, methods, JSX from hook body
- [x] **Hook Class Generator** - Generate [Hook] C# class with Render() method
- [x] **Hook Call Extractor** - Track `useCounter('namespace', ...params)` calls in parent components
- [x] **UI Variable Replacer** - Replace `{counterUI}` with `VComponentWrapper` in JSX generation
- [ ] **InitialState Builder** - Map hook params to `_config.paramN` keys
- [ ] **Namespace Validation** - Ensure unique namespaces per component
- [ ] **Return Value Type Inference** - Infer types from hook return statement
- [ ] **Template Extraction** - Generate templates for hook UI (predictive rendering)
- [ ] **Hot Reload Support** - Enable hot reload for hook changes

## Testing Strategy

### Unit Tests

```tsx
// Test 1: Basic hook with state
function useToggle(namespace: string, initial: boolean = false) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn(!on);
  const ui = <button onClick={toggle}>{on ? 'ON' : 'OFF'}</button>;
  return [on, toggle, ui];
}

// Test 2: Hook with multiple states
function useForm(namespace: string, initialValues: object) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  // ... form logic
  return [values, errors, touched, handleChange, handleSubmit, formUI];
}

// Test 3: Hook with useEffect
function useFetch(namespace: string, url: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url).then(res => res.json()).then(setData);
  }, [url]);

  const ui = loading ? <div>Loading...</div> : <div>{data}</div>;
  return [data, loading, ui];
}
```

### Integration Tests

1. **Multiple Instances**: Verify two hooks with different namespaces work independently
2. **Parent-Child Communication**: Parent reads `State["namespace.count"]`
3. **Event Handlers**: Hook button clicks trigger server state updates
4. **Hot Reload**: Edit hook UI, verify client updates without full page reload
5. **Predictive Rendering**: Hook state changes apply cached patches instantly

## Example: Complete useForm Hook

```tsx
// src/hooks/useForm.tsx
import { useState } from '@minimact/core';

function useForm(namespace: string, initialValues: Record<string, any>) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (field: string) => (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setValues({ ...values, [field]: value });
    setTouched({ ...touched, [field]: true });
  };

  const handleSubmit = (onSubmit: (values: Record<string, any>) => void) => (e: Event) => {
    e.preventDefault();
    // Validate
    const newErrors: Record<string, string> = {};
    Object.keys(values).forEach(key => {
      if (!values[key]) newErrors[key] = 'Required';
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSubmit(values);
    }
  };

  const ui = (
    <form>
      {Object.keys(initialValues).map(field => (
        <div key={field}>
          <label>{field}</label>
          <input
            type="text"
            value={values[field]}
            onChange={handleChange(field)}
          />
          {touched[field] && errors[field] && (
            <span className="error">{errors[field]}</span>
          )}
        </div>
      ))}
      <button type="submit">Submit</button>
    </form>
  );

  return [values, errors, handleSubmit, ui];
}

export default useForm;
```

## Benefits of This Approach

1. **Reuses Existing Infrastructure**: VComponentWrapper, Lifted State, Rust reconciliation
2. **Type-Safe**: C# [Hook] classes with [State] attributes
3. **Predictive Rendering**: Templates work automatically (hook UI is just VNode tree)
4. **Hot Reload**: Hook changes trigger structural change detection
5. **Inspectable State**: Parent can observe `State["namespace.*"]`
6. **Multiple Instances**: Each namespace is independent (no closure collisions)
7. **Can Return JSX**: Unlike React, hooks can return UI elements
8. **Server-Authoritative**: Hook logic runs on server (secure, no client tampering)

## Migration from React Hooks

If you have existing React hooks:

```tsx
// React Hook (doesn't work in Minimact)
function useCounter(start = 0) {  // ❌ Missing namespace parameter
  const [count, setCount] = useState(start);
  return [count, setCount];  // ❌ Can't return JSX in React
}

// Minimact Hook
function useCounter(namespace: string, start = 0) {  // ✅ Namespace required
  const [count, setCount] = useState(start);

  const ui = <div>{count}</div>;  // ✅ Can return JSX!

  return [count, setCount, ui];  // ✅ UI as last element
}
```

## Conclusion

Custom hooks in Minimact are a powerful abstraction that reuses the child component infrastructure. By treating hooks as child components with syntactic sugar, we get:

- Zero new runtime code (reuses VComponentWrapper)
- Full type safety (C# [Hook] classes)
- Predictive rendering support
- Hot reload support
- Lifted state pattern
- Multiple independent instances

The namespace parameter is the key innovation that enables this design - it becomes the ComponentName in the VComponentWrapper, allowing multiple independent instances of the same hook in a single parent component.
