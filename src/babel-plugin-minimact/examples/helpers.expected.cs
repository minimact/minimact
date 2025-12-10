using Minimact;
using System.Collections.Generic;

// getComponentName() extracts names from various declaration styles:
//
// FunctionDeclaration:        path.node.id.name → "FunctionDeclaration"
// ArrowFunction (const):      path.parent.id.name → "ArrowFunction"
// FunctionExpression (const): path.parent.id.name → "FunctionExpression"
// export function:            path.node.id.name → "ExportedFunction"
// export const:               path.parent.id.name → "ExportedArrow"

[Component]
public partial class HelpersExample : MinimactComponent
{
    // escapeCSharpString() escapes special characters for C# string literals
    //
    // Input:  Hello "World"
    // Output: Hello \"World\"
    //
    // Input:  C:\Users\Name
    // Output: C:\\Users\\Name
    //
    // Input:  Line1\nLine2\tTabbed
    // Output: Line1\\nLine2\\tTabbed (or actual newlines in verbatim strings)

    [State]
    private string text = "Hello \"World\"";

    [State]
    private string path = "C:\\Users\\Name";

    [State]
    private string special = "Line1\nLine2\tTabbed";

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            // Escaped quotes in attribute
            new VElement("p", "1.1", new Dictionary<string, string>
            {
                ["title"] = "Quote: \"escaped\""
            }, new VText($"{text}", "1.1.1")),

            // Escaped backslashes in attribute
            new VElement("p", "1.2", new Dictionary<string, string>
            {
                ["data-path"] = "C:\\path\\to\\file"
            }, new VText($"{path}", "1.2.1")),

            new VElement("code", "1.3", new Dictionary<string, string>(), new VText($"{special}", "1.3.1"))
        });
    }
}

// helpers.cjs provides:
//
// getComponentName(path):
//   - Extracts component name from FunctionDeclaration, ArrowFunction, etc.
//   - Returns null if not a valid component (anonymous, non-PascalCase)
//
// escapeCSharpString(str):
//   - Escapes \, ", \n, \r, \t for C# string literals
//   - Used in attribute values and string props
//
// Usage in generators:
//   const name = getComponentName(path);  // "MyComponent"
//   const escaped = escapeCSharpString('Say "Hi"');  // 'Say \\"Hi\\"'
