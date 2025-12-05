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

        var handler = new Models.EventHandler
        {
            GeneratedName = name,
            IsArrowFunction = true
        };

        // Extract the handler body
        var bodyTokens = ExtractFunctionBody(0);
        if (bodyTokens.Length > 0)
        {
            handler.Body = TokensToString(bodyTokens);
            handler.OriginalExpression = $"() => {{ {handler.Body} }}";
        }

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
                Expression = TokensToString(exprTokens),
                IsConst = true
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
                Expression = TokensToString(exprTokens),
                IsConst = false
            });
        }
    }

    /// <summary>
    /// Extracts inline arrow handlers from JSX event attributes.
    /// Called by JsxVisitor when it encounters onClick={() => ...}
    /// </summary>
    public string RegisterInlineHandler(Token[] handlerTokens)
    {
        var originalExpr = TokensToString(handlerTokens);
        var body = ExtractArrowBody(handlerTokens);

        // Check if we already have an identical handler (prevent duplicates)
        var existing = _component.EventHandlers.FirstOrDefault(h => h.Body == body);
        if (existing != null)
            return existing.GeneratedName;

        var handlerName = $"Handle{_handlerCounter++}";

        var handler = new Models.EventHandler
        {
            GeneratedName = handlerName,
            IsArrowFunction = true,
            OriginalExpression = originalExpr,
            Body = body
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

    private string TokensToString(Token[] tokens)
    {
        return string.Join("", tokens.Select(t => t.Value));
    }

    private Token[] ExtractExpressionUntilSemicolon(int startOffset)
    {
        // Simple extraction until we hit ; or end of line
        var tokens = new List<Token>();
        // This is a simplified version - real implementation would need proper parsing
        return tokens.ToArray();
    }

    private string ExtractArrowBody(Token[] tokens)
    {
        // Find => and extract what's after it
        var arrowIndex = -1;
        for (int i = 0; i < tokens.Length; i++)
        {
            if (tokens[i].Value == "=>")
            {
                arrowIndex = i;
                break;
            }
        }

        if (arrowIndex < 0 || arrowIndex >= tokens.Length - 1)
            return "";

        // Get everything after =>
        var bodyTokens = tokens.Skip(arrowIndex + 1).ToArray();

        // If it starts with {, extract balanced
        if (bodyTokens.Length > 0 && bodyTokens[0].Value == "{")
        {
            return ExtractBalancedFromTokens(bodyTokens, "{", "}");
        }

        // Otherwise it's a single expression
        return string.Join("", bodyTokens.Select(t => t.Value));
    }

    private string ExtractBalancedFromTokens(Token[] tokens, string open, string close)
    {
        var sb = new System.Text.StringBuilder();
        int depth = 0;
        bool started = false;

        foreach (var token in tokens)
        {
            if (token.Value == open)
            {
                if (started) sb.Append(token.Value);
                depth++;
                started = true;
            }
            else if (token.Value == close)
            {
                depth--;
                if (depth == 0) break;
                sb.Append(token.Value);
            }
            else if (started)
            {
                sb.Append(token.Value);
            }
        }

        return sb.ToString();
    }
}
