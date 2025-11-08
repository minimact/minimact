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
    [State]
    private int count = 0;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["id"] = "counter-root" }, new VNode[]
        {
            new VElement("span", "1.1", new Dictionary<string, string> { ["id"] = "counter-value" }, new VNode[]
            {
                new VText($"{(count)}", "1.1.1")
            }),
            new VElement("button", "1.2", new Dictionary<string, string> { ["id"] = "increment-btn", ["type"] = "button", ["onclick"] = "Handle0" }, "Increment")
        });
    }

    public void Handle0()
    {
        SetState(nameof(count), count + 1);
    }
}

}
