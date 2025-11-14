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
// ============================================================
// HOOK CLASS - Generated from useToggle
// ============================================================
[Hook]
public partial class UseToggleHook : MinimactComponent
{
    // Configuration (from hook arguments)
    private dynamic initial => GetState<dynamic>("_config.initial");

    // Hook state
    [State]
    private dynamic on = initial;

    // State setters
    private void setOn(dynamic value)
    {
        SetState(nameof(on), value);
    }

    // Hook methods
    private void toggle()
    {
        return setOn(!on);
    }

    // Hook UI rendering
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("button", "1", new Dictionary<string, string> { ["class"] = "toggle-button", ["onclick"] = "toggle" }, new VNode[]
        {
            new VText($"{((new MObject(on)) ? "ON" : "OFF")}", "1.1")
        });
    }

}


[Component]
public partial class TestHookErrorCases : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "test-error-cases" }, new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), "Hook Error Cases Test"),
            new VElement("div", "1.2", new Dictionary<string, string> { ["class"] = "section" }, new VNode[]
            {
                new VElement("h2", "1.2.1", new Dictionary<string, string>(), "Valid Import (Control)"),
                new VElement("p", "1.2.2", new Dictionary<string, string>(), $"Toggle is:{((new MObject(GetState<dynamic>("toggle1.on"))) ? "ON" : "OFF")}"),
                new VElement("button", "1.2.3", new Dictionary<string, string> { ["onclick"] = "toggle" }, "Manual Toggle"),
                new VComponentWrapper
      {
        ComponentName = "toggle1",
        ComponentType = "UseToggleHook",
        HexPath = "1.2.4",
        InitialState = new Dictionary<string, object> { ["_config.param0"] = true }
      }
            }),
            new VElement("div", "1.3", new Dictionary<string, string> { ["class"] = "section" }, new VNode[]
            {
                new VElement("h2", "1.3.1", new Dictionary<string, string>(), "Error Cases"),
                new VElement("p", "1.3.2", new Dictionary<string, string>(), "Check console for warnings about:"),
                new VElement("ul", "1.3.3", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("li", "1.3.3.1", new Dictionary<string, string>(), "Non-relative imports (node_modules) - should be skipped"),
                    new VElement("li", "1.3.3.2", new Dictionary<string, string>(), "Missing files - should be skipped gracefully"),
                    new VElement("li", "1.3.3.3", new Dictionary<string, string>(), "Circular imports - should be detected")
                })
            })
        });
    }
}

}
