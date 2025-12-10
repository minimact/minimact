using Minimact;
using System.Collections.Generic;

[Component]
public partial class PluginUsageExample : MinimactComponent
{
    [State]
    private List<int> chartData = new List<int> { 1, 2, 3, 4, 5 };

    [State]
    private List<dynamic> tableData = new List<dynamic> { new { id = 1, name = "Test" } };

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), "Dashboard"),
            new PluginNode("chart", "1.0", "chartData", chartData),
            new PluginNode("data-table", null, "tableData", tableData, new { sortable = true })
        });
    }
}

// Analyzed plugin usages:
// [
//   { pluginName: "chart", version: "1.0", stateBinding: { binding: "chartData" } },
//   { pluginName: "data-table", version: null, stateBinding: { binding: "tableData" }, config: { sortable: true } }
// ]
