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

    [Ref]
    private object buttonRef = null;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "10000000", new Dictionary<string, string> { ["class"] = "counter" }, new VNode[]
        {
            new VElement("h1", "10000000.10000000", new Dictionary<string, string>(), "Counter Example"),
            new VElement("p", "10000000.20000000", new Dictionary<string, string>(), $"Current count:{(count)}"),
            new VElement("button", "10000000.30000000", new Dictionary<string, string> { ["ref"] = $"{buttonRef}", ["onclick"] = "Handle0" }, "Increment"),
            new VElement("button", "10000000.40000000", new Dictionary<string, string> { ["onclick"] = "Handle1" }, "Reset")
        });
    }

    [OnStateChanged("count")]
    private void Effect_0()
    {
        Console.WriteLine("Count changed to:" + count);
    }

    public void Handle0()
    {
        SetState(nameof(count), count + 1);
    }

    public void Handle1()
    {
        SetState(nameof(count), 0);
    }
}

}
