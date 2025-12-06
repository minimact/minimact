using Reluxer.Attributes;
using Reluxer.Matching;
using Reluxer.Tokens;
using Reluxer.Transformer.Models;
using Reluxer.Visitor;

namespace Reluxer.Transformer.Visitors;

/// <summary>
/// Visitor that identifies and extracts component definitions from TSX.
/// Matches:
/// - export function ComponentName() { ... }
/// - export default function ComponentName() { ... }
/// - function ComponentName() { ... }
/// </summary>
public class ComponentVisitor : TokenVisitor
{
    public List<ComponentModel> Components { get; } = new();
    public bool DebugMode { get; set; } = true;

    private IReadOnlyList<Token>? _tokens;
    private int _componentStartIndex;

    public ComponentVisitor()
    {
        if (DebugMode) Console.WriteLine($"[ComponentVisitor] Constructor called");
        Console.Out.Flush();
    }

    public override void OnBegin(IReadOnlyList<Token> tokens)
    {
        if (DebugMode) Console.WriteLine($"[ComponentVisitor] OnBegin ENTRY");
        Console.Out.Flush();
        _tokens = tokens;
        Components.Clear();
        if (DebugMode) Console.WriteLine($"[ComponentVisitor] OnBegin: {tokens.Count} tokens");
        Console.Out.Flush();
    }

    public override void OnUnmatched(Token token)
    {
        if (DebugMode && token.Type != TokenType.Whitespace)
            Console.WriteLine($"[ComponentVisitor] Unmatched: [{token.Type}] \"{token.Value}\" at {token.Start}");
    }

    // Match: export default function Name
    [TokenPattern(@"\k""export"" \k""default"" \k""function"" (\i)", Priority = 100)]
    public void VisitExportDefaultFunction(TokenMatch match, string name)
    {
        if (DebugMode) Console.WriteLine($"[ComponentVisitor] MATCHED ExportDefaultFunction: {name}");

        var component = new ComponentModel
        {
            Name = name,
            IsDefault = true,
            IsExported = true
        };

        _componentStartIndex = match.StartIndex;
        if (DebugMode) Console.WriteLine($"[ComponentVisitor] Extracting body...");
        ExtractComponentBody(component, match.EndIndex);
        if (DebugMode) Console.WriteLine($"[ComponentVisitor] Body extracted, adding component");
        Components.Add(component);

        // Skip past the function body
        if (DebugMode) Console.WriteLine($"[ComponentVisitor] Skipping function body...");
        SkipFunctionBody();
        if (DebugMode) Console.WriteLine($"[ComponentVisitor] Done with {name}");
    }

    // Match: export function Name
    [TokenPattern(@"\k""export"" \k""function"" (\i)", Priority = 90)]
    public void VisitExportFunction(TokenMatch match, string name)
    {
        var component = new ComponentModel
        {
            Name = name,
            IsDefault = false,
            IsExported = true
        };

        _componentStartIndex = match.StartIndex;
        ExtractComponentBody(component, match.EndIndex);
        Components.Add(component);

        SkipFunctionBody();
    }

    // Match: function Name (non-exported)
    [TokenPattern(@"\k""function"" (\i)", Priority = 80)]
    public void VisitFunction(TokenMatch match, string name)
    {
        // Capture PascalCase names as components
        // Also capture lowercase "use*" functions as custom hooks
        bool isHook = name.StartsWith("use") && name.Length > 3 && char.IsLower(name[0]);
        bool isComponent = char.IsUpper(name[0]);

        if (!isComponent && !isHook) return;

        var component = new ComponentModel
        {
            Name = name,
            IsDefault = false,
            IsExported = false,
            IsHook = isHook
        };

        _componentStartIndex = match.StartIndex;
        ExtractComponentBody(component, match.EndIndex);
        Components.Add(component);

        SkipFunctionBody();
    }

    // Match: const Name = () => { ... } (arrow function components)
    // TODO: This pattern causes infinite loop - disabled for now
    // [TokenPattern(@"<keyword:const> (<identifier>) <operator:=>.+?<operator:=>", Priority = 70)]
    public void VisitArrowComponent_Disabled(TokenMatch match, string name)
    {
        // Only capture PascalCase names as components
        if (!char.IsUpper(name[0])) return;

        var component = new ComponentModel
        {
            Name = name,
            IsDefault = false,
            IsExported = false
        };

        _componentStartIndex = match.StartIndex;

        // For arrow functions, body comes after =>
        var bodyTokens = ExtractFunctionBody(0);
        if (bodyTokens.Length > 0)
        {
            // Store body tokens for later processing
            Context.Set($"ComponentBody:{name}", bodyTokens);
        }

        Components.Add(component);
        SkipFunctionBody();
    }

    private void ExtractComponentBody(ComponentModel component, int startOffset)
    {
        // For functions with destructured parameters like:
        //   function UserProfile({ user, loading }) { ... }
        // We need to skip past the parameter list (...) before looking for { }
        //
        // Use PatternMatcher with \Bp (balanced parentheses) and \Bb (balanced braces)

        if (_tokens == null) return;

        // Pattern to match: (...params...) { ...body... }
        // \Bp captures balanced parentheses, \Bb captures balanced braces
        var funcMatcher = new PatternMatcher(@"(\Bp) (\Bb)", skipWhitespace: true);

        if (funcMatcher.TryMatch(_tokens, startOffset, out var match) && match != null)
        {
            // Extract parameter tokens from the first capture (balanced parens)
            if (match.Captures.Length >= 1)
            {
                var paramTokens = match.Captures[0].Tokens;
                if (paramTokens.Length > 0)
                {
                    Context.Set($"ComponentParams:{component.Name}", paramTokens);
                }
            }

            // Extract body tokens from the second capture (balanced braces)
            if (match.Captures.Length >= 2)
            {
                var bodyTokens = match.Captures[1].Tokens;
                if (bodyTokens.Length > 0)
                {
                    Context.Set($"ComponentBody:{component.Name}", bodyTokens);
                }
            }
        }
        else
        {
            // Fallback: try to extract just the body
            var bodyTokens = ExtractFunctionBody(startOffset);
            if (bodyTokens.Length > 0)
            {
                Context.Set($"ComponentBody:{component.Name}", bodyTokens);
            }
        }
    }
}
