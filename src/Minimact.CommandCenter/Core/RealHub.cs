using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Abstractions;
using Minimact.CommandCenter.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
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

    // ========================================
    // Server Tasks (useServerTask support)
    // SET BREAKPOINTS HERE to debug long-running operations!
    // ========================================

    /// <summary>
    /// Start a server task
    /// Called from JavaScript: connection.invoke('StartServerTask', componentId, taskId, args)
    /// </summary>
    public async Task StartServerTask(string componentId, string taskId, object[]? args = null)
    {
        Console.WriteLine($"[RealHub] 💜 StartServerTask: {componentId}.{taskId}");

        var component = _engine.GetComponent(componentId);
        if (component == null)
        {
            Console.WriteLine($"[RealHub] ⚠️  Component not found: {componentId}");
            return;
        }

        try
        {
            // THIS IS WHERE YOU SET BREAKPOINTS FOR SERVER TASKS!
            // Use reflection to call GetServerTask<T> with the correct type
            var method = component.GetType()
                .GetMethod("GetServerTask", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);

            if (method == null)
            {
                Console.WriteLine($"[RealHub] ❌ GetServerTask method not found");
                return;
            }

            // Find the task method to get return type
            var taskMethod = FindTaskMethod(component, taskId);
            if (taskMethod == null)
            {
                Console.WriteLine($"[RealHub] ❌ No method found with [ServerTask(\"{taskId}\")]");
                return;
            }

            var returnType = taskMethod.ReturnType;
            if (returnType.IsGenericType && returnType.GetGenericTypeDefinition() == typeof(Task<>))
            {
                returnType = returnType.GetGenericArguments()[0];
            }

            // Get the task state
            var genericMethod = method.MakeGenericMethod(returnType);
            dynamic taskState = genericMethod.Invoke(component, new object[] { taskId })!;

            // Start the task (you can step through this!)
            await taskState.Start(args ?? Array.Empty<object>());

            Console.WriteLine($"[RealHub] ✅ Task started: {taskId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[RealHub] ❌ Error starting task: {ex.Message}");
        }
    }

    /// <summary>
    /// Retry a failed server task
    /// Called from JavaScript: connection.invoke('RetryServerTask', componentId, taskId, args)
    /// </summary>
    public async Task RetryServerTask(string componentId, string taskId, object[]? args = null)
    {
        Console.WriteLine($"[RealHub] 🔄 RetryServerTask: {componentId}.{taskId}");

        var component = _engine.GetComponent(componentId);
        if (component == null)
        {
            Console.WriteLine($"[RealHub] ⚠️  Component not found: {componentId}");
            return;
        }

        try
        {
            var method = component.GetType()
                .GetMethod("GetServerTask", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);

            var taskMethod = FindTaskMethod(component, taskId);
            if (taskMethod == null)
            {
                Console.WriteLine($"[RealHub] ❌ No method found with [ServerTask(\"{taskId}\")]");
                return;
            }

            var returnType = taskMethod.ReturnType;
            if (returnType.IsGenericType && returnType.GetGenericTypeDefinition() == typeof(Task<>))
            {
                returnType = returnType.GetGenericArguments()[0];
            }

            var genericMethod = method!.MakeGenericMethod(returnType);
            dynamic taskState = genericMethod.Invoke(component, new object[] { taskId })!;

            await taskState.Retry(args ?? Array.Empty<object>());

            Console.WriteLine($"[RealHub] ✅ Task retried: {taskId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[RealHub] ❌ Error retrying task: {ex.Message}");
        }
    }

    /// <summary>
    /// Cancel a running server task
    /// Called from JavaScript: connection.invoke('CancelServerTask', componentId, taskId)
    /// </summary>
    public async Task CancelServerTask(string componentId, string taskId)
    {
        Console.WriteLine($"[RealHub] 🚫 CancelServerTask: {componentId}.{taskId}");

        var component = _engine.GetComponent(componentId);
        if (component == null)
        {
            Console.WriteLine($"[RealHub] ⚠️  Component not found: {componentId}");
            return;
        }

        try
        {
            var method = component.GetType()
                .GetMethod("GetServerTask", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);

            var taskMethod = FindTaskMethod(component, taskId);
            if (taskMethod == null)
            {
                Console.WriteLine($"[RealHub] ❌ No method found with [ServerTask(\"{taskId}\")]");
                return;
            }

            var returnType = taskMethod.ReturnType;
            if (returnType.IsGenericType && returnType.GetGenericTypeDefinition() == typeof(Task<>))
            {
                returnType = returnType.GetGenericArguments()[0];
            }

            var genericMethod = method!.MakeGenericMethod(returnType);
            dynamic taskState = genericMethod.Invoke(component, new object[] { taskId })!;

            taskState.Cancel();

            Console.WriteLine($"[RealHub] ✅ Task cancelled: {taskId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[RealHub] ❌ Error cancelling task: {ex.Message}");
        }
    }

    // ========================================
    // Decision Trees (useDecisionTree from minimact-trees)
    // SET BREAKPOINTS HERE to debug decision tree state changes!
    // ========================================

    /// <summary>
    /// Update decision tree state from client
    /// Called from JavaScript: connection.invoke('UpdateDecisionTreeState', { componentId, stateKey, value, context })
    /// </summary>
    public async Task UpdateDecisionTreeState(UpdateDecisionTreeStateRequest request)
    {
        Console.WriteLine($"[RealHub] 🔶 UpdateDecisionTreeState: {request.ComponentId}.{request.StateKey} = {request.Value}");

        var component = _engine.GetComponent(request.ComponentId);
        if (component == null)
        {
            Console.WriteLine($"[RealHub] ⚠️  Component not found: {request.ComponentId}");
            return;
        }

        try
        {
            // Update component state with decision tree result
            // THIS IS WHERE YOU SET BREAKPOINTS FOR DECISION TREE CHANGES!
            var patches = await _engine.UpdateComponentStateAsync(request.ComponentId, request.StateKey, request.Value);

            // Send patches back to JavaScript
            if (patches.Count > 0)
            {
                Console.WriteLine($"[RealHub] 📤 Sending {patches.Count} patches to JavaScript");
                await _patchSender.SendPatchesAsync(request.ComponentId, patches);
            }

            Console.WriteLine($"[RealHub] ✅ Decision tree state updated: {request.StateKey} = {request.Value}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[RealHub] ❌ Error updating decision tree state: {ex.Message}");
        }
    }

    /// <summary>
    /// Find method with [ServerTask] attribute by task ID
    /// </summary>
    private System.Reflection.MethodInfo? FindTaskMethod(MinimactComponent component, string taskId)
    {
        return component.GetType()
            .GetMethods(System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)
            .FirstOrDefault(m =>
            {
                var attr = m.GetCustomAttribute<ServerTaskAttribute>();
                return attr != null && attr.TaskId == taskId;
            });
    }

    // ========================================
    // Quantum DOM Entanglement (minimact-quantum)
    // SET BREAKPOINTS HERE to debug multi-client sync!
    // ========================================

    private Dictionary<string, List<EntanglementLink>> _entanglements = new();
    private Dictionary<string, RealClient> _clients = new();

    /// <summary>
    /// Register a client for quantum entanglement
    /// </summary>
    public void RegisterQuantumClient(string clientId, RealClient client)
    {
        _clients[clientId] = client;
        Console.WriteLine($"[RealHub] 🌌 Registered quantum client: {clientId}");
    }

    /// <summary>
    /// Entangle two DOM elements across clients
    /// Called from JavaScript: connection.invoke('EntangleElements', sourceClientId, sourceSelector, targetClientId, targetSelector, mode)
    /// SET BREAKPOINT HERE to debug entanglement!
    /// </summary>
    public Task EntangleElements(string sourceClientId, string sourceSelector, string targetClientId, string targetSelector, string mode)
    {
        Console.WriteLine($"[RealHub] 🔗 Entangling: {sourceClientId}.{sourceSelector} <-> {targetClientId}.{targetSelector} ({mode})");

        var link = new EntanglementLink
        {
            SourceClient = sourceClientId,
            SourceSelector = sourceSelector,
            TargetClient = targetClientId,
            TargetSelector = targetSelector,
            Mode = mode
        };

        if (!_entanglements.ContainsKey(sourceClientId))
            _entanglements[sourceClientId] = new List<EntanglementLink>();

        _entanglements[sourceClientId].Add(link);

        // If bidirectional, create reverse link
        if (mode == "bidirectional")
        {
            var reverseLink = new EntanglementLink
            {
                SourceClient = targetClientId,
                SourceSelector = targetSelector,
                TargetClient = sourceClientId,
                TargetSelector = sourceSelector,
                Mode = mode
            };

            if (!_entanglements.ContainsKey(targetClientId))
                _entanglements[targetClientId] = new List<EntanglementLink>();

            _entanglements[targetClientId].Add(reverseLink);

            Console.WriteLine($"[RealHub] ↔️  Bidirectional link established");
        }

        return Task.CompletedTask;
    }

    /// <summary>
    /// Transmit mutation vector from source client to entangled target client(s)
    /// Called from JavaScript: connection.invoke('TransmitMutation', sourceClientId, sourceSelector, vector)
    /// SET BREAKPOINT HERE to debug mutation propagation!
    /// </summary>
    public Task TransmitMutation(string sourceClientId, string sourceSelector, string vectorJson)
    {
        Console.WriteLine($"[RealHub] 📡 Transmitting mutation from {sourceClientId}.{sourceSelector}");

        if (!_entanglements.ContainsKey(sourceClientId))
        {
            Console.WriteLine($"[RealHub] ⚠️  No entanglements found for {sourceClientId}");
            return Task.CompletedTask;
        }

        // Find all entangled targets
        foreach (var link in _entanglements[sourceClientId])
        {
            if (link.SourceSelector == sourceSelector && _clients.ContainsKey(link.TargetClient))
            {
                var targetClient = _clients[link.TargetClient];

                Console.WriteLine($"[RealHub] ➡️  Forwarding to {link.TargetClient}.{link.TargetSelector}");

                // Apply mutation to target client's DOM via JavaScript
                targetClient.JSRuntime.Execute($@"
                    (function() {{
                        if (typeof quantum !== 'undefined' && quantum.applyMutation) {{
                            console.log('[Quantum] Applying mutation from {sourceClientId}:', {vectorJson});
                            quantum.applyMutation('{link.TargetSelector}', {vectorJson});
                        }} else {{
                            console.warn('[Quantum] applyMutation not found - using fallback');

                            // Fallback: Manually apply mutation
                            const vector = {vectorJson};
                            const element = document.querySelector('{link.TargetSelector}');

                            if (element && vector.type === 'setAttribute') {{
                                element.setAttribute(vector.attribute, vector.value);
                                console.log('[Quantum-Fallback] Applied:', vector.attribute, '=', vector.value);
                            }} else if (element && vector.type === 'setProperty') {{
                                element[vector.property] = vector.value;
                                console.log('[Quantum-Fallback] Set property:', vector.property, '=', vector.value);
                            }}
                        }}
                    }})()
                ");
            }
        }

        return Task.CompletedTask;
    }
}

/// <summary>
/// Entanglement link between two DOM elements across clients
/// </summary>
public class EntanglementLink
{
    public string SourceClient { get; set; } = string.Empty;
    public string SourceSelector { get; set; } = string.Empty;
    public string TargetClient { get; set; } = string.Empty;
    public string TargetSelector { get; set; } = string.Empty;
    public string Mode { get; set; } = string.Empty; // "unidirectional" or "bidirectional"
}

/// <summary>
/// Request model for UpdateDecisionTreeState
/// </summary>
public class UpdateDecisionTreeStateRequest
{
    public string ComponentId { get; set; } = string.Empty;
    public string StateKey { get; set; } = string.Empty;
    public object? Value { get; set; }
    public Dictionary<string, object>? Context { get; set; }
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

    /// <summary>
    /// Send server task state update to JavaScript
    /// This is called by ServerTaskState when task progress/status changes
    /// </summary>
    public Task SendServerTaskUpdateAsync(string componentId, string taskId, object state)
    {
        Console.WriteLine($"[RealPatchSender] Sending task update to JavaScript for {componentId}.{taskId}");

        var stateJson = System.Text.Json.JsonSerializer.Serialize(state);

        _client.JSRuntime.Execute($@"
            (function() {{
                if (typeof Minimact !== 'undefined' && Minimact.updateServerTask) {{
                    console.log('[Minimact] Updating server task:', '{taskId}', {stateJson});
                    Minimact.updateServerTask('{componentId}', '{taskId}', {stateJson});
                }} else {{
                    console.warn('[Minimact] updateServerTask not found - task updates may not work');
                }}
            }})()
        ");

        return Task.CompletedTask;
    }
}
