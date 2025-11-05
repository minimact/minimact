using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class BlockStatementHandlersTest : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);


        return new VElement("div", new Dictionary<string, string>(), new VNode[] { new VElement("button", new Dictionary<string, string> { [""] = "" }, "Multi-Statement Handler"), new VElement("button", new Dictionary<string, string> { [""] = "" }, "With Variable"), new VElement("button", new Dictionary<string, string> { [""] = "" }, "Conditional Block"), new VElement("button", new Dictionary<string, string> { [""] = "" }, "With Return"), new VElement("button", new Dictionary<string, string> { [""] = "" }, "Nested Blocks"), new VElement("button", new Dictionary<string, string> { [""] = "" }, "Complex Block") });
    }

    public void Handle0()
    {
    console.log("Clicked");
    setCount((count + 1));
    Console.WriteLine("Updated!");
    }

    public void Handle1()
    {
    var newCount = (count + 1);
    console.log("New count:", newCount);
    setCount(newCount);
    }

    public void Handle2()
    {
    console.log("Checking count...");
    if ((count < 10))
    {
    setCount((count + 1));
    console.log("Incremented");
    }
    else
    {
    Console.WriteLine("Maximum reached");
    }
    }

    public void Handle3()
    {
    if ((count == 0))
    {
    Console.WriteLine("Count is zero");
    return;
    }
    setCount((count - 1));
    console.log("Decremented");
    }

    public void Handle4()
    {
    console.log("Start");
    if ((count > 5))
    {
    console.log("High count");
    Console.WriteLine("Count is high");
    }
    else
    {
    console.log("Low count");
    setCount((count + 1));
    }
    console.log("End");
    }

    public void Handle5()
    {
    var oldCount = count;
    var newCount = (count + 1);
    console.log($"Changing from {oldCount} to {newCount}");
    setCount(newCount);
    if (((newCount % 5) == 0))
    {
    Console.WriteLine($"Milestone reached: {newCount}!");
    }
    console.log("Done");
    }

}
