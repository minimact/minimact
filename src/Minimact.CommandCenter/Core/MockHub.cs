using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Abstractions;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// Mock hub for Command Center testing
/// Uses the REAL ComponentEngine (same production code as MinimactHub!)
///
/// This is the magic: MockHub and MinimactHub both use ComponentEngine.
/// The ONLY difference is transport (in-memory vs SignalR).
/// </summary>
public class MockHub
{
    private readonly IComponentEngine _engine;
    private readonly MockClient _client;
    private readonly MockPatchSender _patchSender;

    public MockHub(MockClient client)
    {
        _client = client;

        // ✅ Create MockPatchSender for in-memory patch transport
        _patchSender = new MockPatchSender(client);

        // ✅ Create the REAL ComponentEngine (same as production!)
        var registry = new ComponentRegistry();
        _engine = new ComponentEngine(registry);

        Console.WriteLine("[MockHub] Initialized with REAL ComponentEngine 🦕⚡");
    }

    // ========================================
    // Component Management
    // ========================================

    /// <summary>
    /// Register a component for testing
    /// </summary>
    public void RegisterComponent(string componentId, MinimactComponent component)
    {
        // Inject MockPatchSender into component (in-memory transport!)
        // Use reflection since PatchSender and ConnectionId have internal setters
        var patchSenderProp = typeof(MinimactComponent).GetProperty("PatchSender",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public);
        patchSenderProp?.SetValue(component, _patchSender);

        var connectionIdProp = typeof(MinimactComponent).GetProperty("ConnectionId",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public);
        connectionIdProp?.SetValue(component, componentId);

        _engine.RegisterComponent(componentId, component);
        Console.WriteLine($"[MockHub] Registered component: {componentId}");
    }

    /// <summary>
    /// Get a registered component
    /// </summary>
    public MinimactComponent? GetComponent(string componentId)
    {
        return _engine.GetComponent(componentId);
    }

    // ========================================
    // State Updates (from MockClient)
    // ========================================

    /// <summary>
    /// Update component state from MockClient
    /// Uses REAL ComponentEngine - same code as production!
    /// </summary>
    public async Task UpdateComponentState(string componentId, string stateKey, object value)
    {
        Console.WriteLine($"[MockHub] → UpdateComponentState({componentId}, {stateKey}, {value})");

        // Call the REAL engine (SHARED CODE!)
        var patches = await _engine.UpdateComponentStateAsync(componentId, stateKey, value);

        // Send patches via callback (in-memory transport)
        if (patches.Count > 0)
        {
            Console.WriteLine($"[MockHub] ← Sending {patches.Count} patches to MockClient");
            _client.OnApplyPatches(componentId, patches);
        }
    }

    /// <summary>
    /// Update DOM element state from MockClient
    /// Uses REAL ComponentEngine - same code as production!
    /// </summary>
    public async Task UpdateDomElementState(string componentId, string stateKey, DomElementStateSnapshot snapshot)
    {
        Console.WriteLine($"[MockHub] → UpdateDomElementState({componentId}, {stateKey})");

        // Call the REAL engine (SHARED CODE!)
        var patches = await _engine.UpdateDomElementStateAsync(componentId, stateKey, snapshot);

        // Send patches via callback (in-memory transport)
        if (patches.Count > 0)
        {
            Console.WriteLine($"[MockHub] ← Sending {patches.Count} patches to MockClient");
            _client.OnApplyPatches(componentId, patches);
        }
    }

    /// <summary>
    /// Update client-computed state from MockClient
    /// Uses REAL ComponentEngine - same code as production!
    /// </summary>
    public async Task UpdateClientComputedState(string componentId, Dictionary<string, object> computedValues)
    {
        Console.WriteLine($"[MockHub] → UpdateClientComputedState({componentId})");

        // Call the REAL engine (SHARED CODE!)
        var patches = await _engine.UpdateClientComputedStateAsync(componentId, computedValues);

        // Send patches via callback (in-memory transport)
        if (patches.Count > 0)
        {
            Console.WriteLine($"[MockHub] ← Sending {patches.Count} patches to MockClient");
            _client.OnApplyPatches(componentId, patches);
        }
    }

    // ========================================
    // Method Invocation (from MockClient)
    // ========================================

    /// <summary>
    /// Invoke component method from MockClient
    /// Uses REAL ComponentEngine - same code as production!
    /// </summary>
    public async Task InvokeComponentMethod(string componentId, string methodName, params object[] args)
    {
        Console.WriteLine($"[MockHub] → InvokeComponentMethod({componentId}, {methodName})");

        // Call the REAL engine (SHARED CODE!)
        var result = await _engine.InvokeComponentMethodAsync(componentId, methodName, args);

        if (!result.Success)
        {
            Console.WriteLine($"[MockHub] ❌ Error: {result.ErrorMessage}");
            return;
        }

        // Send patches via callback (in-memory transport)
        if (result.Patches.Count > 0)
        {
            Console.WriteLine($"[MockHub] ← Sending {result.Patches.Count} patches to MockClient");
            _client.OnApplyPatches(componentId, result.Patches);
        }

        // Send hints via callback (in-memory transport)
        foreach (var hint in result.Hints)
        {
            Console.WriteLine($"[MockHub] ← Sending hint '{hint.HintId}' to MockClient");
            _client.OnQueueHint(componentId, hint.HintId, hint.Patches, hint.Confidence);
        }
    }

    // ========================================
    // Prediction (from MockClient)
    // ========================================

    /// <summary>
    /// Request predict hints from MockClient
    /// Uses REAL ComponentEngine - same code as production!
    /// </summary>
    public async Task RequestPredict(string componentId, Dictionary<string, object> stateChanges)
    {
        Console.WriteLine($"[MockHub] → RequestPredict({componentId})");

        // Call the REAL engine (SHARED CODE!)
        var hints = await _engine.RequestPredictAsync(componentId, stateChanges);

        // Send hints via callback (in-memory transport)
        foreach (var hint in hints)
        {
            Console.WriteLine($"[MockHub] ← Sending hint '{hint.HintId}' to MockClient");
            _client.OnQueueHint(componentId, hint.HintId, hint.Patches, hint.Confidence);
        }
    }
}
