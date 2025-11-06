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
public partial class Counter : MinimactComponent
{
    [Prop]
    public dynamic count { get; set; }

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "counter" }, new VNode[]
        {
            new VElement("span", "1.1", new Dictionary<string, string>(), $"Count:{(count)}"),
            new VElement("button", "1.2", new Dictionary<string, string> { ["onclick"] = "increment" }, "+")
        });
    }
}

}
