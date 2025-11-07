using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Rendering;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;

namespace MinimactTest.Components
{
[Component]
public partial class UserProfile : MinimactComponent
{
    [Prop]
    public dynamic user { get; set; }

    [Prop]
    public bool loading { get; set; }

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return MinimactHelpers.createElement("div", new { className = "profile" }, (new MObject(loading)) ? new VElement("div", "1.1.1", new Dictionary<string, string> { ["class"] = "spinner" }, "Loading...") : MinimactHelpers.createElement("div", new { className = "user-info" }, new VElement("h1", "1.1.1.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(user.name)}", "1.1.1.2.1")
                }), new VElement("p", "1.1.1.3", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(user.email)}", "1.1.1.3.1")
                }), (new MObject(user.isAdmin)) ? new VElement("span", "1.1.1.4.1", new Dictionary<string, string> { ["class"] = "badge" }, "Admin") : new VNull("1.1.1.4")));
    }
}

}
