using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[ComplexTemplate(Path = new[] { "10000000", "10000000", "10000000" }, Template = "{0}", Bindings = new[] { "productName" })]
[ComplexTemplate(Path = new[] { "10000000", "40000000", "10000000" }, Template = "{0}", Bindings = new[] { "showDebugInfo" })]
[ComplexTemplate(Path = new[] { "10000000", "50000000", "20000000", "20000000" }, Template = "{0}", Bindings = new[] { "viewModel.userEmail?" })]
[ComplexTemplate(Path = new[] { "10000000", "60000000", "20000000", "20000000", "10000000" }, Template = "{0}", Bindings = new[] { "quantity" })]
[ComplexTemplate(Path = new[] { "10000000", "90000000", "10000000", "10000000" }, Template = "{0}", Bindings = new[] { "isExpanded" })]
[Component]
public partial class ProductDetailsPageTwo : MinimactComponent
{
    [State]
    private decimal cartTotal = 0;

    [State]
    private bool showDebugInfo = false;

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

    // useMvcViewModel - read-only access to entire ViewModel
    private dynamic viewModel = null;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var productName = GetState<string>("productName");
        var price = GetState<double>("price");
        var isAdmin = GetState<bool>("isAdminRole");
        var quantity = GetState<double>("initialQuantity");
        var color = GetState<string>("initialSelectedColor");
        var isExpanded = GetState<bool>("initialIsExpanded");

        return new VElement("div", new Dictionary<string, string> { ["style"] = "padding: 20px; font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto" }, new VNode[] { new VElement("h1", new Dictionary<string, string>(), new VNode[] { new VText($"{productName}950040830") }), (<complex>) ? new VElement("div", new Dictionary<string, string> { ["style"] = "padding: 12px; background-color: #fee2e2; border: 1px solid #ef4444; border-radius: 4px; margin-bottom: 16px" }, new VNode[] { new VElement("strong", new Dictionary<string, string>(), "FALSE CONDITIONAL:"), new VText("This should NEVER appear in DOM!") }) : null, (showDebugInfo) ? new VElement("div", new Dictionary<string, string> { ["style"] = "padding: 12px; background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 4px; margin-bottom: 16px" }, new VNode[] { new VElement("strong", new Dictionary<string, string>(), "Debug Info:"), new VText($"Product:{productName}, Price: $, Qty:{quantity}"), new VElement("button", new Dictionary<string, string> { ["onclick"] = "", ["style"] = "margin-left: 12px; padding: 4px 8px; font-size: 12px" }, "Hide") }) : null, new VElement("button", new Dictionary<string, string> { ["onclick"] = "", ["style"] = "margin-bottom: 16px; padding: 8px 12px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px" }, new VNode[] { (true) ? null : null, new VText("Debug Info") }), new VElement("div", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px" }, new VNode[] { new VElement("div", new Dictionary<string, string> { ["style"] = "font-size: 32px; font-weight: bold; color: #2563eb" }, new VNode[] { new VText($"$") }), new VElement("div", new Dictionary<string, string> { ["style"] = "color: #6b7280; font-size: 14px" }, new VNode[] { new VText($"Logged in as:<complex>") }) }), new VElement("div", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px" }, new VNode[] { new VElement("label", new Dictionary<string, string> { ["style"] = "display: block; margin-bottom: 890px; font-weight: 500" }, "Quantity112:"), new VElement("div", new Dictionary<string, string> { ["style"] = "display: flex; gap: 10px; align-items: center" }, new VNode[] { new VElement("button", new Dictionary<string, string> { ["onclick"] = "", ["style"] = "padding: 8px 16px; background-color: #e5e7eb; border: none; border-radius: 4px; cursor: pointer" }, "-"), new VElement("span", new Dictionary<string, string> { ["style"] = "font-size: 20px; font-weight: bold; min-width: 40px; text-align: center" }, new VNode[] { new VText($"{{quantity}}") }), new VElement("button", new Dictionary<string, string> { ["onclick"] = "", ["style"] = "padding: 8px 16px; background-color: #e5e7eb; border: none; border-radius: 4px; cursor: pointer" }, "+") }) }), new VElement("div", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px" }, new VNode[] { new VElement("label", new Dictionary<string, string> { ["style"] = "display: block; margin-bottom: 8px; font-weight: 500" }, "Color:"), new VElement("select", new Dictionary<string, string> { ["value"] = $"{color}", ["onchange"] = "", ["style"] = "padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px" }, new VNode[] { new VElement("option", new Dictionary<string, string> { ["value"] = "Black" }, "Black"), new VElement("option", new Dictionary<string, string> { ["value"] = "White" }, "White"), new VElement("option", new Dictionary<string, string> { ["value"] = "Red" }, "Red"), new VElement("option", new Dictionary<string, string> { ["value"] = "Blue" }, "Blue") }) }), (isAdmin) ? new VElement("div", new Dictionary<string, string> { ["style"] = "padding: 16px; background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; margin-bottom: 20px" }, new VNode[] { new VElement("h3", new Dictionary<string, string> { ["style"] = "margin-top: 0" }, "Admin Controls"), new VElement("button", new Dictionary<string, string> { ["style"] = "padding: 8px 16px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px" }, "Edit Product"), new VElement("button", new Dictionary<string, string> { ["style"] = "padding: 8px 16px; background-color: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer" }, "Delete Product") }) : null, new VElement("div", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px" }, new VNode[] { new VElement("button", new Dictionary<string, string> { ["onclick"] = "", ["style"] = "padding: 8px 16px; background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer" }, new VNode[] { (true) ? null : null, new VText("Details") }), (isExpanded) ? new VElement("div", new Dictionary<string, string> { ["style"] = "margin-top: 12px; padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px" }, new VNode[] { new VElement("h3", new Dictionary<string, string>(), "Product Specifications"), new VElement("p", new Dictionary<string, string>(), "This is where detailed product information would go.") }) : null }), new VElement("div", new Dictionary<string, string> { ["style"] = "padding: 16px; background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; margin-bottom: 20px" }, new VNode[] { new VElement("strong", new Dictionary<string, string> { ["style"] = "font-size: 18px" }, new VNode[] { new VText($"Total: $") }) }), new VElement("button", new Dictionary<string, string> { ["onclick"] = "", ["style"] = "padding: 12px 24px; background-color: #10b981; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%" }, "Add to Cart") });
    }

    public void Handle0()
    {
    setShowDebugInfo(false);
    }

    public void Handle1()
    {
    setShowDebugInfo(!showDebugInfo);
    }

    public void Handle2()
    {
    handleQuantityChange(-1);
    }

    public void Handle3()
    {
    handleQuantityChange(1);
    }

    public void Handle4(dynamic value)
    {
    setColor(value);
    }

    public void Handle5()
    {
    setIsExpanded(!isExpanded);
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
