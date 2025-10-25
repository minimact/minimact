using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace Minimact.AspNetCore.Quantum;

/// <summary>
/// 🌌 Quantum Hub - SignalR hub for DOM entanglement
///
/// Manages WebWormholes between clients for quantum DOM synchronization
/// </summary>
public class QuantumHub : Hub
{
    private readonly EntanglementRegistry _registry;
    private readonly ConnectionManager _connections;

    public QuantumHub(EntanglementRegistry registry, ConnectionManager connections)
    {
        _registry = registry;
        _connections = connections;
    }

    /// <summary>
    /// Register client when they connect
    /// </summary>
    public async Task RegisterClient(string clientId, string currentPage, string? teamId = null)
    {
        // Map clientId to connectionId
        _connections.RegisterConnection(clientId, Context.ConnectionId);

        // Register in entanglement registry
        _registry.RegisterClient(clientId, currentPage, teamId);

        await Clients.Caller.SendAsync("ClientRegistered", clientId);
    }

    /// <summary>
    /// Register a quantum entanglement between elements
    /// </summary>
    public async Task RegisterQuantumEntanglement(RegisterEntanglementRequest request)
    {
        var entanglementId = $"{request.SourceClient}:{request.Selector}→{request.TargetClient}:{request.Selector}";

        var binding = new EntanglementBinding
        {
            EntanglementId = entanglementId,
            SourceClient = request.SourceClient,
            TargetClient = request.TargetClient,
            Page = request.Page,
            Selector = request.Selector,
            Mode = request.Mode,
            Scope = request.Scope,
            SessionId = request.SessionId // Store session for reconnection
        };

        _registry.RegisterBinding(binding);

        await Clients.All.SendAsync("EntanglementRegistered", binding);

        Console.WriteLine($"[QuantumHub] ✨ Registered entanglement: {entanglementId}");
    }

    /// <summary>
    /// Propagate a quantum mutation to entangled clients
    /// </summary>
    public async Task PropagateQuantumMutation(PropagateQuantumMutationRequest request)
    {
        // Get entanglement binding
        var binding = _registry.GetBinding(request.EntanglementId);
        if (binding == null || !binding.Active)
        {
            await Clients.Caller.SendAsync("Error", "Entanglement not found or inactive");
            return;
        }

        // Resolve target clients
        var targetClients = _registry.ResolveTargetClients(binding);

        if (targetClients.Count == 0)
        {
            // No targets online
            return;
        }

        // Broadcast mutation to all target clients
        foreach (var targetClientId in targetClients)
        {
            var connectionId = GetConnectionId(targetClientId);
            if (connectionId != null)
            {
                await Clients.Client(connectionId).SendAsync("QuantumMutation", new
                {
                    entanglementId = request.EntanglementId,
                    vector = request.Vector,
                    sourceClient = request.SourceClient,
                    timestamp = DateTime.UtcNow
                });
            }
        }

        Console.WriteLine(
            $"[QuantumHub] 🌀 Propagated {request.Vector.Type} mutation " +
            $"from {request.SourceClient} to {targetClients.Count} client(s)"
        );
    }

    /// <summary>
    /// Unregister a quantum entanglement
    /// </summary>
    public async Task UnregisterQuantumEntanglement(UnregisterEntanglementRequest request)
    {
        _registry.UnregisterBinding(request.EntanglementId);
        await Clients.All.SendAsync("EntanglementUnregistered", request.EntanglementId);

        Console.WriteLine($"[QuantumHub] 💔 Unregistered entanglement: {request.EntanglementId}");
    }

    /// <summary>
    /// Get entanglement statistics (for monitoring)
    /// </summary>
    public async Task<EntanglementStats> GetStats()
    {
        return _registry.GetStats();
    }

    /// <summary>
    /// Restore session entanglements after reconnect
    /// </summary>
    public async Task RestoreSession(string sessionId)
    {
        _registry.RestoreSession(sessionId);

        // Send confirmation to caller
        await Clients.Caller.SendAsync("SessionRestored", new
        {
            sessionId,
            bindings = _registry.GetBindingsBySession(sessionId)
        });

        Console.WriteLine($"[QuantumHub] 🔄 Restored session: {sessionId}");
    }

    /// <summary>
    /// Handle client disconnection
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var clientId = _connections.GetClientId(Context.ConnectionId);
        if (clientId != null)
        {
            // Unregister client from registry
            _registry.UnregisterClient(clientId);

            // Remove connection mapping
            _connections.RemoveConnection(Context.ConnectionId);

            Console.WriteLine($"[QuantumHub] 👋 Client disconnected: {clientId}");
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Get SignalR connection ID for a client ID
    /// </summary>
    private string? GetConnectionId(string clientId)
    {
        return _connections.GetConnectionId(clientId);
    }
}

/// <summary>
/// Request to register entanglement
/// </summary>
public class RegisterEntanglementRequest
{
    public string SourceClient { get; set; } = string.Empty;
    public string TargetClient { get; set; } = string.Empty;
    public string Page { get; set; } = string.Empty;
    public string Selector { get; set; } = string.Empty;
    public string Mode { get; set; } = "bidirectional";
    public string Scope { get; set; } = "private";
    public string? SessionId { get; set; }
}

/// <summary>
/// Request to propagate mutation
/// </summary>
public class PropagateQuantumMutationRequest
{
    public string EntanglementId { get; set; } = string.Empty;
    public string SourceClient { get; set; } = string.Empty;
    public MutationVector Vector { get; set; } = new();
}

/// <summary>
/// Request to unregister entanglement
/// </summary>
public class UnregisterEntanglementRequest
{
    public string EntanglementId { get; set; } = string.Empty;
}
