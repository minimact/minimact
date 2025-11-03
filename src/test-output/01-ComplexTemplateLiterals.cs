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
[Component]
public partial class ComplexTemplateLiterals : MinimactComponent
{
    [State]
    private double price = 99.99;

    [State]
    private int quantity = 2;

    [State]
    private double discount = 0.15;

    [State]
    private dynamic product = new { name = "Widget", price = 49.99, quantity = 5, discount = 0.1 };

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var totalSimple = $"${(price * quantity).ToString("F2")}";
        var totalComplex = $"Price: ${price.ToString("F2")} x {quantity} = ${(price * quantity).ToString("F2")}";
        var withDiscount = $"Original: ${(price * quantity).ToString("F2")}, After {(discount * 100).ToString("F0")}% off: ${(price * quantity * 1 - discount).ToString("F2")}";
        var status = $"Status: {((quantity > 0) ? "In Stock" : "Out of Stock")} - {quantity} available";
        var productInfo = $"{product.name} - ${product.price.ToString("F2")} each";
        var summary = $"Total: {$"${(price * quantity).ToString("F2")}"}";
        var formatted = $"Product: {product.name.ToUpper()} at ${product.price.ToString("F2")}";

        return new VElement("div", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", new Dictionary<string, string>(), "Complex Template Literal Tests"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 1: Simple .toFixed()"),
                new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(totalSimple)}")
                }),
                new VElement("p", new Dictionary<string, string>(), "Expected: $199.98")
            }),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 2: Multiple .toFixed()"),
                new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(totalComplex)}")
                }),
                new VElement("p", new Dictionary<string, string>(), "Expected: Price: $99.99 x 2 = $199.98")
            }),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 3: Nested Calculations"),
                new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(withDiscount)}")
                }),
                new VElement("p", new Dictionary<string, string>(), "Expected: Original: $199.98, After 15% off: $169.98")
            }),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 4: Conditional in Template"),
                new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(status)}")
                }),
                new VElement("p", new Dictionary<string, string>(), "Expected: Status: In Stock - 2 available")
            }),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 5: Object Property"),
                new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(productInfo)}")
                }),
                new VElement("p", new Dictionary<string, string>(), "Expected: Widget - $49.99 each")
            }),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 6: Nested Template"),
                new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(summary)}")
                }),
                new VElement("p", new Dictionary<string, string>(), "Expected: Total: $199.98")
            }),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 7: Method Chaining"),
                new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(formatted)}")
                }),
                new VElement("p", new Dictionary<string, string>(), "Expected: Product: WIDGET at $49.99")
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "inline-tests" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Inline Template Literals in JSX"),
                new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Total:"),
                    new VText($"{($"${(price * quantity).ToString("F2")}")}")
                }),
                new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Per Item:"),
                    new VText($"{($"${price.ToString("F2")}")}")
                }),
                new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Discount:"),
                    new VText($"{($"{(discount * 100).ToString("F0")}%")}")
                })
            })
        });
    }
}

}
