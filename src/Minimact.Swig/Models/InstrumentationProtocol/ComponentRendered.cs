namespace Minimact.Swig.Models.InstrumentationProtocol;

/// <summary>
/// Sent when a component finishes rendering on the server
/// </summary>
public class ComponentRendered
{
    public string ComponentId { get; set; } = string.Empty;
    public string ComponentType { get; set; } = string.Empty;
    public object? VNode { get; set; } // Simplified VNode snapshot
    public List<object> Patches { get; set; } = new();
    public double DurationMs { get; set; }
    public DateTime Timestamp { get; set; }
}
