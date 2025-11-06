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
public partial class TestEmpty : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("span", "1.1", new Dictionary<string, string>(), "A"),
            new VText($"{(new VNull(""))}", "1.2"),
            new VElement("span", "1.3", new Dictionary<string, string>(), "B"),
            new VText($"{(undefined)}", "1.4"),
            new VElement("span", "1.5", new Dictionary<string, string>(), "C")
        });
    }
}

}
