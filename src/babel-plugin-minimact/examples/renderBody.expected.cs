using Minimact;
using System.Collections.Generic;

[Component]
public partial class RenderBodyExample : MinimactComponent
{
    [State]
    private bool visible = true;

    [State]
    private int count = 0;

    private void Handle0()
    {
        count = count + 1;
        SetState(nameof(count), count);
    }

    private void Handle1()
    {
        visible = !visible;
        SetState(nameof(visible), visible);
    }

    // renderBody.cjs generates this entire method
    protected override VNode Render()
    {
        // Local variables are declared at top of Render()
        var doubled = count * 2;

        // Return statement with root VNode
        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "container" }, new VNode[]
        {
            new VElement("header", "1.1", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h1", "1.1.1", new Dictionary<string, string>(), "Title")
            }),
            new VElement("main", "1.2", new Dictionary<string, string>(), new VNode[]
            {
                (visible)
                    ? new VElement("p", "1.2.1", new Dictionary<string, string>(), new VText($"Count is {count}, doubled is {doubled}", "1.2.1.1"))
                    : new VNull("1.2.1")
            }),
            new VElement("footer", "1.3", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("button", "1.3.1", new Dictionary<string, string> { ["onclick"] = "Handle0" }, "+"),
                new VElement("button", "1.3.2", new Dictionary<string, string> { ["onclick"] = "Handle1" }, "Toggle")
            })
        });
    }
}

// renderBody.cjs responsibilities:
// 1. Generate `protected override VNode Render()` signature
// 2. Emit local variable declarations at method start
// 3. Generate return statement with JSX tree
// 4. Delegate JSX generation to jsx.cjs
