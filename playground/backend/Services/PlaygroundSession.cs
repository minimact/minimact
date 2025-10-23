using Minimact.AspNetCore.Core;

namespace Minimact.Playground.Services;

/// <summary>
/// Represents a single playground session where user can compile and interact with a component
/// </summary>
public class PlaygroundSession : IDisposable
{
    /// <summary>Unique identifier for this session</summary>
    public required string SessionId { get; set; }

    /// <summary>The instantiated component</summary>
    public required MinimactComponent Component { get; set; }

    /// <summary>Current virtual DOM state</summary>
    public required object CurrentVNode { get; set; }

    /// <summary>Predictor instance with learned patterns</summary>
    public required RustBridge.Predictor Predictor { get; set; }

    /// <summary>Metrics for this session</summary>
    public required SessionMetrics Metrics { get; set; }

    /// <summary>Last time this session was accessed (for cleanup)</summary>
    public DateTime LastAccessTime { get; set; } = DateTime.UtcNow;

    /// <summary>Original C# code that was compiled</summary>
    public string? OriginalCSharpCode { get; set; }

    private bool _disposed = false;

    /// <summary>Update last access time</summary>
    public void Touch()
    {
        LastAccessTime = DateTime.UtcNow;
    }

    /// <summary>Check if session has expired (30 minute timeout)</summary>
    public bool IsExpired => DateTime.UtcNow - LastAccessTime > TimeSpan.FromMinutes(30);

    /// <summary>Dispose resources (especially Predictor)</summary>
    public void Dispose()
    {
        if (_disposed) return;

        try
        {
            Predictor?.Dispose();
        }
        catch { /* Ignore dispose errors */ }

        _disposed = true;
        GC.SuppressFinalize(this);
    }

    /// <summary>Finalizer as backup</summary>
    ~PlaygroundSession()
    {
        Dispose();
    }
}

/// <summary>
/// Tracks metrics for a playground session
/// </summary>
public class SessionMetrics
{
    private readonly List<InteractionMetric> _interactions = new();

    /// <summary>Record an interaction</summary>
    public void RecordInteraction(Models.InteractionMetric metric)
    {
        _interactions.Add(metric);
    }

    /// <summary>Generate metrics response</summary>
    public Models.MetricsResponse GetResponse()
    {
        if (_interactions.Count == 0)
        {
            return new Models.MetricsResponse
            {
                TotalInteractions = 0,
                CacheHits = 0,
                HitRate = 0,
                AvgPredictedLatency = 0,
                AvgComputedLatency = 0,
                RecentInteractions = new()
            };
        }

        var cacheHits = _interactions.Count(x => x.CacheHit);
        var hitRate = (cacheHits * 100f) / _interactions.Count;

        var predictedLatencies = _interactions
            .Where(x => x.CacheHit)
            .Select(x => x.LatencyMs)
            .ToList();

        var computedLatencies = _interactions
            .Where(x => !x.CacheHit)
            .Select(x => x.LatencyMs)
            .ToList();

        return new Models.MetricsResponse
        {
            TotalInteractions = _interactions.Count,
            CacheHits = cacheHits,
            HitRate = hitRate,
            AvgPredictedLatency = predictedLatencies.Any() ? predictedLatencies.Average() : 0,
            AvgComputedLatency = computedLatencies.Any() ? computedLatencies.Average() : 0,
            RecentInteractions = _interactions.TakeLast(20).ToList()
        };
    }
}

/// <summary>
/// Manages active playground sessions
/// </summary>
public class SessionManager
{
    private readonly Dictionary<string, PlaygroundSession> _sessions = new();
    private readonly object _lock = new object();
    private readonly ILogger<SessionManager> _logger;

    public SessionManager(ILogger<SessionManager> logger)
    {
        _logger = logger;
    }

    /// <summary>Add a new session</summary>
    public void AddSession(PlaygroundSession session)
    {
        lock (_lock)
        {
            _sessions[session.SessionId] = session;
            _logger.LogInformation("Session created: {SessionId}", session.SessionId);
        }
    }

    /// <summary>Get a session by ID</summary>
    public PlaygroundSession? GetSession(string sessionId)
    {
        lock (_lock)
        {
            if (_sessions.TryGetValue(sessionId, out var session))
            {
                session.Touch();
                return session;
            }
        }
        return null;
    }

    /// <summary>Remove a session</summary>
    public void RemoveSession(string sessionId)
    {
        lock (_lock)
        {
            if (_sessions.TryGetValue(sessionId, out var session))
            {
                try
                {
                    session.Dispose();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error disposing session {SessionId}", sessionId);
                }
                _sessions.Remove(sessionId);
                _logger.LogInformation("Session removed: {SessionId}", sessionId);
            }
        }
    }

    /// <summary>Clean up expired sessions (run periodically)</summary>
    public int CleanupExpiredSessions()
    {
        lock (_lock)
        {
            var expired = _sessions
                .Where(x => x.Value.IsExpired)
                .Select(x => x.Key)
                .ToList();

            foreach (var sessionId in expired)
            {
                if (_sessions.TryGetValue(sessionId, out var session))
                {
                    try
                    {
                        session.Dispose();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Error disposing expired session {SessionId}", sessionId);
                    }
                }
                _sessions.Remove(sessionId);
                _logger.LogInformation("Session cleaned up (expired): {SessionId}", sessionId);
            }

            return expired.Count;
        }
    }

    /// <summary>Get session count (for monitoring)</summary>
    public int GetSessionCount()
    {
        lock (_lock)
        {
            return _sessions.Count;
        }
    }
}
