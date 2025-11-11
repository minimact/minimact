# Lifted State - Generated C# Output

> **Complete reference for how TypeScript with lifted state transpiles to C# code**
>
> **Date:** 2025-01-10

---

## Table of Contents

1. [Overview](#overview)
2. [Basic Component with Lifted State](#basic-component-with-lifted-state)
3. [Parent Reading Child State](#parent-reading-child-state)
4. [Parent Writing Child State](#parent-writing-child-state)
5. [VComponentWrapper VNode](#vcomponentwrapper-vnode)
6. [State Namespace Injection](#state-namespace-injection)
7. [Child Component Render](#child-component-render)
8. [Complete Example: Dashboard with Children](#complete-example-dashboard-with-children)
9. [Event Handlers with Lifted State](#event-handlers-with-lifted-state)
10. [Predictive Rendering Integration](#predictive-rendering-integration)

---

## Overview

The **lifted state system** automatically stores all child component state in the parent's `State` dictionary using namespaced keys (e.g., `"ChildComponent.key"`).

### Key Concepts

- **Parent owns all state** - Including child component state
- **Namespaced keys** - Child state stored as `"ComponentName.key"`
- **VComponentWrapper** - Special VNode type for wrapped children
- **State namespace injection** - Children receive namespace prefix
- **Transparent access** - Children use `GetState`/`SetState` as normal

---

## Basic Component with Lifted State

### TypeScript Input

```tsx
import { Component } from '@minimact/core';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}

export default function App() {
  return (
    <div>
      <h1>My App</h1>

      <Component name="Counter" state={{ count: 0 }}>
        <Counter />
      </Component>
    </div>
  );
}
```

### Generated C# Output

```csharp
// Counter.cs (Child Component)
public partial class Counter : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // useState transpiles to GetState with namespace prefix
        // If StateNamespace = "Counter", this reads: State["Counter.count"]
        var count = GetState<int>("count");

        return new VElement("button", "1",
            new Dictionary<string, object>
            {
                ["type"] = "button",
                ["data-minimact-onclick"] = "Handle_1_onClick"
            },
            new VText("1:0", $"Count: {count}")
        );
    }

    public void Handle_1_onClick()
    {
        var count = GetState<int>("count");

        // SetState with namespace prefix
        // If StateNamespace = "Counter", this writes: State["Counter.count"]
        SetState("count", count + 1);
    }
}

// App.cs (Parent Component)
public partial class App : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1",
            new VElement("h1", "1.1", new VText("1.1:0", "My App")),

            // VComponentWrapper - special VNode type for lifted state
            new VComponentWrapper
            {
                ComponentName = "Counter",          // Namespace prefix
                ComponentType = "Counter",          // Actual type to instantiate
                HexPath = "1.2",                    // Hex path for this wrapper
                InitialState = new Dictionary<string, object>
                {
                    ["count"] = 0                   // Will become "Counter.count"
                },
                ParentComponent = this              // Reference to parent
            }
        );
    }
}
```

---

## Parent Reading Child State

### TypeScript Input

```tsx
import { state, Component } from '@minimact/core';

export function UserProfile() {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div>
      <button onClick={() => setIsEditing(true)}>Edit</button>
      {isEditing && <form>...</form>}
    </div>
  );
}

export default function Dashboard() {
  // Parent reads child state using state proxy
  const userEditing = state["UserProfile.isEditing"];

  return (
    <div>
      {/* Parent observes child state */}
      {userEditing && (
        <div className="overlay">Editing in progress...</div>
      )}

      <Component name="UserProfile" state={{ isEditing: false }}>
        <UserProfile />
      </Component>
    </div>
  );
}
```

### Generated C# Output

```csharp
// UserProfile.cs (Child)
public partial class UserProfile : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // Reads from State["UserProfile.isEditing"] (namespaced)
        var isEditing = GetState<bool>("isEditing");

        return new VElement("div", "1",
            new VElement("button", "1.1",
                new Dictionary<string, object> { ["data-minimact-onclick"] = "Handle_1_1_onClick" },
                new VText("1.1:0", "Edit")
            ),
            (new MObject(isEditing))
                ? new VElement("form", "1.2", /* ... */)
                : new VNull("1.2")
        );
    }

    public void Handle_1_1_onClick()
    {
        // Writes to State["UserProfile.isEditing"] (namespaced)
        SetState("isEditing", true);

        // This triggers ParentComponent.TriggerRender() because StateNamespace is set
        // Parent re-renders and sees new value in State["UserProfile.isEditing"]
    }
}

// Dashboard.cs (Parent)
public partial class Dashboard : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // Parent directly reads child state from its own State dictionary!
        // state["UserProfile.isEditing"] → State["UserProfile.isEditing"]
        var userEditing = State["UserProfile.isEditing"];

        return new VElement("div", "1",
            // Parent's conditional based on child state
            (new MObject(userEditing))
                ? new VElement("div", "1.1",
                    new Dictionary<string, object> { ["class"] = "overlay" },
                    new VText("1.1:0", "Editing in progress...")
                  )
                : new VNull("1.1"),

            // Child component wrapper
            new VComponentWrapper
            {
                ComponentName = "UserProfile",
                ComponentType = "UserProfile",
                HexPath = "1.2",
                InitialState = new Dictionary<string, object>
                {
                    ["isEditing"] = false  // Stored as "UserProfile.isEditing" in parent
                },
                ParentComponent = this
            }
        );
    }
}
```

**Key Points:**
- ✅ Parent reads: `State["UserProfile.isEditing"]` (direct dictionary access)
- ✅ Child writes: `SetState("isEditing", true)` (automatically namespaced)
- ✅ Parent re-renders when child state changes (because state is in parent's State dict)

---

## Parent Writing Child State

### TypeScript Input

```tsx
import { state, setState, Component } from '@minimact/core';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <span>Count: {count}</span>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}

export default function Dashboard() {
  const counterValue = state["Counter.count"];

  const handleReset = () => {
    // Parent directly modifies child state!
    setState("Counter.count", 0);
  };

  return (
    <div>
      <p>Counter is at: {counterValue}</p>
      <button onClick={handleReset}>Reset Counter</button>

      <Component name="Counter" state={{ count: 0 }}>
        <Counter />
      </Component>
    </div>
  );
}
```

### Generated C# Output

```csharp
// Counter.cs (Child)
public partial class Counter : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // Reads State["Counter.count"] via GetState with namespace
        var count = GetState<int>("count");

        return new VElement("div", "1",
            new VElement("span", "1.1", new VText("1.1:0", $"Count: {count}")),
            new VElement("button", "1.2",
                new Dictionary<string, object> { ["data-minimact-onclick"] = "Handle_1_2_onClick" },
                new VText("1.2:0", "+")
            )
        );
    }

    public void Handle_1_2_onClick()
    {
        var count = GetState<int>("count");
        SetState("count", count + 1);  // Writes to State["Counter.count"]
    }
}

// Dashboard.cs (Parent)
public partial class Dashboard : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // Read child state
        var counterValue = State["Counter.count"];

        return new VElement("div", "1",
            new VElement("p", "1.1", new VText("1.1:0", $"Counter is at: {counterValue}")),
            new VElement("button", "1.2",
                new Dictionary<string, object> { ["data-minimact-onclick"] = "Handle_1_2_onClick" },
                new VText("1.2:0", "Reset Counter")
            ),
            new VComponentWrapper
            {
                ComponentName = "Counter",
                ComponentType = "Counter",
                HexPath = "1.3",
                InitialState = new Dictionary<string, object> { ["count"] = 0 },
                ParentComponent = this
            }
        );
    }

    public void Handle_1_2_onClick()
    {
        // Parent directly writes child state!
        // setState("Counter.count", 0) → SetState("Counter.count", 0)
        SetState("Counter.count", 0);

        // This triggers TriggerRender() which re-renders the entire parent
        // The child will see the new value (0) when it reads GetState("count")
    }
}
```

**Key Points:**
- ✅ Parent writes: `SetState("Counter.count", 0)` (direct state mutation)
- ✅ Child reads: `GetState<int>("count")` (sees parent's value)
- ✅ No prop drilling needed - parent has full control

---

## VComponentWrapper VNode

The `VComponentWrapper` is a special VNode type that represents a child component with lifted state.

### C# Class Definition

```csharp
/// <summary>
/// Wrapper for components using lifted state pattern
/// State lives in parent, child accesses via namespaced keys
/// </summary>
public class VComponentWrapper : VNode
{
    /// <summary>
    /// Component name for state namespacing (e.g., "UserProfile")
    /// </summary>
    public string ComponentName { get; set; } = "";

    /// <summary>
    /// Actual component type to instantiate (e.g., "UserProfile")
    /// </summary>
    public string ComponentType { get; set; } = "";

    /// <summary>
    /// Hex path for this wrapper node
    /// </summary>
    public string HexPath { get; set; } = "";

    /// <summary>
    /// Initial state values (applied on first render only)
    /// Keys get prefixed with ComponentName (e.g., "count" → "UserProfile.count")
    /// </summary>
    public Dictionary<string, object> InitialState { get; set; } = new();

    /// <summary>
    /// Reference to parent component (owns the state)
    /// </summary>
    public MinimactComponent ParentComponent { get; set; } = null!;

    /// <summary>
    /// Cached child component instance
    /// </summary>
    private MinimactComponent? _childInstance;

    /// <summary>
    /// Render the wrapped component with lifted state access
    /// </summary>
    public VNode Render()
    {
        // Create child instance on first render
        if (_childInstance == null)
        {
            _childInstance = CreateChildInstance();

            // Inject state namespace and parent reference
            _childInstance.SetStateNamespace(ComponentName, ParentComponent);

            // Initialize lifted state in parent (first render only)
            InitializeLiftedState();
        }

        // Render child component
        var childVNode = _childInstance.Render();

        // Prefix all child paths with this wrapper's path
        // e.g., "1.2" (wrapper) → "1.2:1", "1.2:1.1" (child nodes)
        HexPathManager.PrefixChildPaths(childVNode, HexPath);

        return childVNode;
    }

    private MinimactComponent CreateChildInstance()
    {
        var componentType = ComponentTypeRegistry.GetType(ComponentType);
        var instance = Activator.CreateInstance(componentType) as MinimactComponent;

        instance.ComponentId = $"{ParentComponent.ComponentId}_{ComponentName}";
        instance.ParentPath = HexPath;

        return instance;
    }

    private void InitializeLiftedState()
    {
        foreach (var kvp in InitialState)
        {
            // Namespace the key: "count" → "Counter.count"
            var namespacedKey = $"{ComponentName}.{kvp.Key}";

            // Only set if not already present (preserve state across renders)
            if (!ParentComponent.State.ContainsKey(namespacedKey))
            {
                ParentComponent.State[namespacedKey] = kvp.Value;
            }
        }
    }
}
```

---

## State Namespace Injection

### MinimactComponent Methods

```csharp
public abstract class MinimactComponent
{
    /// <summary>
    /// Namespace prefix for lifted state access
    /// When set, all GetState/SetState calls are automatically prefixed
    /// </summary>
    protected string? StateNamespace { get; private set; }

    /// <summary>
    /// Reference to parent component (for lifted state pattern)
    /// When set, state operations affect parent's state dictionary
    /// </summary>
    protected MinimactComponent? ParentComponent { get; private set; }

    /// <summary>
    /// Configure this component to use lifted state pattern
    /// Called by VComponentWrapper during initialization
    /// </summary>
    public void SetStateNamespace(string ns, MinimactComponent parent)
    {
        StateNamespace = ns;
        ParentComponent = parent;
    }

    /// <summary>
    /// Get state value with automatic namespace prefixing
    /// </summary>
    protected T GetState<T>(string key)
    {
        // Apply namespace prefix if configured
        var actualKey = StateNamespace != null
            ? $"{StateNamespace}.{key}"
            : key;

        // Read from parent state if available, otherwise local
        var stateSource = ParentComponent?.State ?? State;

        if (stateSource.TryGetValue(actualKey, out var value))
        {
            return (T)Convert.ChangeType(value, typeof(T));
        }

        return default(T)!;
    }

    /// <summary>
    /// Set state value with automatic namespace prefixing
    /// Triggers parent re-render when using lifted state
    /// </summary>
    protected void SetState<T>(string key, T value)
    {
        // Apply namespace prefix if configured
        var actualKey = StateNamespace != null
            ? $"{StateNamespace}.{key}"
            : key;

        if (ParentComponent != null)
        {
            // Store previous value for diffing
            if (ParentComponent.State.TryGetValue(actualKey, out var oldValue))
            {
                ParentComponent.PreviousState[actualKey] = oldValue;
            }

            // Update parent state
            ParentComponent.State[actualKey] = value!;

            // Trigger parent re-render (state changed)
            ParentComponent.TriggerRender();
        }
        else
        {
            // Local state (no parent)
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

**Key Insight:** When `StateNamespace` is set, `GetState("key")` and `SetState("key", value)` automatically become `GetState("Namespace.key")` and `SetState("Namespace.key", value)`.

---

## Child Component Render

### How Child Accesses Lifted State

```csharp
// Child component with StateNamespace = "UserProfile"
public partial class UserProfile : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // These look like normal GetState calls in child code...
        var username = GetState<string>("username");
        var isEditing = GetState<bool>("isEditing");

        // But because StateNamespace = "UserProfile", they actually read:
        // State["UserProfile.username"]
        // State["UserProfile.isEditing"]
        // from ParentComponent.State dictionary!

        return new VElement("div", "1",
            new VText("1:0", username),
            (new MObject(isEditing))
                ? new VElement("form", "1.1", /* ... */)
                : new VNull("1.1")
        );
    }

    public void Handle_EditButton_onClick()
    {
        // Looks like normal SetState in child code...
        SetState("isEditing", true);

        // But because StateNamespace = "UserProfile", this actually:
        // 1. Writes to: ParentComponent.State["UserProfile.isEditing"] = true
        // 2. Calls: ParentComponent.TriggerRender()
        // 3. Parent re-renders and can observe the new value!
    }
}
```

---

## Complete Example: Dashboard with Children

### TypeScript Input

```tsx
import { state, setState, Component } from '@minimact/core';

export function UserProfile() {
  const [username, setUsername] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div>
      <span>{username}</span>
      <button onClick={() => setIsEditing(!isEditing)}>
        {isEditing ? "Save" : "Edit"}
      </button>
    </div>
  );
}

export function ShoppingCart() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  return (
    <div>
      <p>Items: {items.length}</p>
      <p>Total: ${total}</p>
    </div>
  );
}

export default function Dashboard() {
  // Parent observes child state
  const userEditing = state["UserProfile.isEditing"];
  const cartTotal = state["ShoppingCart.total"];

  // Parent controls child state
  const handleCancelEdit = () => {
    setState("UserProfile.isEditing", false);
  };

  const handleClearCart = () => {
    setState("ShoppingCart.items", []);
    setState("ShoppingCart.total", 0);
  };

  return (
    <div>
      {userEditing && (
        <button onClick={handleCancelEdit}>Cancel Edit</button>
      )}

      <p>Cart Total: ${cartTotal}</p>

      <Component name="UserProfile" state={{ username: "", isEditing: false }}>
        <UserProfile />
      </Component>

      <Component name="ShoppingCart" state={{ items: [], total: 0 }}>
        <ShoppingCart />
      </Component>

      <button onClick={handleClearCart}>Clear Cart</button>
    </div>
  );
}
```

### Generated C# Output

```csharp
// UserProfile.cs
public partial class UserProfile : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var username = GetState<string>("username");      // State["UserProfile.username"]
        var isEditing = GetState<bool>("isEditing");      // State["UserProfile.isEditing"]

        return new VElement("div", "1",
            new VElement("span", "1.1", new VText("1.1:0", username)),
            new VElement("button", "1.2",
                new Dictionary<string, object> { ["data-minimact-onclick"] = "Handle_1_2_onClick" },
                new VText("1.2:0", isEditing ? "Save" : "Edit")
            )
        );
    }

    public void Handle_1_2_onClick()
    {
        var isEditing = GetState<bool>("isEditing");
        SetState("isEditing", !isEditing);  // Writes to parent's State["UserProfile.isEditing"]
    }
}

// ShoppingCart.cs
public partial class ShoppingCart : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var items = GetState<List<dynamic>>("items");     // State["ShoppingCart.items"]
        var total = GetState<double>("total");            // State["ShoppingCart.total"]

        return new VElement("div", "1",
            new VElement("p", "1.1", new VText("1.1:0", $"Items: {items.Count}")),
            new VElement("p", "1.2", new VText("1.2:0", $"Total: ${total}"))
        );
    }
}

// Dashboard.cs
public partial class Dashboard : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // Parent reads child state directly from own State dictionary
        var userEditing = State["UserProfile.isEditing"];   // Direct read
        var cartTotal = State["ShoppingCart.total"];        // Direct read

        return new VElement("div", "1",
            // Conditional based on child state
            (new MObject(userEditing))
                ? new VElement("button", "1.1",
                    new Dictionary<string, object> { ["data-minimact-onclick"] = "Handle_1_1_onClick" },
                    new VText("1.1:0", "Cancel Edit")
                  )
                : new VNull("1.1"),

            // Display child state
            new VElement("p", "1.2", new VText("1.2:0", $"Cart Total: ${cartTotal}")),

            // UserProfile wrapper
            new VComponentWrapper
            {
                ComponentName = "UserProfile",
                ComponentType = "UserProfile",
                HexPath = "1.3",
                InitialState = new Dictionary<string, object>
                {
                    ["username"] = "",        // → State["UserProfile.username"]
                    ["isEditing"] = false     // → State["UserProfile.isEditing"]
                },
                ParentComponent = this
            },

            // ShoppingCart wrapper
            new VComponentWrapper
            {
                ComponentName = "ShoppingCart",
                ComponentType = "ShoppingCart",
                HexPath = "1.4",
                InitialState = new Dictionary<string, object>
                {
                    ["items"] = new List<dynamic>(),  // → State["ShoppingCart.items"]
                    ["total"] = 0.0                   // → State["ShoppingCart.total"]
                },
                ParentComponent = this
            },

            // Clear cart button
            new VElement("button", "1.5",
                new Dictionary<string, object> { ["data-minimact-onclick"] = "Handle_1_5_onClick" },
                new VText("1.5:0", "Clear Cart")
            )
        );
    }

    public void Handle_1_1_onClick()
    {
        // Parent modifies child state
        SetState("UserProfile.isEditing", false);
    }

    public void Handle_1_5_onClick()
    {
        // Parent modifies sibling states
        SetState("ShoppingCart.items", new List<dynamic>());
        SetState("ShoppingCart.total", 0.0);
    }
}
```

### Parent's State Dictionary Contents

```csharp
// Parent component's State dictionary:
{
    // Parent's own state (if any)
    "theme": "dark",

    // UserProfile child state (namespaced)
    "UserProfile.username": "",
    "UserProfile.isEditing": false,

    // ShoppingCart child state (namespaced)
    "ShoppingCart.items": [...],
    "ShoppingCart.total": 150.00
}
```

**All state in one place!** This is what enables:
- ✅ Parent can read any child state
- ✅ Parent can write any child state
- ✅ Siblings can observe each other
- ✅ Perfect prediction (full state tree visible)

---

## Event Handlers with Lifted State

### TypeScript Input

```tsx
export function Counter() {
  const [count, setCount] = useState(0);

  const handleIncrement = () => {
    setCount(count + 1);
  };

  return (
    <button onClick={handleIncrement}>
      Count: {count}
    </button>
  );
}
```

### Generated C# Output

```csharp
public partial class Counter : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var count = GetState<int>("count");  // Reads State["Counter.count"] if namespaced

        return new VElement("button", "1",
            new Dictionary<string, object>
            {
                ["type"] = "button",
                ["data-minimact-onclick"] = "Handle_1_onClick"
            },
            new VText("1:0", $"Count: {count}")
        );
    }

    public void Handle_1_onClick()
    {
        var count = GetState<int>("count");

        // If StateNamespace = "Counter", this writes to parent's State["Counter.count"]
        SetState("count", count + 1);

        // Then calls ParentComponent.TriggerRender()
        // Parent re-renders and sees updated State["Counter.count"]
    }
}
```

---

## Predictive Rendering Integration

### How Prediction Works with Lifted State

1. **User clicks button in child component**

```csharp
// Counter child component
public void Handle_1_onClick()
{
    var count = GetState<int>("count");
    SetState("count", count + 1);  // Writes to State["Counter.count"]
}
```

2. **SetState calls ParentComponent.TriggerRender()**

```csharp
// MinimactComponent.SetState (when StateNamespace is set)
ParentComponent.State["Counter.count"] = value;
ParentComponent.TriggerRender();
```

3. **Parent re-renders with new state**

```csharp
// Dashboard.Render()
var counterValue = State["Counter.count"];  // Now reads updated value!

return new VElement("div", "1",
    new VElement("p", "1.1", new VText("1.1:0", $"Counter: {counterValue}")),
    new VComponentWrapper { ComponentName = "Counter", /* ... */ }
);
```

4. **Rust reconciler computes patches**

```rust
// Rust reconciler sees state change
let state_changes = hashmap!{
    "Counter.count" => 5
};

// Matches against templates
let patches = predict_patches(&state_changes, &templates);

// Generates patches for:
// - Counter component (button text update)
// - Dashboard component (paragraph text update, if parent displays counter value)
```

5. **Client applies patches instantly**

```typescript
// Client-side (hooks.ts)
const hint = context.hintQueue.matchHint(componentId, { "Counter.count": 5 });
if (hint) {
  context.domPatcher.applyPatches(context.element, hint.patches);
  // Instant update! No round trip needed.
}
```

### Prediction Keys

With lifted state, prediction keys are **namespaced**:

```json
{
  "hintId": "Counter_increment",
  "componentId": "Dashboard_abc123",
  "stateChanges": {
    "Counter.count": 5
  },
  "patches": [
    { "type": "UpdateText", "path": [0, 2, 0], "text": "Count: 5" },
    { "type": "UpdateText", "path": [0, 0, 0], "text": "Counter: 5" }
  ]
}
```

The predictor can generate patches for:
- ✅ The child component itself (Counter button text)
- ✅ The parent component (Dashboard paragraph showing counter)
- ✅ Other siblings that observe the same state

**All from a single state change!**

---

## Summary

### The Generated C# Pattern

1. **VComponentWrapper** - Wraps children with lifted state
2. **State namespace injection** - `SetStateNamespace("Name", parent)`
3. **Automatic prefixing** - `GetState("key")` → reads `State["Name.key"]`
4. **Parent dictionary** - All state in parent's `State` dict
5. **Parent re-renders** - `SetState` calls `ParentComponent.TriggerRender()`

### State Dictionary Layout

```csharp
// Parent component State dictionary:
{
    // Own state
    "myKey": "myValue",

    // Child1 state
    "Child1.key1": value1,
    "Child1.key2": value2,

    // Child2 state
    "Child2.key1": value3,
    "Child2.key2": value4
}
```

### Key Benefits

✅ **Zero prop drilling** - No props passed to children
✅ **Parent control** - Can read/write any child state
✅ **Transparent to children** - Children use normal GetState/SetState
✅ **Perfect prediction** - Full state tree visible for template matching
✅ **Trivial debugging** - All state in one flat dictionary
✅ **Hot reload friendly** - State survives component reload

---

**This is the future of component composition!** 🚀
