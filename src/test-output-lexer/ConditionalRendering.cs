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
            (loading) ? new VElement("div", "1.1.1", new Dictionary<string, string> { ["class"] = "spinner" }, "Loading...") : new VElement("div", "1.1.2", new Dictionary<string, string> { ["class"] = "user-info" }, new VNode[]
            {
                new VElement("h1", "1.1.2.1", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(user.name)}", "1.1.2.1.1")
                }),
                new VElement("p", "1.1.2.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(user.email)}", "1.1.2.2.1")
                }),
                (user.isAdmin) ? new VElement("span", "1.1.2.3.1", new Dictionary<string, string> { ["class"] = "badge" }, "Admin") : new VNull("1.1.2.3")
            })
        });
    }
}
