namespace Minimact.Playground.Models;

/// <summary>
/// Response after compiling a component
/// </summary>
public class CompileResponse
{
    /// <summary>Unique session ID for this playground instance</summary>
    public required string SessionId { get; set; }

    /// <summary>Initial rendered HTML</summary>
    public required string Html { get; set; }

    /// <summary>Virtual DOM representation</summary>
    public required object VNode { get; set; }

    /// <summary>Pre-computed predictions for likely state changes</summary>
    public List<PredictionInfo> Predictions { get; set; } = new();

    /// <summary>Time taken to compile (milliseconds)</summary>
    public long CompilationTimeMs { get; set; }
}

/// <summary>
/// Information about a prediction for a state change
/// </summary>
public class PredictionInfo
{
    /// <summary>Name of the state variable</summary>
    public required string StateKey { get; set; }

    /// <summary>Predicted value after state change</summary>
    public object? PredictedValue { get; set; }

    /// <summary>Confidence level (0-1)</summary>
    public float Confidence { get; set; }
}

/// <summary>
/// Response after user interaction
/// </summary>
public class InteractionResponse
{
    /// <summary>Time taken to handle interaction (milliseconds)</summary>
    public long ElapsedMs { get; set; }

    /// <summary>Whether patches came from cache (true) or recomputed (false)</summary>
    public bool CacheHit { get; set; }

    /// <summary>Human-readable latency string: "3ms 🟢 CACHED" or "18ms 🔴 COMPUTED"</summary>
    public required string Latency { get; set; }

    /// <summary>Patches that should be applied to DOM</summary>
    public required object[] ActualPatches { get; set; }

    /// <summary>Patches that were predicted (null if no prediction was made)</summary>
    public object[]? PredictedPatches { get; set; }

    /// <summary>Prediction confidence (0-1), or 0 if no prediction</summary>
    public float PredictionConfidence { get; set; }

    /// <summary>Updated HTML after applying patches</summary>
    public required string Html { get; set; }
}

/// <summary>
/// Aggregated metrics for a playground session
/// </summary>
public class MetricsResponse
{
    /// <summary>Total number of interactions</summary>
    public int TotalInteractions { get; set; }

    /// <summary>Number of successful cache hits</summary>
    public int CacheHits { get; set; }

    /// <summary>Cache hit rate as percentage (0-100)</summary>
    public float HitRate { get; set; }

    /// <summary>Average latency when prediction hits cache (milliseconds)</summary>
    public double AvgPredictedLatency { get; set; }

    /// <summary>Average latency when prediction misses and recomputes (milliseconds)</summary>
    public double AvgComputedLatency { get; set; }

    /// <summary>Time saved per interaction on average (milliseconds)</summary>
    public double TimesSavedPerInteraction =>
        AvgComputedLatency - AvgPredictedLatency;

    /// <summary>Recent interactions (last 10-20)</summary>
    public List<InteractionMetric> RecentInteractions { get; set; } = new();
}

/// <summary>
/// Single interaction metric
/// </summary>
public class InteractionMetric
{
    /// <summary>When this interaction occurred</summary>
    public DateTime Timestamp { get; set; }

    /// <summary>Type of event: "click", "input", "change"</summary>
    public required string EventType { get; set; }

    /// <summary>Whether prediction was correct</summary>
    public bool CacheHit { get; set; }

    /// <summary>Total latency in milliseconds</summary>
    public long LatencyMs { get; set; }
}

/// <summary>
/// Error response
/// </summary>
public class ErrorResponse
{
    /// <summary>Error message</summary>
    public required string Error { get; set; }

    /// <summary>Detailed error information</summary>
    public string? Details { get; set; }

    /// <summary>Line number where error occurred (if applicable)</summary>
    public int? Line { get; set; }

    /// <summary>Column number where error occurred (if applicable)</summary>
    public int? Column { get; set; }
}
