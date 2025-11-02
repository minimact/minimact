namespace Minimact.Charts.Components;

/// <summary>
/// Y-axis configuration
/// </summary>
public class YAxisConfig
{
    /// <summary>
    /// Data key to use for Y-axis values (maps to DataPoint.Value by default)
    /// </summary>
    public string? DataKey { get; set; }

    /// <summary>
    /// Axis label
    /// </summary>
    public string? Label { get; set; }

    /// <summary>
    /// Custom domain (min, max). If null, auto-calculated from data.
    /// </summary>
    public (double min, double max)? Domain { get; set; }

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
    /// Number of ticks to generate
    /// </summary>
    public int TickCount { get; set; } = 5;

    /// <summary>
    /// Use "nice" rounded tick values (e.g., 0, 25, 50, 75, 100)
    /// </summary>
    public bool UseNiceTicks { get; set; } = true;

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
