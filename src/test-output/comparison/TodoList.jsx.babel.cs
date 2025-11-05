[33m   1[0m using Minimact.AspNetCore.Core;
[33m   2[0m using Minimact.AspNetCore.Extensions;
[33m   3[0m using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
[33m   4[0m using System.Collections.Generic;
[33m   5[0m using System.Linq;
[33m   6[0m using System.Threading.Tasks;
[33m   7[0m 
[33m   8[0m namespace Minimact.Components;
[33m   9[0m 
[33m  10[0m [LoopTemplate("todos", @"{""stateKey"":""todos"",""arrayBinding"":""todos"",""itemVar"":""todo"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Element"",""tag"":""input"",""propsTemplates"":{""type"":{""template"":""checkbox"",""bindings"":[],""slots"":[],""type"":""static""},""checked"":{""template"":""{0}"",""bindings"":[""item.completed""],""slots"":[0],""type"":""binding""}},""childrenTemplates"":null},{""type"":""Element"",""tag"":""span"",""propsTemplates"":{""className"":{""template"":""{0}"",""bindings"":[""item.completed""],""slots"":[0],""conditionalTemplates"":{""true"":""completed"",""false"":""""},""conditionalBindingIndex"":0,""type"":""conditional""}},""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]}]},{""type"":""Element"",""tag"":""button"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Delete"",""bindings"":[],""slots"":[]}]}]}}")]
[33m  11[0m [Component]
[33m  12[0m public partial class TodoList : MinimactComponent
[33m  13[0m {
[33m  14[0m     [Prop]
[33m  15[0m     public List<dynamic> todos { get; set; }
[33m  16[0m 
[33m  17[0m     protected override VNode Render()
[33m  18[0m     {
[33m  19[0m         StateManager.SyncMembersToState(this);
[33m  20[0m 
[33m  21[0m         return new VElement("div", new Dictionary<string, string> { ["class"] = "todo-list" }, new VNode[]
[33m  22[0m         {
[33m  23[0m             new VElement("h1", new Dictionary<string, string>(), "My Todos"),
[33m  24[0m             MinimactHelpers.createElement("ul", null, todos.Select(todo => new VElement("li", new Dictionary<string, string> { ["key"] = $"{todo.id}" }, new VNode[]
[33m  25[0m                 {
[33m  26[0m                     new VElement("input", new Dictionary<string, string> { ["type"] = "checkbox", ["checked"] = $"{todo.completed}" }),
[33m  27[0m                     MinimactHelpers.createElement("span", new { className = (todo.completed) ? "completed" : "" }, todo.text),
[33m  28[0m                     new VElement("button", new Dictionary<string, string> { ["onclick"] = "Handle0:{todo}" }, "Delete")
[33m  29[0m                 })).ToArray()),
[33m  30[0m             new VElement("button", new Dictionary<string, string> { ["onclick"] = "addTodo" }, "Add Todo")
[33m  31[0m         });
[33m  32[0m     }
[33m  33[0m 
[33m  34[0m     public void Handle0(dynamic todo)
[33m  35[0m     {
[33m  36[0m         deleteTodo(todo.id);
[33m  37[0m     }
[33m  38[0m }
[33m  39[0m 