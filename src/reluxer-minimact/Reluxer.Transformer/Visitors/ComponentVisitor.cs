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
        // Only capture PascalCase names as components
        if (!char.IsUpper(name[0])) return;

        var component = new ComponentModel
        {
            Name = name,
            IsDefault = false,
            IsExported = false
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
        // First, find the opening ( of the parameter list
        // Then find its matching )
        // Then extract the function body { } after that

        if (_tokens == null) return;

        // startOffset is actually the match.EndIndex (absolute index after the pattern match)
        int searchStart = startOffset;

        // Find opening ( of parameter list
        int parenStart = -1;
        for (int i = searchStart; i < _tokens.Count; i++)
        {
            if (_tokens[i].Value == "(")
            {
                parenStart = i;
                break;
            }
        }

        if (parenStart < 0)
        {
            // No parameters, just extract body from current position
            var bodyTokens = ExtractFunctionBody(0);
            if (bodyTokens.Length > 0)
            {
                Context.Set($"ComponentBody:{component.Name}", bodyTokens);
            }
            return;
        }

        // Find matching ) with depth tracking
        int depth = 1;
        int parenEnd = -1;
        for (int i = parenStart + 1; i < _tokens.Count; i++)
        {
            if (_tokens[i].Value == "(") depth++;
            else if (_tokens[i].Value == ")")
            {
                depth--;
                if (depth == 0)
                {
                    parenEnd = i;
                    break;
                }
            }
        }

        if (parenEnd < 0)
        {
            // Couldn't find closing ), try default extraction
            var bodyTokens = ExtractFunctionBody(0);
            if (bodyTokens.Length > 0)
            {
                Context.Set($"ComponentBody:{component.Name}", bodyTokens);
            }
            return;
        }

        // Extract parameter tokens (between ( and ) exclusive) for props detection
        var paramCount = parenEnd - parenStart - 1;
        if (paramCount > 0)
        {
            var paramTokens = new Token[paramCount];
            for (int i = 0; i < paramCount; i++)
            {
                paramTokens[i] = _tokens[parenStart + 1 + i];
            }
            Context.Set($"ComponentParams:{component.Name}", paramTokens);
        }

        // Now find the function body { } starting AFTER the closing )
        int braceStart = -1;
        for (int i = parenEnd + 1; i < _tokens.Count; i++)
        {
            if (_tokens[i].Value == "{")
            {
                braceStart = i;
                break;
            }
        }

        if (braceStart < 0)
        {
            // No function body found
            return;
        }

        // Find matching } with depth tracking
        depth = 1;
        int braceEnd = -1;
        for (int i = braceStart + 1; i < _tokens.Count; i++)
        {
            if (_tokens[i].Value == "{") depth++;
            else if (_tokens[i].Value == "}")
            {
                depth--;
                if (depth == 0)
                {
                    braceEnd = i;
                    break;
                }
            }
        }

        if (braceEnd < 0)
        {
            // Couldn't find closing }
            return;
        }

        // Extract tokens between { and } (exclusive)
        var count = braceEnd - braceStart - 1;
        if (count <= 0) return;

        var result = new Token[count];
        for (int i = 0; i < count; i++)
        {
            result[i] = _tokens[braceStart + 1 + i];
        }

        if (result.Length > 0)
        {
            Context.Set($"ComponentBody:{component.Name}", result);
        }
    }
}
