using Reluxer.Tokens;

namespace Reluxer.Matching;

/// <summary>
/// Represents the type of match in MatchAll results.
/// </summary>
public enum TokenMatchType
{
    /// <summary>Unknown or unspecified match type</summary>
    Unknown,
    /// <summary>Element match (e.g., JSX element)</summary>
    Element,
    /// <summary>Expression match (e.g., braced expression)</summary>
    Expression,
    /// <summary>Text match (e.g., JSX text)</summary>
    Text,
    /// <summary>Custom match type</summary>
    Custom
}

/// <summary>
/// Represents a single match result from MatchAll, including which alternative matched.
/// </summary>
public class MatchAllItem
{
    /// <summary>The underlying match result</summary>
    public TokenMatch Match { get; }

    /// <summary>Index of the alternative that matched (0-based)</summary>
    public int AlternativeIndex { get; }

    /// <summary>The type of match (for semantic clarity)</summary>
    public TokenMatchType Type { get; }

    /// <summary>Optional tag for custom identification</summary>
    public string? Tag { get; }

    public MatchAllItem(TokenMatch match, int alternativeIndex, TokenMatchType type = TokenMatchType.Unknown, string? tag = null)
    {
        Match = match;
        AlternativeIndex = alternativeIndex;
        Type = type;
        Tag = tag;
    }

    /// <summary>Shorthand access to matched tokens</summary>
    public Token[] Tokens => Match.MatchedTokens;

    /// <summary>Shorthand access to captures</summary>
    public TokenCapture[] Captures => Match.Captures;
}

/// <summary>
/// Represents the result of a successful pattern match against a token stream.
/// </summary>
public class TokenMatch
{
    /// <summary>
    /// All tokens that were matched by the pattern
    /// </summary>
    public Token[] MatchedTokens { get; }

    /// <summary>
    /// Captured groups (by index, 0 = first capture)
    /// </summary>
    public TokenCapture[] Captures { get; }

    /// <summary>
    /// Named captures (if the pattern uses named groups)
    /// </summary>
    public IReadOnlyDictionary<string, TokenCapture> NamedCaptures { get; }

    /// <summary>
    /// Starting index in the original token stream
    /// </summary>
    public int StartIndex { get; }

    /// <summary>
    /// Ending index (exclusive) in the original token stream
    /// </summary>
    public int EndIndex { get; }

    /// <summary>
    /// The pattern that produced this match
    /// </summary>
    public string Pattern { get; }

    public TokenMatch(
        Token[] matchedTokens,
        TokenCapture[] captures,
        Dictionary<string, TokenCapture>? namedCaptures,
        int startIndex,
        int endIndex,
        string pattern)
    {
        MatchedTokens = matchedTokens;
        Captures = captures;
        NamedCaptures = namedCaptures ?? new Dictionary<string, TokenCapture>();
        StartIndex = startIndex;
        EndIndex = endIndex;
        Pattern = pattern;
    }

    /// <summary>
    /// Gets the number of tokens matched
    /// </summary>
    public int Length => MatchedTokens.Length;

    /// <summary>
    /// Gets a capture by index
    /// </summary>
    public TokenCapture this[int index] => Captures[index];

    /// <summary>
    /// Gets a capture by name
    /// </summary>
    public TokenCapture this[string name] => NamedCaptures[name];

    /// <summary>
    /// Gets the first token in a capture group
    /// </summary>
    public Token? GetCapturedToken(int captureIndex)
    {
        if (captureIndex < 0 || captureIndex >= Captures.Length)
            return null;
        return Captures[captureIndex].Tokens.FirstOrDefault();
    }

    /// <summary>
    /// Gets all tokens in a capture group
    /// </summary>
    public Token[] GetCapturedTokens(int captureIndex)
    {
        if (captureIndex < 0 || captureIndex >= Captures.Length)
            return Array.Empty<Token>();
        return Captures[captureIndex].Tokens;
    }
}

/// <summary>
/// Represents a single capture group from a pattern match.
/// </summary>
public class TokenCapture
{
    /// <summary>
    /// The tokens captured by this group.
    /// When the group is inside a quantifier with CollectRepetitions=true,
    /// this contains all tokens from all repetitions combined.
    /// </summary>
    public Token[] Tokens { get; }

    /// <summary>
    /// Optional name of this capture group
    /// </summary>
    public string? Name { get; }

    /// <summary>
    /// Index of this capture group in the pattern
    /// </summary>
    public int Index { get; }

    /// <summary>
    /// When the capture group is inside a repeating quantifier (+, *, {n,m}),
    /// this contains each individual repetition's captured tokens.
    /// For non-repeating captures, this will be empty or contain a single entry.
    /// </summary>
    public List<Token[]> Repetitions { get; } = new();

    public TokenCapture(Token[] tokens, int index, string? name = null)
    {
        Tokens = tokens;
        Index = index;
        Name = name;
    }

    /// <summary>
    /// Creates a TokenCapture with repetition data.
    /// </summary>
    public TokenCapture(Token[] tokens, int index, string? name, List<Token[]> repetitions)
    {
        Tokens = tokens;
        Index = index;
        Name = name;
        Repetitions = repetitions;
    }

    /// <summary>
    /// Gets the first token in this capture, or null if empty
    /// </summary>
    public Token? First => Tokens.FirstOrDefault();

    /// <summary>
    /// Returns true if this capture has multiple repetitions.
    /// </summary>
    public bool HasRepetitions => Repetitions.Count > 1;

    /// <summary>
    /// Gets the number of repetitions captured.
    /// </summary>
    public int RepetitionCount => Repetitions.Count;

    /// <summary>
    /// Gets the combined value of all tokens in this capture
    /// </summary>
    public string Value => string.Join("", Tokens.Select(t => t.Value));

    /// <summary>
    /// Returns true if this capture contains any tokens
    /// </summary>
    public bool HasValue => Tokens.Length > 0;

    #region Type Coercion Methods

    /// <summary>
    /// Gets the combined value of all tokens as a string.
    /// Alias for Value property for fluent API consistency.
    /// </summary>
    public string AsString() => Value;

    /// <summary>
    /// Gets the value of the first Identifier token in this capture.
    /// Returns null if no identifier is found.
    /// </summary>
    public string? AsIdentifier() =>
        Tokens.FirstOrDefault(t => t.Type == TokenType.Identifier)?.Value;

    /// <summary>
    /// Gets the value of the first Keyword token in this capture.
    /// Returns null if no keyword is found.
    /// </summary>
    public string? AsKeyword() =>
        Tokens.FirstOrDefault(t => t.Type == TokenType.Keyword)?.Value;

    /// <summary>
    /// Gets the value of the first String token in this capture.
    /// Returns null if no string is found.
    /// </summary>
    public string? AsStringLiteral() =>
        Tokens.FirstOrDefault(t => t.Type == TokenType.String)?.Value;

    /// <summary>
    /// Gets the value of the first Number token in this capture, parsed as int.
    /// Returns null if no number is found or parsing fails.
    /// </summary>
    public int? AsInt()
    {
        var numToken = Tokens.FirstOrDefault(t => t.Type == TokenType.Number);
        if (numToken != null && int.TryParse(numToken.Value, out var result))
            return result;
        return null;
    }

    /// <summary>
    /// Gets the value of the first Number token in this capture, parsed as double.
    /// Returns null if no number is found or parsing fails.
    /// </summary>
    public double? AsDouble()
    {
        var numToken = Tokens.FirstOrDefault(t => t.Type == TokenType.Number);
        if (numToken != null && double.TryParse(numToken.Value, out var result))
            return result;
        return null;
    }

    /// <summary>
    /// Gets the value interpreted as a boolean.
    /// Returns true for "true", false for "false", null otherwise.
    /// </summary>
    public bool? AsBool()
    {
        var value = Value.Trim().ToLowerInvariant();
        return value switch
        {
            "true" => true,
            "false" => false,
            _ => null
        };
    }

    /// <summary>
    /// Gets the first token of a specific type, or null if not found.
    /// </summary>
    public Token? FirstOfType(TokenType type) =>
        Tokens.FirstOrDefault(t => t.Type == type);

    /// <summary>
    /// Gets all tokens of a specific type.
    /// </summary>
    public Token[] AllOfType(TokenType type) =>
        Tokens.Where(t => t.Type == type).ToArray();

    /// <summary>
    /// Gets the value of the first token of a specific type.
    /// Returns null if no token of that type is found.
    /// </summary>
    public string? ValueOfType(TokenType type) =>
        FirstOfType(type)?.Value;

    #endregion
}
