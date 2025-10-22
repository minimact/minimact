using Minimact.Runtime.Core;
using Minimact.Runtime.Extensions;
using MinimactHelpers = Minimact.Runtime.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class Counter : MinimactComponent
{
    [State]
    private int count = 0;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new Dictionary<string, string> { ["className"] = "counter" }, new VNode[]
        {
            new VElement("h2", new Dictionary<string, string>(), "Counter Example"),
            new VElement("p", new Dictionary<string, string>(), new VNode[]
            {
                new VText("Count:"),
                new VText($"{count}")
            }),
            new VElement("button", new Dictionary<string, string> { ["onclick"] = "Handle0" }, "Increment"),
            new VElement("button", new Dictionary<string, string> { ["onclick"] = "Handle1" }, "Decrement"),
            new VElement("button", new Dictionary<string, string> { ["onclick"] = "Handle2" }, "Reset")
        });
    }

    private void Handle0()
    {
        // TODO: Implement Handle0
    }

    private void Handle1()
    {
        // TODO: Implement Handle1
    }

    private void Handle2()
    {
        // TODO: Implement Handle2
    }
}
