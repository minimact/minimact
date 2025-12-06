using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[LoopTemplate("log", @"{""stateKey"":""log"",""arrayBinding"":""log"",""itemVar"":""entry"",""indexVar"":""i"",""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":null}}")]
[Component]
public partial class TestUseMicroMacroTask : MinimactComponent
{
    [State]
    private List<string> log = new List<dynamic> {  };

    [State]
    private int counter = 0;

    // useMicroTask 0
    private bool _microTaskScheduled_0 = false;

    // useMicroTask 1
    private bool _microTaskScheduled_1 = false;

    // useMacroTask 0 (delay: 0ms)
    private bool _macroTaskScheduled_0 = false;

    // useMacroTask 1 (delay: 500ms)
    private bool _macroTaskScheduled_1 = false;

    // useMacroTask 2 (delay: 1000ms)
    private bool _macroTaskScheduled_2 = false;

    // useMacroTask 3 (delay: 2000ms)
    private bool _macroTaskScheduled_3 = false;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "task-scheduling-test" }, new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Micro/Macro Task Test"),
            new VElement("div", "1.2", new Dictionary<string, string> { ["class"] = "controls" }, new VNode[]
            {
                new VElement("button", "1.2.1", new Dictionary<string, string> { ["onclick"] = "handleClick" }, "Test Micro + Macro Tasks"),
                new VElement("button", "1.2.2", new Dictionary<string, string> { ["onclick"] = "handleDebounceTest" }, "Test Debounce (1s)"),
                new VElement("button", "1.2.3", new Dictionary<string, string> { ["onclick"] = "handlePollTest" }, "Test Poll (2s)"),
                new VElement("button", "1.2.4", new Dictionary<string, string> { ["onclick"] = "clearLog" }, "Clear Log")
            }),
            new VElement("div", "1.3", new Dictionary<string, string> { ["class"] = "counter" }, $"Counter:{(counter)}"),
            new VElement("div", "1.4", new Dictionary<string, string> { ["class"] = "log" }, new VNode[]
            {
                new VElement("h3", "1.4.1", new Dictionary<string, string>(), "Execution Log"),
                MinimactHelpers.createElement("ul", null, log.Select((entry, i) => new VElement("li", "1.4.2.1.1", new Dictionary<string, string>(), new VNode[]
                    {
                        new VText($"{(entry)}", "1.4.2.1.1.1")
                    })).ToArray())
            }),
            new VElement("div", "1.5", new Dictionary<string, string> { ["class"] = "explanation" }, new VNode[]
            {
                new VElement("h3", "1.5.1", new Dictionary<string, string>(), "Expected Order:"),
                new VElement("ol", "1.5.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("li", "1.5.2.1", new Dictionary<string, string>(), "Click handler start"),
                    new VElement("li", "1.5.2.2", new Dictionary<string, string>(), "Click handler end"),
                    new VElement("li", "1.5.2.3", new Dictionary<string, string>(), "Microtask executed (before render)"),
                    new VElement("li", "1.5.2.4", new Dictionary<string, string>(), "Processed value (microtask)"),
                    new VElement("li", "1.5.2.5", new Dictionary<string, string>(), "Macrotask immediate (next event loop)"),
                    new VElement("li", "1.5.2.6", new Dictionary<string, string>(), "Delayed macrotask (after 500ms)")
                })
            })
        });
    }

    public void handleClick()
    {
        SetState(nameof(log), prev => prev.Concat(new[] { @"Click handler start" }).ToList());
        scheduleMicro();
        SetState(nameof(counter), c => c + 1);
        processBatch();
        scheduleMacro();
        scheduleDelayed();
        SetState(nameof(log), prev => prev.Concat(new[] { @"Click handler end" }).ToList());
    }

    public void handleDebounceTest()
    {
        SetState(nameof(log), prev => prev.Concat(new[] { @"Triggering debounced save..." }).ToList());
        debouncedSave();
    }

    public void handlePollTest()
    {
        SetState(nameof(log), prev => prev.Concat(new[] { @"Starting poll..." }).ToList());
        pollStatus();
    }

    public void clearLog()
    {
        SetState(nameof(log), new List<dynamic> {  });
    }
}
