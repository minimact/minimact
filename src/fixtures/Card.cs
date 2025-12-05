using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class Card : MinimactComponent
{
    [Prop]
    public dynamic title { get; set; }

    [Prop]
    public dynamic children { get; set; }

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "card" }, new VNode[]
        {
            new VElement("div", "1.1", new Dictionary<string, string> { ["class"] = "card-header" }, new VNode[]
            {
                new VElement("h2", "1.1.1", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(title)}", "1.1.1.1")
                })
            }),
            new VElement("div", "1.2", new Dictionary<string, string> { ["class"] = "card-body" }, new VNode[]
            {
                new VText($"{(children)}", "1.2.1")
            })
        });
    }
}

[Component]
public partial class Dashboard : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "dashboard" }, new VNode[]
        {
            new VElement("Card", "1.1", new Dictionary<string, string> { ["title"] = "Statistics" }, new VNode[]
            {
                new VElement("div", "1.1.1", new Dictionary<string, string> { ["class"] = "stats" }, new VNode[]
                {
                    new VElement("span", "1.1.1.1", new Dictionary<string, string>(), "Views: 1000"),
                    new VElement("span", "1.1.1.2", new Dictionary<string, string>(), "Users: 50")
                })
            }),
            new VElement("Card", "1.2", new Dictionary<string, string> { ["title"] = "Activity" }, new VNode[]
            {
                new VElement("ul", "1.2.1", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("li", "1.2.1.1", new Dictionary<string, string>(), "User logged in"),
                    new VElement("li", "1.2.1.2", new Dictionary<string, string>(), "Data updated")
                })
            })
        });
    }
}
