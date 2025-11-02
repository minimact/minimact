namespace Minimact.Charts.Utils;

/// <summary>
/// Main entry point for chart calculations.
/// Provides convenient methods to create scales and calculate chart dimensions.
/// </summary>
public class ChartCalculator
{
    private readonly int _width;
    private readonly int _height;
    private readonly ChartMargin _margin;

    /// <summary>
    /// Create a chart calculator
    /// </summary>
    /// <param name="width">Total chart width (pixels)</param>
    /// <param name="height">Total chart height (pixels)</param>
    /// <param name="margin">Chart margins</param>
    public ChartCalculator(int width, int height, ChartMargin margin)
    {
        _width = width;
        _height = height;
        _margin = margin;
    }

    /// <summary>
    /// Create a linear scale for numeric data
    /// </summary>
    /// <param name="domainMin">Minimum value in data</param>
    /// <param name="domainMax">Maximum value in data</param>
    /// <param name="rangeStart">Start position (pixels)</param>
    /// <param name="rangeEnd">End position (pixels)</param>
    /// <returns>LinearScale instance</returns>
    public LinearScale CreateLinearScale(double domainMin, double domainMax, int rangeStart, int rangeEnd)
    {
        return new LinearScale(domainMin, domainMax, rangeStart, rangeEnd);
    }

    /// <summary>
    /// Create a band scale for categorical data
    /// </summary>
    /// <param name="categories">Array of category names</param>
    /// <param name="rangeStart">Start position (pixels)</param>
    /// <param name="rangeEnd">End position (pixels)</param>
    /// <param name="paddingInner">Padding between bands (0.0 to 1.0)</param>
    /// <returns>BandScale instance</returns>
    public BandScale CreateBandScale(string[] categories, int rangeStart, int rangeEnd, double paddingInner = 0.1)
    {
        return new BandScale(categories, rangeStart, rangeEnd, paddingInner);
    }

    /// <summary>
    /// Chart width (pixels)
    /// </summary>
    public int Width => _width;

    /// <summary>
    /// Chart height (pixels)
    /// </summary>
    public int Height => _height;

    /// <summary>
    /// Chart margins
    /// </summary>
    public ChartMargin Margin => _margin;

    /// <summary>
    /// Inner width (width minus left and right margins)
    /// </summary>
    public int InnerWidth => _width - _margin.Left - _margin.Right;

    /// <summary>
    /// Inner height (height minus top and bottom margins)
    /// </summary>
    public int InnerHeight => _height - _margin.Top - _margin.Bottom;
}

/// <summary>
/// Chart margin configuration
/// </summary>
public class ChartMargin
{
    /// <summary>
    /// Top margin (pixels)
    /// </summary>
    public int Top { get; set; }

    /// <summary>
    /// Right margin (pixels)
    /// </summary>
    public int Right { get; set; }

    /// <summary>
    /// Bottom margin (pixels)
    /// </summary>
    public int Bottom { get; set; }

    /// <summary>
    /// Left margin (pixels)
    /// </summary>
    public int Left { get; set; }

    /// <summary>
    /// Create a chart margin
    /// </summary>
    public ChartMargin()
    {
        Top = 20;
        Right = 30;
        Bottom = 40;
        Left = 50;
    }

    /// <summary>
    /// Create a chart margin with specific values
    /// </summary>
    public ChartMargin(int top, int right, int bottom, int left)
    {
        Top = top;
        Right = right;
        Bottom = bottom;
        Left = left;
    }

    /// <summary>
    /// Create a chart margin with uniform padding
    /// </summary>
    public static ChartMargin Uniform(int padding)
    {
        return new ChartMargin(padding, padding, padding, padding);
    }
}
