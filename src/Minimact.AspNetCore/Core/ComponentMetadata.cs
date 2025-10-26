using System.Collections.Generic;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Metadata about a component for use by the Rust predictor.
/// Contains compile-time extracted templates and patterns.
/// </summary>
public class ComponentMetadata
{
    /// <summary>
    /// Loop templates extracted by Babel plugin from .map() expressions.
    /// Key: State variable name (e.g., "todos")
    /// Value: JSON-serialized loop template
    /// </summary>
    public Dictionary<string, string> LoopTemplates { get; set; } = new();

    /// <summary>
    /// Component ID for tracking
    /// </summary>
    public string ComponentId { get; set; } = string.Empty;

    /// <summary>
    /// Component class name
    /// </summary>
    public string ComponentName { get; set; } = string.Empty;
}
