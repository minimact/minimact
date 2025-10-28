namespace Minimact.Swig.Models.InstrumentationProtocol;

/// <summary>
/// Sent when no prediction exists for a state change (cache miss)
/// </summary>
public class HintMissed
{
    public string ComponentId { get; set; } = string.Empty;
    public Dictionary<string, object?> StateChanges { get; set; } = new();
    public DateTime Timestamp { get; set; }
}
