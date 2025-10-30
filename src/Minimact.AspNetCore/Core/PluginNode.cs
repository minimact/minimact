using System.Text.Json;

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
    {
        PluginName = pluginName;
        State = state;
    }

    public override string ToHtml()
    {
        // Plugins will be rendered by the PluginManager
        // This returns a placeholder that will be replaced during rendering
        return $"<div data-plugin=\"{PluginName}\" data-plugin-state='{JsonSerializer.Serialize(State)}'></div>";
    }

    public override int EstimateSize()
    {
        // Estimate size as: tag + attributes + serialized state
        var stateJson = JsonSerializer.Serialize(State);
        return 100 + PluginName.Length + stateJson.Length;
    }

    public override string ToString()
    {
        return $"PluginNode(name: {PluginName}, state: {State?.GetType().Name ?? "null"})";
    }
}
