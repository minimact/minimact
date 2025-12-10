using Minimact;
using System.Collections.Generic;

[Component]
public partial class ConditionalsExample : MinimactComponent
{
    [State]
    private bool isLoggedIn = false;

    [State]
    private dynamic user = null;

    [State]
    private List<object> items = new List<object>();

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            (isLoggedIn)
                ? new VElement("p", "1.1", new Dictionary<string, string>(), "Welcome back!")
                : new VElement("p", "1.2", new Dictionary<string, string>(), "Please log in"),
            (new MObject(user))
                ? new VElement("span", "1.3", new Dictionary<string, string>(), new VText($"Hello, {user.name}", "1.3.1"))
                : new VNull("1.3"),
            (items.Count > 0)
                ? new VElement("ul", "1.4", new Dictionary<string, string>(),
                    items.Select(i => new VElement("li", "1.4.1", new Dictionary<string, string>(), new VText($"{i}", "1.4.1.1"))).ToArray())
                : new VNull("1.4")
        });
    }
}
