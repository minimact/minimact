using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class NavBar : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("cartItems")]
    private List<dynamic> cartItems => GetClientState<List<dynamic>>("cartItems", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var cartCount = MinimactHelpers.GetLength(cartItems);

        return new VElement("nav", "1", new Dictionary<string, string> { ["class"] = "nav-bar" }, new VNode[]
        {
            new VElement("div", "1.1", new Dictionary<string, string> { ["class"] = "logo" }, "My Store"),
            MinimactHelpers.createElement("div", new { id = "cart-icon", className = "cart-icon" }, "🛒", (cartCount > 0) ? new VElement("span", "1.2.2.1", new Dictionary<string, string> { ["id"] = "cart-badge", ["class"] = "badge" }, new VNode[]
                {
                    new VText($"{(cartCount)}", "1.2.2.1.1")
                }) : new VNull("1.2.2"))
        });
    }
}

[LoopTemplate("PRODUCTS", @"{""stateKey"":""PRODUCTS"",""arrayBinding"":""PRODUCTS"",""itemVar"":""product"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""className"":{""template"":""product-card"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Element"",""tag"":""h3"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.name""],""slots"":[0]}]},{""type"":""Element"",""tag"":""p"",""propsTemplates"":{""className"":{""template"":""price"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""$"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.price.toFixed""],""slots"":[0]}]},{""type"":""Element"",""tag"":""button"",""propsTemplates"":{""type"":{""template"":""button"",""bindings"":[],""slots"":[],""type"":""static""},""className"":{""template"":""add-to-cart-btn"",""bindings"":[],""slots"":[],""type"":""static""},""data-product-id"":{""template"":""{0}"",""bindings"":[""item.id""],""slots"":[0],""type"":""binding""}},""childrenTemplates"":[{""type"":""Text"",""template"":""Add to Cart"",""bindings"":[],""slots"":[]}]}]}}")]
[Component]
public partial class ProductList : MinimactComponent
{
    // Module-level constants
    private static readonly List<dynamic> PRODUCTS = new List<object> { new { id = 1, name = "Widget", price = 10 }, new { id = 2, name = "Gadget", price = 25 }, new { id = 3, name = "Doohickey", price = 15 }, new { id = 4, name = "Thingamajig", price = 30 } };

    // Client-computed properties (external libraries)
    [ClientComputed("handleAddToCart")]
    private dynamic handleAddToCart => GetClientState<dynamic>("handleAddToCart", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return MinimactHelpers.createElement("div", new { className = "product-list" }, new VElement("h2", "1.1", new Dictionary<string, string>(), "Products"), PRODUCTS.Select(product => new VElement("div", "1.2.1", new Dictionary<string, string> { ["class"] = "product-card" }, new VNode[]
            {
                new VElement("h3", "1.2.1.1", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(product.name)}", "1.2.1.1.1")
                }),
                new VElement("p", "1.2.1.2", new Dictionary<string, string> { ["class"] = "price" }, $"${(product.price.ToString("F2"))}"),
                new VElement("button", "1.2.1.3", new Dictionary<string, string> { ["type"] = "button", ["class"] = "add-to-cart-btn", ["data-product-id"] = $"{product.id}", ["onclick"] = "Handle0:{product}" }, "Add to Cart")
            })).ToArray());
    }

    public void Handle0(dynamic product)
    {
        handleAddToCart(product);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function () {\n  handleAddToCart(product);\n}"
        };
    }
}

[Component]
public partial class ShoppingCart : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("items")]
    private List<dynamic> items => GetClientState<List<dynamic>>("items", default);

    [ClientComputed("total")]
    private double total => GetClientState<double>("total", default);

    [ClientComputed("handleRemoveItem")]
    private dynamic handleRemoveItem => GetClientState<dynamic>("handleRemoveItem", default);

    [ClientComputed("handleClear")]
    private dynamic handleClear => GetClientState<dynamic>("handleClear", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return MinimactHelpers.createElement("div", new { className = "shopping-cart" }, new VElement("h2", "1.1", new Dictionary<string, string>(), "Cart"), (MinimactHelpers.GetLength(items) == 0) ? new VElement("p", "1.2.1", new Dictionary<string, string> { ["id"] = "empty-cart-msg" }, "Cart is empty") : new Fragment(MinimactHelpers.createElement("div", new { id = "cart-items" }, items.Select((item, idx) => new VElement("div", "", new Dictionary<string, string> { ["class"] = "cart-item", ["data-item-index"] = $"{idx}" }, new VNode[]
                    {
                        new VElement("span", "", new Dictionary<string, string>(), new VNode[]
                        {
                            new VText($"{(item.name)}", "")
                        }),
                        new VElement("span", "", new Dictionary<string, string>(), $"${(item.price.ToString("F2"))}"),
                        new VElement("button", "", new Dictionary<string, string> { ["type"] = "button", ["class"] = "remove-item-btn", ["onclick"] = "Handle0:{item}:{idx}" }, "Remove")
                    })).ToArray()), new VElement("div", "", new Dictionary<string, string> { ["id"] = "cart-total", ["class"] = "total" }, $"Total: ${(total.ToString("F2"))}"), new VElement("button", "", new Dictionary<string, string> { ["id"] = "clear-cart-btn", ["type"] = "button", ["onclick"] = "handleClear" }, "Clear Cart")));
    }

    public void Handle0(dynamic item, dynamic idx)
    {
        handleRemoveItem(idx);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function () {\n  handleRemoveItem(idx);\n}"
        };
    }
}

[Component]
public partial class ProductPage : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("cartItems")]
    private List<dynamic> cartItems => GetClientState<List<dynamic>>("cartItems", default);

    [ClientComputed("cartTotal")]
    private double cartTotal => GetClientState<double>("cartTotal", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["id"] = "product-page-root" }, new VNode[]
        {
            new VComponentWrapper
{
    ComponentName = "NavBar",
    ComponentType = "NavBar",
    HexPath = "1.1",
    InitialState = new Dictionary<string, object>(),

    ParentComponent = this
},
            new VElement("div", "1.2", new Dictionary<string, string> { ["class"] = "content" }, new VNode[]
            {
                new VComponentWrapper
{
    ComponentName = "ProductList",
    ComponentType = "ProductList",
    HexPath = "1.2.1",
    InitialState = new Dictionary<string, object>(),

    ParentComponent = this
},
                new VComponentWrapper
{
    ComponentName = "ShoppingCart",
    ComponentType = "ShoppingCart",
    HexPath = "1.2.2",
    InitialState = new Dictionary<string, object> { ["items"] = new List<dynamic> {  }, ["total"] = 0 },

    ParentComponent = this
}
            }),
            new VElement("div", "1.3", new Dictionary<string, string> { ["id"] = "status", ["class"] = "status" }, new VNode[]
            {
                new VElement("p", "1.3.1", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Cart Items:", "1.3.1.1"),
                    new VElement("span", "1.3.1.2", new Dictionary<string, string> { ["id"] = "cart-item-count" }, new VNode[]
                    {
                        new VText($"{(MinimactHelpers.GetLength(cartItems))}", "1.3.1.2.1")
                    })
                }),
                new VElement("p", "1.3.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Cart Total: $", "1.3.2.1"),
                    new VElement("span", "1.3.2.2", new Dictionary<string, string> { ["id"] = "cart-total-value" }, new VNode[]
                    {
                        new VText($"{(cartTotal.ToString("F2"))}", "1.3.2.2.1")
                    })
                })
            })
        });
    }
}
