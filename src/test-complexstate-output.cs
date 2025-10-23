using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class ShoppingCart : MinimactComponent
{
    [Prop]
    public dynamic items { get; set; }

    [Prop]
    public dynamic total { get; set; }

    [Prop]
    public dynamic discount { get; set; }

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var finalPrice = total - total * discount / 100;

        return new VElement("div", new Dictionary<string, string> { ["className"] = "cart" }, new VNode[]
        {
            new VElement("h1", new Dictionary<string, string>(), "Shopping Cart"),
            MinimactHelpers.createElement("div", new { className = "items" }, items.map(null)),
            MinimactHelpers.createElement("div", new { className = "summary" }, new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Subtotal: $"),
                    new VText($"{total}")
                }), (discount > 0) ? new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Discount:"),
                    new VText($"{discount}"),
                    new VText("%")
                }) : null, new VElement("h2", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Total: $"),
                    new VText($"{finalPrice.toFixed(2)}")
                }), new VElement("button", new Dictionary<string, string> { ["disabled"] = $"{items.length == 0}", ["onclick"] = "checkout" }, "Checkout"))
        });
    }
}

