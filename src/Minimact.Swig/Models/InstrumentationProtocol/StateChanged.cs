namespace Minimact.Swig.Models.InstrumentationProtocol;

/// <summary>
/// Sent when component state changes on the client
/// </summary>
public class StateChanged
{
    public string ComponentId { get; set; } = string.Empty;
    public string StateKey { get; set; } = string.Empty;
    public object? OldValue { get; set; }
    public object? NewValue { get; set; }
    public DateTime Timestamp { get; set; }
}
