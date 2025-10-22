# Minimact C# Runtime

ASP.NET Core runtime for the Minimact framework - a server-side React-like framework with Rust-powered reconciliation.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Minimact Runtime                         │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ MinimactComponent │  │  ComponentRegistry│               │
│  │   (Base Class)   │  │   (Singleton)    │               │
│  └────────┬─────────┘  └──────────────────┘               │
│           │                                                 │
│  ┌────────▼─────────┐  ┌──────────────────┐               │
│  │  StateManager    │  │   RustBridge     │               │
│  │  ([State] attrs) │  │   (FFI to Rust)  │               │
│  └──────────────────┘  └────────┬─────────┘               │
│                                  │                          │
│  ┌──────────────────┐  ┌────────▼─────────┐               │
│  │   MinimactHub     │  │  minimact.dll     │               │
│  │   (SignalR)      │  │  (Rust Engine)   │               │
│  └──────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
Minimact.Runtime/
├── Core/
│   ├── VNode.cs                  # Virtual DOM types
│   ├── MinimactComponent.cs       # Base component class
│   ├── StateAttribute.cs         # [State] attribute
│   ├── StateManager.cs           # State synchronization
│   ├── RustBridge.cs             # FFI to Rust engine
│   └── ComponentRegistry.cs      # Component instance registry
├── SignalR/
│   └── MinimactHub.cs             # SignalR hub for real-time updates
├── Extensions/
│   └── MinimactServiceExtensions.cs  # ASP.NET Core integration
└── Examples/
    ├── Counter.cs                # Simple counter example
    └── TodoList.cs               # Todo list with state management
```

## Key Components

### VNode Types (VNode.cs)

Virtual DOM representation matching Rust implementation:

- `VNode` - Abstract base class
- `VElement` - HTML elements (`<div>`, `<button>`, etc.)
- `VText` - Text nodes with HTML encoding
- `DivRawHtml` - Raw HTML for markdown rendering
- `Fragment` - React.Fragment-like wrapper

```csharp
var node = new VElement("div", new VNode[]
{
    new VElement("h1", "Hello World"),
    new VText("Some text content")
});

string html = node.ToHtml();
// Output: <div><h1>Hello World</h1>Some text content</div>
```

### MinimactComponent (MinimactComponent.cs)

Base class for all components with:

- **State management** via `SetState()` and `GetState()`
- **Lifecycle hooks** (`OnInitializedAsync`, `OnStateChanged`, etc.)
- **Rendering** via abstract `Render()` method
- **SignalR integration** for real-time patches

```csharp
public class MyComponent : MinimactComponent
{
    [State]
    private int count = 0;

    protected override VNode Render()
    {
        return new VElement("div", $"Count: {count}");
    }

    private void Increment()
    {
        count++;
        SetState(nameof(count), count);
    }
}
```

### StateManager (StateManager.cs)

Syncs `[State]` decorated fields/properties with internal state dictionary using reflection:

- `InitializeState()` - Read initial values from fields
- `SyncStateToMembers()` - Update fields after state changes
- `SyncMembersToState()` - Capture field changes before render

### RustBridge (RustBridge.cs)

P/Invoke wrapper for Rust reconciliation engine:

```csharp
// Compute patches
var patches = RustBridge.Reconcile(oldVNode, newVNode);

// Predictor for learning patterns
using var predictor = new RustBridge.Predictor();
predictor.Learn(stateChange, oldTree, newTree);
var prediction = predictor.Predict(stateChange, currentTree);
```

### MinimactHub (MinimactHub.cs)

SignalR hub for client communication:

- `RegisterComponent()` - Connect component to client
- `InvokeComponentMethod()` - Handle client events (clicks, etc.)
- `UpdateClientState()` - Sync `useClientState` values
- Auto-cleanup on disconnect

### ComponentRegistry (ComponentRegistry.cs)

Thread-safe singleton registry:

```csharp
registry.RegisterComponent(component);
var component = registry.GetComponent(componentId);
registry.UnregisterComponent(componentId);
```

## Usage

### 1. Add to ASP.NET Core app

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMinimact(options =>
{
    options.EnablePrediction = true;
    options.EnableDebugLogging = false;
});

var app = builder.Build();
app.UseMinimact();
app.Run();
```

### 2. Create a component

```csharp
public class Counter : MinimactComponent
{
    [State]
    private int count = 0;

    public override Task OnInitializedAsync()
    {
        StateManager.InitializeState(this);
        return Task.CompletedTask;
    }

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new VNode[]
        {
            new VElement("h1", $"Count: {count}"),
            new VElement("button", new Dictionary<string, string>
            {
                ["onclick"] = nameof(Increment)
            }, "Increment")
        });
    }

    private void Increment()
    {
        count++;
        SetState(nameof(count), count);
    }
}
```

### 3. Render component in controller

```csharp
public class HomeController : Controller
{
    private readonly ComponentRegistry _registry;

    public HomeController(ComponentRegistry registry)
    {
        _registry = registry;
    }

    public async Task<IActionResult> Index()
    {
        var counter = new Counter();
        _registry.RegisterComponent(counter);

        var html = (await counter.InitializeAndRenderAsync()).ToHtml();
        ViewBag.ComponentId = counter.ComponentId;
        ViewBag.Html = html;

        return View();
    }
}
```

## Features

✅ **Virtual DOM** - React-like VNode tree structure
✅ **State Management** - `[State]` attributes with auto-sync
✅ **Rust Reconciliation** - High-performance diffing via FFI
✅ **SignalR Patches** - Real-time DOM updates
✅ **Predictive Rendering** - ML-based patch prediction
✅ **Lifecycle Hooks** - Initialize, state changes, mount/unmount
✅ **Component Registry** - Global instance management
✅ **Type Safety** - Full C# type checking

## Next Steps

1. **Build Rust library** - Compile `minimact.dll` from Rust source
2. **Client runtime** - Create `minimact.js` for DOM patching
3. **Babel integration** - Connect TSX transformer to C# codegen
4. **Hybrid rendering** - Implement `useClientState` zones
5. **Testing** - Unit tests for all components

## Examples

See `Examples/` folder:

- **Counter.cs** - Basic state and event handling
- **TodoList.cs** - List rendering with keyed reconciliation

## Dependencies

- .NET 8.0
- Microsoft.AspNetCore.SignalR.Core 1.1.0
- Markdig 0.37.0 (for `useMarkdown`)
- Newtonsoft.Json 13.0.3 (for JSON serialization)
- minimact.dll (Rust reconciliation engine)

## License

MIT
