using Minimact;
using Minimact.Markdown;
using System.Collections.Generic;

[Component]
public partial class RazorMarkdownExample : MinimactComponent
{
    [State]
    private string title = "Welcome";

    [State]
    private List<string> items = new List<string> { "First", "Second", "Third" };

    [State]
    private bool showDetails = true;

    [RazorMarkdown(@"
# @title

This is a markdown document with Razor syntax.

## Items

@foreach (var item in items)
{
- **@item**
}

@if (showDetails)
{
## Details

Here are some extra details that only show when enabled.

Total items: **@items.Count**
}
  ")]
    private string content => RazorEngine.Render(RazorTemplate_content, new { title, items, showDetails });

    private void Handle0()
    {
        showDetails = !showDetails;
        SetState(nameof(showDetails), showDetails);
    }

    protected override VNode Render()
    {
        return new VElement("article", "1", new Dictionary<string, string>(), new VNode[]
        {
            new DivRawHtml(MarkdownHelper.ToHtml(content)),
            new VElement("button", "1.2", new Dictionary<string, string> { ["onclick"] = "Handle0" }, "Toggle Details")
        });
    }
}

// razorMarkdown.cjs:
// 1. Detects Razor syntax (@variable, @foreach, @if)
// 2. Extracts referenced variables (title, items, showDetails)
// 3. Generates RazorEngine.Render call with model
// 4. Converts markdown to HTML with MarkdownHelper.ToHtml()
// 5. Uses DivRawHtml for unsafe HTML rendering
