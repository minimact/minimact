using Minimact;
using System.Collections.Generic;

[Component]
public partial class HookImportsExample : MinimactComponent
{
    [State]
    private string title = "My App";

    // Imported hook instances
    private UseCounterHook main_counter;
    private UseFormHook contact_form;

    public HookImportsExample()
    {
        main_counter = new UseCounterHook(0);
        contact_form = new UseFormHook(new { name = "", email = "" });
    }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), new VText($"{title}", "1.1.1")),
            new VElement("p", "1.2", new Dictionary<string, string>(), new VText($"Count: {main_counter.Count}", "1.2.1")),
            main_counter.Render(),
            new VElement("h2", "1.3", new Dictionary<string, string>(), "Form"),
            contact_form.Render()
        });
    }
}

// Analyzed imported hooks:
// Map {
//   "useCounter" => {
//     filePath: "./hooks/useCounter",
//     className: "UseCounterHook",
//     states: [{ varName: "count", setterName: "setCount" }],
//     methods: ["increment", "decrement"],
//     returnValues: [
//       { name: "count", type: "state" },
//       { name: "increment", type: "method" },
//       { name: "decrement", type: "method" },
//       { name: "counterUI", type: "jsx" }
//     ]
//   },
//   "useForm" => {
//     filePath: "./hooks/useForm",
//     className: "UseFormHook",
//     ...
//   }
// }
