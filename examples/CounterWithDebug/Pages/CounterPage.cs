using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Rendering;
using Minimact.AspNetCore.Extensions;
using Minimact.AspNetCore.SPA;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;

namespace CounterWithDebug.Pages;

[Component]
public partial class CounterPage : MinimactComponent
{
    [State]
    private int count = 0;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Simple Counter"),
            new VElement("p", "1.2", new Dictionary<string, string> { ["style"] = "font-size: 32px; font-weight: bold; color: #0066cc;" }, $"Count:{(count)}"),
            new VElement("div", "1.3", new Dictionary<string, string> { ["style"] = "margin-top: 20px;" }, new VNode[]
            {
                new VElement("button", "1.3.1", new Dictionary<string, string> { ["style"] = "padding: 10px 20px; font-size: 16px; margin-right: 10px;", ["onclick"] = "Handle0" }, "Decrement"),
                new VElement("button", "1.3.2", new Dictionary<string, string> { ["style"] = "padding: 10px 20px; font-size: 16px; margin-right: 10px;", ["onclick"] = "Handle2" }, "Increment"),
                new VElement("button", "1.3.3", new Dictionary<string, string> { ["style"] = "padding: 10px 20px; font-size: 16px;", ["onclick"] = "Handle4" }, "Reset")
            }),
            new VElement("div", "1.4", new Dictionary<string, string> { ["style"] = "margin-top: 40px; padding: 20px; background: #e3f2fd; border-radius: 8px;" }, new VNode[]
            {
                new VElement("h3", "1.4.1", new Dictionary<string, string>(), "🧭 Navigation Test"),
                new VElement("p", "1.4.2", new Dictionary<string, string>(), "Click the link below to navigate to the list page via SPA navigation (no page reload):"),
                new VElement("Link", "1.4.3", new Dictionary<string, string> { ["to"] = "/list" }, "Go to List Page →")
            }),
            new VElement("div", "1.5", new Dictionary<string, string> { ["style"] = "margin-top: 20px; padding: 20px; background: #fffbea; border: 2px solid #f59e0b; border-radius: 8px;" }, new VNode[]
            {
                new VElement("h3", "1.5.1", new Dictionary<string, string> { ["style"] = "margin-top: 0;" }, "🔍 Debug Mode Active"),
                new VElement("p", "1.5.2", new Dictionary<string, string>(), "Every button click sends debug messages to the server via SignalR!"),
                new VElement("ol", "1.5.3", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("li", "1.5.3.1", new Dictionary<string, string>(), "Open Visual Studio"),
                    new VElement("li", "1.5.3.2", new Dictionary<string, string>(), new VNode[]
                    {
                        new VText("Set breakpoint in", "1.5.3.2.1"),
                        new VElement("code", "1.5.3.2.2", new Dictionary<string, string>(), "MinimactHub.cs"),
                        new VText("at line 27 (DebugMessage method)", "1.5.3.2.3")
                    }),
                    new VElement("li", "1.5.3.3", new Dictionary<string, string>(), "Click any button above"),
                    new VElement("li", "1.5.3.4", new Dictionary<string, string>(), "Inspect the debug data: category, message, and data object")
                }),
                new VElement("p", "1.5.4", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("strong", "1.5.4.1", new Dictionary<string, string>(), "Debug categories you'll see:")
                }),
                new VElement("ul", "1.5.5", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("li", "1.5.5.1", new Dictionary<string, string>(), new VNode[]
                    {
                        new VElement("code", "1.5.5.1.1", new Dictionary<string, string>(), "state"),
                        new VText("- useState calls with old/new values", "1.5.5.1.2")
                    }),
                    new VElement("li", "1.5.5.2", new Dictionary<string, string>(), new VNode[]
                    {
                        new VElement("code", "1.5.5.2.1", new Dictionary<string, string>(), "templates"),
                        new VText("- Template match results", "1.5.5.2.2")
                    }),
                    new VElement("li", "1.5.5.3", new Dictionary<string, string>(), new VNode[]
                    {
                        new VElement("code", "1.5.5.3.1", new Dictionary<string, string>(), "minimact"),
                        new VText("- General framework activity", "1.5.5.3.2")
                    }),
                    new VElement("li", "1.5.5.4", new Dictionary<string, string>(), new VNode[]
                    {
                        new VElement("code", "1.5.5.4.1", new Dictionary<string, string>(), "dom-patcher"),
                        new VText("- DOM patch operations", "1.5.5.4.2")
                    })
                })
            })
        });
    }

    public void Handle0()
    {
        SetState(nameof(count), count - 1);
    }

    public void Handle2()
    {
        SetState(nameof(count), count + 1);
    }

    public void Handle4()
    {
        SetState(nameof(count), 0);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function () {\n  setCount(count - 1);\n}",
            ["Handle2"] = @"function () {\n  setCount(count + 1);\n}",
            ["Handle4"] = @"function () {\n  setCount(0);\n}"
        };
    }
}

