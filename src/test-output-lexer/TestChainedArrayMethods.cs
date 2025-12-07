using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[LoopTemplate("todos.filter.filter", @"{""stateKey"":""todos.filter.filter"",""arrayBinding"":""todos.filter.filter"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":""item.id"",""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""{(todo.text)}""],""slots"":[0]}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":""item.id"",""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""[{(todo.priority)}]{(todo.text)}""],""slots"":[0]}]}}")]
[LoopTemplate("todos.slice.slice", @"{""stateKey"":""todos.slice.slice"",""arrayBinding"":""todos.slice.slice"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":""item.id"",""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""{(todo.text)}""],""slots"":[0]}]}}")]
[LoopTemplate("products.filter.filter", @"{""stateKey"":""products.filter.filter"",""arrayBinding"":""products.filter.filter"",""itemVar"":""product"",""indexVar"":null,""keyBinding"":""item.id"",""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""{(product.name)}- ${(product.price)}""],""slots"":[0]}]}}")]
[LoopTemplate("['high','medium','low']", @"{""stateKey"":""['high','medium','low']"",""arrayBinding"":""['high','medium','low']"",""itemVar"":""priority"",""indexVar"":null,""keyBinding"":""item"",""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""class"":{""template"":""priority-group"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Element"",""tag"":""h4"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""{(priority)}priority""],""slots"":[0]}]},{""type"":""Element"",""tag"":""ul"",""propsTemplates"":null,""childrenTemplates"":null}]}}")]
[Component]
public partial class TestChainedArrayMethods : MinimactComponent
{
    [State]
    private List<dynamic> todos = new List<object>{new{ id = 1, text = "Learn Minimact", done = true, priority = "high", createdAt = 1000}, new{ id = 2, text = "Build app", done = false, priority = "high", createdAt = 2000}, new{ id = 3, text = "Write tests", done = false, priority = "medium", createdAt = 3000}, new{ id = 4, text = "Deploy", done = false, priority = "low", createdAt = 4000}, new{ id = 5, text = "Celebrate", done = false, priority = "low", createdAt = 5000}};

    [State]
    private List<dynamic> products = new List<object>{new{ id = 1, name = "Laptop", price = 999, category = "Electronics", inStock = true, rating = 4.5}, new{ id = 2, name = "Phone", price = 699, category = "Electronics", inStock = true, rating = 4.8}, new{ id = 3, name = "Headphones", price = 199, category = "Electronics", inStock = false, rating = 4.2}, new{ id = 4, name = "Shirt", price = 49, category = "Clothing", inStock = true, rating = 4.0}, new{ id = 5, name = "Pants", price = 79, category = "Clothing", inStock = true, rating = 3.9}};

    [State]
    private bool showCompleted = false;

    [State]
    private string categoryFilter = "";

    [State]
    private int maxItems = 10;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var priority = new Dictionary<string, object>{["high"]= 0, ["medium"]= 1, ["low"]= 2};

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "chained-methods-test" }, new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Chained Array Methods Test"),
            new VElement("section", "1.2", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.2.1", new Dictionary<string, string>(), "Filter + Map (incomplete todos)"),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)((IEnumerable<dynamic>)todos).Where(todo => !todo.done)).Select(todo => new VElement("li", "1.2.2.1.1", new Dictionary<string, string> { ["key"] = $"{(todo.id)}" }, new VNode[]
                {
                    new VText($"{(todo.text)}", "1.2.2.1.1.1")
                })).ToArray())
            }),
            new VElement("section", "1.3", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.3.1", new Dictionary<string, string>(), "Conditional Filter + Map"),
                new VElement("label", "1.3.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("input", "1.3.2.1", new Dictionary<string, string> { ["type"] = "checkbox", ["checked"] = $"{(showCompleted)}", ["onchange"] = "Handle0" }),
                    new VText("Show completed", "1.3.2.2")
                }),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)((IEnumerable<dynamic>)todos).Where(todo => showCompleted || !todo.done)).Select(todo => new VElement("li", "1.3.3.1.1", new Dictionary<string, string> { ["key"] = $"{(todo.id)}", ["class"] = $"{(todo.done?"done":"")}" }, new VNode[]
                {
                    new VText($"{(todo.text)}", "1.3.3.1.1.1")
                })).ToArray())
            }),
            new VElement("section", "1.4", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.4.1", new Dictionary<string, string>(), "Sort + Map (by priority)"),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)((IEnumerable<dynamic>)todos).OrderBy(x => x)).Select(todo => new VElement("li", "1.4.2.1.1", new Dictionary<string, string> { ["key"] = $"{(todo.id)}" }, $"[{(todo.priority)}]{(todo.text)}")).ToArray())
            }),
            new VElement("section", "1.5", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.5.1", new Dictionary<string, string>(), "Slice + Map (first 3)"),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)((IEnumerable<dynamic>)todos).Take(3)).Select(todo => new VElement("li", "1.5.2.1.1", new Dictionary<string, string> { ["key"] = $"{(todo.id)}" }, new VNode[]
                {
                    new VText($"{(todo.text)}", "1.5.2.1.1.1")
                })).ToArray())
            }),
            new VElement("section", "1.6", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.6.1", new Dictionary<string, string>(), "Filter + Sort + Map (incomplete, by date)"),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)((IEnumerable<dynamic>)todos).Where(todo => !todo.done).OrderByDescending(x => x.createdAt)).Select(todo => new VElement("li", "1.6.2.1.1", new Dictionary<string, string> { ["key"] = $"{(todo.id)}" })).ToArray())
            }),
            new VElement("section", "1.7", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.7.1", new Dictionary<string, string>(), "Filter + Slice + Map (in stock, first 3)"),
                new VElement("select", "1.7.2", new Dictionary<string, string> { ["value"] = $"{(categoryFilter)}", ["onchange"] = "Handle1" }, new VNode[]
                {
                    new VElement("option", "1.7.2.1", new Dictionary<string, string> { ["value"] = "" }, "All"),
                    new VElement("option", "1.7.2.2", new Dictionary<string, string> { ["value"] = "Electronics" }, "Electronics"),
                    new VElement("option", "1.7.2.3", new Dictionary<string, string> { ["value"] = "Clothing" }, "Clothing")
                }),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)((IEnumerable<dynamic>)products).Where(p => p.inStock).Where(p => string.IsNullOrEmpty(categoryFilter)  ||  p.category  ==  categoryFilter).Take(3)).Select(product => new VElement("li", "1.7.3.1.1", new Dictionary<string, string> { ["key"] = $"{(product.id)}" }, new VNode[]
                {
                    new VText($"{(product.name)}- ${(product.price)}", "1.7.3.1.1.1")
                })).ToArray())
            }),
            new VElement("section", "1.8", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.8.1", new Dictionary<string, string>(), "Full Chain: Filter + Sort + Slice + Map"),
                new VElement("input", "1.8.2", new Dictionary<string, string> { ["type"] = "number", ["value"] = $"{(maxItems)}", ["onchange"] = "Handle2", ["min"] = $"{(1)}", ["max"] = $"{(10)}" }),
                MinimactHelpers.createElement("div", new Dictionary<string, string> { ["class"] = "product-grid" }, ((IEnumerable<dynamic>)((IEnumerable<dynamic>)products).Where(p => p.inStock && p.rating >= 4.0).OrderByDescending(x => x.rating).Skip(0).Take(maxItems - 0)).Select(product => new VElement("div", "1.8.3.1.1", new Dictionary<string, string> { ["key"] = $"{(product.id)}", ["class"] = "product-card" }, new VNode[]
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
                })).ToArray())
            }),
            MinimactHelpers.createElement("section", null, new VElement("h3", "1.9.1", new Dictionary<string, string>(), "Nested Maps with Filter"), ((IEnumerable<dynamic>)new List<object>{"high", "medium", "low"}).Select(priority => new VElement("div", "1.9.2.1", new Dictionary<string, string> { ["key"] = $"{(priority)}", ["class"] = "priority-group" }, new VNode[]
            {
                new VElement("h4", "1.9.2.1.1", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(priority)}priority", "1.9.2.1.1.1")
                }),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)((IEnumerable<dynamic>)todos).Where(t => t.priority == priority)).Select(todo => new VElement("li", "1.9.2.1.2.1.1", new Dictionary<string, string> { ["key"] = $"{(todo.id)}" }, new VNode[]
                {
                    new VText($"{(todo.text)}", "1.9.2.1.2.1.1.1")
                })).ToArray())
            })).ToArray()),
            new VElement("section", "1.10", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.10.1", new Dictionary<string, string>(), "Filter for Count"),
                new VElement("p", "1.10.2", new Dictionary<string, string>(), $"Incomplete high priority:{(todos.Where(t => !t.done && t.priority == "high").Count())}"),
                new VElement("p", "1.10.3", new Dictionary<string, string>(), $"In-stock electronics:{(products.Where(p => p.inStock && p.category == "Electronics").Count())}")
            })
        });
    }

    public void Handle0()
    {
        setShowCompleted(!showCompleted);
    }

    public void Handle1(dynamic e)
    {
        setCategoryFilter(e.target.value);
    }

    public void Handle2(dynamic e)
    {
        setMaxItems(int.Parse(e.target.value.ToString()) || 5);
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
            ["Handle1"] = @"function () {\n  setCategoryFilter(e.target.value);\n}",
            ["Handle2"] = @"function () {\n  setMaxItems(parseInt(e.target.value)||5);\n}"
        };
    }

    // State setters
    private void setTodos(List<dynamic> value)
    {
        todos = value;
        SetState(nameof(todos), value);
    }

    private void setProducts(List<dynamic> value)
    {
        products = value;
        SetState(nameof(products), value);
    }

    private void setShowCompleted(bool value)
    {
        showCompleted = value;
        SetState(nameof(showCompleted), value);
    }

    private void setCategoryFilter(string value)
    {
        categoryFilter = value;
        SetState(nameof(categoryFilter), value);
    }

    private void setMaxItems(int value)
    {
        maxItems = value;
        SetState(nameof(maxItems), value);
    }

}
