namespace Minimact.Charts.Utils;

/// <summary>
/// Linear scale for continuous numeric data.
/// Maps values from a domain [min, max] to a visual range [start, end].
/// </summary>
public class LinearScale
{
    private readonly double _domainMin;
    private readonly double _domainMax;
    private readonly int _rangeStart;
    private readonly int _rangeEnd;

    /// <summary>
    /// Create a linear scale
    /// </summary>
    /// <param name="domainMin">Minimum value in data domain</param>
    /// <param name="domainMax">Maximum value in data domain</param>
    /// <param name="rangeStart">Start of visual range (pixels)</param>
    /// <param name="rangeEnd">End of visual range (pixels)</param>
    public LinearScale(double domainMin, double domainMax, int rangeStart, int rangeEnd)
    {
        _domainMin = domainMin;
        _domainMax = domainMax;
        _rangeStart = rangeStart;
        _rangeEnd = rangeEnd;
    }

    /// <summary>
    /// Scale a value from domain to range using linear interpolation
    /// </summary>
    /// <param name="value">Value in domain space</param>
    /// <returns>Position in range space (pixels)</returns>
    public int Scale(double value)
    {
        if (_domainMax == _domainMin)
        {
            // Avoid division by zero
            return _rangeStart;
        }

        var ratio = (value - _domainMin) / (_domainMax - _domainMin);
        return (int)(_rangeStart + ratio * (_rangeEnd - _rangeStart));
    }

    /// <summary>
    /// Generate evenly-spaced tick values across the domain
    /// </summary>
    /// <param name="count">Number of ticks to generate</param>
    /// <returns>Array of tick values</returns>
    public double[] GetTicks(int count = 5)
    {
        if (count <= 1)
        {
            return new[] { _domainMin };
        }

        var step = (_domainMax - _domainMin) / (count - 1);
        return Enumerable.Range(0, count)
            .Select(i => _domainMin + (i * step))
            .ToArray();
    }

    /// <summary>
    /// Get nice rounded tick values (e.g., 0, 25, 50, 75, 100)
    /// </summary>
    /// <param name="count">Approximate number of ticks</param>
    /// <returns>Array of nice tick values</returns>
    public double[] GetNiceTicks(int count = 5)
    {
        var range = _domainMax - _domainMin;
        if (range == 0) return new[] { _domainMin };

        var roughStep = range / (count - 1);
        var magnitude = Math.Pow(10, Math.Floor(Math.Log10(roughStep)));
        var residual = roughStep / magnitude;

        // Choose nice step values: 1, 2, 5, or 10
        double niceStep;
        if (residual > 5)
            niceStep = 10 * magnitude;
        else if (residual > 2)
            niceStep = 5 * magnitude;
        else if (residual > 1)
            niceStep = 2 * magnitude;
        else
            niceStep = magnitude;

        var niceMin = Math.Floor(_domainMin / niceStep) * niceStep;
        var niceMax = Math.Ceiling(_domainMax / niceStep) * niceStep;

        var ticks = new List<double>();
        for (var tick = niceMin; tick <= niceMax; tick += niceStep)
        {
            ticks.Add(tick);
        }

        return ticks.ToArray();
    }

    /// <summary>
    /// Domain minimum value
    /// </summary>
    public double DomainMin => _domainMin;

    /// <summary>
    /// Domain maximum value
    /// </summary>
    public double DomainMax => _domainMax;

    /// <summary>
    /// Range start position (pixels)
    /// </summary>
    public int RangeStart => _rangeStart;

    /// <summary>
    /// Range end position (pixels)
    /// </summary>
    public int RangeEnd => _rangeEnd;
}
