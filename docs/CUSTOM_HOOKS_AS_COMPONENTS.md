# Custom Hooks as Components: Namespaced Architecture

**Status:** Design Document
**Version:** 1.0
**Last Updated:** 2025-01-12

---

## Executive Summary

Minimact's custom hooks leverage the **lifted state pattern** to function as **lightweight child components** with namespaced state. Instead of runtime function composition (React) or complex inlining (AST transformation), custom hooks transpile to **`[Hook]` component classes** in the same file as the parent component.

**Key Innovation:** Custom hooks are child components that return both **state/methods** AND **JSX UI fragments**.

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [Architecture Overview](#architecture-overview)
3. [How It Works](#how-it-works)
4. [TSX to C# Transpilation](#tsx-to-c-transpilation)
5. [State Namespacing](#state-namespacing)
6. [JSX Return Values](#jsx-return-values)
7. [Client Runtime Integration](#client-runtime-integration)
8. [Advanced Examples](#advanced-examples)
9. [Implementation Guide](#implementation-guide)
10. [Comparison with React](#comparison-with-react)

---

## Philosophy

### The Problem with React Hooks

React's hooks are **runtime functions** with hidden state:
- State stored in opaque internal array
- Hook order determines state slot (fragile)
- Cannot return JSX (hooks vs. components are separate)
- Custom hooks compose via function calls (runtime overhead)

### The Minimact Solution

Minimact hooks are **compile-time generated component classes**:
- State stored in parent's State dictionary with namespace
- Hook class has explicit `[State]` fields (transparent)
- Can return JSX as part of hook API
- Zero runtime overhead (compiles to VComponentWrapper)

**Mental Model:**
```
React Hook     = Runtime function with hidden state
Minimact Hook  = Child component with namespaced state
```

---

## Architecture Overview

### Three Types of Custom Hooks

#### 1. **Stateful Hooks** (with `useState`)
Hooks that manage state via `useState` calls.

**Example:**
```tsx
function useToggle(namespace: string, initialValue = false) {
  const [value, setValue] = useState(initialValue);
  const toggle = () => setValue(!value);
  return [value, toggle];
}
```

**Transpiles to:**
```csharp
[Hook]
public partial class UseToggleHook : MinimactComponent
{
    [State] private bool value = false;
    private void setValue(bool v) => SetState("value", v);
    private void toggle() => setValue(!value);
}
```

---

#### 2. **Macro Hooks** (no `useState`)
Hooks that generate code at compile-time (see CUSTOM_HOOKS_MACRO_SYSTEM.md).

**Example:**
```tsx
const fullName = useDerived(() => `${first} ${last}`);
```

**Transpiles to:**
```csharp
[Computed(Dependencies = new[] { "first", "last" })]
public string fullName => $"{first} {last}";
```

---

#### 3. **Hybrid Hooks** (state + JSX)
Hooks that manage state AND return UI components.

**Example:**
```tsx
function useCounter(namespace: string, start = 0) {
  const [count, setCount] = useState(start);
  const increment = () => setCount(count + 1);

  const ui = (
    <div>
      <button onClick={increment}>+</button>
      <span>{count}</span>
    </div>
  );

  return [count, increment, ui];
}
```

**Transpiles to:**
```csharp
[Hook]
public partial class UseCounterHook : MinimactComponent
{
    [State] private int count = 0;
    private void increment() => count++;

    protected override VNode Render() {
        return new VElement("div", "1", ..., new VNode[] {
            new VElement("button", "1.1", ["onclick"] = "Handle0", "+"),
            new VElement("span", "1.2", $"{count}")
        });
    }

    public void Handle0() => increment();
}
```

---

## How It Works

### Complete Flow: From TSX to Runtime

#### Step 1: TSX Source

```tsx
// Hook definition
function useCounter(namespace: string, start = 0) {
  const [count, setCount] = useState(start);
  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);

  const ui = (
    <div className="counter-widget">
      <button onClick={decrement}>-</button>
      <span>{count}</span>
      <button onClick={increment}>+</button>
    </div>
  );

  return [count, increment, ui];
}

// Component using the hook
export default function MyComponent() {
  const [count, increment, counterUI] = useCounter('myCounter', 0);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={increment}>External +1</button>
      {counterUI}
    </div>
  );
}
```

---

#### Step 2: Babel Transpilation

**What Babel Does:**

1. **Detects hook definition** (`function useCounter(...)`)
2. **Analyzes hook structure:**
   - Finds `useState` calls → generates `[State]` fields
   - Finds methods → generates C# methods
   - Finds JSX in return → generates `Render()` method
3. **Generates hook class** with `[Hook]` attribute
4. **Replaces hook call** in component with `VComponentWrapper`
5. **Maps return values** to namespaced state access

---

#### Step 3: Generated C# (Single File)

```csharp
using Minimact.AspNetCore.Core;
using System.Collections.Generic;

namespace Minimact.Components;

// ============================================================
// HOOK CLASS - Generated from useCounter
// ============================================================
[Hook]
public partial class UseCounterHook : MinimactComponent
{
    // Hook state (lifted to parent via namespace)
    [State]
    private int count = 0;

    // Hook methods
    private void setCount(int value)
    {
        SetState(nameof(count), value);
        // ↑ With namespace, writes to parent.State["myCounter.count"]
    }

    private void increment()
    {
        setCount(count + 1);
    }

    private void decrement()
    {
        setCount(count - 1);
    }

    // Hook UI rendering
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1",
            new Dictionary<string, string> { ["class"] = "counter-widget" },
            new VNode[] {
                new VElement("button", "1.1",
                    new Dictionary<string, string> { ["onclick"] = "Handle0" },
                    "-"),
                new VElement("span", "1.2",
                    new Dictionary<string, string>(),
                    $"{count}"),
                new VElement("button", "1.3",
                    new Dictionary<string, string> { ["onclick"] = "Handle1" },
                    "+")
            });
    }

    // Event handlers
    public void Handle0() => decrement();
    public void Handle1() => increment();
}

// ============================================================
// MAIN COMPONENT - Uses the hook
// ============================================================
[Component]
public partial class MyComponent : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // Access hook state via namespace (lifted state pattern)
        var count = State["myCounter.count"];

        // Hook UI rendered via VComponentWrapper (child component)
        var counterUI = new VComponentWrapper
        {
            ComponentName = "myCounter",
            ComponentType = "UseCounterHook",
            HexPath = "1.3",
            InitialState = new Dictionary<string, object> {
                ["count"] = 0  // Initial value from useCounter('myCounter', 0)
            }
        };

        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[] {
            new VElement("h1", "1.1", new Dictionary<string, string>(),
                $"Count: {count}"),
            new VElement("button", "1.2",
                new Dictionary<string, string> { ["onclick"] = "Handle0" },
                "External +1"),
            counterUI  // ← Hook renders as child component here
        });
    }

    // Parent can call hook methods via state manipulation
    public void Handle0()
    {
        // Increment the hook's count
        var currentCount = GetState<int>("myCounter.count");
        SetState("myCounter.count", currentCount + 1);
        // This triggers parent re-render, which re-renders the hook
    }
}
```

---

#### Step 4: Runtime Execution

**When component renders:**

1. **Parent renders** → Creates `VComponentWrapper` at hex path "1.3"
2. **VComponentWrapper.RenderChild()** called:
   ```csharp
   var hookInstance = ComponentTypeRegistry.GetType("UseCounterHook");
   hookInstance.SetStateNamespace("myCounter", ParentComponent);
   ParentComponent.State["myCounter.count"] = 0;  // Initialize
   ```
3. **Hook.Render()** called:
   ```csharp
   StateManager.SyncMembersToState(this);
   // ↓ Reads [State] int count field
   // ↓ Gets value from ParentComponent.State["myCounter.count"]

   var count = GetState<int>("count");
   // ↓ With namespace: reads ParentComponent.State["myCounter.count"]
   ```
4. **Hook button clicked**:
   ```csharp
   increment();
   // ↓ Calls setCount(count + 1)
   // ↓ SetState("count", value)
   // ↓ With namespace: writes ParentComponent.State["myCounter.count"] = value
   // ↓ Calls ParentComponent.TriggerRender()
   ```
5. **Parent re-renders** → Hook re-renders with new state

---

## TSX to C# Transpilation

### Hook Definition Pattern

**TSX Pattern:**
```tsx
function use{HookName}(namespace: string, ...args) {
  // 1. State declarations
  const [state1, setState1] = useState(initial1);
  const [state2, setState2] = useState(initial2);

  // 2. Methods
  const method1 = () => { ... };
  const method2 = () => { ... };

  // 3. Optional: JSX UI
  const ui = (
    <div>...</div>
  );

  // 4. Return array
  return [state1, state2, method1, method2, ui];
}
```

**C# Pattern:**
```csharp
[Hook]
public partial class Use{HookName}Hook : MinimactComponent
{
    // 1. State fields
    [State]
    private Type1 state1 = initial1;

    [State]
    private Type2 state2 = initial2;

    // 2. Setter methods
    private void setState1(Type1 value) => SetState(nameof(state1), value);
    private void setState2(Type2 value) => SetState(nameof(state2), value);

    // 3. Methods
    private void method1() { ... }
    private void method2() { ... }

    // 4. Optional: Render method
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);
        return new VElement(...);
    }
}
```

---

### Hook Usage Pattern

**TSX Pattern:**
```tsx
const [value1, value2, method1, method2, ui] = useHookName('namespace', arg1, arg2);
```

**C# Pattern:**
```csharp
// Access values via namespaced state
var value1 = State["namespace.state1"];
var value2 = State["namespace.state2"];

// UI becomes VComponentWrapper
var ui = new VComponentWrapper
{
    ComponentName = "namespace",
    ComponentType = "UseHookNameHook",
    HexPath = "...",
    InitialState = new Dictionary<string, object> {
        ["state1"] = arg1,
        ["state2"] = arg2
    }
};

// Methods called via state manipulation
private void callMethod1()
{
    // Trigger hook method by manipulating state or calling SignalR
    InvokeHookMethod("namespace", "method1");
}
```

---

## State Namespacing

### The Lifted State Pattern

Custom hooks use the **exact same pattern** as lifted state components (see LIFTED_STATE_IMPLEMENTATION_SUMMARY.md).

**Key Concept:** All hook state is stored in the **parent component's State dictionary** with a namespace prefix.

---

### State Dictionary Structure

```csharp
// Parent component's State dictionary
{
    // Parent's own state
    "theme": "dark",
    "isLoading": false,

    // Hook 1: myCounter (UseCounterHook)
    "myCounter.count": 5,

    // Hook 2: emailField (UseFormFieldHook)
    "emailField.value": "user@example.com",
    "emailField.error": "",
    "emailField.touched": true,

    // Hook 3: passwordField (UseFormFieldHook)
    "passwordField.value": "********",
    "passwordField.error": "",
    "passwordField.touched": false
}
```

**All state in one flat structure!**

---

### Benefits of Namespacing

#### ✅ 1. **No State Collisions**
```tsx
// Multiple instances of same hook
const [count1, , ui1] = useCounter('counter1', 0);
const [count2, , ui2] = useCounter('counter2', 10);

// State keys:
// counter1.count = 0
// counter2.count = 10
```

#### ✅ 2. **Parent Can Observe Hook State**
```tsx
// Parent reads hook state directly
const emailValue = state["emailField.value"];
const emailError = state["emailField.error"];

// Parent can conditionally render based on hook state
{emailError && <span className="global-error">Fix email!</span>}
```

#### ✅ 3. **Parent Can Modify Hook State**
```tsx
// Parent has a "Reset All" button
const resetAll = () => {
  setState("emailField.value", "");
  setState("emailField.error", "");
  setState("passwordField.value", "");
  setState("passwordField.error", "");
};
```

#### ✅ 4. **Sibling Hooks Can Communicate**
```tsx
// Hook 1: Shopping cart
const [cartItems, , cartUI] = useShoppingCart('cart', []);

// Hook 2: Navigation bar (observes cart)
const [, , navUI] = useNavBar('nav', {
  badgeCount: state["cart.items"].length  // ← Reads cart state!
});
```

#### ✅ 5. **Perfect Predictive Rendering**
```json
// All state visible to predictor
{
  "counter1.count": 5,
  "counter2.count": 10,
  "emailField.value": "user@example.com"
}

// Predictor generates perfect hints
{
  "counter1_increment": {
    "stateChanges": { "counter1.count": 6 },
    "patches": [...]
  }
}
```

---

## JSX Return Values

### The Innovation: Hooks Can Return UI

Unlike React (where hooks cannot return JSX), Minimact hooks can return **JSX fragments** as part of their API.

---

### Pattern 1: Simple UI Return

**TSX:**
```tsx
function useLoadingSpinner(namespace: string, isLoading = false) {
  const [loading, setLoading] = useState(isLoading);

  const ui = loading && (
    <div className="spinner">
      <div className="spinner-icon"></div>
      <span>Loading...</span>
    </div>
  );

  return [loading, setLoading, ui];
}

// Usage
const [isLoading, setLoading, spinnerUI] = useLoadingSpinner('loader', false);

return (
  <div>
    <button onClick={() => setLoading(true)}>Load Data</button>
    {spinnerUI}
  </div>
);
```

**Generated C#:**
```csharp
[Hook]
public partial class UseLoadingSpinnerHook : MinimactComponent
{
    [State] private bool loading = false;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return (loading)
            ? new VElement("div", "1",
                new Dictionary<string, string> { ["class"] = "spinner" },
                new VNode[] {
                    new VElement("div", "1.1",
                        new Dictionary<string, string> { ["class"] = "spinner-icon" }),
                    new VElement("span", "1.2", "Loading...")
                })
            : new VNull("1");
    }
}

// In parent component
var spinnerUI = new VComponentWrapper {
    ComponentName = "loader",
    ComponentType = "UseLoadingSpinnerHook",
    HexPath = "1.2",
    InitialState = new Dictionary<string, object> { ["loading"] = false }
};
```

---

### Pattern 2: Complex UI with Interactions

**TSX:**
```tsx
function useFormField(namespace: string, label: string, type = 'text') {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const validate = () => {
    if (value.length < 3) {
      setError('Too short');
    } else {
      setError('');
    }
  };

  const handleBlur = () => {
    setTouched(true);
    validate();
  };

  const ui = (
    <div className="form-field">
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        className={error && touched ? 'error' : ''}
      />
      {touched && error && <span className="error-msg">{error}</span>}
    </div>
  );

  return [value, setValue, error, ui];
}
```

**Generated C#:**
```csharp
[Hook]
public partial class UseFormFieldHook : MinimactComponent
{
    // Configuration (from hook arguments)
    private string label => GetState<string>("_config.label");
    private string type => GetState<string>("_config.type");

    // Hook state
    [State] private string value = "";
    [State] private string error = "";
    [State] private bool touched = false;

    // Methods
    private void setValue(string v) => SetState("value", v);
    private void setError(string e) => SetState("error", e);
    private void setTouched(bool t) => SetState("touched", t);

    private void validate()
    {
        if (value.Length < 3) {
            setError("Too short");
        } else {
            setError("");
        }
    }

    private void handleBlur()
    {
        setTouched(true);
        validate();
    }

    // Render hook UI
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1",
            new Dictionary<string, string> { ["class"] = "form-field" },
            new VNode[] {
                new VElement("label", "1.1", label),
                new VElement("input", "1.2",
                    new Dictionary<string, string> {
                        ["type"] = type,
                        ["value"] = value,
                        ["onchange"] = "Handle0",
                        ["onblur"] = "Handle1",
                        ["class"] = (error != "" && touched) ? "error" : ""
                    }),
                (touched && error != "")
                    ? new VElement("span", "1.3",
                        new Dictionary<string, string> { ["class"] = "error-msg" },
                        error)
                    : new VNull("1.3")
            });
    }

    public void Handle0(dynamic e) => setValue(e.target.value);
    public void Handle1() => handleBlur();
}
```

---

### Pattern 3: Conditional UI Rendering

**TSX:**
```tsx
function useModal(namespace: string, title: string, content: any) {
  const [isOpen, setOpen] = useState(false);

  const ui = isOpen && (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={() => setOpen(false)}>×</button>
        </div>
        <div className="modal-body">
          {content}
        </div>
      </div>
    </div>
  );

  return [isOpen, setOpen, ui];
}

// Usage
const [, openModal, modalUI] = useModal('confirmDialog', 'Confirm', (
  <div>
    <p>Are you sure?</p>
    <button onClick={handleConfirm}>Yes</button>
    <button onClick={() => openModal(false)}>No</button>
  </div>
));

return (
  <div>
    <button onClick={() => openModal(true)}>Open Modal</button>
    {modalUI}
  </div>
);
```

---

## Client Runtime Integration

### How Client Runtime Handles Hooks

**Key Insight:** From the client's perspective, hooks are **just child components** with namespaced state.

---

### Template Generation

Hooks generate templates just like any other component:

```json
{
  "components": {
    "UseCounterHook": {
      "templates": {
        "increment": {
          "stateChanges": { "count": "{INCREMENT}" },
          "patches": [
            {
              "path": "1.2",
              "op": "setText",
              "value": "{count}"
            }
          ]
        },
        "decrement": {
          "stateChanges": { "count": "{DECREMENT}" },
          "patches": [
            {
              "path": "1.2",
              "op": "setText",
              "value": "{count}"
            }
          ]
        }
      }
    }
  }
}
```

---

### Client State Management

```javascript
// Parent component context
const parentContext = {
  componentId: 'comp_123',
  state: new Map([
    // Parent state
    ['theme', 'dark'],

    // Hook state (namespaced)
    ['myCounter.count', 5],
    ['emailField.value', 'user@example.com'],
    ['emailField.error', '']
  ]),
  // ...
};

// Hook instance context (child component)
const hookContext = {
  componentId: 'comp_123_myCounter',
  componentType: 'UseCounterHook',
  state: new Map([
    ['count', 5]  // Local reference
  ]),
  parentContext: parentContext,
  namespace: 'myCounter'
};
```

---

### Event Handling in Hooks

**When hook button is clicked:**

```javascript
// Hook's Handle0 is called (increment button)
function Handle0() {
  // 1. Get current value from namespaced state
  const currentCount = parentContext.state.get('myCounter.count');
  const newCount = currentCount + 1;

  // 2. Update parent's namespaced state
  parentContext.state.set('myCounter.count', newCount);

  // 3. Also update hook's local state reference
  hookContext.state.set('count', newCount);

  // 4. Match template for hook
  const hint = hintQueue.matchHint('UseCounterHook', {
    'count': newCount
  });

  // 5. Apply patches to hook's DOM element
  if (hint) {
    domPatcher.applyPatches(hookElement, hint.patches);
  }

  // 6. Sync to server (parent's namespaced state)
  signalR.updateComponentState(parentContext.componentId, 'myCounter.count', newCount);
}
```

---

### Predictive Rendering Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User clicks hook button                                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Hook event handler executes                                 │
│ - Updates parent.State["namespace.key"]                     │
│ - Updates hook.state["key"]                                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ HintQueue matches template                                  │
│ - Looks up "UseCounterHook.increment"                       │
│ - Finds cached patches                                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ DOMPatcher applies patches                                  │
│ - Updates hook's rendered UI instantly                      │
│ - User sees immediate feedback                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ SignalR syncs to server                                     │
│ - Sends parent.State["namespace.key"] = newValue            │
│ - Server updates parent's State dictionary                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Server re-renders parent (optional)                         │
│ - Parent renders with updated state                         │
│ - Hook re-renders as child component                        │
│ - Rust reconciler generates verification patches            │
└─────────────────────────────────────────────────────────────┘
```

---

## Advanced Examples

### Example 1: Form Validation Hook

**TSX:**
```tsx
function useValidatedField(
  namespace: string,
  label: string,
  validator: (value: string) => string
) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const validate = () => {
    const err = validator(value);
    setError(err);
    return err === '';
  };

  const handleChange = (e) => {
    setValue(e.target.value);
    if (touched) validate();
  };

  const handleBlur = () => {
    setTouched(true);
    validate();
  };

  const ui = (
    <div className={`field ${error && touched ? 'error' : ''}`}>
      <label>{label}</label>
      <input
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {touched && error && <span className="error">{error}</span>}
    </div>
  );

  const isValid = !error;

  return { value, setValue, error, isValid, validate, ui };
}

// Usage
export default function SignupForm() {
  const email = useValidatedField(
    'email',
    'Email Address',
    (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Invalid email'
  );

  const password = useValidatedField(
    'password',
    'Password',
    (v) => v.length >= 8 ? '' : 'Must be at least 8 characters'
  );

  const canSubmit = email.isValid && password.isValid;

  return (
    <form>
      <h1>Sign Up</h1>
      {email.ui}
      {password.ui}
      <button disabled={!canSubmit}>Submit</button>
    </form>
  );
}
```

**Generated C#:**
```csharp
[Hook]
public partial class UseValidatedFieldHook : MinimactComponent
{
    private string label => GetState<string>("_config.label");
    private Func<string, string> validator => GetState<Func<string, string>>("_config.validator");

    [State] private string value = "";
    [State] private string error = "";
    [State] private bool touched = false;

    private bool isValid => error == "";

    private bool validate()
    {
        var err = validator(value);
        setError(err);
        return err == "";
    }

    private void handleChange(dynamic e)
    {
        setValue(e.target.value);
        if (touched) validate();
    }

    private void handleBlur()
    {
        setTouched(true);
        validate();
    }

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1",
            new Dictionary<string, string> {
                ["class"] = $"field {(error != "" && touched ? "error" : "")}"
            },
            new VNode[] {
                new VElement("label", "1.1", label),
                new VElement("input", "1.2",
                    new Dictionary<string, string> {
                        ["value"] = value,
                        ["onchange"] = "Handle0",
                        ["onblur"] = "Handle1"
                    }),
                (touched && error != "")
                    ? new VElement("span", "1.3",
                        new Dictionary<string, string> { ["class"] = "error" },
                        error)
                    : new VNull("1.3")
            });
    }

    public void Handle0(dynamic e) => handleChange(e);
    public void Handle1() => handleBlur();
}

[Component]
public partial class SignupForm : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var emailIsValid = State["email.error"] == "";
        var passwordIsValid = State["password.error"] == "";
        var canSubmit = emailIsValid && passwordIsValid;

        var emailUI = new VComponentWrapper {
            ComponentName = "email",
            ComponentType = "UseValidatedFieldHook",
            HexPath = "1.2",
            InitialState = new Dictionary<string, object> {
                ["value"] = "",
                ["error"] = "",
                ["touched"] = false,
                ["_config.label"] = "Email Address",
                ["_config.validator"] = new Func<string, string>(v =>
                    Regex.IsMatch(v, @"^[^\s@]+@[^\s@]+\.[^\s@]+$") ? "" : "Invalid email"
                )
            }
        };

        var passwordUI = new VComponentWrapper {
            ComponentName = "password",
            ComponentType = "UseValidatedFieldHook",
            HexPath = "1.3",
            InitialState = new Dictionary<string, object> {
                ["value"] = "",
                ["error"] = "",
                ["touched"] = false,
                ["_config.label"] = "Password",
                ["_config.validator"] = new Func<string, string>(v =>
                    v.Length >= 8 ? "" : "Must be at least 8 characters"
                )
            }
        };

        return new VElement("form", "1", new Dictionary<string, string>(), new VNode[] {
            new VElement("h1", "1.1", "Sign Up"),
            emailUI,
            passwordUI,
            new VElement("button", "1.4",
                new Dictionary<string, string> { ["disabled"] = canSubmit ? null : "disabled" },
                "Submit")
        });
    }
}
```

---

### Example 2: Wizard Step Hook

**TSX:**
```tsx
function useWizardStep(
  namespace: string,
  title: string,
  content: any
) {
  const [isComplete, setComplete] = useState(false);
  const [isActive, setActive] = useState(false);

  const ui = (
    <div className={`wizard-step ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}>
      <div className="step-header">
        <h3>{title}</h3>
        {isComplete && <span className="checkmark">✓</span>}
      </div>
      {isActive && (
        <div className="step-content">
          {content}
        </div>
      )}
    </div>
  );

  return { isComplete, setComplete, isActive, setActive, ui };
}

// Usage
export default function OnboardingWizard() {
  const step1 = useWizardStep('step1', 'Profile Information', <ProfileForm />);
  const step2 = useWizardStep('step2', 'Preferences', <PreferencesForm />);
  const step3 = useWizardStep('step3', 'Confirmation', <ConfirmationPage />);

  const [currentStep, setCurrentStep] = useState(1);

  // Set active states based on current step
  useEffect(() => {
    step1.setActive(currentStep === 1);
    step2.setActive(currentStep === 2);
    step3.setActive(currentStep === 3);
  }, [currentStep]);

  const next = () => {
    if (currentStep === 1) step1.setComplete(true);
    if (currentStep === 2) step2.setComplete(true);
    setCurrentStep(currentStep + 1);
  };

  const canProceed = currentStep === 3 || (
    currentStep === 1 ? step1.isComplete : step2.isComplete
  );

  return (
    <div className="wizard">
      <h1>Onboarding</h1>
      {step1.ui}
      {step2.ui}
      {step3.ui}
      <button onClick={next} disabled={!canProceed}>
        {currentStep === 3 ? 'Finish' : 'Next'}
      </button>
    </div>
  );
}
```

---

### Example 3: Shopping Cart Hook

**TSX:**
```tsx
function useShoppingCart(namespace: string, initialItems = []) {
  const [items, setItems] = useState(initialItems);

  const addItem = (item) => {
    setItems([...items, item]);
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateQuantity = (id, qty) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, quantity: qty } : item
    ));
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.length;

  const ui = (
    <div className="cart">
      <h3>Shopping Cart ({itemCount} items)</h3>
      <div className="cart-items">
        {items.map(item => (
          <div key={item.id} className="cart-item">
            <span>{item.name}</span>
            <input
              type="number"
              value={item.quantity}
              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
            />
            <span>${(item.price * item.quantity).toFixed(2)}</span>
            <button onClick={() => removeItem(item.id)}>Remove</button>
          </div>
        ))}
      </div>
      <div className="cart-total">
        <strong>Total: ${total.toFixed(2)}</strong>
      </div>
    </div>
  );

  return { items, addItem, removeItem, updateQuantity, total, itemCount, ui };
}

// Usage
export default function StorePage() {
  const cart = useShoppingCart('mainCart', []);

  const products = [
    { id: 1, name: 'Laptop', price: 999 },
    { id: 2, name: 'Mouse', price: 29 },
    { id: 3, name: 'Keyboard', price: 79 }
  ];

  return (
    <div className="store">
      <div className="products">
        <h2>Products</h2>
        {products.map(product => (
          <div key={product.id} className="product">
            <h3>{product.name}</h3>
            <p>${product.price}</p>
            <button onClick={() => cart.addItem({ ...product, quantity: 1 })}>
              Add to Cart
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar">
        {cart.ui}
      </div>

      <div className="header">
        <span className="cart-badge">{cart.itemCount}</span>
      </div>
    </div>
  );
}
```

---

## Implementation Guide

### Babel Plugin Changes

#### 1. Hook Detection

```javascript
// babel-plugin-minimact/src/hooks/hookDetector.cjs

function isCustomHook(path) {
  // Must be a function declaration or arrow function
  if (!t.isFunctionDeclaration(path) &&
      !t.isVariableDeclarator(path)) {
    return false;
  }

  // Must start with 'use'
  const name = getFunctionName(path);
  if (!name.startsWith('use')) {
    return false;
  }

  // Must have namespace as first parameter
  const params = getFunctionParams(path);
  if (params.length === 0) {
    return false;
  }

  const firstParam = params[0];
  if (!isNamespaceParam(firstParam)) {
    return false;
  }

  return true;
}

function isNamespaceParam(param) {
  // Check if parameter is named 'namespace' and typed as string
  return param.name === 'namespace' &&
         (!param.typeAnnotation || isStringType(param.typeAnnotation));
}
```

---

#### 2. Hook Structure Analysis

```javascript
// babel-plugin-minimact/src/hooks/hookAnalyzer.cjs

function analyzeHook(hookPath) {
  const hookName = getFunctionName(hookPath);
  const params = getFunctionParams(hookPath);
  const body = getFunctionBody(hookPath);

  const analysis = {
    name: hookName,
    className: `${capitalize(hookName)}Hook`,
    params: params.slice(1), // Exclude namespace param
    states: [],
    methods: [],
    jsx: null,
    returns: []
  };

  // Find useState calls
  traverse(body, {
    CallExpression(path) {
      if (path.node.callee.name === 'useState') {
        const state = extractStateFromUseState(path);
        analysis.states.push(state);
      }
    }
  });

  // Find methods (arrow functions, function declarations)
  traverse(body, {
    VariableDeclarator(path) {
      if (isMethod(path)) {
        const method = extractMethod(path);
        analysis.methods.push(method);
      }
    }
  });

  // Find JSX in return
  traverse(body, {
    ReturnStatement(path) {
      const jsx = extractJSXFromReturn(path);
      if (jsx) {
        analysis.jsx = jsx;
      }

      const returns = extractReturnValues(path);
      analysis.returns = returns;
    }
  });

  return analysis;
}
```

---

#### 3. Hook Class Generation

```javascript
// babel-plugin-minimact/src/hooks/hookClassGenerator.cjs

function generateHookClass(analysis, component) {
  const hookClass = {
    name: analysis.className,
    attribute: '[Hook]',
    baseClass: 'MinimactComponent',
    states: [],
    methods: [],
    renderMethod: null,
    eventHandlers: []
  };

  // Generate [State] fields
  analysis.states.forEach(state => {
    hookClass.states.push({
      name: state.varName,
      type: state.type,
      initialValue: state.initialValue,
      attribute: '[State]'
    });

    // Generate setter method
    hookClass.methods.push({
      name: state.setterName,
      returnType: 'void',
      parameters: [{ name: 'value', type: state.type }],
      body: `SetState(nameof(${state.varName}), value);`
    });
  });

  // Generate methods
  analysis.methods.forEach(method => {
    hookClass.methods.push({
      name: method.name,
      returnType: method.returnType,
      parameters: method.parameters,
      body: transpileToC Sharp(method.body)
    });
  });

  // Generate Render() method if JSX exists
  if (analysis.jsx) {
    hookClass.renderMethod = generateRenderMethod(analysis.jsx);
    hookClass.eventHandlers = extractEventHandlers(analysis.jsx);
  }

  return hookClass;
}
```

---

#### 4. Hook Usage Replacement

```javascript
// babel-plugin-minimact/src/hooks/hookUsageReplacer.cjs

function replaceHookUsage(callPath, hookAnalysis, component) {
  const args = callPath.node.arguments;
  const namespace = args[0].value; // First arg is namespace
  const hookArgs = args.slice(1);  // Rest are hook config

  // Extract variable names from destructuring
  const declarator = callPath.findParent(p => p.isVariableDeclarator());
  const returnBindings = extractReturnBindings(declarator);
  // e.g., [count, increment, ui] from: const [count, increment, ui] = useCounter(...)

  // Generate VComponentWrapper for hook UI
  if (hookAnalysis.jsx) {
    const wrapperVar = findUIBinding(returnBindings, hookAnalysis.returns);

    // Replace ui variable with VComponentWrapper
    component.vnodes.push({
      varName: wrapperVar,
      type: 'VComponentWrapper',
      properties: {
        ComponentName: namespace,
        ComponentType: hookAnalysis.className,
        HexPath: allocateHexPath(component),
        InitialState: generateInitialState(hookAnalysis, hookArgs)
      }
    });
  }

  // Replace state value bindings with namespaced state access
  hookAnalysis.returns.forEach((returnValue, index) => {
    const binding = returnBindings[index];

    if (returnValue.type === 'state') {
      // Replace: const count = ...
      // With: const count = State["namespace.varName"]
      component.stateAccess.push({
        varName: binding,
        stateKey: `${namespace}.${returnValue.name}`
      });
    }
    else if (returnValue.type === 'method') {
      // Method calls need to manipulate namespaced state
      // (handled separately)
    }
  });

  // Remove the original hook call
  callPath.remove();
}
```

---

### C# Runtime Changes

#### 1. `[Hook]` Attribute

```csharp
// Minimact.AspNetCore/Core/Attributes/HookAttribute.cs

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Marks a MinimactComponent as a custom hook.
/// Hooks are lightweight child components with lifted state.
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
public class HookAttribute : Attribute
{
    /// <summary>
    /// Optional: Hook display name for debugging
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Whether this hook can be reused multiple times in same component.
    /// Default: true
    /// </summary>
    public bool Reusable { get; set; } = true;

    /// <summary>
    /// Optional: Documentation/description of what this hook does
    /// </summary>
    public string? Description { get; set; }
}
```

---

#### 2. ComponentTypeRegistry Updates

```csharp
// Minimact.AspNetCore/Core/ComponentTypeRegistry.cs

public static class ComponentTypeRegistry
{
    private static readonly Dictionary<string, Type> _componentTypes = new();
    private static readonly Dictionary<string, Type> _hookTypes = new();

    static ComponentTypeRegistry()
    {
        RegisterAllTypes();
    }

    private static void RegisterAllTypes()
    {
        var assemblies = AppDomain.CurrentDomain.GetAssemblies();

        foreach (var assembly in assemblies)
        {
            foreach (var type in assembly.GetTypes())
            {
                if (!typeof(MinimactComponent).IsAssignableFrom(type)) continue;
                if (type.IsAbstract) continue;

                var hookAttr = type.GetCustomAttribute<HookAttribute>();
                if (hookAttr != null)
                {
                    // Register as hook
                    _hookTypes[type.Name] = type;
                    _componentTypes[type.Name] = type; // Also in main registry
                }
                else
                {
                    var componentAttr = type.GetCustomAttribute<ComponentAttribute>();
                    if (componentAttr != null)
                    {
                        _componentTypes[type.Name] = type;
                    }
                }
            }
        }
    }

    public static Type? GetHookType(string name)
    {
        _hookTypes.TryGetValue(name, out var type);
        return type;
    }

    public static bool IsHook(string name)
    {
        return _hookTypes.ContainsKey(name);
    }
}
```

---

### Client Runtime Changes

**Good news:** No changes needed! Hooks work as child components, and the client runtime already supports VComponentWrapper and namespaced state.

---

## Comparison with React

| Feature | React Hooks | Minimact Hooks |
|---------|------------|----------------|
| **Architecture** | Runtime functions | Child component classes |
| **State Storage** | Hidden internal array | Parent's State dictionary (namespaced) |
| **State Access** | `const [x, setX] = useState()` | `State["namespace.x"]` |
| **Custom Hooks** | Function composition | Component class generation |
| **JSX Return** | ❌ Not allowed | ✅ Supported! |
| **Namespace** | ❌ No concept | ✅ Required (first param) |
| **Multiple Instances** | Order-dependent (fragile) | Namespace-isolated (robust) |
| **Parent Observability** | ❌ Hidden | ✅ Full visibility |
| **Sibling Communication** | ❌ Need context/props | ✅ Direct state access |
| **Type Safety** | TypeScript (erased at runtime) | C# (enforced at runtime) |
| **Debugging** | React DevTools | Read State dictionary |
| **Performance** | Runtime function calls | Zero overhead (compiled) |
| **Predictive Rendering** | ❌ Not applicable | ✅ Full template support |
| **Hot Reload** | ❌ Loses state | ✅ State preserved |

---

## Advantages of This Approach

### ✅ 1. **Perfect Encapsulation**
```csharp
// Hook is its own class
[Hook] public partial class UseCounterHook { ... }

// Parent just uses it
var counterUI = new VComponentWrapper { ... };
```

### ✅ 2. **Full Type Safety**
```csharp
[Hook]
public partial class UseFormFieldHook : MinimactComponent
{
    [State] private string value = "";  // Strongly typed!
    [State] private string error = "";  // Compile-time safety!
}
```

### ✅ 3. **Transparent State**
```csharp
// All state visible in one place
{
    "email.value": "user@example.com",
    "email.error": "",
    "password.value": "********",
    "cart.items": [...]
}
```

### ✅ 4. **Parent Can Observe/Modify**
```tsx
// Parent reads hook state
const emailValue = state["email.value"];

// Parent writes hook state
setState("email.value", "");  // Clear email field
```

### ✅ 5. **Reusable Hook Classes**
```csharp
// One hook class, many instances
[Hook] public partial class UseToggleHook { ... }

// In component:
var menu = new VComponentWrapper { ComponentType = "UseToggleHook", ... };
var modal = new VComponentWrapper { ComponentType = "UseToggleHook", ... };
```

### ✅ 6. **JSX Return Support**
```tsx
// Hooks can return UI!
const [value, setValue, ui] = useFormField('email', 'Email');

return (
  <div>
    {ui}  {/* Hook renders its own UI */}
  </div>
);
```

### ✅ 7. **Perfect Predictive Rendering**
```json
// Templates generated for hooks
{
  "UseFormFieldHook.handleChange": {
    "stateChanges": { "value": "{0}" },
    "patches": [...]
  }
}
```

### ✅ 8. **Hot Reload Friendly**
```csharp
// Change hook class
[Hook] public partial class UseCounterHook {
    // Add new feature here
}

// Parent doesn't recompile
[Component] public partial class MyComponent {
    // Uses updated hook automatically
}
```

---

## Summary

Minimact's custom hooks leverage the **lifted state pattern** to achieve:

1. ✅ **Hooks as child components** - Clean, encapsulated classes
2. ✅ **Namespaced state** - Perfect isolation and observability
3. ✅ **JSX return values** - Hooks can render their own UI
4. ✅ **Zero runtime overhead** - Compiles to VComponentWrapper
5. ✅ **Type safety** - C# enforces correctness
6. ✅ **Predictive rendering** - Full template support
7. ✅ **Parent control** - Can observe and modify hook state
8. ✅ **Sibling communication** - Hooks can read each other's state

This architecture is **simpler, faster, and more powerful** than React's runtime hook system, while maintaining a familiar developer experience.

---

**Next Steps:**
1. Review this design document
2. Implement Babel plugin hook detection and class generation
3. Add `[Hook]` attribute to C# runtime
4. Create example hook library (@minimact/hooks-core)
5. Test integration with predictive rendering system

---

**Questions? Feedback?**
Open an issue or discussion in the Minimact repository.
