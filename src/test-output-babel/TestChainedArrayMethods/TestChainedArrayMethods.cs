using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":{""className"":{""template"":""{0}"",""bindings"":[""item.done""],""slots"":[0],""conditionalTemplates"":{""true"":""done"",""false"":""""},""conditionalBindingIndex"":0,""type"":""conditional""}},""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""["",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.priority""],""slots"":[0]},{""type"":""Text"",""template"":""]"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]},{""type"":""Text"",""template"":""(created:"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.createdAt""],""slots"":[0]},{""type"":""Text"",""template"":"")"",""bindings"":[],""slots"":[]}]}}")]
[LoopTemplate("products", @"{""stateKey"":""products"",""arrayBinding"":""products"",""itemVar"":""product"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.name""],""slots"":[0]},{""type"":""Text"",""template"":""- $"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.price""],""slots"":[0]}]}}")]
[LoopTemplate("products", @"{""stateKey"":""products"",""arrayBinding"":""products"",""itemVar"":""product"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""className"":{""template"":""product-card"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Element"",""tag"":""h4"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.name""],""slots"":[0]}]},{""type"":""Element"",""tag"":""p"",""propsTemplates"":{""className"":{""template"":""price"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""$"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.price""],""slots"":[0]}]},{""type"":""Element"",""tag"":""p"",""propsTemplates"":{""className"":{""template"":""rating"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""⭐"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.rating""],""slots"":[0]}]},{""type"":""Element"",""tag"":""span"",""propsTemplates"":{""className"":{""template"":""category"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.category""],""slots"":[0]}]}]}}")]
[Component]
public partial class TestChainedArrayMethods : MinimactComponent
{
    [State]
    private List<dynamic> todos = new List<object> { new { id = 1, text = "Learn Minimact", done = true, priority = "high", createdAt = 1000 }, new { id = 2, text = "Build app", done = false, priority = "high", createdAt = 2000 }, new { id = 3, text = "Write tests", done = false, priority = "medium", createdAt = 3000 }, new { id = 4, text = "Deploy", done = false, priority = "low", createdAt = 4000 }, new { id = 5, text = "Celebrate", done = false, priority = "low", createdAt = 5000 } };

    [State]
    private List<dynamic> products = new List<object> { new { id = 1, name = "Laptop", price = 999, category = "Electronics", inStock = true, rating = 4.5 }, new { id = 2, name = "Phone", price = 699, category = "Electronics", inStock = true, rating = 4.8 }, new { id = 3, name = "Headphones", price = 199, category = "Electronics", inStock = false, rating = 4.2 }, new { id = 4, name = "Shirt", price = 49, category = "Clothing", inStock = true, rating = 4 }, new { id = 5, name = "Pants", price = 79, category = "Clothing", inStock = true, rating = 3.9 } };

    [State]
    private bool showCompleted = false;

    [State]
    private string categoryFilter = "";

    [State]
    private int maxItems = 10;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "chained-methods-test" }, new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Chained Array Methods Test"),
            new VElement("section", "1.2", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.2.1", new Dictionary<string, string>(), "Filter + Map (incomplete todos)"),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)todos.Where(todo => !todo.done).ToList()).Select((Func<dynamic, dynamic>)(todo => new VElement("li", "1.2.2.1.1", new Dictionary<string, string>(), new VNode[]
                    {
                        new VText($"{(todo.text)}", "1.2.2.1.1.1")
                    }))).ToArray())
            }),
            new VElement("section", "1.3", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.3.1", new Dictionary<string, string>(), "Conditional Filter + Map"),
                new VElement("label", "1.3.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("input", "1.3.2.1", new Dictionary<string, string> { ["type"] = "checkbox", ["checked"] = $"{showCompleted}", ["onchange"] = "Handle0" }),
                    new VText("Show completed", "1.3.2.2")
                }),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)todos.Where(todo => (showCompleted) ?? (!todo.done)).ToList()).Select((Func<dynamic, dynamic>)(todo => MinimactHelpers.createElement("li", new { className = (todo.done) ? "done" : "" }, todo.text))).ToArray())
            }),
            new VElement("section", "1.4", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.4.1", new Dictionary<string, string>(), "Sort + Map (by priority)"),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)todos.ToList().sort((a, b) => { var priority = new { high = 0, medium = 1, low = 2 }; return priority[a.priority] - priority[b.priority]; })).Select((Func<dynamic, dynamic>)(todo => new VElement("li", "1.4.2.1.1", new Dictionary<string, string>(), $"[{(todo.priority)}]{(todo.text)}"))).ToArray())
            }),
            new VElement("section", "1.5", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.5.1", new Dictionary<string, string>(), "Slice + Map (first 3)"),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)todos.slice(0, 3)).Select((Func<dynamic, dynamic>)(todo => new VElement("li", "1.5.2.1.1", new Dictionary<string, string>(), new VNode[]
                    {
                        new VText($"{(todo.text)}", "1.5.2.1.1.1")
                    }))).ToArray())
            }),
            new VElement("section", "1.6", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.6.1", new Dictionary<string, string>(), "Filter + Sort + Map (incomplete, by date)"),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)todos.Where(todo => !todo.done).ToList().sort((a, b) => b.createdAt - a.createdAt)).Select((Func<dynamic, dynamic>)(todo => new VElement("li", "1.6.2.1.1", new Dictionary<string, string>(), $"{(todo.text)}(created:{(todo.createdAt)})"))).ToArray())
            }),
            new VElement("section", "1.7", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.7.1", new Dictionary<string, string>(), "Filter + Slice + Map (in stock, first 3)"),
                new VElement("select", "1.7.2", new Dictionary<string, string> { ["value"] = $"{categoryFilter}", ["onchange"] = "Handle2" }, new VNode[]
                {
                    new VElement("option", "1.7.2.1", new Dictionary<string, string> { ["value"] = "" }, "All"),
                    new VElement("option", "1.7.2.2", new Dictionary<string, string> { ["value"] = "Electronics" }, "Electronics"),
                    new VElement("option", "1.7.2.3", new Dictionary<string, string> { ["value"] = "Clothing" }, "Clothing")
                }),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)products.Where(p => p.inStock).ToList().Where(p => (!categoryFilter) ?? (p.category == categoryFilter)).ToList().slice(0, 3)).Select((Func<dynamic, dynamic>)(product => new VElement("li", "1.7.3.1.1", new Dictionary<string, string>(), $"{(product.name)}- ${(product.price)}"))).ToArray())
            }),
            new VElement("section", "1.8", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.8.1", new Dictionary<string, string>(), "Full Chain: Filter + Sort + Slice + Map"),
                new VElement("input", "1.8.2", new Dictionary<string, string> { ["type"] = "number", ["value"] = $"{maxItems}", ["min"] = $"{1}", ["max"] = $"{10}", ["onchange"] = "Handle4" }),
                MinimactHelpers.createElement("div", new { className = "product-grid" }, ((IEnumerable<dynamic>)products.Where(p => (p.inStock) != null && (p.rating >= 4)).ToList().sort((a, b) => b.rating - a.rating).slice(0, maxItems)).Select((Func<dynamic, dynamic>)(product => new VElement("div", "1.8.3.1.1", new Dictionary<string, string> { ["class"] = "product-card" }, new VNode[]
                    {
                        new VElement("h4", "1.8.3.1.1.1", new Dictionary<string, string>(), new VNode[]
                        {
                            new VText($"{(product.name)}", "1.8.3.1.1.1.1")
                        }),
                        new VElement("p", "1.8.3.1.1.2", new Dictionary<string, string> { ["class"] = "price" }, $"${(product.price)}"),
                        new VElement("p", "1.8.3.1.1.3", new Dictionary<string, string> { ["class"] = "rating" }, $"⭐{(product.rating)}"),
                        new VElement("span", "1.8.3.1.1.4", new Dictionary<string, string> { ["class"] = "category" }, new VNode[]
                        {
                            new VText($"{(product.category)}", "1.8.3.1.1.4.1")
                        })
                    }))).ToArray())
            }),
            MinimactHelpers.createElement("section", null, new VElement("h3", "1.9.1", new Dictionary<string, string>(), "Nested Maps with Filter"), new List<string> { "high", "medium", "low" }.Select(priority => new VElement("div", "1.9.2.1", new Dictionary<string, string> { ["class"] = "priority-group" }, new VNode[]
                {
                    new VElement("h4", "1.9.2.1.1", new Dictionary<string, string>(), $"{(priority)}priority"),
                    MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)todos.Where(t => t.priority == priority).ToList()).Select((Func<dynamic, dynamic>)(todo => new VElement("li", "1.9.2.1.2.1.1", new Dictionary<string, string>(), new VNode[]
                        {
                            new VText($"{(todo.text)}", "1.9.2.1.2.1.1.1")
                        }))).ToArray())
                })).ToArray()),
            new VElement("section", "1.a", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.a.1", new Dictionary<string, string>(), "Filter for Count"),
                new VElement("p", "1.a.2", new Dictionary<string, string>(), $"Incomplete high priority:{(MinimactHelpers.GetLength(todos.Where(t => (!t.done) && (t.priority == "high")).ToList()))}"),
                new VElement("p", "1.a.3", new Dictionary<string, string>(), $"In-stock electronics:{(MinimactHelpers.GetLength(products.Where(p => (p.inStock) != null && (p.category == "Electronics")).ToList()))}")
            })
        });
    }

    public void Handle0()
    {
        SetState(nameof(showCompleted), !showCompleted);
    }

    public void Handle2(dynamic value)
    {
        SetState(nameof(categoryFilter), value);
    }

    public void Handle4(dynamic e)
    {
        SetState(nameof(maxItems), (parseInt(e.Target.Value)) ?? (5));
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function () {\n  setShowCompleted(!showCompleted);\n}",
            ["Handle2"] = @"function (value) {\n  setCategoryFilter(value);\n}",
            ["Handle4"] = @"function (e) {\n  setMaxItems(parseInt(e.target.value) || 5);\n}"
        };
    }
}
