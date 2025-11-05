using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[ComplexTemplate(Path = new[] { "10000000", "10000000", "10000000" }, Template = "{0} * 2", Bindings = new[] { "count" })]
[Component]
public partial class SimpleTest : MinimactComponent
{
    [State]
    private double count = 5;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);


        return new VElement("div", new Dictionary<string, string>(), new VNode[] { new VElement("p", new Dictionary<string, string>(), new VNode[] { new VText($"{(count * 2)}") }) });
    }

}
