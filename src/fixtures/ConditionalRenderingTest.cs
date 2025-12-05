using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class ConditionalRenderingTest : MinimactComponent
{
    [State]
    private bool isLoggedIn = false;

    [State]
    private dynamic user = new VNull("");

    [State]
    private int count = 0;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return MinimactHelpers.createElement("div", null, (new MObject(isLoggedIn)) ? new VElement("div", "1.1.1", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h1", "1.1.1.1", new Dictionary<string, string>(), "Welcome back!"),
                new VElement("button", "1.1.1.2", new Dictionary<string, string> { ["onclick"] = "Handle0" }, "Logout")
            }) : new VElement("div", "1.1.2", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h1", "1.1.2.1", new Dictionary<string, string>(), "Please log in"),
                new VElement("button", "1.1.2.2", new Dictionary<string, string> { ["onclick"] = "Handle2" }, "Login")
            }), (new MObject(user)) ? new VElement("p", "1.2.1", new Dictionary<string, string>(), $"User:{(user.name)}") : new VNull("1.2"), (count > 0) ? new VElement("p", "1.3.1", new Dictionary<string, string>(), $"Count is positive:{(count)}") : new VNull("1.3"));
    }

    public void Handle0()
    {
        SetState(nameof(isLoggedIn), false);
    }

    public void Handle2()
    {
        SetState(nameof(isLoggedIn), true);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function () {\n  setIsLoggedIn(false);\n}",
            ["Handle2"] = @"function () {\n  setIsLoggedIn(true);\n}"
        };
    }
}
