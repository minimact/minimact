using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[ComplexTemplate(Path = new[] { "10000000", "10000000", "20000000" }, Template = "Total: ${0}", Bindings = new[] { "price" })]
[ComplexTemplate(Path = new[] { "10000000", "20000000", "10000000" }, Template = "Product: {0} at ${1}", Bindings = new[] { "productName", "__expr__:price,quantity" })]
[ComplexTemplate(Path = new[] { "10000000", "30000000", "10000000" }, Template = "After {0}% off: ${1}", Bindings = new[] { "__expr__:discount", "__expr__:price,quantity,discount" })]
[ComplexTemplate(Path = new[] { "10000000", "40000000", "10000000" }, Template = "Order: {0} x {1} = ${2} (discount: {3}%)", Bindings = new[] { "quantity", "productName", "__expr__:price,quantity", "__expr__:discount" })]
[ComplexTemplate(Path = new[] { "10000000", "50000000", "10000000" }, Template = "Status: {0}", Bindings = new[] { "discount > <complex>" })]
[Component]
public partial class NestedTemplatesTest : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);


        return new VElement("div", new Dictionary<string, string>(), new VNode[] { new VElement("p", new Dictionary<string, string>(), new VNode[] { new VText($"Summary:Total: ${price}") }), new VElement("p", new Dictionary<string, string>(), new VNode[] { new VText($"{Product: {productName} at ${__expr__:price,quantity}}") }), new VElement("p", new Dictionary<string, string>(), new VNode[] { new VText($"{After {__expr__:discount}% off: ${__expr__:price,quantity,discount}}") }), new VElement("p", new Dictionary<string, string>(), new VNode[] { new VText($"{Order: {quantity} x {productName} = ${__expr__:price,quantity} (discount: {__expr__:discount}%)}") }), new VElement("p", new Dictionary<string, string>(), new VNode[] { new VText($"{Status: {discount > <complex>}}") }) });
    }

}
