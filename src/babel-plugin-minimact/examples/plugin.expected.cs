using Minimact;
using Minimact.Plugins;
using System.Collections.Generic;

[Component]
public partial class PluginExample : MinimactComponent
{
    [State]
    private dynamic chartData = new
    {
        labels = new List<string> { "Jan", "Feb", "Mar" },
        values = new List<int> { 10, 20, 30 }
    };

    [State]
    private dynamic tableConfig = new
    {
        columns = new List<string> { "Name", "Age", "City" },
        sortable = true,
        paginated = true
    };

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "dashboard" }, new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), "Analytics"),

            // Basic plugin - PluginNode(name, version, stateBinding, stateValue, config)
            new PluginNode("bar-chart", null, "chartData", chartData, null),

            // Plugin with version
            new PluginNode("data-table", "2.0", "tableConfig", tableConfig, null),

            // Plugin with config
            new PluginNode("pie-chart", null, "chartData", chartData, new { showLegend = true, animate = true })
        });
    }
}

// plugin.cjs generates PluginNode which:
// 1. Registers with PluginManager at runtime
// 2. Passes state binding name for hot reload
// 3. Passes current state value for initial render
// 4. Passes optional version for compatibility checking
// 5. Passes optional config for plugin customization
