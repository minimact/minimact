namespace Minimact.Swig.Models.InstrumentationProtocol;

/// <summary>
/// Sent when a predicted hint matches and cached patches are applied
/// </summary>
public class HintMatched
{
    public string ComponentId { get; set; } = string.Empty;
    public string HintId { get; set; } = string.Empty;
    public Dictionary<string, object?> StateChanges { get; set; } = new();
    public double LatencyMs { get; set; }
    public double Confidence { get; set; }
    public int PatchCount { get; set; }
    public DateTime Timestamp { get; set; }
}
