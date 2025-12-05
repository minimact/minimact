using Reluxer.Attributes;
using Reluxer.Matching;
using Reluxer.Tokens;
using Reluxer.Transformer.Models;
using Reluxer.Visitor;

namespace Reluxer.Transformer.Visitors;

/// <summary>
/// Visitor that identifies custom hook definitions (functions starting with "use").
/// Custom hooks are transformed into separate [Hook] classes that can be instantiated
/// as VComponentWrapper nodes.
///
/// Matches patterns like:
/// - function useCounter(start: number) { ... }
/// - const useToggle = (initial: boolean) => { ... }
///
/// Hook functions:
/// - Start with "use" (lowercase)
/// - Can have parameters that become _config.* properties
/// - Can have useState/useEffect internally
/// - Can return values (including JSX via "ui" variable)
/// </summary>
public class CustomHookVisitor : TokenVisitor
{
    private readonly List<ComponentModel> _components;
    private IReadOnlyList<Token>? _tokens;

    public CustomHookVisitor(List<ComponentModel> components)
    {
        _components = components;
    }

    public override void OnBegin(IReadOnlyList<Token> tokens)
    {
        _tokens = tokens;

        // Post-process components to identify hooks based on naming convention
        foreach (var component in _components.ToList())
        {
            // Check if name starts with lowercase "use"
            if (component.Name.StartsWith("use") && component.Name.Length > 3 && char.IsUpper(component.Name[3]))
            {
                component.IsHook = true;
                component.HookConfig = new HookConfigModel();

                // Rename component to PascalCase class name (UseCounter -> UseCounterHook)
                var hookClassName = char.ToUpper(component.Name[0]) + component.Name.Substring(1) + "Hook";

                // Store original name for reference
                Context.Set($"HookOriginalName:{hookClassName}", component.Name);

                // Extract parameters from the component's parameter tokens
                ExtractHookParameters(component);
            }
        }
    }

    /// <summary>
    /// Extracts hook parameters from the function signature.
    /// These become _config.* properties in the generated hook class.
    /// </summary>
    private void ExtractHookParameters(ComponentModel hook)
    {
        var paramTokens = Context.Get<Token[]>($"ComponentParams:{hook.Name}");
        if (paramTokens == null || paramTokens.Length == 0) return;

        // Parse parameters: (namespace: string, start: number = 0)
        // State machine approach:
        // - Look for identifier at start of parameter or after comma
        // - That identifier is the parameter name
        // - Skip until we hit , or end (handling : for types and = for defaults)

        var paramIndex = 0;
        var i = 0;
        var expectingParamName = true;

        while (i < paramTokens.Length)
        {
            var token = paramTokens[i];

            // Skip whitespace
            if (token.Type == TokenType.Whitespace)
            {
                i++;
                continue;
            }

            if (expectingParamName)
            {
                // We're at the start of a parameter - the first identifier is the name
                // Note: In TypeScript/JS, reserved words can be used as parameter names
                // so we accept both Identifier and Keyword tokens as parameter names
                if (token.Type == TokenType.Identifier || token.Type == TokenType.Keyword)
                {
                    var param = new HookParameter
                    {
                        Name = token.Value,
                        Index = paramIndex++
                    };

                    i++;
                    expectingParamName = false;

                    // Now skip the type annotation if present (: type)
                    // Skip whitespace first
                    while (i < paramTokens.Length && paramTokens[i].Type == TokenType.Whitespace)
                        i++;

                    if (i < paramTokens.Length && paramTokens[i].Value == ":")
                    {
                        i++; // Skip :

                        // Skip ALL type tokens until we hit , or = or end
                        // This includes: string, number, boolean, MyType, Array<T>, etc.
                        int angleBracketDepth = 0;
                        while (i < paramTokens.Length)
                        {
                            var t = paramTokens[i];
                            if (t.Value == "<") angleBracketDepth++;
                            else if (t.Value == ">") angleBracketDepth--;
                            else if (angleBracketDepth == 0 && (t.Value == "," || t.Value == "="))
                                break;
                            i++;
                        }
                    }

                    // Skip whitespace
                    while (i < paramTokens.Length && paramTokens[i].Type == TokenType.Whitespace)
                        i++;

                    // Check for default value (= value)
                    if (i < paramTokens.Length && paramTokens[i].Value == "=")
                    {
                        i++; // Skip =

                        // Collect default value tokens until , or end
                        var defaultTokens = new List<Token>();
                        int parenDepth = 0;
                        while (i < paramTokens.Length)
                        {
                            var t = paramTokens[i];
                            if (t.Value == "(") parenDepth++;
                            else if (t.Value == ")") parenDepth--;
                            else if (parenDepth == 0 && t.Value == ",")
                                break;

                            if (t.Type != TokenType.Whitespace)
                                defaultTokens.Add(t);
                            i++;
                        }

                        if (defaultTokens.Count > 0)
                        {
                            param.DefaultValue = string.Join("", defaultTokens.Select(t => t.Value));
                        }
                    }

                    hook.HookConfig!.Parameters.Add(param);
                }
                else
                {
                    // Not an identifier - skip (e.g., could be destructuring { })
                    i++;
                }
            }
            else
            {
                // We've captured a parameter name, now look for comma to start next param
                if (token.Value == ",")
                {
                    expectingParamName = true;
                }
                i++;
            }
        }
    }
}
