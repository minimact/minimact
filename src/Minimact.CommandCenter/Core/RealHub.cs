using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Abstractions;
using Minimact.CommandCenter.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// Hub for RealClient testing - JavaScript runtime edition of MockHub
/// Uses the REAL ComponentEngine (same production code!)
///
/// JavaScript client runtime -> RealHub -> ComponentEngine (you can set breakpoints!)
/// </summary>
public class RealHub
{
    private readonly IComponentEngine _engine;
    private readonly RealClient _client;
    private readonly RealPatchSender _patchSender;

    public RealHub(RealClient client)
    {
        _client = client;

        // Create RealPatchSender that sends patches to JavaScript
        _patchSender = new RealPatchSender(client);

        // Create the REAL ComponentEngine (same as production!)
        var registry = new ComponentRegistry();
        _engine = new ComponentEngine(registry);

        Console.WriteLine("[RealHub] Initialized with REAL ComponentEngine 🦕⚡");
        Console.WriteLine("[RealHub] JavaScript can call hub methods -> ComponentEngine runs -> you can debug!");
    }

    // ========================================
    // Component Management
    // ========================================

    /// <summary>
    /// Register a component for testing
    /// Called from JavaScript: connection.invoke('RegisterComponent', componentId, component)
    /// </summary>
    public void RegisterComponent(string componentId, MinimactComponent component)
    {
        // Inject RealPatchSender into component (sends to JavaScript!)
        var patchSenderProp = typeof(MinimactComponent).GetProperty("PatchSender",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public);
        patchSenderProp?.SetValue(component, _patchSender);

        var connectionIdProp = typeof(MinimactComponent).GetProperty("ConnectionId",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public);
        connectionIdProp?.SetValue(component, componentId);

        _engine.RegisterComponent(componentId, component);
        Console.WriteLine($"[RealHub] ✅ Registered component: {componentId}");
    }

    /// <summary>
    /// Get a registered component
    /// </summary>
    public MinimactComponent? GetComponent(string componentId)
    {
        return _engine.GetComponent(componentId);
    }

    // ========================================
    // State Management (Called from JavaScript)
    // ========================================

    /// <summary>
    /// Update component state
    /// Called from JavaScript: connection.invoke('UpdateComponentState', componentId, stateKey, value)
    /// SET BREAKPOINT HERE to debug state changes!
    /// </summary>
    public async Task UpdateComponentState(string componentId, string stateKey, object value)
    {
        Console.WriteLine($"[RealHub] 📥 UpdateComponentState: {componentId}.{stateKey} = {value}");

        var component = _engine.GetComponent(componentId);
        if (component == null)
        {
            Console.WriteLine($"[RealHub] ⚠️  Component not found: {componentId}");
            return;
        }

        // THIS IS WHERE YOU SET BREAKPOINTS!
        // Step through ComponentEngine.UpdateComponentStateAsync() to see real server logic
        var patches = await _engine.UpdateComponentStateAsync(componentId, stateKey, value);

        // Send patches back to JavaScript
        if (patches.Count > 0)
        {
            Console.WriteLine($"[RealHub] 📤 Sending {patches.Count} patches to JavaScript");
            await _patchSender.SendPatchesAsync(componentId, patches);
        }
    }

    /// <summary>
    /// Invoke component method (e.g., button click handler)
    /// Called from JavaScript: connection.invoke('InvokeComponentMethod', componentId, methodName, args)
    /// </summary>
    public async Task InvokeComponentMethod(string componentId, string methodName, object[] args)
    {
        Console.WriteLine($"[RealHub] 📥 InvokeComponentMethod: {componentId}.{methodName}");

        var result = await _engine.InvokeComponentMethodAsync(componentId, methodName, args);

        if (result.Patches.Count > 0)
        {
            Console.WriteLine($"[RealHub] 📤 Sending {result.Patches.Count} patches to JavaScript");
            await _patchSender.SendPatchesAsync(componentId, result.Patches);
        }

        if (result.Hints.Count > 0)
        {
            Console.WriteLine($"[RealHub] 💡 Sending {result.Hints.Count} hints to JavaScript");
            foreach (var hint in result.Hints)
            {
                await _patchSender.SendHintAsync(componentId, hint.HintId, hint.Patches, hint.Confidence);
            }
        }
    }

    /// <summary>
    /// Request prediction hints
    /// Called from JavaScript: connection.invoke('RequestPredict', componentId, stateChanges)
    /// </summary>
    public async Task<List<PredictHint>> RequestPredict(string componentId, Dictionary<string, object> stateChanges)
    {
        Console.WriteLine($"[RealHub] 📥 RequestPredict: {componentId}");

        var hints = await _engine.RequestPredictAsync(componentId, stateChanges);

        Console.WriteLine($"[RealHub] 💡 Sending {hints.Count} prediction hints to JavaScript");
        foreach (var hint in hints)
        {
            await _patchSender.SendHintAsync(componentId, hint.HintId, hint.Patches, hint.Confidence);
        }

        return hints;
    }
}

/// <summary>
/// Patch sender that sends patches to JavaScript (via JSRuntime)
/// This is the bridge from C# ComponentEngine -> JavaScript client runtime
/// </summary>
public class RealPatchSender : IPatchSender
{
    private readonly RealClient _client;

    public RealPatchSender(RealClient client)
    {
        _client = client;
    }

    public Task SendPatchesAsync(string componentId, List<Patch> patches)
    {
        Console.WriteLine($"[RealPatchSender] Sending {patches.Count} patches to JavaScript for {componentId}");

        // Serialize patches and send to JavaScript
        var patchesJson = System.Text.Json.JsonSerializer.Serialize(patches);

        _client.JSRuntime.Execute($@"
            (function() {{
                if (typeof Minimact !== 'undefined' && Minimact.applyPatches) {{
                    console.log('[Minimact] Applying patches from server:', {patchesJson});
                    Minimact.applyPatches('{componentId}', {patchesJson});
                }}
            }})()
        ");

        return Task.CompletedTask;
    }

    public Task SendHintAsync(string componentId, string hintId, List<Patch> patches, double confidence)
    {
        Console.WriteLine($"[RealPatchSender] Sending hint '{hintId}' to JavaScript for {componentId}");

        var patchesJson = System.Text.Json.JsonSerializer.Serialize(patches);

        _client.JSRuntime.Execute($@"
            (function() {{
                if (typeof Minimact !== 'undefined' && Minimact.queueHint) {{
                    console.log('[Minimact] Queueing hint from server:', '{hintId}');
                    Minimact.queueHint('{componentId}', '{hintId}', {patchesJson}, {confidence});
                }}
            }})()
        ");

        return Task.CompletedTask;
    }

    public Task SendErrorAsync(string componentId, string errorMessage)
    {
        Console.WriteLine($"[RealPatchSender] Sending error to JavaScript for {componentId}: {errorMessage}");

        var errorJson = System.Text.Json.JsonSerializer.Serialize(errorMessage);

        _client.JSRuntime.Execute($@"
            (function() {{
                if (typeof Minimact !== 'undefined' && Minimact.handleError) {{
                    console.error('[Minimact] Error from server:', {errorJson});
                    Minimact.handleError('{componentId}', {errorJson});
                }}
            }})()
        ");

        return Task.CompletedTask;
    }
}
