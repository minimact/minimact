using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class Index : MinimactComponent
{
    [State]
    private int count = 0;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new Dictionary<string, string> { ["className"] = "counter" }, new VNode[]
        {
            new VElement("h1", new Dictionary<string, string>(), "Welcome to Minimact!"),
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
        SetState(nameof(count), count + 1);
    }

    private void Handle1()
    {
        SetState(nameof(count), count - 1);
    }

    private void Handle2()
    {
        SetState(nameof(count), 0);
    }
}
