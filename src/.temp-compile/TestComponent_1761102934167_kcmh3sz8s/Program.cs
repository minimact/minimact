using Minimact.AspNetCore.Core;
using Newtonsoft.Json;
using System;

using Minimact.AspNetCore.Core;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class ShoppingCart : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new Dictionary<string, string> { ["className"] = "cart" });
    }
}



class Program
{
    static void Main()
    {
        try
        {
            var component = new ShoppingCart();
            var vnode = component.RenderComponent();
            var json = JsonConvert.SerializeObject(vnode, Formatting.None);
            Console.WriteLine(json);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error: {ex.Message}");
            Environment.Exit(1);
        }
    }
}