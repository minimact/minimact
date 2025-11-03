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
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]},{""type"":""Text"",""template"":""- Priority Level:"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.priority""],""slots"":[0]}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.text.toUpperCase""],""slots"":[0]}]}}")]
[LoopTemplate("products", @"{""stateKey"":""products"",""arrayBinding"":""products"",""itemVar"":""product"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.name""],""slots"":[0]},{""type"":""Text"",""template"":"": $"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.price,item.taxRate,item.discount,toFixed""],""slots"":[0]}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":""index"",""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Item #"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:index""],""slots"":[0]},{""type"":""Text"",""template"":""of"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":"":"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]},{""type"":""Text"",""template"":""(Priority:"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.priority""],""slots"":[0]},{""type"":""Text"",""template"":""%)"",""bindings"":[],""slots"":[]}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.id,item.text""],""slots"":[0]}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]},{""type"":""Text"",""template"":""-"",""bindings"":[],""slots"":[]},{""type"":""conditional"",""template"":""{0}"",""bindings"":[""__expr__:item.priority""],""slots"":[0],""conditionalTemplates"":{""true"":""Low Priority"",""false"":""High Priority""},""conditionalBindingIndex"":0}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.completed""],""slots"":[0]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.completed""],""slots"":[0]}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.text.substring,toUpperCase""],""slots"":[0]}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":""index"",""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Row"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:index""],""slots"":[0]},{""type"":""Text"",""template"":"":"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":""index"",""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""className"":{""template"":""{0}"",""bindings"":[""__expr__:index""],""slots"":[0],""conditionalTemplates"":{""true"":""even"",""false"":""odd""},""conditionalBindingIndex"":0,""type"":""conditional""}},""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.dueDate""],""slots"":[0]}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":null}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]},{""type"":""Text"",""template"":""- Level:"",""bindings"":[],""slots"":[]}]}}")]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":null}}")]
[LoopTemplate("products", @"{""stateKey"":""products"",""arrayBinding"":""products"",""itemVar"":""product"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.name""],""slots"":[0]},{""type"":""Text"",""template"":"": $"",""bindings"":[],""slots"":[]}]}}")]
[Component]
public partial class ComplexLoopExpressions : MinimactComponent
{
    [State]
    private List<dynamic> todos = new List<object> { new { id = 1, text = "Buy groceries", completed = false, priority = 2, dueDate = "2024-12-01" }, new { id = 2, text = "Finish project", completed = true, priority = 1, dueDate = "2024-11-30" }, new { id = 3, text = "Call mom", completed = false, priority = 3, dueDate = "2024-12-05" } };

    [State]
    private List<dynamic> products = new List<object> { new { id = 1, name = "Widget", price = 99.99, taxRate = 0.08, discount = 0.1 }, new { id = 2, name = "Gadget", price = 149.99, taxRate = 0.08, discount = 0.15 }, new { id = 3, name = "Tool", price = 79.99, taxRate = 0.08, discount = 0.05 } };

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", new Dictionary<string, string>(), "Complex Loop Expression Tests"),
            new VElement("p", new Dictionary<string, string> { ["class"] = "info" }, "Testing binary operations, method calls, and complex expressions in .map() bodies"),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 1: Binary Expression (todo.priority + 1)"),
                MinimactHelpers.createElement("ul", null, todos.Select(todo => new VElement("li", new Dictionary<string, string> { ["key"] = $"{todo.id}" }, new VNode[]
                    {
                        new VText($"{(todo.text)}"),
                        new VText("- Priority Level:"),
                        new VText($"{(todo.priority + 1)}")
                    })).ToArray()),
                new VElement("p", new Dictionary<string, string> { ["class"] = "expected" }, "Expected: Priority displayed as 3, 2, 4")
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 2: Method Call (todo.text.toUpperCase())"),
                MinimactHelpers.createElement("ul", null, todos.Select(todo => new VElement("li", new Dictionary<string, string> { ["key"] = $"{todo.id}" }, new VNode[]
                    {
                        new VText($"{(todo.text.ToUpper())}")
                    })).ToArray()),
                new VElement("p", new Dictionary<string, string> { ["class"] = "expected" }, "Expected: All text in UPPERCASE")
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 3: Complex Math (price * (1 + tax) * (1 - discount))"),
                MinimactHelpers.createElement("ul", null, products.Select(product => new VElement("li", new Dictionary<string, string> { ["key"] = $"{product.id}" }, new VNode[]
                    {
                        new VText($"{(product.name)}"),
                        new VText(": $"),
                        new VText($"{((product.price * (1 + product.taxRate) * (1 - product.discount)).ToString("F2"))}")
                    })).ToArray())
            }),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 4: Multiple Operations"), todos.Select((todo, index) => new VElement("div", new Dictionary<string, string> { ["key"] = $"{todo.id}" }, new VNode[]
                {
                    new VText("Item #"),
                    new VText($"{(index + 1)}"),
                    new VText("of"),
                    new VText($"{(todos.Count)}"),
                    new VText(":"),
                    new VText($"{(todo.text)}"),
                    new VText("(Priority:"),
                    new VText($"{(todo.priority * 10)}"),
                    new VText("%)")
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 5: String Concatenation"), todos.Select(todo => new VElement("div", new Dictionary<string, string> { ["key"] = $"{todo.id}" }, new VNode[]
                {
                    new VText($"{(todo.id + ". " + todo.text)}")
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 6: Comparison in Expression"), todos.Select(todo => new VElement("div", new Dictionary<string, string> { ["key"] = $"{todo.id}" }, new VNode[]
                {
                    new VText($"{(todo.text)}"),
                    new VText("-"),
                    new VText($"{((todo.priority > 2) ? "Low Priority" : "High Priority")}")
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 7: Logical AND"), todos.Select(todo => new VElement("div", new Dictionary<string, string> { ["key"] = $"{todo.id}" }, new VNode[]
                {
                    new VText($"{(todo.text)}"),
                    new VText($"{((new MObject(todo.completed)) ? " ✓" : null)}"),
                    new VText($"{((!todo.completed) ? " ○" : null)}")
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 8: Chained Method Calls"), todos.Select(todo => new VElement("div", new Dictionary<string, string> { ["key"] = $"{todo.id}" }, new VNode[]
                {
                    new VText($"{(todo.text.Substring(0, 10).ToUpper())}")
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 9: Index Arithmetic"), todos.Select((todo, index) => new VElement("div", new Dictionary<string, string> { ["key"] = $"{todo.id}" }, new VNode[]
                {
                    new VText("Row"),
                    new VText($"{(index * 2 + 1)}"),
                    new VText(":"),
                    new VText($"{(todo.text)}")
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 10: Modulo for Alternating Rows"), todos.Select((todo, index) => MinimactHelpers.createElement("div", new { key = todo.id, className = (index % 2 == 0) ? "even" : "odd" }, todo.text)).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 11: Nullish Coalescing (||)"), todos.Select(todo => new VElement("div", new Dictionary<string, string> { ["key"] = $"{todo.id}" }, new VNode[]
                {
                    new VText($"{((todo.dueDate) ?? ("No due date"))}")
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 12: Ternary with Method Call"), todos.Select(todo => new VElement("div", new Dictionary<string, string> { ["key"] = $"{todo.id}" }, new VNode[]
                {
                    new VText($"{((new MObject(todo.completed)) ? todo.text.ToLower() : todo.text.ToUpper())}")
                })).ToArray()),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "workarounds" }, new VNode[]
            {
                new VElement("h2", new Dictionary<string, string>(), "✅ Guaranteed Working Workarounds"),
                MinimactHelpers.createElement("div", new { className = "test-case success" }, new VElement("h3", new Dictionary<string, string>(), "Workaround 1: Pre-compute Binary Expression"), todos.Select(todo => { var priorityLevel = todo.priority + 1; return new VElement("div", new Dictionary<string, string> { ["key"] = $"{todo.id}" }, new VNode[]
                    {
                        new VText($"{(todo.text)}"),
                        new VText("- Level:"),
                        new VText($"{(priorityLevel)}")
                    }); }).ToArray()),
                MinimactHelpers.createElement("div", new { className = "test-case success" }, new VElement("h3", new Dictionary<string, string>(), "Workaround 2: Pre-compute Method Call"), todos.Select(todo => { var upperText = todo.text.ToUpper(); return new VElement("div", new Dictionary<string, string> { ["key"] = $"{todo.id}" }, new VNode[]
                    {
                        new VText($"{(upperText)}")
                    }); }).ToArray()),
                MinimactHelpers.createElement("div", new { className = "test-case success" }, new VElement("h3", new Dictionary<string, string>(), "Workaround 3: Pre-compute Complex Calculation"), products.Select(product => { var finalPrice = (product.price * (1 + product.taxRate) * (1 - product.discount)).ToString("F2"); return new VElement("div", new Dictionary<string, string> { ["key"] = $"{product.id}" }, new VNode[]
                    {
                        new VText($"{(product.name)}"),
                        new VText(": $"),
                        new VText($"{(finalPrice)}")
                    }); }).ToArray())
            })
        });
    }
}

}
