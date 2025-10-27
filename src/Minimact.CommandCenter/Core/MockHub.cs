using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Abstractions;
using System.Linq;
using System.Reflection;

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

    // ========================================
    // Server Tasks (useServerTask support)
    // ========================================

    /// <summary>
    /// Start a server task from MockClient
    /// Uses REAL ComponentEngine - same code as production!
    /// </summary>
    public async Task StartServerTask(string componentId, string taskId, object[]? args = null)
    {
        Console.WriteLine($"[MockHub] → StartServerTask({componentId}, {taskId})");

        var component = _engine.GetComponent(componentId);
        if (component == null)
        {
            Console.WriteLine($"[MockHub] ❌ Component not found: {componentId}");
            return;
        }

        try
        {
            // Use reflection to call GetServerTask<T> with the correct type
            var method = component.GetType()
                .GetMethod("GetServerTask", BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance);

            if (method == null)
            {
                Console.WriteLine($"[MockHub] ❌ GetServerTask method not found");
                return;
            }

            // Find the task method to get return type
            var taskMethod = FindTaskMethod(component, taskId);
            if (taskMethod == null)
            {
                Console.WriteLine($"[MockHub] ❌ No method found with [ServerTask(\"{taskId}\")]");
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

            // Start the task
            await taskState.Start(args ?? Array.Empty<object>());

            Console.WriteLine($"[MockHub] ✅ Task started: {taskId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[MockHub] ❌ Error starting task: {ex.Message}");
        }
    }

    /// <summary>
    /// Retry a failed server task from MockClient
    /// Uses REAL ComponentEngine - same code as production!
    /// </summary>
    public async Task RetryServerTask(string componentId, string taskId, object[]? args = null)
    {
        Console.WriteLine($"[MockHub] → RetryServerTask({componentId}, {taskId})");

        var component = _engine.GetComponent(componentId);
        if (component == null)
        {
            Console.WriteLine($"[MockHub] ❌ Component not found: {componentId}");
            return;
        }

        try
        {
            var method = component.GetType()
                .GetMethod("GetServerTask", BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance);

            var taskMethod = FindTaskMethod(component, taskId);
            if (taskMethod == null)
            {
                Console.WriteLine($"[MockHub] ❌ No method found with [ServerTask(\"{taskId}\")]");
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

            Console.WriteLine($"[MockHub] ✅ Task retried: {taskId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[MockHub] ❌ Error retrying task: {ex.Message}");
        }
    }

    /// <summary>
    /// Cancel a running server task from MockClient
    /// Uses REAL ComponentEngine - same code as production!
    /// </summary>
    public async Task CancelServerTask(string componentId, string taskId)
    {
        Console.WriteLine($"[MockHub] → CancelServerTask({componentId}, {taskId})");

        var component = _engine.GetComponent(componentId);
        if (component == null)
        {
            Console.WriteLine($"[MockHub] ❌ Component not found: {componentId}");
            return;
        }

        try
        {
            var method = component.GetType()
                .GetMethod("GetServerTask", BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance);

            var taskMethod = FindTaskMethod(component, taskId);
            if (taskMethod == null)
            {
                Console.WriteLine($"[MockHub] ❌ No method found with [ServerTask(\"{taskId}\")]");
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

            Console.WriteLine($"[MockHub] ✅ Task cancelled: {taskId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[MockHub] ❌ Error cancelling task: {ex.Message}");
        }
    }

    // ========================================
    // Decision Trees (useDecisionTree from minimact-trees)
    // ========================================

    /// <summary>
    /// Update decision tree state from MockClient
    /// Uses REAL ComponentEngine - same code as production!
    /// </summary>
    public async Task UpdateDecisionTreeState(string componentId, string stateKey, object value, Dictionary<string, object>? context = null)
    {
        Console.WriteLine($"[MockHub] → UpdateDecisionTreeState({componentId}, {stateKey}, {value})");

        var component = _engine.GetComponent(componentId);
        if (component == null)
        {
            Console.WriteLine($"[MockHub] ❌ Component not found: {componentId}");
            return;
        }

        try
        {
            // Update component state with decision tree result
            var patches = await _engine.UpdateComponentStateAsync(componentId, stateKey, value);

            // Send patches via callback (in-memory transport)
            if (patches.Count > 0)
            {
                Console.WriteLine($"[MockHub] ← Sending {patches.Count} patches to MockClient");
                _client.OnApplyPatches(componentId, patches);
            }

            Console.WriteLine($"[MockHub] ✅ Decision tree state updated: {stateKey} = {value}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[MockHub] ❌ Error updating decision tree state: {ex.Message}");
        }
    }

    /// <summary>
    /// Find method with [ServerTask] attribute by task ID
    /// </summary>
    private MethodInfo? FindTaskMethod(MinimactComponent component, string taskId)
    {
        return component.GetType()
            .GetMethods(BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance)
            .FirstOrDefault(m =>
            {
                var attr = m.GetCustomAttribute<ServerTaskAttribute>();
                return attr != null && attr.TaskId == taskId;
            });
    }
}
