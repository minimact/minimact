# TSX to Minimact C# Transformer Enhancement Roadmap

This document details how to enhance the transformer to handle complex real-world Minimact TSX patterns, overcome current limitations, and support the full Minimact feature set.

> **Minimact** = MINIMal Anticipatory Client Technology
> - TSX components compile to C# `MinimactComponent` classes
> - Server-side rendering with predictive patches (0-2ms latency)
> - No hydration - patches pre-cached before user interaction
> - Rust reconciliation engine computes patches
> - 12 KB client runtime vs 45 KB React

---

## Actual Output Patterns (From test-output/)

Before diving into enhancements, here are the **actual patterns** the transformer currently produces:

### Component Structure
```csharp
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Rendering;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;

namespace MinimactTest.Components
{
    [Component]
    public partial class Counter : MinimactComponent
    {
        [State]
        private int count = 0;

        protected override VNode Render()
        {
            StateManager.SyncMembersToState(this);
            // VNode tree
        }

        public void Handle0() { SetState(nameof(count), count + 1); }
    }
}
```

### Custom Hooks (Actual Pattern)
```csharp
[Hook]
public partial class UseCounterHook : MinimactComponent
{
    // Config from hook arguments
    private dynamic start => GetState<dynamic>("_config.start");

    [State]
    private dynamic count = start;

    private void setCount(dynamic value) => SetState(nameof(count), value);
    private void increment() => setCount(count + 1);
    private void decrement() => setCount(count - 1);
    private void reset() => setCount(start);

    protected override VNode Render() { /* UI */ }
}
```

### Hook Usage (VComponentWrapper)
```csharp
new VComponentWrapper
{
    ComponentName = "counter1",
    ComponentType = "UseCounterHook",
    HexPath = "1.2.4",
    InitialState = new Dictionary<string, object> { ["_config.param0"] = 0 }
}
```

### Lifted State Access
```csharp
// Parent reading child state
var counterValue = State["Counter.count"];

// Parent setting child state
SetState("Counter.count", 0);

// Child using local state
var isLoading = state.isLoading;
setState("isLoading", true);
```

### Conditionals with MObject
```csharp
(new MObject(myState1)) ? new VElement(...) : new VNull("1.2")
```

### Template JSON Structure
```json
{
  "1.2.1": {
    "template": "Count: {0}",
    "bindings": ["count"],
    "slots": [7],
    "path": ["1", "2"],
    "type": "dynamic"
  }
}
```

### Timeline Attributes
```csharp
[Timeline("AnimatedCounter_Timeline", 5000, Repeat = true, Easing = "ease-in-out")]
[TimelineKeyframe(0, "count", 0, Label = "start")]
[TimelineKeyframe(2500, "count", 50, Label = "midpoint")]
[TimelineStateBinding("count", Interpolate = true)]
[Component]
public partial class AnimatedCounter : MinimactComponent { }
```

---

## Table of Contents

1. [TypeScript Type System Support](#1-typescript-type-system-support)
2. [Import/Export Resolution](#2-importexport-resolution)
3. [Custom Hooks with UI Returns](#3-custom-hooks-with-ui-returns)
4. [useMvcState and MVC Bridge](#4-usemvcstate-and-mvc-bridge)
5. [Lifted State Components](#5-lifted-state-components)
6. [useProtectedState](#6-useprotectedstate)
7. [Advanced Event Handlers](#7-advanced-event-handlers)
8. [Complex Expressions](#8-complex-expressions)
9. [Style Objects and CSS-in-JS](#9-style-objects-and-css-in-js)
10. [List Rendering Enhancements](#10-list-rendering-enhancements)
11. [Form Handling](#11-form-handling)
12. [useServerTask and Rust Runtime](#12-useservertask-and-rust-runtime)
13. [Plugin Elements](#13-plugin-elements)
14. [useEffect and Lifecycle](#14-useeffect-and-lifecycle)
15. [SPA Mode (Link and Page)](#15-spa-mode-link-and-page)
16. [Hex Paths and VNull Generation](#16-hex-paths-and-vnull-generation)
17. [Template Extraction for Prediction](#17-template-extraction-for-prediction)
18. [Source Maps and Debugging](#18-source-maps-and-debugging)
19. [Timeline Animations](#19-timeline-animations)

---

## 1. TypeScript Type System Support

### Current Limitation
Types are inferred from initial values only. TypeScript annotations are ignored.

### Minimact-Specific Patterns
```tsx
// Generic hook types
const [data, setData] = useState<ProductViewModel>(null);
const [quantity, setQuantity] = useMvcState<number>('initialQuantity');

// Interface definitions for ViewModels
interface ProductViewModel {
  productName: string;
  price: number;
  isAdminRole: boolean;
  initialQuantity: number;  // [Mutable] from C# ViewModel
}

// useMvcViewModel typed access
const viewModel = useMvcViewModel<ProductViewModel>();
```

### Enhancement Plan

#### 1.1 Create TypeAnnotationVisitor
```csharp
public class TypeAnnotationVisitor : TokenVisitor
{
    public Dictionary<string, TypeInfo> TypeDefinitions { get; } = new();

    // Match: interface Name { ... }
    [TokenPattern(@"<keyword:interface> (<identifier>) <punctuation:{>")]
    public void VisitInterface(TokenMatch match, string name)
    {
        var body = ExtractFunctionBody(0);
        var props = ParseInterfaceProperties(body);
        TypeDefinitions[name] = new InterfaceType(name, props);
    }
}
```

#### 1.2 Map TypeScript to C# Types
```csharp
private static readonly Dictionary<string, string> TypeMap = new()
{
    ["string"] = "string",
    ["number"] = "double",  // Or int based on context
    ["boolean"] = "bool",
    ["null"] = "object?",
    ["undefined"] = "object?",
};

// For ViewModel interfaces, generate matching C# class
public class ProductViewModel
{
    public string ProductName { get; set; }
    public double Price { get; set; }
    public bool IsAdminRole { get; set; }
    [Mutable] public int InitialQuantity { get; set; }
}
```

---

## 2. Import/Export Resolution

### Current Limitation
Imports are not resolved. Cross-file dependencies are not tracked.

### Minimact-Specific Patterns
```tsx
// Minimact core imports
import { useState, useEffect, useRef } from '@minimact/core';
import { useServerTask, useComputed } from '@minimact/core/power';

// MVC Bridge imports
import { useMvcState, useMvcViewModel } from '@minimact/mvc';

// SPA imports
import { Page, Link } from '@minimact/spa';

// Custom hook imports (hooks return UI!)
import useToggle from './useToggle';
import { useCounter, useDoubler } from './useCounter';

// Renamed import
import Timer from './useTimer';
```

### Enhancement Plan

#### 2.1 Recognize Minimact Module Imports
```csharp
public class MinimactImportVisitor : TokenVisitor
{
    public HashSet<string> UsedHooks { get; } = new();
    public HashSet<string> UsedMvcHooks { get; } = new();
    public HashSet<string> UsedSpaComponents { get; } = new();
    public List<CustomHookImport> CustomHookImports { get; } = new();

    [TokenPattern(@"<keyword:import> <punctuation:{>")]
    public void VisitNamedImports(TokenMatch match)
    {
        var names = ExtractBalanced(0, "{", "}");
        var pathToken = FindPathAfterFrom(match);
        var path = pathToken.Trim('"', '\'');

        switch (path)
        {
            case "@minimact/core":
                foreach (var name in ParseNames(names))
                    UsedHooks.Add(name);
                break;
            case "@minimact/mvc":
                foreach (var name in ParseNames(names))
                    UsedMvcHooks.Add(name);
                break;
            case "@minimact/spa":
                foreach (var name in ParseNames(names))
                    UsedSpaComponents.Add(name);
                break;
            default:
                if (path.StartsWith("./") || path.StartsWith("../"))
                    ResolveCustomHook(path, names);
                break;
        }
    }
}
```

#### 2.2 Generate Appropriate C# Using Statements
```csharp
// Based on imports, generate:
using Minimact.AspNetCore.Core;           // @minimact/core
using Minimact.AspNetCore.Rendering;      // Always needed
using Minimact.AspNetCore.Mvc;            // @minimact/mvc
using Minimact.AspNetCore.Spa;            // @minimact/spa
using Minimact.AspNetCore.Power;          // @minimact/core/power
```

---

## 3. Custom Hooks with UI Returns

### Current Limitation
Only `useState` is recognized. Custom hooks with UI returns are not handled.

### Minimact Innovation
Unlike React, **Minimact hooks can return JSX UI**! Under the hood, they compile to child components using the Lifted State infrastructure.

```tsx
// Custom hook definition with UI return
function useCounter(namespace: string, start: number = 0) {
  const [count, setCount] = useState(start);

  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => setCount(start);

  // Hooks can return JSX! (unlike React)
  const ui = (
    <div className="counter-widget">
      <button onClick={decrement}>-</button>
      <span>{count}</span>
      <button onClick={increment}>+</button>
      <button onClick={reset}>Reset</button>
    </div>
  );

  return [count, increment, decrement, reset, ui];
}

// Usage with multiple independent instances
function Dashboard() {
  const [count1, increment1, , , counterUI1] = useCounter('counter1', 0);
  const [count2, increment2, , , counterUI2] = useCounter('counter2', 10);

  return (
    <div>
      <h2>Counter 1: {count1}</h2>
      {counterUI1}
      <h2>Counter 2: {count2}</h2>
      {counterUI2}
    </div>
  );
}
```

### Enhancement Plan

#### 3.1 Create CustomHookVisitor
```csharp
public class CustomHookVisitor : TokenVisitor
{
    public Dictionary<string, HookDefinition> Hooks { get; } = new();

    // Match: function useXxx(namespace: string, ...) { ... }
    [TokenPattern(@"<keyword:function> (<identifier:use.+?>) <punctuation:(>")]
    public void VisitHookDefinition(TokenMatch match, string hookName)
    {
        var params = ExtractParenthesized(0);
        var body = ExtractFunctionBody(0);

        // First param MUST be namespace (Minimact requirement)
        var parameters = ParseParameters(params);
        if (parameters.Count == 0 || parameters[0].Name != "namespace")
        {
            throw new InvalidOperationException(
                $"Custom hook {hookName} must have 'namespace: string' as first parameter");
        }

        var hook = new HookDefinition
        {
            Name = hookName,
            Parameters = parameters.Skip(1).ToList(), // Skip namespace
            StateFields = ExtractStateFromBody(body),
            Handlers = ExtractHandlersFromBody(body),
            UIFragment = ExtractUIFragment(body),
            ReturnArray = ParseReturnArray(body)
        };

        Hooks[hookName] = hook;
    }

    private VNodeModel? ExtractUIFragment(Token[] body)
    {
        // Find: const ui = (<jsx>);
        // Parse and return as VNodeModel
    }
}
```

#### 3.2 Generate Hook as Child Component (Match Actual Output)
```csharp
// useCounter('counter1', 0) compiles to:
// ============================================================
// HOOK CLASS - Generated from useCounter
// ============================================================
[Hook]
public partial class UseCounterHook : MinimactComponent
{
    // Configuration (from hook arguments) - uses _config pattern
    private dynamic start => GetState<dynamic>("_config.start");

    // Hook state
    [State]
    private dynamic count = start;

    // State setters (private, match TSX naming)
    private void setCount(dynamic value)
    {
        SetState(nameof(count), value);
    }

    // Hook methods (match TSX function names)
    private void increment()
    {
        return setCount((count + 1));
    }

    private void decrement()
    {
        return setCount((count - 1));
    }

    private void reset()
    {
        return setCount(start);
    }

    // Hook UI rendering
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

#### 3.3 Generate Usage as VComponentWrapper (Match Actual Output)
```csharp
// {counterUI1} compiles to (note: _config.param0 pattern for hook args):
new VComponentWrapper
{
    ComponentName = "counter1",
    ComponentType = "UseCounterHook",
    HexPath = "1.2.4",
    InitialState = new Dictionary<string, object> { ["_config.param0"] = 0 }
}

// Accessing hook state from parent:
$"External count:{(count1)}"  // References State["counter1.count"]
GetState<dynamic>("counter1.count")  // Explicit access
```

---

## 4. useMvcState and MVC Bridge

### Current Limitation
Only `useState` is recognized. `useMvcState` and `useMvcViewModel` are not handled.

### Minimact MVC Bridge Pattern
```tsx
import { useMvcState, useMvcViewModel } from '@minimact/mvc';

interface ProductViewModel {
  productName: string;
  price: number;
  isAdminRole: boolean;
  initialQuantity: number;
}

export function ProductPage() {
  // Immutable - from ViewModel (no setter)
  const [productName] = useMvcState<string>('productName');
  const [price] = useMvcState<number>('price');
  const [isAdmin] = useMvcState<boolean>('isAdminRole');

  // Mutable - from ViewModel (with setter, syncs to server)
  const [quantity, setQuantity] = useMvcState<number>('initialQuantity');

  // Access entire ViewModel
  const viewModel = useMvcViewModel<ProductViewModel>();

  // Pure client state (not from ViewModel)
  const [cartTotal, setCartTotal] = useState(0);
}
```

### Enhancement Plan

#### 4.1 Create MvcStateVisitor
```csharp
public class MvcStateVisitor : TokenVisitor
{
    public List<MvcStateBinding> Bindings { get; } = new();

    // Match: const [name] = useMvcState<Type>('key')
    [TokenPattern(@"<keyword:const> <punctuation:[> (<identifier>) <punctuation:]> <operator:=> <identifier:useMvcState>")]
    public void VisitImmutableMvcState(TokenMatch match, string name)
    {
        // Single destructured value = immutable (no setter)
        var typeAndKey = ExtractGenericAndArgs(match);

        Bindings.Add(new MvcStateBinding
        {
            LocalName = name,
            ViewModelKey = typeAndKey.Key,
            Type = typeAndKey.Type,
            IsMutable = false
        });
    }

    // Match: const [name, setName] = useMvcState<Type>('key')
    [TokenPattern(@"<keyword:const> <punctuation:[> (<identifier>) <punctuation:,> (<identifier>) <punctuation:]> <operator:=> <identifier:useMvcState>")]
    public void VisitMutableMvcState(TokenMatch match, string name, string setter)
    {
        var typeAndKey = ExtractGenericAndArgs(match);

        Bindings.Add(new MvcStateBinding
        {
            LocalName = name,
            SetterName = setter,
            ViewModelKey = typeAndKey.Key,
            Type = typeAndKey.Type,
            IsMutable = true,
            SyncMode = ExtractSyncMode(match) // 'immediate', 'debounced', etc.
        });
    }
}
```

#### 4.2 Generate ViewModel Binding
```csharp
// In generated component:
[Component]
public partial class ProductPage : MinimactComponent
{
    // From ViewModel - immutable
    [FromViewModel("productName")]
    public string ProductName => ViewModel.Get<string>("productName");

    [FromViewModel("price")]
    public double Price => ViewModel.Get<double>("price");

    [FromViewModel("isAdminRole")]
    public bool IsAdmin => ViewModel.Get<bool>("isAdminRole");

    // From ViewModel - mutable (syncs to server)
    [FromViewModel("initialQuantity", Mutable = true, Sync = SyncMode.Immediate)]
    private int quantity;

    // Pure client state
    [State]
    private double cartTotal = 0;

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", "1.1", null, ProductName),
            new VElement("div", "1.2", null, $"${Price:F2}"),
            // ...
        });
    }
}
```

---

## 5. Lifted State Components

### Current Limitation
`<Component>` wrapper elements are not properly recognized.

### Minimact Lifted State Pattern
```tsx
// Parent sees ALL child state
function Dashboard() {
  const isEditing = state["UserProfile.isEditing"];  // Just read it!

  return (
    <Component name="UserProfile" state={{ isEditing: false, username: "" }}>
      <UserProfile />
    </Component>
  );
}

// Child accesses seamlessly
function UserProfile() {
  const isEditing = state.isEditing;     // Auto-prefixed
  setState('isEditing', true);            // Updates parent!

  return <div>...</div>;
}
```

### Enhancement Plan

#### 5.1 Create ComponentWrapperVisitor
```csharp
public class ComponentWrapperVisitor : TokenVisitor
{
    // Match: <Component name="X" state={{ ... }}>
    [TokenPattern(@"<JsxTagOpen:Component>")]
    public void VisitComponentWrapper(TokenMatch match)
    {
        var attrs = ParseAttributes(match);

        var wrapper = new ComponentWrapperModel
        {
            Name = attrs["name"].RawValue,
            InitialState = ParseStateObject(attrs["state"]),
            ChildComponent = FindChildComponent(match)
        };

        // Register state keys for lifted state access
        foreach (var (key, value) in wrapper.InitialState)
        {
            Context.RegisterLiftedState($"{wrapper.Name}.{key}", value);
        }
    }
}
```

#### 5.2 Generate VComponentWrapper (Match Actual Output)
```csharp
// From LiftedState_01_LoadingOverlay.cs:
new VComponentWrapper
{
    ComponentName = "UserProfile",
    ComponentType = "UserProfile",
    HexPath = "1.3",
    InitialState = new Dictionary<string, object> { ["isLoading"] = false }
}
```

#### 5.3 Transform Lifted State Access (Match Actual Output)
```csharp
// Parent reading child state (uses state[] not State[]):
var userLoading = state["UserProfile.isLoading"];
var cartLoading = state["ShoppingCart.isLoading"];
var anyLoading = ((userLoading) ?? (cartLoading)) ?? (formLoading);

// Parent setting child state:
SetState("Counter.count", 0);
SetState("Counter.count", 10);

// Child component uses lowercase state/setState:
var isLoading = state.isLoading;
setState("isLoading", true);
await Task.Delay(2000);
setState("isLoading", false);
```

---

## 6. useProtectedState

### Current Limitation
`useProtectedState` is not recognized.

### Minimact Protected State
```tsx
function Counter() {
  const [count, setCount] = useState(0);                      // Public
  const [animationQueue, setQueue] = useProtectedState([]);   // Protected

  // Parent cannot access animationQueue!
}
```

### Enhancement Plan

#### 6.1 Handle useProtectedState in StateVisitor
```csharp
// Match: const [name, setName] = useProtectedState(value)
[TokenPattern(@"<keyword:const> <punctuation:[> (<identifier>) <punctuation:,> (<identifier>) <punctuation:]> <operator:=> <identifier:useProtectedState>")]
public void VisitProtectedState(TokenMatch match, string name, string setter)
{
    var initValue = ExtractParenthesized(0);

    _component.StateFields.Add(new StateField
    {
        Name = name,
        SetterName = setter,
        InitialValue = TokensToString(initValue),
        Type = InferType(initValue),
        IsProtected = true  // NEW: Protected flag
    });
}
```

#### 6.2 Generate Protected State Attribute
```csharp
[State]
private int count = 0;

[State(Protected = true)]
private List<object> animationQueue = new();
```

---

## 7. Advanced Event Handlers

### Current Limitation
Event parameters and complex closures don't transform correctly.

### Minimact Event Patterns
```tsx
// Event with parameter
onChange={(e) => setColor(e.target.value)}

// Handler with arguments
onClick={() => handleQuantityChange(-1)}

// Multiple statements
onClick={() => {
  const newQty = Math.max(1, quantity + delta);
  setQuantity(newQty);
  setCartTotal(price * newQty);
}}

// Inline toggle pattern
onClick={() => setIsExpanded(!isExpanded)}
```

### Enhancement Plan

#### 7.1 Enhanced Handler Transformation
```csharp
public class MinimactHandlerTransformer
{
    public string TransformHandler(Token[] handlerTokens, ComponentModel component)
    {
        // Pattern: () => setX(!x) -> Toggle pattern
        if (IsTogglePattern(handlerTokens, out var field))
        {
            return $"SetState(nameof({field}), !{field});";
        }

        // Pattern: () => setX(x + 1) -> Increment pattern
        if (IsIncrementPattern(handlerTokens, out field, out var delta))
        {
            return $"SetState(nameof({field}), {field} + {delta});";
        }

        // Pattern: (e) => setX(e.target.value) -> Input binding
        if (IsInputBindingPattern(handlerTokens, out field))
        {
            return $"SetState(nameof({field}), e.Value?.ToString() ?? \"\");";
        }

        // General transformation
        return TransformGeneralHandler(handlerTokens);
    }

    private string TransformGeneralHandler(Token[] tokens)
    {
        // setCount(count + 1) -> SetState(nameof(count), count + 1);
        // setState("X.y", value) -> SetState("X.y", value);
        // Math.max(1, x) -> Math.Max(1, x)
    }
}
```

#### 7.2 Event Type Mapping for Minimact
```csharp
private static readonly Dictionary<string, string> MinimactEventMap = new()
{
    ["onClick"] = "onclick",       // Lowercase for Minimact
    ["onChange"] = "onchange",
    ["onSubmit"] = "onsubmit",
    ["onInput"] = "oninput",
    ["onKeyDown"] = "onkeydown",
    ["onFocus"] = "onfocus",
    ["onBlur"] = "onblur",
};
```

---

## 8. Complex Expressions

### Current Limitation
JavaScript expressions don't map to C# correctly.

### Common Minimact Patterns
```tsx
// Optional chaining
{viewModel?.userEmail}

// Nullish coalescing
{data ?? 'default'}

// Template literals
{`Count: ${count}`}

// Method calls
{price.toFixed(2)}
{processDataRust.data.itemsPerSecond.toLocaleString()}

// Ternary in text
{isExpanded ? 'Hide' : 'Show'} Details

// Nested ternary
{dataSize < 10000 ? 'Small dataset' :
 dataSize < 50000 ? 'Medium dataset' :
 'Large dataset'}

// Property access
{dynamicText.length}
```

### Enhancement Plan

#### 8.1 Expression Transformer
```csharp
public class MinimactExpressionTransformer
{
    public string Transform(Token[] tokens)
    {
        var result = TokensToString(tokens);

        // toFixed(n) -> ToString("F{n}")
        result = Regex.Replace(result, @"\.toFixed\((\d+)\)", ".ToString(\"F$1\")");

        // toLocaleString() -> ToString("N0")
        result = result.Replace(".toLocaleString()", ".ToString(\"N0\")");

        // Template literals: `text ${expr}` -> $"text {expr}"
        result = TransformTemplateLiterals(result);

        // Math methods
        result = result.Replace("Math.max", "Math.Max");
        result = result.Replace("Math.min", "Math.Min");
        result = result.Replace("Math.round", "Math.Round");
        result = result.Replace("Math.floor", "(int)Math.Floor");

        // parseInt -> int.Parse (with null check)
        result = Regex.Replace(result, @"parseInt\((.+?)\)", "int.TryParse($1, out var _v) ? _v : 0");

        return result;
    }
}
```

---

## 9. Style Objects and CSS-in-JS

### Current Limitation
Style objects are not transformed correctly.

### Minimact Style Patterns
```tsx
<div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '800px' }}>

<div style={{
  width: `${processDataRust.progress * 100}%`,
  backgroundColor: isActive ? 'green' : 'red'
}}>

// Style tag with template literal
<style>{`
  .file-manager {
    display: flex;
    height: 100vh;
  }
`}</style>
```

### Enhancement Plan

#### 9.1 Style Object Transformer
```csharp
public class StyleTransformer
{
    public string TransformStyleObject(Token[] styleTokens)
    {
        var properties = ParseStyleProperties(styleTokens);
        var sb = new StringBuilder();

        sb.Append("BuildStyle(");

        foreach (var (key, value) in properties)
        {
            var cssKey = CamelToKebab(key);

            if (value.IsDynamic)
            {
                sb.Append($"(\"{cssKey}\", {TransformExpression(value.Expression)}), ");
            }
            else
            {
                sb.Append($"(\"{cssKey}\", \"{value.RawValue}\"), ");
            }
        }

        sb.Append(")");
        return sb.ToString();
    }

    // Helper method generated in component
    private static string BuildStyle(params (string key, object value)[] props)
    {
        return string.Join("; ", props.Select(p => $"{p.key}: {p.value}"));
    }
}
```

---

## 10. List Rendering Enhancements

### Current Limitation
Complex `.map()` patterns don't work correctly.

### Minimact List Patterns
```tsx
// Map with index and key
{items.map((item, index) => (
  <div key={item.id || index}>
    {item.name}
  </div>
))}

// Chained filter + map
{directoryData.items.filter(x => x.type === 'file').map(item => (
  <FileItem item={item} />
))}

// Map with conditional
{items.map(item => (
  item.visible && <ItemCard item={item} />
))}
```

### Enhancement Plan

#### 10.1 Generate LINQ Equivalents
```csharp
// items.map(x => <div>{x.name}</div>)
// becomes:
items.Select((item, index) =>
    new VElement("div", $"{HexPath}.{index}", null, item.Name)
).ToArray()

// items.filter(x => x.active).map(x => ...)
// becomes:
items.Where(x => x.Active).Select((item, index) =>
    ...
).ToArray()
```

---

## 11. Form Handling

### Current Limitation
Form elements need special handling for Minimact's state sync.

### Minimact Form Patterns
```tsx
<input
  type="text"
  value={dynamicText}
  onChange={(e) => setDynamicText(e.target.value)}
/>

<select
  value={color}
  onChange={(e) => setColor(e.target.value)}
>
  <option value="Black">Black</option>
</select>

<input
  type="number"
  value={dataSize}
  onChange={(e) => setDataSize(parseInt(e.target.value) || 1000)}
  min="1000"
  max="100000"
/>
```

### Enhancement Plan

#### 11.1 Detect Two-Way Binding Pattern
```csharp
// Detect value + onChange pattern for automatic binding
if (attrs.ContainsKey("value") && attrs.ContainsKey("onChange"))
{
    var boundField = attrs["value"].Binding;
    var handler = attrs["onChange"];

    // Generate efficient two-way binding
    attrs["onchange"] = $"Handle_{boundField}";

    _component.EventHandlers.Add(new EventHandler
    {
        GeneratedName = $"Handle_{boundField}",
        Body = $"SetState(nameof({boundField}), e.Value?.ToString() ?? \"\");",
        Parameters = new[] { ("ChangeEventArgs", "e") }
    });
}
```

---

## 12. useServerTask and Rust Runtime

### Current Limitation
`useServerTask` is not supported.

### Minimact Server Task Pattern
```tsx
const processDataRust = useServerTask<ProcessingResult>(
  async (count: number) => {
    // SERVER-SIDE CODE (transpiled to Rust with Rayon)
    console.log(`Starting processing of ${count} items...`);

    let data: number[] = [];
    for (let i = 0; i < count; i++) {
      data.push(Math.random() * 1000);
    }

    // Parallel processing with Rayon
    let processed = data.map(value => {
      let result = value;
      for (let j = 0; j < 1000; j++) {
        result = Math.sqrt(result * result + 1);
      }
      return result;
    });

    return {
      totalProcessed: count,
      processingTimeMs: Date.now() - startTime
    };
  },
  { runtime: 'rust' }  // or 'csharp'
);

// Usage in JSX
{processDataRust.status === 'running' && <Spinner />}
{processDataRust.data && <Results data={processDataRust.data} />}
<button onClick={() => processDataRust.start(dataSize)}>Run</button>
<button onClick={() => processDataRust.cancel()}>Cancel</button>
```

### Enhancement Plan

#### 12.1 Create ServerTaskVisitor
```csharp
public class ServerTaskVisitor : TokenVisitor
{
    public List<ServerTaskDefinition> Tasks { get; } = new();

    [TokenPattern(@"<keyword:const> (<identifier>) <operator:=> <identifier:useServerTask>")]
    public void VisitServerTask(TokenMatch match, string taskName)
    {
        var genericType = ExtractGenericType(match);
        var callback = ExtractAsyncCallback(match);
        var options = ExtractOptions(match);

        Tasks.Add(new ServerTaskDefinition
        {
            Name = taskName,
            ReturnType = genericType,
            Parameters = callback.Parameters,
            Body = callback.Body,
            Runtime = options.GetValueOrDefault("runtime", "csharp")
        });
    }
}
```

#### 12.2 Generate Server Task Class
```csharp
// For runtime: 'csharp'
[ServerTask]
public async Task<ProcessingResult> ProcessDataCSharp(int count)
{
    var startTime = DateTime.Now;
    var data = new List<double>();
    // ... transpiled logic
    return new ProcessingResult { ... };
}

// For runtime: 'rust' - generate Rust code file
// processDataRust.rs
pub fn process_data_rust(count: i32) -> ProcessingResult {
    use rayon::prelude::*;
    let data: Vec<f64> = (0..count).map(|_| rand::random::<f64>() * 1000.0).collect();
    let processed: Vec<f64> = data.par_iter().map(|&value| {
        // ... Rayon parallel processing
    }).collect();
    // ...
}
```

#### 12.3 Generate Task State Binding
```csharp
// In component:
private ServerTaskState<ProcessingResult> _processDataRust;

// Access in Render():
if (_processDataRust.Status == TaskStatus.Running) { ... }
if (_processDataRust.Data != null) { ... }
```

---

## 13. Plugin Elements

### Current Limitation
`<Plugin>` elements are not handled.

### Minimact Plugin Pattern
```tsx
<Plugin name="BarChart" state={{
  data: chartData,
  width: 360,
  height: 250,
  margin: { top: 10, right: 10, bottom: 40, left: 40 },
  xAxisDataKey: 'name',
  yAxisDataKey: 'count'
}} />

<Plugin name="Clock" state={{ hours: 14, theme: 'dark' }} />
```

### Enhancement Plan

#### 13.1 Generate VPluginWrapper
```csharp
public class VPluginModel : VNodeModel
{
    public string PluginName { get; set; }
    public Dictionary<string, object> State { get; } = new();
}

// Generated code:
new VPluginWrapper
{
    PluginName = "BarChart",
    HexPath = "1.5",
    State = new Dictionary<string, object>
    {
        ["data"] = chartData,
        ["width"] = 360,
        ["height"] = 250,
        ["margin"] = new { top = 10, right = 10, bottom = 40, left = 40 },
        ["xAxisDataKey"] = "name",
        ["yAxisDataKey"] = "count"
    }
}
```

---

## 14. useEffect and Lifecycle

### Current Limitation
`useEffect` is not supported.

### Minimact useEffect Pattern
```tsx
// Mount effect (empty deps)
useEffect(() => {
  loadDirectory(currentPath);
}, []);

// Dependency effect
useEffect(() => {
  loadDirectory(currentPath);
}, [currentPath]);

// Cleanup effect
useEffect(() => {
  const sub = subscribe();
  return () => sub.unsubscribe();
}, []);
```

### Enhancement Plan

#### 14.1 Generate Lifecycle Methods
```csharp
// useEffect(() => { ... }, []) becomes:
protected override void OnAfterRender(bool firstRender)
{
    if (firstRender)
    {
        LoadDirectory(currentPath);
    }
}

// useEffect(() => { ... }, [currentPath]) becomes:
protected override void OnStateChanged(string propertyName)
{
    if (propertyName == nameof(currentPath))
    {
        LoadDirectory(currentPath);
    }
}

// Cleanup becomes:
public void Dispose()
{
    _subscription?.Unsubscribe();
}
```

---

## 15. SPA Mode (Link and Page)

### Current Limitation
`<Link>` and `<Page />` are not handled.

### Minimact SPA Pattern
```tsx
import { Page, Link } from '@minimact/spa';

export default function MainShell() {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/products/1">Product 1</Link>
        <Link to="/products/2" prefetch>Product 2</Link>
      </nav>

      <main>
        <Page /> {/* Pages inject here */}
      </main>
    </div>
  );
}
```

### Enhancement Plan

#### 15.1 Generate SPA Components
```csharp
// <Link to="/products/1"> becomes:
new VSpaLink
{
    HexPath = "1.2.1",
    To = "/products/1",
    Prefetch = false,
    Children = new VNode[] { new VText("Product 1", "1.2.1.1") }
}

// <Page /> becomes:
new VPagePlaceholder
{
    HexPath = "1.3.1"
}
```

---

## 16. Hex Paths and VNull Generation

### Current Limitation
Hex paths are simple decimal counters. VNull nodes not generated for conditionals.

### Minimact Hex Path System
Minimact uses gap-based hex allocation for stable element identity:
- `0x10000000`, `0x20000000`, `0x30000000`...
- Allows insertions without shifting existing paths
- Critical for predictive patch system

```tsx
{showOuter && (
  <div>  {/* Gets VNull when false, keeps path stable */}
    {showInner && <span>...</span>}
  </div>
)}
```

### Enhancement Plan

#### 16.1 Implement Hex Path Allocator
```csharp
public class HexPathAllocator
{
    private const uint BASE_GAP = 0x10000000;

    public string AllocateChild(string parentPath, int childIndex)
    {
        var hexIndex = (childIndex + 1) * BASE_GAP;
        return $"{parentPath}.{hexIndex:X}";
    }

    public string AllocateSibling(string siblingPath)
    {
        // Parse last segment, add gap
        var parts = siblingPath.Split('.');
        var last = Convert.ToUInt32(parts[^1], 16);
        parts[^1] = (last + BASE_GAP).ToString("X");
        return string.Join(".", parts);
    }
}
```

#### 16.2 Generate VNull for Conditionals
```csharp
// {condition && <div>...</div>} generates:
(condition)
    ? new VElement("div", "10000000.20000000", ...)
    : new VNull("10000000.20000000")  // Preserves path!

// This is CRITICAL for Minimact's prediction system
```

---

## 17. Template Extraction for Prediction

### Current Limitation
Templates are not extracted for the prediction system.

### Minimact Template System
Minimact's Babel plugin extracts parameterized templates at build time:
```tsx
<span>Count: {count}</span>
// Extracts template: "Count: {0}" with binding [count]
```

### Enhancement Plan

#### 17.1 Generate Template Metadata
```csharp
public class TemplateExtractor
{
    public Dictionary<string, TemplateInfo> Templates { get; } = new();

    public void ExtractFromElement(VElementModel element)
    {
        foreach (var child in element.Children)
        {
            if (child is VTextModel text && text.IsDynamic)
            {
                var template = new TemplateInfo
                {
                    Path = text.HexPath,
                    Template = ExtractTemplateString(text.Text),
                    Bindings = ExtractBindings(text.Binding),
                    Type = text.IsDynamic ? "dynamic" : "static"
                };

                Templates[text.HexPath] = template;
            }
        }
    }
}
```

#### 17.2 Generate Templates JSON (Match Actual Output)
```json
{
  "component": "Counter",
  "version": "1.0",
  "generatedAt": 1762802432068,
  "templates": {
    "1.2.1": {
      "template": "Count: {0}",
      "bindings": ["count"],
      "slots": [7],
      "path": ["1", "2"],
      "type": "dynamic"
    },
    "1.@className": {
      "template": "counter",
      "bindings": [],
      "slots": [],
      "path": ["1"],
      "type": "attribute-static"
    }
  }
}
```

**Template Types (from actual output):**
- `static` - No bindings, fixed text
- `dynamic` - Has bindings with `{0}`, `{1}` placeholders
- `conditional` - Has `conditionalTemplates` for true/false branches
- `transform` - Has `transform.method` like `toFixed(2)`
- `nullable` - For optional chaining patterns
- `attribute-static` - Static attribute values
- `attribute-dynamic` - Dynamic attribute bindings

---

## 18. Source Maps and Debugging

### Current Limitation
No mapping between TSX and generated C#.

### Enhancement Plan

#### 18.1 Generate Line Mappings
```csharp
public class SourceMapper
{
    public void MapToken(Token tsxToken, int csharpLine)
    {
        Mappings.Add(new SourceMapping
        {
            TsxFile = _currentFile,
            TsxLine = tsxToken.Line,
            TsxColumn = tsxToken.Column,
            CSharpLine = csharpLine
        });
    }
}
```

#### 18.2 Embed Source Comments
```csharp
/* TSX:ProductPage.tsx:45 */
new VElement("button", "10000000.30000000",
    new Dictionary<string, string> { ["onclick"] = "HandleAddToCart" },
    "Add to Cart"
)
```

---

## 19. Timeline Animations

### Current Limitation
Timeline/animation attributes are not generated from `useTimeline` patterns.

### Minimact Timeline Pattern (From test-timeline.tsx)
The existing transformer generates Timeline attributes:
```csharp
[Timeline("AnimatedCounter_Timeline", 5000, Repeat = true, Easing = "ease-in-out")]
[TimelineKeyframe(0, "count", 0, Label = "start")]
[TimelineKeyframe(0, "color", "blue", Label = "start")]
[TimelineKeyframe(0, "opacity", 1, Label = "start")]
[TimelineKeyframe(1250, "count", 25)]
[TimelineKeyframe(1250, "color", "green")]
[TimelineKeyframe(2500, "count", 50, Label = "midpoint")]
[TimelineKeyframe(2500, "color", "red", Label = "midpoint")]
[TimelineKeyframe(5000, "count", 100, Label = "end")]
[TimelineKeyframe(5000, "color", "blue", Label = "end")]
[TimelineStateBinding("count", Interpolate = true)]
[TimelineStateBinding("color")]
[TimelineStateBinding("opacity", Interpolate = true)]
[Component]
public partial class AnimatedCounter : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private string color = "blue";

    [State]
    private int opacity = 1;

    // Client handlers for timeline control
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function () {\n  timeline.pause();\n}",
            ["Handle2"] = @"function () {\n  timeline.play();\n}",
            ["Handle4"] = @"function () {\n  timeline.stop();\n}",
            ["Handle6"] = @"function () {\n  timeline.seek(2500);\n}"
        };
    }
}
```

### Enhancement: Parse useTimeline TSX
```tsx
const timeline = useTimeline('AnimatedCounter_Timeline', {
  duration: 5000,
  repeat: true,
  easing: 'ease-in-out',
  keyframes: [
    { time: 0, count: 0, color: 'blue', opacity: 1, label: 'start' },
    { time: 1250, count: 25, color: 'green', opacity: 0.8 },
    { time: 2500, count: 50, color: 'red', opacity: 0.6, label: 'midpoint' },
    { time: 5000, count: 100, color: 'blue', opacity: 1, label: 'end' }
  ],
  bindings: {
    count: { interpolate: true },
    color: { interpolate: false },
    opacity: { interpolate: true }
  }
});

// Control methods
<button onClick={() => timeline.pause()}>Pause</button>
<button onClick={() => timeline.play()}>Play</button>
<button onClick={() => timeline.seek(2500)}>Jump to Midpoint</button>
```

---

## Implementation Priority

### Phase 1: Core Minimact Features (Critical)
1. **useMvcState / useMvcViewModel** - MVC Bridge is core to Minimact
2. **Lifted State Components** - `<Component>` wrapper
3. **Hex Paths with VNull** - Required for prediction system
4. **Template Extraction** - Enables predictive patches

### Phase 2: Hooks and Handlers (High Impact)
5. **Custom Hooks with UI** - Minimact's killer feature
6. **Advanced Event Handlers** - Complex closures
7. **useProtectedState** - Access control

### Phase 3: Advanced Features
8. **useServerTask** - Rust/C# server tasks
9. **SPA Mode** - Link/Page components
10. **Plugin Elements** - NuGet-distributed components
11. **Timeline Animations** - useTimeline with keyframes

### Phase 4: Developer Experience
12. **useEffect** - Lifecycle hooks
13. **TypeScript Types** - Full type inference
14. **Source Maps** - Debugging support

---

## Testing Strategy

For each enhancement, add:

1. **Fixture file** in `/fixtures/` matching Minimact patterns
2. **Expected C# output** in `/test-output/`
3. **Templates JSON** for prediction verification
4. **Unit tests** for the visitor

```csharp
[Fact]
public void Transform_useMvcState_GeneratesViewModelBinding()
{
    var source = @"
        import { useMvcState } from '@minimact/mvc';
        export function ProductPage() {
            const [price] = useMvcState<number>('price');
            return <div>${price}</div>;
        }
    ";

    var result = new TsxTransformer().Transform(source);

    Assert.Contains("[FromViewModel(\"price\")]", result.Code);
    Assert.Contains("ViewModel.Get<double>(\"price\")", result.Code);
}
```

---

## Conclusion

This enhancement roadmap is specifically designed for **Minimact**, not React. Key differences:

| Feature | React | Minimact |
|---------|-------|----------|
| Hydration | Required | None (predictive patches) |
| State Location | Component-local | Lifted to parent |
| Hooks with UI | Impossible | First-class feature |
| Server Rendering | Optional | Default |
| State Sync | Manual | Automatic |
| Bundle Size | 45 KB | 12 KB |

The transformer must understand:
- **useMvcState** for ViewModel bindings (not useState)
- **Lifted State** architecture (not prop drilling)
- **Hex Paths** for stable element identity
- **VNull nodes** for conditional rendering
- **Templates** for predictive patch generation
- **Custom Hooks** that return JSX UI

Each enhancement builds on Minimact's core philosophy: *"The cactus doesn't hydrate — it stores."* 🌵
