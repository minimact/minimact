using Microsoft.AspNetCore.SignalR;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Abstractions;

namespace Minimact.AspNetCore.SignalR;

/// <summary>
/// SignalR Hub for real-time component updates
/// Handles client connections and component interactions
/// </summary>
public class MinimactHub : Hub
{
    private readonly ComponentRegistry _registry;
    private readonly IHubContext<MinimactHub> _hubContext;
    private readonly SignalRPatchSender _patchSender;

    public MinimactHub(ComponentRegistry registry, IHubContext<MinimactHub> hubContext)
    {
        _registry = registry;
        _hubContext = hubContext;
        _patchSender = new SignalRPatchSender(hubContext, registry);
    }

    /// <summary>
    /// Register a component instance with this connection
    /// </summary>
    public async Task RegisterComponent(string componentId)
    {
        var component = _registry.GetComponent(componentId);
        if (component != null)
        {
            component.ConnectionId = Context.ConnectionId;
            component.PatchSender = _patchSender;
        }

        await Task.CompletedTask;
    }

    /// <summary>
    /// Handle component event from client (e.g., button click)
    /// </summary>
    public async Task InvokeComponentMethod(string componentId, string methodName, string argsJson)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            await Clients.Caller.SendAsync("Error", $"Component {componentId} not found");
            return;
        }

        try
        {
            // Use reflection to find and invoke the method
            var method = component.GetType().GetMethod(methodName,
                System.Reflection.BindingFlags.Public |
                System.Reflection.BindingFlags.NonPublic |
                System.Reflection.BindingFlags.Instance);

            if (method == null)
            {
                await Clients.Caller.SendAsync("Error", $"Method {methodName} not found on component {componentId}");
                return;
            }

            // For now, assume no arguments or parse from JSON
            // TODO: Parse argsJson and match parameter types
            var result = method.Invoke(component, null);

            // If method returns Task, await it
            if (result is Task task)
            {
                await task;
            }
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", $"Error invoking {methodName}: {ex.Message}");
        }
    }

    /// <summary>
    /// Update client state value (for useClientState synchronization)
    /// </summary>
    public async Task UpdateClientState(string componentId, string key, string valueJson)
    {
        var component = _registry.GetComponent(componentId);
        if (component != null)
        {
            // Store client state for server access if needed
            // This is used when client state needs to be read by server methods
            component.State[$"__client_{key}"] = valueJson;
        }

        await Task.CompletedTask;
    }

    /// <summary>
    /// Update client-computed state values (for external library support)
    /// Receives computed values from browser (lodash, moment, etc.) and triggers re-render
    /// </summary>
    public async Task UpdateClientComputedState(string componentId, Dictionary<string, object> computedValues)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            await Clients.Caller.SendAsync("Error", $"Component {componentId} not found");
            return;
        }

        try
        {
            // Update the component's ClientState dictionary
            component.UpdateClientState(computedValues);

            // Trigger a re-render with the new client-computed values
            component.TriggerRender();

            // Note: TriggerRender() internally handles:
            // - Rendering the component with new client-computed state
            // - Computing patches via diffing
            // - Sending patches to client via SignalR
            // - Notifying the predictor for learning patterns
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", $"Error updating client-computed state: {ex.Message}");
        }
    }

    /// <summary>
    /// Update component state from client useState hook
    /// Keeps server state in sync with client to prevent stale data
    /// </summary>
    public async Task UpdateComponentState(string componentId, string stateKey, object value)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            await Clients.Caller.SendAsync("Error", $"Component {componentId} not found");
            return;
        }

        try
        {
            // Update the component's state from client
            component.SetStateFromClient(stateKey, value);

            // Trigger a re-render with the updated state
            component.TriggerRender();

            // Note: Client already applied cached patches for instant feedback
            // This render ensures server state is correct for subsequent renders
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", $"Error updating component state: {ex.Message}");
        }
    }

    /// <summary>
    /// Update DOM element state from client useDomElementState hook
    /// Keeps server aware of DOM changes for accurate rendering
    /// </summary>
    public async Task UpdateDomElementState(string componentId, string stateKey, DomElementStateSnapshot snapshot)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            await Clients.Caller.SendAsync("Error", $"Component {componentId} not found");
            return;
        }

        try
        {
            // Update the component's DOM state from client
            component.SetDomStateFromClient(stateKey, snapshot);

            // Trigger a re-render with the updated DOM state
            component.TriggerRender();

            // Note: Client already applied cached patches for instant feedback
            // This render ensures server state is correct for subsequent renders
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", $"Error updating DOM element state: {ex.Message}");
        }
    }

    /// <summary>
    /// Update query results from client useDomQuery hook
    /// Keeps server aware of query results for accurate rendering
    /// </summary>
    public async Task UpdateQueryResults(string componentId, string queryKey, List<Dictionary<string, object>> results)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            await Clients.Caller.SendAsync("Error", $"Component {componentId} not found");
            return;
        }

        try
        {
            // Update the component's query results from client
            component.SetQueryResultsFromClient(queryKey, results);

            // Trigger a re-render with the updated query results
            component.TriggerRender();

            // Note: Client already applied cached patches for instant feedback
            // This render ensures server state is correct for subsequent renders
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", $"Error updating query results: {ex.Message}");
        }
    }

    /// <summary>
    /// Transition lifecycle state from client
    /// Keeps server lifecycle machine in sync with client transitions
    /// </summary>
    public async Task TransitionLifecycleState(string componentId, string newState)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            await Clients.Caller.SendAsync("Error", $"Component {componentId} not found");
            return;
        }

        try
        {
            // Transition the component's lifecycle state
            var success = component.TransitionLifecycleFromClient(newState);

            if (!success)
            {
                await Clients.Caller.SendAsync("Error",
                    $"Invalid lifecycle transition to state: {newState}");
                return;
            }

            // Trigger a re-render with the new lifecycle state
            component.TriggerRender();

            // Note: Client already applied cached patches for the new lifecycle state
            // This render ensures server lifecycle machine is in sync for subsequent renders
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", $"Error transitioning lifecycle state: {ex.Message}");
        }
    }

    /// <summary>
    /// Request prediction for future state
    /// Used by usePredictHint (manual) and Confidence Worker (automatic)
    /// </summary>
    public async Task RequestPrediction(string componentId, Dictionary<string, object> predictedState)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            await Clients.Caller.SendAsync("Error", $"Component {componentId} not found");
            return;
        }

        try
        {
            // Clone current component state
            var clonedState = new Dictionary<string, object>(component.State);

            // Apply predicted state changes
            foreach (var kvp in predictedState)
            {
                clonedState[kvp.Key] = kvp.Value;
            }

            // Temporarily swap state to predicted state
            var originalState = component.State;
            var originalVNode = component.CurrentVNode;

            // Create a temporary state copy for rendering
            foreach (var kvp in predictedState)
            {
                component.State[kvp.Key] = kvp.Value;
            }

            // Render with predicted state
            var predictedVNode = VNode.Normalize(component.RenderComponent());

            // Compute patches from current state to predicted state
            var patches = RustBridge.Reconcile(originalVNode, predictedVNode);

            // Restore original state (don't actually change component state)
            foreach (var kvp in originalState)
            {
                component.State[kvp.Key] = kvp.Value;
            }

            // Generate unique hint ID
            var hintId = $"prediction_{componentId}_{Guid.NewGuid().ToString().Substring(0, 8)}";

            // Send hint to client for caching
            if (patches.Count > 0)
            {
                await Clients.Client(Context.ConnectionId).SendAsync("QueueHint", new
                {
                    componentId = componentId,
                    hintId = hintId,
                    patches = patches,
                    confidence = 0.85, // Default confidence for predictions
                    predictedState = predictedState
                });

                Console.WriteLine($"[Minimact] Hint '{hintId}' queued: {patches.Count} patches");
            }
            else
            {
                Console.WriteLine($"[Minimact] Hint '{hintId}': No patches needed (already in predicted state)");
            }
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", $"Error generating prediction: {ex.Message}");
            Console.Error.WriteLine($"[Minimact] Prediction error: {ex}");
        }
    }

    // ==================== HOT RELOAD METHODS ====================

    /// <summary>
    /// Handle client request to re-render component (naive fallback for hot reload)
    /// Called when client can't find a prediction cache match
    /// </summary>
    public async Task RequestRerender(string componentId, string code)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            await Clients.Caller.SendAsync("HotReload:Error", new
            {
                type = "error",
                error = $"Component {componentId} not found",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });
            return;
        }

        try
        {
            var startTime = Stopwatch.GetTimestamp();

            // Trigger component re-render
            // In future: Hot-swap the Render method from the new code
            // For now: Just use existing render method
            component.TriggerRender();

            var elapsed = Stopwatch.GetElapsedTime(startTime);

            // Notify client that re-render is complete
            await Clients.Caller.SendAsync("HotReload:RerenderComplete", new
            {
                type = "rerender-complete",
                componentId,
                latency = elapsed.TotalMilliseconds,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });

            Console.WriteLine($"[Minimact HMR] Server re-render: {componentId} in {elapsed.TotalMilliseconds:F1}ms");
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("HotReload:Error", new
            {
                type = "error",
                error = ex.Message,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });
            Console.Error.WriteLine($"[Minimact HMR] Re-render error: {ex}");
        }
    }

    /// <summary>
    /// Verify TSX changes in background (optional - for future validation)
    /// </summary>
    public async Task VerifyTsx(string componentId, string code)
    {
        // For future: Compile code and verify it matches client prediction
        // For now: Just acknowledge
        Console.WriteLine($"[Minimact HMR] Verification requested for {componentId} (not implemented yet)");
        await Task.CompletedTask;
    }

    // ============================================================

    /// <summary>
    /// Called when client connects
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Called when client disconnects
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Clean up components associated with this connection
        _registry.CleanupConnection(Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
