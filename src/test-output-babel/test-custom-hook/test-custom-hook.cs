using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

// ============================================================
// HOOK CLASS - Generated from useCounter
// ============================================================
[Hook]
public partial class UseCounterHook : MinimactComponent
{
    // Configuration (from hook arguments)
    private dynamic start => GetState<dynamic>("_config.start");

    // Hook state
    [State]
    private dynamic count = start;

    // State setters
    private void setCount(dynamic value)
    {
        SetState(nameof(count), value);
    }

    // Hook methods
    private void increment()
    {
        setCount((count + 1));
    }

    private void decrement()
    {
        setCount((count - 1));
    }

    private void reset()
    {
        setCount(start);
    }

    // Hook UI rendering
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "counter-widget" }, new VNode[]
        {
            new VElement("button", "1.1", new Dictionary<string, string> { ["onclick"] = "decrement" }, "-"),
            new VElement("span", "1.2", new Dictionary<string, string> { ["class"] = "count-display" }, new VNode[]
            {
                new VText($"{(count)}", "1.2.1")
            }),
            new VElement("button", "1.3", new Dictionary<string, string> { ["onclick"] = "increment" }, "+"),
            new VElement("button", "1.4", new Dictionary<string, string> { ["onclick"] = "reset" }, "Reset")
        });
    }

}


[Component]
public partial class TestCustomHook : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "test-container" }, new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), "Custom Hook Test"),
            new VElement("p", "1.2", new Dictionary<string, string>(), $"Count:{(count)}"),
            new VElement("div", "1.3", new Dictionary<string, string> { ["class"] = "controls" }, new VNode[]
            {
                new VElement("button", "1.3.1", new Dictionary<string, string> { ["onclick"] = "increment" }, "External +1"),
                new VElement("button", "1.3.2", new Dictionary<string, string> { ["onclick"] = "decrement" }, "External -1"),
                new VElement("button", "1.3.3", new Dictionary<string, string> { ["onclick"] = "reset" }, "External Reset")
            }),
            new VElement("hr", "1.4", new Dictionary<string, string>()),
            new VElement("div", "1.5", new Dictionary<string, string> { ["class"] = "hook-ui" }, new VNode[]
            {
                new VElement("h2", "1.5.1", new Dictionary<string, string>(), "Hook UI:"),
                new VComponentWrapper
      {
        ComponentName = "myCounter",
        ComponentType = "UseCounterHook",
        HexPath = "1.5.2",
        InitialState = new Dictionary<string, object> { ["_config.param0"] = 0 }
      }
            })
        });
    }
}
