using Minimact;
using Minimact.Runtime;
using System.Collections.Generic;

[Component]
public partial class RuntimeHelpersExample : MinimactComponent
{
    [State]
    private dynamic dynamicProps = new { id = "test", role = "button" };

    [State]
    private string className = "active";

    [State]
    private List<string> children = new List<string> { "Item 1", "Item 2" };

    [State]
    private dynamic style = new { color = "red", fontSize = 16 };

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            // Spread props: RuntimeHelpers.CreateElement merges props at runtime
            RuntimeHelpers.CreateElement("button", "1.1",
                RuntimeHelpers.MergeProps(dynamicProps, new Dictionary<string, string> { ["class"] = className }),
                new VText("Click me", "1.1.1")),

            // Dynamic children: RuntimeHelpers wraps array in VNode[]
            RuntimeHelpers.CreateElement("ul", "1.2",
                new Dictionary<string, string>(),
                RuntimeHelpers.ToVNodes(children)),

            // Complex style: RuntimeHelpers.StyleToString converts object
            RuntimeHelpers.CreateElement("div", "1.3",
                new Dictionary<string, string> { ["style"] = RuntimeHelpers.StyleToString(style) },
                new VText("Styled content", "1.3.1")),

            // Combined spread + dynamic children
            RuntimeHelpers.CreateElement("section", "1.4",
                RuntimeHelpers.MergeProps(dynamicProps),
                children.Select(c => new VElement("span", "1.4.1", new Dictionary<string, string>(), new VText($"{c}", "1.4.1.1"))).ToArray())
        });
    }
}

// runtimeHelpers.cjs generates calls to:
// - RuntimeHelpers.CreateElement(tag, path, props, children)
// - RuntimeHelpers.MergeProps(...propObjects)
// - RuntimeHelpers.ToVNodes(array)
// - RuntimeHelpers.StyleToString(styleObject)
//
// Used when compile-time generation is not possible:
// - Spread props ({...props})
// - Dynamic children arrays
// - Complex computed props
