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


        return new VElement("div", new Dictionary<string, string>(), new VNode[] { categories.Select(category => new VElement("div", new Dictionary<string, string> { ["key"] = $"{category.id}" }, new VNode[] { new VElement("h4", new Dictionary<string, string>(), new VNode[] { new VText($"{{category.name}}") }), new VElement("ul", new Dictionary<string, string>(), new VNode[] { category.items.Select(item => new VElement("li", new Dictionary<string, string> { ["key"] = $"{item.id}" }, new VNode[] { new VText($"{item.name}- ${item.price}") })).ToArray() }) })).ToArray(), categories.Select(category => new VElement("div", new Dictionary<string, string> { ["key"] = $"{category.id}", ["style"] = "margin-bottom: 20px" }, new VNode[] { new VElement("h3", new Dictionary<string, string>(), new VNode[] { new VText($"{{category.name}}") }), new VElement("div", new Dictionary<string, string>(), new VNode[] { category.items.Select(item => new VElement("div", new Dictionary<string, string> { ["key"] = $"{item.id}", ["style"] = "padding: 5px; border: 1px solid #ccc" }, new VNode[] { new VElement("strong", new Dictionary<string, string>(), new VNode[] { new VText($"{{item.name}}") }), new VElement("span", new Dictionary<string, string>(), new VNode[] { new VText($"- $") }) })).ToArray() }) })).ToArray() });
    }

}
