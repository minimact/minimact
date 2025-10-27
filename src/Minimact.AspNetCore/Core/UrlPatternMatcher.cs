using System.Text.RegularExpressions;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Matches URLs against glob patterns for URL-scoped contexts
/// Supports patterns like:
/// - /dashboard/* (single segment wildcard)
/// - /api/** (multi-segment wildcard)
/// - /products/:category/:id (named parameters)
/// </summary>
public static class UrlPatternMatcher
{
    /// <summary>
    /// Check if a URL matches a glob pattern
    /// </summary>
    /// <param name="pattern">Glob pattern (e.g., /dashboard/*, /api/**)</param>
    /// <param name="url">URL to test</param>
    /// <returns>True if URL matches pattern</returns>
    public static bool Matches(string pattern, string url)
    {
        if (string.IsNullOrEmpty(pattern) || string.IsNullOrEmpty(url))
            return false;

        var regex = GlobToRegex(pattern);
        return Regex.IsMatch(url, regex, RegexOptions.IgnoreCase);
    }

    /// <summary>
    /// Convert glob pattern to regular expression
    /// </summary>
    /// <param name="pattern">Glob pattern with *, **, or :param</param>
    /// <returns>Regular expression pattern</returns>
    private static string GlobToRegex(string pattern)
    {
        // Escape special regex characters (except * and :)
        var escaped = Regex.Escape(pattern);

        // Replace escaped glob patterns
        var regex = escaped
            .Replace(@"\*\*", ".*")              // ** = match any characters (including /)
            .Replace(@"\*", "[^/]+")             // * = match any characters except /
            .Replace(@"\:", ":");                // Unescape : for param matching

        // Replace :param patterns with capture groups
        regex = Regex.Replace(regex, @":([a-zA-Z][a-zA-Z0-9_]*)", "[^/]+");

        return $"^{regex}$";
    }

    /// <summary>
    /// Extract named parameters from URL based on pattern
    /// </summary>
    /// <param name="pattern">Pattern with :param placeholders (e.g., /products/:category/:id)</param>
    /// <param name="url">Actual URL (e.g., /products/electronics/123)</param>
    /// <returns>Dictionary of parameter names to values</returns>
    public static Dictionary<string, string> ExtractParams(string pattern, string url)
    {
        var result = new Dictionary<string, string>();

        if (string.IsNullOrEmpty(pattern) || string.IsNullOrEmpty(url))
            return result;

        // Find all :param patterns
        var paramRegex = new Regex(@":([a-zA-Z][a-zA-Z0-9_]*)");
        var matches = paramRegex.Matches(pattern);

        if (matches.Count == 0)
            return result;

        // Build regex to capture param values
        var capturePattern = Regex.Escape(pattern);

        // Replace :param with named capture groups
        foreach (Match match in matches)
        {
            var paramName = match.Groups[1].Value;
            capturePattern = capturePattern.Replace($@"\:{paramName}", $"(?<{paramName}>[^/]+)");
        }

        var captureRegex = new Regex($"^{capturePattern}$", RegexOptions.IgnoreCase);
        var urlMatch = captureRegex.Match(url);

        if (urlMatch.Success)
        {
            foreach (Match match in matches)
            {
                var paramName = match.Groups[1].Value;
                if (urlMatch.Groups[paramName].Success)
                {
                    result[paramName] = urlMatch.Groups[paramName].Value;
                }
            }
        }

        return result;
    }

    /// <summary>
    /// Get all patterns that match a given URL
    /// Useful for finding which URL-scoped contexts apply to the current request
    /// </summary>
    /// <param name="patterns">List of patterns to check</param>
    /// <param name="url">URL to match against</param>
    /// <returns>List of matching patterns</returns>
    public static List<string> GetMatchingPatterns(IEnumerable<string> patterns, string url)
    {
        return patterns.Where(pattern => Matches(pattern, url)).ToList();
    }
}
