using Minimact;
using System.Collections.Generic;

[Component]
public partial class StructuralTemplatesExample : MinimactComponent
{
    [State]
    private bool isLoading = true;

    [State]
    private bool hasError = false;

    [State]
    private dynamic user = null;

    [State]
    private List<object> items = new List<object>();

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            // Ternary: isLoading ? <spinner> : <content>
            (isLoading)
                ? new VElement("div", "1.1", new Dictionary<string, string> { ["class"] = "spinner" }, "Loading...")
                : new VElement("div", "1.2", new Dictionary<string, string> { ["class"] = "content" }, "Loaded!"),

            // Logical AND: hasError && <error>
            (hasError)
                ? new VElement("div", "1.3", new Dictionary<string, string> { ["class"] = "error" }, "Something went wrong")
                : new VNull("1.3"),

            // Nested: user ? <welcome> : <login>
            (new MObject(user))
                ? new VElement("div", "1.4", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("h1", "1.4.1", new Dictionary<string, string>(), new VText($"Welcome {user.name}", "1.4.1.1")),
                    (new MObject(user.isAdmin))
                        ? new VElement("span", "1.4.2", new Dictionary<string, string> { ["class"] = "badge" }, "Admin")
                        : new VNull("1.4.2")
                })
                : new VElement("button", "1.5", new Dictionary<string, string>(), "Login"),

            // Expression condition: items.length > 0 && <list>
            (items.Count > 0)
                ? new VElement("ul", "1.6", new Dictionary<string, string>(),
                    items.Select(item => new VElement("li", "1.6.1", new Dictionary<string, string>(), new VText($"{item}", "1.6.1.1"))).ToArray())
                : new VNull("1.6")
        });
    }
}

// Structural templates extracted:
// [
//   { type: "conditional", path: "1.1", conditionBinding: "isLoading", trueBranch: "1.1", falseBranch: "1.2" },
//   { type: "logicalAnd", path: "1.3", conditionBinding: "hasError" },
//   { type: "conditional", path: "1.4", conditionBinding: "user", trueBranch: "1.4", falseBranch: "1.5" },
//   { type: "logicalAnd", path: "1.4.2", conditionBinding: "user.isAdmin" },
//   { type: "logicalAnd", path: "1.6", conditionBinding: "items.length > 0", evaluable: true }
// ]
