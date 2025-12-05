using Reluxer.Attributes;
using Reluxer.Matching;
using Reluxer.Tokens;
using Reluxer.Transformer.Models;
using Reluxer.Visitor;

namespace Reluxer.Transformer.Visitors;

/// <summary>
/// Visitor that extracts props from destructured function parameters.
/// Matches patterns like: function Component({ prop1, prop2, prop3 })
/// </summary>
public class PropsVisitor : TokenVisitor
{
    public List<PropField> Props { get; } = new();

    private string _currentComponent = "";

    public override void OnBegin(IReadOnlyList<Token> tokens)
    {
        Props.Clear();
        _currentComponent = Context.Get<string>("CurrentComponent") ?? "";

        // Get the body tokens from context
        var bodyKey = $"ComponentBody:{_currentComponent}";

        // We need to check the function parameter tokens, not body
        // The parameter tokens should be accessible before the body
        // Let's traverse the raw tokens looking for destructured params
    }

    /// <summary>
    /// Call this to extract props for a specific component's parameter tokens.
    /// </summary>
    public void ExtractPropsFromParams(IReadOnlyList<Token> tokens, string componentName)
    {
        Props.Clear();
        _currentComponent = componentName;

        // Look for pattern: { identifier, identifier, ... }
        // This represents destructured props
        int braceDepth = 0;
        bool inDestructure = false;

        for (int i = 0; i < tokens.Count; i++)
        {
            var token = tokens[i];

            if (token.Value == "{")
            {
                braceDepth++;
                if (braceDepth == 1)
                {
                    inDestructure = true;
                }
            }
            else if (token.Value == "}")
            {
                braceDepth--;
                if (braceDepth == 0)
                {
                    inDestructure = false;
                }
            }
            else if (inDestructure && braceDepth == 1 && token.Type == TokenType.Identifier)
            {
                // This is a prop name
                // Check if next non-whitespace is = (default value) or , or }
                var propName = token.Value;
                string? defaultValue = null;

                // Look ahead for default value
                int j = i + 1;
                while (j < tokens.Count && tokens[j].Type == TokenType.Whitespace)
                    j++;

                if (j < tokens.Count && tokens[j].Value == "=")
                {
                    // Has default value - skip the = and get the value
                    j++;
                    while (j < tokens.Count && tokens[j].Type == TokenType.Whitespace)
                        j++;

                    if (j < tokens.Count)
                    {
                        // Get the default value (could be a simple literal or expression)
                        var valueToken = tokens[j];
                        defaultValue = valueToken.Value;
                    }
                }

                // Add the prop if not already present
                if (!Props.Any(p => p.Name == propName))
                {
                    Props.Add(new PropField
                    {
                        Name = propName,
                        Type = "dynamic", // Default to dynamic for JS props
                        DefaultValue = defaultValue,
                        IsRequired = defaultValue == null
                    });
                }
            }
        }
    }
}
