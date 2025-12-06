using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class TestChainedArrayMethods : MinimactComponent
{
    [State]
    private bool showCompleted = false;

    [State]
    private string categoryFilter = "";

    [State]
    private int maxItems = 10;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var priority = {high:0,medium:1,low:2};

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "chained-methods-test" }, new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Chained Array Methods Test"),
            new VElement("section", "1.2", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.2.1", new Dictionary<string, string>(), "Filter + Map (incomplete todos)"),
                new VElement("ul", "1.2.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(todos.filter(todo=>!todo.done).map(todo=>(<likey={todo.id}>{todo.text}</li>)))}", "1.2.2.1")
                })
            }),
            new VElement("section", "1.3", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.3.1", new Dictionary<string, string>(), "Conditional Filter + Map"),
                new VElement("label", "1.3.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("input", "1.3.2.1", new Dictionary<string, string> { ["type"] = "checkbox", ["checked"] = $"{(showCompleted)}", ["onchange"] = "Handle0" }),
                    new VText("Show completed", "1.3.2.2")
                }),
                new VElement("ul", "1.3.3", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(todos.filter(todo=>showCompleted||!todo.done).map(todo=>(<likey={todo.id}className={todo.done?'done':''}>{todo.text}</li>)))}", "1.3.3.1")
                })
            }),
            new VElement("section", "1.4", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.4.1", new Dictionary<string, string>(), "Sort + Map (by priority)"),
                new VElement("ul", "1.4.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{([...todos].sort((a,b)=>{constpriority={high:0,medium:1,low:2};returnpriority[a.priority]-priority[b.priority];}).map(todo=>(<likey={todo.id}>[{todo.priority}]{todo.text}</li>)))}", "1.4.2.1")
                })
            }),
            new VElement("section", "1.5", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.5.1", new Dictionary<string, string>(), "Slice + Map (first 3)"),
                new VElement("ul", "1.5.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(todos.slice(0,3).map(todo=>(<likey={todo.id}>{todo.text}</li>)))}", "1.5.2.1")
                })
            }),
            new VElement("section", "1.6", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.6.1", new Dictionary<string, string>(), "Filter + Sort + Map (incomplete, by date)"),
                new VElement("ul", "1.6.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(todos.filter(todo=>!todo.done).sort((a,b)=>b.createdAt-a.createdAt).map(todo=>(<likey={todo.id}>{todo.text}(created:{todo.createdAt})</li>)))}", "1.6.2.1")
                })
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
                new VElement("ul", "1.7.3", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(products.filter(p=>p.inStock).filter(p=>!categoryFilter||p.category===categoryFilter).slice(0,3).map(product=>(<likey={product.id}>{product.name}- ${product.price}</li>)))}", "1.7.3.1")
                })
            }),
            new VElement("section", "1.8", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.8.1", new Dictionary<string, string>(), "Full Chain: Filter + Sort + Slice + Map"),
                new VElement("input", "1.8.2", new Dictionary<string, string> { ["type"] = "number", ["value"] = $"{(maxItems)}", ["onchange"] = "Handle2", ["min"] = $"{(1)}", ["max"] = $"{(10)}" }),
                new VElement("div", "1.8.3", new Dictionary<string, string> { ["class"] = "product-grid" }, new VNode[]
                {
                    new VText($"{(products.filter(p=>p.inStock&&p.rating>=4.0).sort((a,b)=>b.rating-a.rating).slice(0,maxItems).map(product=>(<divkey={product.id}className="product-card"><h4>{product.name}</h4><pclassName="price">${product.price}</p><pclassName="rating">⭐{product.rating}</p><spanclassName="category">{product.category}</span></div>)))}", "1.8.3.1")
                })
            }),
            new VElement("section", "1.9", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.9.1", new Dictionary<string, string>(), "Nested Maps with Filter"),
                new VText($"{(['high','medium','low'].map(priority=>(<divkey={priority}className="priority-group"><h4>{priority}priority</h4><ul>{todos.filter(t=>t.priority===priority).map(todo=>(<likey={todo.id}>{todo.text}</li>))}</ul></div>)))}", "1.9.2")
            }),
            new VElement("section", "1.10", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h3", "1.10.1", new Dictionary<string, string>(), "Filter for Count"),
                new VElement("p", "1.10.2", new Dictionary<string, string>(), $"Incomplete high priority:{(todos.filter(t=>!t.done&&t.priority==='high').length)}"),
                new VElement("p", "1.10.3", new Dictionary<string, string>(), $"In-stock electronics:{(products.filter(p=>p.inStock&&p.category==='Electronics').length)}")
            })
        });
    }

    public void Handle0()
    {
        SetState(nameof(showCompleted), !showCompleted);
    }

    public void Handle1()
    {
        SetState(nameof(categoryFilter), e.target.value);
    }

    public void Handle2()
    {
        SetState(nameof(maxItems), parseInt(e.target.value)||5);
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
}
