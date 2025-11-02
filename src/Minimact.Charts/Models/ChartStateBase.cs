using Minimact.Charts.Utils;

namespace Minimact.Charts.Models;

/// <summary>
/// Base class for all chart state models
/// </summary>
public abstract class ChartStateBase
{
    /// <summary>
    /// Chart width in pixels
    /// </summary>
    public int Width { get; set; } = 600;

    /// <summary>
    /// Chart height in pixels
    /// </summary>
    public int Height { get; set; } = 400;

    /// <summary>
    /// Chart margins (space for axes, labels, etc.)
    /// </summary>
    public ChartMargin Margin { get; set; } = new()
    {
        Top = 20,
        Right = 30,
        Bottom = 40,
        Left = 50
    };

    /// <summary>
    /// Background fill color (default: transparent)
    /// </summary>
    public string? BackgroundFill { get; set; }

    /// <summary>
    /// Chart title
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Custom CSS class for the chart SVG element
    /// </summary>
    public string? ClassName { get; set; }
}
