namespace Minimact.AspNetCore.Core;

/// <summary>
/// Global registry for reusable useStateX transform functions
/// Provides C# equivalents of common JavaScript transforms
/// Matches the client-side TransformHandler registry
/// </summary>
public static class StateXTransformRegistry
{
    private static readonly Dictionary<string, Func<object, string>> Transforms = new()
    {
        // ============================================================
        // CURRENCY TRANSFORMS
        // ============================================================
        ["currency-usd"] = v => $"${Convert.ToDouble(v):F2}",
        ["currency-eur"] = v => $"€{Convert.ToDouble(v):F2}",
        ["currency-gbp"] = v => $"£{Convert.ToDouble(v):F2}",
        ["currency-jpy"] = v => $"¥{Convert.ToInt32(v):N0}",
        ["currency-cad"] = v => $"CA${Convert.ToDouble(v):F2}",
        ["currency-aud"] = v => $"AU${Convert.ToDouble(v):F2}",

        // ============================================================
        // PERCENTAGE TRANSFORMS
        // ============================================================
        ["percentage"] = v => $"{(Convert.ToDouble(v) * 100):F0}%",
        ["percentage-1"] = v => $"{(Convert.ToDouble(v) * 100):F1}%",
        ["percentage-2"] = v => $"{(Convert.ToDouble(v) * 100):F2}%",

        // ============================================================
        // STRING TRANSFORMS
        // ============================================================
        ["uppercase"] = v => v.ToString()?.ToUpper() ?? "",
        ["lowercase"] = v => v.ToString()?.ToLower() ?? "",
        ["capitalize"] = v =>
        {
            var str = v.ToString() ?? "";
            return str.Length > 0 ? char.ToUpper(str[0]) + str[1..].ToLower() : "";
        },
        ["trim"] = v => v.ToString()?.Trim() ?? "",
        ["title-case"] = v =>
        {
            var str = v.ToString() ?? "";
            return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(str.ToLower());
        },

        // ============================================================
        // NUMBER TRANSFORMS
        // ============================================================
        ["number-0"] = v => Convert.ToDouble(v).ToString("F0"),
        ["number-1"] = v => Convert.ToDouble(v).ToString("F1"),
        ["number-2"] = v => Convert.ToDouble(v).ToString("F2"),
        ["number-comma"] = v => Convert.ToDouble(v).ToString("N0"),
        ["number-comma-2"] = v => Convert.ToDouble(v).ToString("N2"),

        // ============================================================
        // DATE/TIME TRANSFORMS
        // ============================================================
        ["date-short"] = v => Convert.ToDateTime(v).ToShortDateString(),
        ["date-long"] = v => Convert.ToDateTime(v).ToLongDateString(),
        ["date-iso"] = v => Convert.ToDateTime(v).ToString("yyyy-MM-dd"),
        ["time-short"] = v => Convert.ToDateTime(v).ToShortTimeString(),
        ["time-long"] = v => Convert.ToDateTime(v).ToLongTimeString(),
        ["datetime-short"] = v => Convert.ToDateTime(v).ToString("g"),
        ["datetime-long"] = v => Convert.ToDateTime(v).ToString("F"),
        ["date-relative"] = v =>
        {
            var dt = Convert.ToDateTime(v);
            var span = DateTime.Now - dt;

            if (span.TotalDays < 1) return "Today";
            if (span.TotalDays < 2) return "Yesterday";
            if (span.TotalDays < 7) return $"{(int)span.TotalDays} days ago";
            if (span.TotalDays < 30) return $"{(int)(span.TotalDays / 7)} weeks ago";
            if (span.TotalDays < 365) return $"{(int)(span.TotalDays / 30)} months ago";
            return $"{(int)(span.TotalDays / 365)} years ago";
        },

        // ============================================================
        // BOOLEAN TRANSFORMS
        // ============================================================
        ["yes-no"] = v => Convert.ToBoolean(v) ? "Yes" : "No",
        ["true-false"] = v => Convert.ToBoolean(v) ? "True" : "False",
        ["on-off"] = v => Convert.ToBoolean(v) ? "On" : "Off",
        ["enabled-disabled"] = v => Convert.ToBoolean(v) ? "Enabled" : "Disabled",
        ["active-inactive"] = v => Convert.ToBoolean(v) ? "Active" : "Inactive",
        ["check-x"] = v => Convert.ToBoolean(v) ? "✓" : "✗",
        ["check-empty"] = v => Convert.ToBoolean(v) ? "✓" : "",
        ["check-circle"] = v => Convert.ToBoolean(v) ? "●" : "○",

        // ============================================================
        // ARRAY TRANSFORMS
        // ============================================================
        ["array-length"] = v =>
        {
            if (v is System.Collections.ICollection collection) return collection.Count.ToString();
            if (v is System.Collections.IEnumerable enumerable) return enumerable.Cast<object>().Count().ToString();
            return "0";
        },
        ["array-join"] = v =>
        {
            if (v is System.Collections.IEnumerable enumerable)
                return string.Join(", ", enumerable.Cast<object>());
            return v.ToString() ?? "";
        },
        ["array-count"] = v =>
        {
            if (v is System.Collections.ICollection collection) return $"{collection.Count} items";
            if (v is System.Collections.IEnumerable enumerable) return $"{enumerable.Cast<object>().Count()} items";
            return "0 items";
        },

        // ============================================================
        // FILE SIZE TRANSFORMS
        // ============================================================
        ["filesize-bytes"] = v => $"{Convert.ToInt64(v):N0} bytes",
        ["filesize-auto"] = v =>
        {
            var bytes = Convert.ToInt64(v);
            string[] sizes = { "B", "KB", "MB", "GB", "TB" };
            int order = 0;
            double size = bytes;

            while (size >= 1024 && order < sizes.Length - 1)
            {
                order++;
                size /= 1024;
            }

            return $"{size:F2} {sizes[order]}";
        },

        // ============================================================
        // UTILITY TRANSFORMS
        // ============================================================
        ["json"] = v => System.Text.Json.JsonSerializer.Serialize(v),
        ["truncate-50"] = v =>
        {
            var str = v.ToString() ?? "";
            return str.Length > 50 ? str[..47] + "..." : str;
        },
        ["truncate-100"] = v =>
        {
            var str = v.ToString() ?? "";
            return str.Length > 100 ? str[..97] + "..." : str;
        }
    };

    /// <summary>
    /// Apply a registered transform by ID
    /// </summary>
    /// <param name="transformId">Transform ID (e.g., "currency-usd")</param>
    /// <param name="value">Value to transform</param>
    /// <returns>Transformed string</returns>
    public static string ApplyTransform(string transformId, object value)
    {
        if (Transforms.TryGetValue(transformId, out var transform))
        {
            try
            {
                return transform(value);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Minimact] Transform '{transformId}' failed: {ex.Message}");
                return value.ToString() ?? "";
            }
        }

        Console.WriteLine($"[Minimact] Transform '{transformId}' not found in registry");
        return value.ToString() ?? "";
    }

    /// <summary>
    /// Register a custom transform
    /// </summary>
    /// <param name="transformId">Unique transform ID</param>
    /// <param name="transform">Transform function</param>
    public static void RegisterTransform(string transformId, Func<object, string> transform)
    {
        Transforms[transformId] = transform;
    }

    /// <summary>
    /// Check if a transform is registered
    /// </summary>
    public static bool HasTransform(string transformId)
    {
        return Transforms.ContainsKey(transformId);
    }

    /// <summary>
    /// Get all registered transform IDs
    /// </summary>
    public static IEnumerable<string> GetTransformIds()
    {
        return Transforms.Keys;
    }
}
