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
        if (tokens.Length == 0 || tokens[0].Type != TokenType.JsxTagOpen)
            return null;

        var tagName = tokens[0].Value.TrimStart('<').TrimEnd('>');

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

        // Parse props using patterns
        _currentResult = wrapper;
        _currentPath = path;
        Traverse(tokens, nameof(VisitComponentProp));

        return wrapper;
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
        int childIndex = 1;

        foreach (var item in PatternMatcher.MatchAllJsxChildren(tokens))
        {
            string childPath = $"{parentPath}.{childIndex}";
            VNodeModel? child = null;

            switch (item.Type)
            {
                case TokenMatchType.Element:
                    // Use \Je pattern to get full element tokens
                    var jeMatcher = new PatternMatcher(@"(\Je)");
                    if (jeMatcher.TryMatch(tokens, item.Match.StartIndex, out var jeMatch) && jeMatch != null)
                    {
                        child = ParseJsxTree(jeMatch.MatchedTokens, childPath);
                    }
                    break;

                case TokenMatchType.Expression:
                    var exprContent = item.Captures.Length > 0 ? item.Captures[0].Tokens : Array.Empty<Token>();
                    child = ParseExpression(exprContent, childPath);
                    break;

                case TokenMatchType.Text:
                    var text = item.Tokens[0].Value.Trim();
                    if (!string.IsNullOrWhiteSpace(text))
                    {
                        child = new VTextModel { HexPath = childPath, Text = text, IsDynamic = false };
                    }
                    break;
            }

            if (child != null)
            {
                child.Parent = parent;
                parent.Children.Add(child);
                childIndex++;
            }
        }
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
        var significant = tokens.Where(t => t.Type != TokenType.Whitespace).ToArray();
        if (significant.Length == 0) return null;
        if (significant.All(t => t.Type == TokenType.Comment)) return null;

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
            Binding = TokensToString(tokens)
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
            Binding = TokensToString(trimmed)
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
    /// </summary>
    private VNodeModel? TryParseMapCall(Token[] tokens, string path)
    {
        // Use pattern to match: identifier.map(callback)
        var matcher = new PatternMatcher(@"(.*?) ""."" \i""map"" (\Bp)");
        if (!matcher.TryMatch(tokens, 0, out var match) || match == null)
            return null;

        if (match.Captures.Length < 2)
            return null;

        var arrayExpr = match.Captures[0].Tokens;
        var callbackTokens = match.Captures[1].Tokens;

        // Parse callback: (item) => ... or (item, index) => ...
        return ParseMapCallback(arrayExpr, callbackTokens, path);
    }

    private VNodeModel? ParseMapCallback(Token[] arrayExpr, Token[] callbackTokens, string path)
    {
        // Find => in callback using \fa (function arrow) macro
        var arrowMatcher = new PatternMatcher(@"(\Bp) \fa (.*)");
        if (!arrowMatcher.TryMatch(callbackTokens, 0, out var arrowMatch) || arrowMatch == null)
            return null;

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
        var template = ParseBranch(bodyTokens, $"{path}.item");

        // Restore previous loop context (supports nested loops)
        if (previousLoopItem != null)
            Context.Set("LoopItemName", previousLoopItem);
        else
            Context.Remove("LoopItemName");
        Context.Remove("LoopIndexName");

        return new VListModel
        {
            HexPath = path,
            ArrayExpression = TokensToString(arrayExpr),
            ItemName = itemName,
            IndexName = indexName,
            ItemTemplate = template
        };
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

    // Pattern: Component prop - same as expression attribute but for components
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

    private void ParseComponentState(Token[] tokens, VComponentWrapperModel wrapper)
    {
        // Pattern-based state object parsing using \Bb for balanced braces
        var objectMatcher = new PatternMatcher(@"(\Bb)");
        if (objectMatcher.TryMatch(tokens, 0, out var match) && match != null)
        {
            // Parse key: value pairs - skip outer braces
            var content = match.Captures[0].Tokens.Skip(1).SkipLast(1).ToArray();
            ParseKeyValuePairs(content, wrapper.InitialState);
        }
    }

    private void ParseKeyValuePairs(Token[] tokens, Dictionary<string, string> target)
    {
        // Pattern-based key:value parsing using named captures, \Bc, and skipWhitespace
        // (?<key>\i) captures the identifier as "key"
        // (\Bc) captures the value content until comma at depth 0
        // skipWhitespace: true automatically skips whitespace between tokens
        var keyValueMatcher = new PatternMatcher(@"(?<key>\i) \co (?<value>\Bc)", skipWhitespace: true);

        int i = 0;
        while (i < tokens.Length)
        {
            // Skip commas (whitespace is handled by the matcher)
            while (i < tokens.Length && (tokens[i].Type == TokenType.Whitespace || tokens[i].Value == ","))
                i++;

            if (i >= tokens.Length) break;

            // Try to match identifier : value using named captures
            if (keyValueMatcher.TryMatch(tokens, i, out var match) && match != null)
            {
                // Use type coercion: AsIdentifier() extracts the identifier value directly
                var key = match.NamedCaptures.TryGetValue("key", out var keyCapture)
                    ? keyCapture.AsIdentifier()
                    : null;
                var value = match.NamedCaptures.TryGetValue("value", out var valueCapture)
                    ? valueCapture.AsString().Trim()
                    : null;

                if (key != null && value != null)
                {
                    target[key] = value;
                }
                i = match.EndIndex;
            }
            else
            {
                i++;
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

            _component.EventHandlers.Add(new Models.EventHandler
            {
                GeneratedName = handlerName,
                IsArrowFunction = true,
                OriginalExpression = TokensToString(tokens),
                Body = TokensToString(bodyTokens),
                LoopItemName = loopItemName
            });

            return (handlerName, true, loopItemName);
        }

        // Fallback: treat whole thing as inline handler
        var fallbackName = $"Handle{_handlerCounter++}";
        _component.EventHandlers.Add(new Models.EventHandler
        {
            GeneratedName = fallbackName,
            IsArrowFunction = false,
            OriginalExpression = TokensToString(tokens),
            Body = TokensToString(tokens),
            LoopItemName = loopItemName
        });

        return (fallbackName, true, loopItemName);
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

    private string TokensToString(Token[] tokens) =>
        string.Join("", tokens.Select(t => t.Value));

    /// <summary>
    /// Transforms a JS style object like {marginBottom:'20px',fontSize:'14px'}
    /// into a CSS string like "margin-bottom: 20px; font-size: 14px"
    /// </summary>
    private string TransformStyleObject(Token[] tokens)
    {
        // Skip the outer braces { }
        var content = tokens.SkipWhile(t => t.Value == "{" || t.Type == TokenType.Whitespace)
                           .Reverse()
                           .SkipWhile(t => t.Value == "}" || t.Type == TokenType.Whitespace)
                           .Reverse()
                           .ToArray();

        var cssProperties = new List<string>();
        int i = 0;

        while (i < content.Length)
        {
            // Skip whitespace and commas
            while (i < content.Length && (content[i].Type == TokenType.Whitespace || content[i].Value == ","))
                i++;

            if (i >= content.Length) break;

            // Get property name (identifier)
            if (content[i].Type != TokenType.Identifier)
            {
                i++;
                continue;
            }

            var propName = content[i].Value;
            i++;

            // Skip to colon
            while (i < content.Length && content[i].Type == TokenType.Whitespace)
                i++;

            if (i >= content.Length || content[i].Value != ":" && content[i].Type != TokenType.Colon)
                continue;

            i++; // Skip colon

            // Skip whitespace
            while (i < content.Length && content[i].Type == TokenType.Whitespace)
                i++;

            if (i >= content.Length) break;

            // Get property value (string or number)
            string propValue;
            if (content[i].Type == TokenType.String)
            {
                propValue = content[i].Value.Trim('\'', '"');
                i++;
            }
            else if (content[i].Type == TokenType.Number)
            {
                propValue = content[i].Value;
                i++;
            }
            else
            {
                // Skip unknown token
                i++;
                continue;
            }

            // Convert camelCase to kebab-case
            var cssProperty = CamelToKebab(propName);
            cssProperties.Add($"{cssProperty}: {propValue}");
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
