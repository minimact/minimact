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
public partial class EventHandlersTest : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private string message = "";

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), $"Count:{(count)}"),
            new VElement("button", "1.2", new Dictionary<string, string> { ["onclick"] = "Handle0" }, "Increment"),
            new VElement("button", "1.3", new Dictionary<string, string> { ["onclick"] = "Handle2" }, "Decrement"),
            new VElement("button", "1.4", new Dictionary<string, string> { ["onclick"] = "Handle4" }, "Reset"),
            new VElement("input", "1.5", new Dictionary<string, string> { ["value"] = $"{message}", ["placeholder"] = "Type something...", ["onchange"] = "Handle6" })
        });
    }

    public void Handle0()
    {
        SetState(nameof(count), count + 1);
    }

    public void Handle2()
    {
        SetState(nameof(count), count - 1);
    }

    public void Handle4()
    {
        SetState(nameof(count), 0);
    }

    public void Handle6(dynamic value)
    {
        SetState(nameof(message), value);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function () {\n  setCount(count + 1);\n}",
            ["Handle2"] = @"function () {\n  setCount(count - 1);\n}",
            ["Handle4"] = @"function () {\n  setCount(0);\n}",
            ["Handle6"] = @"function (value) {\n  setMessage(value);\n}"
        };
    }
}

}
