using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[ComplexTemplate(Path = new[] { "10000000", "10000000", "10000000" }, Template = "{0}", Bindings = new[] { "productName" })]
[ComplexTemplate(Path = new[] { "10000000", "20000000", "20000000", "20000000" }, Template = "{0}", Bindings = new[] { "viewModel.userEmail?" })]
[ComplexTemplate(Path = new[] { "10000000", "30000000", "20000000", "20000000", "10000000" }, Template = "{0}", Bindings = new[] { "quantity" })]
[ComplexTemplate(Path = new[] { "10000000", "60000000", "10000000", "10000000" }, Template = "{0}", Bindings = new[] { "isExpanded" })]
[Component]
public partial class ProductDetailsPage : MinimactComponent
{
    [State]
    private decimal cartTotal = 0;

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

        return new VElement("div", new Dictionary<string, string> { ["style"] = "padding: 20px; font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto" }, new VNode[] { new VElement("h1", new Dictionary<string, string>(), new VNode[] { new VText($"{productName}950040830") }), new VElement("div", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px" }, new VNode[] { new VElement("div", new Dictionary<string, string> { ["style"] = "font-size: 32px; font-weight: bold; color: #2563eb" }, new VNode[] { new VText($"$") }), new VElement("div", new Dictionary<string, string> { ["style"] = "color: #6b7280; font-size: 14px" }, new VNode[] { new VText($"Logged in as:<complex>") }) }), new VElement("div", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px" }, new VNode[] { new VElement("label", new Dictionary<string, string> { ["style"] = "display: block; margin-bottom: 8px; font-weight: 500" }, "Quantity11:"), new VElement("div", new Dictionary<string, string> { ["style"] = "display: flex; gap: 10px; align-items: center" }, new VNode[] { new VElement("button", new Dictionary<string, string> { ["onclick"] = "", ["style"] = "padding: 8px 16px; background-color: #e5e7eb; border: none; border-radius: 4px; cursor: pointer" }, "-"), new VElement("span", new Dictionary<string, string> { ["style"] = "font-size: 20px; font-weight: bold; min-width: 40px; text-align: center" }, new VNode[] { new VText($"{{quantity}}") }), new VElement("button", new Dictionary<string, string> { ["onclick"] = "", ["style"] = "padding: 8px 16px; background-color: #e5e7eb; border: none; border-radius: 4px; cursor: pointer" }, "+") }) }), new VElement("div", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px" }, new VNode[] { new VElement("label", new Dictionary<string, string> { ["style"] = "display: block; margin-bottom: 8px; font-weight: 500" }, "Color:"), new VElement("select", new Dictionary<string, string> { ["value"] = $"{color}", ["onchange"] = "", ["style"] = "padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px" }, new VNode[] { new VElement("option", new Dictionary<string, string> { ["value"] = "Black" }, "Black"), new VElement("option", new Dictionary<string, string> { ["value"] = "White" }, "White"), new VElement("option", new Dictionary<string, string> { ["value"] = "Red" }, "Red"), new VElement("option", new Dictionary<string, string> { ["value"] = "Blue" }, "Blue") }) }), (isAdmin) ? new VElement("", new Dictionary<string, string>()) : null, new VElement("div", new Dictionary<string, string> { ["style"] = "margin-bottom: 20px" }, new VNode[] { new VElement("button", new Dictionary<string, string> { ["onclick"] = "", ["style"] = "padding: 8px 16px; background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer" }, new VNode[] { (true) ? null : null, new VText("Details") }), (isExpanded) ? new VElement("", new Dictionary<string, string>()) : null }), new VElement("div", new Dictionary<string, string> { ["style"] = "padding: 16px; background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; margin-bottom: 20px" }, new VNode[] { new VElement("strong", new Dictionary<string, string> { ["style"] = "font-size: 18px" }, new VNode[] { new VText($"Total: $") }) }), new VElement("button", new Dictionary<string, string> { ["onclick"] = "", ["style"] = "padding: 12px 24px; background-color: #10b981; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%" }, "Add to Cart") });
    }

    public void Handle0()
    {
    handleQuantityChange(-1);
    }

    public void Handle1()
    {
    handleQuantityChange(1);
    }

    public void Handle2(dynamic value)
    {
    setColor(value);
    }

    public void Handle3()
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
