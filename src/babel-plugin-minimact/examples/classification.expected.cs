using Minimact;
using System.Collections.Generic;

[Component]
public partial class ClassificationExample : MinimactComponent
{
    [State]
    private int serverCount = 0;

    [State]
    private List<object> serverResults = new List<object>();

    [State]
    private string clientQuery = "";

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            // Classification: server (depends only on serverCount)
            new VElement("span", "1.1", new Dictionary<string, string> { ["data-zone"] = "server", ["data-minimact-server-scope"] = "" },
                new VText($"{serverCount}", "1.1.1")),

            // Classification: client (depends only on clientQuery)
            new VElement("input", "1.2", new Dictionary<string, string> { ["data-zone"] = "client", ["data-minimact-client-scope"] = "", ["value"] = $"{clientQuery}" }),

            // Classification: hybrid (depends on both clientQuery and serverResults)
            new VElement("p", "1.3", new Dictionary<string, string> { ["data-zone"] = "hybrid" },
                new VText($"Results for {clientQuery}: {serverResults.Count}", "1.3.1"))
        });
    }
}

// Classification analysis:
// {
//   "1.1": "server",   // depends on: [serverCount]
//   "1.2": "client",   // depends on: [clientQuery]
//   "1.3": "hybrid"    // depends on: [clientQuery, serverResults]
// }
