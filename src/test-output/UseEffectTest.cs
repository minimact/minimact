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
public partial class UseEffectTest : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private string message = "";

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), $"Count:{(count)}"),
            new VElement("p", "1.2", new Dictionary<string, string>(), $"Message:{(message)}")
        });
    }

    [OnStateChanged("count")]
    private void Effect_0()
    {
        Console.WriteLine("Count changed to: " + count);
    }

    [OnStateChanged("message")]
    private void Effect_1()
    {
        Console.WriteLine("Message updated: " + message);
    }

    /// <summary>
    /// Returns JavaScript callbacks for useEffect hooks
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, EffectDefinition> GetClientEffects()
    {
        return new Dictionary<string, EffectDefinition>
        {
            ["Effect_0"] = new EffectDefinition
            {
                Callback = @"function () {\n  console.log('Count changed to: ' + count);\n}",
                Dependencies = new[] { "count" }
            },
            ["Effect_1"] = new EffectDefinition
            {
                Callback = @"function () {\n  console.log('Message updated: ' + message);\n}",
                Dependencies = new[] { "message" }
            }
        };
    }
}

}
