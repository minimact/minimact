using Reluxer.Attributes;
using Reluxer.Extensions;
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
    public void VisitUseEffectWithDeps(TokenMatch match, Token[] depsBracket)
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

        // Extract dependency names from bracket content using LuxIdentifiers
        // depsBracket contains everything inside [...] including the brackets
        var identifierNames = depsBracket.LuxIdentifiers();
        var deps = identifierNames
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
        // Pattern: return followed by function keyword, arrow, or opening paren
        // Use MatchAll to find the pattern anywhere in the token stream
        var returnFunctionMatcher = new PatternMatcher(@"\k""return"" \k""function""", skipWhitespace: true);
        var returnArrowMatcher = new PatternMatcher(@"\k""return"" \fa", skipWhitespace: true);
        var returnParenMatcher = new PatternMatcher(@"\k""return"" ""(""", skipWhitespace: true);

        // MatchAll finds patterns anywhere in the stream
        var matches = PatternMatcher.MatchAll(
            tokens, 0,
            (returnFunctionMatcher, TokenMatchType.Unknown, "func"),
            (returnArrowMatcher, TokenMatchType.Unknown, "arrow"),
            (returnParenMatcher, TokenMatchType.Unknown, "paren")
        );

        // If any pattern matched, we have a return statement
        return matches.Any();
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
