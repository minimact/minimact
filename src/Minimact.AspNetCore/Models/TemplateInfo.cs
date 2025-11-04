using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Minimact.AspNetCore.Models;

/// <summary>
/// Template metadata extracted by Babel plugin.
/// Represents a single template (text or attribute) with its bindings and metadata.
/// </summary>
public class TemplateInfo
{
    /// <summary>
    /// Template string with {0}, {1}, etc. placeholders
    /// Example: "Count: {0}" or "btn-{0}"
    /// </summary>
    [JsonPropertyName("template")]
    public string Template { get; set; } = string.Empty;

    /// <summary>
    /// State variable names that fill the template slots
    /// Example: ["count"] or ["size", "variant"]
    /// </summary>
    [JsonPropertyName("bindings")]
    public List<string> Bindings { get; set; } = new();

    /// <summary>
    /// Character positions where {0}, {1}, etc. appear in the template
    /// Used for efficient template materialization
    /// </summary>
    [JsonPropertyName("slots")]
    public List<int> Slots { get; set; } = new();

    /// <summary>
    /// Path in the VNode tree where this template applies
    /// Example: [0, 1, 0] for div > span > text
    /// </summary>
    [JsonPropertyName("path")]
    public List<int> Path { get; set; } = new();

    /// <summary>
    /// Template type determines patch generation:
    /// - "static" or "dynamic" → UpdateTextTemplate
    /// - "attribute-static" → UpdateAttributeStatic
    /// - "attribute-dynamic" → UpdateAttributeDynamic
    /// - "conditional" → UpdateTextTemplate with conditionalTemplates
    /// - "transform" → UpdateTextTemplate with transform metadata
    /// </summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Attribute name for attribute templates (className, style, etc.)
    /// Only present when type is "attribute-static" or "attribute-dynamic"
    /// </summary>
    [JsonPropertyName("attribute")]
    public string? Attribute { get; set; }

    /// <summary>
    /// Conditional templates for ternary expressions
    /// Maps condition values to template strings
    /// Example: { "true": "Active", "false": "Inactive" }
    /// </summary>
    [JsonPropertyName("conditionalTemplates")]
    public Dictionary<string, string>? ConditionalTemplates { get; set; }

    /// <summary>
    /// Transform metadata for method calls like .toFixed(2)
    /// </summary>
    [JsonPropertyName("transform")]
    public TransformInfo? Transform { get; set; }

    /// <summary>
    /// Whether the binding uses optional chaining (e.g., obj?.prop)
    /// </summary>
    [JsonPropertyName("nullable")]
    public bool? Nullable { get; set; }

    /// <summary>
    /// Check if this is an attribute template
    /// </summary>
    public bool IsAttributeTemplate() =>
        Type == "attribute-static" || Type == "attribute-dynamic";

    /// <summary>
    /// Check if this is a text template
    /// </summary>
    public bool IsTextTemplate() =>
        Type == "static" || Type == "dynamic" || Type == "conditional" || Type == "transform";
}

/// <summary>
/// Transform metadata for method calls
/// Example: price.toFixed(2) → { Method: "toFixed", Args: [2] }
/// </summary>
public class TransformInfo
{
    /// <summary>
    /// Transform method name (toFixed, toUpperCase, etc.)
    /// </summary>
    [JsonPropertyName("method")]
    public string Method { get; set; } = string.Empty;

    /// <summary>
    /// Transform arguments
    /// Example: [2] for toFixed(2)
    /// </summary>
    [JsonPropertyName("args")]
    public List<object> Args { get; set; } = new();
}
