using Minimact.Runtime.Core;

namespace Minimact.Runtime.Examples;

/// <summary>
/// Example TodoList component demonstrating list rendering and state management
/// This would be generated from TSX like:
///
/// function TodoList() {
///   const [todos, setTodos] = useState([]);
///   const [input, setInput] = useClientState("");
///
///   const addTodo = () => {
///     setTodos([...todos, { id: Date.now(), text: input }]);
///   };
///
///   return (
///     <div>
///       <input value={input} onInput={e => setInput(e.target.value)} />
///       <button onClick={addTodo}>Add</button>
///       <ul>
///         {todos.map(todo => <li key={todo.id}>{todo.text}</li>)}
///       </ul>
///     </div>
///   );
/// }
/// </summary>
public class TodoList : MinimactComponent
{
    public class TodoItem
    {
        public int Id { get; set; }
        public string Text { get; set; } = "";
        public bool Completed { get; set; }
    }

    [State]
    private List<TodoItem> todos = new();

    public override Task OnInitializedAsync()
    {
        StateManager.InitializeState(this);
        return Task.CompletedTask;
    }

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new VNode[]
        {
            new VElement("h1", "Todo List"),

            // Input area (client-controlled via useClientState in real implementation)
            new VElement("div", new Dictionary<string, string>
            {
                ["data-minimact-client-scope"] = "true"
            }, new VNode[]
            {
                new VElement("input", new Dictionary<string, string>
                {
                    ["data-state"] = "newTodoText",
                    ["placeholder"] = "Enter todo..."
                }),
                new VElement("button", new Dictionary<string, string>
                {
                    ["onclick"] = nameof(AddTodo)
                }, "Add Todo")
            }),

            // Todo list (server-rendered)
            new VElement("ul", todos.Select(todo =>
                new VElement("li", new Dictionary<string, string>
                {
                    ["key"] = todo.Id.ToString()
                }, new VNode[]
                {
                    new VElement("input", new Dictionary<string, string>
                    {
                        ["type"] = "checkbox",
                        ["checked"] = todo.Completed ? "checked" : "",
                        ["onclick"] = $"{nameof(ToggleTodo)}:{todo.Id}"
                    }),
                    new VElement(todo.Completed ? "s" : "span", todo.Text),
                    new VElement("button", new Dictionary<string, string>
                    {
                        ["onclick"] = $"{nameof(DeleteTodo)}:{todo.Id}"
                    }, "Delete")
                })
            ).ToArray())
        });
    }

    private void AddTodo()
    {
        // In real implementation, get text from client state
        var text = GetState("__client_newTodoText") as string ?? "New Todo";

        todos.Add(new TodoItem
        {
            Id = (int)DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            Text = text,
            Completed = false
        });

        SetState(nameof(todos), todos);
    }

    private void ToggleTodo(int id)
    {
        var todo = todos.FirstOrDefault(t => t.Id == id);
        if (todo != null)
        {
            todo.Completed = !todo.Completed;
            SetState(nameof(todos), todos);
        }
    }

    private void DeleteTodo(int id)
    {
        todos = todos.Where(t => t.Id != id).ToList();
        SetState(nameof(todos), todos);
    }
}
