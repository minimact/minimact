namespace Minimact.AspNetCore.Models;

/// <summary>
/// Metadata about a useStateX projection for a component
/// Used by Template Patch System for pre-computation
/// </summary>
public class StateXProjectionInfo
{
    /// <summary>
    /// State key that this projection applies to (e.g., "stateX_0")
    /// </summary>
    public string StateKey { get; set; } = string.Empty;

    /// <summary>
    /// CSS selector for target element (e.g., ".price-display")
    /// </summary>
    public string Selector { get; set; } = string.Empty;

    /// <summary>
    /// C# lambda expression for transform (if inline)
    /// </summary>
    public string? Transform { get; set; }

    /// <summary>
    /// Transform ID from registry (if using shared transform)
    /// </summary>
    public string? TransformId { get; set; }

    /// <summary>
    /// How to apply the transformed value
    /// </summary>
    public string ApplyAs { get; set; } = "textContent";

    /// <summary>
    /// Property name for attribute/class/style application
    /// </summary>
    public string? Property { get; set; }

    /// <summary>
    /// C# lambda expression for conditional application
    /// </summary>
    public string? ApplyIf { get; set; }

    /// <summary>
    /// Template hint ID for parameterized patches
    /// </summary>
    public string? Template { get; set; }

    /// <summary>
    /// Sync strategy (immediate/debounced/manual)
    /// </summary>
    public string Sync { get; set; } = "immediate";
}
