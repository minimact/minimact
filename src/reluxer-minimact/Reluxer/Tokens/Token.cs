namespace Reluxer.Tokens;

/// <summary>
/// Represents a single lexed token from source code.
/// </summary>
public class Token
{
    /// <summary>
    /// The type of this token (keyword, identifier, etc.)
    /// </summary>
    public TokenType Type { get; set; }

    /// <summary>
    /// The actual text value of the token
    /// </summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Start position (character index) in the source
    /// </summary>
    public int Start { get; set; }

    /// <summary>
    /// End position (character index) in the source
    /// </summary>
    public int End { get; set; }

    /// <summary>
    /// Line number (1-based) where this token appears
    /// </summary>
    public int Line { get; set; }

    /// <summary>
    /// Column number (1-based) where this token starts
    /// </summary>
    public int Column { get; set; }

    public Token() { }

    public Token(TokenType type, string value, int start, int end, int line, int column)
    {
        Type = type;
        Value = value;
        Start = start;
        End = end;
        Line = line;
        Column = column;
    }

    /// <summary>
    /// Gets the length of this token
    /// </summary>
    public int Length => End - Start;

    public override string ToString()
    {
        return $"[{Type}] \"{Value}\" @ {Line}:{Column}";
    }

    /// <summary>
    /// Checks if this token matches a specific type and optionally a value
    /// </summary>
    public bool Is(TokenType type, string? value = null)
    {
        if (Type != type) return false;
        if (value != null && Value != value) return false;
        return true;
    }

    #region Factory Methods for Token Creation

    /// <summary>
    /// Creates a new token with the specified type and value.
    /// Position info is set to 0 (synthetic token).
    /// </summary>
    public static Token Create(TokenType type, string value) =>
        new(type, value, 0, value.Length, 0, 0);

    /// <summary>Creates a keyword token</summary>
    public static Token Keyword(string value) => Create(TokenType.Keyword, value);

    /// <summary>Creates an identifier token</summary>
    public static Token Identifier(string value) => Create(TokenType.Identifier, value);

    /// <summary>Creates a string literal token</summary>
    public static Token String(string value) => Create(TokenType.String, value);

    /// <summary>Creates a number literal token</summary>
    public static Token Number(string value) => Create(TokenType.Number, value);

    /// <summary>Creates an operator token</summary>
    public static Token Operator(string value) => Create(TokenType.Operator, value);

    /// <summary>Creates a punctuation token</summary>
    public static Token Punctuation(string value) => Create(TokenType.Punctuation, value);

    /// <summary>Creates a JSX attribute name token</summary>
    public static Token JsxAttrName(string value) => Create(TokenType.JsxAttrName, value);

    /// <summary>Creates a JSX attribute value token</summary>
    public static Token JsxAttrValue(string value) => Create(TokenType.JsxAttrValue, value);

    /// <summary>Creates a whitespace token</summary>
    public static Token Whitespace(string value = " ") => Create(TokenType.Whitespace, value);

    #endregion
}
