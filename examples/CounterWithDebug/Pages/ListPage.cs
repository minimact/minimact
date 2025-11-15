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

[LoopTemplate("items", @"{""stateKey"":""items"",""arrayBinding"":""items"",""itemVar"":""item"",""indexVar"":""index"",""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":{""style"":{""template"":""padding: 10px; margin: 5px 0; background: #f0f0f0; border-radius: 4px;"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":null}}")]
[Component]
public partial class ListPage : MinimactComponent
{
    [State]
    private List<string> items = new List<string> { "Apple", "Banana", "Cherry" };

    [State]
    private string newItem = "";

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Simple List"),
            new VElement("div", "1.2", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px;" }, new VNode[]
            {
                new VElement("input", "1.2.1", new Dictionary<string, string> { ["type"] = "text", ["value"] = $"{newItem}", ["placeholder"] = "Add new item...", ["style"] = "padding: 8px; margin-right: 10px; width: 200px;", ["onchange"] = "Handle1" }),
                new VElement("button", "1.2.2", new Dictionary<string, string> { ["style"] = "padding: 8px 16px;", ["onclick"] = "addItem" }, "Add Item")
            }),
            MinimactHelpers.createElement("ul", new { style = "list-style: none; padding: 0;" }, items.Select((item, index) => new VElement("li", "1.3.1.1", new Dictionary<string, string> { ["style"] = "padding: 10px; margin: 5px 0; background: #f0f0f0; border-radius: 4px;" }, new VNode[]
                {
                    new VText($"{(item)}", "1.3.1.1.1")
                })).ToArray()),
            new VElement("div", "1.4", new Dictionary<string, string> { ["style"] = "margin-top: 40px; padding: 20px; background: #e3f2fd; border-radius: 8px;" }, new VNode[]
            {
                new VElement("h3", "1.4.1", new Dictionary<string, string>(), "🧭 Navigation Test"),
                new VElement("p", "1.4.2", new Dictionary<string, string>(), "Click the link below to navigate back to the counter page via SPA navigation (no page reload):"),
                new VElement("Link", "1.4.3", new Dictionary<string, string> { ["to"] = "/" }, "← Back to Counter")
            })
        });
    }

    public void addItem()
    {
        if (MinimactHelpers.ToBool(newItem.Trim())) {
    SetState(nameof(items), items.Concat(new[] { newItem }).ToList());
    SetState(nameof(newItem), "");
}
    }

    public void Handle1(dynamic value)
    {
        SetState(nameof(newItem), value);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle1"] = @"function (value) {\n  setNewItem(value);\n}"
        };
    }
}

