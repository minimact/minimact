namespace Minimact.Swig.Models.InstrumentationProtocol;

/// <summary>
/// Sent by target app when it connects to Swig
/// </summary>
public class AppStarted
{
    public string AppName { get; set; } = string.Empty;
    public int Port { get; set; }
    public string Version { get; set; } = string.Empty;
    public List<string> Components { get; set; } = new();
    public DateTime Timestamp { get; set; }
}
