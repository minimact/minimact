using Minimact.AspNetCore.Core;

namespace Minimact.AspNetCore.Plugins;

/// <summary>
/// Interface that all Minimact plugins must implement
/// </summary>
public interface IMinimactPlugin
{
    /// <summary>
    /// Unique plugin identifier (e.g., "Clock", "Weather", "Chart")
    /// </summary>
    string Name { get; }

    /// <summary>
    /// Plugin version (semver)
    /// </summary>
    string Version { get; }

    /// <summary>
    /// Plugin description
    /// </summary>
    string Description { get; }

    /// <summary>
    /// Plugin author/publisher
    /// </summary>
    string Author { get; }

    /// <summary>
    /// Render the plugin with given state
    /// </summary>
    VNode Render(object state);

    /// <summary>
    /// Validate that the provided state matches the plugin's contract
    /// </summary>
    bool ValidateState(object state);

    /// <summary>
    /// Get plugin assets (CSS, JS, images)
    /// </summary>
    PluginAssets GetAssets();

    /// <summary>
    /// Get JSON schema for state validation
    /// </summary>
    string GetStateSchema();

    /// <summary>
    /// Initialize plugin (called once on startup)
    /// </summary>
    void Initialize(IServiceProvider services);
}
