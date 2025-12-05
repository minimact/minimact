using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class MultiColumn : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new Fragment(new VElement("div", "1", new Dictionary<string, string> { ["class"] = "column" }, new VNode[]
            {
                new VElement("h2", "1.1", new Dictionary<string, string>(), "Column 1"),
                new VElement("p", "1.2", new Dictionary<string, string>(), "Content 1")
            }), new VElement("div", "2", new Dictionary<string, string> { ["class"] = "column" }, new VNode[]
            {
                new VElement("h2", "2.1", new Dictionary<string, string>(), "Column 2"),
                new VElement("p", "2.2", new Dictionary<string, string>(), "Content 2")
            }), new VElement("div", "3", new Dictionary<string, string> { ["class"] = "column" }, new VNode[]
            {
                new VElement("h2", "3.1", new Dictionary<string, string>(), "Column 3"),
                new VElement("p", "3.2", new Dictionary<string, string>(), "Content 3")
            }));
    }
}
