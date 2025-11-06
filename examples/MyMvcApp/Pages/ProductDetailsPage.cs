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
    private decimal cartTotal = 0;

    [State]
    private bool showDebugInfo = false;

    // MVC State property: productName
    private string productName => GetState<string>("productName");

    // MVC State property: price
    private decimal price => GetState<decimal>("price");

    // MVC State property: isAdminRole
    private bool isAdmin => GetState<bool>("isAdminRole");

    // MVC State property: initialQuantity
    private int quantity => GetState<int>("initialQuantity");

    // MVC State property: initialSelectedColor
    private string color => GetState<string>("initialSelectedColor");

    // MVC State property: initialIsExpanded
    private bool isExpanded => GetState<bool>("initialIsExpanded");

    // useMvcViewModel - read-only access to entire ViewModel
    private dynamic viewModel = null;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // MVC State - read from State dictionary
        var productName = GetState<string>("productName");
        var price = GetState<decimal>("price");
        var isAdmin = GetState<bool>("isAdminRole");
        var quantity = GetState<int>("initialQuantity");
        var color = GetState<string>("initialSelectedColor");
        var isExpanded = GetState<bool>("initialIsExpanded");

        return MinimactHelpers.createElement("div", new { style = "padding: 20px; font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto" }, new VElement("h1", "1.1", new Dictionary<string, string>(), $"{(productName)}950040830"), new VNull(""), (false) ? new VElement("div", "1.3.1", new Dictionary<string, string> { ["style"] = "padding: 12px; background-color: #fee2e2; border: 1px solid #ef4444; border-radius: 4px; margin-bottom: 16px" }, new VNode[]
            {
                new VElement("strong", "1.3.1.1", new Dictionary<string, string>(), "FALSE CONDITIONAL:"),
                new VText("This should NEVER appear in DOM!", "1.3.1.2")
            }) : new VNull("1.3"), new VNull(""), (new MObject(showDebugInfo)) ? new VElement("div", "1.5.1", new Dictionary<string, string> { ["style"] = "padding: 12px; background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 4px; margin-bottom: 16px" }, new VNode[]
            {
                new VElement("strong", "1.5.1.1", new Dictionary<string, string>(), "Debug Info:"),
                new VText($"Product:{(productName)}, Price: ${(price.ToString("F2"))}, Qty:{(quantity)}", ""),
                new VElement("button", "1.5.1.8", new Dictionary<string, string> { ["style"] = "margin-left: 12px; padding: 4px 8px; font-size: 12px", ["onclick"] = "Handle2" }, "Hide")
            }) : new VNull("1.5"), new VNull(""), new VElement("button", "1.7", new Dictionary<string, string> { ["style"] = "margin-bottom: 16px; padding: 8px 12px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px", ["onclick"] = "Handle3" }, $"{((new MObject(showDebugInfo)) ? "Hide" : "Show")}Debug Info"), new VElement("div", "1.8", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px" }, new VNode[]
            {
                new VElement("div", "1.8.1", new Dictionary<string, string> { ["style"] = "font-size: 32px; font-weight: bold; color: #2563eb" }, $"${(price.ToString("F2"))}"),
                new VElement("div", "1.8.2", new Dictionary<string, string> { ["style"] = "color: #6b7280; font-size: 14px" }, $"Logged in as:{(viewModel?.UserEmail)}")
            }), new VNull(""), new VElement("div", "1.a", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px" }, new VNode[]
            {
                new VElement("label", "1.a.1", new Dictionary<string, string> { ["style"] = "display: block; margin-bottom: 819px; font-weight: 500" }, "Quantity112:"),
                new VElement("div", "1.a.2", new Dictionary<string, string> { ["style"] = "display: flex; gap: 10px; align-items: center" }, new VNode[]
                {
                    new VElement("button", "1.a.2.1", new Dictionary<string, string> { ["style"] = "padding: 8px 16px; background-color: #e5e7eb; border: none; border-radius: 4px; cursor: pointer", ["onclick"] = "Handle4" }, "-"),
                    new VElement("span", "1.a.2.2", new Dictionary<string, string> { ["style"] = "font-size: 20px; font-weight: bold; min-width: 40px; text-align: center" }, new VNode[]
                    {
                        new VText($"{(quantity)}", "1.a.2.2.1")
                    }),
                    new VElement("button", "1.a.2.3", new Dictionary<string, string> { ["style"] = "padding: 8px 16px; background-color: #e5e7eb; border: none; border-radius: 4px; cursor: pointer", ["onclick"] = "Handle5" }, "+")
                })
            }), new VNull(""), new VElement("div", "1.c", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px" }, new VNode[]
            {
                new VElement("label", "1.c.1", new Dictionary<string, string> { ["style"] = "display: block; margin-bottom: 8px; font-weight: 500" }, "Color:"),
                new VElement("select", "1.c.2", new Dictionary<string, string> { ["value"] = $"{color}", ["style"] = "padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px", ["onchange"] = "Handle6" }, new VNode[]
                {
                    new VElement("option", "1.c.2.1", new Dictionary<string, string> { ["value"] = "Black" }, "Black"),
                    new VElement("option", "1.c.2.2", new Dictionary<string, string> { ["value"] = "White" }, "White"),
                    new VElement("option", "1.c.2.3", new Dictionary<string, string> { ["value"] = "Red" }, "Red"),
                    new VElement("option", "1.c.2.4", new Dictionary<string, string> { ["value"] = "Blue" }, "Blue")
                })
            }), new VNull(""), (new MObject(isAdmin)) ? new VElement("div", "1.e.1", new Dictionary<string, string> { ["style"] = "padding: 16px; background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; margin-bottom: 20px" }, new VNode[]
            {
                new VElement("h3", "1.e.1.1", new Dictionary<string, string> { ["style"] = "margin-top: 0px" }, "Admin Controls"),
                new VElement("button", "1.e.1.2", new Dictionary<string, string> { ["style"] = "padding: 8px 16px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px" }, "Edit Product"),
                new VElement("button", "1.e.1.3", new Dictionary<string, string> { ["style"] = "padding: 8px 16px; background-color: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer" }, "Delete Product")
            }) : new VNull("1.e"), new VNull(""), MinimactHelpers.createElement("div", new { style = "margin-bottom: 20px" }, new VElement("button", "1.1.3", new Dictionary<string, string> { ["style"] = "padding: 8px 16px; background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer", ["onclick"] = "Handle7" }, $"{((new MObject(isExpanded)) ? "Hide" : "Show")}Details"), (new MObject(isExpanded)) ? new VElement("div", "1.1.4.1", new Dictionary<string, string> { ["style"] = "margin-top: 12px; padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px" }, new VNode[]
                {
                    new VElement("h3", "1.1.4.1.1", new Dictionary<string, string>(), "Product Specifications"),
                    new VElement("p", "1.1.4.1.2", new Dictionary<string, string>(), "This is where detailed product information would go.")
                }) : new VNull("1.1.4")), new VNull(""), new VElement("div", "1.12", new Dictionary<string, string> { ["style"] = "padding: 16px; background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; margin-bottom: 20px" }, new VNode[]
            {
                new VElement("strong", "1.12.1", new Dictionary<string, string> { ["style"] = "font-size: 18px" }, $"Total: ${(cartTotal.ToString("F2"))}")
            }), new VNull(""), new VElement("button", "1.14", new Dictionary<string, string> { ["style"] = "padding: 12px 24px; background-color: #10b981; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%", ["onclick"] = "handleAddToCart" }, "Add to Cart"));
    }

    public void handleQuantityChange(dynamic delta)
    {
        var newQuantity = Math.Max(1, quantity + delta);
        setQuantity(newQuantity);
        SetState(nameof(cartTotal), price * newQuantity);
    }

    public void handleAddToCart()
    {
        Console.WriteLine($"Added {quantity} x {productName} to cart! Total: ${cartTotal.ToString("F2")}");
    }

    public void Handle2()
    {
        SetState(nameof(showDebugInfo), false);
    }

    public void Handle3()
    {
        SetState(nameof(showDebugInfo), !showDebugInfo);
    }

    public void Handle4()
    {
        handleQuantityChange(-1);
    }

    public void Handle5()
    {
        handleQuantityChange(1);
    }

    public void Handle6(dynamic value)
    {
        setColor(value);
    }

    public void Handle7()
    {
        setIsExpanded(!isExpanded);
    }

    private void setQuantity(int value)
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
