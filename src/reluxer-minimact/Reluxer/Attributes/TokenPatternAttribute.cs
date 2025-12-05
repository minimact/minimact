namespace Reluxer.Attributes;

/// <summary>
/// Marks a method as a token pattern visitor.
/// The framework will invoke this method when the token stream matches the pattern.
///
/// Pattern syntax:
///   \k  - keyword
///   \i  - identifier
///   \s  - string literal
///   \n  - number literal
///   \o  - operator
///   \p  - punctuation
///   .   - any token
///
/// Quantifiers:
///   *   - zero or more
///   +   - one or more
///   ?   - zero or one
///   {n} - exactly n
///   {n,} - n or more
///   {n,m} - between n and m
///
/// Groups and captures:
///   (pattern) - capture group
///   (?:pattern) - non-capturing group
///   [a|b] - alternation (a OR b)
///
/// Literals:
///   "value" - exact token value match
///   \k"const" - keyword with value "const"
/// </summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
public class TokenPatternAttribute : Attribute
{
    /// <summary>
    /// The token pattern to match
    /// </summary>
    public string Pattern { get; }

    /// <summary>
    /// Optional name for this pattern (used in diagnostics and Traverse lookup)
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Priority for pattern matching (higher = matched first)
    /// </summary>
    public int Priority { get; set; } = 0;

    /// <summary>
    /// If true, this pattern consumes matched tokens (they won't be matched by other patterns)
    /// </summary>
    public bool Consumes { get; set; } = true;

    /// <summary>
    /// Restricts this visitor to only be callable via Traverse() from specific visitor methods.
    /// Use nameof() to specify allowed callers.
    ///
    /// Example:
    ///   [TokenPattern(@"\i", From = nameof(VisitFunction))]
    ///   [TokenPattern(@"\i", From = new[] { nameof(VisitFunction), nameof(VisitClass) })]
    ///
    /// If null or empty, the visitor can be called from anywhere.
    /// </summary>
    public string[]? From { get; set; }

    /// <summary>
    /// Convenience property for single-source restriction.
    /// Sets From to a single-element array.
    /// </summary>
    public string? FromSingle
    {
        get => From?.Length == 1 ? From[0] : null;
        set => From = value != null ? new[] { value } : null;
    }

    public TokenPatternAttribute(string pattern)
    {
        Pattern = pattern;
    }
}
