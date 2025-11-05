using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class ConditionalRenderingTest : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);


        return new VElement("div", new Dictionary<string, string>(), new VNode[] { (isAdmin) ? new VElement("", new Dictionary<string, string>()) : null, (isLoggedIn) ? new VElement("", new Dictionary<string, string>()) : null, (hasPermission) ? new VElement("", new Dictionary<string, string>()) : null, (isAdmin) ? new VElement("", new Dictionary<string, string>()) : null, (hasPermission) ? new VElement("", new Dictionary<string, string>()) : null, (showBanner) ? new VElement("", new Dictionary<string, string>()) : null });
    }

}
