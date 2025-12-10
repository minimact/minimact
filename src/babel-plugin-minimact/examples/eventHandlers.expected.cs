using Minimact;
using System.Collections.Generic;

[Component]
public partial class EventHandlersExample : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private string text = "";

    private void Handle0()
    {
        count = count + 1;
        SetState(nameof(count), count);
    }

    private void Handle1()
    {
        count = count - 1;
        SetState(nameof(count), count);
    }

    private void Handle2()
    {
        count = 0;
        SetState(nameof(count), count);
    }

    private void Handle3(InputEvent e)
    {
        text = e.target.value;
        SetState(nameof(text), text);
    }

    private void Handle4()
    {
        Console.WriteLine("focused");
    }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("button", "1.1", new Dictionary<string, string> { ["onclick"] = "Handle0" }, "Increment"),
            new VElement("button", "1.2", new Dictionary<string, string> { ["onclick"] = "Handle1" }, "Decrement"),
            new VElement("button", "1.3", new Dictionary<string, string> { ["onclick"] = "Handle2" }, "Reset"),
            new VElement("input", "1.4", new Dictionary<string, string>
            {
                ["value"] = $"{text}",
                ["oninput"] = "Handle3",
                ["onfocus"] = "Handle4"
            })
        });
    }
}
