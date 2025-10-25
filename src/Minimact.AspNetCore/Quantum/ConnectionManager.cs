using System.Collections.Concurrent;

namespace Minimact.AspNetCore.Quantum;

/// <summary>
/// Manages mapping between ClientId and SignalR ConnectionId
/// Thread-safe for concurrent access
/// </summary>
public class ConnectionManager
{
    private readonly ConcurrentDictionary<string, string> _clientToConnection = new();
    private readonly ConcurrentDictionary<string, string> _connectionToClient = new();

    /// <summary>
    /// Register a client connection
    /// </summary>
    /// <param name="clientId">Application-level client ID</param>
    /// <param name="connectionId">SignalR connection ID</param>
    public void RegisterConnection(string clientId, string connectionId)
    {
        _clientToConnection[clientId] = connectionId;
        _connectionToClient[connectionId] = clientId;

        Console.WriteLine($"[ConnectionManager] ✅ Registered: {clientId} → {connectionId}");
    }

    /// <summary>
    /// Get SignalR connection ID for a client ID
    /// </summary>
    /// <param name="clientId">Application-level client ID</param>
    /// <returns>Connection ID or null if not found</returns>
    public string? GetConnectionId(string clientId)
    {
        return _clientToConnection.TryGetValue(clientId, out var connectionId)
            ? connectionId
            : null;
    }

    /// <summary>
    /// Get client ID for a SignalR connection ID
    /// </summary>
    /// <param name="connectionId">SignalR connection ID</param>
    /// <returns>Client ID or null if not found</returns>
    public string? GetClientId(string connectionId)
    {
        return _connectionToClient.TryGetValue(connectionId, out var clientId)
            ? clientId
            : null;
    }

    /// <summary>
    /// Remove a connection (called on disconnect)
    /// </summary>
    /// <param name="connectionId">SignalR connection ID</param>
    public void RemoveConnection(string connectionId)
    {
        if (_connectionToClient.TryRemove(connectionId, out var clientId))
        {
            _clientToConnection.TryRemove(clientId, out _);
            Console.WriteLine($"[ConnectionManager] ❌ Removed: {clientId} → {connectionId}");
        }
    }

    /// <summary>
    /// Check if client is currently connected
    /// </summary>
    /// <param name="clientId">Application-level client ID</param>
    /// <returns>True if connected</returns>
    public bool IsConnected(string clientId)
    {
        return _clientToConnection.ContainsKey(clientId);
    }

    /// <summary>
    /// Get all currently connected client IDs
    /// </summary>
    /// <returns>List of client IDs</returns>
    public List<string> GetConnectedClients()
    {
        return _clientToConnection.Keys.ToList();
    }

    /// <summary>
    /// Get connection statistics
    /// </summary>
    /// <returns>Connection stats</returns>
    public ConnectionStats GetStats()
    {
        return new ConnectionStats
        {
            TotalConnections = _clientToConnection.Count,
            ConnectedClients = GetConnectedClients()
        };
    }
}

/// <summary>
/// Connection statistics
/// </summary>
public class ConnectionStats
{
    public int TotalConnections { get; set; }
    public List<string> ConnectedClients { get; set; } = new();
}
