namespace Minimact.Swig.Models.InstrumentationProtocol;

/// <summary>
/// Sent when an error occurs in the target app
/// </summary>
public class ErrorOccurred
{
    public string ComponentId { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    public string StackTrace { get; set; } = string.Empty;
    public string ErrorType { get; set; } = "Unknown"; // "Render", "State", "SignalR", "InfiniteLoop", "Unknown"
    public DateTime Timestamp { get; set; }
}
