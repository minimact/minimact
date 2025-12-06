using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class UserProfile : MinimactComponent
{
    [Prop]
    public dynamic user { get; set; }

    [Prop]
    public dynamic loading { get; set; }

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "profile" }, new VNode[]
        {
            new VText($"{(loading?(<divclassName="spinner">Loading...</div>):(<divclassName="user-info"><h1>{user.name}</h1><p>{user.email}</p>{user.isAdmin&&<spanclassName="badge">Admin</span>}</div>))}", "1.1")
        });
    }
}
