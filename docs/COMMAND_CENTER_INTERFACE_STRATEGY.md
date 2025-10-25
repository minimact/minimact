# Command Center Interface Strategy

## Core Concept

The **exact same production code** is used by both the real ASP.NET server AND the Command Center test environment.

This is achieved through **interface-based abstraction** - the core component engine is shared, only the transport layer differs.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              IComponentEngine (Interface)                   │
│                                                              │
│  • RenderComponent(componentId)                             │
│  • UpdateState(componentId, stateKey, value)                │
│  • UpdateDomState(componentId, stateKey, snapshot)          │
│  • InvokeMethod(componentId, methodName, args)              │
│  • GetPatches() → List<Patch>                               │
│  • GetHints() → List<PredictHint>                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ implements
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           ComponentEngine (Implementation)                  │
│                                                              │
│  ✅ THIS IS THE SHARED PRODUCTION CODE                      │
│                                                              │
│  • Component registry (manages all components)              │
│  • State management (tracks component state)                │
│  • Rendering (calls component.Render())                     │
│  • Reconciliation (calls Rust reconciler)                   │
│  • Patch generation (creates DOM patches)                   │
│  • Prediction (generates hints for HintQueue)               │
│  • Lifecycle management (mount, update, unmount)            │
│                                                              │
│  CRITICAL: This class has NO knowledge of SignalR!          │
│  It only knows about components, state, and patches.        │
└──────────────┬────────────────────────┬─────────────────────┘
               │                        │
               │ Used by                │ Used by
               ▼                        ▼
    ┌──────────────────────┐  ┌─────────────────────────┐
    │   MinimactHub        │  │   MockHub               │
    │   (Production)       │  │   (Command Center)      │
    │                      │  │                         │
    │ • SignalR transport  │  │ • In-memory transport   │
    │ • HTTP/WebSocket     │  │ • Direct method calls   │
    │ • Real browser       │  │ • MockClient            │
    │                      │  │                         │
    │ Calls ComponentEngine│  │ Calls ComponentEngine   │
    │ Sends patches via    │  │ Sends patches via       │
    │ SignalR              │  │ callbacks               │
    └──────────────────────┘  └─────────────────────────┘
```

---

## Key Principle: Separation of Concerns

### ComponentEngine (Core Logic)
**Responsibilities:**
- ✅ Manage component instances
- ✅ Track state changes
- ✅ Trigger re-renders
- ✅ Call Rust reconciler
- ✅ Generate DOM patches
- ✅ Generate prediction hints

**Does NOT know about:**
- ❌ SignalR
- ❌ HTTP
- ❌ Transport layers
- ❌ Client communication

### MinimactHub (SignalR Transport)
**Responsibilities:**
- ✅ Handle SignalR connections
- ✅ Receive messages from browser
- ✅ Call ComponentEngine methods
- ✅ Send patches back via SignalR

**Does NOT know about:**
- ❌ How rendering works
- ❌ How reconciliation works
- ❌ Component implementation details

### MockHub (In-Memory Transport)
**Responsibilities:**
- ✅ Simulate SignalR in-memory
- ✅ Receive calls from MockClient
- ✅ Call ComponentEngine methods
- ✅ Send patches back via callbacks

**Does NOT know about:**
- ❌ How rendering works (same as MinimactHub)
- ❌ How reconciliation works
- ❌ Component implementation details

---

## Interface Definition

```csharp
namespace Minimact.AspNetCore.Abstractions;

/// <summary>
/// Core component engine interface
/// SHARED by production (MinimactHub) and testing (MockHub)
/// </summary>
public interface IComponentEngine
{
    // ========================================
    // Component Lifecycle
    // ========================================

    /// <summary>
    /// Register a component instance
    /// </summary>
    void RegisterComponent(string componentId, MinimactComponent component);

    /// <summary>
    /// Get a component by ID
    /// </summary>
    MinimactComponent? GetComponent(string componentId);

    /// <summary>
    /// Unregister a component
    /// </summary>
    void UnregisterComponent(string componentId);

    // ========================================
    // State Management
    // ========================================

    /// <summary>
    /// Update component state (from useState)
    /// Returns patches to apply to DOM
    /// </summary>
    Task<List<Patch>> UpdateComponentStateAsync(
        string componentId,
        string stateKey,
        object value
    );

    /// <summary>
    /// Update DOM element state (from useDomElementState)
    /// Returns patches to apply to DOM
    /// </summary>
    Task<List<Patch>> UpdateDomElementStateAsync(
        string componentId,
        string stateKey,
        DomElementStateSnapshot snapshot
    );

    /// <summary>
    /// Update client-computed state (from external libraries)
    /// Returns patches to apply to DOM
    /// </summary>
    Task<List<Patch>> UpdateClientComputedStateAsync(
        string componentId,
        Dictionary<string, object> computedValues
    );

    // ========================================
    // Method Invocation
    // ========================================

    /// <summary>
    /// Invoke a component method (e.g., button click handler)
    /// Returns patches to apply to DOM
    /// </summary>
    Task<MethodInvocationResult> InvokeComponentMethodAsync(
        string componentId,
        string methodName,
        object[] args
    );

    // ========================================
    // Prediction
    // ========================================

    /// <summary>
    /// Request predict hints for state changes
    /// Returns pre-computed patches for instant feedback
    /// </summary>
    Task<List<PredictHint>> RequestPredictAsync(
        string componentId,
        Dictionary<string, object> stateChanges
    );
}

/// <summary>
/// Result of method invocation
/// </summary>
public class MethodInvocationResult
{
    /// <summary>
    /// Patches to apply to DOM
    /// </summary>
    public List<Patch> Patches { get; set; } = new();

    /// <summary>
    /// Prediction hints to send to client
    /// </summary>
    public List<PredictHint> Hints { get; set; } = new();

    /// <summary>
    /// Whether the method succeeded
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Prediction hint for client HintQueue
/// </summary>
public class PredictHint
{
    public string HintId { get; set; } = string.Empty;
    public List<Patch> Patches { get; set; } = new();
    public double Confidence { get; set; }
}
```

---

## Implementation: ComponentEngine

```csharp
namespace Minimact.AspNetCore.Core;

/// <summary>
/// Core component engine - THE PRODUCTION CODE
///
/// This is used by BOTH:
/// - MinimactHub (real SignalR server)
/// - MockHub (Command Center testing)
///
/// CRITICAL: No SignalR dependencies!
/// </summary>
public class ComponentEngine : IComponentEngine
{
    private readonly ComponentRegistry _registry;
    private readonly RustBridge _reconciler;
    private readonly PredictionEngine _predictor;

    public ComponentEngine(
        ComponentRegistry registry,
        RustBridge reconciler,
        PredictionEngine predictor)
    {
        _registry = registry;
        _reconciler = reconciler;
        _predictor = predictor;
    }

    public void RegisterComponent(string componentId, MinimactComponent component)
    {
        _registry.Register(componentId, component);
    }

    public MinimactComponent? GetComponent(string componentId)
    {
        return _registry.GetComponent(componentId);
    }

    public void UnregisterComponent(string componentId)
    {
        _registry.Unregister(componentId);
    }

    public async Task<List<Patch>> UpdateComponentStateAsync(
        string componentId,
        string stateKey,
        object value)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
            return new List<Patch>();

        // Update state (keeps server in sync with client)
        component.SetStateFromClient(stateKey, value);

        // Re-render with new state
        var newVNode = component.Render();

        // Compute patches
        var patches = _reconciler.Reconcile(component.CurrentVNode, newVNode);

        // Update current VNode
        component.CurrentVNode = newVNode;

        return patches;
    }

    public async Task<List<Patch>> UpdateDomElementStateAsync(
        string componentId,
        string stateKey,
        DomElementStateSnapshot snapshot)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
            return new List<Patch>();

        // Update DOM state
        component.SetDomStateFromClient(stateKey, snapshot);

        // Re-render
        var newVNode = component.Render();
        var patches = _reconciler.Reconcile(component.CurrentVNode, newVNode);
        component.CurrentVNode = newVNode;

        return patches;
    }

    public async Task<MethodInvocationResult> InvokeComponentMethodAsync(
        string componentId,
        string methodName,
        object[] args)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            return new MethodInvocationResult
            {
                Success = false,
                ErrorMessage = $"Component {componentId} not found"
            };
        }

        try
        {
            // Invoke the method
            component.InvokeMethod(methodName, args);

            // Re-render
            var newVNode = component.Render();
            var patches = _reconciler.Reconcile(component.CurrentVNode, newVNode);
            component.CurrentVNode = newVNode;

            // Generate prediction hints
            var hints = _predictor.GenerateHints(component, patches);

            return new MethodInvocationResult
            {
                Success = true,
                Patches = patches,
                Hints = hints
            };
        }
        catch (Exception ex)
        {
            return new MethodInvocationResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<List<PredictHint>> RequestPredictAsync(
        string componentId,
        Dictionary<string, object> stateChanges)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
            return new List<PredictHint>();

        return _predictor.PredictStateChanges(component, stateChanges);
    }

    public async Task<List<Patch>> UpdateClientComputedStateAsync(
        string componentId,
        Dictionary<string, object> computedValues)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
            return new List<Patch>();

        component.UpdateClientState(computedValues);

        var newVNode = component.Render();
        var patches = _reconciler.Reconcile(component.CurrentVNode, newVNode);
        component.CurrentVNode = newVNode;

        return patches;
    }
}
```

---

## Usage: MinimactHub (Production)

```csharp
namespace Minimact.AspNetCore.SignalR;

public class MinimactHub : Hub
{
    private readonly IComponentEngine _engine;

    public MinimactHub(IComponentEngine engine)
    {
        _engine = engine; // ✅ Injected via DI
    }

    /// <summary>
    /// Update component state from client
    /// </summary>
    public async Task UpdateComponentState(string componentId, string stateKey, object value)
    {
        // Call the engine (SHARED CODE!)
        var patches = await _engine.UpdateComponentStateAsync(componentId, stateKey, value);

        // Send patches via SignalR (transport layer)
        if (patches.Count > 0)
        {
            await Clients.Caller.SendAsync("ApplyPatches", componentId, patches);
        }
    }

    /// <summary>
    /// Invoke component method
    /// </summary>
    public async Task InvokeComponentMethod(string componentId, string methodName, object[] args)
    {
        // Call the engine (SHARED CODE!)
        var result = await _engine.InvokeComponentMethodAsync(componentId, methodName, args);

        if (!result.Success)
        {
            await Clients.Caller.SendAsync("Error", result.ErrorMessage);
            return;
        }

        // Send patches via SignalR (transport layer)
        if (result.Patches.Count > 0)
        {
            await Clients.Caller.SendAsync("ApplyPatches", componentId, result.Patches);
        }

        // Send hints via SignalR (transport layer)
        foreach (var hint in result.Hints)
        {
            await Clients.Caller.SendAsync("QueueHint",
                componentId, hint.HintId, hint.Patches, hint.Confidence);
        }
    }
}
```

---

## Usage: MockHub (Command Center)

```csharp
namespace Minimact.CommandCenter.Core;

/// <summary>
/// Mock hub for Command Center testing
/// Uses the SAME ComponentEngine as production!
/// </summary>
public class MockHub
{
    private readonly IComponentEngine _engine;
    private readonly MockClient _client;

    public MockHub(MockClient client)
    {
        _client = client;

        // ✅ Create the REAL ComponentEngine (same as production!)
        var registry = new ComponentRegistry();
        var reconciler = new RustBridge();
        var predictor = new PredictionEngine();

        _engine = new ComponentEngine(registry, reconciler, predictor);
    }

    /// <summary>
    /// Update component state from MockClient
    /// </summary>
    public async Task UpdateComponentState(string componentId, string stateKey, object value)
    {
        // Call the engine (SHARED CODE!)
        var patches = await _engine.UpdateComponentStateAsync(componentId, stateKey, value);

        // Send patches via callback (in-memory transport)
        if (patches.Count > 0)
        {
            _client.ApplyPatches(componentId, patches);
        }
    }

    /// <summary>
    /// Invoke component method from MockClient
    /// </summary>
    public async Task InvokeComponentMethod(string componentId, string methodName, object[] args)
    {
        // Call the engine (SHARED CODE!)
        var result = await _engine.InvokeComponentMethodAsync(componentId, methodName, args);

        if (!result.Success)
        {
            Console.WriteLine($"[MockHub] Error: {result.ErrorMessage}");
            return;
        }

        // Send patches via callback (in-memory transport)
        if (result.Patches.Count > 0)
        {
            _client.ApplyPatches(componentId, result.Patches);
        }

        // Send hints via callback (in-memory transport)
        foreach (var hint in result.Hints)
        {
            _client.QueueHint(componentId, hint.HintId, hint.Patches, hint.Confidence);
        }
    }

    /// <summary>
    /// Register a component for testing
    /// </summary>
    public void RegisterComponent(string componentId, MinimactComponent component)
    {
        _engine.RegisterComponent(componentId, component);
    }
}
```

---

## The Power of This Approach

### ✅ Algorithm Parity GUARANTEED

**Both production and testing use THE EXACT SAME CODE!**

```csharp
// Production
var engine = new ComponentEngine(registry, reconciler, predictor);
var hub = new MinimactHub(engine);

// Testing
var engine = new ComponentEngine(registry, reconciler, predictor);
var mockHub = new MockHub(client);
```

If it works in Command Center, it **will** work in production!

### ✅ No Code Duplication

We don't "simulate" rendering - we USE the real rendering!
We don't "mock" reconciliation - we USE the real Rust reconciler!

### ✅ Easy Testing

```csharp
// Red Ranger Test
var client = new MockClient();
var hub = new MockHub(client);

// Register a real component
var counter = new CounterComponent();
hub.RegisterComponent("counter", counter);

// Invoke method (uses REAL rendering!)
await hub.InvokeComponentMethod("counter", "Increment", Array.Empty<object>());

// Verify patches were generated by REAL reconciler
Assert.NotEmpty(client.ReceivedPatches);
```

### ✅ Performance Testing

Since we use the **real** Rust reconciler, we can benchmark actual performance:

```csharp
var sw = Stopwatch.StartNew();
for (int i = 0; i < 1000; i++)
{
    await hub.InvokeComponentMethod("component", "Update", new[] { i });
}
sw.Stop();

Console.WriteLine($"1000 renders: {sw.ElapsedMilliseconds}ms");
// This is REAL performance, not simulated!
```

---

## Migration Path

1. **Create IComponentEngine interface** in `Minimact.AspNetCore/Abstractions/`
2. **Extract ComponentEngine** from MinimactHub into separate class
3. **Update MinimactHub** to use IComponentEngine via DI
4. **Create MockHub** in Command Center that uses IComponentEngine
5. **Update Red Ranger** to use MockHub instead of SignalR

---

## Summary

**Before:**
- MinimactHub contains all logic (tightly coupled to SignalR)
- Command Center must simulate everything
- No guarantee of parity

**After:**
- ComponentEngine contains all logic (no SignalR dependency)
- MinimactHub = ComponentEngine + SignalR transport
- MockHub = ComponentEngine + in-memory transport
- Command Center uses REAL production code
- Parity guaranteed!

**The Core Insight:**

> The component engine doesn't care HOW patches get to the client.
> It only cares about rendering components and generating patches.
> Transport is an implementation detail!

This is **dependency inversion** done right! 🦕⚡
