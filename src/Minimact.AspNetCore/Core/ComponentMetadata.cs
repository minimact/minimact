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
    /// Expression templates extracted by Babel plugin (Phase 6).
    /// Contains metadata about computed values like toFixed(), arithmetic, etc.
    /// Value: JSON-serialized array of expression template metadata
    /// </summary>
    public string? ExpressionTemplates { get; set; }

    /// <summary>
    /// Component ID for tracking
    /// </summary>
    public string ComponentId { get; set; } = string.Empty;

    /// <summary>
    /// Component class name
    /// </summary>
    public string ComponentName { get; set; } = string.Empty;

    /// <summary>
    /// StateX projections extracted by Babel plugin from useStateX() calls.
    /// Contains transform functions, target selectors, and conditional logic.
    /// Used for pre-computing projected patches with 100% coverage.
    /// </summary>
    public List<Models.StateXProjectionInfo> StateXProjections { get; set; } = new();

    /// <summary>
    /// Templates extracted by Babel plugin from JSX (text and attributes).
    /// Key: Hex-based template path (e.g., "10000000.10000000" or "10000000.20000000.@style")
    /// Value: Template metadata (template string, bindings, type, etc.)
    /// Used for predictive rendering with 100% coverage.
    /// Hex paths allow insertions without renumbering existing elements.
    /// </summary>
    public Dictionary<string, Models.TemplateInfo>? Templates { get; set; }
}
