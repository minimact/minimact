using Minimact;
using System.Collections.Generic;

[Component]
public partial class RazorDetectionExample : MinimactComponent
{
    [State]
    private string userName = "John";

    [State]
    private List<string> items = new List<string> { "Apple", "Banana", "Cherry" };

    [RazorMarkdown]
    private string content => RazorHelper.Render(@"
# Welcome @userName!

Your items:
@foreach (var item in items)
{
  - @item
}

@if (items.Count > 0)
{
  You have **@items.Count** items.
}
else
{
  No items yet.
}
  ", new { userName, items });

    protected override VNode Render()
    {
        return new DivRawHtml(MarkdownHelper.ToHtml(content));
    }
}

// Razor detection results:
// {
//   hasRazorSyntax: true,
//   referencedVariables: ["userName", "items"],
//   razorConstructs: ["@variable", "@foreach", "@if", "@else"]
// }
