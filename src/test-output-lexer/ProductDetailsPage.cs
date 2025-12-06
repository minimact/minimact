using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class ProductDetailsPage : MinimactComponent
{
    [State]
    private int cartTotal = 0;

    // MVC State property: productName
    private string productName => GetState<string>("productName");

    // MVC State property: price
    private double price => GetState<double>("price");

    // MVC State property: isAdminRole
    private bool isAdmin => GetState<bool>("isAdminRole");

    // MVC State property: initialQuantity
    private double quantity => GetState<double>("initialQuantity");

    // MVC State property: initialSelectedColor
    private string color => GetState<string>("initialSelectedColor");

    // MVC State property: initialIsExpanded
    private bool isExpanded => GetState<bool>("initialIsExpanded");

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // MVC State - read from State dictionary
        var productName = GetState<string>("productName");
        var price = GetState<double>("price");
        var isAdmin = GetState<bool>("isAdminRole");
        var quantity = GetState<double>("initialQuantity");
        var color = GetState<string>("initialSelectedColor");
        var isExpanded = GetState<bool>("initialIsExpanded");

        return new VElement("div", "1", new Dictionary<string, string> { ["style"] = "padding: 20px; font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto" }, new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), new VNode[]
            {
                new VText($"{(productName)}", "1.1.1")
            }),
            new VElement("div", "1.2", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px" }, new VNode[]
            {
                new VElement("div", "1.2.1", new Dictionary<string, string> { ["style"] = "font-size: 32px; font-weight: bold; color: #2563eb" }, new VNode[]
                {
                    new VText("$", "1.2.1.1"),
                    new VText($"{(price.ToString("F2"))}", "1.2.1.2")
                }),
                new VElement("div", "1.2.2", new Dictionary<string, string> { ["style"] = "color: #6b7280; font-size: 14px" }, new VNode[]
                {
                    new VText("Logged in as:", "1.2.2.1"),
                    new VText($"{(viewModel?.userEmail)}", "1.2.2.2")
                })
            }),
            new VElement("div", "1.3", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px" }, new VNode[]
            {
                new VElement("label", "1.3.1", new Dictionary<string, string> { ["style"] = "display: block; margin-bottom: 8px; font-weight: 500" }, "Quantity:"),
                new VElement("div", "1.3.2", new Dictionary<string, string> { ["style"] = "display: flex; gap: 10px; align-items: center" }, new VNode[]
                {
                    new VElement("button", "1.3.2.1", new Dictionary<string, string> { ["onclick"] = "Handle0", ["style"] = "padding: 8px 16px; background-color: #e5e7eb; border: none; border-radius: 4px; cursor: pointer" }, "-"),
                    new VElement("span", "1.3.2.2", new Dictionary<string, string> { ["style"] = "font-size: 20px; font-weight: bold; min-width: 40px; text-align: center" }, new VNode[]
                    {
                        new VText($"{(quantity)}", "1.3.2.2.1")
                    }),
                    new VElement("button", "1.3.2.3", new Dictionary<string, string> { ["onclick"] = "Handle1", ["style"] = "padding: 8px 16px; background-color: #e5e7eb; border: none; border-radius: 4px; cursor: pointer" }, "+")
                })
            }),
            new VElement("div", "1.4", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px" }, new VNode[]
            {
                new VElement("label", "1.4.1", new Dictionary<string, string> { ["style"] = "display: block; margin-bottom: 8px; font-weight: 500" }, "Color:"),
                new VElement("select", "1.4.2", new Dictionary<string, string> { ["value"] = $"{(color)}", ["onchange"] = "Handle2", ["style"] = "padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px" }, new VNode[]
                {
                    new VElement("option", "1.4.2.1", new Dictionary<string, string> { ["value"] = "Black" }, "Black"),
                    new VElement("option", "1.4.2.2", new Dictionary<string, string> { ["value"] = "White" }, "White"),
                    new VElement("option", "1.4.2.3", new Dictionary<string, string> { ["value"] = "Red" }, "Red"),
                    new VElement("option", "1.4.2.4", new Dictionary<string, string> { ["value"] = "Blue" }, "Blue")
                })
            }),
            (new MObject(isAdmin)) ? new VElement("div", "1.5.1", new Dictionary<string, string> { ["style"] = "padding: 16px; background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; margin-bottom: 20px" }, new VNode[]
            {
                new VElement("h3", "1.5.1.1", new Dictionary<string, string> { ["style"] = "margin-top: 0" }, "Admin Controls"),
                new VElement("button", "1.5.1.2", new Dictionary<string, string> { ["style"] = "padding: 8px 16px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px" }, "Edit Product"),
                new VElement("button", "1.5.1.3", new Dictionary<string, string> { ["style"] = "padding: 8px 16px; background-color: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer" }, "Delete Product")
            }) : new VNull("1.5"),
            new VElement("div", "1.6", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px" }, new VNode[]
            {
                new VElement("button", "1.6.1", new Dictionary<string, string> { ["onclick"] = "Handle3", ["style"] = "padding: 8px 16px; background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer" }, new VNode[]
                {
                    new VText($"{(isExpanded?"Hide":"Show")}", "1.6.1.1"),
                    new VText("Details", "1.6.1.2")
                }),
                (new MObject(isExpanded)) ? new VElement("div", "1.6.2.1", new Dictionary<string, string> { ["style"] = "margin-top: 12px; padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px" }, new VNode[]
                {
                    new VElement("h3", "1.6.2.1.1", new Dictionary<string, string>(), "Product Specifications"),
                    new VElement("p", "1.6.2.1.2", new Dictionary<string, string>(), "This is where detailed product information would go.")
                }) : new VNull("1.6.2")
            }),
            new VElement("div", "1.7", new Dictionary<string, string> { ["style"] = "padding: 16px; background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; margin-bottom: 20px" }, new VNode[]
            {
                new VElement("strong", "1.7.1", new Dictionary<string, string> { ["style"] = "font-size: 18px" }, new VNode[]
                {
                    new VText("Total: $", "1.7.1.1"),
                    new VText($"{(cartTotal.ToString("F2"))}", "1.7.1.2")
                })
            }),
            new VElement("button", "1.8", new Dictionary<string, string> { ["onclick"] = "handleAddToCart", ["style"] = "padding: 12px 24px; background-color: #10b981; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%" }, "Add to Cart")
        });
    }

    public void handleQuantityChange()
    {
        constnewQuantity=Math.max(1,quantity+delta);SetState(nameof(quantity), newQuantity);SetState(nameof(cartTotal), price*newQuantity);
    }

    public void handleAddToCart()
    {
        alert(`Added ${quantity} x ${productName} to cart! Total: $${cartTotal.toFixed(2)}`);
    }

    public void Handle0()
    {
        handleQuantityChange(-1);
    }

    public void Handle1()
    {
        handleQuantityChange(1);
    }

    public void Handle2()
    {
        SetState(nameof(color), e.target.value);
    }

    public void Handle3()
    {
        SetState(nameof(isExpanded), !isExpanded);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["handleQuantityChange"] = @"function () {\n  { constnewQuantity=Math.max(1,quantity+delta);setQuantity(newQuantity);setCartTotal(price*newQuantity); };\n}",
            ["handleAddToCart"] = @"function () {\n  { alert(`Added ${quantity} x ${productName} to cart! Total: $${cartTotal.toFixed(2)}`); };\n}",
            ["Handle0"] = @"function () {\n  handleQuantityChange(-1);\n}",
            ["Handle1"] = @"function () {\n  handleQuantityChange(1);\n}",
            ["Handle2"] = @"function () {\n  setColor(e.target.value);\n}",
            ["Handle3"] = @"function () {\n  setIsExpanded(!isExpanded);\n}"
        };
    }

    private void setQuantity(double value)
    {
        SetState("initialQuantity", value);
    }

    private void setColor(string value)
    {
        SetState("initialSelectedColor", value);
    }

    private void setIsExpanded(bool value)
    {
        SetState("initialIsExpanded", value);
    }
}
