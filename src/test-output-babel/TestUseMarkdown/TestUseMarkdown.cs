using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class TestUseMarkdown : MinimactComponent
{
    [State]
    private string selectedDoc = "intro";

    [State]
    private string externalMd = "";

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "markdown-test" }, new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Markdown Test"),
            new VElement("section", "1.2", new Dictionary<string, string> { ["class"] = "doc-selector" }, new VNode[]
            {
                MinimactHelpers.createElement("button", new { className = (selectedDoc == "intro") ? "active" : "" }, "Introduction"),
                MinimactHelpers.createElement("button", new { className = (selectedDoc == "api") ? "active" : "" }, "API"),
                MinimactHelpers.createElement("button", new { className = (selectedDoc == "examples") ? "active" : "" }, "Examples")
            }),
            new VElement("section", "1.3", new Dictionary<string, string> { ["class"] = "static-markdown" }, new VNode[]
            {
                new VElement("h3", "1.3.1", new Dictionary<string, string>(), "Static Markdown"),
                new VElement("div", "1.3.2", new Dictionary<string, string> { ["class"] = "markdown-content", ["dangerouslySetInnerHTML"] = $"{new { __html = introContent }}" })
            }),
            new VElement("section", "1.4", new Dictionary<string, string> { ["class"] = "dynamic-markdown" }, new VNode[]
            {
                new VElement("h3", "1.4.1", new Dictionary<string, string>(), $"Dynamic Markdown (selected:{(selectedDoc)})"),
                new VElement("div", "1.4.2", new Dictionary<string, string> { ["class"] = "markdown-content", ["dangerouslySetInnerHTML"] = $"{new { __html = dynamicContent }}" })
            }),
            new VElement("section", "1.5", new Dictionary<string, string> { ["class"] = "razor-markdown" }, new VNode[]
            {
                new VElement("h3", "1.5.1", new Dictionary<string, string>(), "Razor Markdown"),
                new VElement("div", "1.5.2", new Dictionary<string, string> { ["class"] = "markdown-content", ["dangerouslySetInnerHTML"] = $"{new { __html = razorContent }}" })
            }),
            MinimactHelpers.createElement("section", new { className = "external-markdown" }, new VElement("h3", "1.6.1", new Dictionary<string, string>(), "External Markdown"), new VElement("button", "1.6.2", new Dictionary<string, string> { ["onclick"] = "handleLoadExternal" }, "Load External Docs"), (new MObject(externalMd)) ? new VElement("div", "1.6.3.1", new Dictionary<string, string> { ["class"] = "markdown-content", ["dangerouslySetInnerHTML"] = $"{new { __html = externalContent }}" }) : new VNull("1.6.3"))
        });
    }

    public void handleLoadExternal()
    {
        var response = await new HttpClient().GetAsync("/docs/readme.md");
        var text = await response.text();
        SetState(nameof(externalMd), text);
    }
}
