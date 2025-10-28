namespace Minimact.Swig.Models.InstrumentationProtocol;

/// <summary>
/// Command to trigger a state change in a component
/// </summary>
public class TriggerStateChange
{
    public string ComponentId { get; set; } = string.Empty;
    public string StateKey { get; set; } = string.Empty;
    public object? NewValue { get; set; }
}
