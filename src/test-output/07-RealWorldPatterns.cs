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
[LoopTemplate("users", @"{""stateKey"":""users"",""arrayBinding"":""users"",""itemVar"":""user"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""template-literal"",""template"":""{0} {1}"",""bindings"":[""item.firstName"",""item.lastName""],""slots"":[0,4]}]}}")]
[LoopTemplate("users", @"{""stateKey"":""users"",""arrayBinding"":""users"",""itemVar"":""user"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""template-literal"",""template"":""Name: {0}"",""bindings"":[""__expr__:item.firstName.toUpperCase""],""slots"":[6]}]}}")]
[LoopTemplate("products", @"{""stateKey"":""products"",""arrayBinding"":""products"",""itemVar"":""product"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""template-literal"",""template"":""{0}: ${1} x {2} = ${3}"",""bindings"":[""item.name"",""item.price"",""item.quantity"",""__expr__:item.price,item.quantity""],""slots"":[0,6,12,19]}]}}")]
[LoopTemplate("products", @"{""stateKey"":""products"",""arrayBinding"":""products"",""itemVar"":""product"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""template-literal"",""template"":""Total: ${0}"",""bindings"":[""__expr__:item.price,item.quantity,toFixed""],""slots"":[8]}]}}")]
[LoopTemplate("users", @"{""stateKey"":""users"",""arrayBinding"":""users"",""itemVar"":""user"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":null}}")]
[LoopTemplate("users", @"{""stateKey"":""users"",""arrayBinding"":""users"",""itemVar"":""user"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""conditional"",""template"":""{0}"",""bindings"":[""__expr__:item.age""],""slots"":[0],""conditionalTemplates"":{""true"":""Senior"",""false"":""Junior""},""conditionalBindingIndex"":0}]}}")]
[LoopTemplate("users", @"{""stateKey"":""users"",""arrayBinding"":""users"",""itemVar"":""user"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.firstName,item.lastName""],""slots"":[0]}]}}")]
[LoopTemplate("users", @"{""stateKey"":""users"",""arrayBinding"":""users"",""itemVar"":""user"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.email""],""slots"":[0]}]}}")]
[LoopTemplate("users", @"{""stateKey"":""users"",""arrayBinding"":""users"",""itemVar"":""user"",""indexVar"":""index"",""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""User #"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:index""],""slots"":[0]}]}}")]
[LoopTemplate("users", @"{""stateKey"":""users"",""arrayBinding"":""users"",""itemVar"":""user"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Age:"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.age""],""slots"":[0]},{""type"":""Text"",""template"":""("",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.age,toFixed""],""slots"":[0]},{""type"":""Text"",""template"":""%)"",""bindings"":[],""slots"":[]}]}}")]
[LoopTemplate("users", @"{""stateKey"":""users"",""arrayBinding"":""users"",""itemVar"":""user"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""template-literal"",""template"":""Email: {0}"",""bindings"":[""__expr__:item.email""],""slots"":[7]}]}}")]
[LoopTemplate("users", @"{""stateKey"":""users"",""arrayBinding"":""users"",""itemVar"":""user"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Status:"",""bindings"":[],""slots"":[]}]}}")]
[LoopTemplate("products", @"{""stateKey"":""products"",""arrayBinding"":""products"",""itemVar"":""product"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.name""],""slots"":[0]},{""type"":""Text"",""template"":"": $"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:Math.round,item.price""],""slots"":[0]}]}}")]
[LoopTemplate("users", @"{""stateKey"":""users"",""arrayBinding"":""users"",""itemVar"":""user"",""indexVar"":""index"",""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""ID:"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:String,index,padStart""],""slots"":[0]}]}}")]
[LoopTemplate("users", @"{""stateKey"":""users"",""arrayBinding"":""users"",""itemVar"":""user"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.firstName""],""slots"":[0]},{""type"":""Text"",""template"":"":"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:String,item.isActive""],""slots"":[0]}]}}")]
[LoopTemplate("users", @"{""stateKey"":""users"",""arrayBinding"":""users"",""itemVar"":""user"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.email.substring""],""slots"":[0]},{""type"":""Text"",""template"":""..."",""bindings"":[],""slots"":[]}]}}")]
[Component]
public partial class RealWorldPatterns : MinimactComponent
{
    [State]
    private List<dynamic> users = new List<object> { new { id = 1, firstName = "John", lastName = "Doe", email = "john@example.com", age = 30, isActive = true }, new { id = 2, firstName = "Jane", lastName = "Smith", email = "jane@example.com", age = 25, isActive = false } };

    [State]
    private List<dynamic> products = new List<object> { new { id = 1, name = "Widget", price = 29.99, quantity = 5 }, new { id = 2, name = "Gadget", price = 49.99, quantity = 3 } };

    [State]
    private string searchTerm = "";

    [State]
    private int count = 42;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", new Dictionary<string, string>(), "Real-World Common Patterns"),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 1: Template Literals with Multiple Expressions"), users.Select(user => new VElement("div", new Dictionary<string, string> { ["key"] = $"{user.id}" }, new VNode[]
                {
                    new VText($"{($"{user.firstName} {user.lastName}")}")
                })).ToArray(), new VElement("p", new Dictionary<string, string> { ["class"] = "expected" }, "Expected: John Doe, Jane Smith")),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 2: Template Literals + Method Calls"), users.Select(user => new VElement("div", new Dictionary<string, string> { ["key"] = $"{user.id}" }, new VNode[]
                {
                    new VText($"{($"Name: {user.firstName.ToUpper()}")}")
                })).ToArray(), new VElement("p", new Dictionary<string, string> { ["class"] = "expected" }, "Expected: Name: JOHN, Name: JANE")),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 3: Template Literals + Calculations"), products.Select(product => new VElement("div", new Dictionary<string, string> { ["key"] = $"{product.id}" }, new VNode[]
                {
                    new VText($"{($"{product.name}: ${product.price} x {product.quantity} = ${product.price * product.quantity}")}")
                })).ToArray(), new VElement("p", new Dictionary<string, string> { ["class"] = "expected" }, "Expected: Widget: $29.99 x 5 = $149.95")),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 4: Template Literals + toFixed()"), products.Select(product => new VElement("div", new Dictionary<string, string> { ["key"] = $"{product.id}" }, new VNode[]
                {
                    new VText($"{($"Total: ${(product.price * product.quantity).ToString("F2")}")}")
                })).ToArray(), new VElement("p", new Dictionary<string, string> { ["class"] = "expected" }, "Expected: Total: $149.95, Total: $149.97")),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 5: Ternary in Template Literal"), users.Select(user => new VElement("div", new Dictionary<string, string> { ["key"] = $"{user.id}" }, new VNode[]
                {
                    new VText($"{($"{user.firstName} ({((user.isActive) ? "Active" : "Inactive")})")}")
                })).ToArray(), new VElement("p", new Dictionary<string, string> { ["class"] = "expected" }, "Expected: John (Active), Jane (Inactive)")),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Pattern 6: Array.length Property"),
                new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Total users:"),
                    new VText($"{(users.Count)}")
                }),
                new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Total products:"),
                    new VText($"{(products.Count)}")
                }),
                new VElement("p", new Dictionary<string, string> { ["class"] = "expected" }, "Expected: 2, 2")
            }),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 7: Comparison in Ternary"), users.Select(user => new VElement("div", new Dictionary<string, string> { ["key"] = $"{user.id}" }, new VNode[]
                {
                    new VText($"{((user.age >= 30) ? "Senior" : "Junior")}")
                })).ToArray(), new VElement("p", new Dictionary<string, string> { ["class"] = "expected" }, "Expected: Senior, Junior")),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 8: Property Concatenation"), users.Select(user => new VElement("div", new Dictionary<string, string> { ["key"] = $"{user.id}" }, new VNode[]
                {
                    new VText($"{(user.firstName + " " + user.lastName)}")
                })).ToArray(), new VElement("p", new Dictionary<string, string> { ["class"] = "expected" }, "Expected: John Doe, Jane Smith")),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 9: Nullish Coalescing"), new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{((searchTerm) ?? ("No search term"))}")
                }), users.Select(user => new VElement("div", new Dictionary<string, string> { ["key"] = $"{user.id}" }, new VNode[]
                {
                    new VText($"{((user.email) ?? ("No email"))}")
                })).ToArray(), new VElement("p", new Dictionary<string, string> { ["class"] = "expected" }, "Expected: No search term, john@example.com, jane@example.com")),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 10: String + Number"), new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Count:"),
                    new VText($"{(count)}")
                }), new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Next:"),
                    new VText($"{(count + 1)}")
                }), users.Select((user, index) => new VElement("div", new Dictionary<string, string> { ["key"] = $"{user.id}" }, new VNode[]
                {
                    new VText("User #"),
                    new VText($"{(index + 1)}")
                })).ToArray(), new VElement("p", new Dictionary<string, string> { ["class"] = "expected" }, "Expected: Count: 42, Next: 43, User #1, User #2")),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 11: Percentage Display"), users.Select(user => new VElement("div", new Dictionary<string, string> { ["key"] = $"{user.id}" }, new VNode[]
                {
                    new VText("Age:"),
                    new VText($"{(user.age)}"),
                    new VText("("),
                    new VText($"{((user.age / 100 * 100).ToString("F0"))}"),
                    new VText("%)")
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 12: Template with Fallback"), users.Select(user => new VElement("div", new Dictionary<string, string> { ["key"] = $"{user.id}" }, new VNode[]
                {
                    new VText($"{($"Email: {(user.email) ?? ("N/A")}")}")
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 13: Nested/Multiple Ternaries"), users.Select(user => new VElement("div", new Dictionary<string, string> { ["key"] = $"{user.id}" }, new VNode[]
                {
                    new VText("Status:"),
                    new VText($"{((new MObject(user.isActive)) ? (user.age >= 30) ? "Senior Active" : "Junior Active" : "Inactive")}")
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 14: Array Index Access"), (users.Count > 0) ? new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("First user:"),
                    new VText($"{(users[0].firstName)}")
                }) : null, (users.Count > 1) ? new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Second user:"),
                    new VText($"{(users[1].firstName)}")
                }) : null),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 15: Math Operations"), products.Select(product => new VElement("div", new Dictionary<string, string> { ["key"] = $"{product.id}" }, new VNode[]
                {
                    new VText($"{(product.name)}"),
                    new VText(": $"),
                    new VText($"{((int)Math.Round(product.price))}")
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 16: Padded Numbers"), users.Select((user, index) => new VElement("div", new Dictionary<string, string> { ["key"] = $"{user.id}" }, new VNode[]
                {
                    new VText("ID:"),
                    new VText($"{(String(index + 1).padStart(3, "0"))}")
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 17: Boolean Display"), users.Select(user => new VElement("div", new Dictionary<string, string> { ["key"] = $"{user.id}" }, new VNode[]
                {
                    new VText($"{(user.firstName)}"),
                    new VText(":"),
                    new VText($"{(String(user.isActive))}")
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Pattern 18: String Truncation"), users.Select(user => new VElement("div", new Dictionary<string, string> { ["key"] = $"{user.id}" }, new VNode[]
                {
                    new VText($"{(user.email.Substring(0, 10))}"),
                    new VText("...")
                })).ToArray())
        });
    }
}

}
