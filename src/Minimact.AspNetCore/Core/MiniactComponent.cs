using Microsoft.AspNetCore.SignalR;
using Minimact.AspNetCore.SignalR;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Base class for all Minimact components
/// Generated components inherit from this class
/// </summary>
public abstract class MinimactComponent
{
    /// <summary>
    /// Unique identifier for this component instance
    /// </summary>
    public string ComponentId { get; protected set; }

    /// <summary>
    /// SignalR connection ID for real-time updates
    /// </summary>
    public string? ConnectionId { get; internal set; }

    /// <summary>
    /// Internal state dictionary
    /// </summary>
    internal Dictionary<string, object> State { get; }

    /// <summary>
    /// Previous state snapshot for diff comparison
    /// </summary>
    internal Dictionary<string, object> PreviousState { get; set; }

    /// <summary>
    /// Current rendered VNode tree
    /// </summary>
    internal VNode? CurrentVNode { get; set; }

    /// <summary>
    /// Hub context for sending updates to client
    /// </summary>
    internal IHubContext<MinimactHub>? HubContext { get; set; }

    protected MinimactComponent()
    {
        ComponentId = Guid.NewGuid().ToString();
        State = new Dictionary<string, object>();
        PreviousState = new Dictionary<string, object>();
    }

    /// <summary>
    /// Main render method - must be implemented by derived components
    /// </summary>
    protected abstract VNode Render();

    /// <summary>
    /// Public method to trigger rendering (for testing and framework use)
    /// </summary>
    public VNode RenderComponent()
    {
        return Render();
    }

    /// <summary>
    /// Update state and trigger re-render
    /// </summary>
    protected void SetState(string key, object value)
    {
        // Store previous value
        if (State.ContainsKey(key))
        {
            PreviousState[key] = State[key];
        }

        // Update state
        State[key] = value;

        // Sync state back to fields
        StateManager.SyncStateToMembers(this);

        // Trigger render cycle
        TriggerRender();
    }

    /// <summary>
    /// Get current state value
    /// </summary>
    protected T? GetState<T>(string key)
    {
        if (State.TryGetValue(key, out var value))
        {
            return (T)value;
        }
        return default;
    }

    /// <summary>
    /// Get current state value (non-generic)
    /// </summary>
    protected object? GetState(string key)
    {
        return State.TryGetValue(key, out var value) ? value : null;
    }

    /// <summary>
    /// Trigger a re-render cycle
    /// </summary>
    protected void TriggerRender()
    {
        // Render new VNode tree
        var newVNode = Render();

        // If we have a previous tree, compute patches
        if (CurrentVNode != null && HubContext != null && ConnectionId != null)
        {
            // Get changed state keys
            var changedKeys = State.Keys
                .Where(k => !PreviousState.ContainsKey(k) || !Equals(State[k], PreviousState[k]))
                .ToArray();

            // Call lifecycle hook
            OnStateChanged(changedKeys);

            // TODO: Call RustBridge to compute patches
            // For now, send full HTML (will be optimized later)
            var html = newVNode.ToHtml();
            _ = HubContext.Clients.Client(ConnectionId).SendAsync("UpdateComponent", ComponentId, html);
        }

        // Update current tree
        CurrentVNode = newVNode;

        // Reset previous state
        PreviousState = new Dictionary<string, object>(State);
    }

    /// <summary>
    /// Initialize component state and perform async setup
    /// Called once when component is first created
    /// </summary>
    public virtual Task OnInitializedAsync()
    {
        return Task.CompletedTask;
    }

    /// <summary>
    /// Called after state changes, before patches are sent
    /// </summary>
    /// <param name="changedKeys">Keys of state properties that changed</param>
    public virtual void OnStateChanged(string[] changedKeys)
    {
        // Override in derived components for custom logic
    }

    /// <summary>
    /// Called after component is first mounted on the client
    /// </summary>
    public virtual void OnComponentMounted()
    {
        // Override in derived components for custom logic
    }

    /// <summary>
    /// Called before component is unmounted from the client
    /// </summary>
    public virtual void OnComponentUnmounted()
    {
        // Override in derived components for cleanup
    }

    /// <summary>
    /// Initialize and render component for the first time
    /// </summary>
    internal async Task<VNode> InitializeAndRenderAsync()
    {
        await OnInitializedAsync();
        CurrentVNode = Render();
        return CurrentVNode;
    }

    /// <summary>
    /// Force a re-render without state change
    /// </summary>
    protected void ForceUpdate()
    {
        TriggerRender();
    }
}
