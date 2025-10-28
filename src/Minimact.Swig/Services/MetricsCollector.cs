using Minimact.Swig.Models.InstrumentationProtocol;

namespace Minimact.Swig.Services;

/// <summary>
/// Collects and aggregates performance metrics from target apps
/// </summary>
public class MetricsCollector
{
    private readonly ILogger<MetricsCollector> _logger;
    private readonly List<ComponentRendered> _renderHistory = new();
    private readonly List<StateChanged> _stateHistory = new();
    private readonly List<HintMatched> _cacheHits = new();
    private readonly List<HintMissed> _cacheMisses = new();
    private readonly List<ErrorOccurred> _errors = new();
    private readonly object _lock = new();

    public MetricsCollector(ILogger<MetricsCollector> logger)
    {
        _logger = logger;
    }

    // ============================================================
    // Record Events
    // ============================================================

    public void RecordRender(ComponentRendered data)
    {
        lock (_lock)
        {
            _renderHistory.Add(data);

            // Keep only last 1000 renders to prevent memory issues
            if (_renderHistory.Count > 1000)
            {
                _renderHistory.RemoveAt(0);
            }
        }
    }

    public void RecordStateChange(StateChanged data)
    {
        lock (_lock)
        {
            _stateHistory.Add(data);

            if (_stateHistory.Count > 1000)
            {
                _stateHistory.RemoveAt(0);
            }
        }
    }

    public void RecordCacheHit(HintMatched data)
    {
        lock (_lock)
        {
            _cacheHits.Add(data);

            if (_cacheHits.Count > 1000)
            {
                _cacheHits.RemoveAt(0);
            }
        }
    }

    public void RecordCacheMiss(HintMissed data)
    {
        lock (_lock)
        {
            _cacheMisses.Add(data);

            if (_cacheMisses.Count > 1000)
            {
                _cacheMisses.RemoveAt(0);
            }
        }
    }

    public void RecordError(ErrorOccurred data)
    {
        lock (_lock)
        {
            _errors.Add(data);

            if (_errors.Count > 1000)
            {
                _errors.RemoveAt(0);
            }
        }

        _logger.LogError($"Error in component {data.ComponentId}: {data.ErrorMessage}");
    }

    public void RecordMetric(PerformanceMetricEvent data)
    {
        _logger.LogInformation($"Metric: {data.MetricName} = {data.Value} {data.Unit}");
    }

    // ============================================================
    // Aggregated Statistics
    // ============================================================

    public PerformanceStats GetPerformanceStats()
    {
        lock (_lock)
        {
            var renders = _renderHistory.ToList();
            var cacheHits = _cacheHits.ToList();
            var cacheMisses = _cacheMisses.ToList();

            var totalRenders = renders.Count;
            var avgRenderTime = totalRenders > 0
                ? renders.Average(r => r.DurationMs)
                : 0;

            var totalHints = cacheHits.Count + cacheMisses.Count;
            var cacheHitRate = totalHints > 0
                ? (double)cacheHits.Count / totalHints * 100
                : 0;

            return new PerformanceStats
            {
                TotalRenders = totalRenders,
                AvgRenderTimeMs = avgRenderTime,
                CacheHitRate = cacheHitRate,
                TotalErrors = _errors.Count,
                RenderHistory = renders
                    .OrderByDescending(r => r.Timestamp)
                    .Take(50)
                    .Select(r => new RenderHistoryPoint
                    {
                        Time = r.Timestamp,
                        DurationMs = r.DurationMs,
                        ComponentId = r.ComponentId
                    })
                    .ToList()
            };
        }
    }

    public List<ErrorOccurred> GetRecentErrors(int count = 10)
    {
        lock (_lock)
        {
            return _errors
                .OrderByDescending(e => e.Timestamp)
                .Take(count)
                .ToList();
        }
    }

    public Dictionary<string, int> GetComponentRenderCounts()
    {
        lock (_lock)
        {
            return _renderHistory
                .GroupBy(r => r.ComponentType)
                .ToDictionary(g => g.Key, g => g.Count());
        }
    }

    public void Clear()
    {
        lock (_lock)
        {
            _renderHistory.Clear();
            _stateHistory.Clear();
            _cacheHits.Clear();
            _cacheMisses.Clear();
            _errors.Clear();
        }

        _logger.LogInformation("Metrics cleared");
    }
}

/// <summary>
/// Aggregated performance statistics
/// </summary>
public class PerformanceStats
{
    public int TotalRenders { get; set; }
    public double AvgRenderTimeMs { get; set; }
    public double CacheHitRate { get; set; }
    public int TotalErrors { get; set; }
    public List<RenderHistoryPoint> RenderHistory { get; set; } = new();
}

/// <summary>
/// Single point in render history
/// </summary>
public class RenderHistoryPoint
{
    public DateTime Time { get; set; }
    public double DurationMs { get; set; }
    public string ComponentId { get; set; } = string.Empty;
}
