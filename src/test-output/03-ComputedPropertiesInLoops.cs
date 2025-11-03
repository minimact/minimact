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
[LoopTemplate("items", @"{""stateKey"":""items"",""arrayBinding"":""items"",""itemVar"":""item"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Value:"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.selectedField""],""slots"":[0]}]}}")]
[LoopTemplate("items", @"{""stateKey"":""items"",""arrayBinding"":""items"",""itemVar"":""item"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Sort Value:"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.sortBy""],""slots"":[0]}]}}")]
[LoopTemplate("Object", @"{""stateKey"":""Object"",""arrayBinding"":""Object"",""itemVar"":""key"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":"":"",""bindings"":[],""slots"":[]}]}}")]
[LoopTemplate("items", @"{""stateKey"":""items"",""arrayBinding"":""items"",""itemVar"":""item"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Value:"",""bindings"":[],""slots"":[]}]}}")]
[LoopTemplate("items", @"{""stateKey"":""items"",""arrayBinding"":""items"",""itemVar"":""item"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Value:"",""bindings"":[],""slots"":[]}]}}")]
[LoopTemplate("items", @"{""stateKey"":""items"",""arrayBinding"":""items"",""itemVar"":""item"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Value:"",""bindings"":[],""slots"":[]}]}}")]
[LoopTemplate("items", @"{""stateKey"":""items"",""arrayBinding"":""items"",""itemVar"":""item"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Value:"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.displayValue""],""slots"":[0]}]}}")]
[Component]
public partial class ComputedPropertiesInLoops : MinimactComponent
{
    [State]
    private List<dynamic> items = new List<object> { new { id = 1, name = "Widget A", price = 10.99, stock = 50, category = "Tools" }, new { id = 2, name = "Widget B", price = 15.99, stock = 30, category = "Hardware" }, new { id = 3, name = "Widget C", price = 20.99, stock = 0, category = "Tools" } };

    [State]
    private dynamic selectedField = "name";

    [State]
    private dynamic sortBy = "price";

    [State]
    private dynamic translations = new { name = "Name", price = "Price", stock = "Stock", category = "Category" };

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", new Dictionary<string, string>(), "Computed Properties in Loops (EXPECTED TO FAIL)"),
            new VElement("p", new Dictionary<string, string> { ["class"] = "warning" }, "⚠️ These patterns are NOT supported by the babel plugin!"),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case error" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 1: Direct Computed Property (item[dynamicKey])"),
                new VElement("p", new Dictionary<string, string>(), "Status: ❌ NOT SUPPORTED"),
                MinimactHelpers.createElement("div", new { className = "code-sample" }, items.Select(item => new VElement("div", new Dictionary<string, string> { ["key"] = $"{item.id}" }, new VNode[]
                    {
                        new VText($"{(null)}"),
                        new VText("Value:"),
                        new VText($"{(item[selectedField])}")
                    })).ToArray())
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case error" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 2: Sorting with Computed Key"),
                new VElement("p", new Dictionary<string, string>(), "Status: ❌ NOT SUPPORTED"),
                MinimactHelpers.createElement("div", new { className = "code-sample" }, items.Select(item => new VElement("div", new Dictionary<string, string> { ["key"] = $"{item.id}" }, new VNode[]
                    {
                        new VText("Sort Value:"),
                        new VText($"{(item[sortBy])}")
                    })).ToArray())
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case error" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 3: Translation Lookup"),
                new VElement("p", new Dictionary<string, string>(), "Status: ❌ NOT SUPPORTED"),
                MinimactHelpers.createElement("div", null, ((IEnumerable<dynamic>)((IDictionary<string, object>)translations).Keys).Select((Func<dynamic, dynamic>)(key => new VElement("div", new Dictionary<string, string> { ["key"] = $"{key}" }, new VNode[]
                    {
                        new VText($"{(null)}"),
                        new VText($"{(key)}"),
                        new VText(":"),
                        new VText($"{(translations[key])}")
                    }))).ToArray())
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "workarounds" }, new VNode[]
            {
                new VElement("h2", new Dictionary<string, string>(), "✅ Working Workarounds"),
                new VText($"{(null)}"),
                MinimactHelpers.createElement("div", new { className = "test-case success" }, new VElement("h3", new Dictionary<string, string>(), "Workaround 1: Pre-compute Value Outside JSX"), new VElement("p", new Dictionary<string, string>(), "Status: ✅ WORKS"), items.Select(item => { var displayValue = item[selectedField]; return new VElement("div", new Dictionary<string, string> { ["key"] = $"{item.id}" }, new VNode[]
                    {
                        new VText("Value:"),
                        new VText($"{(displayValue)}")
                    }); }).ToArray()),
                new VText($"{(null)}"),
                MinimactHelpers.createElement("div", new { className = "test-case success" }, new VElement("h3", new Dictionary<string, string>(), "Workaround 2: Explicit Conditional"), new VElement("p", new Dictionary<string, string>(), "Status: ✅ WORKS"), items.Select(item => new VElement("div", new Dictionary<string, string> { ["key"] = $"{item.id}" }, new VNode[]
                    {
                        new VText("Value:"),
                        new VText($"{((selectedField == "name") ? item.name : item.category)}")
                    })).ToArray()),
                new VText($"{(null)}"),
                MinimactHelpers.createElement("div", new { className = "test-case success" }, new VElement("h3", new Dictionary<string, string>(), "Workaround 3: Helper Function"), new VElement("p", new Dictionary<string, string>(), "Status: ✅ WORKS"), items.Select(item => new VElement("div", new Dictionary<string, string> { ["key"] = $"{item.id}" }, new VNode[]
                    {
                        new VText("Value:"),
                        new VText($"{(getFieldValue(item, selectedField))}")
                    })).ToArray()),
                new VText($"{(null)}"),
                MinimactHelpers.createElement("div", new { className = "test-case success" }, new VElement("h3", new Dictionary<string, string>(), "Workaround 4: Transform Data First"), new VElement("p", new Dictionary<string, string>(), "Status: ✅ WORKS"), ((IEnumerable<dynamic>)items.Select(item => new { displayValue = item[selectedField] }).ToList()).Select((Func<dynamic, dynamic>)(item => new VElement("div", new Dictionary<string, string> { ["key"] = $"{item.id}" }, new VNode[]
                    {
                        new VText("Value:"),
                        new VText($"{(item.displayValue)}")
                    }))).ToArray())
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "controls" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test Controls"),
                new VElement("select", new Dictionary<string, string> { ["value"] = $"{selectedField}", ["onchange"] = "Handle0" }, new VNode[]
                {
                    new VElement("option", new Dictionary<string, string> { ["value"] = "name" }, "Name"),
                    new VElement("option", new Dictionary<string, string> { ["value"] = "category" }, "Category")
                }),
                new VElement("select", new Dictionary<string, string> { ["value"] = $"{sortBy}", ["onchange"] = "Handle1" }, new VNode[]
                {
                    new VElement("option", new Dictionary<string, string> { ["value"] = "price" }, "Price"),
                    new VElement("option", new Dictionary<string, string> { ["value"] = "stock" }, "Stock")
                })
            })
        });
    }

    public void Handle0(dynamic e)
    {
        SetState(nameof(selectedField), null);
    }

    public void Handle1(dynamic e)
    {
        SetState(nameof(sortBy), null);
    }

    // Helper function: getFieldValue
    private static dynamic getFieldValue(dynamic item, dynamic field)
    {
        return item[field];
    }
}

}
