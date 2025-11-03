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
[LoopTemplate("tasks", @"{""stateKey"":""tasks"",""arrayBinding"":""tasks"",""itemVar"":""task"",""indexVar"":""index"",""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Element"",""tag"":""input"",""propsTemplates"":{""type"":{""template"":""checkbox"",""bindings"":[],""slots"":[],""type"":""static""},""checked"":{""template"":""{0}"",""bindings"":[""item.completed""],""slots"":[0],""type"":""binding""}},""childrenTemplates"":null},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.title""],""slots"":[0]},{""type"":""Text"",""template"":""(Index:"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""index""],""slots"":[0]},{""type"":""Text"",""template"":"")"",""bindings"":[],""slots"":[]}]}}")]
[LoopTemplate("tasks", @"{""stateKey"":""tasks"",""arrayBinding"":""tasks"",""itemVar"":""task"",""indexVar"":""taskIndex"",""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""button"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Alert:"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.title""],""slots"":[0]}]}}")]
[LoopTemplate("tasks", @"{""stateKey"":""tasks"",""arrayBinding"":""tasks"",""itemVar"":""task"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""button"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.title""],""slots"":[0]}]}}")]
[Component]
public partial class EventHandlerEdgeCases : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private string text = "";

    [State]
    private List<dynamic> tasks = new List<object> { new { id = 1, title = "Task 1", completed = false }, new { id = 2, title = "Task 2", completed = true } };

    [State]
    private bool loading = false;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", new Dictionary<string, string>(), "Event Handler Edge Cases"),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 1: Simple Inline Arrow Function"),
                new VElement("button", new Dictionary<string, string> { ["onclick"] = "Handle0" }, new VNode[]
                {
                    new VText("Increment (Current:"),
                    new VText($"{(count)}"),
                    new VText(")")
                })
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 2: Named Function Reference"),
                new VElement("button", new Dictionary<string, string> { ["onclick"] = "handleSimpleClick" }, new VNode[]
                {
                    new VText("Named Handler (Count:"),
                    new VText($"{(count)}"),
                    new VText(")")
                })
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 3: Async Inline Handler"),
                new VElement("button", new Dictionary<string, string> { ["onclick"] = "Handle1" }, new VNode[]
                {
                    new VText("Async Increment"),
                    new VText($"{((new MObject(loading)) ? "(Loading...)" : null)}")
                }),
                new VElement("p", new Dictionary<string, string> { ["class"] = "warning" }, "⚠️ May not mark handler as async")
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 4: Async Named Handler"),
                new VElement("button", new Dictionary<string, string> { ["onclick"] = "handleAsyncClick" }, new VNode[]
                {
                    new VText("Async Named Handler"),
                    new VText($"{((new MObject(loading)) ? "(Loading...)" : null)}")
                })
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 5: Event Object Destructuring"),
                new VElement("input", new Dictionary<string, string> { ["type"] = "text", ["value"] = $"{text}", ["placeholder"] = "Type here...", ["onchange"] = "Handle2" }),
                new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Text:"),
                    new VText($"{(text)}")
                }),
                new VElement("p", new Dictionary<string, string> { ["class"] = "warning" }, "⚠️ Destructuring may not be handled")
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 6: Standard e.target.value Pattern"),
                new VElement("input", new Dictionary<string, string> { ["type"] = "text", ["value"] = $"{text}", ["placeholder"] = "Standard pattern", ["onchange"] = "Handle3" }),
                new VElement("p", new Dictionary<string, string> { ["class"] = "success" }, "✅ This pattern is optimized to: Handle0(value)")
            }),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 7: Handler with Multiple Parameters"), tasks.Select((task, index) => new VElement("div", new Dictionary<string, string> { ["key"] = $"{task.id}" }, new VNode[]
                {
                    new VElement("input", new Dictionary<string, string> { ["type"] = "checkbox", ["checked"] = $"{task.completed}", ["onchange"] = "Handle4:{task}:{index}" }),
                    new VText($"{(task.title)}"),
                    new VText("(Index:"),
                    new VText($"{(index)}"),
                    new VText(")")
                })).ToArray()),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 8: Handler with Captured Variables from .map()"), tasks.Select((task, taskIndex) => new VElement("button", new Dictionary<string, string> { ["key"] = $"{task.id}", ["onclick"] = "Handle5:{task}:{taskIndex}" }, new VNode[]
                {
                    new VText("Alert:"),
                    new VText($"{(task.title)}")
                })).ToArray(), new VElement("p", new Dictionary<string, string> { ["class"] = "success" }, "✅ Should capture task and taskIndex in event handler closure")),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 9: Event Methods (preventDefault/stopPropagation)"),
                new VElement("form", new Dictionary<string, string> { ["onsubmit"] = "Handle6" }, new VNode[]
                {
                    new VElement("input", new Dictionary<string, string> { ["type"] = "text", ["placeholder"] = "Name" }),
                    new VElement("button", new Dictionary<string, string> { ["type"] = "submit" }, "Submit")
                })
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 10: Complex Handler Body"),
                new VElement("button", new Dictionary<string, string> { ["onclick"] = "Handle7" }, "Complex Handler")
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 11: Conditional in Handler"),
                new VElement("button", new Dictionary<string, string> { ["onclick"] = "Handle8" }, new VNode[]
                {
                    new VText("Conditional Increment (Count:"),
                    new VText($"{(count)}"),
                    new VText(")")
                })
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 12: Handler Calling Multiple Functions"),
                new VElement("button", new Dictionary<string, string> { ["onclick"] = "Handle9" }, "Call Multiple Functions")
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 13: Handler with Return Statement"),
                new VElement("button", new Dictionary<string, string> { ["onclick"] = "Handle10" }, "Increment with Limit (Max 10)")
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 14: Spread Operator"),
                new VElement("button", new Dictionary<string, string> { ["onclick"] = "Handle11" }, "Add Task"),
                new VElement("p", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Total Tasks:"),
                    new VText($"{(tasks.Count)}")
                })
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 15: Optional Chaining in Handler"),
                new VElement("button", new Dictionary<string, string> { ["onclick"] = "Handle12" }, "Optional Chaining Test")
            }),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 16: Curried Handler (Double Arrow)"), tasks.Select(task => new VElement("button", new Dictionary<string, string> { ["key"] = $"{task.id}", ["onclick"] = "Handle13:{task}" }, new VNode[]
                {
                    new VText($"{(task.title)}")
                })).ToArray(), new VElement("p", new Dictionary<string, string> { ["class"] = "warning" }, "⚠️ Curried functions may not transpile correctly"))
        });
    }

    public void Handle0()
    {
        SetState(nameof(count), count + 1);
    }

    public async Task Handle1()
    {
        SetState(nameof(loading), true);
        await Task.Delay(500);
        SetState(nameof(count), count + 1);
        SetState(nameof(loading), false);
    }

    public void Handle2(dynamic e)
    {
        var value = e.Target.Value;
        SetState(nameof(text), value);
    }

    public void Handle3(dynamic value)
    {
        SetState(nameof(text), value);
    }

    public void Handle4(dynamic task, dynamic index)
    {
        handleComplexLogic(task.id);
    }

    public void Handle5(dynamic task, dynamic taskIndex)
    {
        Console.WriteLine($"Task {taskIndex + 1}: {task.title}");
    }

    public void Handle6(dynamic e)
    {
        e.preventDefault();
        Console.WriteLine("Form submitted!");
    }

    public void Handle7()
    {
        var newCount = count + 1;
        Console.WriteLine("New count:" + newCount);
        SetState(nameof(count), newCount);
        SetState(nameof(text), $"Count is now {newCount}");
    }

    public void Handle8()
    {
        if (count % 2 == 0) {
    SetState(nameof(count), count + 1);
} else {
    SetState(nameof(count), count + 2);
}
    }

    public void Handle9()
    {
        handleSimpleClick();
        SetState(nameof(text), "Button clicked!");
    }

    public void Handle10()
    {
        if (count >= 10) {
    Console.WriteLine("Count limit reached!");
    return;
}
        SetState(nameof(count), count + 1);
    }

    public void Handle11()
    {
        var newTask = new { id = tasks.Count + 1, title = $"Task {tasks.Count + 1}", completed = false };
        SetState(nameof(tasks), ((IEnumerable<object>)tasks).Concat(new List<object> { newTask }).ToList());
    }

    public void Handle12(dynamic e)
    {
        var value = (e.Target.Value?.ToString()) ?? ("No value");
        SetState(nameof(text), value);
    }

    public void Handle13(dynamic e, dynamic task)
    {
        id => handleComplexLogic(id);
    }

    private void handleSimpleClick()
    {
SetState(nameof(count), count + 1);
    }

    private async Task handleAsyncClick()
    {
SetState(nameof(loading), true);
await Task.Delay(1000);
SetState(nameof(count), count + 1);
SetState(nameof(loading), false);
    }

    private void handleComplexLogic(double taskId)
    {
var updatedTasks = tasks.Select(task => (task.id == taskId) ? new { completed = !task.completed } : task).ToList();
SetState(nameof(tasks), updatedTasks);
    }
}

}
