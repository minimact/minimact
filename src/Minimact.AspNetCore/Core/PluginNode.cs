namespace Minimact.AspNetCore.Core;

/// <summary>
/// VNode representing a plugin instance
/// Used when rendering <Plugin name="..." state={...} /> from TSX
/// </summary>
public class PluginNode : VNode
{
    /// <summary>
    /// Plugin name (e.g., "Clock", "Weather")
    /// </summary>
    public string PluginName { get; }

    /// <summary>
    /// State object passed to the plugin
    /// </summary>
    public object State { get; }

    public PluginNode(string pluginName, object state)
        : base("plugin", new { name = pluginName }, null)
    {
        PluginName = pluginName;
        State = state;
    }

    public override string ToString()
    {
        return $"PluginNode(name: {PluginName}, state: {State?.GetType().Name ?? "null"})";
    }
}
