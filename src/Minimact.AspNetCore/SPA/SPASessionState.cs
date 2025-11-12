using System.Collections.Concurrent;
using Minimact.AspNetCore.Core;
using Microsoft.Extensions.Logging;

namespace Minimact.AspNetCore.SPA;

/// <summary>
/// Tracks SPA state per SignalR connection
/// Needed for computing patches during navigation
/// </summary>
public class SPASessionState
{
    private readonly ConcurrentDictionary<string, SessionData> _sessions = new();
    private readonly ILogger<SPASessionState>? _logger;

    public SPASessionState(ILogger<SPASessionState>? logger = null)
    {
        _logger = logger;
    }

    /// <summary>
    /// Set the current shell for a connection
    /// </summary>
    public void SetCurrentShell(string connectionId, string? shellName)
    {
        var session = GetOrCreate(connectionId);
        session.CurrentShell = shellName;
        _logger?.LogDebug($"[SPA] Connection {connectionId} shell set to: {shellName}");
    }

    /// <summary>
    /// Get the current shell for a connection
    /// </summary>
    public string? GetCurrentShell(string connectionId)
    {
        return _sessions.TryGetValue(connectionId, out var session) ? session.CurrentShell : null;
    }

    /// <summary>
    /// Set the current full VNode tree (shell + page) for a connection
    /// </summary>
    public void SetCurrentVNode(string connectionId, VNode vnode)
    {
        var session = GetOrCreate(connectionId);
        session.CurrentVNode = vnode;
        _logger?.LogDebug($"[SPA] Connection {connectionId} VNode updated");
    }

    /// <summary>
    /// Get the current full VNode tree for a connection
    /// </summary>
    public VNode? GetCurrentVNode(string connectionId)
    {
        return _sessions.TryGetValue(connectionId, out var session) ? session.CurrentVNode : null;
    }

    /// <summary>
    /// Set the current page VNode (without shell) for a connection
    /// </summary>
    public void SetCurrentPageVNode(string connectionId, VNode vnode)
    {
        var session = GetOrCreate(connectionId);
        session.CurrentPageVNode = vnode;
        _logger?.LogDebug($"[SPA] Connection {connectionId} page VNode updated");
    }

    /// <summary>
    /// Get the current page VNode for a connection
    /// </summary>
    public VNode? GetCurrentPageVNode(string connectionId)
    {
        return _sessions.TryGetValue(connectionId, out var session) ? session.CurrentPageVNode : null;
    }

    /// <summary>
    /// Set the current page name for a connection
    /// </summary>
    public void SetCurrentPage(string connectionId, string pageName)
    {
        var session = GetOrCreate(connectionId);
        session.CurrentPage = pageName;
        _logger?.LogDebug($"[SPA] Connection {connectionId} page set to: {pageName}");
    }

    /// <summary>
    /// Get the current page name for a connection
    /// </summary>
    public string? GetCurrentPage(string connectionId)
    {
        return _sessions.TryGetValue(connectionId, out var session) ? session.CurrentPage : null;
    }

    /// <summary>
    /// Remove session data when connection is closed
    /// </summary>
    public void RemoveSession(string connectionId)
    {
        if (_sessions.TryRemove(connectionId, out _))
        {
            _logger?.LogDebug($"[SPA] Connection {connectionId} session removed");
        }
    }

    /// <summary>
    /// Get all active connection IDs (for debugging)
    /// </summary>
    public IEnumerable<string> GetActiveConnections()
    {
        return _sessions.Keys;
    }

    /// <summary>
    /// Clear all sessions (for testing)
    /// </summary>
    public void ClearAll()
    {
        _sessions.Clear();
        _logger?.LogDebug("[SPA] All sessions cleared");
    }

    private SessionData GetOrCreate(string connectionId)
    {
        return _sessions.GetOrAdd(connectionId, _ => new SessionData());
    }

    private class SessionData
    {
        public string? CurrentShell { get; set; }
        public string? CurrentPage { get; set; }
        public VNode? CurrentVNode { get; set; }
        public VNode? CurrentPageVNode { get; set; }
    }
}
