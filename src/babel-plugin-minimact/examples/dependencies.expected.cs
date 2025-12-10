using Minimact;
using System.Collections.Generic;

[Component]
public partial class DependenciesExample : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private string name = "User";

    [State]
    private List<object> items = new List<object>();

    [State]
    private dynamic config = new { theme = "dark" };

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("span", "1.1", new Dictionary<string, string>(), new VText($"{count}", "1.1.1")),
            new VElement("span", "1.2", new Dictionary<string, string>(), new VText($"{name}", "1.2.1")),
            new VElement("span", "1.3", new Dictionary<string, string>(), new VText($"{count} items for {name}", "1.3.1")),
            new VElement("span", "1.4", new Dictionary<string, string>(), new VText($"Theme: {config.theme}", "1.4.1")),
            new VElement("span", "1.5", new Dictionary<string, string>(), new VText($"Total: {items.Count}", "1.5.1")),
            new VElement("span", "1.6", new Dictionary<string, string>(), new VText($"{name} has {count * 2} points", "1.6.1"))
        });
    }
}

// Dependency analysis per node:
// {
//   "1.1.1": ["count"],
//   "1.2.1": ["name"],
//   "1.3.1": ["count", "name"],
//   "1.4.1": ["config"],
//   "1.5.1": ["items"],
//   "1.6.1": ["name", "count"]
// }
