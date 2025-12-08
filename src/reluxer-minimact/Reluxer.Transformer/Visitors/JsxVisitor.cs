using Reluxer.Attributes;
using Reluxer.Extensions;
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

        // Filter out leading/trailing whitespace using LuxTrimWhitespace
        var trimmed = tokens.LuxTrimWhitespace();

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

                        // Try to parse as a complex expression (ternary, &&, .map())
                        if (mapExprResult == null)
                        {
                            mapExprResult = ParseExpression(exprTokens, $"{parentPath}.{childIndex}");
                            // If ParseExpression returned a VTextModel, it's a simple binding - treat inline
                            if (mapExprResult is VTextModel)
                            {
                                mapExprResult = null;
                                textParts.Add($"{{{exprTokensList.Count}}}");
                                exprTokensList.Add(exprTokens);
                            }
                        }
                        else
                        {
                            // Already have a complex result, store remaining as binding
                            textParts.Add($"{{{exprTokensList.Count}}}");
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
                    // Build merged text template with placeholders
                    var mergedText = string.Join("", textParts).Trim();
                    if (mergedText.Length > 0)
                    {
                        var child = new VTextModel
                        {
                            HexPath = $"{parentPath}.{childIndex}",
                            Text = hasExpression ? "{0}" : mergedText,
                            IsDynamic = hasExpression,
                            // Store tokens for generator to convert
                            BindingTokens = exprTokensList.Count == 1 ? exprTokensList[0] : null,
                            BindingTokensList = exprTokensList.Count > 1 ? exprTokensList : null,
                            TextParts = hasExpression ? textParts : null
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
        // Use LuxSignificant to filter out whitespace, comments, and EOF
        return lexer.Tokenize().ToArray().LuxSignificant();
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

        // Filter whitespace and comments using LuxSignificant
        var significant = tokens.LuxSignificant();
        if (significant.Length == 0) return null;

        // Skip JSX comments: {/* ... */}
        if (significant.Length >= 2 &&
            significant[0].Type == TokenType.Comment)
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
        // Validate: ? must be at depth 0 (not inside parens/braces)
        if (!IsOperatorAtDepthZero(tokens, "?"))
            return null;

        // Split into condition, true branch, false branch
        var (trueBranch, falseBranch) = SplitTernaryBranches(tokens);
        if (trueBranch == null) return null;

        var condition = ExtractCondition(tokens);
        if (condition.Length == 0) return null;

        var trueNode = ParseBranch(trueBranch, $"{path}.1");
        var falseNode = ParseBranch(falseBranch ?? Array.Empty<Token>(), $"{path}.2");

        return new VConditionalModel
        {
            HexPath = path,
            ConditionTokens = condition,
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
            ConditionTokens = condition,
            TrueNode = trueNode,
            FalseNode = new VNullModel { HexPath = path },
            IsSimpleAnd = true
        };
    }

    private int FindLastAndBeforeJsx(Token[] tokens)
    {
        // Use pattern matching to find all && operators
        var matches = tokens.LuxMatchAll(@"""&&""").ToArray();

        // Find last && with JSX or ( following using LastOrDefault
        var lastMatch = matches.Reverse()
            .FirstOrDefault(m => {
                var remaining = tokens[m.EndIndex..];
                return remaining.LuxContains(@"\jo") || remaining.LuxContains(@"""(""");
            });

        return lastMatch?.StartIndex ?? -1;
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
    /// Parses chained array methods like .filter().sort().slice().
    /// Returns a list of method calls with their argument tokens for the generator to convert.
    /// </summary>
    private List<ChainedMethodCall>? TryParseChainedMethods(Token[] tokens)
    {
        // Pattern to match chained method calls: .method(balanced_parens)
        // Uses \Bp for balanced parentheses to handle nested parens/braces correctly
        var chainMatcher = new PatternMatcher(@"""."" (\i) (\Bp)", skipWhitespace: true);

        // Quick check: look for method names that indicate chaining using LuxWhere
        var methodNames = new HashSet<string> { "filter", "sort", "slice", "reverse", "concat", "flat", "flatMap", "find", "findIndex", "some", "every", "includes" };
        var identifiers = tokens.LuxWhere(@"\i").ToArray();
        var hasChainedMethod = identifiers.Any(t => methodNames.Contains(t.Value));

        if (!hasChainedMethod)
            return null;

        // Find all chained method calls using pattern matching
        var allMatches = PatternMatcher.MatchAll(tokens, 0, (chainMatcher, TokenMatchType.Unknown, "chain"));

        // Extract method calls with their argument tokens
        var chainedMethods = new List<ChainedMethodCall>();
        foreach (var m in allMatches)
        {
            if (m.Match.Captures.Length < 2)
                continue;

            var method = m.Match.Captures[0].AsIdentifier() ?? "";
            if (!methodNames.Contains(method))
                continue;

            var argsTokens = m.Match.Captures[1].Tokens;
            // Strip outer parentheses from captured args tokens
            if (argsTokens.Length >= 2 &&
                argsTokens[0].Value == "(" &&
                argsTokens[^1].Value == ")")
            {
                argsTokens = argsTokens[1..^1];
            }

            chainedMethods.Add(new ChainedMethodCall
            {
                MethodName = method,
                ArgumentTokens = argsTokens
            });
        }

        return chainedMethods.Count > 0 ? chainedMethods : null;
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

        // Normalize the args - remove extra whitespace between tokens
        var normalizedArgs = System.Text.RegularExpressions.Regex.Replace(args.Trim(), @"\s+", " ");
        // Handle "a . prop" -> "a.prop" (space around dots)
        normalizedArgs = System.Text.RegularExpressions.Regex.Replace(normalizedArgs, @"\s*\.\s*", ".");
        // Handle "( a" -> "(a" and "a )" -> "a)" (space inside parens)
        normalizedArgs = System.Text.RegularExpressions.Regex.Replace(normalizedArgs, @"\(\s+", "(");
        normalizedArgs = System.Text.RegularExpressions.Regex.Replace(normalizedArgs, @"\s+\)", ")");

        // Try to parse comparator: (a, b) => a.prop - b.prop or (a, b) => a - b
        var comparatorMatch = System.Text.RegularExpressions.Regex.Match(
            normalizedArgs,
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

    private VNodeModel? ParseMapCallback(Token[] arrayExpr, Token[] callbackTokens, string path, List<ChainedMethodCall>? chainedMethods = null)
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

        // Extract parameter names using LuxWhere
        var identifiers = paramTokens.LuxWhere(@"\i").ToArray();
        string itemName = identifiers.Length > 0 ? identifiers[0].Value : "item";
        string? indexName = identifiers.Length > 1 ? identifiers[1].Value : null;

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

        // Extract key binding from the template if it's an element with a key attribute
        string? keyBinding = null;
        if (template is VElementModel elem && elem.Attributes.TryGetValue("key", out var keyAttr))
        {
            keyBinding = keyAttr.IsDynamic ? ConvertToItemBinding(keyAttr.Binding, itemName) : null;
        }

        // Create the VListModel for the render tree
        // Store tokens and chained methods for generator to convert
        var listModel = new VListModel
        {
            HexPath = path,
            ArrayExpression = arrayBinding,  // Base array name, generator builds full expression
            ArrayExpressionTokens = arrayExpr,
            ChainedMethods = chainedMethods,
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
    /// Extracts the base array binding from a token array.
    /// Returns the first identifier or member expression before any method calls.
    /// e.g., "todos.filter(...).sort(...)" -> "todos"
    ///       "[...todos].sort(...)" -> "todos"
    ///       "items.active" -> "items.active"
    /// </summary>
    private string ExtractArrayBindingFromTokens(Token[] tokens)
    {
        // Pattern 1: [...identifier].method(...) - spread array
        // Handle both cases: "..." as single token OR "." "." "." as three tokens
        var spreadMatcher = new PatternMatcher(@"""["" ""..."" (\i) ""]""", skipWhitespace: true);
        if (spreadMatcher.TryMatch(tokens, 0, out var spreadMatch) && spreadMatch != null)
        {
            var id = spreadMatch.Captures[0].AsIdentifier();
            if (id != null) return id;
        }

        // Alternative pattern: [ . . . identifier ] (three dots as separate tokens)
        var filtered = tokens.LuxNoWhitespace();
        if (filtered.Length >= 6 &&
            filtered[0].Value == "[" &&
            filtered[1].Value == "." &&
            filtered[2].Value == "." &&
            filtered[3].Value == "." &&
            filtered[4].Type == TokenType.Identifier &&
            filtered[5].Value == "]")
        {
            return filtered[4].Value;
        }

        // Pattern 2: Simple identifier or member chain at the START of the expression
        // Look for: identifier or identifier.identifier.identifier at position 0
        // This handles: todos, items.active, etc.

        // Filter whitespace using LuxNoWhitespace
        var significant = tokens.LuxNoWhitespace();
        if (significant.Length == 0) return "";

        var first = significant[0];

        // If it starts with identifier, extract the member chain
        if (first.Type == TokenType.Identifier)
        {
            var chainedMethodNames = new HashSet<string> { "filter", "sort", "slice", "reverse", "concat", "flat", "flatMap", "find", "findIndex", "some", "every", "includes", "map" };

            // Check if first token is already a chained method
            if (chainedMethodNames.Contains(first.Value))
                return "";

            // Extract member chain using pattern: identifier(.identifier)*
            // Find all member accesses after the first identifier
            var afterFirst = significant.Skip(1).ToArray();
            var memberMatches = afterFirst.LuxMatchAll(@"""."" (\i)")
                .TakeWhile(m => {
                    var id = m.Captures[0].AsIdentifier();
                    return id != null && !chainedMethodNames.Contains(id);
                })
                .ToArray();

            var members = new[] { first.Value }
                .Concat(memberMatches.Select(m => m.Captures[0].AsIdentifier()!))
                .ToArray();

            return string.Join(".", members);
        }

        // Pattern 3: Array literal like ['a', 'b', 'c'] - return empty (no state binding)
        if (first.Value == "[")
        {
            return "";
        }

        // Fallback: return first identifier found
        var firstIdent = significant.FirstOrDefault(t => t.Type == TokenType.Identifier);
        return firstIdent?.Value ?? "";
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
                    IsDynamic = true,
                    BindingTokens = exprContent
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
        var nonWhitespace = tokens.LuxNoWhitespace();
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

            // Detect if handler uses event parameter (e.target.value, e.preventDefault(), etc.)
            var needsEventParam = DetectEventParameterUsage(bodyTokens);

            _component.EventHandlers.Add(new Models.EventHandler
            {
                GeneratedName = handlerName,
                IsArrowFunction = true,
                OriginalExpressionTokens = tokens,
                BodyTokens = bodyTokens,
                LoopItemName = loopItemName,
                NeedsEventParameter = needsEventParam
            });

            return (handlerName, true, loopItemName);
        }

        // Fallback: treat whole thing as inline handler
        var fallbackName = $"Handle{_handlerCounter++}";
        var fallbackNeedsEvent = DetectEventParameterUsage(tokens);

        _component.EventHandlers.Add(new Models.EventHandler
        {
            GeneratedName = fallbackName,
            IsArrowFunction = false,
            OriginalExpressionTokens = tokens,
            BodyTokens = tokens,
            LoopItemName = loopItemName,
            NeedsEventParameter = fallbackNeedsEvent
        });

        return (fallbackName, true, loopItemName);
    }

    /// <summary>
    /// Detects if the handler body uses the event parameter.
    /// Looks for patterns like: e.target, e.target.value, e.preventDefault(), e.stopPropagation(), etc.
    /// Uses declarative pattern matching.
    /// </summary>
    private bool DetectEventParameterUsage(Token[] tokens)
    {
        // Pattern: e.target, e.currentTarget, e.preventDefault, etc.
        // Use (\i) to capture the property name
        var eventPatternMatcher = new PatternMatcher(@"\i""e"" ""."" (\i)");
        var eventProperties = new HashSet<string>
        {
            "target", "currentTarget", "preventDefault", "stopPropagation",
            "key", "keyCode", "clientX", "clientY", "pageX", "pageY",
            "nativeEvent", "type", "bubbles", "cancelable"
        };

        // Find all "e.property" matches
        var matches = PatternMatcher.MatchAll(tokens, 0, (eventPatternMatcher, TokenMatchType.Unknown, "event"));
        return matches.Any(m =>
            m.Match.Captures.Length > 0 &&
            eventProperties.Contains(m.Match.Captures[0].AsIdentifier() ?? ""));
    }

    #endregion

    #region Utility Methods

    /// <summary>
    /// Extracts balanced content including delimiters.
    /// Uses built-in balanced matchers.
    /// </summary>
    private Token[] ExtractBalanced(Token[] tokens, int start, string open, string close)
    {
        // Select the right balanced matcher based on delimiters
        var pattern = (open, close) switch
        {
            ("(", ")") => @"(\Bp)",
            ("{", "}") => @"(\Bb)",
            ("[", "]") => @"(\Bk)",
            ("<", ">") => @"(\Ba)",
            _ => @"(\Bp)" // fallback to parens
        };

        var matcher = new PatternMatcher(pattern);
        if (matcher.TryMatch(tokens, start, out var match) && match != null)
        {
            return match.MatchedTokens;
        }

        return Array.Empty<Token>();
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
