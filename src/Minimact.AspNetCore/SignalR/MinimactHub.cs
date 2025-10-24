using Microsoft.AspNetCore.SignalR;
using Minimact.AspNetCore.Core;

namespace Minimact.AspNetCore.SignalR;

/// <summary>
/// Snapshot of DOM element state from useDomElementState hook
/// </summary>
public class DomElementStateSnapshot
{
    public bool IsIntersecting { get; set; }
    public double IntersectionRatio { get; set; }
    public int ChildrenCount { get; set; }
    public int GrandChildrenCount { get; set; }
    public Dictionary<string, string> Attributes { get; set; } = new();
    public List<string> ClassList { get; set; } = new();
    public bool Exists { get; set; }
    public int Count { get; set; }
}

/// <summary>
/// SignalR Hub for real-time component updates
/// Handles client connections and component interactions
/// </summary>
public class MinimactHub : Hub
{
    private readonly ComponentRegistry _registry;
    private readonly IHubContext<MinimactHub> _hubContext;

    public MinimactHub(ComponentRegistry registry, IHubContext<MinimactHub> hubContext)
    {
        _registry = registry;
        _hubContext = hubContext;
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
            component.HubContext = _hubContext;
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
