using Minimact.AspNetCore.Plugins;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Attributes;
using Minimact.Charts.Models;
using Minimact.Charts.Utils;
using static Minimact.Charts.Utils.VNodeHelpers;

namespace Minimact.Charts.Plugins;

/// <summary>
/// Bar chart plugin with instant template patch updates
/// </summary>
[MinimactPlugin("BarChart")]
[LoopTemplate("data", @"{
        ""stateKey"": ""data"",
        ""itemTemplate"": {
            ""type"": ""Element"",
            ""tag"": ""rect"",
            ""propsTemplates"": {
                ""x"": {
                    ""template"": ""{0}"",
                    ""bindings"": [""item.x""],
                    ""slots"": [0],
                    ""type"": ""dynamic""
                },
                ""y"": {
                    ""template"": ""{0}"",
                    ""bindings"": [""item.y""],
                    ""slots"": [0],
                    ""type"": ""dynamic""
                },
                ""width"": {
                    ""template"": ""{0}"",
                    ""bindings"": [""item.width""],
                    ""slots"": [0],
                    ""type"": ""dynamic""
                },
                ""height"": {
                    ""template"": ""{0}"",
                    ""bindings"": [""item.height""],
                    ""slots"": [0],
                    ""type"": ""dynamic""
                },
                ""fill"": {
                    ""template"": ""{0}"",
                    ""bindings"": [""item.fill""],
                    ""slots"": [0],
                    ""type"": ""dynamic""
                },
                ""className"": {
                    ""template"": ""chart-bar"",
                    ""type"": ""static""
                }
            }
        }
    }")]
public class BarChartPlugin : MinimactPlugin<BarChartState>
{
    public override string Name => "BarChart";
    public override string Version => "1.0.0";
    public override string Description => "Bar chart with customizable bars and axes, powered by template patches for zero-latency updates";
    public override string Author => "Minimact Team";

    protected override VNode RenderTyped(BarChartState state)
    {
        // Validate data
        if (state.Data == null || state.Data.Count == 0)
        {
            return RenderEmptyState(state);
        }

        // Create calculator with chart dimensions
        var calculator = new ChartCalculator(state.Width, state.Height, state.Margin);

        // Create scales
        var categories = state.Data.Select(d => d.Category).ToArray();
        var xScale = calculator.CreateBandScale(
            categories,
            state.Margin.Left,
            state.Width - state.Margin.Right
        );

        var maxValue = state.Data.Max(d => d.Value);
        var minValue = state.Data.Min(d => d.Value);
        var yMin = minValue < 0 ? minValue : 0;
        var yMax = maxValue > 0 ? maxValue : 0;

        // Allow custom Y domain
        if (state.YAxis?.Domain != null)
        {
            yMin = state.YAxis.Domain.Value.min;
            yMax = state.YAxis.Domain.Value.max;
        }

        var yScale = calculator.CreateLinearScale(
            yMin,
            yMax,
            state.Height - state.Margin.Bottom,
            state.Margin.Top
        );

        // Calculate baseline Y position (for negative values)
        var baselineY = yScale.Scale(0);

        // Build bar VNodes with calculated positions
        var bars = state.Data.Select(dataPoint =>
        {
            var x = xScale.Scale(dataPoint.Category);
            var dataY = yScale.Scale(dataPoint.Value);
            var y = dataPoint.Value >= 0 ? dataY : baselineY;
            var height = Math.Abs(dataY - baselineY);
            var width = (int)(xScale.Bandwidth * state.BarWidthRatio);

            // Center the bar within its band
            var xCentered = x + ((xScale.Bandwidth - width) / 2);

            return Element("rect", new
            {
                x = xCentered,
                y = y,
                width = width,
                height = height,
                fill = dataPoint.Fill ?? state.BarFill ?? "#8884d8",
                stroke = state.BarStroke,
                strokeWidth = state.BarStrokeWidth,
                className = "chart-bar",
                data_category = dataPoint.Category,
                data_value = dataPoint.Value
            });
        }).ToArray();

        // Build complete SVG
        var children = new List<VNode>();

        // Background
        children.Add(Element("rect", new
        {
            width = state.Width,
            height = state.Height,
            fill = state.BackgroundFill ?? "transparent"
        }));

        // Grid lines (if enabled)
        if (state.ShowGrid)
        {
            children.Add(RenderGrid(state, yScale, calculator));
        }

        // Chart area group
        children.Add(Element("g", new { className = "chart-area" }, bars));

        // X Axis
        var xAxis = RenderXAxis(state, xScale);
        if (xAxis != null) children.Add(xAxis);

        // Y Axis
        var yAxis = RenderYAxis(state, yScale);
        if (yAxis != null) children.Add(yAxis);

        // Title
        if (!string.IsNullOrEmpty(state.Title))
        {
            children.Add(Element("text", new
            {
                x = state.Width / 2,
                y = state.Margin.Top - 5,
                textAnchor = "middle",
                fontSize = 16,
                fontWeight = "bold",
                fill = "#333"
            }, state.Title));
        }

        return Element("svg", new
        {
            width = state.Width,
            height = state.Height,
            viewBox = $"0 0 {state.Width} {state.Height}",
            className = state.ClassName ?? "minimact-bar-chart"
        }, children.ToArray());
    }

    private VNode RenderEmptyState(BarChartState state)
    {
        return Element("svg", new
        {
            width = state.Width,
            height = state.Height,
            viewBox = $"0 0 {state.Width} {state.Height}",
            className = state.ClassName ?? "minimact-bar-chart"
        },
            Element("text", new
            {
                x = state.Width / 2,
                y = state.Height / 2,
                textAnchor = "middle",
                fontSize = 14,
                fill = "#999"
            }, "No data to display")
        );
    }

    private VNode? RenderXAxis(BarChartState state, BandScale xScale)
    {
        if (state.XAxis == null) return null;

        var children = new List<VNode>();

        // Axis line
        if (state.XAxis.ShowLine)
        {
            children.Add(Element("line", new
            {
                x1 = state.Margin.Left,
                y1 = state.Height - state.Margin.Bottom,
                x2 = state.Width - state.Margin.Right,
                y2 = state.Height - state.Margin.Bottom,
                stroke = state.XAxis.LineColor,
                strokeWidth = state.XAxis.LineWidth
            }));
        }

        // Tick labels
        if (state.XAxis.ShowTickLabels)
        {
            var labels = state.Data.Select(d =>
                Element("text", new
                {
                    x = xScale.ScaleCenter(d.Category),
                    y = state.Height - state.Margin.Bottom + 20,
                    textAnchor = "middle",
                    fontSize = state.XAxis.TickLabelFontSize,
                    fill = state.XAxis.TickLabelColor
                }, d.Category)
            );
            children.AddRange(labels);
        }

        // Axis label
        if (!string.IsNullOrEmpty(state.XAxis.Label))
        {
            children.Add(Element("text", new
            {
                x = state.Width / 2,
                y = state.Height - 5,
                textAnchor = "middle",
                fontSize = 14,
                fontWeight = "600",
                fill = "#333"
            }, state.XAxis.Label));
        }

        return Element("g", new { className = "x-axis" }, children.ToArray());
    }

    private VNode? RenderYAxis(BarChartState state, LinearScale yScale)
    {
        if (state.YAxis == null) return null;

        var children = new List<VNode>();

        // Get ticks
        var ticks = state.YAxis.UseNiceTicks
            ? yScale.GetNiceTicks(state.YAxis.TickCount)
            : yScale.GetTicks(state.YAxis.TickCount);

        // Tick marks and labels
        foreach (var tick in ticks)
        {
            var y = yScale.Scale(tick);

            // Tick mark
            if (state.YAxis.ShowTicks)
            {
                children.Add(Element("line", new
                {
                    x1 = state.Margin.Left - 5,
                    y1 = y,
                    x2 = state.Margin.Left,
                    y2 = y,
                    stroke = state.YAxis.LineColor,
                    strokeWidth = state.YAxis.LineWidth
                }));
            }

            // Tick label
            if (state.YAxis.ShowTickLabels)
            {
                children.Add(Element("text", new
                {
                    x = state.Margin.Left - 10,
                    y = y + 4,
                    textAnchor = "end",
                    fontSize = state.YAxis.TickLabelFontSize,
                    fill = state.YAxis.TickLabelColor
                }, tick.ToString("F0")));
            }
        }

        // Axis line
        if (state.YAxis.ShowLine)
        {
            children.Add(Element("line", new
            {
                x1 = state.Margin.Left,
                y1 = state.Margin.Top,
                x2 = state.Margin.Left,
                y2 = state.Height - state.Margin.Bottom,
                stroke = state.YAxis.LineColor,
                strokeWidth = state.YAxis.LineWidth
            }));
        }

        // Axis label
        if (!string.IsNullOrEmpty(state.YAxis.Label))
        {
            children.Add(Element("text", new
            {
                x = 15,
                y = state.Height / 2,
                textAnchor = "middle",
                fontSize = 14,
                fontWeight = "600",
                fill = "#333",
                transform = $"rotate(-90, 15, {state.Height / 2})"
            }, state.YAxis.Label));
        }

        return Element("g", new { className = "y-axis" }, children.ToArray());
    }

    private VNode RenderGrid(BarChartState state, LinearScale yScale, ChartCalculator calculator)
    {
        var ticks = state.YAxis?.UseNiceTicks == true
            ? yScale.GetNiceTicks(state.YAxis.TickCount)
            : yScale.GetTicks(5);

        var gridLines = ticks.Select(tick =>
        {
            var y = yScale.Scale(tick);
            return Element("line", new
            {
                x1 = state.Margin.Left,
                y1 = y,
                x2 = state.Width - state.Margin.Right,
                y2 = y,
                stroke = state.GridColor,
                strokeWidth = state.GridStrokeWidth,
                className = "grid-line"
            });
        }).ToArray();

        return Element("g", new { className = "grid" }, gridLines);
    }

    public override PluginAssets GetAssets()
    {
        return new PluginAssets
        {
            CssFiles = new List<string> { "/plugin-assets/Charts@1.0.0/charts.css" },
            Source = AssetSource.Embedded
        };
    }
}
