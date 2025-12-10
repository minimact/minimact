using Minimact;
using System.Collections.Generic;

// Generated hook class
[Hook]
public class UseCounterHook : MinimactComponent
{
    private int initial;

    [State]
    private int count;

    public UseCounterHook(int initial)
    {
        this.initial = initial;
        this.count = initial;
    }

    public int Count => count;

    public void increment()
    {
        count = count + 1;
        SetState(nameof(count), count);
    }

    public void decrement()
    {
        count = count - 1;
        SetState(nameof(count), count);
    }

    public void reset()
    {
        count = initial;
        SetState(nameof(count), count);
    }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "counter" }, new VNode[]
        {
            new VElement("span", "1.1", new Dictionary<string, string>(), new VText($"{count}", "1.1.1")),
            new VElement("button", "1.2", new Dictionary<string, string> { ["onclick"] = "increment" }, "+"),
            new VElement("button", "1.3", new Dictionary<string, string> { ["onclick"] = "decrement" }, "-"),
            new VElement("button", "1.4", new Dictionary<string, string> { ["onclick"] = "reset" }, "Reset")
        });
    }
}

// Component using the hook
[Component]
public partial class CustomHookExample : MinimactComponent
{
    private UseCounterHook counter1;
    private UseCounterHook counter2;

    public CustomHookExample()
    {
        counter1 = new UseCounterHook(0);
        counter2 = new UseCounterHook(10);
    }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), new VText($"Counter 1: {counter1.Count}", "1.1.1")),
            counter1.Render(),
            new VElement("h1", "1.2", new Dictionary<string, string>(), new VText($"Counter 2: {counter2.Count}", "1.2.1")),
            counter2.Render()
        });
    }
}
