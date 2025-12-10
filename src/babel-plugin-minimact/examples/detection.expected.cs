using Minimact;
using System.Collections.Generic;

[Component]
public partial class DetectionExample : MinimactComponent
{
    [State]
    private string className = "active";

    [State]
    private List<string> items = new List<string> { "a", "b", "c" };

    [State]
    private dynamic props = new { id = "test", role = "button" };

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            // hasSpreadProps: false, hasDynamicChildren: false, hasComplexProps: false
            // → Direct VElement construction
            new VElement("span", "1.1", new Dictionary<string, string> { ["class"] = "static" }, "Hello"),

            // hasSpreadProps: false, hasDynamicChildren: false, hasComplexProps: false
            // → Direct VElement with interpolation
            new VElement("span", "1.2", new Dictionary<string, string> { ["class"] = $"{className}" }, "Dynamic class"),

            // hasSpreadProps: true → RuntimeHelpers needed
            RuntimeHelpers.CreateElement("div", "1.3", RuntimeHelpers.MergeProps(props), "Spread props"),

            // hasDynamicChildren: true → RuntimeHelpers needed
            RuntimeHelpers.CreateElement("ul", "1.4", new Dictionary<string, string>(), items),

            // hasComplexProps: true → RuntimeHelpers needed
            RuntimeHelpers.CreateElement("div", "1.5", new Dictionary<string, string> { ["data-info"] = JsonSerializer.Serialize(new { count = items.Count }) }, "Complex")
        });
    }
}

// Detection results:
// "1.1": { hasSpreadProps: false, hasDynamicChildren: false, hasComplexProps: false }
// "1.2": { hasSpreadProps: false, hasDynamicChildren: false, hasComplexProps: false }
// "1.3": { hasSpreadProps: true,  hasDynamicChildren: false, hasComplexProps: false }
// "1.4": { hasSpreadProps: false, hasDynamicChildren: true,  hasComplexProps: false }
// "1.5": { hasSpreadProps: false, hasDynamicChildren: false, hasComplexProps: true  }
