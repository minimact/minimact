namespace Minimact.Charts.Models;

/// <summary>
/// Generic data point for charts
/// </summary>
public class DataPoint
{
    /// <summary>
    /// Category/label for this data point (X-axis value for categorical data)
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Numeric value (Y-axis value)
    /// </summary>
    public double Value { get; set; }

    /// <summary>
    /// Optional custom label for display
    /// </summary>
    public string? Label { get; set; }

    /// <summary>
    /// Optional custom fill color for this specific data point
    /// </summary>
    public string? Fill { get; set; }

    /// <summary>
    /// Optional metadata (for tooltips, custom rendering, etc.)
    /// </summary>
    public Dictionary<string, object>? Metadata { get; set; }
}
