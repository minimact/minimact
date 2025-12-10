using Minimact;
using System;
using System.Collections.Generic;

[Component]
public partial class PropTypeInferenceExample : MinimactComponent
{
    // Inferred: string (from .toUpperCase(), .substring())
    [Prop]
    public string title { get; set; }

    // Inferred: double (from arithmetic: * 2, + count, > 0)
    [Prop]
    public double count { get; set; }

    // Inferred: List<object> (from .map(), .length, [0] access)
    [Prop]
    public List<object> items { get; set; }

    // Inferred: dynamic (from property access .name, .email)
    [Prop]
    public dynamic user { get; set; }

    // Inferred: Action (from onClick={onClick}, () => onClick())
    [Prop]
    public Action onClick { get; set; }

    // Inferred: dynamic (from conditional && and ?. access)
    [Prop]
    public dynamic config { get; set; }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), new VText($"{title.ToUpper()}", "1.1.1")),
            new VElement("h2", "1.2", new Dictionary<string, string>(), new VText($"{title.Substring(0, 10)}", "1.2.1")),
            new VElement("p", "1.3", new Dictionary<string, string>(), new VText($"Count: {count * 2}", "1.3.1")),
            new VElement("p", "1.4", new Dictionary<string, string>(), new VText($"Doubled: {count + count}", "1.4.1")),
            (count > 0)
                ? new VElement("span", "1.5", new Dictionary<string, string>(), "Positive")
                : new VNull("1.5"),
            new VElement("ul", "1.6", new Dictionary<string, string>(),
                items.Select(item => new VElement("li", "1.6.1", new Dictionary<string, string>(),
                    new VText($"{item}", "1.6.1.1"))).ToArray()),
            new VElement("p", "1.7", new Dictionary<string, string>(), new VText($"Total: {items.Count}", "1.7.1")),
            new VElement("p", "1.8", new Dictionary<string, string>(), new VText($"First: {items[0]}", "1.8.1")),
            new VElement("p", "1.9", new Dictionary<string, string>(), new VText($"Name: {user.name}", "1.9.1")),
            new VElement("p", "1.10", new Dictionary<string, string>(), new VText($"Email: {user.email}", "1.10.1")),
            new VElement("button", "1.11", new Dictionary<string, string> { ["onclick"] = "onClick" }, "Click"),
            new VElement("button", "1.12", new Dictionary<string, string> { ["onclick"] = "Handle0" }, "Also click"),
            (new MObject(config))
                ? new VElement("span", "1.13", new Dictionary<string, string>(), "Has config")
                : new VNull("1.13"),
            new VElement("p", "1.14", new Dictionary<string, string>(), new VText($"Theme: {config?.theme}", "1.14.1"))
        });
    }
}

// propTypeInference.cjs analyzes prop usage to infer types:
//
// String indicators:
//   .toUpperCase(), .toLowerCase(), .trim(), .substring(), .split()
//   .startsWith(), .endsWith(), .includes(), .replace()
//   .length (could also be array)
//   Template literal usage: `${prop}`
//
// Number indicators:
//   Arithmetic: +, -, *, /, %, **
//   Comparisons: >, <, >=, <=
//   Math methods: Math.floor(prop), Math.round(prop)
//   Increment: prop++, prop--
//
// Array indicators:
//   .map(), .filter(), .reduce(), .forEach(), .find()
//   .push(), .pop(), .slice(), .splice()
//   .length (combined with above methods)
//   Index access: prop[0], prop[i]
//
// Function indicators:
//   Used as event handler: onClick={prop}
//   Called: prop(), prop(args)
//
// Object indicators:
//   Property access: prop.foo, prop.bar
//   No array methods used
//
// Nullable indicators:
//   Optional chaining: prop?.foo
//   Nullish coalescing: prop ?? default
//   Truthiness check: prop && <element>
