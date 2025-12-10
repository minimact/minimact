using Minimact;
using System.Collections.Generic;

[Component]
public partial class JsxExample : MinimactComponent
{
    [State]
    private string title = "Hello";

    [State]
    private List<string> items = new List<string> { "a", "b", "c" };

    [State]
    private bool isActive = true;

    private void Handle0()
    {
        title = "Clicked";
        SetState(nameof(title), title);
    }

    protected override VNode Render()
    {
        // jsx.cjs generates all of this:
        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "container", ["id"] = "main" }, new VNode[]
        {
            // Static text → VText with literal string
            new VElement("h1", "1.1", new Dictionary<string, string>(), "Static Title"),

            // Expression → VText with interpolation
            new VElement("h2", "1.2", new Dictionary<string, string>(), new VText($"{title}", "1.2.1")),

            // Multiple children with mixed content
            new VElement("p", "1.3", new Dictionary<string, string>(), new VNode[]
            {
                new VText("Hello, ", "1.3.1"),
                new VElement("strong", "1.3.2", new Dictionary<string, string>(), "world"),
                new VText("!", "1.3.3")
            }),

            // Self-closing → no children
            new VElement("input", "1.4", new Dictionary<string, string> { ["type"] = "text", ["placeholder"] = "Enter text" }),

            // Event handler → onclick attribute
            new VElement("button", "1.5", new Dictionary<string, string> { ["onclick"] = "Handle0" }, "Click me"),

            // && conditional → ternary with VNull
            (isActive)
                ? new VElement("span", "1.6", new Dictionary<string, string> { ["class"] = "badge" }, "Active")
                : new VNull("1.6"),

            // Ternary → C# ternary
            (isActive)
                ? new VElement("span", "1.7", new Dictionary<string, string>(), "Yes")
                : new VElement("span", "1.8", new Dictionary<string, string>(), "No"),

            // Map → LINQ Select
            new VElement("ul", "1.9", new Dictionary<string, string>(),
                items.Select(item => new VElement("li", "1.9.1", new Dictionary<string, string> { ["key"] = $"{item}" },
                    new VText($"{item}", "1.9.1.1"))).ToArray()),

            // Fragment → Fragment wrapper
            new Fragment(
                new VElement("span", "1.10.1", new Dictionary<string, string>(), "First"),
                new VElement("span", "1.10.2", new Dictionary<string, string>(), "Second")
            ),

            // Nested → recursive generation
            new VElement("div", "1.11", new Dictionary<string, string> { ["class"] = "card" }, new VNode[]
            {
                new VElement("header", "1.11.1", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("h3", "1.11.1.1", new Dictionary<string, string>(), "Card Title")
                }),
                new VElement("main", "1.11.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("p", "1.11.2.1", new Dictionary<string, string>(), "Card content")
                })
            })
        });
    }
}

// jsx.cjs generateJSXElement(node, component, indent) handles:
//
// Element types:
//   JSXElement → VElement(tag, path, props, children)
//   JSXFragment → Fragment(children)
//   JSXText → VText or inline string
//   JSXExpressionContainer → VText with interpolation
//
// Attribute handling:
//   className → class
//   htmlFor → for
//   camelCase → lowercase
//   on* → event handler reference
//   style={obj} → converted CSS string
//   ref={name} → ref attribute
//   key → preserved for diffing
//
// Child handling:
//   Static text → inline string: "Hello"
//   Single expression → VText($"{expr}", path)
//   Mixed → VNode array
//   Conditional → ternary with VNull placeholder
//   Map → LINQ Select().ToArray()
