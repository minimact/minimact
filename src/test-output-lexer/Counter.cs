using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class Counter : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private string message = "Hello";

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["id"] = "counter-root" }, new VNode[]
        {
            new VElement("span", "1.1", new Dictionary<string, string> { ["id"] = "counter-value" }, new VNode[]
            {
                new VText($"{(count)}", "1.1.1")
            }),
            new VElement("span", "1.2", new Dictionary<string, string> { ["id"] = "message" }, new VNode[]
            {
                new VText($"{(message)}", "1.2.1")
            }),
            new VElement("button", "1.3", new Dictionary<string, string> { ["id"] = "increment-btn", ["type"] = "button", ["onclick"] = "Handle0" }, "Increment")
        });
    }

    public void Handle0()
    {
        SetState(nameof(count), count + 1);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function () {\n  setCount(count + 1);\n}"
        };
    }
}
