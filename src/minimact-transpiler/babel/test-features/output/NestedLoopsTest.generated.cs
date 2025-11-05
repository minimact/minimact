using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class NestedLoopsTest : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);


        return new VElement("div", new Dictionary<string, string>(), new VNode[] { new VText($"{}{}") });
    }

}
