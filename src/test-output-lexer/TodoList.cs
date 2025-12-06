using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":""item.id"",""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Element"",""tag"":""input"",""propsTemplates"":{""type"":{""template"":""checkbox"",""bindings"":[],""slots"":[],""type"":""static""},""checked"":{""template"":""{0}"",""bindings"":[""item.completed""],""slots"":[0],""type"":""binding""}},""childrenTemplates"":null},{""type"":""Element"",""tag"":""span"",""propsTemplates"":{""class"":{""template"":""{0}"",""bindings"":[""item.completed?'completed':''""],""slots"":[0],""type"":""binding""}},""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]}]},{""type"":""Element"",""tag"":""button"",""propsTemplates"":{""onclick"":{""template"":""Handle0:{todo}"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""Delete"",""bindings"":[],""slots"":[]}]}]}}")]
[Component]
public partial class TodoList : MinimactComponent
{
    [Prop]
    public List<dynamic> todos { get; set; }

    [Prop]
    public dynamic deleteTodo { get; set; }

    [Prop]
    public dynamic addTodo { get; set; }

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "todo-list" }, new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), "My Todos"),
            MinimactHelpers.createElement("ul", null, todos.Select(todo => new VElement("li", "1.2.1.1", new Dictionary<string, string> { ["key"] = $"{(todo.id)}" }, new VNode[]
            {
                new VElement("input", "1.2.1.1.1", new Dictionary<string, string> { ["type"] = "checkbox", ["checked"] = $"{(todo.completed)}" }),
                new VElement("span", "1.2.1.1.2", new Dictionary<string, string> { ["class"] = $"{(todo.completed?"completed":"")}" }, new VNode[]
                {
                    new VText($"{(todo.text)}", "1.2.1.1.2.1")
                }),
                new VElement("button", "1.2.1.1.3", new Dictionary<string, string> { ["onclick"] = "Handle0:{todo}" }, "Delete")
            })).ToArray()),
            new VElement("button", "1.3", new Dictionary<string, string> { ["onclick"] = "addTodo" }, "Add Todo")
        });
    }

    public void Handle0(dynamic todo)
    {
        deleteTodo(todo.id);
    }

    public void Handle1(dynamic todo)
    {
        deleteTodo(todo.id);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function () {\n  deleteTodo(todo.id);\n}",
            ["Handle1"] = @"function () {\n  deleteTodo(todo.id);\n}"
        };
    }
}
