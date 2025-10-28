namespace Minimact.Swig.Models.InstrumentationProtocol;

/// <summary>
/// Generic performance metric event
/// </summary>
public class PerformanceMetricEvent
{
    public string MetricName { get; set; } = string.Empty;
    public double Value { get; set; }
    public string Unit { get; set; } = "ms"; // "ms", "count", "ratio", "bytes"
    public Dictionary<string, object?> Tags { get; set; } = new();
    public DateTime Timestamp { get; set; }
}
