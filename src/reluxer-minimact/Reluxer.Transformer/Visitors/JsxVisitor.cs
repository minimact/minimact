using Reluxer.Attributes;
using Reluxer.Matching;
using Reluxer.Tokens;
using Reluxer.Transformer.Models;
using Reluxer.Visitor;

namespace Reluxer.Transformer.Visitors;

/// <summary>
/// Visitor that transforms JSX elements into VNode tree structure.
/// Uses declarative [TokenPattern] attributes - NO manual depth tracking.
/// </summary>
public class JsxVisitor : TokenVisitor
{
    private readonly ComponentModel _component;
    private Token[]? _componentBody;
    private int _handlerCounter;
    private string _currentPath = "1";

    // Result storage for nested pattern matching
    private VNodeModel? _currentResult;

    public JsxVisitor(ComponentModel component)
    {
        _component = component;
    }

    public override void OnBegin(IReadOnlyList<Token> tokens)
    {
        _componentBody = Context.Get<Token[]>($"ComponentBody:{_component.Name}");
        _handlerCounter = 0;

        if (_componentBody != null && _componentBody.Length > 0)
        {
            _currentPath = "1";
            Traverse(_componentBody, nameof(VisitReturnStatement));
        }
    }

    #region Return Statement Patterns

    // Pattern: return ( ... ) - balanced paren captures JSX content
    [TokenPattern(@"\k""return"" (\Bp)", Priority = 100)]
    public void VisitReturnStatement(TokenMatch match, Token[] jsxContent)
    {
        if (jsxContent.Length == 0) return;

        _currentPath = "1";
        var rootNode = ParseJsxTree(jsxContent, _currentPath);
        _component.RenderTree = rootNode;
    }

    #endregion

    #region JSX Tree Parsing

    /// <summary>
    /// Main entry point for parsing a JSX token array into a VNode tree.
    /// Uses pattern-based dispatch for each construct.
    /// </summary>
    private VNodeModel? ParseJsxTree(Token[] tokens, string path)
    {
        if (tokens.Length == 0) return null;

        // Filter out leading/trailing whitespace
        var trimmed = tokens.SkipWhile(t => t.Type == TokenType.Whitespace)
                           .Reverse()
                           .SkipWhile(t => t.Type == TokenType.Whitespace)
                           .Reverse()
                           .ToArray();

        if (trimmed.Length == 0) return null;

        // Dispatch based on first significant token
        var first = trimmed[0];

        // JSX Element: <tag ...>
        if (first.Type == TokenType.JsxTagOpen)
        {
            return ParseJsxElement(trimmed, path);
        }

        // JSX Expression: { ... }
        if (first.Value == "{")
        {
            // Extract content inside braces and parse as expression
            _currentResult = null;
            _currentPath = path;
            Traverse(trimmed, nameof(VisitBracedExpression));
            return _currentResult;
        }

        // JSX Text
        if (first.Type == TokenType.JsxText)
        {
            var text = first.Value.Trim();
            if (string.IsNullOrWhiteSpace(text)) return null;
            return new VTextModel { HexPath = path, Text = text, IsDynamic = false };
        }

        return null;
    }

    /// <summary>
    /// Parses a JSX element: <tag attrs>children</tag> or <tag attrs />
    /// </summary>
    private VNodeModel? ParseJsxElement(Token[] tokens, string path)
    {
        // Use pattern matcher to extract JSX tag open
        var tagMatcher = new PatternMatcher(@"(\jo)", skipWhitespace: true);
        if (!tagMatcher.TryMatch(tokens, 0, out var tagMatch) || tagMatch == null)
            return null;

        var tagName = tagMatch.Captures[0].Tokens[0].Value.TrimStart('<').TrimEnd('>');

        // Component reference (PascalCase)
        if (char.IsUpper(tagName[0]))
        {
            return ParseComponentReference(tokens, tagName, path);
        }

        var element = new VElementModel { TagName = tagName, HexPath = path };

        // Extract just the opening tag (up to first > or />)
        var openingTagTokens = ExtractOpeningTag(tokens);

        // Use pattern to extract attributes and determine tag type
        _currentResult = element;
        _currentPath = path;
        Traverse(openingTagTokens, nameof(VisitStringAttribute), nameof(VisitExpressionAttribute), nameof(VisitSelfClosingTag), nameof(VisitOpeningTagEnd));

        // Find children if not self-closing
        if (!element.IsSelfClosing)
        {
            ParseElementChildren(tokens, element, path);
        }

        return element;
    }

    private VNodeModel? ParseComponentReference(Token[] tokens, string componentName, string path)
    {
        var wrapper = new VComponentWrapperModel
        {
            ComponentName = componentName,
            ComponentType = componentName,
            HexPath = path
        };

        // Extract opening tag tokens
        var openingTag = ExtractOpeningTag(tokens);

        // Manually parse props from opening tag
        ParseComponentProps(openingTag, wrapper);

        return wrapper;
    }

    private void ParseComponentProps(Token[] tokens, VComponentWrapperModel wrapper)
    {
        // Use MatchAll to find patterns anywhere in the token stream
        // Pattern: name="value" attribute
        var nameMatcher = new PatternMatcher(@"\ja""name"" ""="" (\jv)", skipWhitespace: true);
        var nameMatches = PatternMatcher.MatchAll(tokens, 0, (nameMatcher, TokenMatchType.Unknown, "name"));
        foreach (var item in nameMatches)
        {
            if (item.Match.Captures.Length > 0)
            {
                var value = item.Match.Captures[0].Tokens[0].Value.Trim('"', '\'');
                wrapper.ComponentName = value;
                wrapper.ComponentType = value;
                break;
            }
        }

        // Pattern: state={{ ... }} attribute
        // Tokens: [JsxAttrName]state [Operator]= [JsxExprStart]{ [Punctuation]{ ... } [JsxExprEnd]}
        var stateMatcher = new PatternMatcher(@"\ja""state"" ""="" ""{""  (\Bb)  ""}""", skipWhitespace: true);
        var stateMatches = PatternMatcher.MatchAll(tokens, 0, (stateMatcher, TokenMatchType.Unknown, "state"));
        foreach (var item in stateMatches)
        {
            if (item.Match.Captures.Length > 0)
            {
                ParseComponentState(item.Match.Captures[0].Tokens, wrapper);
                break;
            }
        }
    }

    private void ParseElementChildren(Token[] tokens, VElementModel element, string path)
    {
        // Find > (JsxTagEnd) then use \Bj to capture content until closing tag
        int tagEndIdx = Array.FindIndex(tokens, t => t.Type == TokenType.JsxTagEnd);
        if (tagEndIdx < 0) return;

        // Use \Bj pattern starting right after the >
        var contentMatcher = new PatternMatcher(@"(\Bj)");
        if (contentMatcher.TryMatch(tokens, tagEndIdx + 1, out var match) && match?.Captures.Length > 0)
        {
            var childTokens = match.Captures[0].Tokens;
            ParseChildren(childTokens, element, path);
        }
    }

    private void ParseChildren(Token[] tokens, VElementModel parent, string parentPath)
    {
        // Declarative child parsing using MatchAll
        // Collect all children first, then merge adjacent text/expressions
        var rawChildren = new List<(TokenMatchType Type, string? Text, string? Binding, Token[]? Tokens, int StartIndex)>();

        foreach (var item in PatternMatcher.MatchAllJsxChildren(tokens))
        {
            switch (item.Type)
            {
                case TokenMatchType.Element:
                    // Elements break text runs - flush any pending text first
                    rawChildren.Add((TokenMatchType.Element, null, null, null, item.Match.StartIndex));
                    break;

                case TokenMatchType.Expression:
                    var exprContent = item.Captures.Length > 0 ? item.Captures[0].Tokens : Array.Empty<Token>();
                    // Skip JSX comments using token check
                    if (exprContent.Length >= 2 &&
                        exprContent[0].Type == TokenType.Comment)
                        break;
                    // Skip empty
                    if (exprContent.Length == 0)
                        break;
                    rawChildren.Add((TokenMatchType.Expression, null, null, exprContent, item.Match.StartIndex));
                    break;

                case TokenMatchType.Text:
                    var text = item.Tokens[0].Value;
                    // Keep whitespace-only text for merging context, filter later
                    rawChildren.Add((TokenMatchType.Text, text, null, null, item.Match.StartIndex));
                    break;
            }
        }

        // Now merge adjacent text/expression runs into single interpolated strings
        int childIndex = 1;
        int i = 0;
        while (i < rawChildren.Count)
        {
            var current = rawChildren[i];

            if (current.Type == TokenMatchType.Element)
            {
                // Use \Je pattern to get full element tokens
                var jeMatcher = new PatternMatcher(@"(\Je)");
                if (jeMatcher.TryMatch(tokens, current.StartIndex, out var jeMatch) && jeMatch != null)
                {
                    var child = ParseJsxTree(jeMatch.MatchedTokens, $"{parentPath}.{childIndex}");
                    if (child != null)
                    {
                        child.Parent = parent;
                        parent.Children.Add(child);
                        childIndex++;
                    }
                }
                i++;
            }
            else
            {
                // Collect consecutive text/expression items
                var textParts = new List<string>();
                var exprTokensList = new List<Token[]>();
                bool hasExpression = false;
                VNodeModel? mapExprResult = null;

                // Pattern to detect .map() calls anywhere in the expression
                var mapMatcher = new PatternMatcher(@"""."" ""map"" ""(""", skipWhitespace: true);

                while (i < rawChildren.Count && rawChildren[i].Type != TokenMatchType.Element)
                {
                    var item = rawChildren[i];
                    if (item.Type == TokenMatchType.Text)
                    {
                        textParts.Add(item.Text ?? "");
                    }
                    else if (item.Type == TokenMatchType.Expression && item.Tokens != null)
                    {
                        hasExpression = true;
                        var exprTokens = item.Tokens;

                        // Check if this expression contains a .map() call anywhere
                        var hasMapCall = mapMatcher.FindFirst(exprTokens) != null;
                        if (hasMapCall && mapExprResult == null)
                        {
                            mapExprResult = TryParseMapCall(exprTokens, $"{parentPath}.{childIndex}");
                        }

                        if (mapExprResult == null)
                        {
                            // Transform JS tokens to C# and wrap in interpolation
                            var converted = JsToCSharpVisitor.TransformToString(exprTokens);
                            textParts.Add($"{{({converted})}}");
                            exprTokensList.Add(exprTokens);
                        }
                    }
                    i++;
                }

                // If we got a map expression result, add it as a child
                if (mapExprResult != null)
                {
                    mapExprResult.Parent = parent;
                    parent.Children.Add(mapExprResult);
                    childIndex++;
                }
                else
                {
                    // Build merged text (already transformed)
                    var mergedText = string.Join("", textParts).Trim();
                    if (mergedText.Length > 0)
                    {
                        var child = new VTextModel
                        {
                            HexPath = $"{parentPath}.{childIndex}",
                            Text = hasExpression ? "{0}" : mergedText,
                            IsDynamic = hasExpression,
                            Binding = hasExpression ? mergedText : null,
                            // For single expression, store tokens for potential further use
                            BindingTokens = exprTokensList.Count == 1 ? exprTokensList[0] : null
                        };
                        child.Parent = parent;
                        parent.Children.Add(child);
                        childIndex++;
                    }
                }
            }
        }
    }

    /// <summary>
    /// Re-tokenizes an expression string to get tokens for pattern matching.
    /// Used when we need to parse an expression that was already extracted as a string.
    /// </summary>
    private Token[] TokenizeExpression(string expr)
    {
        var lexer = new Reluxer.Lexer.TsxLexer(expr);
        return lexer.Tokenize().Where(t =>
            t.Type != TokenType.Whitespace &&
            t.Type != TokenType.Comment &&
            t.Type != TokenType.Eof).ToArray();
    }

    #endregion

    #region Expression Patterns

    // Pattern: { ... } - braced expression, dispatch to expression parser
    // Uses \Bb for balanced brace matching to handle nested braces correctly
    [TokenPattern(@"(\Bb)", Priority = 100)]
    public void VisitBracedExpression(TokenMatch match, Token[] content)
    {
        _currentResult = ParseExpression(content, _currentPath);
    }

    /// <summary>
    /// Parse a JSX expression. Uses pattern matching to identify the expression type.
    /// </summary>
    private VNodeModel? ParseExpression(Token[] tokens, string path)
    {
        if (tokens.Length == 0) return null;

        // Filter whitespace and comments
        var significant = tokens.Where(t =>
            t.Type != TokenType.Whitespace &&
            t.Type != TokenType.Comment).ToArray();
        if (significant.Length == 0) return null;

        // Skip JSX comments: {/* ... */}
        var fullText = TokensToString(tokens).Trim();
        if (fullText.StartsWith("/*") && fullText.EndsWith("*/"))
            return null;

        // Try each expression pattern in priority order
        VNodeModel? result = null;

        // 1. Ternary: condition ? trueExpr : falseExpr
        result = TryParseTernary(tokens, path);
        if (result != null) return result;

        // 2. && Conditional: condition && element
        result = TryParseAndConditional(tokens, path);
        if (result != null) return result;

        // 3. .map() call: array.map(callback)
        result = TryParseMapCall(tokens, path);
        if (result != null) return result;

        // 4. Simple binding expression
        return new VTextModel
        {
            HexPath = path,
            Text = "{0}",
            IsDynamic = true,
            Binding = TokensToString(tokens),
            BindingTokens = tokens
        };
    }

    #endregion

    #region Ternary Expression - Pattern Based

    /// <summary>
    /// Tries to parse a ternary expression using pattern matching.
    /// Pattern: (condition) ? (trueExpr) : (falseExpr)
    /// </summary>
    private VNodeModel? TryParseTernary(Token[] tokens, string path)
    {
        // Use PatternMatcher to find ternary structure
        // The pattern captures: condition, true branch, false branch
        // We need balanced matching that handles nested ternaries

        var matcher = new PatternMatcher(@"(.*?) \qm (.*?) \co (.*)");
        if (!matcher.TryMatch(tokens, 0, out var match) || match == null)
            return null;

        // Verify this is a valid ternary (? and : at depth 0)
        if (match.Captures.Length < 3)
            return null;

        var conditionTokens = match.Captures[0].Tokens;
        var trueTokens = match.Captures[1].Tokens;
        var falseTokens = match.Captures[2].Tokens;

        // Validate: ? must be at depth 0 in condition
        if (!IsOperatorAtDepthZero(tokens, "?"))
            return null;

        // Handle nested ternaries by finding the balanced :
        var (trueBranch, falseBranch) = SplitTernaryBranches(tokens);
        if (trueBranch == null) return null;

        var condition = ExtractCondition(tokens);

        var trueNode = ParseBranch(trueBranch, $"{path}.1");
        var falseNode = ParseBranch(falseBranch ?? Array.Empty<Token>(), $"{path}.2");

        return new VConditionalModel
        {
            HexPath = path,
            Condition = TokensToString(condition),
            TrueNode = trueNode,
            FalseNode = falseNode ?? new VNullModel { HexPath = path },
            IsSimpleAnd = false
        };
    }

    private bool IsOperatorAtDepthZero(Token[] tokens, string op)
    {
        int depth = 0;
        foreach (var t in tokens)
        {
            if (t.Value == "(" || t.Value == "{" || t.Value == "[") depth++;
            else if (t.Value == ")" || t.Value == "}" || t.Value == "]") depth--;
            else if (depth == 0 && t.Value == op) return true;
        }
        return false;
    }

    private Token[] ExtractCondition(Token[] tokens)
    {
        // Use a functional approach: find first ? at depth 0
        int depth = 0;
        int idx = Array.FindIndex(tokens, t =>
        {
            if (t.Value == "(" || t.Value == "{" || t.Value == "[") { depth++; return false; }
            if (t.Value == ")" || t.Value == "}" || t.Value == "]") { depth--; return false; }
            return depth == 0 && (t.Value == "?" || t.Type == TokenType.QuestionMark);
        });
        return idx >= 0 ? tokens.Take(idx).ToArray() : tokens;
    }

    private (Token[]? trueBranch, Token[]? falseBranch) SplitTernaryBranches(Token[] tokens)
    {
        // Use functional approach: find ? at depth 0
        int depth = 0;
        int questionIdx = Array.FindIndex(tokens, t =>
        {
            if (t.Value is "(" or "{" or "[") { depth++; return false; }
            if (t.Value is ")" or "}" or "]") { depth--; return false; }
            return depth == 0 && (t.Value == "?" || t.Type == TokenType.QuestionMark);
        });

        if (questionIdx < 0) return (null, null);

        // Find matching : (accounting for nested ternaries)
        var afterQuestion = tokens.Skip(questionIdx + 1).ToArray();
        depth = 0;
        int ternaryDepth = 1;

        int colonIdx = Array.FindIndex(afterQuestion, t =>
        {
            if (t.Value is "(" or "{" or "[") { depth++; return false; }
            if (t.Value is ")" or "}" or "]") { depth--; return false; }
            if (depth == 0 && (t.Value == "?" || t.Type == TokenType.QuestionMark)) { ternaryDepth++; return false; }
            if (depth == 0 && (t.Value == ":" || t.Type == TokenType.Colon))
            {
                ternaryDepth--;
                return ternaryDepth == 0;
            }
            return false;
        });

        if (colonIdx < 0) return (null, null);

        return (afterQuestion.Take(colonIdx).ToArray(), afterQuestion.Skip(colonIdx + 1).ToArray());
    }

    private VNodeModel? ParseBranch(Token[] tokens, string path)
    {
        var trimmed = tokens.SkipWhile(t => t.Type == TokenType.Whitespace)
                           .Reverse()
                           .SkipWhile(t => t.Type == TokenType.Whitespace)
                           .Reverse()
                           .ToArray();

        if (trimmed.Length == 0) return null;

        var first = trimmed[0];

        // String literal
        if (first.Type == TokenType.String)
        {
            return new VTextModel
            {
                HexPath = path,
                Text = first.Value.Trim('"', '\''),
                IsDynamic = false
            };
        }

        // Parenthesized content - extract inner
        if (first.Value == "(")
        {
            var inner = ExtractBalanced(trimmed, 0, "(", ")");
            var content = inner.Skip(1).Take(inner.Length - 2).ToArray();
            return ParseJsxTree(content, path);
        }

        // JSX element
        if (first.Type == TokenType.JsxTagOpen)
        {
            return ParseJsxTree(trimmed, path);
        }

        // Dynamic expression
        return new VTextModel
        {
            HexPath = path,
            Text = "{0}",
            IsDynamic = true,
            Binding = TokensToString(trimmed),
            BindingTokens = trimmed
        };
    }

    #endregion

    #region && Conditional - Pattern Based

    /// <summary>
    /// Tries to parse an && conditional: condition && element
    /// </summary>
    private VNodeModel? TryParseAndConditional(Token[] tokens, string path)
    {
        // Check if there's an && at depth 0
        if (!IsOperatorAtDepthZero(tokens, "&&"))
            return null;

        // Find the last && before JSX content (handles chained &&)
        int lastAndIdx = FindLastAndBeforeJsx(tokens);
        if (lastAndIdx < 0) return null;

        var condition = tokens.Take(lastAndIdx).ToArray();
        var trueContent = tokens.Skip(lastAndIdx + 1).ToArray();

        var trueNode = ParseBranch(trueContent, $"{path}.1");

        return new VConditionalModel
        {
            HexPath = path,
            Condition = TokensToString(condition),
            TrueNode = trueNode,
            FalseNode = new VNullModel { HexPath = path },
            IsSimpleAnd = true
        };
    }

    private int FindLastAndBeforeJsx(Token[] tokens)
    {
        // Functional approach: fold over tokens to find last && at depth 0 with JSX following
        var result = tokens.Select((t, i) => (token: t, index: i))
            .Aggregate(
                (depth: 0, lastAndIdx: -1),
                (acc, item) =>
                {
                    var (t, i) = item;
                    int depth = acc.depth;
                    if (t.Value is "(" or "{" or "[") depth++;
                    else if (t.Value is ")" or "}" or "]") depth--;

                    if (depth == 0 && t.Type == TokenType.Operator && t.Value == "&&")
                    {
                        var remaining = tokens.Skip(i + 1);
                        if (remaining.Any(r => r.Type == TokenType.JsxTagOpen || r.Value == "("))
                            return (depth, i);
                    }
                    return (depth, acc.lastAndIdx);
                });

        return result.lastAndIdx;
    }

    #endregion

    #region .map() Expression - Pattern Based

    /// <summary>
    /// Tries to parse a .map() expression: array.map((item) => element)
    /// Also handles chained methods: array.filter(...).map(...), array.sort(...).map(...), etc.
    /// </summary>
    private VNodeModel? TryParseMapCall(Token[] tokens, string path)
    {
        // Use pattern to match: anything.map(callback) - captures everything before .map
        // Note: the dot is tokenized as Punctuation ".", not Operator
        var matcher = new PatternMatcher(@"(.*?) \p""."" \i""map"" (\Bp)");
        if (!matcher.TryMatch(tokens, 0, out var match) || match == null)
            return null;

        if (match.Captures.Length < 2)
            return null;

        var arrayExpr = match.Captures[0].Tokens;
        var callbackTokens = match.Captures[1].Tokens;

        // Check if arrayExpr contains chained methods (filter, sort, slice, etc.)
        // These need to be converted to LINQ equivalents
        var chainedExpr = TryParseChainedMethods(arrayExpr);

        // Parse callback: (item) => ... or (item, index) => ...
        return ParseMapCallback(arrayExpr, callbackTokens, path, chainedExpr);
    }

    /// <summary>
    /// Parses chained array methods like .filter().sort().slice() and converts to LINQ.
    /// Returns the C# LINQ expression string, or null if no chaining detected.
    /// </summary>
    private string? TryParseChainedMethods(Token[] tokens)
    {
        var expr = TokensToString(tokens).Trim();

        // Check if expression contains chained method calls
        // Pattern: identifier followed by .method(...) chains
        if (!expr.Contains(".filter(") && !expr.Contains(".sort(") &&
            !expr.Contains(".slice(") && !expr.Contains(".reverse(") &&
            !expr.Contains(".concat(") && !expr.Contains(".flat("))
            return null;

        // Extract the base array name (first identifier)
        var baseArrayMatch = System.Text.RegularExpressions.Regex.Match(expr, @"^(\w+)");
        if (!baseArrayMatch.Success)
            return null;

        var baseArray = baseArrayMatch.Groups[1].Value;
        var result = $"((IEnumerable<dynamic>){baseArray})";

        // Parse chain operations using regex - find all .method(...) patterns
        var remaining = expr.Substring(baseArray.Length);

        // Use regex to find all chained method calls at once
        var chainPattern = new System.Text.RegularExpressions.Regex(@"\.(\w+)\(([^()]*(?:\([^()]*\)[^()]*)*)\)");
        var matches = chainPattern.Matches(remaining);

        // Process each match using LINQ Aggregate
        result = matches.Cast<System.Text.RegularExpressions.Match>()
            .Aggregate(result, (current, match) =>
                ConvertArrayMethodToLinq(current, match.Groups[1].Value, match.Groups[2].Value));

        return result;
    }

    /// <summary>
    /// Converts a JS array method call to its LINQ equivalent.
    /// </summary>
    private string ConvertArrayMethodToLinq(string expr, string method, string args)
    {
        return method switch
        {
            "filter" => $"{expr}.Where({ConvertArrowFunction(args)})",
            "sort" => ConvertSortToLinq(expr, args),
            "slice" => ConvertSliceToLinq(expr, args),
            "reverse" => $"{expr}.Reverse()",
            "concat" => $"{expr}.Concat({args})",
            "flat" => $"{expr}.SelectMany(x => x)",
            "flatMap" => $"{expr}.SelectMany({ConvertArrowFunction(args)})",
            "find" => $"{expr}.FirstOrDefault({ConvertArrowFunction(args)})",
            "findIndex" => $"{expr}.ToList().FindIndex(x => {ConvertArrowFunction(args)}(x))",
            "some" => $"{expr}.Any({ConvertArrowFunction(args)})",
            "every" => $"{expr}.All({ConvertArrowFunction(args)})",
            "includes" => $"{expr}.Contains({args})",
            _ => $"{expr}.{method}({args})" // Fallback
        };
    }

    /// <summary>
    /// Converts JS arrow function syntax to C# lambda.
    /// e.g., "todo => !todo.done" stays as is (valid in both)
    ///       "(a, b) => a - b" stays as is
    /// </summary>
    private string ConvertArrowFunction(string arrow)
    {
        // Most JS arrow functions are valid C# lambdas
        // Just trim and return
        return arrow.Trim();
    }

    /// <summary>
    /// Converts JS .sort() to LINQ OrderBy/OrderByDescending.
    /// </summary>
    private string ConvertSortToLinq(string expr, string args)
    {
        if (string.IsNullOrWhiteSpace(args))
        {
            // No comparator - simple ascending sort
            return $"{expr}.OrderBy(x => x)";
        }

        // Try to parse comparator: (a, b) => a.prop - b.prop or (a, b) => a - b
        var comparatorMatch = System.Text.RegularExpressions.Regex.Match(
            args.Trim(),
            @"\((\w+),\s*(\w+)\)\s*=>\s*(\w+)\.?(\w*)?\s*-\s*(\w+)\.?(\w*)?");

        if (comparatorMatch.Success)
        {
            var a = comparatorMatch.Groups[1].Value;
            var b = comparatorMatch.Groups[2].Value;
            var firstVar = comparatorMatch.Groups[3].Value;
            var firstProp = comparatorMatch.Groups[4].Value;
            var secondVar = comparatorMatch.Groups[5].Value;

            var selector = string.IsNullOrEmpty(firstProp) ? "x" : $"x.{firstProp}";
            var isDescending = firstVar == b;

            return isDescending
                ? $"{expr}.OrderByDescending(x => {selector})"
                : $"{expr}.OrderBy(x => {selector})";
        }

        // Complex comparator - just use OrderBy with a basic selector
        return $"{expr}.OrderBy(x => x)";
    }

    /// <summary>
    /// Converts JS .slice() to LINQ Skip/Take.
    /// </summary>
    private string ConvertSliceToLinq(string expr, string args)
    {
        var parts = args.Split(',').Select(p => p.Trim()).ToArray();

        if (parts.Length == 0 || string.IsNullOrWhiteSpace(parts[0]))
            return expr;

        if (parts.Length == 1)
        {
            // .slice(start) - skip first N elements
            return $"{expr}.Skip({parts[0]})";
        }

        // .slice(start, end) - skip first 'start', take 'end - start'
        var start = parts[0];
        var end = parts[1];

        // If both are numeric, we can compute the count
        if (int.TryParse(start, out var startNum) && int.TryParse(end, out var endNum))
        {
            var count = endNum - startNum;
            if (startNum == 0)
                return $"{expr}.Take({count})";
            return $"{expr}.Skip({startNum}).Take({count})";
        }

        // Dynamic - use expression
        return $"{expr}.Skip({start}).Take({end} - {start})";
    }

    private VNodeModel? ParseMapCallback(Token[] arrayExpr, Token[] callbackTokens, string path, string? chainedLinqExpr = null)
    {
        // Find => in callback
        // Try parenthesized form first: (item) => body or (item, index) => body
        var arrowMatcher = new PatternMatcher(@"(\Bp) \fa (.*)");
        TokenMatch? arrowMatch = null;

        if (arrowMatcher.TryMatch(callbackTokens, 0, out arrowMatch) && arrowMatch != null)
        {
            // Matched parenthesized form
        }
        else
        {
            // Try unparenthesized form: item => body
            var unparenMatcher = new PatternMatcher(@"(\i) \fa (.*)");
            if (!unparenMatcher.TryMatch(callbackTokens, 0, out arrowMatch) || arrowMatch == null)
            {
                return null;
            }
        }

        var paramTokens = arrowMatch.Captures[0].Tokens;
        var bodyTokens = arrowMatch.Captures[1].Tokens;

        // Extract parameter names
        var identifiers = paramTokens.Where(t => t.Type == TokenType.Identifier).ToList();
        string itemName = identifiers.Count > 0 ? identifiers[0].Value : "item";
        string? indexName = identifiers.Count > 1 ? identifiers[1].Value : null;

        // Store loop context in VisitorContext for nested handlers to access
        var previousLoopItem = Context.Get<string>("LoopItemName");
        Context.Set("LoopItemName", itemName);
        if (indexName != null)
            Context.Set("LoopIndexName", indexName);

        // Parse template from body (nested handlers will read Context)
        // Use numeric "1" placeholder for loop item path (matches Babel output)
        var template = ParseBranch(bodyTokens, $"{path}.1");

        // Restore previous loop context (supports nested loops)
        if (previousLoopItem != null)
            Context.Set("LoopItemName", previousLoopItem);
        else
            Context.Remove("LoopItemName");
        Context.Remove("LoopIndexName");

        // Extract just the array binding (the last identifier or member expression before .map())
        // This prevents capturing too much context like "return(<div...><ul>{todos" -> just "todos"
        var arrayBinding = ExtractArrayBindingFromTokens(arrayExpr);

        // If we have a chained LINQ expression, use that instead of simple array binding
        // This handles .filter().map(), .sort().map(), etc.
        var effectiveArrayExpr = chainedLinqExpr ?? arrayBinding;

        // Extract key binding from the template if it's an element with a key attribute
        string? keyBinding = null;
        if (template is VElementModel elem && elem.Attributes.TryGetValue("key", out var keyAttr))
        {
            keyBinding = keyAttr.IsDynamic ? ConvertToItemBinding(keyAttr.Binding, itemName) : null;
        }

        // Create the VListModel for the render tree
        var listModel = new VListModel
        {
            HexPath = path,
            ArrayExpression = effectiveArrayExpr,
            ItemName = itemName,
            IndexName = indexName,
            ItemTemplate = template
        };

        // Check if we've already added a loop template for this array binding (prevent duplicates)
        // Use base array name for deduplication, not full LINQ expression
        if (!_component.LoopTemplates.Any(lt => lt.StateKey == arrayBinding))
        {
            // Also populate LoopTemplates for [LoopTemplate] attribute generation
            var loopTemplate = new LoopTemplateInfo
            {
                StateKey = arrayBinding,
                ArrayBinding = arrayBinding,
                ItemVar = itemName,
                IndexVar = indexName,
                KeyBinding = keyBinding,
                ItemTemplate = ExtractLoopItemTemplate(template, itemName, indexName)
            };
            _component.LoopTemplates.Add(loopTemplate);
        }

        // Mark the array prop as List<dynamic> if it's a prop being mapped over
        var matchingProp = _component.Props.FirstOrDefault(p => p.Name == arrayBinding);
        if (matchingProp != null)
        {
            matchingProp.Type = "List<dynamic>";
        }

        return listModel;
    }

    /// <summary>
    /// Extracts the array binding from a token array.
    /// Takes the last identifier or member expression chain before .map().
    /// e.g., "return(<div...><ul>{todos" -> "todos"
    ///       "items.filter(x => x.active)" -> "items.filter(x => x.active)"
    /// </summary>
    private string ExtractArrayBindingFromTokens(Token[] tokens)
    {
        // Pattern: identifier followed by optional .identifier chain
        // \i matches identifier, (\.\i)* matches zero or more .identifier sequences
        var memberChainMatcher = new PatternMatcher(@"(\i) (""."" (\i))*", skipWhitespace: true);

        // Find member chain patterns in the tokens
        var matches = PatternMatcher.MatchAll(tokens, 0, (memberChainMatcher, TokenMatchType.Unknown, "chain"));

        // Get the last match (the array expression is typically at the end)
        var lastMatch = matches.LastOrDefault();
        if (lastMatch != null && lastMatch.Match.Captures.Length > 0)
        {
            // Build the member chain from captures
            var parts = new List<string>();

            // First capture is the base identifier
            var baseId = lastMatch.Match.Captures[0].AsIdentifier();
            if (baseId != null)
            {
                parts.Add(baseId);

                // Subsequent captures are the .identifier pairs
                for (int j = 1; j < lastMatch.Match.Captures.Length; j++)
                {
                    var propId = lastMatch.Match.Captures[j].AsIdentifier();
                    if (propId != null)
                    {
                        parts.Add(propId);
                    }
                }

                return string.Join(".", parts);
            }
        }

        // Fallback: just use the whole thing as string (trimmed)
        return TokensToString(tokens).Trim();
    }

    /// <summary>
    /// Converts a binding expression to use "item." prefix instead of the actual item variable name.
    /// e.g., "todo.id" -> "item.id"
    /// </summary>
    private string? ConvertToItemBinding(string? binding, string itemName)
    {
        if (string.IsNullOrEmpty(binding)) return null;
        if (binding.StartsWith(itemName + "."))
            return "item" + binding.Substring(itemName.Length);
        if (binding == itemName)
            return "item";
        return binding;
    }

    /// <summary>
    /// Extracts a LoopItemTemplate from a VNodeModel for [LoopTemplate] attribute.
    /// </summary>
    private LoopItemTemplate? ExtractLoopItemTemplate(VNodeModel? node, string itemName, string? indexName)
    {
        if (node == null) return null;

        if (node is VElementModel elem)
        {
            var template = new LoopItemTemplate
            {
                Type = "Element",
                Tag = elem.TagName
            };

            // Extract prop templates (skip "key" attribute)
            if (elem.Attributes.Count > 0)
            {
                template.PropsTemplates = new Dictionary<string, LoopPropTemplate>();
                foreach (var attr in elem.Attributes.Where(a => a.Key != "key"))
                {
                    template.PropsTemplates[attr.Key] = ExtractLoopPropTemplate(attr.Value, itemName, indexName);
                }
                if (template.PropsTemplates.Count == 0)
                    template.PropsTemplates = null;
            }

            // Extract children templates
            if (elem.Children.Count > 0)
            {
                template.ChildrenTemplates = elem.Children
                    .Select(c => ExtractLoopItemTemplate(c, itemName, indexName))
                    .Where(t => t != null)
                    .Cast<LoopItemTemplate>()
                    .ToList();
                if (template.ChildrenTemplates.Count == 0)
                    template.ChildrenTemplates = null;
            }

            return template;
        }

        if (node is VTextModel text)
        {
            var template = new LoopItemTemplate { Type = "Text" };

            if (text.IsDynamic)
            {
                template.Template = "{0}";
                template.Bindings = new List<string> { ConvertToItemBinding(text.Binding, itemName) ?? text.Binding ?? "" };
                template.Slots = new List<int> { 0 };
            }
            else
            {
                template.Template = text.Text;
                template.Bindings = new List<string>();
                template.Slots = new List<int>();
            }

            return template;
        }

        // For other node types (conditional, etc.), return null for now
        return null;
    }

    /// <summary>
    /// Extracts a LoopPropTemplate from an attribute value.
    /// </summary>
    private LoopPropTemplate ExtractLoopPropTemplate(AttributeValue attr, string itemName, string? indexName)
    {
        var template = new LoopPropTemplate();

        if (attr.IsDynamic)
        {
            var binding = ConvertToItemBinding(attr.Binding, itemName) ?? attr.Binding ?? "";
            template.Template = "{0}";
            template.Bindings.Add(binding);
            template.Slots.Add(0);
            template.Type = "binding";
        }
        else
        {
            template.Template = attr.RawValue;
            template.Type = "static";
        }

        return template;
    }

    #endregion

    #region Attribute Patterns

    // Pattern: attrName="value" - JsxAttrName followed by = and JsxAttrValue
    // Note: \ja captures the attr name token directly, \jv captures the value token
    [TokenPattern(@"(\ja) ""="" (\jv)", Priority = 80)]
    public void VisitStringAttribute(TokenMatch match, Token attrNameToken, Token attrValueToken)
    {
        if (_currentResult is VElementModel element)
        {
            element.Attributes[NormalizeAttributeName(attrNameToken.Value)] = new AttributeValue
            {
                RawValue = attrValueToken.Value.Trim('"', '\''),
                IsDynamic = false
            };
        }
    }

    // Pattern: attrName={expression} - JsxAttrName followed by = and balanced braces
    [TokenPattern(@"(\ja) ""="" (\Bb)", Priority = 80)]
    public void VisitExpressionAttribute(TokenMatch match, Token attrNameToken, Token[] exprContent)
    {
        if (_currentResult is VElementModel element)
        {
            var attrName = attrNameToken.Value;
            if (IsEventAttribute(attrName))
            {
                var handlerInfo = ParseEventHandler(exprContent);
                // Include loop binding in handler ref if inside a loop: "Handle0:{todo}"
                var handlerRef = handlerInfo.loopBinding != null
                    ? $"{handlerInfo.name}:{{{handlerInfo.loopBinding}}}"
                    : handlerInfo.name;
                element.Attributes[NormalizeEventName(attrName)] = new AttributeValue
                {
                    RawValue = handlerRef,
                    IsDynamic = false,
                    IsEventHandler = true,
                    EventHandlerRef = handlerRef
                };
            }
            else if (attrName == "style")
            {
                // Transform JS style object to CSS string
                var cssString = TransformStyleObject(exprContent);
                element.Attributes["style"] = new AttributeValue
                {
                    RawValue = cssString,
                    IsDynamic = false
                };
            }
            else
            {
                element.Attributes[NormalizeAttributeName(attrName)] = new AttributeValue
                {
                    RawValue = TokensToString(exprContent),
                    IsDynamic = true,
                    Binding = TokensToString(exprContent)
                };
            }
        }
    }

    // Pattern: Self-closing tag />
    [TokenPattern(@"[""/>"" | \js]", Priority = 90)]
    public void VisitSelfClosingTag(TokenMatch match)
    {
        if (_currentResult is VElementModel element)
        {
            element.IsSelfClosing = true;
        }
    }

    // Pattern: Opening tag end >
    [TokenPattern(@"\je", Priority = 70)]
    public void VisitOpeningTagEnd(TokenMatch match)
    {
        // Mark that we need to parse children
    }

    // Pattern: Component prop with expression value - state={{ ... }}
    [TokenPattern(@"(\ja) ""="" (\Bb)", Priority = 70)]
    public void VisitComponentProp(TokenMatch match, Token propNameToken, Token[] propValue)
    {
        if (_currentResult is VComponentWrapperModel wrapper)
        {
            if (propNameToken.Value == "state")
            {
                ParseComponentState(propValue, wrapper);
            }
        }
    }

    // Pattern: Component prop with string value - name="Counter"
    // Try multiple patterns: \jv for JSX attr value, \s for string literal
    [TokenPattern(@"(\ja) ""="" (\jv)", Priority = 71)]
    public void VisitComponentStringProp(TokenMatch match, Token propNameToken, Token propValueToken)
    {
        if (_currentResult is VComponentWrapperModel wrapper)
        {
            if (propNameToken.Value == "name")
            {
                // Extract string value, removing quotes
                var value = propValueToken.Value.Trim('"', '\'');
                wrapper.ComponentName = value;
                wrapper.ComponentType = value;
            }
        }
    }

    // Alternative pattern for string literals in JSX attributes
    [TokenPattern(@"(\ja) ""="" (\s)", Priority = 72)]
    public void VisitComponentStringPropAlt(TokenMatch match, Token propNameToken, Token propValueToken)
    {
        if (_currentResult is VComponentWrapperModel wrapper)
        {
            if (propNameToken.Value == "name")
            {
                // Extract string value, removing quotes
                var value = propValueToken.Value.Trim('"', '\'');
                wrapper.ComponentName = value;
                wrapper.ComponentType = value;
            }
        }
    }

    private void ParseComponentState(Token[] tokens, VComponentWrapperModel wrapper)
    {
        // The tokens are already the inner object content (from \Bb capture)
        // Just parse the key:value pairs directly
        ParseKeyValuePairs(tokens, wrapper.InitialState);
    }

    private void ParseKeyValuePairs(Token[] tokens, Dictionary<string, string> target)
    {
        // Use pattern matching for key: value pairs
        // Pattern: identifier ":" (value until comma or end)
        var kvMatcher = new PatternMatcher(@"(\i) "":"" (\Bc)", skipWhitespace: true);

        // Use MatchAll to find all key:value pairs declaratively
        var matches = PatternMatcher.MatchAll(tokens, 0, (kvMatcher, TokenMatchType.Unknown, "kv"));

        foreach (var match in matches)
        {
            if (match.Match.Captures.Length >= 2)
            {
                var key = match.Match.Captures[0].AsIdentifier();
                var valueTokens = match.Match.Captures[1].Tokens;

                // Get the value from the first non-whitespace token
                var valueToken = valueTokens.FirstOrDefault(t => t.Type != TokenType.Whitespace);
                if (key != null && valueToken != null)
                {
                    target[key] = valueToken.Value;
                }
            }
        }
    }

    #endregion

    #region Event Handler Pattern

    /// <summary>
    /// Parses an event handler expression using patterns.
    /// Returns (name, isInline, loopBinding) where loopBinding is the item name if inside a loop.
    /// Reads loop context from VisitorContext (set by enclosing map pattern).
    /// </summary>
    private (string name, bool isInline, string? loopBinding) ParseEventHandler(Token[] tokens)
    {
        // Get loop context from VisitorContext (declaratively set by ParseMapCallback)
        var loopItemName = Context.Get<string>("LoopItemName");

        // Pattern 1: Direct reference - single identifier
        var directMatcher = new PatternMatcher(@"\i");
        var nonWhitespace = tokens.Where(t => t.Type != TokenType.Whitespace).ToArray();
        if (nonWhitespace.Length == 1 && nonWhitespace[0].Type == TokenType.Identifier)
        {
            return (nonWhitespace[0].Value, false, null);
        }

        // Pattern 2: Arrow function - (params) => body or params => body
        // Uses \fa (function arrow) macro for =>
        var arrowMatcher = new PatternMatcher(@"(\Bp)? \fa (.*)");
        if (arrowMatcher.TryMatch(tokens, 0, out var match) && match != null)
        {
            var handlerName = $"Handle{_handlerCounter++}";
            var bodyTokens = match.Captures.Length > 1 ? match.Captures[1].Tokens : match.Captures[0].Tokens;
            var body = TokensToString(bodyTokens);

            // Detect if handler uses event parameter (e.target.value, e.preventDefault(), etc.)
            var needsEventParam = DetectEventParameterUsage(body);

            _component.EventHandlers.Add(new Models.EventHandler
            {
                GeneratedName = handlerName,
                IsArrowFunction = true,
                OriginalExpression = TokensToString(tokens),
                Body = body,
                LoopItemName = loopItemName,
                NeedsEventParameter = needsEventParam
            });

            return (handlerName, true, loopItemName);
        }

        // Fallback: treat whole thing as inline handler
        var fallbackName = $"Handle{_handlerCounter++}";
        var fallbackBody = TokensToString(tokens);
        var fallbackNeedsEvent = DetectEventParameterUsage(fallbackBody);

        _component.EventHandlers.Add(new Models.EventHandler
        {
            GeneratedName = fallbackName,
            IsArrowFunction = false,
            OriginalExpression = TokensToString(tokens),
            Body = fallbackBody,
            LoopItemName = loopItemName,
            NeedsEventParameter = fallbackNeedsEvent
        });

        return (fallbackName, true, loopItemName);
    }

    /// <summary>
    /// Detects if the handler body uses the event parameter.
    /// Looks for patterns like: e.target, e.target.value, e.preventDefault(), e.stopPropagation(), etc.
    /// </summary>
    private bool DetectEventParameterUsage(string body)
    {
        // Common event object usage patterns
        // e.target, e.target.value, e.target.checked
        // e.preventDefault(), e.stopPropagation()
        // e.currentTarget, e.key, e.keyCode
        // e.clientX, e.clientY, e.pageX, e.pageY
        return System.Text.RegularExpressions.Regex.IsMatch(
            body,
            @"\be\s*\.\s*(target|currentTarget|preventDefault|stopPropagation|key|keyCode|clientX|clientY|pageX|pageY|nativeEvent|type|bubbles|cancelable)");
    }

    #endregion

    #region Utility Methods

    /// <summary>
    /// Extracts balanced content including delimiters.
    /// Uses functional Aggregate for state tracking.
    /// </summary>
    private Token[] ExtractBalanced(Token[] tokens, int start, string open, string close)
    {
        var slice = tokens.Skip(start).Select((t, i) => (token: t, index: i));
        var result = slice.Aggregate(
            (list: new List<Token>(), depth: 0, done: false),
            (acc, item) =>
            {
                if (acc.done) return acc;
                acc.list.Add(item.token);
                int depth = acc.depth;
                if (item.token.Value == open) depth++;
                else if (item.token.Value == close) { depth--; if (depth == 0) return (acc.list, depth, true); }
                return (acc.list, depth, false);
            });
        return result.list.ToArray();
    }

    /// <summary>
    /// Extracts just the opening tag tokens (from &lt;tag to &gt; or /&gt;).
    /// This is used to limit attribute pattern matching to the opening tag only.
    /// </summary>
    private Token[] ExtractOpeningTag(Token[] tokens)
    {
        // Pattern: match everything up to and including JsxTagEnd or JsxTagSelfClose
        // Using TakeWhile + the terminator
        int endIdx = Array.FindIndex(tokens, t =>
            t.Type == TokenType.JsxTagEnd || t.Type == TokenType.JsxTagSelfClose || t.Value == "/>");

        return endIdx >= 0 ? tokens.Take(endIdx + 1).ToArray() : tokens;
    }

    private bool IsEventAttribute(string name) =>
        name.StartsWith("on", StringComparison.OrdinalIgnoreCase);

    private string NormalizeEventName(string name) => name.ToLowerInvariant();

    private string NormalizeAttributeName(string name) => name switch
    {
        "className" => "class",
        "htmlFor" => "for",
        _ => name
    };

    private string TokensToString(Token[] tokens)
    {
        if (tokens.Length == 0) return "";

        var sb = new System.Text.StringBuilder();
        Token? prev = null;

        foreach (var token in tokens)
        {
            // Add space between tokens that need separation
            if (prev != null && NeedsSpaceBetween(prev, token))
            {
                sb.Append(' ');
            }
            sb.Append(token.Value);
            prev = token;
        }

        return sb.ToString();
    }

    /// <summary>
    /// Determines if a space is needed between two tokens when reconstructing source.
    /// This prevents tokens like <li and key from merging into <likey.
    /// </summary>
    private bool NeedsSpaceBetween(Token prev, Token next)
    {
        // After JSX tag open (<div), before attribute names
        if (prev.Type == TokenType.JsxTagOpen && next.Type == TokenType.JsxAttrName)
            return true;

        // After attribute value, before next attribute name
        if ((prev.Type == TokenType.JsxAttrValue || prev.Type == TokenType.JsxExprEnd) &&
            next.Type == TokenType.JsxAttrName)
            return true;

        // After identifier or keyword, before another identifier/keyword
        if ((prev.Type == TokenType.Identifier || prev.Type == TokenType.Keyword) &&
            (next.Type == TokenType.Identifier || next.Type == TokenType.Keyword))
            return true;

        // After JSX tag end (>), before text that starts with alphanumeric
        if (prev.Type == TokenType.JsxTagEnd && next.Type == TokenType.Identifier)
            return true;

        return false;
    }

    /// <summary>
    /// Transforms a JS style object like {marginBottom:'20px',fontSize:'14px'}
    /// into a CSS string like "margin-bottom: 20px; font-size: 14px"
    /// </summary>
    private string TransformStyleObject(Token[] tokens)
    {
        // Use PatternMatcher to find identifier: value pairs
        // Pattern: identifier ":" (string | number)
        var stringPropMatcher = new PatternMatcher(@"(\i) "":"" (\s)", skipWhitespace: true);
        var numberPropMatcher = new PatternMatcher(@"(\i) "":"" (\n)", skipWhitespace: true);

        var cssProperties = new List<string>();

        // Find all string property matches
        var stringMatches = PatternMatcher.MatchAll(tokens, 0, (stringPropMatcher, TokenMatchType.Unknown, "str"));
        foreach (var match in stringMatches)
        {
            if (match.Match.Captures.Length >= 2)
            {
                var propName = match.Match.Captures[0].AsIdentifier();
                var propValue = match.Match.Captures[1].Tokens.FirstOrDefault()?.Value.Trim('\'', '"');
                if (propName != null && propValue != null)
                {
                    var cssProperty = CamelToKebab(propName);
                    cssProperties.Add($"{cssProperty}: {propValue}");
                }
            }
        }

        // Find all number property matches
        var numberMatches = PatternMatcher.MatchAll(tokens, 0, (numberPropMatcher, TokenMatchType.Unknown, "num"));
        foreach (var match in numberMatches)
        {
            if (match.Match.Captures.Length >= 2)
            {
                var propName = match.Match.Captures[0].AsIdentifier();
                var propValue = match.Match.Captures[1].Tokens.FirstOrDefault()?.Value;
                if (propName != null && propValue != null)
                {
                    var cssProperty = CamelToKebab(propName);
                    // Add "px" suffix for numeric values (common convention)
                    cssProperties.Add($"{cssProperty}: {propValue}px");
                }
            }
        }

        return string.Join("; ", cssProperties);
    }

    /// <summary>
    /// Converts camelCase to kebab-case: marginBottom -> margin-bottom
    /// </summary>
    private string CamelToKebab(string camelCase)
    {
        var result = new System.Text.StringBuilder();
        foreach (char c in camelCase)
        {
            if (char.IsUpper(c))
            {
                if (result.Length > 0)
                    result.Append('-');
                result.Append(char.ToLower(c));
            }
            else
            {
                result.Append(c);
            }
        }
        return result.ToString();
    }

    #endregion
}
