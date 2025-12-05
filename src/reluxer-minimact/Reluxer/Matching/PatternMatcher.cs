using Reluxer.Pattern;
using Reluxer.Tokens;

namespace Reluxer.Matching;

/// <summary>
/// Matches token patterns against a token stream.
/// Supports depth-aware matching for balanced structures like JSX.
/// </summary>
public class PatternMatcher
{
    private readonly PatternNode _pattern;
    private readonly string _patternString;
    private readonly bool _skipWhitespace;
    private List<TokenCapture> _captures = new();
    private Dictionary<string, TokenCapture> _namedCaptures = new();

    // Repetition tracking for captures inside quantifiers with CollectRepetitions=true
    private Dictionary<int, List<Token[]>> _captureRepetitions = new();

    // Set of group indices currently being collected as repetitions
    private HashSet<int> _collectingGroups = new();

    // Depth tracking for balanced matching
    private int _currentDepth;
    private Stack<(string TagName, int Depth)> _tagStack = new();

    /// <summary>
    /// Creates a new pattern matcher with the given pattern string.
    /// </summary>
    /// <param name="pattern">The pattern to match.</param>
    /// <param name="skipWhitespace">If true, automatically skips whitespace tokens during matching.</param>
    public PatternMatcher(string pattern, bool skipWhitespace = false)
    {
        _patternString = pattern;
        _pattern = new PatternParser(pattern).Parse();
        _skipWhitespace = skipWhitespace;
    }

    /// <summary>
    /// Creates a new pattern matcher with a pre-parsed pattern node.
    /// </summary>
    public PatternMatcher(PatternNode pattern, string patternString, bool skipWhitespace = false)
    {
        _pattern = pattern;
        _patternString = patternString;
        _skipWhitespace = skipWhitespace;
    }

    /// <summary>
    /// Attempts to match the pattern at the given position in the token stream.
    /// </summary>
    public bool TryMatch(IReadOnlyList<Token> tokens, int startIndex, out TokenMatch? match)
    {
        _captures = new List<TokenCapture>();
        _namedCaptures = new Dictionary<string, TokenCapture>();
        _captureRepetitions = new Dictionary<int, List<Token[]>>();
        _collectingGroups = new HashSet<int>();
        _currentDepth = 0;
        _tagStack = new Stack<(string, int)>();

        var ctx = new MatchContext(tokens, startIndex, _skipWhitespace);
        var success = Match(_pattern, ctx);

        if (success)
        {
            match = new TokenMatch(
                ctx.MatchedTokens.ToArray(),
                _captures.ToArray(),
                _namedCaptures.Count > 0 ? new Dictionary<string, TokenCapture>(_namedCaptures) : null,
                startIndex,
                ctx.Index,
                _patternString
            );
            return true;
        }

        match = null;
        return false;
    }

    /// <summary>
    /// Finds all matches of the pattern in the token stream.
    /// </summary>
    public IEnumerable<TokenMatch> FindAll(IReadOnlyList<Token> tokens, bool overlapping = false)
    {
        int index = 0;
        while (index < tokens.Count)
        {
            if (TryMatch(tokens, index, out var match))
            {
                yield return match!;
                index = overlapping ? index + 1 : match!.EndIndex;
            }
            else
            {
                index++;
            }
        }
    }

    /// <summary>
    /// Finds the first match of the pattern in the token stream.
    /// </summary>
    public TokenMatch? FindFirst(IReadOnlyList<Token> tokens)
    {
        for (int i = 0; i < tokens.Count; i++)
        {
            if (TryMatch(tokens, i, out var match))
            {
                return match;
            }
        }
        return null;
    }

    /// <summary>
    /// Repeatedly matches alternating patterns at sequential positions.
    /// Unlike FindAll, this doesn't skip unmatched tokens - it tries each alternative
    /// at the current position and only advances when a match is found.
    /// </summary>
    /// <param name="tokens">The token stream to match against</param>
    /// <param name="startIndex">Starting position in the token stream</param>
    /// <param name="skipTokenTypes">Token types to skip between matches (e.g., whitespace)</param>
    /// <returns>Sequence of matches with alternative index</returns>
    public static IEnumerable<MatchAllItem> MatchAll(
        IReadOnlyList<Token> tokens,
        int startIndex,
        params (PatternMatcher matcher, TokenMatchType type, string? tag)[] alternatives)
    {
        return MatchAll(tokens, startIndex, new[] { TokenType.Whitespace }, alternatives);
    }

    /// <summary>
    /// Repeatedly matches alternating patterns at sequential positions.
    /// Unlike FindAll, this doesn't skip unmatched tokens - it tries each alternative
    /// at the current position and only advances when a match is found.
    /// </summary>
    /// <param name="tokens">The token stream to match against</param>
    /// <param name="startIndex">Starting position in the token stream</param>
    /// <param name="skipTokenTypes">Token types to skip between matches (e.g., whitespace)</param>
    /// <param name="alternatives">Pattern matchers with their types and optional tags</param>
    /// <returns>Sequence of matches with alternative index</returns>
    public static IEnumerable<MatchAllItem> MatchAll(
        IReadOnlyList<Token> tokens,
        int startIndex,
        TokenType[] skipTokenTypes,
        params (PatternMatcher matcher, TokenMatchType type, string? tag)[] alternatives)
    {
        int i = startIndex;

        while (i < tokens.Count)
        {
            // Skip specified token types (e.g., whitespace)
            while (i < tokens.Count && skipTokenTypes.Contains(tokens[i].Type))
                i++;

            if (i >= tokens.Count)
                break;

            // Try each alternative in order
            bool matched = false;
            for (int altIdx = 0; altIdx < alternatives.Length; altIdx++)
            {
                var (matcher, type, tag) = alternatives[altIdx];
                if (matcher.TryMatch(tokens, i, out var match) && match != null)
                {
                    yield return new MatchAllItem(match, altIdx, type, tag);
                    i = match.EndIndex;
                    matched = true;
                    break;
                }
            }

            if (!matched)
            {
                // No alternative matched - advance by one token
                // This allows recovery from unrecognized tokens
                i++;
            }
        }
    }

    /// <summary>
    /// Simplified MatchAll that takes pattern strings directly.
    /// </summary>
    public static IEnumerable<MatchAllItem> MatchAll(
        IReadOnlyList<Token> tokens,
        int startIndex,
        params string[] patterns)
    {
        var alternatives = patterns.Select((p, i) =>
            (new PatternMatcher(p), TokenMatchType.Unknown, (string?)$"alt{i}")).ToArray();
        return MatchAll(tokens, startIndex, alternatives);
    }

    /// <summary>
    /// MatchAll with explicit types for common JSX child patterns.
    /// Handles JSX elements specially - extracts full element including children.
    /// </summary>
    public static IEnumerable<MatchAllItem> MatchAllJsxChildren(
        IReadOnlyList<Token> tokens,
        int startIndex = 0)
    {
        var elementMatcher = new PatternMatcher(@"\jo");
        var exprMatcher = new PatternMatcher(@"(\Bb)");
        var textMatcher = new PatternMatcher(@"\jt");

        int i = startIndex;

        while (i < tokens.Count)
        {
            // Skip whitespace
            while (i < tokens.Count && tokens[i].Type == TokenType.Whitespace)
                i++;

            if (i >= tokens.Count)
                break;

            // Try JSX element - if matched, extract FULL element and advance past it
            if (elementMatcher.TryMatch(tokens, i, out var elemMatch) && elemMatch != null)
            {
                // Extract the full JSX element (including children and closing tag)
                var fullElementTokens = ExtractJsxElementStatic(tokens, i);
                var fullMatch = new TokenMatch(
                    fullElementTokens,
                    elemMatch.Captures,
                    null,
                    i,
                    i + fullElementTokens.Length,
                    elemMatch.Pattern);
                yield return new MatchAllItem(fullMatch, 0, TokenMatchType.Element, "element");
                i += fullElementTokens.Length;
                continue;
            }

            // Try expression
            if (exprMatcher.TryMatch(tokens, i, out var exprMatch) && exprMatch != null)
            {
                yield return new MatchAllItem(exprMatch, 1, TokenMatchType.Expression, "expression");
                i = exprMatch.EndIndex;
                continue;
            }

            // Try text
            if (textMatcher.TryMatch(tokens, i, out var textMatch) && textMatch != null)
            {
                yield return new MatchAllItem(textMatch, 2, TokenMatchType.Text, "text");
                i = textMatch.EndIndex;
                continue;
            }

            // Skip unrecognized token
            i++;
        }
    }

    /// <summary>
    /// Extracts a complete JSX element including children (static version for use in MatchAll).
    /// </summary>
    private static Token[] ExtractJsxElementStatic(IReadOnlyList<Token> tokens, int start)
    {
        var result = new List<Token>();
        int depth = 0;

        for (int i = start; i < tokens.Count; i++)
        {
            var t = tokens[i];
            result.Add(t);

            if (t.Type == TokenType.JsxTagOpen && !t.Value.StartsWith("</"))
                depth++;
            else if (t.Type == TokenType.JsxTagSelfClose)
                depth--;
            else if (t.Type == TokenType.JsxTagClose)
                depth--;

            if (depth <= 0 && result.Count > 0)
            {
                // Include closing > if needed
                if (t.Type != TokenType.JsxTagEnd && i + 1 < tokens.Count && tokens[i + 1].Type == TokenType.JsxTagEnd)
                {
                    result.Add(tokens[i + 1]);
                }
                break;
            }
        }

        return result.ToArray();
    }

    private bool Match(PatternNode node, MatchContext ctx)
    {
        return node switch
        {
            SequenceNode seq => MatchSequence(seq, ctx),
            TokenMatchNode tm => MatchToken(tm, ctx),
            AnyNode _ => MatchAny(ctx),
            LiteralNode lit => MatchLiteral(lit, ctx),
            QuantifierNode quant => MatchQuantifier(quant, ctx),
            GroupNode group => MatchGroup(group, ctx),
            AlternationNode alt => MatchAlternation(alt, ctx),
            BackreferenceNode backref => MatchBackreference(backref, ctx),
            NamedBackreferenceNode namedBackref => MatchNamedBackreference(namedBackref, ctx),
            JsxCloseBackrefNode jsxClose => MatchJsxCloseBackref(jsxClose, ctx),
            JsxElementNode jsx => MatchJsxElement(jsx, ctx),
            JsxElementCompleteNode jsxComplete => MatchJsxElementComplete(jsxComplete, ctx),
            BalancedMatchNode balanced => MatchBalanced(balanced, ctx),
            BalancedUntilNode balancedUntil => MatchBalancedUntil(balancedUntil, ctx),
            BalancedJsxContentNode balancedJsx => MatchBalancedJsxContent(balancedJsx, ctx),
            LookaheadNode lookahead => MatchLookahead(lookahead, ctx),
            LookbehindNode lookbehind => MatchLookbehind(lookbehind, ctx),
            _ => false
        };
    }

    private bool MatchSequence(SequenceNode seq, MatchContext ctx)
    {
        return MatchSequenceAt(seq.Children, 0, ctx);
    }

    /// <summary>
    /// Matches a sequence starting at the given child index.
    /// This enables backtracking by allowing quantifiers to try different match counts.
    /// </summary>
    private bool MatchSequenceAt(IReadOnlyList<PatternNode> children, int childIndex, MatchContext ctx)
    {
        if (childIndex >= children.Count)
            return true; // All children matched

        var child = children[childIndex];
        var checkpoint = ctx.Checkpoint();

        // Extract the quantifier if it's wrapped in a group
        // e.g., (.*?) is GroupNode containing QuantifierNode
        QuantifierNode? innerQuant = null;
        GroupNode? wrapperGroup = null;

        if (child is QuantifierNode q)
        {
            innerQuant = q;
        }
        else if (child is GroupNode g && g.Child is QuantifierNode gq)
        {
            innerQuant = gq;
            wrapperGroup = g;
        }

        // For non-greedy quantifiers, we need special handling
        if (innerQuant != null && !innerQuant.Greedy)
        {
            // Create a continuation that matches the rest of the sequence
            Func<MatchContext, bool> continuation = c => MatchSequenceAt(children, childIndex + 1, c);
            return MatchNonGreedyWithContinuation(innerQuant, ctx, continuation, wrapperGroup);
        }

        // For greedy quantifiers with a following pattern, we may need to backtrack
        if (innerQuant != null && innerQuant.Greedy && childIndex + 1 < children.Count)
        {
            Func<MatchContext, bool> continuation = c => MatchSequenceAt(children, childIndex + 1, c);
            return MatchGreedyWithBacktrack(innerQuant, ctx, continuation, wrapperGroup);
        }

        // Standard matching for other nodes
        if (!Match(child, ctx))
        {
            ctx.Restore(checkpoint);
            return false;
        }

        // Match the rest of the sequence
        if (!MatchSequenceAt(children, childIndex + 1, ctx))
        {
            ctx.Restore(checkpoint);
            return false;
        }

        return true;
    }

    private bool MatchToken(TokenMatchNode tm, MatchContext ctx)
    {
        if (ctx.IsAtEnd) return false;

        var token = ctx.Current;

        if (token.Type != tm.TokenType)
            return false;

        if (tm.Value != null && token.Value != tm.Value)
            return false;

        // Track depth for JSX tags
        if (token.Type == TokenType.JsxTagOpen)
        {
            var tagName = ExtractTagName(token.Value);
            _tagStack.Push((tagName, _currentDepth));
            _currentDepth++;
        }
        else if (token.Type == TokenType.JsxTagClose)
        {
            _currentDepth--;
        }
        else if (token.Type == TokenType.JsxTagSelfClose)
        {
            // Self-closing doesn't change depth (opens and closes immediately)
            if (_tagStack.Count > 0) _tagStack.Pop();
        }

        ctx.Advance();
        return true;
    }

    private bool MatchAny(MatchContext ctx)
    {
        if (ctx.IsAtEnd || ctx.Current.Type == TokenType.Eof)
            return false;

        ctx.Advance();
        return true;
    }

    private bool MatchLiteral(LiteralNode lit, MatchContext ctx)
    {
        if (ctx.IsAtEnd) return false;

        if (ctx.Current.Value == lit.Value)
        {
            ctx.Advance();
            return true;
        }

        return false;
    }

    private bool MatchQuantifier(QuantifierNode quant, MatchContext ctx)
    {
        // This is called when quantifier is not part of a sequence
        // or when we don't need backtracking
        int matchCount = 0;

        // If collecting repetitions, enable collection mode for groups inside this quantifier
        var groupIndices = quant.CollectRepetitions ? FindGroupIndices(quant.Child).ToList() : null;
        var groupNames = quant.CollectRepetitions ? FindGroupNames(quant.Child) : null;

        if (quant.CollectRepetitions && groupIndices != null)
        {
            foreach (var idx in groupIndices)
            {
                _collectingGroups.Add(idx);
                _captureRepetitions[idx] = new List<Token[]>();
            }
        }

        try
        {
            if (quant.Greedy)
            {
                // Greedy: match as many as possible
                while (quant.Max < 0 || matchCount < quant.Max)
                {
                    var checkpoint = ctx.Checkpoint();
                    if (!Match(quant.Child, ctx) || ctx.Index == checkpoint.Index)
                    {
                        ctx.Restore(checkpoint);
                        break;
                    }
                    matchCount++;
                }
            }
            else
            {
                // Non-greedy: match minimum (backtracking handled by MatchNonGreedyWithContinuation)
                while (matchCount < quant.Min)
                {
                    if (!Match(quant.Child, ctx))
                        return false;
                    matchCount++;
                }
            }

            var success = matchCount >= quant.Min;

            // Finalize repetitions into TokenCapture objects
            if (success && quant.CollectRepetitions && groupIndices != null && groupNames != null)
            {
                FinalizeRepetitions(groupIndices, groupNames);
            }

            return success;
        }
        finally
        {
            // Remove groups from collecting mode
            if (quant.CollectRepetitions && groupIndices != null)
            {
                foreach (var idx in groupIndices)
                {
                    _collectingGroups.Remove(idx);
                }
            }
        }
    }

    /// <summary>
    /// Matches a non-greedy quantifier with backtracking.
    /// Tries matching minimum times first, then progressively more if continuation fails.
    /// </summary>
    private bool MatchNonGreedyWithContinuation(QuantifierNode quant, MatchContext ctx, Func<MatchContext, bool> continuation, GroupNode? wrapperGroup = null)
    {
        var checkpoint = ctx.Checkpoint();
        var startMatchCount = ctx.MatchedTokens.Count;
        int matchCount = 0;

        // First, match the minimum required times
        while (matchCount < quant.Min)
        {
            if (!Match(quant.Child, ctx))
            {
                ctx.Restore(checkpoint);
                return false;
            }
            matchCount++;
        }

        // Now try the continuation with progressively more matches
        while (true)
        {
            var tryCheckpoint = ctx.Checkpoint();

            // If there's a wrapper group, record the capture before trying continuation
            if (wrapperGroup != null && wrapperGroup.Capturing)
            {
                RecordCapture(wrapperGroup, ctx, startMatchCount);
            }

            // Try the continuation
            if (continuation(ctx))
                return true;

            // Continuation failed, restore and try matching one more time
            ctx.Restore(tryCheckpoint);

            // Check if we've hit the maximum
            if (quant.Max >= 0 && matchCount >= quant.Max)
            {
                ctx.Restore(checkpoint);
                return false;
            }

            // Try to match one more
            var beforeMatch = ctx.Checkpoint();
            if (!Match(quant.Child, ctx) || ctx.Index == beforeMatch.Index)
            {
                // Can't match more, give up
                ctx.Restore(checkpoint);
                return false;
            }
            matchCount++;
        }
    }

    /// <summary>
    /// Matches a greedy quantifier with backtracking.
    /// Matches as many as possible, then backs off if continuation fails.
    /// </summary>
    private bool MatchGreedyWithBacktrack(QuantifierNode quant, MatchContext ctx, Func<MatchContext, bool> continuation, GroupNode? wrapperGroup = null)
    {
        var checkpoint = ctx.Checkpoint();
        var startMatchCount = ctx.MatchedTokens.Count;

        // Collect all possible match points
        var matchPoints = new List<(int Index, int MatchCount)>();
        int matchCount = 0;

        // Match as many as possible, saving checkpoints along the way
        while (quant.Max < 0 || matchCount < quant.Max)
        {
            if (matchCount >= quant.Min)
            {
                matchPoints.Add(ctx.Checkpoint());
            }

            var beforeMatch = ctx.Checkpoint();
            if (!Match(quant.Child, ctx) || ctx.Index == beforeMatch.Index)
            {
                ctx.Restore(beforeMatch);
                break;
            }
            matchCount++;
        }

        // Add final position if it meets minimum
        if (matchCount >= quant.Min)
        {
            matchPoints.Add(ctx.Checkpoint());
        }

        // Try continuation from most matches to least (greedy behavior)
        for (int i = matchPoints.Count - 1; i >= 0; i--)
        {
            ctx.Restore(matchPoints[i]);

            // If there's a wrapper group, record the capture before trying continuation
            if (wrapperGroup != null && wrapperGroup.Capturing)
            {
                RecordCapture(wrapperGroup, ctx, startMatchCount);
            }

            if (continuation(ctx))
                return true;
        }

        // All attempts failed
        ctx.Restore(checkpoint);
        return false;
    }

    /// <summary>
    /// Records a capture for a group based on the tokens matched since startMatchCount.
    /// </summary>
    private void RecordCapture(GroupNode group, MatchContext ctx, int startMatchCount)
    {
        var capturedTokens = ctx.MatchedTokens.Skip(startMatchCount).ToArray();
        var capture = new TokenCapture(capturedTokens, group.Index, group.Name);

        // Ensure captures list is large enough
        while (_captures.Count <= group.Index)
            _captures.Add(new TokenCapture(Array.Empty<Token>(), _captures.Count));

        _captures[group.Index] = capture;

        if (group.Name != null)
        {
            _namedCaptures[group.Name] = capture;
        }
    }

    /// <summary>
    /// Finds all group indices within a pattern node (recursive).
    /// </summary>
    private static IEnumerable<int> FindGroupIndices(PatternNode node)
    {
        switch (node)
        {
            case GroupNode group:
                if (group.Capturing)
                    yield return group.Index;
                foreach (var idx in FindGroupIndices(group.Child))
                    yield return idx;
                break;
            case SequenceNode seq:
                foreach (var child in seq.Children)
                    foreach (var idx in FindGroupIndices(child))
                        yield return idx;
                break;
            case AlternationNode alt:
                foreach (var child in alt.Alternatives)
                    foreach (var idx in FindGroupIndices(child))
                        yield return idx;
                break;
            case QuantifierNode quant:
                foreach (var idx in FindGroupIndices(quant.Child))
                    yield return idx;
                break;
        }
    }

    /// <summary>
    /// Finalizes repetition data into TokenCapture objects after a collecting quantifier completes.
    /// </summary>
    private void FinalizeRepetitions(IEnumerable<int> groupIndices, Dictionary<int, string?> groupNames)
    {
        foreach (var groupIndex in groupIndices)
        {
            if (_captureRepetitions.TryGetValue(groupIndex, out var repetitions) && repetitions.Count > 0)
            {
                // Combine all tokens from all repetitions
                var allTokens = repetitions.SelectMany(r => r).ToArray();
                var name = groupNames.GetValueOrDefault(groupIndex);
                var capture = new TokenCapture(allTokens, groupIndex, name, repetitions);

                // Ensure captures list is large enough
                while (_captures.Count <= groupIndex)
                    _captures.Add(new TokenCapture(Array.Empty<Token>(), _captures.Count));

                _captures[groupIndex] = capture;

                if (name != null)
                {
                    _namedCaptures[name] = capture;
                }
            }
        }
    }

    /// <summary>
    /// Finds all group names within a pattern node.
    /// </summary>
    private static Dictionary<int, string?> FindGroupNames(PatternNode node)
    {
        var result = new Dictionary<int, string?>();
        CollectGroupNames(node, result);
        return result;
    }

    private static void CollectGroupNames(PatternNode node, Dictionary<int, string?> result)
    {
        switch (node)
        {
            case GroupNode group:
                if (group.Capturing)
                    result[group.Index] = group.Name;
                CollectGroupNames(group.Child, result);
                break;
            case SequenceNode seq:
                foreach (var child in seq.Children)
                    CollectGroupNames(child, result);
                break;
            case AlternationNode alt:
                foreach (var child in alt.Alternatives)
                    CollectGroupNames(child, result);
                break;
            case QuantifierNode quant:
                CollectGroupNames(quant.Child, result);
                break;
        }
    }

    private bool MatchGroup(GroupNode group, MatchContext ctx)
    {
        var startIndex = ctx.Index;
        var startMatchCount = ctx.MatchedTokens.Count;

        if (!Match(group.Child, ctx))
            return false;

        if (group.Capturing)
        {
            var capturedTokens = ctx.MatchedTokens.Skip(startMatchCount).ToArray();

            // Check if this group is being collected as repetitions
            if (_collectingGroups.Contains(group.Index))
            {
                // Add to repetitions list instead of overwriting
                if (!_captureRepetitions.ContainsKey(group.Index))
                    _captureRepetitions[group.Index] = new List<Token[]>();
                _captureRepetitions[group.Index].Add(capturedTokens);
            }
            else
            {
                // Normal capture - overwrite previous value
                var capture = new TokenCapture(capturedTokens, group.Index, group.Name);

                // Ensure captures list is large enough
                while (_captures.Count <= group.Index)
                    _captures.Add(new TokenCapture(Array.Empty<Token>(), _captures.Count));

                _captures[group.Index] = capture;

                if (group.Name != null)
                {
                    _namedCaptures[group.Name] = capture;
                }
            }
        }

        return true;
    }

    private bool MatchAlternation(AlternationNode alt, MatchContext ctx)
    {
        var checkpoint = ctx.Checkpoint();

        foreach (var alternative in alt.Alternatives)
        {
            if (Match(alternative, ctx))
                return true;

            ctx.Restore(checkpoint);
        }

        return false;
    }

    private bool MatchBackreference(BackreferenceNode backref, MatchContext ctx)
    {
        // Get the captured value
        if (backref.GroupIndex < 0 || backref.GroupIndex >= _captures.Count)
            return false;

        var capture = _captures[backref.GroupIndex];
        if (!capture.HasValue)
            return false;

        // Check depth constraint if present
        if (backref.Depth != null)
        {
            int targetDepth = backref.Depth.IsRelative
                ? _currentDepth + backref.Depth.Value
                : backref.Depth.Value;

            if (_currentDepth != targetDepth)
                return false;
        }

        // Match the captured value
        var expectedValue = capture.Value;
        if (ctx.IsAtEnd || ctx.Current.Value != expectedValue)
            return false;

        ctx.Advance();
        return true;
    }

    private bool MatchJsxCloseBackref(JsxCloseBackrefNode jsxClose, MatchContext ctx)
    {
        if (ctx.IsAtEnd) return false;

        var token = ctx.Current;
        if (token.Type != TokenType.JsxTagClose)
            return false;

        // Get the expected tag name from capture
        if (jsxClose.GroupIndex < 0 || jsxClose.GroupIndex >= _captures.Count)
            return false;

        var capture = _captures[jsxClose.GroupIndex];
        if (!capture.HasValue)
            return false;

        var expectedTagName = capture.Value;
        var actualTagName = ExtractTagName(token.Value);

        if (actualTagName != expectedTagName)
            return false;

        // Check depth constraint
        if (jsxClose.Depth != null)
        {
            int targetDepth = jsxClose.Depth.IsRelative
                ? _currentDepth + jsxClose.Depth.Value
                : jsxClose.Depth.Value;

            // For @0, we want depth to return to 0 after this close
            if (jsxClose.Depth.Value == 0 && !jsxClose.Depth.IsRelative)
            {
                // Closing this tag should bring us back to depth 0
                if (_currentDepth != 1) return false;
            }
            else if (_currentDepth != targetDepth)
            {
                return false;
            }
        }

        _currentDepth--;
        ctx.Advance();
        return true;
    }

    private bool MatchJsxElement(JsxElementNode jsx, MatchContext ctx)
    {
        var checkpoint = ctx.Checkpoint();
        var startDepth = _currentDepth;

        // Match opening tag <tagName
        if (ctx.IsAtEnd || ctx.Current.Type != TokenType.JsxTagOpen)
        {
            ctx.Restore(checkpoint);
            return false;
        }

        var openTag = ctx.Current;
        var tagName = ExtractTagName(openTag.Value);

        // Store tag name as capture
        if (jsx.TagNameCaptureIndex >= 0)
        {
            while (_captures.Count <= jsx.TagNameCaptureIndex)
                _captures.Add(new TokenCapture(Array.Empty<Token>(), _captures.Count));

            // Create a synthetic token for just the tag name
            var tagToken = new Token(TokenType.Identifier, tagName, openTag.Start, openTag.End, openTag.Line, openTag.Column);
            _captures[jsx.TagNameCaptureIndex] = new TokenCapture(new[] { tagToken }, jsx.TagNameCaptureIndex);
        }

        _tagStack.Push((tagName, _currentDepth));
        _currentDepth++;
        ctx.Advance();

        // Match attributes (if pattern specified)
        if (jsx.AttributesPattern != null)
        {
            if (!Match(jsx.AttributesPattern, ctx))
            {
                ctx.Restore(checkpoint);
                _currentDepth = startDepth;
                return false;
            }
        }
        else
        {
            // Skip any attributes until > or />
            while (!ctx.IsAtEnd &&
                   ctx.Current.Type != TokenType.JsxTagEnd &&
                   ctx.Current.Type != TokenType.JsxTagSelfClose)
            {
                ctx.Advance();
            }
        }

        // Check for self-closing tag
        if (!ctx.IsAtEnd && ctx.Current.Type == TokenType.JsxTagSelfClose)
        {
            _currentDepth--;
            if (_tagStack.Count > 0) _tagStack.Pop();
            ctx.Advance();
            return true;
        }

        // Expect >
        if (ctx.IsAtEnd || ctx.Current.Type != TokenType.JsxTagEnd)
        {
            ctx.Restore(checkpoint);
            _currentDepth = startDepth;
            return false;
        }
        ctx.Advance();

        // Match children with depth tracking
        var childrenStart = ctx.MatchedTokens.Count;
        int depth = 1; // We're inside the element

        while (!ctx.IsAtEnd && depth > 0)
        {
            var current = ctx.Current;

            if (current.Type == TokenType.JsxTagOpen)
            {
                depth++;
                ctx.Advance();
            }
            else if (current.Type == TokenType.JsxTagClose)
            {
                var closeTagName = ExtractTagName(current.Value);
                if (closeTagName == tagName && depth == 1)
                {
                    // This is our closing tag
                    break;
                }
                depth--;
                ctx.Advance();
            }
            else if (current.Type == TokenType.JsxTagSelfClose)
            {
                // Self-closing doesn't affect depth balance
                ctx.Advance();
            }
            else
            {
                ctx.Advance();
            }
        }

        // Capture children if requested
        if (jsx.CaptureChildren && jsx.ChildrenCaptureIndex >= 0)
        {
            var childTokens = ctx.MatchedTokens.Skip(childrenStart).ToArray();
            while (_captures.Count <= jsx.ChildrenCaptureIndex)
                _captures.Add(new TokenCapture(Array.Empty<Token>(), _captures.Count));
            _captures[jsx.ChildrenCaptureIndex] = new TokenCapture(childTokens, jsx.ChildrenCaptureIndex);
        }

        // Expect closing tag
        if (ctx.IsAtEnd || ctx.Current.Type != TokenType.JsxTagClose)
        {
            ctx.Restore(checkpoint);
            _currentDepth = startDepth;
            return false;
        }

        var closeTag = ctx.Current;
        var closeTagName2 = ExtractTagName(closeTag.Value);
        if (closeTagName2 != tagName)
        {
            ctx.Restore(checkpoint);
            _currentDepth = startDepth;
            return false;
        }

        _currentDepth--;
        if (_tagStack.Count > 0) _tagStack.Pop();
        ctx.Advance();

        return true;
    }

    /// <summary>
    /// Matches any complete JSX element from opening tag to closing tag.
    /// Used by \Je macro - simpler than JsxElementNode, just matches the whole element.
    /// </summary>
    private bool MatchJsxElementComplete(JsxElementCompleteNode jsxComplete, MatchContext ctx)
    {
        var checkpoint = ctx.Checkpoint();
        var contentStartMatchCount = ctx.MatchedTokens.Count;

        // Must start with JSX opening tag
        if (ctx.IsAtEnd || ctx.Current.Type != TokenType.JsxTagOpen)
            return false;

        // Check for closing tag (not what we want)
        if (ctx.Current.Value.StartsWith("</"))
            return false;

        int depth = 0;

        while (!ctx.IsAtEnd)
        {
            var current = ctx.Current;

            if (current.Type == TokenType.JsxTagOpen && !current.Value.StartsWith("</"))
            {
                depth++;
                ctx.Advance();
            }
            else if (current.Type == TokenType.JsxTagSelfClose)
            {
                depth--;
                ctx.Advance();
                if (depth <= 0) break;
            }
            else if (current.Type == TokenType.JsxTagClose)
            {
                depth--;
                ctx.Advance();
                // Include the closing >
                if (!ctx.IsAtEnd && ctx.Current.Type == TokenType.JsxTagEnd)
                    ctx.Advance();
                if (depth <= 0) break;
            }
            else
            {
                ctx.Advance();
            }
        }

        // Must have matched at least one token and balanced out
        if (ctx.MatchedTokens.Count == contentStartMatchCount || depth > 0)
        {
            ctx.Restore(checkpoint);
            return false;
        }

        // Capture content if requested
        if (jsxComplete.CaptureContent && jsxComplete.CaptureIndex >= 0)
        {
            var contentTokens = ctx.MatchedTokens
                .Skip(contentStartMatchCount)
                .ToArray();

            while (_captures.Count <= jsxComplete.CaptureIndex)
                _captures.Add(new TokenCapture(Array.Empty<Token>(), _captures.Count));

            _captures[jsxComplete.CaptureIndex] = new TokenCapture(contentTokens, jsxComplete.CaptureIndex);
        }

        return true;
    }

    /// <summary>
    /// Matches JSX content between > (tag end) and the matching closing tag.
    /// Used by \Bj macro - assumes we're positioned right after the opening tag's >.
    /// Tracks depth to find the matching closing tag.
    /// </summary>
    private bool MatchBalancedJsxContent(BalancedJsxContentNode balancedJsx, MatchContext ctx)
    {
        var checkpoint = ctx.Checkpoint();
        var contentStartMatchCount = ctx.MatchedTokens.Count;

        // Start at depth 1 (we're inside one open tag)
        int depth = 1;

        while (!ctx.IsAtEnd && depth > 0)
        {
            var current = ctx.Current;

            // Opening tag (not closing tag) - increases depth
            if (current.Type == TokenType.JsxTagOpen && !current.Value.StartsWith("</"))
            {
                depth++;
                ctx.Advance();
            }
            // Self-closing tag /> - decreases depth
            else if (current.Type == TokenType.JsxTagSelfClose)
            {
                depth--;
                if (depth <= 0) break; // Don't consume - we're done
                ctx.Advance();
            }
            // Closing tag </foo> - decreases depth
            else if (current.Type == TokenType.JsxTagClose ||
                    (current.Type == TokenType.JsxTagOpen && current.Value.StartsWith("</")))
            {
                depth--;
                if (depth <= 0) break; // Don't consume the closing tag - it's not part of content
                ctx.Advance();
                // Also consume the trailing > if present
                if (!ctx.IsAtEnd && ctx.Current.Type == TokenType.JsxTagEnd)
                    ctx.Advance();
            }
            else
            {
                ctx.Advance();
            }
        }

        // Must have matched at least some content or ended at depth 0
        if (depth > 0)
        {
            ctx.Restore(checkpoint);
            return false;
        }

        // Capture content if requested
        if (balancedJsx.CaptureContent && balancedJsx.CaptureIndex >= 0)
        {
            var contentTokens = ctx.MatchedTokens
                .Skip(contentStartMatchCount)
                .ToArray();

            while (_captures.Count <= balancedJsx.CaptureIndex)
                _captures.Add(new TokenCapture(Array.Empty<Token>(), _captures.Count));

            _captures[balancedJsx.CaptureIndex] = new TokenCapture(contentTokens, balancedJsx.CaptureIndex);
        }

        return true;
    }

    private bool MatchBalanced(BalancedMatchNode balanced, MatchContext ctx)
    {
        var checkpoint = ctx.Checkpoint();

        // Match open pattern
        if (!Match(balanced.OpenPattern, ctx))
            return false;

        // Track the opening for backreference
        string? openValue = null;
        if (balanced.CloseBackref.HasValue && balanced.CloseBackref.Value < _captures.Count)
        {
            openValue = _captures[balanced.CloseBackref.Value].Value;
        }

        int depth = 1;
        var contentStartIndex = ctx.Index; // Index in the token stream
        var contentStartMatchCount = ctx.MatchedTokens.Count;

        // Match content until balanced close
        while (!ctx.IsAtEnd && depth > 0)
        {
            var innerCheckpoint = ctx.Checkpoint();

            // IMPORTANT: Skip over JSX expressions entirely when matching balanced brackets.
            // Content inside JSX expressions (e.g., {() => foo()}) should not affect
            // the bracket counting for the outer balanced match.
            if (ctx.Current.Type == TokenType.JsxExprStart)
            {
                if (!SkipJsxExpression(ctx))
                    break;
                continue;
            }

            // Skip JSX text tokens entirely - they should not affect bracket counting.
            // Text like "Toggle (currently: ...)" contains parens but they're not real brackets.
            if (ctx.Current.Type == TokenType.JsxText)
            {
                ctx.Advance();
                continue;
            }

            // Match open/close patterns for Punctuation tokens and JSX expression tokens.
            // This prevents matching brackets inside string literals, comments, etc.
            // but allows matching { } as JsxExprStart/JsxExprEnd for attribute expressions.
            if (ctx.Current.Type == TokenType.Punctuation ||
                ctx.Current.Type == TokenType.JsxExprStart ||
                ctx.Current.Type == TokenType.JsxExprEnd)
            {
                // Try to match close pattern
                if (Match(balanced.ClosePattern, ctx))
                {
                    depth--;
                    if (depth == 0) break;
                    continue;
                }
                ctx.Restore(innerCheckpoint);

                // Try to match open pattern (nested)
                if (Match(balanced.OpenPattern, ctx))
                {
                    depth++;
                    continue;
                }
                ctx.Restore(innerCheckpoint);
            }

            // Match any token
            if (!MatchAny(ctx))
                break;
        }

        if (depth != 0)
            return false;

        // Capture content if requested (excluding delimiters)
        if (balanced.CaptureContent && balanced.CaptureIndex >= 0)
        {
            // Content is everything between open and close (excluding both)
            // We need to get tokens from contentStartMatchCount to (current - 1) since last token is close
            var contentTokens = ctx.MatchedTokens
                .Skip(contentStartMatchCount)
                .Take(ctx.MatchedTokens.Count - contentStartMatchCount - 1) // -1 to exclude closing delimiter
                .ToArray();

            var capture = new TokenCapture(contentTokens, balanced.CaptureIndex);

            // Ensure captures list is large enough
            while (_captures.Count <= balanced.CaptureIndex)
                _captures.Add(new TokenCapture(Array.Empty<Token>(), _captures.Count));

            _captures[balanced.CaptureIndex] = capture;
        }

        return true;
    }

    /// <summary>
    /// Matches content until a separator is found at depth 0.
    /// Tracks bracket depth for (, ), {, }, [, ].
    /// Used for \Bc (balanced until comma) - matches value in key: value, pairs.
    /// </summary>
    private bool MatchBalancedUntil(BalancedUntilNode balancedUntil, MatchContext ctx)
    {
        var checkpoint = ctx.Checkpoint();
        var contentStartMatchCount = ctx.MatchedTokens.Count;
        int depth = 0;

        while (!ctx.IsAtEnd)
        {
            var innerCheckpoint = ctx.Checkpoint();
            var current = ctx.Current;

            // Track bracket depth
            if (current.Type == TokenType.Punctuation)
            {
                if (current.Value is "(" or "{" or "[")
                    depth++;
                else if (current.Value is ")" or "}" or "]")
                {
                    depth--;
                    // If depth goes negative, we've hit a terminator - stop without consuming
                    if (depth < 0)
                        break;
                }
            }

            // At depth 0, check for separator
            if (depth == 0)
            {
                // Check for separator pattern
                if (Match(balancedUntil.SeparatorPattern, ctx))
                {
                    // Restore to before separator - we don't consume it
                    ctx.Restore(innerCheckpoint);
                    break;
                }
                ctx.Restore(innerCheckpoint);

                // Check for terminator patterns
                foreach (var terminator in balancedUntil.TerminatorPatterns)
                {
                    if (Match(terminator, ctx))
                    {
                        // Restore to before terminator - we don't consume it
                        ctx.Restore(innerCheckpoint);
                        goto done;
                    }
                    ctx.Restore(innerCheckpoint);
                }
            }

            // Consume current token
            ctx.Advance();
        }

        done:

        // Must have matched at least one token
        if (ctx.MatchedTokens.Count == contentStartMatchCount)
        {
            ctx.Restore(checkpoint);
            return false;
        }

        // Capture content if requested
        if (balancedUntil.CaptureContent && balancedUntil.CaptureIndex >= 0)
        {
            var contentTokens = ctx.MatchedTokens
                .Skip(contentStartMatchCount)
                .ToArray();

            var capture = new TokenCapture(contentTokens, balancedUntil.CaptureIndex);

            while (_captures.Count <= balancedUntil.CaptureIndex)
                _captures.Add(new TokenCapture(Array.Empty<Token>(), _captures.Count));

            _captures[balancedUntil.CaptureIndex] = capture;
        }

        return true;
    }

    /// <summary>
    /// Skips over a JSX expression from { to matching }.
    /// This handles nested braces within the expression.
    /// </summary>
    private bool SkipJsxExpression(MatchContext ctx)
    {
        if (ctx.Current.Type != TokenType.JsxExprStart)
            return false;

        ctx.Advance(); // consume {
        int depth = 1;

        while (!ctx.IsAtEnd && depth > 0)
        {
            if (ctx.Current.Type == TokenType.JsxExprStart ||
                (ctx.Current.Type == TokenType.Punctuation && ctx.Current.Value == "{"))
            {
                depth++;
            }
            else if (ctx.Current.Type == TokenType.JsxExprEnd ||
                     (ctx.Current.Type == TokenType.Punctuation && ctx.Current.Value == "}"))
            {
                depth--;
            }
            ctx.Advance();
        }

        return depth == 0;
    }

    /// <summary>
    /// Matches a lookahead assertion: (?=...) or (?!...)
    /// Lookahead checks if the pattern matches at the current position
    /// WITHOUT consuming any tokens.
    /// </summary>
    private bool MatchLookahead(LookaheadNode lookahead, MatchContext ctx)
    {
        // Save current state
        var checkpoint = ctx.Checkpoint();

        // Try to match the child pattern
        bool matched = Match(lookahead.Child, ctx);

        // Restore to original position (lookahead never consumes input)
        ctx.Restore(checkpoint);

        // For positive lookahead (?=...), we succeed if child matched
        // For negative lookahead (?!...), we succeed if child did NOT match
        return lookahead.Positive ? matched : !matched;
    }

    /// <summary>
    /// Matches a lookbehind assertion: (?&lt;=...) or (?&lt;!...)
    /// Lookbehind checks if the pattern matches BEFORE the current position
    /// WITHOUT consuming any tokens.
    /// </summary>
    private bool MatchLookbehind(LookbehindNode lookbehind, MatchContext ctx)
    {
        // For lookbehind, we need to check if the pattern matches
        // in the tokens that have already been matched
        var matchedTokens = ctx.MatchedTokens;

        if (matchedTokens.Count == 0)
        {
            // No tokens have been matched yet
            // Positive lookbehind fails (nothing to look behind at)
            // Negative lookbehind succeeds (nothing doesn't match the pattern)
            return !lookbehind.Positive;
        }

        // Create a temporary context with just the matched tokens
        // and try to match the lookbehind pattern at the end
        var tempTokens = matchedTokens.ToList();

        // Try matching the lookbehind pattern ending at each position
        // from the end, to find a match
        for (int startPos = tempTokens.Count - 1; startPos >= 0; startPos--)
        {
            var tempCtx = new LookbehindContext(tempTokens, startPos);
            bool matched = MatchInLookbehind(lookbehind.Child, tempCtx);

            // Check if the match consumed exactly the remaining tokens
            if (matched && tempCtx.Index == tempTokens.Count)
            {
                // Found a match ending at the current position
                return lookbehind.Positive;
            }
        }

        // No match found
        return !lookbehind.Positive;
    }

    /// <summary>
    /// Match in lookbehind context - uses a separate context that doesn't affect main state.
    /// </summary>
    private bool MatchInLookbehind(PatternNode node, LookbehindContext ctx)
    {
        return node switch
        {
            SequenceNode seq => MatchSequenceInLookbehind(seq, ctx),
            TokenMatchNode tm => MatchTokenInLookbehind(tm, ctx),
            AnyNode _ => MatchAnyInLookbehind(ctx),
            LiteralNode lit => MatchLiteralInLookbehind(lit, ctx),
            AlternationNode alt => MatchAlternationInLookbehind(alt, ctx),
            GroupNode group => MatchGroupInLookbehind(group, ctx),
            _ => false
        };
    }

    private bool MatchSequenceInLookbehind(SequenceNode seq, LookbehindContext ctx)
    {
        foreach (var child in seq.Children)
        {
            if (!MatchInLookbehind(child, ctx))
                return false;
        }
        return true;
    }

    private bool MatchTokenInLookbehind(TokenMatchNode tm, LookbehindContext ctx)
    {
        if (ctx.IsAtEnd) return false;
        var token = ctx.Current;
        if (token.Type != tm.TokenType) return false;
        if (tm.Value != null && token.Value != tm.Value) return false;
        ctx.Advance();
        return true;
    }

    private bool MatchAnyInLookbehind(LookbehindContext ctx)
    {
        if (ctx.IsAtEnd || ctx.Current.Type == TokenType.Eof) return false;
        ctx.Advance();
        return true;
    }

    private bool MatchLiteralInLookbehind(LiteralNode lit, LookbehindContext ctx)
    {
        if (ctx.IsAtEnd) return false;
        if (ctx.Current.Value == lit.Value)
        {
            ctx.Advance();
            return true;
        }
        return false;
    }

    private bool MatchAlternationInLookbehind(AlternationNode alt, LookbehindContext ctx)
    {
        int savePos = ctx.Index;
        foreach (var alternative in alt.Alternatives)
        {
            ctx.Index = savePos;
            if (MatchInLookbehind(alternative, ctx))
                return true;
        }
        ctx.Index = savePos;
        return false;
    }

    private bool MatchGroupInLookbehind(GroupNode group, LookbehindContext ctx)
    {
        return MatchInLookbehind(group.Child, ctx);
    }

    /// <summary>
    /// Matches a named backreference: \k&lt;name&gt;
    /// </summary>
    private bool MatchNamedBackreference(NamedBackreferenceNode namedBackref, MatchContext ctx)
    {
        // Get the captured value by name
        if (!_namedCaptures.TryGetValue(namedBackref.Name, out var capture))
            return false;

        if (!capture.HasValue)
            return false;

        // Match the captured value
        var expectedValue = capture.Value;
        if (ctx.IsAtEnd || ctx.Current.Value != expectedValue)
            return false;

        ctx.Advance();
        return true;
    }

    /// <summary>
    /// Simple context for lookbehind matching.
    /// </summary>
    private class LookbehindContext
    {
        private readonly IReadOnlyList<Token> _tokens;
        public int Index { get; set; }

        public LookbehindContext(IReadOnlyList<Token> tokens, int startIndex)
        {
            _tokens = tokens;
            Index = startIndex;
        }

        public bool IsAtEnd => Index >= _tokens.Count;
        public Token Current => _tokens[Index];
        public void Advance() { if (!IsAtEnd) Index++; }
    }

    private static string ExtractTagName(string tagValue)
    {
        // Extract tag name from "<tagName" or "</tagName>"
        var value = tagValue.TrimStart('<', '/').TrimEnd('>');
        return value;
    }

    /// <summary>
    /// Context for tracking match state with checkpoint/restore support.
    /// </summary>
    private class MatchContext
    {
        private readonly IReadOnlyList<Token> _tokens;
        private readonly bool _skipWhitespace;
        public int Index { get; private set; }
        public List<Token> MatchedTokens { get; } = new();

        public MatchContext(IReadOnlyList<Token> tokens, int startIndex, bool skipWhitespace = false)
        {
            _tokens = tokens;
            _skipWhitespace = skipWhitespace;
            Index = startIndex;
            // Skip initial whitespace if flag is set
            if (_skipWhitespace)
                SkipWhitespace();
        }

        public bool IsAtEnd => Index >= _tokens.Count;
        public Token Current => _tokens[Index];

        public void Advance()
        {
            if (!IsAtEnd)
            {
                MatchedTokens.Add(_tokens[Index]);
                Index++;
                // Skip whitespace after advancing if flag is set
                if (_skipWhitespace)
                    SkipWhitespace();
            }
        }

        /// <summary>
        /// Skips whitespace tokens without adding them to MatchedTokens.
        /// </summary>
        private void SkipWhitespace()
        {
            while (Index < _tokens.Count && _tokens[Index].Type == TokenType.Whitespace)
            {
                Index++;
            }
        }

        public (int Index, int MatchCount) Checkpoint() => (Index, MatchedTokens.Count);

        public void Restore((int Index, int MatchCount) checkpoint)
        {
            Index = checkpoint.Index;
            while (MatchedTokens.Count > checkpoint.MatchCount)
                MatchedTokens.RemoveAt(MatchedTokens.Count - 1);
        }
    }
}
