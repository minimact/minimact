using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Rendering;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;

namespace MinimactTest.Components
{
[Component]
public partial class MultiplePlugins : MinimactComponent
{
    [State]
    private List<dynamic> salesData = new List<object> { new { category = "Jan", value = 4500 }, new { category = "Feb", value = 6200 }, new { category = "Mar", value = 5800 }, new { category = "Apr", value = 7100 } };

    [State]
    private List<dynamic> revenueData = new List<object> { new { category = "Q1", value = 125000 }, new { category = "Q2", value = 150000 }, new { category = "Q3", value = 180000 }, new { category = "Q4", value = 200000 } };

    [State]
    private List<dynamic> productMix = new List<object> { new { category = "Widget A", value = 35 }, new { category = "Widget B", value = 28 }, new { category = "Widget C", value = 22 }, new { category = "Widget D", value = 15 } };

    [State]
    private List<dynamic> timeSeriesData = new List<object> { new { date = "2024-01", value = 100 }, new { date = "2024-02", value = 120 }, new { date = "2024-03", value = 115 }, new { date = "2024-04", value = 140 } };

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", new Dictionary<string, string>(), "Multiple Plugin Test Cases"),
            new VElement("p", new Dictionary<string, string> { ["class"] = "warning" }, "⚠️ Plugin matching uses \"first match wins\" logic - verify each plugin renders correctly!"),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 1: BarChart + LineChart"),
                new VElement("div", new Dictionary<string, string> { ["class"] = "charts-row" }, new VNode[]
                {
                    new VElement("div", new Dictionary<string, string> { ["class"] = "chart" }, new VNode[]
                    {
                        new VElement("h4", new Dictionary<string, string>(), "Sales (Bar Chart)"),
                        new PluginNode("BarChart", new { data = salesData, width = 400, height = 300 })
                    }),
                    new VElement("div", new Dictionary<string, string> { ["class"] = "chart" }, new VNode[]
                    {
                        new VElement("h4", new Dictionary<string, string>(), "Revenue Trend (Line Chart)"),
                        new PluginNode("LineChart", new { data = timeSeriesData, width = 400, height = 300 })
                    })
                })
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 2: Three BarCharts"),
                new VElement("div", new Dictionary<string, string> { ["class"] = "charts-grid" }, new VNode[]
                {
                    new VElement("div", new Dictionary<string, string> { ["class"] = "chart" }, new VNode[]
                    {
                        new VElement("h4", new Dictionary<string, string>(), "Sales"),
                        new PluginNode("BarChart", new { data = salesData, width = 300, height = 250 })
                    }),
                    new VElement("div", new Dictionary<string, string> { ["class"] = "chart" }, new VNode[]
                    {
                        new VElement("h4", new Dictionary<string, string>(), "Revenue"),
                        new PluginNode("BarChart", new { data = revenueData, width = 300, height = 250 })
                    }),
                    new VElement("div", new Dictionary<string, string> { ["class"] = "chart" }, new VNode[]
                    {
                        new VElement("h4", new Dictionary<string, string>(), "Product Mix"),
                        new PluginNode("BarChart", new { data = productMix, width = 300, height = 250 })
                    })
                }),
                new VElement("p", new Dictionary<string, string> { ["class"] = "expected" }, "Expected: Each chart should show DIFFERENT data. If they all show the same data, plugin matching failed!")
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 3: Four Different Chart Types"),
                new VElement("div", new Dictionary<string, string> { ["class"] = "charts-grid-4" }, new VNode[]
                {
                    new PluginNode("BarChart", new { data = salesData, width = 350, height = 250 }),
                    new PluginNode("LineChart", new { data = timeSeriesData, width = 350, height = 250 }),
                    new PluginNode("PieChart", new { data = productMix, width = 350, height = 250 }),
                    new PluginNode("AreaChart", new { data = salesData, width = 350, height = 250 })
                })
            }),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "test-case" }, new VElement("h3", new Dictionary<string, string>(), "Test 4: Conditional Plugin Rendering"), (salesData.Count > 0) ? new PluginNode("BarChart", new { data = salesData, width = 500, height = 300 }) : null, (timeSeriesData.Count > 0) ? new PluginNode("LineChart", new { data = timeSeriesData, width = 500, height = 300 }) : null),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 5: Multiple Same-Type Plugins with Different Data"),
                new VElement("p", new Dictionary<string, string> { ["class"] = "note" }, new VNode[]
                {
                    new VText("ℹ️ Note: Plugin names must be static string literals. Dynamic names like name="),
                    new VText($"{("{config.type}")}"),
                    new VText("are not supported.")
                }),
                new VElement("div", new Dictionary<string, string> { ["class"] = "charts-row" }, new VNode[]
                {
                    new VElement("div", new Dictionary<string, string> { ["class"] = "chart" }, new VNode[]
                    {
                        new VElement("h4", new Dictionary<string, string>(), "Sales"),
                        new PluginNode("BarChart", new { data = salesData, width = 400, height = 250 })
                    }),
                    new VElement("div", new Dictionary<string, string> { ["class"] = "chart" }, new VNode[]
                    {
                        new VElement("h4", new Dictionary<string, string>(), "Revenue"),
                        new PluginNode("BarChart", new { data = revenueData, width = 400, height = 250 })
                    }),
                    new VElement("div", new Dictionary<string, string> { ["class"] = "chart" }, new VNode[]
                    {
                        new VElement("h4", new Dictionary<string, string>(), "Products"),
                        new PluginNode("BarChart", new { data = productMix, width = 400, height = 250 })
                    })
                }),
                new VElement("p", new Dictionary<string, string> { ["class"] = "expected" }, "Expected: Each chart shows different data (Sales, Revenue, Products)")
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 6: Plugins in Nested Structures"),
                new VElement("div", new Dictionary<string, string> { ["class"] = "dashboard" }, new VNode[]
                {
                    new VElement("div", new Dictionary<string, string> { ["class"] = "row" }, new VNode[]
                    {
                        new VElement("div", new Dictionary<string, string> { ["class"] = "col" }, new VNode[]
                        {
                            new PluginNode("BarChart", new { data = salesData, width = 300, height = 200 })
                        }),
                        new VElement("div", new Dictionary<string, string> { ["class"] = "col" }, new VNode[]
                        {
                            new VElement("div", new Dictionary<string, string> { ["class"] = "nested" }, new VNode[]
                            {
                                new PluginNode("LineChart", new { data = timeSeriesData, width = 300, height = 200 })
                            })
                        })
                    })
                })
            }),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "test-case" }, new VNode[]
            {
                new VElement("h3", new Dictionary<string, string>(), "Test 7: Plugin with Version Specifier"),
                new PluginNode("BarChart", new { data = salesData, width = 500, height = 300 }) /* v1.0.0 */
            })
        });
    }
}

}
