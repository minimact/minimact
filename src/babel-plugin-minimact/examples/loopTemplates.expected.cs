using Minimact;
using System.Collections.Generic;

[Component]
[LoopTemplate("todos", @"{""stateKey"":""todos"",""itemVar"":""todo"",""keyBinding"":""todo.id""}")]
public partial class LoopTemplatesExample : MinimactComponent
{
    [State]
    private List<Todo> todos = new List<Todo>();

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), "Todo List"),
            new VElement("ul", "1.2", new Dictionary<string, string>(),
                todos.Select(todo => new VElement("li", "1.2.1", new Dictionary<string, string>
                {
                    ["key"] = $"{todo.id}",
                    ["class"] = $"{(todo.completed ? "done" : "")}"
                }, new VText($"{todo.text}", "1.2.1.1"))).ToArray())
        });
    }
}
