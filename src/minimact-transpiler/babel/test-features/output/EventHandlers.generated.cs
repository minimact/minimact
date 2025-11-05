using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[ComplexTemplate(Path = new[] { "10000000", "40000000", "10000000" }, Template = "{0}", Bindings = new[] { "count" })]
[Component]
public partial class EventHandlersTest : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);


        return new VElement("div", new Dictionary<string, string>(), new VNode[] { new VElement("button", new Dictionary<string, string> { [""] = "" }, "Click Me"), new VElement("button", new Dictionary<string, string> { [""] = "" }, "Inline Handler"), new VElement("button", new Dictionary<string, string> { [""] = "" }, "-"), new VElement("span", new Dictionary<string, string>(), new VNode[] { new VText($"{{count}}") }), new VElement("button", new Dictionary<string, string> { [""] = "" }, "+"), new VElement("button", new Dictionary<string, string> { [""] = "" }, "Increment"), new VElement("button", new Dictionary<string, string> { [""] = "" }, "Add to Cart") });
    }

    public void Handle0()
    {
    console.log("Inline");
    }

    public void Handle1()
    {
    handleQuantityChange(-1);
    }

    public void Handle2()
    {
    handleQuantityChange(1);
    }

    public void Handle3()
    {
    setCount((count + 1));
    }

    public void Handle4()
    {
    console.log("Before");
    handleAddToCart();
    console.log("After");
    }

}
