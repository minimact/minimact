using Minimact.AspNetCore.Core;
using Microsoft.Extensions.Logging;

namespace Minimact.AspNetCore.Services;

/// <summary>
/// Helper service for pushing server-side state updates to client components
/// Works with both MVC and SPA architectures
///
/// Use this from:
/// - Hosted services (IHostedService)
/// - Background tasks (BackgroundService)
/// - SignalR hubs
/// - Controller actions
/// - Any service with DI access
///
/// Example:
/// <code>
/// public class ProcessMonitorService : BackgroundService
/// {
///     private readonly ComponentStateUpdater _stateUpdater;
///
///     protected override async Task ExecuteAsync(CancellationToken stoppingToken)
///     {
///         while (!stoppingToken.IsCancellationRequested)
///         {
///             var status = MonitorProcess();
///
///             // Broadcast to all components
///             _stateUpdater.BroadcastStateUpdate("systemStatus", status);
///
///             await Task.Delay(1000, stoppingToken);
///         }
///     }
/// }
/// </code>
/// </summary>
public class ComponentStateUpdater
{
    private readonly ComponentRegistry _registry;
    private readonly ILogger<ComponentStateUpdater> _logger;

    public ComponentStateUpdater(
        ComponentRegistry registry,
        ILogger<ComponentStateUpdater> logger)
    {
        _registry = registry;
        _logger = logger;
    }

    /// <summary>
    /// Update a single component's state and trigger re-render
    /// Works for both MVC and SPA components
    /// </summary>
    /// <param name="componentId">The component instance ID (e.g., "dashboard-abc123")</param>
    /// <param name="stateKey">The state key to update (e.g., "processStatus")</param>
    /// <param name="value">The new value</param>
    public void UpdateComponentState(string componentId, string stateKey, object value)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            _logger.LogWarning($"Component {componentId} not found. Cannot update state.");
            return;
        }

        // Check if component has an active connection
        if (component.ConnectionId == null || component.PatchSender == null)
        {
            _logger.LogWarning($"Component {componentId} has no active connection. State update skipped.");
            return;
        }

        try
        {
            _logger.LogDebug($"Updating {componentId}.{stateKey} = {value}");

            // Update state (keeps server in sync)
            component.SetStateFromClient(stateKey, value);

            // Trigger re-render
            // This works for both MVC and SPA because:
            // 1. Component re-renders with new state
            // 2. Rust reconciler diffs old vs new VNode
            // 3. Patches generated automatically
            // 4. PatchSender sends patches via SignalR (MVC or SPA doesn't matter)
            // 5. Client applies patches to DOM
            component.TriggerRender();

            _logger.LogDebug($"Successfully updated {componentId}.{stateKey}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to update {componentId}.{stateKey}");
        }
    }

    /// <summary>
    /// Update multiple state keys on a single component
    /// </summary>
    /// <param name="componentId">The component instance ID</param>
    /// <param name="stateUpdates">Dictionary of state key-value pairs to update</param>
    public void UpdateComponentState(string componentId, Dictionary<string, object> stateUpdates)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            _logger.LogWarning($"Component {componentId} not found. Cannot update state.");
            return;
        }

        if (component.ConnectionId == null || component.PatchSender == null)
        {
            _logger.LogWarning($"Component {componentId} has no active connection. State update skipped.");
            return;
        }

        try
        {
            _logger.LogDebug($"Updating {componentId} with {stateUpdates.Count} state changes");

            // Update all state keys
            foreach (var kvp in stateUpdates)
            {
                component.SetStateFromClient(kvp.Key, kvp.Value);
            }

            // Trigger single re-render (more efficient than multiple renders)
            component.TriggerRender();

            _logger.LogDebug($"Successfully updated {componentId} with {stateUpdates.Count} changes");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to update {componentId}");
        }
    }

    /// <summary>
    /// Broadcast state update to all connected components
    /// Useful for system-wide notifications
    /// </summary>
    /// <param name="stateKey">The state key to update on all components</param>
    /// <param name="value">The new value</param>
    /// <returns>Number of components updated</returns>
    public int BroadcastStateUpdate(string stateKey, object value)
    {
        var componentIds = _registry.GetAllComponentIds().ToList();
        var updatedCount = 0;

        _logger.LogInformation($"Broadcasting {stateKey} = {value} to {componentIds.Count} component(s)");

        foreach (var componentId in componentIds)
        {
            var component = _registry.GetComponent(componentId);

            // Skip components without active connections
            if (component == null || component.ConnectionId == null || component.PatchSender == null)
            {
                continue;
            }

            try
            {
                component.SetStateFromClient(stateKey, value);
                component.TriggerRender();
                updatedCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to broadcast to {componentId}");
            }
        }

        _logger.LogInformation($"Broadcast complete: {updatedCount}/{componentIds.Count} component(s) updated");

        return updatedCount;
    }

    /// <summary>
    /// Update components matching a type predicate
    /// Example: Update all Dashboard components
    /// </summary>
    /// <param name="componentTypeName">The component type name (e.g., "AdminDashboard", "ProductList")</param>
    /// <param name="stateKey">The state key to update</param>
    /// <param name="value">The new value</param>
    /// <returns>Number of components updated</returns>
    public int UpdateComponentsOfType(string componentTypeName, string stateKey, object value)
    {
        return UpdateWhere(
            c => c.ComponentTypeName == componentTypeName,
            stateKey,
            value
        );
    }

    /// <summary>
    /// Update components matching a custom predicate
    /// </summary>
    /// <param name="predicate">Function to test each component</param>
    /// <param name="stateKey">The state key to update</param>
    /// <param name="value">The new value</param>
    /// <returns>Number of components updated</returns>
    public int UpdateWhere(Predicate<MinimactComponent> predicate, string stateKey, object value)
    {
        var componentIds = _registry.GetAllComponentIds().ToList();
        var updatedCount = 0;

        foreach (var componentId in componentIds)
        {
            var component = _registry.GetComponent(componentId);

            if (component == null || component.ConnectionId == null || component.PatchSender == null)
            {
                continue;
            }

            if (predicate(component))
            {
                try
                {
                    component.SetStateFromClient(stateKey, value);
                    component.TriggerRender();
                    updatedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Failed to update {componentId}");
                }
            }
        }

        _logger.LogInformation($"Updated {updatedCount} component(s) matching predicate");

        return updatedCount;
    }

    /// <summary>
    /// Update components matching a custom predicate with multiple state changes
    /// </summary>
    /// <param name="predicate">Function to test each component</param>
    /// <param name="stateUpdates">Dictionary of state key-value pairs to update</param>
    /// <returns>Number of components updated</returns>
    public int UpdateWhere(Predicate<MinimactComponent> predicate, Dictionary<string, object> stateUpdates)
    {
        var componentIds = _registry.GetAllComponentIds().ToList();
        var updatedCount = 0;

        foreach (var componentId in componentIds)
        {
            var component = _registry.GetComponent(componentId);

            if (component == null || component.ConnectionId == null || component.PatchSender == null)
            {
                continue;
            }

            if (predicate(component))
            {
                try
                {
                    foreach (var kvp in stateUpdates)
                    {
                        component.SetStateFromClient(kvp.Key, kvp.Value);
                    }

                    component.TriggerRender();
                    updatedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Failed to update {componentId}");
                }
            }
        }

        _logger.LogInformation($"Updated {updatedCount} component(s) matching predicate with {stateUpdates.Count} changes");

        return updatedCount;
    }

    /// <summary>
    /// Get all component IDs currently registered
    /// Useful for debugging or monitoring
    /// </summary>
    public IEnumerable<string> GetAllComponentIds()
    {
        return _registry.GetAllComponentIds();
    }

    /// <summary>
    /// Get all components of a specific type
    /// </summary>
    public IEnumerable<MinimactComponent> GetComponentsOfType(string componentTypeName)
    {
        return _registry.GetAllComponentIds()
            .Select(id => _registry.GetComponent(id))
            .Where(c => c != null && c.ComponentTypeName == componentTypeName)!;
    }

    /// <summary>
    /// Check if a component is connected and ready for updates
    /// </summary>
    public bool IsComponentConnected(string componentId)
    {
        var component = _registry.GetComponent(componentId);
        return component != null &&
               component.ConnectionId != null &&
               component.PatchSender != null;
    }
}
