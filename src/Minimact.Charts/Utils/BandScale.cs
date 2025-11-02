namespace Minimact.Charts.Utils;

/// <summary>
/// Band scale for categorical data (e.g., bar chart categories).
/// Divides a visual range into equal bands for each category.
/// </summary>
public class BandScale
{
    private readonly string[] _categories;
    private readonly int _rangeStart;
    private readonly int _rangeEnd;
    private readonly int _bandwidth;
    private readonly int _padding;
    private readonly Dictionary<string, int> _categoryIndex;

    /// <summary>
    /// Create a band scale
    /// </summary>
    /// <param name="categories">Array of category names</param>
    /// <param name="rangeStart">Start of visual range (pixels)</param>
    /// <param name="rangeEnd">End of visual range (pixels)</param>
    /// <param name="paddingInner">Padding between bands (0.0 to 1.0)</param>
    public BandScale(string[] categories, int rangeStart, int rangeEnd, double paddingInner = 0.1)
    {
        if (categories == null || categories.Length == 0)
        {
            throw new ArgumentException("Categories cannot be null or empty", nameof(categories));
        }

        _categories = categories;
        _rangeStart = rangeStart;
        _rangeEnd = rangeEnd;

        // Build category index for O(1) lookup
        _categoryIndex = new Dictionary<string, int>();
        for (int i = 0; i < categories.Length; i++)
        {
            _categoryIndex[categories[i]] = i;
        }

        // Calculate bandwidth and padding
        var totalWidth = rangeEnd - rangeStart;
        var paddingCount = categories.Length - 1;
        var totalPaddingWidth = (int)(totalWidth * paddingInner);
        var singlePaddingWidth = paddingCount > 0 ? totalPaddingWidth / paddingCount : 0;

        _padding = singlePaddingWidth;
        _bandwidth = (totalWidth - (singlePaddingWidth * paddingCount)) / categories.Length;
    }

    /// <summary>
    /// Scale a category to its position
    /// </summary>
    /// <param name="category">Category name</param>
    /// <returns>Position in range space (pixels)</returns>
    /// <exception cref="ArgumentException">Thrown if category not found</exception>
    public int Scale(string category)
    {
        if (!_categoryIndex.TryGetValue(category, out var index))
        {
            throw new ArgumentException($"Category '{category}' not found in scale", nameof(category));
        }

        return _rangeStart + (index * (_bandwidth + _padding));
    }

    /// <summary>
    /// Get the center position of a band
    /// </summary>
    /// <param name="category">Category name</param>
    /// <returns>Center position (pixels)</returns>
    public int ScaleCenter(string category)
    {
        return Scale(category) + (_bandwidth / 2);
    }

    /// <summary>
    /// Try to scale a category (safe version that doesn't throw)
    /// </summary>
    /// <param name="category">Category name</param>
    /// <param name="position">Output position</param>
    /// <returns>True if category found, false otherwise</returns>
    public bool TryScale(string category, out int position)
    {
        if (_categoryIndex.TryGetValue(category, out var index))
        {
            position = _rangeStart + (index * (_bandwidth + _padding));
            return true;
        }

        position = 0;
        return false;
    }

    /// <summary>
    /// Width of each band (pixels)
    /// </summary>
    public int Bandwidth => _bandwidth;

    /// <summary>
    /// Padding between bands (pixels)
    /// </summary>
    public int Padding => _padding;

    /// <summary>
    /// All categories in the scale
    /// </summary>
    public string[] Categories => _categories;

    /// <summary>
    /// Number of categories
    /// </summary>
    public int Count => _categories.Length;

    /// <summary>
    /// Range start position (pixels)
    /// </summary>
    public int RangeStart => _rangeStart;

    /// <summary>
    /// Range end position (pixels)
    /// </summary>
    public int RangeEnd => _rangeEnd;
}
