namespace Minimact.CommandCenter.Core;

/// <summary>
/// Common interface for Minimact clients (Mock and Real)
/// Allows Rangers to test against both mock and real runtimes
/// </summary>
public interface IMinimactClient : IDisposable
{
    /// <summary>
    /// Connect to MinimactHub
    /// </summary>
    Task ConnectAsync(string hubUrl);

    /// <summary>
    /// Disconnect from MinimactHub
    /// </summary>
    Task DisconnectAsync();

    /// <summary>
    /// Initialize a component
    /// </summary>
    IComponentContext InitializeComponent(string componentId, string elementId);

    /// <summary>
    /// Get component context by ID
    /// </summary>
    IComponentContext? GetComponent(string componentId);

    /// <summary>
    /// Get connection state
    /// </summary>
    string ConnectionState { get; }

    /// <summary>
    /// Get DOM (either MockDOM or RealDOM)
    /// </summary>
    object DOM { get; }
}

/// <summary>
/// Common interface for component contexts
/// </summary>
public interface IComponentContext
{
    string ComponentId { get; }
    object Element { get; }
    Dictionary<string, object> State { get; }
}
