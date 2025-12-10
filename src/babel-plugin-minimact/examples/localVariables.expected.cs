using Minimact;
using System.Collections.Generic;
using System.Linq;

[Component]
public partial class LocalVariablesExample : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private List<string> items = new List<string> { "a", "b", "c" };

    [State]
    private dynamic user = new { name = "John", score = 100 };

    private string formatNumber(double n)
    {
        return n.ToString("F2");
    }

    protected override VNode Render()
    {
        // localVariables.cjs extracts these and places them at top of Render()
        var doubled = count * 2;
        var total = count + items.Count;
        var filtered = items.Where(x => x != "b").ToList();
        var mapped = items.Select(x => x.ToUpper()).ToList();
        var reduced = items.Aggregate("", (acc, x) => acc + x);
        var userName = user.name;
        var userInfo = $"{user.name}: {user.score}";
        var status = count > 10 ? "high" : "low";
        var name = user.name;
        var score = user.score;
        var formatted = formatNumber(count);
        var result = items.Count > 0 ? items[0].ToUpper() : "empty";

        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("p", "1.1", new Dictionary<string, string>(), new VText($"Count: {count}", "1.1.1")),
            new VElement("p", "1.2", new Dictionary<string, string>(), new VText($"Doubled: {doubled}", "1.2.1")),
            new VElement("p", "1.3", new Dictionary<string, string>(), new VText($"Total: {total}", "1.3.1")),
            new VElement("p", "1.4", new Dictionary<string, string>(), new VText($"Filtered: {string.Join(", ", filtered)}", "1.4.1")),
            new VElement("p", "1.5", new Dictionary<string, string>(), new VText($"Mapped: {string.Join(", ", mapped)}", "1.5.1")),
            new VElement("p", "1.6", new Dictionary<string, string>(), new VText($"User: {userName}", "1.6.1")),
            new VElement("p", "1.7", new Dictionary<string, string>(), new VText($"Status: {status}", "1.7.1")),
            new VElement("p", "1.8", new Dictionary<string, string>(), new VText($"Result: {result}", "1.8.1"))
        });
    }
}

// localVariables.cjs extracts:
//
// Included (component.localVariables):
// - const name = expression;
// - let name = expression;
// - var name = expression;
//
// Excluded:
// - Hook calls: const [x, setX] = useState(...) → handled by hooks.cjs
// - Destructuring from state: const { a, b } = state; → inlined
// - Function declarations → handled separately as helperFunctions
//
// Each extracted variable has:
// {
//   name: "doubled",
//   expression: "count * 2",    // Original TS expression
//   csharpInit: "count * 2",    // Converted C# expression
//   dependencies: ["count"],     // State variables referenced
//   type: "int"                  // Inferred C# type
// }
//
// Variables are emitted at the start of Render() method:
//   var doubled = count * 2;
//   var filtered = items.Where(x => x != "b").ToList();
