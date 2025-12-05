using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[LoopTemplate("items", @"{""stateKey"":""items"",""arrayBinding"":""items"",""itemVar"":""item"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""className"":{""template"":""cart-item"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Element"",""tag"":""img"",""propsTemplates"":{""src"":{""template"":""{0}"",""bindings"":[""item.image""],""slots"":[0],""type"":""binding""},""alt"":{""template"":""{0}"",""bindings"":[""item.name""],""slots"":[0],""type"":""binding""}},""childrenTemplates"":null},{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""className"":{""template"":""details"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Element"",""tag"":""h3"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.name""],""slots"":[0]}]},{""type"":""Element"",""tag"":""p"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Quantity:"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.quantity""],""slots"":[0]}]},{""type"":""Element"",""tag"":""p"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""$"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.price""],""slots"":[0]}]}]},{""type"":""Element"",""tag"":""button"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Remove"",""bindings"":[],""slots"":[]}]}]}}")]
[Component]
public partial class ShoppingCart : MinimactComponent
{
    [Prop]
    public List<dynamic> items { get; set; }

    [Prop]
    public double total { get; set; }

    [Prop]
    public double discount { get; set; }

    [Prop]
    public dynamic removeItem { get; set; }

    [Prop]
    public dynamic checkout { get; set; }

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var finalPrice = total - total * discount / 100;

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "cart" }, new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), "Shopping Cart"),
            MinimactHelpers.createElement("div", new { className = "items" }, items.Select(item => new VElement("div", "1.2.1.1", new Dictionary<string, string> { ["class"] = "cart-item" }, new VNode[]
                {
                    new VElement("img", "1.2.1.1.1", new Dictionary<string, string> { ["src"] = $"{item.image}", ["alt"] = $"{item.name}" }),
                    new VElement("div", "1.2.1.1.2", new Dictionary<string, string> { ["class"] = "details" }, new VNode[]
                    {
                        new VElement("h3", "1.2.1.1.2.1", new Dictionary<string, string>(), new VNode[]
                        {
                            new VText($"{(item.name)}", "1.2.1.1.2.1.1")
                        }),
                        new VElement("p", "1.2.1.1.2.2", new Dictionary<string, string>(), $"Quantity:{(item.quantity)}"),
                        new VElement("p", "1.2.1.1.2.3", new Dictionary<string, string>(), $"${(item.price)}")
                    }),
                    new VElement("button", "1.2.1.1.3", new Dictionary<string, string> { ["onclick"] = "Handle0:{item}" }, "Remove")
                })).ToArray()),
            MinimactHelpers.createElement("div", new { className = "summary" }, new VElement("p", "1.3.1", new Dictionary<string, string>(), $"Subtotal: ${(total)}"), (discount > 0) ? new VElement("p", "1.3.2.1", new Dictionary<string, string>(), $"Discount:{(discount)}%") : new VNull("1.3.2"), new VElement("h2", "1.3.3", new Dictionary<string, string>(), $"Total: ${(finalPrice.ToString("F2"))}"), new VElement("button", "1.3.4", new Dictionary<string, string> { ["disabled"] = $"{MinimactHelpers.GetLength(items) == 0}", ["onclick"] = "checkout" }, "Checkout"))
        });
    }

    public void Handle0(dynamic item)
    {
        removeItem(item.id);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function () {\n  removeItem(item.id);\n}"
        };
    }
}
