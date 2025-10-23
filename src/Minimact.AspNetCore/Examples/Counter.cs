using Minimact.AspNetCore.Core;

namespace Minimact.AspNetCore.Examples;

/// <summary>
/// Example Counter component demonstrating basic Minimact usage
/// This would be generated from TSX like:
///
/// function Counter() {
///   const [count, setCount] = useState(0);
///
///   return (
///     <div>
///       <h1>Counter: {count}</h1>
///       <button onClick={() => setCount(count + 1)}>Increment</button>
///       <button onClick={() => setCount(count - 1)}>Decrement</button>
///     </div>
///   );
/// }
/// </summary>
public class Counter : MinimactComponent
{
    [State]
    private int count = 0;

    public override Task OnInitializedAsync()
    {
        // Initialize component
        StateManager.InitializeState(this);
        return Task.CompletedTask;
    }

    protected override VNode Render()
    {
        // Sync state from fields
        StateManager.SyncMembersToState(this);

        return new VElement("div", new VNode[]
        {
            new VElement("h1", $"Counter: {count}"),
            new VElement("button", new Dictionary<string, string>
            {
                ["onclick"] = nameof(Increment)
            }, "Increment"),
            new VElement("button", new Dictionary<string, string>
            {
                ["onclick"] = nameof(Decrement)
            }, "Decrement"),
            new VElement("button", new Dictionary<string, string>
            {
                ["onclick"] = nameof(Reset)
            }, "Reset")
        });
    }

    // Event handlers
    private void Increment()
    {
        count++;
        SetState(nameof(count), count);
    }

    private void Decrement()
    {
        count--;
        SetState(nameof(count), count);
    }

    private void Reset()
    {
        count = 0;
        SetState(nameof(count), count);
    }
}
