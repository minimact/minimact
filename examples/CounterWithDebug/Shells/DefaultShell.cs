using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Rendering;
using Minimact.AspNetCore.Extensions;
using Minimact.AspNetCore.SPA;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;

namespace CounterWithDebug.Shells;

[Component]
public partial class DefaultShell : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["style"] = "min-height: 100vh; display: flex; flex-direction: column;" }, new VNode[]
        {
            new VElement("header", "1.1", new Dictionary<string, string> { ["style"] = "background: #333; color: white; padding: 20px;" }, new VNode[]
            {
                new VElement("h1", "1.1.1", new Dictionary<string, string> { ["style"] = "margin: 0;" }, "Minimact Counter - Debug Mode Demo"),
                new VElement("p", "1.1.2", new Dictionary<string, string> { ["style"] = "margin: 5px 0 0 0; opacity: 0.8;" }, "Client debug messages are being sent to the server!")
            }),
            new VElement("main", "1.2", new Dictionary<string, string> { ["style"] = "flex: 1; padding: 20px;" }, new VNode[]
            {
                new VElement("Page", "1.2.1", new Dictionary<string, string>())
            }),
            new VElement("footer", "1.3", new Dictionary<string, string> { ["style"] = "background: #f5f5f5; padding: 15px; text-align: center; border-top: 1px solid #ddd;" }, new VNode[]
            {
                new VElement("p", "1.3.1", new Dictionary<string, string> { ["style"] = "margin: 0;" }, "💡 Debug mode is enabled - Set a breakpoint in MinimactHub.cs:27 (DebugMessage)")
            })
        });
    }
}

