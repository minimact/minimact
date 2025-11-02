using Minimact.Charts.Components;

namespace Minimact.Charts.Models;

/// <summary>
/// State model for bar chart
/// </summary>
public class BarChartState : ChartStateBase
{
    /// <summary>
    /// Chart data points
    /// </summary>
    public List<DataPoint> Data { get; set; } = new();

    /// <summary>
    /// Bar fill color (default: #8884d8)
    /// </summary>
    public string? BarFill { get; set; }

    /// <summary>
    /// Bar stroke color
    /// </summary>
    public string? BarStroke { get; set; }

    /// <summary>
    /// Bar stroke width (pixels)
    /// </summary>
    public int BarStrokeWidth { get; set; } = 0;

    /// <summary>
    /// Bar width multiplier (0.0 to 1.0, relative to available space)
    /// </summary>
    public double BarWidthRatio { get; set; } = 0.8;

    /// <summary>
    /// X-axis configuration
    /// </summary>
    public XAxisConfig? XAxis { get; set; }

    /// <summary>
    /// Y-axis configuration
    /// </summary>
    public YAxisConfig? YAxis { get; set; }

    /// <summary>
    /// Show grid lines
    /// </summary>
    public bool ShowGrid { get; set; } = false;

    /// <summary>
    /// Grid line color
    /// </summary>
    public string GridColor { get; set; } = "#e0e0e0";

    /// <summary>
    /// Grid line stroke width
    /// </summary>
    public int GridStrokeWidth { get; set; } = 1;
}
