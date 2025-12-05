using System.Reflection;
using Reluxer.Attributes;
using Reluxer.Matching;
using Reluxer.Pattern;
using Reluxer.Tokens;

namespace Reluxer.Visitor;

/// <summary>
/// Base class for token pattern visitors.
/// Extend this class and add methods with [TokenPattern] attributes.
///
/// Supports nested traversal via Traverse() method, similar to Babel's path.traverse().
/// Supports return values from visitors that can be accessed by subsequent visitors.
/// Supports token manipulation via Insert(), Replace(), and Remove() methods.
/// </summary>
public abstract class TokenVisitor
{
    private readonly Dictionary<string, List<PatternHandler>> _handlersByName = new();
    private readonly List<PatternHandler> _defaultHandlers = new();
    private bool _initialized;

    // Current token stream context for balanced extraction
    private IReadOnlyList<Token>? _currentTokens;
    private int _currentIndex;
    private int _skipToIndex = -1;  // When set, skip to this index after current handler

    // Call stack for tracking which visitor invoked Traverse()
    private readonly Stack<string> _visitorCallStack = new();

    // Result storage for passing values between visitors
    private readonly VisitorResultStore _resultStore = new();

    // Shared context for arbitrary state
    private VisitorContext _context = new();
    private bool _ownsContext = true; // Whether we created the context (and should clear it)

    // Token manipulation support
    private List<Token>? _mutableTokens;
    private readonly List<TokenEdit> _pendingEdits = new();
    private string? _originalSource;

    /// <summary>
    /// Gets the current visitor call stack (for debugging/diagnostics).
    /// </summary>
    protected IReadOnlyCollection<string> CallStack => _visitorCallStack;

    /// <summary>
    /// Gets the name of the visitor method that invoked the current Traverse().
    /// Returns null if called from Visit() or if the stack is empty.
    /// </summary>
    protected string? CurrentCaller => _visitorCallStack.Count > 0 ? _visitorCallStack.Peek() : null;

    /// <summary>
    /// Gets the shared context for passing arbitrary state between visitors.
    /// </summary>
    protected VisitorContext Context => _context;

    /// <summary>
    /// Gets results from a specific visitor method.
    /// </summary>
    protected List<T> GetResults<T>(string visitorName) => _resultStore.GetAll<T>(visitorName);

    /// <summary>
    /// Gets all results of a specific type from any visitor.
    /// </summary>
    protected List<T> GetAllResults<T>() => _resultStore.GetAllOfType<T>();

    /// <summary>
    /// Gets the last result of a specific type from any visitor.
    /// </summary>
    protected T? GetLastResult<T>() => _resultStore.GetLastOfType<T>();

    /// <summary>
    /// Gets the last result of a specific type from a specific visitor.
    /// </summary>
    protected T? GetLastResultFrom<T>(string visitorName) => _resultStore.GetLast<T>(visitorName);

    /// <summary>
    /// Called before visiting begins. Override to initialize state.
    /// </summary>
    public virtual void OnBegin(IReadOnlyList<Token> tokens) { }

    /// <summary>
    /// Called after all tokens have been visited. Override to finalize output.
    /// </summary>
    public virtual void OnEnd() { }

    /// <summary>
    /// Called when a token is not matched by any pattern.
    /// </summary>
    public virtual void OnUnmatched(Token token) { }

    /// <summary>
    /// Visits the token stream using all default handlers (those without a specific name).
    /// </summary>
    public void Visit(IReadOnlyList<Token> tokens)
    {
        Visit(tokens, originalSource: null);
    }

    /// <summary>
    /// Visits the token stream with the original source for accurate reconstruction.
    /// Use this overload when you want to use GetModifiedSource() to preserve formatting.
    /// </summary>
    /// <param name="tokens">The tokens to visit</param>
    /// <param name="originalSource">The original source code (for formatting preservation)</param>
    public void Visit(IReadOnlyList<Token> tokens, string? originalSource)
    {
        Visit(tokens, originalSource, sharedContext: null);
    }

    /// <summary>
    /// Visits the token stream with a shared context for multi-pass transformations.
    /// Use this overload when multiple visitors need to share state.
    /// </summary>
    /// <param name="tokens">The tokens to visit</param>
    /// <param name="originalSource">The original source code (for formatting preservation)</param>
    /// <param name="sharedContext">External context shared across multiple visitors (not cleared between visits)</param>
    public void Visit(IReadOnlyList<Token> tokens, string? originalSource, VisitorContext? sharedContext)
    {
        EnsureInitialized();
        _resultStore.Clear();
        _pendingEdits.Clear();
        _mutableTokens = new List<Token>(tokens);
        _originalSource = originalSource;

        // Use shared context if provided, otherwise use our own (and clear it)
        if (sharedContext != null)
        {
            _context = sharedContext;
            _ownsContext = false;
        }
        else
        {
            if (_ownsContext)
            {
                _context.Clear();
            }
            else
            {
                // We were using a shared context before, create a new one
                _context = new VisitorContext();
                _ownsContext = true;
            }
        }

        OnBegin(tokens);
        VisitWithHandlers(tokens, _defaultHandlers, callerName: null);
        OnEnd();
    }

    /// <summary>
    /// Traverses tokens using specific named visitor methods.
    /// Use nameof() to specify which methods to use.
    ///
    /// Example:
    ///   Traverse(bodyTokens, nameof(VisitStatement), nameof(VisitExpression));
    /// </summary>
    public void Traverse(IReadOnlyList<Token> tokens, params string[] visitorNames)
    {
        EnsureInitialized();

        var handlers = new List<PatternHandler>();
        var caller = CurrentCaller;

        foreach (var name in visitorNames)
        {
            if (_handlersByName.TryGetValue(name, out var namedHandlers))
            {
                foreach (var handler in namedHandlers)
                {
                    // Check From restriction
                    if (handler.AllowedCallers != null && handler.AllowedCallers.Length > 0)
                    {
                        if (caller == null || !handler.AllowedCallers.Contains(caller))
                        {
                            // This handler is restricted and caller is not allowed
                            continue;
                        }
                    }
                    handlers.Add(handler);
                }
            }
        }

        VisitWithHandlers(tokens, handlers, caller);
    }

    /// <summary>
    /// Traverses tokens using a specific named visitor method.
    /// </summary>
    public void Traverse(IReadOnlyList<Token> tokens, string visitorName)
    {
        Traverse(tokens, new[] { visitorName });
    }

    /// <summary>
    /// Traverses a captured token array using specific visitor methods.
    /// Convenience overload for working with TokenCapture.
    /// </summary>
    public void Traverse(TokenCapture capture, params string[] visitorNames)
    {
        Traverse(capture.Tokens, visitorNames);
    }

    /// <summary>
    /// Traverses tokens from a TokenMatch's captured group.
    /// </summary>
    public void Traverse(TokenMatch match, int captureIndex, params string[] visitorNames)
    {
        if (captureIndex < match.Captures.Length)
        {
            Traverse(match.Captures[captureIndex].Tokens, visitorNames);
        }
    }

    /// <summary>
    /// Creates a sub-visitor scope for traversing nested structures.
    /// Returns a TraversalScope that can be used for fluent traversal.
    /// </summary>
    public TraversalScope Enter(Token[] tokens)
    {
        return new TraversalScope(this, tokens);
    }

    /// <summary>
    /// Creates a sub-visitor scope from a capture.
    /// </summary>
    public TraversalScope Enter(TokenCapture capture)
    {
        return new TraversalScope(this, capture.Tokens);
    }

    private void VisitWithHandlers(IReadOnlyList<Token> tokens, List<PatternHandler> handlers, string? callerName)
    {
        if (handlers.Count == 0) return;

        // Save context for nested extraction
        var prevTokens = _currentTokens;
        var prevIndex = _currentIndex;
        var prevSkipTo = _skipToIndex;
        _currentTokens = tokens;
        _skipToIndex = -1;

        int index = 0;
        while (index < tokens.Count)
        {
            if (tokens[index].Type == TokenType.Eof)
                break;

            _currentIndex = index;
            _skipToIndex = -1;  // Reset before each handler
            bool matched = false;

            // Try handlers in priority order
            foreach (var handler in handlers.OrderByDescending(h => h.Priority))
            {
                if (handler.Matcher.TryMatch(tokens, index, out var match))
                {
                    InvokeHandler(handler, match!);

                    // Check if handler called SkipTo
                    if (_skipToIndex > index)
                    {
                        index = _skipToIndex;
                        matched = true;
                        break;
                    }
                    else if (handler.Consumes)
                    {
                        index = match!.EndIndex;
                        matched = true;
                        break;
                    }
                }
            }

            if (!matched)
            {
                OnUnmatched(tokens[index]);
                index++;
            }
        }

        // Restore context
        _currentTokens = prevTokens;
        _currentIndex = prevIndex;
        _skipToIndex = prevSkipTo;
    }

    /// <summary>
    /// Extracts tokens within balanced delimiters starting from the current match position.
    /// Useful for extracting function bodies, JSX children, etc.
    /// </summary>
    /// <param name="startOffset">Offset from current position to start looking for open delimiter</param>
    /// <param name="open">Opening delimiter value (e.g., "{", "(", "[")</param>
    /// <param name="close">Closing delimiter value (e.g., "}", ")", "]")</param>
    /// <returns>Tokens between (not including) the balanced delimiters</returns>
    protected Token[] ExtractBalanced(int startOffset, string open, string close)
    {
        if (_currentTokens == null) return Array.Empty<Token>();

        int searchStart = _currentIndex + startOffset;
        if (searchStart < 0 || searchStart >= _currentTokens.Count)
            return Array.Empty<Token>();

        // Find opening delimiter
        int openIndex = -1;
        for (int i = searchStart; i < _currentTokens.Count; i++)
        {
            if (_currentTokens[i].Value == open)
            {
                openIndex = i;
                break;
            }
        }
        if (openIndex < 0) return Array.Empty<Token>();

        // Find matching close with depth tracking
        int depth = 1;
        int closeIndex = -1;
        for (int i = openIndex + 1; i < _currentTokens.Count; i++)
        {
            if (_currentTokens[i].Value == open) depth++;
            else if (_currentTokens[i].Value == close)
            {
                depth--;
                if (depth == 0)
                {
                    closeIndex = i;
                    break;
                }
            }
        }
        if (closeIndex < 0) return Array.Empty<Token>();

        // Extract tokens between open and close (exclusive)
        var result = new Token[closeIndex - openIndex - 1];
        for (int i = 0; i < result.Length; i++)
        {
            result[i] = _currentTokens[openIndex + 1 + i];
        }
        return result;
    }

    /// <summary>
    /// Extracts the function body (content within { }) starting from the current position.
    /// </summary>
    protected Token[] ExtractFunctionBody(int startOffset = 0)
    {
        return ExtractBalanced(startOffset, "{", "}");
    }

    /// <summary>
    /// Extracts content within parentheses starting from the current position.
    /// </summary>
    protected Token[] ExtractParenthesized(int startOffset = 0)
    {
        return ExtractBalanced(startOffset, "(", ")");
    }

    /// <summary>
    /// Extracts content within square brackets starting from the current position.
    /// </summary>
    protected Token[] ExtractBracketed(int startOffset = 0)
    {
        return ExtractBalanced(startOffset, "[", "]");
    }

    #region Skip/Fast-Forward

    /// <summary>
    /// Skips to a specific token, so the next visitor iteration starts after this token.
    /// Use this when you've manually explored tokens and want to avoid re-processing them.
    /// </summary>
    /// <param name="token">The token to skip to (iteration resumes after this token)</param>
    protected void SkipTo(Token token)
    {
        if (_currentTokens == null) return;

        for (int i = _currentIndex; i < _currentTokens.Count; i++)
        {
            if (ReferenceEquals(_currentTokens[i], token) ||
                (_currentTokens[i].Start == token.Start && _currentTokens[i].End == token.End))
            {
                _skipToIndex = i + 1;
                return;
            }
        }
    }

    /// <summary>
    /// Skips to a specific index in the token stream.
    /// </summary>
    /// <param name="index">The index to skip to (iteration resumes at this index)</param>
    protected void SkipToIndex(int index)
    {
        _skipToIndex = index;
    }

    /// <summary>
    /// Skips past a balanced block starting from the current position.
    /// Finds the matching close delimiter and skips to after it.
    /// </summary>
    /// <param name="open">Opening delimiter (e.g., "{", "(", "[")</param>
    /// <param name="close">Closing delimiter (e.g., "}", ")", "]")</param>
    protected void SkipBalanced(string open, string close)
    {
        if (_currentTokens == null) return;

        // Find opening delimiter
        int openIndex = -1;
        for (int i = _currentIndex; i < _currentTokens.Count; i++)
        {
            if (_currentTokens[i].Value == open)
            {
                openIndex = i;
                break;
            }
        }
        if (openIndex < 0) return;

        // Find matching close with depth tracking
        int depth = 1;
        for (int i = openIndex + 1; i < _currentTokens.Count; i++)
        {
            if (_currentTokens[i].Value == open) depth++;
            else if (_currentTokens[i].Value == close)
            {
                depth--;
                if (depth == 0)
                {
                    _skipToIndex = i + 1;
                    return;
                }
            }
        }
    }

    /// <summary>
    /// Skips past a function body (balanced { }).
    /// </summary>
    protected void SkipFunctionBody()
    {
        SkipBalanced("{", "}");
    }

    #endregion

    #region Token Manipulation

    /// <summary>
    /// Inserts tokens after a specific token in the current match.
    /// The insertion happens at the end of visiting (call ApplyEdits or use GetModifiedTokens).
    /// </summary>
    /// <param name="afterToken">The token after which to insert</param>
    /// <param name="newTokens">The tokens to insert</param>
    protected void InsertAfter(Token afterToken, params Token[] newTokens)
    {
        if (_mutableTokens == null || newTokens.Length == 0) return;

        int index = FindTokenIndex(afterToken);
        if (index >= 0)
        {
            _pendingEdits.Add(new TokenEdit(TokenEditType.Insert, index + 1, 0, newTokens));
        }
    }

    /// <summary>
    /// Inserts tokens before a specific token in the current match.
    /// </summary>
    /// <param name="beforeToken">The token before which to insert</param>
    /// <param name="newTokens">The tokens to insert</param>
    protected void InsertBefore(Token beforeToken, params Token[] newTokens)
    {
        if (_mutableTokens == null || newTokens.Length == 0) return;

        int index = FindTokenIndex(beforeToken);
        if (index >= 0)
        {
            _pendingEdits.Add(new TokenEdit(TokenEditType.Insert, index, 0, newTokens));
        }
    }

    /// <summary>
    /// Inserts tokens at a specific index in the token stream.
    /// </summary>
    /// <param name="index">The index at which to insert</param>
    /// <param name="newTokens">The tokens to insert</param>
    protected void InsertAt(int index, params Token[] newTokens)
    {
        if (_mutableTokens == null || newTokens.Length == 0) return;
        _pendingEdits.Add(new TokenEdit(TokenEditType.Insert, index, 0, newTokens));
    }

    /// <summary>
    /// Replaces a single token with new tokens.
    /// </summary>
    /// <param name="oldToken">The token to replace</param>
    /// <param name="newTokens">The replacement tokens</param>
    protected void Replace(Token oldToken, params Token[] newTokens)
    {
        if (_mutableTokens == null) return;

        int index = FindTokenIndex(oldToken);
        if (index >= 0)
        {
            _pendingEdits.Add(new TokenEdit(TokenEditType.Replace, index, 1, newTokens));
        }
    }

    /// <summary>
    /// Replaces all tokens in a match with new tokens.
    /// </summary>
    /// <param name="match">The match whose tokens should be replaced</param>
    /// <param name="newTokens">The replacement tokens</param>
    protected void ReplaceMatch(TokenMatch match, params Token[] newTokens)
    {
        if (_mutableTokens == null) return;

        int startIndex = FindTokenIndex(match.MatchedTokens[0]);
        if (startIndex >= 0)
        {
            _pendingEdits.Add(new TokenEdit(TokenEditType.Replace, startIndex, match.MatchedTokens.Length, newTokens));
        }
    }

    /// <summary>
    /// Replaces a range of tokens with new tokens.
    /// </summary>
    /// <param name="startToken">First token to replace</param>
    /// <param name="endToken">Last token to replace (inclusive)</param>
    /// <param name="newTokens">The replacement tokens</param>
    protected void ReplaceRange(Token startToken, Token endToken, params Token[] newTokens)
    {
        if (_mutableTokens == null) return;

        int startIndex = FindTokenIndex(startToken);
        int endIndex = FindTokenIndex(endToken);
        if (startIndex >= 0 && endIndex >= startIndex)
        {
            int count = endIndex - startIndex + 1;
            _pendingEdits.Add(new TokenEdit(TokenEditType.Replace, startIndex, count, newTokens));
        }
    }

    /// <summary>
    /// Removes a token from the stream.
    /// </summary>
    /// <param name="token">The token to remove</param>
    protected void Remove(Token token)
    {
        if (_mutableTokens == null) return;

        int index = FindTokenIndex(token);
        if (index >= 0)
        {
            _pendingEdits.Add(new TokenEdit(TokenEditType.Remove, index, 1, Array.Empty<Token>()));
        }
    }

    /// <summary>
    /// Removes all tokens in a match.
    /// </summary>
    /// <param name="match">The match whose tokens should be removed</param>
    protected void RemoveMatch(TokenMatch match)
    {
        if (_mutableTokens == null) return;

        int startIndex = FindTokenIndex(match.MatchedTokens[0]);
        if (startIndex >= 0)
        {
            _pendingEdits.Add(new TokenEdit(TokenEditType.Remove, startIndex, match.MatchedTokens.Length, Array.Empty<Token>()));
        }
    }

    /// <summary>
    /// Gets the modified token stream after all edits have been applied.
    /// Call this after Visit() completes to get the transformed tokens.
    /// </summary>
    /// <returns>The modified token list, or the original if no edits were made</returns>
    public IReadOnlyList<Token> GetModifiedTokens()
    {
        if (_mutableTokens == null) return Array.Empty<Token>();

        ApplyPendingEdits();
        return _mutableTokens.AsReadOnly();
    }

    /// <summary>
    /// Gets the modified source code, preserving original formatting.
    /// Uses original source positions to maintain whitespace and formatting
    /// for unmodified regions, while splicing in new token values for edits.
    /// </summary>
    public string GetModifiedSource()
    {
        if (_mutableTokens == null) return _originalSource ?? "";

        ApplyPendingEdits();

        var sb = new System.Text.StringBuilder();
        int lastEnd = 0;

        foreach (var token in _mutableTokens)
        {
            if (token.Type == TokenType.Eof) break;

            // Check if this is an original token (has valid source position)
            bool isOriginalToken = token.Start >= 0 && token.End > token.Start &&
                                   _originalSource != null &&
                                   token.End <= _originalSource.Length;

            if (isOriginalToken && token.Start >= lastEnd)
            {
                // Append any gap (whitespace/formatting) from original source
                if (token.Start > lastEnd)
                {
                    sb.Append(_originalSource![lastEnd..token.Start]);
                }
                sb.Append(token.Value);
                lastEnd = token.End;
            }
            else if (isOriginalToken && token.Start < lastEnd)
            {
                // This original token overlaps with what we've already written
                // (happens after insertions) - just append its value
                sb.Append(token.Value);
                if (token.End > lastEnd)
                    lastEnd = token.End;
            }
            else
            {
                // Synthetic token (inserted) - just append the value
                sb.Append(token.Value);
            }
        }

        return sb.ToString();
    }

    /// <summary>
    /// Determines if a space is needed between two characters.
    /// </summary>
    private static bool NeedsSpaceBetween(char before, char after)
    {
        // Don't add space before punctuation
        if (after == ',' || after == ';' || after == ')' || after == ']' || after == '}' || after == '>')
            return false;
        // Don't add space after opening punctuation
        if (before == '(' || before == '[' || before == '{' || before == '<')
            return false;
        // Don't add space around = in attributes
        if (before == '=' || after == '=')
            return false;
        // Don't add space around quotes
        if (before == '"' || after == '"' || before == '\'' || after == '\'')
            return false;

        return true;
    }

    /// <summary>
    /// Checks if any edits have been made to the token stream.
    /// </summary>
    protected bool HasEdits => _pendingEdits.Count > 0;

    private int FindTokenIndex(Token token)
    {
        if (_mutableTokens == null) return -1;

        // First try by reference
        for (int i = 0; i < _mutableTokens.Count; i++)
        {
            if (ReferenceEquals(_mutableTokens[i], token))
                return i;
        }

        // Fall back to position matching
        for (int i = 0; i < _mutableTokens.Count; i++)
        {
            if (_mutableTokens[i].Start == token.Start && _mutableTokens[i].End == token.End)
                return i;
        }

        return -1;
    }

    private void ApplyPendingEdits()
    {
        if (_mutableTokens == null || _pendingEdits.Count == 0) return;

        // Sort edits by position (descending) so we apply from end to start
        // This prevents index shifting issues
        var sortedEdits = _pendingEdits.OrderByDescending(e => e.Index).ToList();

        foreach (var edit in sortedEdits)
        {
            switch (edit.Type)
            {
                case TokenEditType.Insert:
                    _mutableTokens.InsertRange(edit.Index, edit.NewTokens);
                    break;

                case TokenEditType.Replace:
                    _mutableTokens.RemoveRange(edit.Index, edit.Count);
                    _mutableTokens.InsertRange(edit.Index, edit.NewTokens);
                    break;

                case TokenEditType.Remove:
                    _mutableTokens.RemoveRange(edit.Index, edit.Count);
                    break;
            }
        }

        _pendingEdits.Clear();
    }

    #endregion

    private void EnsureInitialized()
    {
        if (_initialized) return;

        var type = GetType();
        var methods = type.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);

        foreach (var method in methods)
        {
            var attributes = method.GetCustomAttributes<TokenPatternAttribute>();
            foreach (var attr in attributes)
            {
                try
                {
                    var matcher = new PatternMatcher(attr.Pattern);
                    var handler = new PatternHandler
                    {
                        Method = method,
                        MethodName = method.Name,
                        Matcher = matcher,
                        Attribute = attr,
                        Priority = attr.Priority,
                        Consumes = attr.Consumes,
                        AllowedCallers = attr.From
                    };

                    // Add to named handlers (always, so Traverse can find it by name)
                    if (!_handlersByName.TryGetValue(method.Name, out var namedList))
                    {
                        namedList = new List<PatternHandler>();
                        _handlersByName[method.Name] = namedList;
                    }
                    namedList.Add(handler);

                    // Add to default handlers only if:
                    // 1. Not explicitly named-only (Name is null/empty)
                    // 2. Has no From restriction (can be called from anywhere)
                    if (string.IsNullOrEmpty(attr.Name) && (attr.From == null || attr.From.Length == 0))
                    {
                        _defaultHandlers.Add(handler);
                    }
                    else if (!string.IsNullOrEmpty(attr.Name))
                    {
                        // Also index by the explicit name
                        if (!_handlersByName.TryGetValue(attr.Name, out var explicitList))
                        {
                            explicitList = new List<PatternHandler>();
                            _handlersByName[attr.Name] = explicitList;
                        }
                        explicitList.Add(handler);
                    }
                }
                catch (PatternParseException ex)
                {
                    throw new InvalidOperationException(
                        $"Invalid pattern on method {type.Name}.{method.Name}: {ex.Message}", ex);
                }
            }
        }

        _initialized = true;
    }

    private void InvokeHandler(PatternHandler handler, TokenMatch match)
    {
        var parameters = handler.Method.GetParameters();
        var args = new object?[parameters.Length];

        int captureIndex = 0;

        for (int i = 0; i < parameters.Length; i++)
        {
            var param = parameters[i];
            var paramType = param.ParameterType;

            // TokenMatch parameter
            if (paramType == typeof(TokenMatch))
            {
                args[i] = match;
                continue;
            }

            // TraversalScope parameter - for fluent nested traversal
            if (paramType == typeof(TraversalScope))
            {
                if (captureIndex < match.Captures.Length)
                {
                    args[i] = new TraversalScope(this, match.Captures[captureIndex++].Tokens);
                }
                else
                {
                    args[i] = new TraversalScope(this, Array.Empty<Token>());
                }
                continue;
            }

            // Token parameter - single captured token
            if (paramType == typeof(Token))
            {
                if (captureIndex < match.Captures.Length)
                {
                    args[i] = match.Captures[captureIndex++].First;
                }
                continue;
            }

            // Token[] parameter - all tokens in a capture
            if (paramType == typeof(Token[]))
            {
                if (captureIndex < match.Captures.Length)
                {
                    args[i] = match.Captures[captureIndex++].Tokens;
                }
                else
                {
                    args[i] = Array.Empty<Token>();
                }
                continue;
            }

            // string parameter - value of captured token
            if (paramType == typeof(string))
            {
                if (captureIndex < match.Captures.Length)
                {
                    args[i] = match.Captures[captureIndex++].Value;
                }
                continue;
            }

            // TokenCapture parameter
            if (paramType == typeof(TokenCapture))
            {
                if (captureIndex < match.Captures.Length)
                {
                    args[i] = match.Captures[captureIndex++];
                }
                continue;
            }

            // VisitorContext parameter - shared state
            if (paramType == typeof(VisitorContext))
            {
                args[i] = _context;
                continue;
            }

            // [Inject] attribute - inject return values from other visitors
            var injectAttr = param.GetCustomAttribute<InjectAttribute>();
            if (injectAttr != null)
            {
                // Determine the element type (unwrap List<T> if All = true)
                Type elementType;
                bool isList = paramType.IsGenericType && paramType.GetGenericTypeDefinition() == typeof(List<>);

                if (injectAttr.All && isList)
                {
                    elementType = paramType.GetGenericArguments()[0];
                }
                else
                {
                    elementType = paramType;
                    // Handle nullable types
                    if (elementType.IsGenericType && elementType.GetGenericTypeDefinition() == typeof(Nullable<>))
                    {
                        elementType = elementType.GetGenericArguments()[0];
                    }
                }

                if (injectAttr.All)
                {
                    // Get all results as List<T>
                    if (injectAttr.VisitorName != null)
                    {
                        var method = typeof(VisitorResultStore).GetMethod(nameof(VisitorResultStore.GetAll))!
                            .MakeGenericMethod(elementType);
                        args[i] = method.Invoke(_resultStore, new object[] { injectAttr.VisitorName });
                    }
                    else
                    {
                        var method = typeof(VisitorResultStore).GetMethod(nameof(VisitorResultStore.GetAllOfType))!
                            .MakeGenericMethod(elementType);
                        args[i] = method.Invoke(_resultStore, Array.Empty<object>());
                    }
                }
                else
                {
                    // Get last result
                    if (injectAttr.VisitorName != null)
                    {
                        var method = typeof(VisitorResultStore).GetMethod(nameof(VisitorResultStore.GetLast))!
                            .MakeGenericMethod(elementType);
                        args[i] = method.Invoke(_resultStore, new object[] { injectAttr.VisitorName });
                    }
                    else
                    {
                        var method = typeof(VisitorResultStore).GetMethod(nameof(VisitorResultStore.GetLastOfType))!
                            .MakeGenericMethod(elementType);
                        args[i] = method.Invoke(_resultStore, Array.Empty<object>());
                    }
                }
                continue;
            }
        }

        // Push onto call stack before invoking
        _visitorCallStack.Push(handler.MethodName);
        try
        {
            var result = handler.Method.Invoke(this, args);

            // Store non-null return values
            if (result != null && handler.Method.ReturnType != typeof(void))
            {
                _resultStore.Add(handler.MethodName, result);
            }
        }
        finally
        {
            _visitorCallStack.Pop();
        }
    }

    private class PatternHandler
    {
        public MethodInfo Method { get; set; } = null!;
        public string MethodName { get; set; } = null!;
        public PatternMatcher Matcher { get; set; } = null!;
        public TokenPatternAttribute Attribute { get; set; } = null!;
        public int Priority { get; set; }
        public bool Consumes { get; set; }
        public string[]? AllowedCallers { get; set; }
    }
}

/// <summary>
/// Represents a scope for traversing nested token structures.
/// Provides a fluent API for nested traversal.
/// </summary>
public class TraversalScope
{
    private readonly TokenVisitor _visitor;
    private readonly Token[] _tokens;

    public TraversalScope(TokenVisitor visitor, Token[] tokens)
    {
        _visitor = visitor;
        _tokens = tokens;
    }

    /// <summary>
    /// The tokens in this scope.
    /// </summary>
    public Token[] Tokens => _tokens;

    /// <summary>
    /// Traverse using specific visitor methods.
    /// </summary>
    public TraversalScope Traverse(params string[] visitorNames)
    {
        _visitor.Traverse(_tokens, visitorNames);
        return this;
    }

    /// <summary>
    /// Traverse using a single visitor method.
    /// </summary>
    public TraversalScope Traverse(string visitorName)
    {
        _visitor.Traverse(_tokens, visitorName);
        return this;
    }
}

/// <summary>
/// Type of token edit operation.
/// </summary>
internal enum TokenEditType
{
    Insert,
    Replace,
    Remove
}

/// <summary>
/// Represents a pending edit to the token stream.
/// </summary>
internal class TokenEdit
{
    public TokenEditType Type { get; }
    public int Index { get; }
    public int Count { get; }
    public Token[] NewTokens { get; }

    public TokenEdit(TokenEditType type, int index, int count, Token[] newTokens)
    {
        Type = type;
        Index = index;
        Count = count;
        NewTokens = newTokens;
    }
}
