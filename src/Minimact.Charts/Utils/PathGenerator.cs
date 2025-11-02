using System.Text;

namespace Minimact.Charts.Utils;

/// <summary>
/// SVG path generation utilities for charts
/// </summary>
public static class PathGenerator
{
    /// <summary>
    /// Generate SVG path for line chart
    /// </summary>
    /// <param name="points">Array of (x, y) coordinates</param>
    /// <returns>SVG path string (e.g., "M 0 100 L 50 80 L 100 90")</returns>
    public static string LinePath(IEnumerable<(int x, int y)> points)
    {
        var sb = new StringBuilder();
        var first = true;

        foreach (var (x, y) in points)
        {
            sb.Append(first ? $"M {x} {y}" : $" L {x} {y}");
            first = false;
        }

        return sb.ToString();
    }

    /// <summary>
    /// Generate SVG path for line chart with smooth curves
    /// </summary>
    /// <param name="points">Array of (x, y) coordinates</param>
    /// <param name="tension">Curve tension (0.0 = straight lines, 1.0 = very smooth)</param>
    /// <returns>SVG path string using cubic Bezier curves</returns>
    public static string SmoothLinePath(IEnumerable<(int x, int y)> points, double tension = 0.3)
    {
        var pointsList = points.ToList();
        if (pointsList.Count < 2)
        {
            return string.Empty;
        }

        var sb = new StringBuilder();
        sb.Append($"M {pointsList[0].x} {pointsList[0].y}");

        if (pointsList.Count == 2)
        {
            sb.Append($" L {pointsList[1].x} {pointsList[1].y}");
            return sb.ToString();
        }

        // Generate smooth curve using Catmull-Rom to Bezier conversion
        for (int i = 0; i < pointsList.Count - 1; i++)
        {
            var p0 = i > 0 ? pointsList[i - 1] : pointsList[i];
            var p1 = pointsList[i];
            var p2 = pointsList[i + 1];
            var p3 = i < pointsList.Count - 2 ? pointsList[i + 2] : p2;

            // Convert Catmull-Rom to cubic Bezier
            var cp1x = p1.x + (p2.x - p0.x) * tension / 6.0;
            var cp1y = p1.y + (p2.y - p0.y) * tension / 6.0;
            var cp2x = p2.x - (p3.x - p1.x) * tension / 6.0;
            var cp2y = p2.y - (p3.y - p1.y) * tension / 6.0;

            sb.Append($" C {cp1x:F1} {cp1y:F1}, {cp2x:F1} {cp2y:F1}, {p2.x} {p2.y}");
        }

        return sb.ToString();
    }

    /// <summary>
    /// Generate SVG path for area chart
    /// </summary>
    /// <param name="points">Array of (x, y) coordinates for the top line</param>
    /// <param name="baselineY">Y coordinate of the baseline</param>
    /// <returns>SVG path string forming a closed area</returns>
    public static string AreaPath(IEnumerable<(int x, int y)> points, int baselineY)
    {
        var pointsList = points.ToList();
        if (pointsList.Count == 0)
        {
            return string.Empty;
        }

        var sb = new StringBuilder();

        // Top line (left to right)
        sb.Append($"M {pointsList[0].x} {baselineY}");
        foreach (var (x, y) in pointsList)
        {
            sb.Append($" L {x} {y}");
        }

        // Bottom line (right to left) back to start
        sb.Append($" L {pointsList[^1].x} {baselineY}");
        sb.Append(" Z"); // Close path

        return sb.ToString();
    }

    /// <summary>
    /// Generate SVG path for smooth area chart
    /// </summary>
    /// <param name="points">Array of (x, y) coordinates for the top line</param>
    /// <param name="baselineY">Y coordinate of the baseline</param>
    /// <param name="tension">Curve tension (0.0 to 1.0)</param>
    /// <returns>SVG path string forming a closed area with smooth curves</returns>
    public static string SmoothAreaPath(IEnumerable<(int x, int y)> points, int baselineY, double tension = 0.3)
    {
        var pointsList = points.ToList();
        if (pointsList.Count == 0)
        {
            return string.Empty;
        }

        var sb = new StringBuilder();

        // Start at baseline
        sb.Append($"M {pointsList[0].x} {baselineY}");
        sb.Append($" L {pointsList[0].x} {pointsList[0].y}");

        if (pointsList.Count > 2)
        {
            // Smooth top line
            for (int i = 0; i < pointsList.Count - 1; i++)
            {
                var p0 = i > 0 ? pointsList[i - 1] : pointsList[i];
                var p1 = pointsList[i];
                var p2 = pointsList[i + 1];
                var p3 = i < pointsList.Count - 2 ? pointsList[i + 2] : p2;

                var cp1x = p1.x + (p2.x - p0.x) * tension / 6.0;
                var cp1y = p1.y + (p2.y - p0.y) * tension / 6.0;
                var cp2x = p2.x - (p3.x - p1.x) * tension / 6.0;
                var cp2y = p2.y - (p3.y - p1.y) * tension / 6.0;

                sb.Append($" C {cp1x:F1} {cp1y:F1}, {cp2x:F1} {cp2y:F1}, {p2.x} {p2.y}");
            }
        }
        else if (pointsList.Count == 2)
        {
            sb.Append($" L {pointsList[1].x} {pointsList[1].y}");
        }

        // Close the area back to baseline
        sb.Append($" L {pointsList[^1].x} {baselineY}");
        sb.Append(" Z");

        return sb.ToString();
    }

    /// <summary>
    /// Generate SVG path for pie slice
    /// </summary>
    /// <param name="cx">Center X coordinate</param>
    /// <param name="cy">Center Y coordinate</param>
    /// <param name="radius">Outer radius</param>
    /// <param name="startAngle">Start angle in radians</param>
    /// <param name="endAngle">End angle in radians</param>
    /// <returns>SVG path string for pie slice</returns>
    public static string PieSlicePath(int cx, int cy, int radius, double startAngle, double endAngle)
    {
        var x1 = cx + (int)(radius * Math.Cos(startAngle));
        var y1 = cy + (int)(radius * Math.Sin(startAngle));
        var x2 = cx + (int)(radius * Math.Cos(endAngle));
        var y2 = cy + (int)(radius * Math.Sin(endAngle));

        var largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;

        return $"M {cx} {cy} L {x1} {y1} A {radius} {radius} 0 {largeArc} 1 {x2} {y2} Z";
    }

    /// <summary>
    /// Generate SVG path for donut slice (pie with inner radius)
    /// </summary>
    /// <param name="cx">Center X coordinate</param>
    /// <param name="cy">Center Y coordinate</param>
    /// <param name="innerRadius">Inner radius</param>
    /// <param name="outerRadius">Outer radius</param>
    /// <param name="startAngle">Start angle in radians</param>
    /// <param name="endAngle">End angle in radians</param>
    /// <returns>SVG path string for donut slice</returns>
    public static string DonutSlicePath(int cx, int cy, int innerRadius, int outerRadius, double startAngle, double endAngle)
    {
        // Outer arc points
        var x1Outer = cx + (int)(outerRadius * Math.Cos(startAngle));
        var y1Outer = cy + (int)(outerRadius * Math.Sin(startAngle));
        var x2Outer = cx + (int)(outerRadius * Math.Cos(endAngle));
        var y2Outer = cy + (int)(outerRadius * Math.Sin(endAngle));

        // Inner arc points
        var x1Inner = cx + (int)(innerRadius * Math.Cos(endAngle));
        var y1Inner = cy + (int)(innerRadius * Math.Sin(endAngle));
        var x2Inner = cx + (int)(innerRadius * Math.Cos(startAngle));
        var y2Inner = cy + (int)(innerRadius * Math.Sin(startAngle));

        var largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;

        return $"M {x1Outer} {y1Outer} " +
               $"A {outerRadius} {outerRadius} 0 {largeArc} 1 {x2Outer} {y2Outer} " +
               $"L {x1Inner} {y1Inner} " +
               $"A {innerRadius} {innerRadius} 0 {largeArc} 0 {x2Inner} {y2Inner} " +
               $"Z";
    }

    /// <summary>
    /// Calculate angle in radians from percentage (0-100)
    /// </summary>
    /// <param name="percentage">Percentage (0 to 100)</param>
    /// <param name="startAngle">Start angle offset in radians (default: -π/2 for top)</param>
    /// <returns>Angle in radians</returns>
    public static double PercentageToRadians(double percentage, double startAngle = -Math.PI / 2)
    {
        return startAngle + (percentage / 100.0 * 2 * Math.PI);
    }

    /// <summary>
    /// Calculate position on circle
    /// </summary>
    /// <param name="cx">Center X</param>
    /// <param name="cy">Center Y</param>
    /// <param name="radius">Radius</param>
    /// <param name="angle">Angle in radians</param>
    /// <returns>Point on circle</returns>
    public static (int x, int y) PointOnCircle(int cx, int cy, int radius, double angle)
    {
        return (
            cx + (int)(radius * Math.Cos(angle)),
            cy + (int)(radius * Math.Sin(angle))
        );
    }
}
