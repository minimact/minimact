using Reluxer.Attributes;
using Reluxer.Matching;
using Reluxer.Tokens;
using Reluxer.Transformer.Models;
using Reluxer.Visitor;

namespace Reluxer.Transformer.Visitors;

/// <summary>
/// Visitor that extracts event handlers and local variable declarations.
/// </summary>
public class HandlerVisitor : TokenVisitor
{
    private readonly ComponentModel _component;
    private Token[]? _componentBody;
    private int _handlerCounter;

    public HandlerVisitor(ComponentModel component)
    {
        _component = component;
    }

    public override void OnBegin(IReadOnlyList<Token> tokens)
    {
        _componentBody = Context.Get<Token[]>($"ComponentBody:{_component.Name}");
        _handlerCounter = 0;

        if (_componentBody != null && _componentBody.Length > 0)
        {
            Traverse(_componentBody,
                nameof(VisitConstHandler),
                nameof(VisitConstVariable),
                nameof(VisitLetVariable));
        }
    }

    // Match: const handleName = (...) => { ... }
    // Uses \Bp for balanced parentheses and \fa for function arrow
    // Name ensures this only runs during explicit Traverse, not default Visit
    [TokenPattern(@"\k""const"" (\i) ""="" (\Bp) \fa", Name = "VisitConstHandler")]
    public void VisitConstHandler(TokenMatch match, string name, Token[] paramsTokens)
    {
        // Check if this looks like a handler (starts with "handle" or ends with "Handler")
        if (!IsHandlerName(name)) return;

        // Skip if already added (prevent duplicates)
        if (_component.EventHandlers.Any(h => h.GeneratedName == name))
        {
            SkipFunctionBody();
            return;
        }

        // Skip if already added as lifted state (prevent duplicates)
        if (_component.LiftedStateReads.Any(l => l.LocalName == name))
        {
            SkipFunctionBody();
            return;
        }

        // Extract the handler body as tokens
        var bodyTokens = ExtractFunctionBody(0);

        // Check if this handler calls setState("X.Y", ...) - lifted state operation
        // These should become [ClientComputed] properties, not methods
        if (bodyTokens.Any(t => t.Value == "setState"))
        {
            _component.LiftedStateReads.Add(new LiftedStateRead
            {
                LocalName = name,
                StateKey = name  // The key is the function name itself
            });
            SkipFunctionBody();
            return;
        }

        var handler = new Models.EventHandler
        {
            GeneratedName = name,
            IsArrowFunction = true,
            BodyTokens = bodyTokens,
            OriginalExpressionTokens = match.MatchedTokens
        };

        _component.EventHandlers.Add(handler);
        SkipFunctionBody();
    }

    // Match: const name = expression (not a function)
    [TokenPattern(@"\k""const"" (\i) ""=""", Priority = -10, Name = "VisitConstVariable")]
    public void VisitConstVariable(TokenMatch match, string name)
    {
        // Skip if it's a handler (already processed above)
        if (IsHandlerName(name)) return;
        // Skip if it's a useState destructuring (handled by StateVisitor)
        if (match.MatchedTokens.Length > match.EndIndex)
        {
            var nextTokens = match.MatchedTokens.Skip(match.EndIndex - match.StartIndex).Take(5).ToArray();
            if (nextTokens.Any(t => t.Value == "[")) return;
        }

        // Extract expression until semicolon or next statement
        var exprTokens = ExtractExpressionUntilSemicolon(0);
        if (exprTokens.Length > 0)
        {
            _component.LocalVariables.Add(new LocalVariable
            {
                Name = name,
                IsConst = true,
                ExpressionTokens = exprTokens
            });
        }
    }

    // Match: let name = expression
    [TokenPattern(@"\k""let"" (\i) ""=""", Name = "VisitLetVariable")]
    public void VisitLetVariable(TokenMatch match, string name)
    {
        var exprTokens = ExtractExpressionUntilSemicolon(0);
        if (exprTokens.Length > 0)
        {
            _component.LocalVariables.Add(new LocalVariable
            {
                Name = name,
                IsConst = false,
                ExpressionTokens = exprTokens
            });
        }
    }

    /// <summary>
    /// Extracts inline arrow handlers from JSX event attributes.
    /// Called by JsxVisitor when it encounters onClick={() => ...}
    /// </summary>
    public string RegisterInlineHandler(Token[] handlerTokens)
    {
        var bodyTokens = ExtractArrowBodyTokens(handlerTokens);

        // Check if we already have an identical handler (prevent duplicates)
        // Compare by token sequence
        var existing = _component.EventHandlers.FirstOrDefault(h =>
            h.BodyTokens != null &&
            h.BodyTokens.Length == bodyTokens.Length &&
            h.BodyTokens.Zip(bodyTokens, (a, b) => a.Value == b.Value).All(x => x));

        if (existing != null)
            return existing.GeneratedName;

        var handlerName = $"Handle{_handlerCounter++}";

        var handler = new Models.EventHandler
        {
            GeneratedName = handlerName,
            IsArrowFunction = true,
            BodyTokens = bodyTokens,
            OriginalExpressionTokens = handlerTokens
        };

        _component.EventHandlers.Add(handler);
        return handlerName;
    }

    private bool IsHandlerName(string name)
    {
        return name.StartsWith("handle", StringComparison.OrdinalIgnoreCase) ||
               name.EndsWith("Handler", StringComparison.OrdinalIgnoreCase) ||
               name.StartsWith("on", StringComparison.OrdinalIgnoreCase);
    }

    private Token[] ExtractExpressionUntilSemicolon(int startOffset)
    {
        // Simple extraction until we hit ; or end of line
        var tokens = new List<Token>();
        // This is a simplified version - real implementation would need proper parsing
        return tokens.ToArray();
    }

    /// <summary>
    /// Extracts the body of an arrow function as tokens.
    /// Handles both block body { ... } and expression body.
    /// </summary>
    private Token[] ExtractArrowBodyTokens(Token[] tokens)
    {
        // Pattern: => followed by either { body } or single expression
        // \fa matches the fat arrow (=>)
        // \Bb captures balanced braces for block body
        var arrowBlockMatcher = new PatternMatcher(@"\fa (\Bb)", skipWhitespace: true);

        if (arrowBlockMatcher.TryMatch(tokens, 0, out var blockMatch) && blockMatch != null)
        {
            // Block body - return tokens inside braces
            if (blockMatch.Captures.Length > 0)
            {
                return blockMatch.Captures[0].Tokens;
            }
        }

        // Try single expression - everything after =>
        var arrowExprMatcher = new PatternMatcher(@"\fa", skipWhitespace: true);
        if (arrowExprMatcher.TryMatch(tokens, 0, out var exprMatch) && exprMatch != null)
        {
            // Get everything after the arrow
            return tokens.Skip(exprMatch.EndIndex).ToArray();
        }

        return Array.Empty<Token>();
    }

    /// <summary>
    /// Extracts balanced content as tokens.
    /// </summary>
    private Token[] ExtractBalancedTokens(Token[] tokens, string open)
    {
        // Use PatternMatcher with balanced matchers
        PatternMatcher matcher = open switch
        {
            "{" => new PatternMatcher(@"(\Bb)", skipWhitespace: false),
            "(" => new PatternMatcher(@"(\Bp)", skipWhitespace: false),
            "[" => new PatternMatcher(@"(\Bk)", skipWhitespace: false),
            _ => throw new ArgumentException($"Unsupported delimiter: {open}")
        };

        if (matcher.TryMatch(tokens, 0, out var match) && match != null && match.Captures.Length > 0)
        {
            return match.Captures[0].Tokens;
        }

        return Array.Empty<Token>();
    }
}
