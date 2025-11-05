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
public partial class UseStateTest : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private string name = "John";

    [State]
    private bool isActive = true;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", new Dictionary<string, string>(), $"Count:{(count)}"),
            new VElement("p", new Dictionary<string, string>(), $"Name:{(name)}"),
            new VElement("p", new Dictionary<string, string>(), $"Active:{((new MObject(isActive)) ? "Yes" : "No")}")
        });
    }
}

}
