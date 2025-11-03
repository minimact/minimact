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
[LoopTemplate("categories", @"{""stateKey"":""categories"",""arrayBinding"":""categories"",""itemVar"":""category"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""className"":{""template"":""category"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Element"",""tag"":""h4"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.name""],""slots"":[0]}]},{""type"":""Element"",""tag"":""ul"",""propsTemplates"":null,""childrenTemplates"":null}]}}")]
[LoopTemplate("departments", @"{""stateKey"":""departments"",""arrayBinding"":""departments"",""itemVar"":""dept"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""className"":{""template"":""department"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Element"",""tag"":""h3"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.name""],""slots"":[0]}]}]}}")]
[LoopTemplate("categories", @"{""stateKey"":""categories"",""arrayBinding"":""categories"",""itemVar"":""category"",""indexVar"":""catIndex"",""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Element"",""tag"":""h4"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""."",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.name""],""slots"":[0]}]},{""type"":""Element"",""tag"":""ul"",""propsTemplates"":null,""childrenTemplates"":null}]}}")]
[LoopTemplate("categories", @"{""stateKey"":""categories"",""arrayBinding"":""categories"",""itemVar"":""category"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Element"",""tag"":""button"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.name""],""slots"":[0]}]},{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":null}]}}")]
[LoopTemplate("categories", @"{""stateKey"":""categories"",""arrayBinding"":""categories"",""itemVar"":""category"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Element"",""tag"":""h4"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.name""],""slots"":[0]}]}]}}")]
[LoopTemplate("categories", @"{""stateKey"":""categories"",""arrayBinding"":""categories"",""itemVar"":""category"",""indexVar"":""catIdx"",""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Element"",""tag"":""h4"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Category"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":"":"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.name""],""slots"":[0]}]},{""type"":""Element"",""tag"":""p"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Total Items:"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.items.length""],""slots"":[0]}]}]}}")]
[Component]
public partial class NestedMapCalls : MinimactComponent
{
    [State]
    private List<dynamic> categories = new List<object> { new { id = 1, name = "Electronics", items = new List<object> { new { id = 101, name = "Laptop" }, new { id = 102, name = "Mouse" }, new { id = 103, name = "Keyboard" } } }, new { id = 2, name = "Books", items = new List<object> { new { id = 201, name = "Fiction" }, new { id = 202, name = "Non-Fiction" } } } };

    [State]
    private List<dynamic> departments = new List<object> { new { id = 1, name = "Store", categories = new List<object> { new { id = 10, name = "Clothing", items = new List<object> { new { id = 1001, name = "Shirt" }, new { id = 1002, name = "Pants" } } }, new { id = 20, name = "Shoes", items = new List<object> { new { id = 2001, name = "Sneakers" }, new { id = 2002, name = "Boots" } } } } } };

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", new Dictionary<string, string>(), "Nested .map() Test Cases"),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 1: Double Nested (Categories → Items)"),
                MinimactHelpers.createElement("div", new { className = "categories" }, categories.Select(category => new VElement("div", new Dictionary<string, string> { ["key"] = $"{category.id}", ["class"] = "category" }, new VNode[]
                    {
                        new VElement("h4", new Dictionary<string, string>(), new VNode[]
                        {
                            new VText($"{(category.name)}")
                        }),
                        MinimactHelpers.createElement("ul", null, category.items.Select(item => new VElement("li", new Dictionary<string, string> { ["key"] = $"{item.id}" }, new VNode[]
                            {
                                new VText($"{(item.name)}")
                            })).ToArray())
                    })).ToArray())
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 2: Triple Nested (Departments → Categories → Items)"),
                MinimactHelpers.createElement("div", new { className = "departments" }, departments.Select(dept => MinimactHelpers.createElement("div", new { key = dept.id, className = "department" }, new VElement("h3", new Dictionary<string, string>(), new VNode[]
                        {
                            new VText($"{(dept.name)}")
                        }), dept.categories.Select(cat => new VElement("div", new Dictionary<string, string> { ["key"] = $"{cat.id}", ["class"] = "category" }, new VNode[]
                        {
                            new VElement("h4", new Dictionary<string, string>(), new VNode[]
                            {
                                new VText($"{(cat.name)}")
                            }),
                            MinimactHelpers.createElement("ul", null, cat.items.Select(item => new VElement("li", new Dictionary<string, string> { ["key"] = $"{item.id}" }, new VNode[]
                                {
                                    new VText($"{(item.name)}")
                                })).ToArray())
                        })).ToArray())).ToArray())
            }),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 3: Nested with Index Parameters"), categories.Select((category, catIndex) => new VElement("div", new Dictionary<string, string> { ["key"] = $"{category.id}" }, new VNode[]
                {
                    new VElement("h4", new Dictionary<string, string>(), new VNode[]
                    {
                        new VText($"{(catIndex + 1)}"),
                        new VText("."),
                        new VText($"{(category.name)}")
                    }),
                    MinimactHelpers.createElement("ul", null, category.items.Select((item, itemIndex) => new VElement("li", new Dictionary<string, string> { ["key"] = $"{item.id}" }, new VNode[]
                        {
                            new VText($"{(catIndex + 1)}"),
                            new VText("."),
                            new VText($"{(itemIndex + 1)}"),
                            new VText("-"),
                            new VText($"{(item.name)}")
                        })).ToArray())
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 4: Nested with Event Handlers"), categories.Select(category => new VElement("div", new Dictionary<string, string> { ["key"] = $"{category.id}" }, new VNode[]
                {
                    new VElement("button", new Dictionary<string, string> { ["onclick"] = "Handle0" }, new VNode[]
                    {
                        new VText($"{(category.name)}")
                    }),
                    MinimactHelpers.createElement("div", null, category.items.Select(item => new VElement("button", new Dictionary<string, string> { ["key"] = $"{item.id}", ["onclick"] = "Handle1" }, new VNode[]
                        {
                            new VText($"{(item.name)}")
                        })).ToArray())
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 5: Nested with Conditionals"), categories.Select(category => MinimactHelpers.createElement("div", new { key = category.id }, new VElement("h4", new Dictionary<string, string>(), new VNode[]
                    {
                        new VText($"{(category.name)}")
                    }), (category.items.Count > 0) ? MinimactHelpers.createElement("ul", null, category.items.Select(item => MinimactHelpers.createElement("li", new { key = item.id }, item.name, (item.id > 200) ? new VElement("span", new Dictionary<string, string>(), "(New!)") : null)).ToArray()) : null, (category.items.Count == 0) ? new VElement("p", new Dictionary<string, string>(), "No items") : null)).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 6: Nested with Inline Calculations"), categories.Select((category, catIdx) => MinimactHelpers.createElement("div", new { key = category.id }, new VElement("h4", new Dictionary<string, string>(), new VNode[]
                    {
                        new VText("Category"),
                        new VText($"{(catIdx + 1)}"),
                        new VText(":"),
                        new VText($"{(category.name)}")
                    }), new VElement("p", new Dictionary<string, string>(), new VNode[]
                    {
                        new VText("Total Items:"),
                        new VText($"{(category.items.Count)}")
                    }), category.items.Select((item, itemIdx) => new VElement("div", new Dictionary<string, string> { ["key"] = $"{item.id}" }, new VNode[]
                    {
                        new VText("Item #"),
                        new VText($"{(itemIdx + 1)}"),
                        new VText("of"),
                        new VText($"{(category.items.Count)}"),
                        new VText(":"),
                        new VText($"{(item.name)}")
                    })).ToArray())).ToArray())
        });
    }

    public void Handle0()
    {
        Console.WriteLine($"Category: {category.name}");
    }

    public void Handle1()
    {
        Console.WriteLine($"Item: {item.name}");
    }
}

}
