using Minimact;
using System.Collections.Generic;

[Component]
public partial class HexPathExample : MinimactComponent
{
    [State]
    private List<string> items = new List<string> { "A", "B", "C" };

    [State]
    private bool showExtra = true;

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("header", "1.1", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h1", "1.1.1", new Dictionary<string, string>(), new VText("Title", "1.1.1.1")),
                new VElement("nav", "1.1.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("a", "1.1.2.1", new Dictionary<string, string> { ["href"] = "/" }, "Home"),
                    new VElement("a", "1.1.2.2", new Dictionary<string, string> { ["href"] = "/about" }, "About")
                })
            }),
            new VElement("main", "1.2", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("ul", "1.2.1", new Dictionary<string, string>(),
                    items.Select(item => new VElement("li", "1.2.1.1", new Dictionary<string, string>
                    {
                        ["key"] = $"{item}"
                    }, new VText($"{item}", "1.2.1.1.1"))).ToArray()),
                (showExtra)
                    ? new VElement("aside", "1.2.2", new Dictionary<string, string>(), "Extra")
                    : new VNull("1.2.2")
            }),
            new VElement("footer", "1.3", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("p", "1.3.1", new Dictionary<string, string>(), new VText("Footer text", "1.3.1.1"))
            })
        });
    }
}

// hexPath.cjs provides HexPathGenerator class:
//
// Path structure: "parent.child" where each segment is a sequential number
//
// Example tree:
//   div          → "1"
//   ├─ header    → "1.1"
//   │  ├─ h1     → "1.1.1"
//   │  └─ nav    → "1.1.2"
//   │     ├─ a   → "1.1.2.1"
//   │     └─ a   → "1.1.2.2"
//   ├─ main      → "1.2"
//   │  ├─ ul     → "1.2.1"
//   │  │  └─ li  → "1.2.1.1" (template, each instance uses same path)
//   │  └─ aside  → "1.2.2" (conditional)
//   └─ footer    → "1.3"
//
// Paths are used for:
// 1. Hot reload diffing (identify which nodes changed)
// 2. Template binding (map bindings to specific DOM locations)
// 3. Structural changes (track insertions/deletions)
// 4. VNull placeholders (preserve position for conditionally hidden elements)
