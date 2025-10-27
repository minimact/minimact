using System.Collections.Concurrent;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Global registry for active component instances
/// Thread-safe storage for component lookup by ID
/// </summary>
public class ComponentRegistry
{
    private readonly ConcurrentDictionary<string, MinimactComponent> _components = new();
    private readonly ConcurrentDictionary<string, HashSet<string>> _connectionComponents = new();
    private readonly ConcurrentDictionary<string, HashSet<string>> _contextUsage = new();

    /// <summary>
    /// Register a component instance
    /// </summary>
    public void RegisterComponent(MinimactComponent component)
    {
        _components[component.ComponentId] = component;

        if (!string.IsNullOrEmpty(component.ConnectionId))
        {
            var componentIds = _connectionComponents.GetOrAdd(component.ConnectionId, _ => new HashSet<string>());
            lock (componentIds)
            {
                componentIds.Add(component.ComponentId);
            }
        }
    }

    /// <summary>
    /// Get a component by ID
    /// </summary>
    public MinimactComponent? GetComponent(string componentId)
    {
        _components.TryGetValue(componentId, out var component);
        return component;
    }

    /// <summary>
    /// Unregister a component
    /// </summary>
    public void UnregisterComponent(string componentId)
    {
        if (_components.TryRemove(componentId, out var component))
        {
            component.OnComponentUnmounted();

            if (!string.IsNullOrEmpty(component.ConnectionId))
            {
                if (_connectionComponents.TryGetValue(component.ConnectionId, out var componentIds))
                {
                    lock (componentIds)
                    {
                        componentIds.Remove(componentId);
                    }
                }
            }
        }
    }

    /// <summary>
    /// Clean up all components for a disconnected connection
    /// </summary>
    public void CleanupConnection(string connectionId)
    {
        if (_connectionComponents.TryRemove(connectionId, out var componentIds))
        {
            foreach (var componentId in componentIds)
            {
                UnregisterComponent(componentId);
            }
        }
    }

    /// <summary>
    /// Get all active component IDs
    /// </summary>
    public IEnumerable<string> GetAllComponentIds()
    {
        return _components.Keys;
    }

    /// <summary>
    /// Get count of active components
    /// </summary>
    public int Count => _components.Count;

    /// <summary>
    /// Register that a component uses a specific context
    /// </summary>
    /// <param name="componentId">Component ID</param>
    /// <param name="contextKey">Context key being used</param>
    public void RegisterContextUsage(string componentId, string contextKey)
    {
        _contextUsage.AddOrUpdate(
            contextKey,
            _ => new HashSet<string> { componentId },
            (_, existing) =>
            {
                lock (existing)
                {
                    existing.Add(componentId);
                }
                return existing;
            }
        );
    }

    /// <summary>
    /// Get all components that use a specific context
    /// </summary>
    /// <param name="contextKey">Context key</param>
    /// <returns>List of component IDs using this context</returns>
    public IEnumerable<string> GetComponentsUsingContext(string contextKey)
    {
        if (_contextUsage.TryGetValue(contextKey, out var components))
        {
            lock (components)
            {
                return new List<string>(components);
            }
        }

        return Enumerable.Empty<string>();
    }
}
