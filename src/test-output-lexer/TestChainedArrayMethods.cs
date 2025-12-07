using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""""],""slots"":[0]}]}}")]
[LoopTemplate("products", @"{""stateKey"":""products"",""arrayBinding"":""products"",""itemVar"":""product"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""""],""slots"":[0]}]}}")]
[LoopTemplate("", @"{""stateKey"":"""",""arrayBinding"":"""",""itemVar"":""priority"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""class"":{""template"":""priority-group"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Element"",""tag"":""h4"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""""],""slots"":[0]}]},{""type"":""Element"",""tag"":""ul"",""propsTemplates"":null,""childrenTemplates"":null}]}}")]
[Component]
public partial class TestChainedArrayMethods : MinimactComponent
{
    [State]
    private List<dynamic> todos = null;

    [State]
    private List<dynamic> products = null;

    [State]
    private bool showCompleted = null;

    [State]
    private string categoryFilter = null;

    [State]
    private int maxItems = null;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var priority = null;

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "chained-methods-test" }, new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Chained Array Methods Test"),
            new VElement("section", "1.2", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.2.1", new Dictionary<string, string>(), "Filter + Map (incomplete todos)"),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)todos).Where(todo => !todo.done).Select(todo => new VElement("li", "1.2.2.1.1", new Dictionary<string, string> { ["key"] = $"{(null)}" }, new VNode[]
                {
                    new VText($"{(todo.text)}", "1.2.2.1.1.1")
                })).ToArray())
            }),
            new VElement("section", "1.3", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.3.1", new Dictionary<string, string>(), "Conditional Filter + Map"),
                new VElement("label", "1.3.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("input", "1.3.2.1", new Dictionary<string, string> { ["type"] = "checkbox", ["checked"] = $"{(null)}", ["onchange"] = "Handle0" }),
                    new VText("Show completed", "1.3.2.2")
                }),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)todos).Where(todo => showCompleted || !todo.done).Select(todo => new VElement("li", "1.3.3.1.1", new Dictionary<string, string> { ["key"] = $"{(null)}", ["class"] = $"{(null)}" }, new VNode[]
                {
                    new VText($"{(todo.text)}", "1.3.3.1.1.1")
                })).ToArray())
            }),
            new VElement("section", "1.4", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.4.1", new Dictionary<string, string>(), "Sort + Map (by priority)"),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)todos).OrderBy(x => x.priority).Select(todo => new VElement("li", "1.4.2.1.1", new Dictionary<string, string> { ["key"] = $"{(null)}" }, new VNode[]
                {
                    new VText($"[{(todo.priority)}]{(todo.text)}", "1.4.2.1.1.1")
                })).ToArray())
            }),
            new VElement("section", "1.5", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.5.1", new Dictionary<string, string>(), "Slice + Map (first 3)"),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)todos).Take(3).Select(todo => new VElement("li", "1.5.2.1.1", new Dictionary<string, string> { ["key"] = $"{(null)}" }, new VNode[]
                {
                    new VText($"{(todo.text)}", "1.5.2.1.1.1")
                })).ToArray())
            }),
            new VElement("section", "1.6", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.6.1", new Dictionary<string, string>(), "Filter + Sort + Map (incomplete, by date)"),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)todos).Where(todo => !todo.done).OrderByDescending(x => x.createdAt).Select(todo => new VElement("li", "1.6.2.1.1", new Dictionary<string, string> { ["key"] = $"{(null)}" })).ToArray())
            }),
            new VElement("section", "1.7", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.7.1", new Dictionary<string, string>(), "Filter + Slice + Map (in stock, first 3)"),
                new VElement("select", "1.7.2", new Dictionary<string, string> { ["value"] = $"{(null)}", ["onchange"] = "Handle1" }, new VNode[]
                {
                    new VElement("option", "1.7.2.1", new Dictionary<string, string> { ["value"] = "" }, "All"),
                    new VElement("option", "1.7.2.2", new Dictionary<string, string> { ["value"] = "Electronics" }, "Electronics"),
                    new VElement("option", "1.7.2.3", new Dictionary<string, string> { ["value"] = "Clothing" }, "Clothing")
                }),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)products).Where(p => p.inStock).Where(p => string.IsNullOrEmpty(categoryFilter)  ||  p.category  ==  categoryFilter).Take(3).Select(product => new VElement("li", "1.7.3.1.1", new Dictionary<string, string> { ["key"] = $"{(null)}" }, new VNode[]
                {
                    new VText($"{(product.name)}- ${(product.price)}", "1.7.3.1.1.1")
                })).ToArray())
            }),
            new VElement("section", "1.8", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.8.1", new Dictionary<string, string>(), "Full Chain: Filter + Sort + Slice + Map"),
                new VElement("input", "1.8.2", new Dictionary<string, string> { ["type"] = "number", ["value"] = $"{(null)}", ["onchange"] = "Handle2", ["min"] = $"{(null)}", ["max"] = $"{(null)}" }),
                MinimactHelpers.createElement("div", new Dictionary<string, string> { ["class"] = "product-grid" }, ((IEnumerable<dynamic>)products).Where(p => p.inStock && p.rating >= 4.0).OrderByDescending(x => x.rating).Skip(0).Take(maxItems - 0).Select(product => new VElement("div", "1.8.3.1.1", new Dictionary<string, string> { ["key"] = $"{(null)}", ["class"] = "product-card" }, new VNode[]
                {
                    new VElement("h4", "1.8.3.1.1.1", new Dictionary<string, string>(), new VNode[]
                    {
                        new VText($"{(product.name)}", "1.8.3.1.1.1.1")
                    }),
                    new VElement("p", "1.8.3.1.1.2", new Dictionary<string, string> { ["class"] = "price" }, new VNode[]
                    {
                        new VText($"{(product.price)}", "1.8.3.1.1.2.1")
                    }),
                    new VElement("p", "1.8.3.1.1.3", new Dictionary<string, string> { ["class"] = "rating" }, new VNode[]
                    {
                        new VText($"{(product.rating)}", "1.8.3.1.1.3.1")
                    }),
                    new VElement("span", "1.8.3.1.1.4", new Dictionary<string, string> { ["class"] = "category" }, new VNode[]
                    {
                        new VText($"{(product.category)}", "1.8.3.1.1.4.1")
                    })
                })).ToArray())
            }),
            MinimactHelpers.createElement("section", null, new VElement("h3", "1.9.1", new Dictionary<string, string>(), "Nested Maps with Filter"), ((IEnumerable<dynamic>)null).Select(priority => new VElement("div", "1.9.2.1", new Dictionary<string, string> { ["key"] = $"{(null)}", ["class"] = "priority-group" }, new VNode[]
            {
                new VElement("h4", "1.9.2.1.1", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(priority)}", "1.9.2.1.1.1")
                }),
                MinimactHelpers.createElement("ul", null, ((IEnumerable<dynamic>)todos).Where(t => t.priority == priority).Select(todo => new VElement("li", "1.9.2.1.2.1.1", new Dictionary<string, string> { ["key"] = $"{(null)}" }, new VNode[]
                {
                    new VText($"{(todo.text)}", "1.9.2.1.2.1.1.1")
                })).ToArray())
            })).ToArray()),
            new VElement("section", "1.10", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.10.1", new Dictionary<string, string>(), "Filter for Count"),
                new VElement("p", "1.10.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(todos.Where(t => !t.done && t.priority == "high").Count())}", "1.10.2.1")
                }),
                new VElement("p", "1.10.3", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(products.Where(p => p.inStock && p.category == "Electronics").Count())}", "1.10.3.1")
                })
            })
        });
    }

    public void Handle0()
    {
    }

    public void Handle1()
    {
    }

    public void Handle2()
    {
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
            ["Handle2"] = @"function () {\n  setMaxItems(int.TryParse(e.target.value.ToString(),  out int _p) ? _p : 5);\n}"
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
