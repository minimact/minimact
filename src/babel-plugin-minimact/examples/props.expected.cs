using Minimact;
using System;
using System.Collections.Generic;

[Component]
public partial class PropsExample : MinimactComponent
{
    [Prop]
    public string title { get; set; }

    [Prop]
    public double count { get; set; }

    [Prop]
    public bool isActive { get; set; }

    [Prop]
    public List<string> items { get; set; }

    [Prop]
    public Action onClick { get; set; }

    [Prop]
    public dynamic config { get; set; }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = $"{(isActive ? "active" : "")}" }, new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), new VText($"{title}", "1.1.1")),
            new VElement("p", "1.2", new Dictionary<string, string>(), new VText($"Count: {count}", "1.2.1")),
            new VElement("ul", "1.3", new Dictionary<string, string>(),
                items.Select(item => new VElement("li", "1.3.1", new Dictionary<string, string>(), new VText($"{item}", "1.3.1.1"))).ToArray()),
            new VElement("button", "1.4", new Dictionary<string, string> { ["onclick"] = "onClick" }, "Click me"),
            (new MObject(config))
                ? new VElement("span", "1.5", new Dictionary<string, string>(), new VText($"Theme: {config.theme}", "1.5.1"))
                : new VNull("1.5")
        });
    }
}

[Component]
public partial class PropsObjectExample : MinimactComponent
{
    [Prop]
    public dynamic props { get; set; }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("p", "1.1", new Dictionary<string, string>(), new VText($"{props.name} is {props.age} years old", "1.1.1"))
        });
    }
}

// Extracted props:
// PropsExample: [
//   { name: "title", type: "string" },
//   { name: "count", type: "double" },
//   { name: "isActive", type: "bool" },
//   { name: "items", type: "List<string>" },
//   { name: "onClick", type: "Action" },
//   { name: "config", type: "dynamic" }  // optional
// ]
// PropsObjectExample: [
//   { name: "props", type: "dynamic" }
// ]
