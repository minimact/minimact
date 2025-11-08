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
public partial class CounterPage : MinimactComponent
{
    [State]
    private dynamic history = new List<dynamic> {  };

    // MVC State property: userName
    private string userName => GetState<string>("userName");

    // MVC State property: canReset
    private bool canReset => GetState<bool>("canReset");

    // MVC State property: lastResetTime
    private string lastResetTime => GetState<string>("lastResetTime");

    // MVC State property: initialCount
    private double count => GetState<double>("initialCount");

    // MVC State property: initialStep
    private double step => GetState<double>("initialStep");

    // MVC State property: initialShowHistory
    private bool showHistory => GetState<bool>("initialShowHistory");

    // useMvcViewModel - read-only access to entire ViewModel
    private dynamic viewModel = null;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // MVC State - read from State dictionary
        var userName = GetState<string>("userName");
        var canReset = GetState<bool>("canReset");
        var lastResetTime = GetState<string>("lastResetTime");
        var count = GetState<double>("initialCount");
        var step = GetState<double>("initialStep");
        var showHistory = GetState<bool>("initialShowHistory");

        return MinimactHelpers.createElement("div", new { key = "1", className = "page-container" }, new VElement("header", "1.1", new Dictionary<string, string> { ["key"] = "1.1", ["class"] = "page-header" }, new VNode[]
            {
                new VElement("h1", "1.1.1", new Dictionary<string, string> { ["key"] = "1.1.1" }, $"🔢{(viewModel.pageTitle)}"),
                new VElement("p", "1.1.2", new Dictionary<string, string> { ["key"] = "1.1.2", ["class"] = "description" }, new VNode[]
                {
                    new VText($"{(viewModel.description)}", "1.1.2.1")
                }),
                new VElement("div", "1.1.3", new Dictionary<string, string> { ["key"] = "1.1.3", ["class"] = "user-info" }, new VNode[]
                {
                    new VElement("span", "1.1.3.1", new Dictionary<string, string> { ["key"] = "1.1.3.1", ["class"] = "user-badge" }, $"👤{(userName)}"),
                    new VElement("span", "1.1.3.2", new Dictionary<string, string> { ["key"] = "1.1.3.2", ["class"] = "timestamp" }, $"Last reset:{(DateTime.Parse(lastResetTime).ToString("g"))}")
                })
            }), new VElement("div", "1.2", new Dictionary<string, string> { ["key"] = "1.2", ["class"] = "counter-display" }, new VNode[]
            {
                new VElement("div", "1.2.1", new Dictionary<string, string> { ["key"] = "1.2.1", ["class"] = "count-value" }, new VNode[]
                {
                    new VText($"{(count)}", "1.2.1.1")
                }),
                new VElement("div", "1.2.2", new Dictionary<string, string> { ["key"] = "1.2.2", ["class"] = "count-label" }, "Current Count")
            }), new VElement("div", "1.3", new Dictionary<string, string> { ["key"] = "1.3", ["class"] = "counter-controls" }, new VNode[]
            {
                new VElement("button", "1.3.1", new Dictionary<string, string> { ["key"] = "1.3.1", ["class"] = "btn btn-decrement", ["onclick"] = "handleDecrement" }, $"-{(step)}"),
                new VElement("button", "1.3.2", new Dictionary<string, string> { ["key"] = "1.3.2", ["class"] = "btn btn-increment", ["onclick"] = "handleIncrement" }, $"+{(step)}")
            }), new VElement("div", "1.4", new Dictionary<string, string> { ["key"] = "1.4", ["class"] = "step-control" }, new VNode[]
            {
                new VElement("label", "1.4.1", new Dictionary<string, string> { ["key"] = "1.4.1", ["htmlFor"] = "step-input" }, "Step Size:"),
                new VElement("input", "1.4.2", new Dictionary<string, string> { ["key"] = "1.4.2", ["id"] = "step-input", ["type"] = "number", ["value"] = $"{step}", ["min"] = "1", ["class"] = "step-input", ["onchange"] = "Handle4" })
            }), (new MObject(canReset)) ? new VElement("div", "1.5.1", new Dictionary<string, string> { ["key"] = "1.5.1", ["class"] = "reset-section" }, new VNode[]
            {
                new VElement("button", "1.5.1.1", new Dictionary<string, string> { ["key"] = "1.5.1.1", ["class"] = "btn btn-reset", ["onclick"] = "handleReset" }, "Reset to 0")
            }) : new VNull("1.5"), new VElement("div", "1.6", new Dictionary<string, string> { ["key"] = "1.6", ["class"] = "history-toggle" }, new VNode[]
            {
                new VElement("label", "1.6.1", new Dictionary<string, string> { ["key"] = "1.6.1" }, new VNode[]
                {
                    new VElement("input", "1.6.1.1", new Dictionary<string, string> { ["key"] = "1.6.1.1", ["type"] = "checkbox", ["checked"] = $"{showHistory}", ["onchange"] = "Handle5" }),
                    new VElement("span", "1.6.1.2", new Dictionary<string, string> { ["key"] = "1.6.1.2" }, "Show History")
                })
            }), (new MObject(showHistory)) ? MinimactHelpers.createElement("div", new { key = "1.7.1", className = "history-panel" }, new VElement("h3", "1.7.1.1", new Dictionary<string, string> { ["key"] = "1.7.1.1" }, "📜 History"), (history.Count == 0) ? new VElement("p", "1.7.1.2.1", new Dictionary<string, string> { ["key"] = "1.7.1.2.1", ["class"] = "empty-message" }, "No changes yet. Try clicking the buttons!") : MinimactHelpers.createElement("ul", new { key = "1.7.1.2.2", className = "history-list" }, history.Select((entry, i) => new VElement("li", "1.7.1.2.2.1.1", new Dictionary<string, string> { ["key"] = $"{i}", ["class"] = "history-item" }, new VNode[]
                    {
                        new VElement("span", "1.7.1.2.2.1.1.1", new Dictionary<string, string> { ["key"] = "1.7.1.2.2.1.1.1", ["class"] = "history-action" }, new VNode[]
                        {
                            new VText($"{(entry.action)}", "1.7.1.2.2.1.1.1.1")
                        }),
                        new VElement("span", "1.7.1.2.2.1.1.2", new Dictionary<string, string> { ["key"] = "1.7.1.2.2.1.1.2", ["class"] = "history-value" }, new VNode[]
                        {
                            new VText($"{(entry.Value)}", "1.7.1.2.2.1.1.2.1")
                        }),
                        new VElement("span", "1.7.1.2.2.1.1.3", new Dictionary<string, string> { ["key"] = "1.7.1.2.2.1.1.3", ["class"] = "history-time" }, new VNode[]
                        {
                            new VText($"{(entry.timestamp.toLocaleTimeString())}", "1.7.1.2.2.1.1.3.1")
                        })
                    })).ToArray())) : new VNull("1.7"), new VElement("div", "1.8", new Dictionary<string, string> { ["key"] = "1.8", ["class"] = "info-panel" }, new VNode[]
            {
                new VElement("h3", "1.8.1", new Dictionary<string, string> { ["key"] = "1.8.1" }, "ℹ️ How This Works"),
                new VElement("div", "1.8.2", new Dictionary<string, string> { ["key"] = "1.8.2", ["class"] = "info-grid" }, new VNode[]
                {
                    new VElement("div", "1.8.2.1", new Dictionary<string, string> { ["key"] = "1.8.2.1", ["class"] = "info-item" }, new VNode[]
                    {
                        new VElement("h4", "1.8.2.1.1", new Dictionary<string, string> { ["key"] = "1.8.2.1.1" }, "❌ Immutable (Server Authority)"),
                        new VElement("ul", "1.8.2.1.2", new Dictionary<string, string> { ["key"] = "1.8.2.1.2" }, new VNode[]
                        {
                            new VElement("li", "1.8.2.1.2.1", new Dictionary<string, string> { ["key"] = "1.8.2.1.2.1" }, new VNode[]
                            {
                                new VElement("code", "1.8.2.1.2.1.1", new Dictionary<string, string> { ["key"] = "1.8.2.1.2.1.1" }, "userName"),
                                new VText("- User identity", "1.8.2.1.2.1.2")
                            }),
                            new VElement("li", "1.8.2.1.2.2", new Dictionary<string, string> { ["key"] = "1.8.2.1.2.2" }, new VNode[]
                            {
                                new VElement("code", "1.8.2.1.2.2.1", new Dictionary<string, string> { ["key"] = "1.8.2.1.2.2.1" }, "canReset"),
                                new VText("- Permission", "1.8.2.1.2.2.2")
                            }),
                            new VElement("li", "1.8.2.1.2.3", new Dictionary<string, string> { ["key"] = "1.8.2.1.2.3" }, new VNode[]
                            {
                                new VElement("code", "1.8.2.1.2.3.1", new Dictionary<string, string> { ["key"] = "1.8.2.1.2.3.1" }, "lastResetTime"),
                                new VText("- Server timestamp", "1.8.2.1.2.3.2")
                            })
                        }),
                        new VElement("p", "1.8.2.1.3", new Dictionary<string, string> { ["key"] = "1.8.2.1.3", ["class"] = "note" }, new VNode[]
                        {
                            new VText("These values come from the server and cannot be modified from the client.\n                            No setter is returned from", "1.8.2.1.3.1"),
                            new VElement("code", "1.8.2.1.3.2", new Dictionary<string, string> { ["key"] = "1.8.2.1.3.2" }, "useMvcState()"),
                            new VText(".", "1.8.2.1.3.3")
                        })
                    }),
                    new VElement("div", "1.8.2.2", new Dictionary<string, string> { ["key"] = "1.8.2.2", ["class"] = "info-item" }, new VNode[]
                    {
                        new VElement("h4", "1.8.2.2.1", new Dictionary<string, string> { ["key"] = "1.8.2.2.1" }, "✅ Mutable (Client Control)"),
                        new VElement("ul", "1.8.2.2.2", new Dictionary<string, string> { ["key"] = "1.8.2.2.2" }, new VNode[]
                        {
                            new VElement("li", "1.8.2.2.2.1", new Dictionary<string, string> { ["key"] = "1.8.2.2.2.1" }, new VNode[]
                            {
                                new VElement("code", "1.8.2.2.2.1.1", new Dictionary<string, string> { ["key"] = "1.8.2.2.2.1.1" }, "[Mutable] initialCount"),
                                new VText("- Counter value", "1.8.2.2.2.1.2")
                            }),
                            new VElement("li", "1.8.2.2.2.2", new Dictionary<string, string> { ["key"] = "1.8.2.2.2.2" }, new VNode[]
                            {
                                new VElement("code", "1.8.2.2.2.2.1", new Dictionary<string, string> { ["key"] = "1.8.2.2.2.2.1" }, "[Mutable] initialStep"),
                                new VText("- Step size", "1.8.2.2.2.2.2")
                            }),
                            new VElement("li", "1.8.2.2.2.3", new Dictionary<string, string> { ["key"] = "1.8.2.2.2.3" }, new VNode[]
                            {
                                new VElement("code", "1.8.2.2.2.3.1", new Dictionary<string, string> { ["key"] = "1.8.2.2.2.3.1" }, "[Mutable] initialShowHistory"),
                                new VText("- UI toggle", "1.8.2.2.2.3.2")
                            })
                        }),
                        new VElement("p", "1.8.2.2.3", new Dictionary<string, string> { ["key"] = "1.8.2.2.3", ["class"] = "note" }, "These values can be modified by the client and automatically sync to the server\n                            via SignalR. Changes are validated server-side.")
                    })
                }),
                new VElement("div", "1.8.3", new Dictionary<string, string> { ["key"] = "1.8.3", ["class"] = "sync-info" }, new VNode[]
                {
                    new VElement("h4", "1.8.3.1", new Dictionary<string, string> { ["key"] = "1.8.3.1" }, "🔄 Sync Strategies"),
                    new VElement("ul", "1.8.3.2", new Dictionary<string, string> { ["key"] = "1.8.3.2" }, new VNode[]
                    {
                        new VElement("li", "1.8.3.2.1", new Dictionary<string, string> { ["key"] = "1.8.3.2.1" }, new VNode[]
                        {
                            new VElement("strong", "1.8.3.2.1.1", new Dictionary<string, string> { ["key"] = "1.8.3.2.1.1" }, "count:"),
                            new VElement("code", "1.8.3.2.1.2", new Dictionary<string, string> { ["key"] = "1.8.3.2.1.2" }, "immediate"),
                            new VText("- Syncs instantly on every change", "1.8.3.2.1.3")
                        }),
                        new VElement("li", "1.8.3.2.2", new Dictionary<string, string> { ["key"] = "1.8.3.2.2" }, new VNode[]
                        {
                            new VElement("strong", "1.8.3.2.2.1", new Dictionary<string, string> { ["key"] = "1.8.3.2.2.1" }, "step:"),
                            new VElement("code", "1.8.3.2.2.2", new Dictionary<string, string> { ["key"] = "1.8.3.2.2.2" }, "debounced (300ms)"),
                            new VText("- Waits 300ms after typing", "1.8.3.2.2.3")
                        }),
                        new VElement("li", "1.8.3.2.3", new Dictionary<string, string> { ["key"] = "1.8.3.2.3" }, new VNode[]
                        {
                            new VElement("strong", "1.8.3.2.3.1", new Dictionary<string, string> { ["key"] = "1.8.3.2.3.1" }, "showHistory:"),
                            new VElement("code", "1.8.3.2.3.2", new Dictionary<string, string> { ["key"] = "1.8.3.2.3.2" }, "immediate"),
                            new VText("(default)", "1.8.3.2.3.3")
                        })
                    })
                })
            }), new VElement("details", "1.9", new Dictionary<string, string> { ["key"] = "1.9", ["class"] = "debug-panel" }, new VNode[]
            {
                new VElement("summary", "1.9.1", new Dictionary<string, string> { ["key"] = "1.9.1" }, "🔍 Debug: View ViewModel JSON"),
                new VElement("pre", "1.9.2", new Dictionary<string, string> { ["key"] = "1.9.2" }, new VNode[]
                {
                    new VText($"{(JSON.stringify(viewModel, new VNull(""), 2))}", "1.9.2.1")
                }),
                new VElement("h4", "1.9.3", new Dictionary<string, string> { ["key"] = "1.9.3", ["style"] = "margin-top: 1rem" }, "Mutability Metadata:"),
                new VElement("pre", "1.9.4", new Dictionary<string, string> { ["key"] = "1.9.4" }, new VNode[]
                {
                    new VText($"{(JSON.stringify(window.__MINIMACT_VIEWMODEL__?._mutability, new VNull(""), 2))}", "1.9.4.1")
                })
            }));
    }

    public void handleIncrement()
    {
        var newCount = count + step;
        setCount(newCount);
        addToHistory(newCount, $"+{step}");
    }

    public void handleDecrement()
    {
        var newCount = count - step;
        setCount(newCount);
        addToHistory(newCount, $"-{step}");
    }

    public void handleReset()
    {
        setCount(0);
        addToHistory(0, "Reset");
    }

    public void addToHistory(dynamic value, dynamic action)
    {
        SetState(nameof(history), new List<object> { new { value = value, timestamp = DateTime.Now, action = action } }.Concat(((IEnumerable<object>)history.slice(0, 9))).ToList());
    }

    public void Handle4(dynamic e)
    {
        setStep((parseInt(e.Target.Value)) ?? (1));
    }

    public void Handle5(dynamic e)
    {
        setShowHistory(e.Target.Checked);
    }

    private void setCount(double value)
    {
        SetState("initialCount", value);
    }

    private void setStep(double value)
    {
        SetState("initialStep", value);
    }

    private void setShowHistory(bool value)
    {
        SetState("initialShowHistory", value);
    }
}

}
