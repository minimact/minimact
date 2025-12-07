using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Net.Http;

namespace Minimact.Components;

[LoopTemplate("results", @"{""stateKey"":""results"",""arrayBinding"":""results"",""itemVar"":""result"",""indexVar"":null,""keyBinding"":""item.id"",""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""class"":{""template"":""result-item"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Element"",""tag"":""h3"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""{(result.title)}""],""slots"":[0]}]},{""type"":""Element"",""tag"":""p"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""{(result.description)}""],""slots"":[0]}]}]}}")]
[LoopTemplate("query", @"{""stateKey"":""query"",""arrayBinding"":""query"",""itemVar"":""result"",""indexVar"":null,""keyBinding"":""item.id"",""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""class"":{""template"":""result-item"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Element"",""tag"":""h3"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""{(result.title)}""],""slots"":[0]}]},{""type"":""Element"",""tag"":""p"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""{(result.description)}""],""slots"":[0]}]}]}}")]
[Component]
public partial class TestUseServerTask : MinimactComponent
{
    [State]
    private string query = "";

    [State]
    private List<dynamic> results = new List<object>();

    [State]
    private string streamedContent = "";

    [State]
    private bool isLoading = false;

    private readonly HttpClient _httpClient;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "server-task-test" }, new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Server Task Test"),
            new VElement("div", "1.2", new Dictionary<string, string> { ["class"] = "search-section" }, new VNode[]
            {
                new VElement("input", "1.2.1", new Dictionary<string, string> { ["type"] = "text", ["value"] = $"{(query)}", ["onchange"] = "Handle0", ["placeholder"] = "Search products..." }),
                new VElement("button", "1.2.2", new Dictionary<string, string> { ["onclick"] = "handleSearch", ["disabled"] = $"{(isLoading)}" }, new VNode[]
                {
                    new VText($"{(isLoading?"Searching...":"Search")}", "1.2.2.1")
                })
            }),
            MinimactHelpers.createElement("div", new Dictionary<string, string> { ["class"] = "results" }, ((IEnumerable<dynamic>)results).Select(result => new VElement("div", "1.3.1.1", new Dictionary<string, string> { ["key"] = $"{(result.id)}", ["class"] = "result-item" }, new VNode[]
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

    public void Handle0(dynamic e)
    {
        setQuery(e.target.value);
    }

    [ServerTask("searchProducts")]
    private async Task<object> searchProducts(string searchQuery, IProgress<double> progress = null, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetStringAsync($"/api/products?q={searchQuery}");return response;
    }

    [ServerTask("fetchUser")]
    private async Task<object> fetchUser(double userId, IProgress<double> progress = null, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetStringAsync($"/api/users/{userId}");return response;
    }

    [ServerTask("streamAIResponse", Streaming = true)]
    private async IAsyncEnumerable<object> streamAIResponse(string prompt, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetStreamAsync("/api/ai/stream", cancellationToken);
        using var reader = new System.IO.StreamReader(response);
        while (!reader.EndOfStream)
        {
        if (cancellationToken.IsCancellationRequested) yield break;
        var line = await reader.ReadLineAsync();
        if (line != null) yield return line;
        }
    }

    [ServerTask("computeHeavyTask")]
    private async Task<object> computeHeavyTask(List<double> data, IProgress<double> progress = null, CancellationToken cancellationToken = default)
    {
        return data.Aggregate(0.0d,  (a, b)  =>  a + b);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function () {\n  setQuery(e.target.value);\n}"
        };
    }

    // State setters
    private void setQuery(string value)
    {
        query = value;
        SetState(nameof(query), value);
    }

    private void setResults(List<dynamic> value)
    {
        results = value;
        SetState(nameof(results), value);
    }

    private void setStreamedContent(string value)
    {
        streamedContent = value;
        SetState(nameof(streamedContent), value);
    }

    private void setIsLoading(bool value)
    {
        isLoading = value;
        SetState(nameof(isLoading), value);
    }

}
