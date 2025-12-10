using Minimact;
using System.Collections.Generic;

[Component]
public partial class HooksExample : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private string name = "";

    [State]
    private List<string> items = new List<string>();

    [Ref]
    private ElementRef inputRef = null;

    [ServerTask]
    public async Task<object> fetchData(double id)
    {
        var response = await HttpClient.GetAsync($"/api/data/{id}");
        return await response.Content.ReadFromJsonAsync<object>();
    }

    private void Handle0(InputEvent e)
    {
        name = e.target.value;
        SetState(nameof(name), name);
    }

    private void Handle1()
    {
        count = count + 1;
        SetState(nameof(count), count);
    }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("input", "1.1", new Dictionary<string, string> { ["ref"] = "inputRef", ["value"] = $"{name}", ["oninput"] = "Handle0" }),
            new VElement("p", "1.2", new Dictionary<string, string>(), new VText($"Count: {count}", "1.2.1")),
            new VElement("button", "1.3", new Dictionary<string, string> { ["onclick"] = "Handle1" }, "Increment")
        });
    }
}
