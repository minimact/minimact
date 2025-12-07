using Reluxer.Attributes;
using Reluxer.Matching;
using Reluxer.Tokens;
using Reluxer.Transformer.Models;
using Reluxer.Visitor;

namespace Reluxer.Transformer.Visitors;

/// <summary>
/// Visitor that extracts useRef hooks from component bodies.
/// Matches patterns like:
/// - const inputRef = useRef(null)
/// - const countRef = useRef(0)
/// - const elementRef = useRef<HTMLDivElement>(null)
/// </summary>
public class RefVisitor : TokenVisitor
{
    private readonly ComponentModel _component;
    private Token[]? _componentBody;

    public RefVisitor(ComponentModel component)
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
                nameof(VisitUseRefWithGeneric),
                nameof(VisitUseRef));
        }
    }

    /// <summary>
    /// Match: const name = useRef<Type>(initialValue)
    /// useRef with generic type annotation.
    /// </summary>
    [TokenPattern(@"\k""const"" (\i) \o""="" \i""useRef"" \go \tn \gc ""("" (.*?) "")""", Priority = 100, Name = "VisitUseRefWithGeneric")]
    public void VisitUseRefWithGeneric(TokenMatch match, string name, Token[] initialValueTokens)
    {
        AddRefHook(name, initialValueTokens);
    }

    /// <summary>
    /// Match: const name = useRef(initialValue)
    /// useRef without generic type annotation.
    /// </summary>
    [TokenPattern(@"\k""const"" (\i) \o""="" \i""useRef"" ""("" (.*?) "")""", Priority = 90, Name = "VisitUseRef")]
    public void VisitUseRef(TokenMatch match, string name, Token[] initialValueTokens)
    {
        AddRefHook(name, initialValueTokens);
    }

    /// <summary>
    /// Adds a ref hook to the component model.
    /// </summary>
    private void AddRefHook(string name, Token[] initialValueTokens)
    {
        // Skip if already added (prevent duplicates)
        if (_component.RefHooks.Any(r => r.Name == name))
            return;

        var refHook = new RefHook
        {
            Name = name,
            Index = _component.NextHookIndex++,
            InitialValueTokens = initialValueTokens.Length > 0 ? initialValueTokens : null
        };

        _component.RefHooks.Add(refHook);
    }
}
