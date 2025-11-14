using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

// ============================================================
// HOOK CLASS - Generated from useLocal
// ============================================================
[Hook]
public partial class UseLocalHook : MinimactComponent
{
    // Configuration (from hook arguments)
    private dynamic msg => GetState<dynamic>("_config.msg");

    // Hook state
    [State]
    private dynamic message = msg;

    // State setters
    private void setMessage(dynamic value)
    {
        SetState(nameof(message), value);
    }

    // Hook methods
    private void update()
    {
        return setMessage((message + "!"));
    }

    // Hook UI rendering
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "local-widget" }, new VNode[]
        {
            new VElement("span", "1.1", new Dictionary<string, string>(), new VNode[]
            {
                new VText($"{(message)}", "1.1.1")
            }),
            new VElement("button", "1.2", new Dictionary<string, string> { ["onclick"] = "update" }, "Add !")
        });
    }

}


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
        return setCount((count + 1));
    }

    private void decrement()
    {
        return setCount((count - 1));
    }

    private void reset()
    {
        return setCount(start);
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


// ============================================================
// HOOK CLASS - Generated from useTimer
// ============================================================
[Hook]
public partial class UseTimerHook : MinimactComponent
{
    // Configuration (from hook arguments)
    private dynamic initialSeconds => GetState<dynamic>("_config.initialSeconds");

    // Hook state
    [State]
    private dynamic seconds = initialSeconds;

    // State setters
    private void setSeconds(dynamic value)
    {
        SetState(nameof(seconds), value);
    }

    // Hook methods
    private void tick()
    {
        return setSeconds((seconds + 1));
    }

    private void reset()
    {
        return setSeconds(initialSeconds);
    }

    // Hook UI rendering
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "timer-widget" }, new VNode[]
        {
            new VElement("span", "1.1", new Dictionary<string, string>(), $"Time:{(seconds)}s"),
            new VElement("button", "1.2", new Dictionary<string, string> { ["onclick"] = "tick" }, "Tick"),
            new VElement("button", "1.3", new Dictionary<string, string> { ["onclick"] = "reset" }, "Reset")
        });
    }

}


// ============================================================
// HOOK CLASS - Generated from useDoubler
// ============================================================
[Hook]
public partial class UseDoublerHook : MinimactComponent
{
    // Configuration (from hook arguments)
    private dynamic initial => GetState<dynamic>("_config.initial");

    // Hook state
    [State]
    private dynamic value = initial;

    // State setters
    private void setValue(dynamic value)
    {
        SetState(nameof(value), value);
    }

    // Hook methods
    private void double()
    {
        return setValue((value * 2));
    }

    // Hook UI rendering
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "doubler-widget" }, new VNode[]
        {
            new VElement("span", "1.1", new Dictionary<string, string>(), $"Value:{(value)}"),
            new VElement("button", "1.2", new Dictionary<string, string> { ["onclick"] = "double" }, "Double")
        });
    }

}


[Component]
public partial class TestHookEdgeCases : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "test-edge-cases" }, new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), "Hook Import Edge Cases Test"),
            new VElement("div", "1.2", new Dictionary<string, string> { ["class"] = "section" }, new VNode[]
            {
                new VElement("h2", "1.2.1", new Dictionary<string, string>(), "1. Default Export (useToggle)"),
                new VElement("p", "1.2.2", new Dictionary<string, string>(), $"Toggle is:{((new MObject(GetState<dynamic>("toggle1.on"))) ? "ON" : "OFF")}"),
                new VComponentWrapper
      {
        ComponentName = "toggle1",
        ComponentType = "UseToggleHook",
        HexPath = "1.2.3",
        InitialState = new Dictionary<string, object> { ["_config.param0"] = false }
      }
            }),
            new VElement("div", "1.3", new Dictionary<string, string> { ["class"] = "section" }, new VNode[]
            {
                new VElement("h2", "1.3.1", new Dictionary<string, string>(), "2. Named Export (useCounter)"),
                new VElement("p", "1.3.2", new Dictionary<string, string>(), $"Count:{(GetState<dynamic>("counter1.count"))}"),
                new VComponentWrapper
      {
        ComponentName = "counter1",
        ComponentType = "UseCounterHook",
        HexPath = "1.3.3",
        InitialState = new Dictionary<string, object> { ["_config.param0"] = 10 }
      }
            }),
            new VElement("div", "1.4", new Dictionary<string, string> { ["class"] = "section" }, new VNode[]
            {
                new VElement("h2", "1.4.1", new Dictionary<string, string>(), "3. Renamed Import (useTimer as Timer)"),
                new VElement("p", "1.4.2", new Dictionary<string, string>(), $"Seconds:{(GetState<dynamic>("timer1.seconds"))}"),
                new VComponentWrapper
      {
        ComponentName = "timer1",
        ComponentType = "UseTimerHook",
        HexPath = "1.4.3",
        InitialState = new Dictionary<string, object> { ["_config.param0"] = 5 }
      }
            }),
            new VElement("div", "1.5", new Dictionary<string, string> { ["class"] = "section" }, new VNode[]
            {
                new VElement("h2", "1.5.1", new Dictionary<string, string>(), "4. Multiple Hooks from Same File (useDoubler)"),
                new VElement("p", "1.5.2", new Dictionary<string, string>(), $"Doubled value:{(GetState<dynamic>("doubler1.value"))}"),
                new VComponentWrapper
      {
        ComponentName = "doubler1",
        ComponentType = "UseDoublerHook",
        HexPath = "1.5.3",
        InitialState = new Dictionary<string, object> { ["_config.param0"] = 3 }
      }
            }),
            new VElement("div", "1.6", new Dictionary<string, string> { ["class"] = "section" }, new VNode[]
            {
                new VElement("h2", "1.6.1", new Dictionary<string, string>(), "5. Inline + Imported Mix"),
                new VElement("p", "1.6.2", new Dictionary<string, string>(), $"Local message:{(msg)}"),
                new VComponentWrapper
      {
        ComponentName = "local1",
        ComponentType = "UseLocalHook",
        HexPath = "1.6.3",
        InitialState = new Dictionary<string, object> { ["_config.param0"] = 'Start' }
      }
            }),
            new VElement("div", "1.7", new Dictionary<string, string> { ["class"] = "summary" }, new VNode[]
            {
                new VElement("h3", "1.7.1", new Dictionary<string, string>(), "Summary"),
                new VElement("p", "1.7.2", new Dictionary<string, string>(), $"All hook values:{((new MObject(GetState<dynamic>("toggle1.on"))) ? 1 : 0)}+{(GetState<dynamic>("counter1.count"))}+{(GetState<dynamic>("timer1.seconds"))}+{(GetState<dynamic>("doubler1.value"))}={((GetState<dynamic>("toggle1.on")) ? 1 : 0 + GetState<dynamic>("counter1.count") + GetState<dynamic>("timer1.seconds") + GetState<dynamic>("doubler1.value"))}")
            })
        });
    }
}
