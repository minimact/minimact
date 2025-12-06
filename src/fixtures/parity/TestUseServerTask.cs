using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[LoopTemplate("results", @"{""stateKey"":""results"",""arrayBinding"":""results"",""itemVar"":""result"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""className"":{""template"":""result-item"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Element"",""tag"":""h3"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.title""],""slots"":[0]}]},{""type"":""Element"",""tag"":""p"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.description""],""slots"":[0]}]}]}}")]
[Component]
public partial class TestUseServerTask : MinimactComponent
{
    [State]
    private string query = "";

    [State]
    private List<dynamic> results = new List<dynamic> {  };

    [State]
    private string streamedContent = "";

    [State]
    private bool isLoading = false;


    [ServerTask("serverTask_0")]
    private async Task<List<SearchResult>> ServerTask_0(string searchQuery, IProgress<double> progress, CancellationToken cancellationToken)
    {
        var response = await await _httpClient.GetStringAsync($"/api/products?q={searchQuery}");
        return response.json();

    }

    [ServerTask("serverTask_1")]
    private async Task<User> ServerTask_1(double userId, IProgress<double> progress, CancellationToken cancellationToken)
    {
        var response = await await _httpClient.GetStringAsync($"/api/users/{userId}");
        return response.json();

    }

    [ServerTask("serverTask_2", Streaming = true)]
    private async IAsyncEnumerable<AsyncGenerator> ServerTask_2(string prompt, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var response = await await _httpClient.GetStringAsync("/api/ai/stream", new { Method = "POST", Body = JsonSerializer.Serialize(new { Prompt = prompt }) });
        var reader = response.body.getReader();
        while (true)
        {
            var undefined = await reader.read();
            if (MinimactHelpers.ToBool(done))
            {
                break;
            }
            yield return new TextDecoder().decode(value);
            
        }

    }

    [ServerTask("serverTask_3")]
    private async Task<double> ServerTask_3(List<double> data, IProgress<double> progress, CancellationToken cancellationToken)
    {
        return data.Aggregate((a, b) => (a + b), 0);

    }
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "server-task-test" }, new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Server Task Test"),
            new VElement("div", "1.2", new Dictionary<string, string> { ["class"] = "search-section" }, new VNode[]
            {
                new VElement("input", "1.2.1", new Dictionary<string, string> { ["type"] = "text", ["value"] = $"{query}", ["placeholder"] = "Search products...", ["onchange"] = "Handle2" }),
                new VElement("button", "1.2.2", new Dictionary<string, string> { ["disabled"] = $"{isLoading}", ["onclick"] = "handleSearch" }, new VNode[]
                {
                    new VText($"{((new MObject(isLoading)) ? "Searching..." : "Search")}", "1.2.2.1")
                })
            }),
            MinimactHelpers.createElement("div", new { className = "results" }, results.Select(result => new VElement("div", "1.3.1.1", new Dictionary<string, string> { ["class"] = "result-item" }, new VNode[]
                {
                    new VElement("h3", "1.3.1.1.1", new Dictionary<string, string>(), new VNode[]
                    {
                        new VText($"{(result.title)}", "1.3.1.1.1.1")
                    }),
                    new VElement("p", "1.3.1.1.2", new Dictionary<string, string>(), new VNode[]
                    {
                        new VText($"{(result.description)}", "1.3.1.1.2.1")
                    })
                })).ToArray()),
            new VElement("div", "1.4", new Dictionary<string, string> { ["class"] = "streaming-section" }, new VNode[]
            {
                new VElement("h3", "1.4.1", new Dictionary<string, string>(), "AI Streaming"),
                new VElement("button", "1.4.2", new Dictionary<string, string> { ["onclick"] = "handleStream" }, "Start Stream"),
                new VElement("div", "1.4.3", new Dictionary<string, string> { ["class"] = "streamed-content" }, new VNode[]
                {
                    new VText($"{(streamedContent)}", "1.4.3.1")
                })
            })
        });
    }

    public void handleSearch()
    {
        SetState(nameof(isLoading), true);
        var searchResults = await searchProducts(query);
        SetState(nameof(results), searchResults);
        SetState(nameof(isLoading), false);
    }

    public void handleStream()
    {
        SetState(nameof(streamedContent), "");
        new VNull("");
    }

    public void Handle2(dynamic value)
    {
        SetState(nameof(query), value);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle2"] = @"function (value) {\n  setQuery(value);\n}"
        };
    }
}
