using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;

namespace Minimact.AspNetCore.Quantum;

/// <summary>
/// Registry for tracking quantum entanglements across clients
/// Thread-safe for concurrent access
/// </summary>
public class EntanglementRegistry
{
    private readonly ConcurrentDictionary<string, EntanglementBinding> _bindings = new();
    private readonly ConcurrentDictionary<string, ClientState> _clientStates = new();

    /// <summary>
    /// Register a new entanglement binding
    /// </summary>
    public void RegisterBinding(EntanglementBinding binding)
    {
        _bindings[binding.EntanglementId] = binding;
    }

    /// <summary>
    /// Get entanglement by ID
    /// </summary>
    public EntanglementBinding? GetBinding(string entanglementId)
    {
        return _bindings.TryGetValue(entanglementId, out var binding) ? binding : null;
    }

    /// <summary>
    /// Get all entanglements for a specific client
    /// </summary>
    public List<EntanglementBinding> GetBindingsForClient(string clientId)
    {
        return _bindings.Values
            .Where(b => b.SourceClient == clientId || b.TargetClient == clientId || b.TargetClient == "*")
            .Where(b => b.Active)
            .ToList();
    }

    /// <summary>
    /// Get target clients for an entanglement
    /// Resolves wildcards and scope restrictions
    /// </summary>
    public List<string> ResolveTargetClients(EntanglementBinding binding)
    {
        var targets = new List<string>();

        if (binding.TargetClient == "*")
        {
            // Broadcast to all clients on same page
            targets = _clientStates.Values
                .Where(c => c.CurrentPage == binding.Page)
                .Where(c => c.ClientId != binding.SourceClient) // Don't send back to source
                .Select(c => c.ClientId)
                .ToList();
        }
        else if (binding.TargetClient.EndsWith("*"))
        {
            // Wildcard prefix match (e.g., "student-*")
            var prefix = binding.TargetClient.TrimEnd('*');
            targets = _clientStates.Values
                .Where(c => c.ClientId.StartsWith(prefix))
                .Where(c => c.CurrentPage == binding.Page)
                .Select(c => c.ClientId)
                .ToList();
        }
        else if (binding.Scope == "team")
        {
            // Same team only
            var sourceClient = _clientStates.Values.FirstOrDefault(c => c.ClientId == binding.SourceClient);
            if (sourceClient != null)
            {
                targets = _clientStates.Values
                    .Where(c => c.TeamId == sourceClient.TeamId)
                    .Where(c => c.CurrentPage == binding.Page)
                    .Where(c => c.ClientId != binding.SourceClient)
                    .Select(c => c.ClientId)
                    .ToList();
            }
        }
        else
        {
            // Specific client
            targets = new List<string> { binding.TargetClient };
        }

        return targets;
    }

    /// <summary>
    /// Unregister an entanglement
    /// </summary>
    public void UnregisterBinding(string entanglementId)
    {
        if (_bindings.TryGetValue(entanglementId, out var binding))
        {
            binding.Active = false;
        }
    }

    /// <summary>
    /// Register client state (for page tracking)
    /// </summary>
    public void RegisterClient(string clientId, string currentPage, string? teamId = null)
    {
        _clientStates[clientId] = new ClientState
        {
            ClientId = clientId,
            CurrentPage = currentPage,
            TeamId = teamId,
            ConnectedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Unregister client (on disconnect)
    /// </summary>
    public void UnregisterClient(string clientId)
    {
        _clientStates.TryRemove(clientId, out _);

        // Deactivate all bindings for this client
        foreach (var binding in _bindings.Values.Where(b => b.SourceClient == clientId || b.TargetClient == clientId))
        {
            binding.Active = false;
        }
    }

    /// <summary>
    /// Get all active bindings (for debugging/monitoring)
    /// </summary>
    public List<EntanglementBinding> GetAllActiveBindings()
    {
        return _bindings.Values.Where(b => b.Active).ToList();
    }

    /// <summary>
    /// Get statistics
    /// </summary>
    public EntanglementStats GetStats()
    {
        return new EntanglementStats
        {
            TotalBindings = _bindings.Count,
            ActiveBindings = _bindings.Values.Count(b => b.Active),
            ConnectedClients = _clientStates.Count,
            BindingsByScope = _bindings.Values
                .Where(b => b.Active)
                .GroupBy(b => b.Scope)
                .ToDictionary(g => g.Key, g => g.Count())
        };
    }
}

/// <summary>
/// Client state for entanglement tracking
/// </summary>
public class ClientState
{
    public string ClientId { get; set; } = string.Empty;
    public string CurrentPage { get; set; } = string.Empty;
    public string? TeamId { get; set; }
    public DateTime ConnectedAt { get; set; }
}

/// <summary>
/// Entanglement statistics
/// </summary>
public class EntanglementStats
{
    public int TotalBindings { get; set; }
    public int ActiveBindings { get; set; }
    public int ConnectedClients { get; set; }
    public Dictionary<string, int> BindingsByScope { get; set; } = new();
}
