namespace Minimact.Testing.Models;

/// <summary>
/// Represents a bounding box for DOM elements
/// Used for intersection observer simulation (Minimact Punch)
/// </summary>
public class Rect
{
    public double Top { get; set; }
    public double Left { get; set; }
    public double Right { get; set; }
    public double Bottom { get; set; }

    public double Width => Right - Left;
    public double Height => Bottom - Top;

    /// <summary>
    /// Check if this rect intersects with another rect
    /// </summary>
    public bool Intersects(Rect other)
    {
        return !(Right < other.Left ||
                 Left > other.Right ||
                 Bottom < other.Top ||
                 Top > other.Bottom);
    }

    /// <summary>
    /// Calculate intersection rectangle
    /// </summary>
    public Rect? Intersect(Rect other)
    {
        if (!Intersects(other))
            return null;

        return new Rect
        {
            Left = Math.Max(Left, other.Left),
            Top = Math.Max(Top, other.Top),
            Right = Math.Min(Right, other.Right),
            Bottom = Math.Min(Bottom, other.Bottom)
        };
    }

    public override string ToString() =>
        $"Rect({Left}, {Top}, {Right}, {Bottom}) [{Width}x{Height}]";
}
