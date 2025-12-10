using Minimact;
using System.Collections.Generic;

[Component]
[StateXTransform("stateX_0", "#counter-display", Transform = @"(c) => $""Count: {c}""")]
[StateXTransform("stateX_1", ".count-badge", Transform = @"(c) => c.ToString()")]
[StateXTransform("stateX_1", ".count-doubled", Transform = @"(c) => (c * 2).ToString()")]
[StateXTransform("stateX_2", "#progress-bar", ApplyAs = "attribute", Property = "style", Transform = @"(c) => $""width: {Math.Min(c, 100)}%""")]
[StateXTransform("stateX_3", ".user-card", ApplyAs = "class", ApplyIf = @"(u) => u.score > 50", Transform = @"() => ""high-score""")]
public partial class UseStateXExample : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private dynamic user = new { name = "John", score = 100 };

    private void Handle0()
    {
        count = count + 1;
        SetState(nameof(count), count);
    }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("span", "1.1", new Dictionary<string, string> { ["id"] = "counter-display" }),
            new VElement("span", "1.2", new Dictionary<string, string> { ["class"] = "count-badge" }),
            new VElement("span", "1.3", new Dictionary<string, string> { ["class"] = "count-doubled" }),
            new VElement("div", "1.4", new Dictionary<string, string> { ["id"] = "progress-bar" }),
            new VElement("div", "1.5", new Dictionary<string, string> { ["class"] = "user-card" }, new VText($"{user.name}", "1.5.1")),
            new VElement("button", "1.6", new Dictionary<string, string> { ["onclick"] = "Handle0" }, "+")
        });
    }
}

// useStateX extraction:
// [
//   {
//     varName: "stateX_0",
//     sourceState: "count",
//     targets: [{ selector: "#counter-display", transform: "(c) => $\"Count: {c}\"" }]
//   },
//   {
//     varName: "stateX_1",
//     sourceState: "count",
//     targets: [
//       { selector: ".count-badge", transform: "(c) => c.ToString()" },
//       { selector: ".count-doubled", transform: "(c) => (c * 2).ToString()" }
//     ]
//   },
//   {
//     varName: "stateX_2",
//     sourceState: "count",
//     targets: [{ selector: "#progress-bar", applyAs: "attribute", property: "style", transform: "..." }]
//   },
//   {
//     varName: "stateX_3",
//     sourceState: "user",
//     targets: [{ selector: ".user-card", applyAs: "class", applyIf: {...}, transform: "..." }]
//   }
// ]
