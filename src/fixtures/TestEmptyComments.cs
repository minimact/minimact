using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class TestEmptyComments : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("span", "1.1", new Dictionary<string, string>(), "A"),
            new VElement("span", "1.2", new Dictionary<string, string>(), "B"),
            new VElement("span", "1.3", new Dictionary<string, string>(), "C")
        });
    }
}
