namespace Minimact.Charts.Components;

/// <summary>
/// X-axis configuration
/// </summary>
public class XAxisConfig
{
    /// <summary>
    /// Data key to use for X-axis values (maps to DataPoint.Category)
    /// </summary>
    public string? DataKey { get; set; }

    /// <summary>
    /// Axis label
    /// </summary>
    public string? Label { get; set; }

    /// <summary>
    /// Show axis line
    /// </summary>
    public bool ShowLine { get; set; } = true;

    /// <summary>
    /// Show tick marks
    /// </summary>
    public bool ShowTicks { get; set; } = true;

    /// <summary>
    /// Show tick labels
    /// </summary>
    public bool ShowTickLabels { get; set; } = true;

    /// <summary>
    /// Tick label font size (pixels)
    /// </summary>
    public int TickLabelFontSize { get; set; } = 12;

    /// <summary>
    /// Tick label color
    /// </summary>
    public string TickLabelColor { get; set; } = "#666";

    /// <summary>
    /// Axis line color
    /// </summary>
    public string LineColor { get; set; } = "#999";

    /// <summary>
    /// Axis line width (pixels)
    /// </summary>
    public int LineWidth { get; set; } = 1;
}
