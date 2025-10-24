using Microsoft.AspNetCore.SignalR;
using Minimact.AspNetCore.Core;

namespace Minimact.AspNetCore.SignalR;

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
