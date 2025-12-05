using Reluxer.Attributes;
using Reluxer.Matching;
using Reluxer.Tokens;
using Reluxer.Transformer.Models;
using Reluxer.Visitor;

namespace Reluxer.Transformer.Visitors;

/// <summary>
/// Visitor that extracts useEffect hooks from component bodies.
/// Matches patterns like:
/// - useEffect(() => { ... }, [dep1, dep2])
/// - useEffect(() => { ... }, [])
/// - useEffect(() => { ... })
/// </summary>
public class EffectVisitor : TokenVisitor
{
    private readonly ComponentModel _component;
    private Token[]? _componentBody;

    public EffectVisitor(ComponentModel component)
    {
        _component = component;
    }

    public override void OnBegin(IReadOnlyList<Token> tokens)
    {
        // Get the component body from shared context (set by ComponentVisitor)
        _componentBody = Context.Get<Token[]>($"ComponentBody:{_component.Name}");

        if (_componentBody != null && _componentBody.Length > 0)
        {
            Traverse(_componentBody,
                nameof(VisitUseEffectWithDeps),
                nameof(VisitUseEffectEmptyDeps),
                nameof(VisitUseEffectNoDeps));
        }
    }

    /// <summary>
    /// Match: useEffect(() => { ... }, [dep1, dep2, ...])
    /// Effect with dependency array containing variables.
    /// </summary>
    [TokenPattern(@"\i""useEffect"" ""("" \Bp \fa \Bb "","" (\Bk) "")""", Priority = 100, Name = "VisitUseEffectWithDeps")]
    public void VisitUseEffectWithDeps(TokenMatch match, Token[] depsTokens)
    {
        // Skip if already added (prevent duplicates from overlapping patterns)
        var matchStart = match.StartIndex;
        if (_component.EffectHooks.Any(e => e.Index == matchStart))
            return;

        var effect = new EffectHook
        {
            Index = _component.NextHookIndex++,
            HasCleanup = HasReturnStatement(match.MatchedTokens)
        };

        // Extract dependency names from bracket content
        // depsTokens contains everything inside [...] including the brackets
        var deps = depsTokens
            .Where(t => t.Type == TokenType.Identifier)
            .Select(t => t.Value)
            .Where(v => !IsKeyword(v))
            .ToList();

        effect.Dependencies.AddRange(deps);
        _component.EffectHooks.Add(effect);
    }

    /// <summary>
    /// Match: useEffect(() => { ... }, [])
    /// Effect with empty dependency array (runs once on mount).
    /// </summary>
    [TokenPattern(@"\i""useEffect"" ""("" \Bp \fa \Bb "","" ""["" ""]"" "")""", Priority = 110, Name = "VisitUseEffectEmptyDeps")]
    public void VisitUseEffectEmptyDeps(TokenMatch match)
    {
        var matchStart = match.StartIndex;
        if (_component.EffectHooks.Any(e => e.Index == matchStart))
            return;

        var effect = new EffectHook
        {
            Index = _component.NextHookIndex++,
            HasCleanup = HasReturnStatement(match.MatchedTokens)
        };

        // Empty deps list means "run once on mount"
        // We leave Dependencies empty to indicate this
        _component.EffectHooks.Add(effect);
    }

    /// <summary>
    /// Match: useEffect(() => { ... })
    /// Effect without dependency array (runs every render).
    /// </summary>
    [TokenPattern(@"\i""useEffect"" ""("" \Bp \fa \Bb "")""", Priority = 90, Name = "VisitUseEffectNoDeps")]
    public void VisitUseEffectNoDeps(TokenMatch match)
    {
        var matchStart = match.StartIndex;
        if (_component.EffectHooks.Any(e => e.Index == matchStart))
            return;

        var effect = new EffectHook
        {
            Index = _component.NextHookIndex++,
            HasCleanup = HasReturnStatement(match.MatchedTokens)
        };

        // No deps at all - this means "run every render"
        // We could add a flag for this, but for now we just leave deps empty
        // The consumer can differentiate by checking if the hook had a deps array
        _component.EffectHooks.Add(effect);
    }

    /// <summary>
    /// Checks if the effect body contains a return statement (indicating cleanup).
    /// </summary>
    private bool HasReturnStatement(Token[] tokens)
    {
        // Simple check - look for return keyword followed by function/arrow
        for (int i = 0; i < tokens.Length; i++)
        {
            if (tokens[i].Type == TokenType.Keyword && tokens[i].Value == "return")
            {
                // Check if next non-whitespace is a function or arrow
                for (int j = i + 1; j < tokens.Length && j < i + 5; j++)
                {
                    if (tokens[j].Type == TokenType.Whitespace) continue;

                    // Return followed by function, arrow, or opening paren indicates cleanup
                    if (tokens[j].Type == TokenType.Keyword && tokens[j].Value == "function")
                        return true;
                    if (tokens[j].Type == TokenType.Arrow)
                        return true;
                    if (tokens[j].Type == TokenType.Punctuation && tokens[j].Value == "(")
                        return true;

                    break;
                }
            }
        }

        return false;
    }

    /// <summary>
    /// Checks if a string is a JavaScript keyword (to filter from deps).
    /// </summary>
    private bool IsKeyword(string value)
    {
        return value switch
        {
            "true" or "false" or "null" or "undefined" or
            "if" or "else" or "for" or "while" or "do" or
            "switch" or "case" or "break" or "continue" or
            "return" or "function" or "const" or "let" or "var" or
            "new" or "this" or "typeof" or "instanceof" => true,
            _ => false
        };
    }
}
