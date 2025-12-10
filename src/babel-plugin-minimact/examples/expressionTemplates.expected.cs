using Minimact;
using System.Collections.Generic;

[Component]
public partial class ExpressionTemplatesExample : MinimactComponent
{
    [State]
    private double price = 19.99;

    [State]
    private int quantity = 3;

    [State]
    private string name = "Widget";

    [State]
    private double discount = 0.1;

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("span", "1.1", new Dictionary<string, string>(), new VText($"${price.ToString("F2")}", "1.1.1")),
            new VElement("span", "1.2", new Dictionary<string, string>(), new VText($"Total: {price * quantity}", "1.2.1")),
            new VElement("span", "1.3", new Dictionary<string, string>(), new VText($"{name.ToUpper()}", "1.3.1")),
            new VElement("span", "1.4", new Dictionary<string, string>(), new VText($"{name.ToLower().Trim()}", "1.4.1")),
            new VElement("span", "1.5", new Dictionary<string, string>(), new VText($"Final: ${(price * quantity * (1 - discount)).ToString("F2")}", "1.5.1")),
            new VElement("span", "1.6", new Dictionary<string, string>(), new VText($"Has discount: {(!MinimactHelpers.ToBool(discount) ? "No" : "Yes")}", "1.6.1"))
        });
    }
}

// Expression templates extracted:
// [
//   { path: "1.1.1", binding: "price", transform: "toFixed", args: [2] },
//   { path: "1.2.1", bindings: ["price", "quantity"], operator: "*" },
//   { path: "1.3.1", binding: "name", transform: "toUpperCase" },
//   { path: "1.4.1", binding: "name", transforms: ["toLowerCase", "trim"] },
//   { path: "1.5.1", bindings: ["price", "quantity", "discount"], type: "complex" },
//   { path: "1.6.1", binding: "discount", operator: "!" }
// ]
