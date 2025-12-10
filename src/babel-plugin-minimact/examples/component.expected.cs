using Minimact;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

// component.cjs generates the complete class structure
[Component]
public partial class ComponentExample : MinimactComponent
{
    // Props → [Prop] attribute with public getter/setter
    [Prop]
    public string title { get; set; }

    [Prop]
    public double initialCount { get; set; }

    [Prop]
    public Action<double> onCountChange { get; set; }

    // State → [State] attribute with private field
    [State]
    private double count;

    [State]
    private List<string> items = new List<string>();

    [State]
    private bool isLoading = false;

    // Refs → [Ref] attribute
    [Ref]
    private ElementRef inputRef = null;

    [Ref]
    private ElementRef containerRef = null;

    // Constructor initializes state from props
    public ComponentExample()
    {
        count = initialCount;
    }

    // Server tasks → [ServerTask] attribute
    [ServerTask]
    public async Task<object> fetchItems()
    {
        isLoading = true;
        SetState(nameof(isLoading), isLoading);
        var response = await HttpClient.GetAsync("/api/items");
        var data = await response.Content.ReadFromJsonAsync<object>();
        isLoading = false;
        SetState(nameof(isLoading), isLoading);
        return data;
    }

    // Named event handlers → private methods
    private void handleIncrement()
    {
        count = count + 1;
        SetState(nameof(count), count);
    }

    private void handleReset()
    {
        count = initialCount;
        SetState(nameof(count), count);
        items = new List<string>();
        SetState(nameof(items), items);
    }

    // Anonymous handlers get generated names
    private void Handle0()
    {
        _ = fetchItems();
    }

    // Render method
    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string> { ["ref"] = "containerRef", ["class"] = "card" }, new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), new VText($"{title}", "1.1.1")),
            new VElement("p", "1.2", new Dictionary<string, string>(), new VText($"Count: {count}", "1.2.1")),
            new VElement("input", "1.3", new Dictionary<string, string> { ["ref"] = "inputRef" }),
            new VElement("button", "1.4", new Dictionary<string, string> { ["onclick"] = "handleIncrement" }, "+"),
            new VElement("button", "1.5", new Dictionary<string, string> { ["onclick"] = "handleReset" }, "Reset"),
            new VElement("button", "1.6", new Dictionary<string, string> { ["onclick"] = "Handle0" }, "Load"),
            (isLoading)
                ? new VElement("span", "1.7", new Dictionary<string, string>(), "Loading...")
                : new VNull("1.7"),
            new VElement("ul", "1.8", new Dictionary<string, string>(),
                items.Select(item => new VElement("li", "1.8.1", new Dictionary<string, string> { ["key"] = $"{item}" },
                    new VText($"{item}", "1.8.1.1"))).ToArray())
        });
    }
}

// component.cjs generates:
// 1. [Component] class attribute
// 2. [Prop] properties from function parameters
// 3. [State] fields from useState hooks
// 4. [Ref] fields from useRef hooks
// 5. [ServerTask] methods from useServerTask hooks
// 6. Event handler methods (named or generated Handle0, Handle1...)
// 7. Local variable declarations in Render()
// 8. Render() method with VNode tree
// 9. Constructor if state initialized from props
