# @minimact/charts - Implementation Plan

**Version:** 1.0
**Date:** November 2, 2025
**Status:** Design Phase

---

## 🎯 Vision

Create a **charting library for Minimact** that:

1. ✅ **Borrows Recharts' elegant JSX API** - Familiar to React developers
2. ✅ **Uses minimact-plugin** - Leverages existing plugin infrastructure
3. ✅ **Uses parameterized template patches** - Zero-latency updates
4. ✅ **Pure server-side rendering** - Zero client bundle overhead
5. ✅ **Supports Bar, Line, Pie, Area charts** - Essential chart types

**Key Principle:** Developer writes familiar JSX → Server renders SVG VNodes → Client applies template patches instantly.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Developer Writes TSX (Recharts-style API)              │
│                                                          │
│  <Plugin name="BarChart" state={{                       │
│    data: salesData,                                     │
│    width: 600,                                          │
│    height: 400                                          │
│  }}>                                                    │
│    <XAxis dataKey="month" />                            │
│    <YAxis />                                            │
│    <Bar dataKey="sales" fill="#8884d8" />              │
│  </Plugin>                                              │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Babel transpile
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Generated C# Code                                       │
│                                                          │
│  new PluginNode("BarChart", new BarChartState {         │
│    Data = salesData,                                    │
│    Width = 600,                                         │
│    Height = 400,                                        │
│    XAxis = new XAxisConfig { DataKey = "month" },      │
│    YAxis = new YAxisConfig(),                           │
│    Bars = new[] {                                       │
│      new BarConfig { DataKey = "sales", Fill = "#..." }│
│    }                                                    │
│  })                                                     │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Server renders
                         ↓
┌─────────────────────────────────────────────────────────┐
│  BarChartPlugin.Render(state)                           │
│  ┌───────────────────────────────────────────┐         │
│  │ 1. ChartCalculator creates scales         │         │
│  │    - xScale = BandScale(categories)       │         │
│  │    - yScale = LinearScale(0, maxValue)    │         │
│  │                                             │         │
│  │ 2. Calculate bar positions                 │         │
│  │    - x = xScale.Scale(category)            │         │
│  │    - y = yScale.Scale(value)               │         │
│  │    - height = chartHeight - y              │         │
│  │                                             │         │
│  │ 3. Build VNode tree with [LoopTemplate]   │         │
│  │    - <svg> → <g> → <rect>[] bars          │         │
│  │    - <g class="x-axis"> → <text>[] labels │         │
│  │    - <g class="y-axis"> → <text>[] ticks  │         │
│  └───────────────────────────────────────────┘         │
│                                                          │
│  Returns: VNode with parameterized template metadata   │
└─────────────────────────────────────────────────────────┘
                         │
                         │ First render
                         ↓
┌─────────────────────────────────────────────────────────┐
│  SignalR Sends to Client:                               │
│  {                                                       │
│    pluginName: "BarChart",                              │
│    version: "1.0.0",                                    │
│    templates: [{                                        │
│      stateKey: "data",                                  │
│      itemTemplate: {                                    │
│        type: "Element",                                 │
│        tag: "rect",                                     │
│        propsTemplates: {                                │
│          x: { template: "{0}", bindings: ["item.x"] }, │
│          y: { template: "{0}", bindings: ["item.y"] }, │
│          width: { template: "{0}", bindings: [...] },  │
│          height: { template: "{0}", bindings: [...] }, │
│          fill: { template: "{0}", bindings: [...] }    │
│        }                                                │
│      }                                                  │
│    }],                                                  │
│    html: "<svg>...</svg>"                               │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Client registers templates
                         ↓
┌─────────────────────────────────────────────────────────┐
│  minimact-plugin:                                        │
│  - Registers bar template with parameterized slots     │
│  - Stores template: <rect x="{0}" y="{1}" ... />       │
│  - Stores bindings: ["item.x", "item.y", ...]          │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Data updates (e.g., setSalesData)
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Client Applies Template Patch Instantly:               │
│  1. Match template by stateKey ("data")                │
│  2. For each data item:                                 │
│     - Calculate x = xScale(item.month)                 │
│     - Calculate y = yScale(item.sales)                 │
│     - Fill slots: {0}=x, {1}=y, {2}=width, {3}=height │
│  3. Update DOM directly (no server round-trip)         │
│  4. Result: 0ms latency! ⚡                            │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Project Structure

```
minimact/
├── src/
│   ├── Minimact.Charts/                    # C# NuGet Package
│   │   ├── Plugins/
│   │   │   ├── BarChartPlugin.cs          # Bar chart renderer
│   │   │   ├── LineChartPlugin.cs         # Line chart renderer
│   │   │   ├── PieChartPlugin.cs          # Pie chart renderer
│   │   │   └── AreaChartPlugin.cs         # Area chart renderer
│   │   │
│   │   ├── Models/
│   │   │   ├── ChartStateBase.cs          # Base class (Width, Height, Margin)
│   │   │   ├── BarChartState.cs           # Bar chart state
│   │   │   ├── LineChartState.cs          # Line chart state
│   │   │   ├── PieChartState.cs           # Pie chart state
│   │   │   ├── AreaChartState.cs          # Area chart state
│   │   │   ├── DataPoint.cs               # Generic data point
│   │   │   └── ChartMargin.cs             # Margin configuration
│   │   │
│   │   ├── Components/
│   │   │   ├── XAxisConfig.cs             # X-axis configuration
│   │   │   ├── YAxisConfig.cs             # Y-axis configuration
│   │   │   ├── TooltipConfig.cs           # Tooltip configuration
│   │   │   ├── LegendConfig.cs            # Legend configuration
│   │   │   ├── BarConfig.cs               # Bar series configuration
│   │   │   ├── LineConfig.cs              # Line series configuration
│   │   │   ├── PieConfig.cs               # Pie slice configuration
│   │   │   └── AreaConfig.cs              # Area series configuration
│   │   │
│   │   ├── Utils/
│   │   │   ├── ChartCalculator.cs         # Main entry point for calculations
│   │   │   ├── LinearScale.cs             # Linear scale (numbers)
│   │   │   ├── BandScale.cs               # Band scale (categories)
│   │   │   ├── TimeScale.cs               # Time scale (dates) - Future
│   │   │   ├── PathGenerator.cs           # SVG path generation
│   │   │   ├── ColorPalette.cs            # Color schemes
│   │   │   └── LayoutHelper.cs            # Margin/legend calculations
│   │   │
│   │   ├── Renderers/
│   │   │   ├── SvgRenderer.cs             # Base SVG rendering utilities
│   │   │   ├── BarRenderer.cs             # Bar-specific rendering
│   │   │   ├── LineRenderer.cs            # Line-specific rendering
│   │   │   ├── PieRenderer.cs             # Pie-specific rendering
│   │   │   └── AreaRenderer.cs            # Area-specific rendering
│   │   │
│   │   ├── assets/
│   │   │   └── charts.css                 # Default chart styles
│   │   │
│   │   └── Minimact.Charts.csproj
│   │
│   └── minimact-charts/                    # Client NPM Package
│       ├── src/
│       │   ├── index.ts                   # Main entry point
│       │   ├── types.ts                   # TypeScript type definitions
│       │   ├── components.ts              # Component type exports
│       │   └── scales.ts                  # Client-side scale utilities
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
```

---

## 🔧 Core Components

### 1. Scale Calculators (C#)

**Purpose:** Convert data domain → visual range

#### LinearScale.cs
```csharp
public class LinearScale
{
    private readonly double _domainMin;
    private readonly double _domainMax;
    private readonly int _rangeStart;
    private readonly int _rangeEnd;

    public LinearScale(double domainMin, double domainMax, int rangeStart, int rangeEnd)
    {
        _domainMin = domainMin;
        _domainMax = domainMax;
        _rangeStart = rangeStart;
        _rangeEnd = rangeEnd;
    }

    /// <summary>
    /// Scale a value from domain to range
    /// </summary>
    public int Scale(double value)
    {
        // Linear interpolation
        var ratio = (value - _domainMin) / (_domainMax - _domainMin);
        return (int)(_rangeStart + ratio * (_rangeEnd - _rangeStart));
    }

    /// <summary>
    /// Generate tick values
    /// </summary>
    public double[] GetTicks(int count = 5)
    {
        var step = (_domainMax - _domainMin) / (count - 1);
        return Enumerable.Range(0, count)
            .Select(i => _domainMin + (i * step))
            .ToArray();
    }
}
```

#### BandScale.cs
```csharp
public class BandScale
{
    private readonly string[] _categories;
    private readonly int _rangeStart;
    private readonly int _rangeEnd;
    private readonly int _bandwidth;
    private readonly int _padding;

    public BandScale(string[] categories, int rangeStart, int rangeEnd, double paddingInner = 0.1)
    {
        _categories = categories;
        _rangeStart = rangeStart;
        _rangeEnd = rangeEnd;

        var totalWidth = rangeEnd - rangeStart;
        var paddingWidth = (int)(totalWidth * paddingInner / categories.Length);
        _bandwidth = (totalWidth - (paddingWidth * (categories.Length - 1))) / categories.Length;
        _padding = paddingWidth;
    }

    /// <summary>
    /// Scale a category to its position
    /// </summary>
    public int Scale(string category)
    {
        var index = Array.IndexOf(_categories, category);
        if (index == -1) throw new ArgumentException($"Category '{category}' not found in scale");

        return _rangeStart + (index * (_bandwidth + _padding));
    }

    /// <summary>
    /// Width of each band
    /// </summary>
    public int Bandwidth => _bandwidth;
}
```

#### PathGenerator.cs
```csharp
public static class PathGenerator
{
    /// <summary>
    /// Generate SVG path for line chart
    /// Example: "M 0 100 L 50 80 L 100 90 L 150 70"
    /// </summary>
    public static string LinePath(IEnumerable<(int x, int y)> points)
    {
        var sb = new StringBuilder();
        var first = true;

        foreach (var (x, y) in points)
        {
            sb.Append(first ? $"M {x} {y}" : $" L {x} {y}");
            first = false;
        }

        return sb.ToString();
    }

    /// <summary>
    /// Generate SVG path for area chart
    /// Example: "M 0 100 L 50 80 L 100 90 L 100 200 L 50 200 L 0 200 Z"
    /// </summary>
    public static string AreaPath(IEnumerable<(int x, int y)> points, int baselineY)
    {
        var pointsList = points.ToList();
        var sb = new StringBuilder();

        // Top line (left to right)
        for (int i = 0; i < pointsList.Count; i++)
        {
            var (x, y) = pointsList[i];
            sb.Append(i == 0 ? $"M {x} {y}" : $" L {x} {y}");
        }

        // Bottom line (right to left)
        for (int i = pointsList.Count - 1; i >= 0; i--)
        {
            var (x, _) = pointsList[i];
            sb.Append($" L {x} {baselineY}");
        }

        sb.Append(" Z"); // Close path
        return sb.ToString();
    }

    /// <summary>
    /// Generate SVG path for pie slice
    /// </summary>
    public static string PieSlicePath(int cx, int cy, int radius, double startAngle, double endAngle)
    {
        var x1 = cx + (int)(radius * Math.Cos(startAngle));
        var y1 = cy + (int)(radius * Math.Sin(startAngle));
        var x2 = cx + (int)(radius * Math.Cos(endAngle));
        var y2 = cy + (int)(radius * Math.Sin(endAngle));

        var largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;

        return $"M {cx} {cy} L {x1} {y1} A {radius} {radius} 0 {largeArc} 1 {x2} {y2} Z";
    }
}
```

---

### 2. Chart Plugins

#### BarChartPlugin.cs

```csharp
using Minimact.AspNetCore.Plugins;
using Minimact.AspNetCore.Core;

namespace Minimact.Charts.Plugins;

[MinimactPlugin("BarChart")]
public class BarChartPlugin : MinimactPlugin<BarChartState>
{
    public override string Name => "BarChart";
    public override string Version => "1.0.0";
    public override string Description => "Bar chart with customizable bars and axes";
    public override string Author => "Minimact Team";

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
    protected override VNode RenderTyped(BarChartState state)
    {
        // 1. Create calculator with chart dimensions
        var calculator = new ChartCalculator(state.Width, state.Height, state.Margin);

        // 2. Create scales
        var categories = state.Data.Select(d => d.Category).ToArray();
        var xScale = calculator.CreateBandScale(
            categories,
            state.Margin.Left,
            state.Width - state.Margin.Right
        );

        var maxValue = state.Data.Max(d => d.Value);
        var yScale = calculator.CreateLinearScale(
            0,
            maxValue,
            state.Height - state.Margin.Bottom,
            state.Margin.Top
        );

        // 3. Calculate bar positions (for template binding)
        var barData = state.Data.Select(dataPoint => new
        {
            x = xScale.Scale(dataPoint.Category),
            y = yScale.Scale(dataPoint.Value),
            width = (int)(xScale.Bandwidth * 0.8), // 80% for spacing
            height = (state.Height - state.Margin.Bottom) - yScale.Scale(dataPoint.Value),
            fill = state.BarFill ?? "#8884d8",
            label = dataPoint.Category,
            value = dataPoint.Value
        }).ToArray();

        // 4. Build bar VNodes
        var bars = barData.Select(bar =>
            new VNode("rect", new
            {
                x = bar.x,
                y = bar.y,
                width = bar.width,
                height = bar.height,
                fill = bar.fill,
                className = "chart-bar"
            })
        ).ToArray();

        // 5. Build complete SVG
        return new VNode("svg", new
        {
            width = state.Width,
            height = state.Height,
            viewBox = $"0 0 {state.Width} {state.Height}",
            className = "minimact-bar-chart"
        },
            // Background
            new VNode("rect", new
            {
                width = state.Width,
                height = state.Height,
                fill = state.BackgroundFill ?? "transparent"
            }),

            // Chart area group
            new VNode("g", new { className = "chart-area" }, bars),

            // X Axis
            RenderXAxis(state, xScale),

            // Y Axis
            RenderYAxis(state, yScale)
        );
    }

    private VNode? RenderXAxis(BarChartState state, BandScale xScale)
    {
        if (state.XAxis == null) return null;

        var labels = state.Data.Select(d =>
            new VNode("text", new
            {
                x = xScale.Scale(d.Category) + (xScale.Bandwidth / 2),
                y = state.Height - state.Margin.Bottom + 20,
                textAnchor = "middle",
                fontSize = 12,
                fill = "#666"
            }, d.Category)
        ).ToArray();

        // Axis line
        var axisLine = new VNode("line", new
        {
            x1 = state.Margin.Left,
            y1 = state.Height - state.Margin.Bottom,
            x2 = state.Width - state.Margin.Right,
            y2 = state.Height - state.Margin.Bottom,
            stroke = "#999",
            strokeWidth = 1
        });

        return new VNode("g", new { className = "x-axis" },
            axisLine,
            labels
        );
    }

    private VNode? RenderYAxis(BarChartState state, LinearScale yScale)
    {
        if (state.YAxis == null) return null;

        var ticks = yScale.GetTicks(5);
        var tickElements = ticks.Select(tick =>
            new VNode("g", new { className = "tick" },
                // Tick line
                new VNode("line", new
                {
                    x1 = state.Margin.Left - 5,
                    y1 = yScale.Scale(tick),
                    x2 = state.Margin.Left,
                    y2 = yScale.Scale(tick),
                    stroke = "#999",
                    strokeWidth = 1
                }),
                // Tick label
                new VNode("text", new
                {
                    x = state.Margin.Left - 10,
                    y = yScale.Scale(tick) + 4,
                    textAnchor = "end",
                    fontSize = 12,
                    fill = "#666"
                }, tick.ToString("F0"))
            )
        ).ToArray();

        // Axis line
        var axisLine = new VNode("line", new
        {
            x1 = state.Margin.Left,
            y1 = state.Margin.Top,
            x2 = state.Margin.Left,
            y2 = state.Height - state.Margin.Bottom,
            stroke = "#999",
            strokeWidth = 1
        });

        return new VNode("g", new { className = "y-axis" },
            axisLine,
            tickElements
        );
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
```

---

### 3. State Models

#### BarChartState.cs

```csharp
namespace Minimact.Charts.Models;

public class BarChartState : ChartStateBase
{
    /// <summary>
    /// Chart data points
    /// </summary>
    public List<DataPoint> Data { get; set; } = new();

    /// <summary>
    /// Bar fill color
    /// </summary>
    public string? BarFill { get; set; }

    /// <summary>
    /// Background fill color
    /// </summary>
    public string? BackgroundFill { get; set; }

    /// <summary>
    /// X-axis configuration
    /// </summary>
    public XAxisConfig? XAxis { get; set; }

    /// <summary>
    /// Y-axis configuration
    /// </summary>
    public YAxisConfig? YAxis { get; set; }

    /// <summary>
    /// Tooltip configuration
    /// </summary>
    public TooltipConfig? Tooltip { get; set; }

    /// <summary>
    /// Legend configuration
    /// </summary>
    public LegendConfig? Legend { get; set; }
}

public class ChartStateBase
{
    public int Width { get; set; } = 600;
    public int Height { get; set; } = 400;
    public ChartMargin Margin { get; set; } = new() { Top = 20, Right = 30, Bottom = 40, Left = 50 };
}

public class ChartMargin
{
    public int Top { get; set; }
    public int Right { get; set; }
    public int Bottom { get; set; }
    public int Left { get; set; }
}

public class DataPoint
{
    public string Category { get; set; } = string.Empty;
    public double Value { get; set; }
    public string? Label { get; set; }
    public string? Fill { get; set; }
}
```

---

## 📡 Client Package (TypeScript)

### index.ts

```typescript
/**
 * @minimact/charts - Client-side chart integration
 *
 * This package provides TypeScript types and client-side utilities
 * for Minimact Charts. The actual rendering happens server-side.
 */

export interface ChartState {
  width: number;
  height: number;
  margin: ChartMargin;
}

export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface DataPoint {
  category: string;
  value: number;
  label?: string;
  fill?: string;
}

export interface BarChartState extends ChartState {
  data: DataPoint[];
  barFill?: string;
  backgroundFill?: string;
  xAxis?: XAxisConfig;
  yAxis?: YAxisConfig;
  tooltip?: TooltipConfig;
  legend?: LegendConfig;
}

export interface LineChartState extends ChartState {
  data: DataPoint[];
  strokeColor?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  fill?: string;
  xAxis?: XAxisConfig;
  yAxis?: YAxisConfig;
  tooltip?: TooltipConfig;
  legend?: LegendConfig;
}

export interface PieChartState extends ChartState {
  data: DataPoint[];
  innerRadius?: number;
  outerRadius?: number;
  cx?: string;
  cy?: string;
  tooltip?: TooltipConfig;
  legend?: LegendConfig;
}

export interface AreaChartState extends ChartState {
  data: DataPoint[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  xAxis?: XAxisConfig;
  yAxis?: YAxisConfig;
  tooltip?: TooltipConfig;
  legend?: LegendConfig;
}

export interface XAxisConfig {
  dataKey: string;
  label?: string;
  tickFormatter?: string;
}

export interface YAxisConfig {
  dataKey?: string;
  label?: string;
  tickFormatter?: string;
  domain?: [number, number];
}

export interface TooltipConfig {
  enabled: boolean;
  formatter?: string;
}

export interface LegendConfig {
  enabled: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

// Re-export for convenience
export type {
  ChartState,
  ChartMargin,
  DataPoint,
  BarChartState,
  LineChartState,
  PieChartState,
  AreaChartState
};
```

---

## 🚀 Usage Examples

### Bar Chart

```tsx
import { useState } from '@minimact/core';
import type { DataPoint } from '@minimact/charts';

export function SalesDashboard() {
  const [salesData] = useState<DataPoint[]>([
    { category: 'Jan', value: 4000 },
    { category: 'Feb', value: 3000 },
    { category: 'Mar', value: 2000 },
    { category: 'Apr', value: 2780 },
    { category: 'May', value: 1890 },
    { category: 'Jun', value: 2390 }
  ]);

  return (
    <div>
      <h1>Sales Dashboard</h1>

      <Plugin name="BarChart" state={{
        data: salesData,
        width: 600,
        height: 400,
        margin: { top: 20, right: 30, bottom: 40, left: 50 },
        barFill: '#8884d8',
        xAxis: { dataKey: 'category' },
        yAxis: {}
      }} />
    </div>
  );
}
```

### Line Chart

```tsx
export function TemperatureChart() {
  const [tempData] = useState<DataPoint[]>([
    { category: '00:00', value: 18 },
    { category: '04:00', value: 16 },
    { category: '08:00', value: 20 },
    { category: '12:00', value: 25 },
    { category: '16:00', value: 23 },
    { category: '20:00', value: 19 }
  ]);

  return (
    <Plugin name="LineChart" state={{
      data: tempData,
      width: 600,
      height: 400,
      strokeColor: '#8884d8',
      strokeWidth: 2,
      xAxis: { dataKey: 'category', label: 'Time' },
      yAxis: { label: 'Temperature (°C)' }
    }} />
  );
}
```

### Pie Chart

```tsx
export function BudgetChart() {
  const [budgetData] = useState<DataPoint[]>([
    { category: 'Housing', value: 1200, fill: '#0088FE' },
    { category: 'Food', value: 600, fill: '#00C49F' },
    { category: 'Transport', value: 300, fill: '#FFBB28' },
    { category: 'Entertainment', value: 200, fill: '#FF8042' }
  ]);

  return (
    <Plugin name="PieChart" state={{
      data: budgetData,
      width: 400,
      height: 400,
      innerRadius: 0,
      outerRadius: 120,
      cx: '50%',
      cy: '50%',
      legend: { enabled: true, position: 'bottom' }
    }} />
  );
}
```

### Area Chart

```tsx
export function RevenueChart() {
  const [revenueData] = useState<DataPoint[]>([
    { category: 'Q1', value: 45000 },
    { category: 'Q2', value: 52000 },
    { category: 'Q3', value: 48000 },
    { category: 'Q4', value: 61000 }
  ]);

  return (
    <Plugin name="AreaChart" state={{
      data: revenueData,
      width: 600,
      height: 400,
      fill: 'rgba(136, 132, 216, 0.3)',
      stroke: '#8884d8',
      strokeWidth: 2,
      xAxis: { dataKey: 'category', label: 'Quarter' },
      yAxis: { label: 'Revenue ($)' }
    }} />
  );
}
```

---

## 📐 Template Patch System Integration

### How Parameterized Templates Work

**Server Side (First Render):**

1. BarChartPlugin calculates bar positions
2. Generates VNode tree with `[LoopTemplate]` attribute
3. Template metadata sent to client:

```json
{
  "stateKey": "data",
  "itemTemplate": {
    "type": "Element",
    "tag": "rect",
    "propsTemplates": {
      "x": { "template": "{0}", "bindings": ["item.x"], "slots": [0] },
      "y": { "template": "{0}", "bindings": ["item.y"], "slots": [0] },
      "width": { "template": "{0}", "bindings": ["item.width"], "slots": [0] },
      "height": { "template": "{0}", "bindings": ["item.height"], "slots": [0] },
      "fill": { "template": "{0}", "bindings": ["item.fill"], "slots": [0] }
    }
  }
}
```

**Client Side (Subsequent Updates):**

1. User updates data: `setSalesData([...newData])`
2. Client runtime:
   - Matches template by `stateKey: "data"`
   - For each item in `newData`:
     - Calculates `x = xScale(item.category)`
     - Calculates `y = yScale(item.value)`
     - Fills template slots: `{0} = x`, `{1} = y`, etc.
   - Updates DOM directly
3. Result: **0ms latency!** ⚡

---

## 🧩 Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

**Deliverables:**
- ✅ Scale calculators (LinearScale, BandScale)
- ✅ PathGenerator utilities
- ✅ ChartCalculator entry point
- ✅ Base state models (ChartStateBase, ChartMargin, DataPoint)

**Files to Create:**
- `Minimact.Charts/Utils/LinearScale.cs`
- `Minimact.Charts/Utils/BandScale.cs`
- `Minimact.Charts/Utils/PathGenerator.cs`
- `Minimact.Charts/Utils/ChartCalculator.cs`
- `Minimact.Charts/Models/ChartStateBase.cs`
- `Minimact.Charts/Models/DataPoint.cs`

**Tests:**
- Unit tests for scale calculations
- Unit tests for path generation
- Validate edge cases (empty data, negative values)

---

### Phase 2: Bar Chart (Week 2)

**Deliverables:**
- ✅ BarChartPlugin with LoopTemplate
- ✅ BarChartState model
- ✅ X/Y axis rendering
- ✅ Bar positioning logic

**Files to Create:**
- `Minimact.Charts/Plugins/BarChartPlugin.cs`
- `Minimact.Charts/Models/BarChartState.cs`
- `Minimact.Charts/Components/XAxisConfig.cs`
- `Minimact.Charts/Components/YAxisConfig.cs`
- `Minimact.Charts/assets/charts.css`

**Tests:**
- Integration test with sample data
- Visual regression test
- Template patch application test

---

### Phase 3: Line Chart (Week 3)

**Deliverables:**
- ✅ LineChartPlugin with LoopTemplate
- ✅ LineChartState model
- ✅ Path-based line rendering
- ✅ Multiple line series support

**Files to Create:**
- `Minimact.Charts/Plugins/LineChartPlugin.cs`
- `Minimact.Charts/Models/LineChartState.cs`
- `Minimact.Charts/Renderers/LineRenderer.cs`

**Tests:**
- Multi-series line chart test
- Smooth curve interpolation test
- Missing data handling test

---

### Phase 4: Pie Chart (Week 4)

**Deliverables:**
- ✅ PieChartPlugin with LoopTemplate
- ✅ PieChartState model
- ✅ Arc path generation
- ✅ Donut chart support (innerRadius)

**Files to Create:**
- `Minimact.Charts/Plugins/PieChartPlugin.cs`
- `Minimact.Charts/Models/PieChartState.cs`
- `Minimact.Charts/Renderers/PieRenderer.cs`

**Tests:**
- Pie slice calculation test
- Donut chart test
- Label positioning test

---

### Phase 5: Area Chart (Week 5)

**Deliverables:**
- ✅ AreaChartPlugin with LoopTemplate
- ✅ AreaChartState model
- ✅ Filled area path generation
- ✅ Stacked area support

**Files to Create:**
- `Minimact.Charts/Plugins/AreaChartPlugin.cs`
- `Minimact.Charts/Models/AreaChartState.cs`
- `Minimact.Charts/Renderers/AreaRenderer.cs`

**Tests:**
- Area fill test
- Stacked area test
- Gradient fill test

---

### Phase 6: Client Package (Week 6)

**Deliverables:**
- ✅ TypeScript type definitions
- ✅ NPM package setup
- ✅ Documentation
- ✅ Usage examples

**Files to Create:**
- `src/minimact-charts/src/index.ts`
- `src/minimact-charts/src/types.ts`
- `src/minimact-charts/package.json`
- `src/minimact-charts/README.md`

**Tests:**
- Type checking tests
- Import tests
- Bundle size check

---

### Phase 7: Polish & Documentation (Week 7)

**Deliverables:**
- ✅ Default color palettes
- ✅ Responsive sizing
- ✅ Accessibility (ARIA labels)
- ✅ Comprehensive documentation
- ✅ Interactive examples

**Files to Create:**
- `Minimact.Charts/Utils/ColorPalette.cs`
- `docs/CHARTS_API_REFERENCE.md`
- `docs/CHARTS_EXAMPLES.md`

---

## 🎯 Success Criteria

**MVP is successful when:**

1. ✅ Developer can use Recharts-style JSX syntax
2. ✅ Bar, Line, Pie, Area charts all work
3. ✅ Template patches apply with 0ms latency
4. ✅ TypeScript types provide full IntelliSense
5. ✅ Zero client bundle overhead (server-rendered)
6. ✅ Charts are responsive and accessible
7. ✅ NuGet package can be installed: `dotnet add package Minimact.Charts`
8. ✅ NPM package can be installed: `npm install @minimact/charts`

---

## 🔐 Security Considerations

### Data Validation

**Problem:** Client could send malicious data to plugin.

**Solution:**
1. JSON Schema validation for chart state
2. Boundary checks (min/max values, array lengths)
3. Sanitize labels/categories for XSS prevention

### Asset Serving

**Problem:** CSS could contain malicious code.

**Solution:**
1. Embed CSS as resource (not user-provided)
2. Use Content Security Policy headers
3. Validate CSS at build time

---

## 📊 Performance Targets

| Operation | Target | Actual |
|-----------|--------|--------|
| Plugin discovery | < 50ms | TBD |
| Template registration | < 10ms | TBD |
| Chart rendering (100 data points) | < 50ms | TBD |
| Template patch (data update) | < 2ms | TBD |
| SVG file size (100 data points) | < 10KB | TBD |

---

## 🌐 Browser Compatibility

**SVG Support:**
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Template Patches:**
- Requires Minimact client runtime 1.0.0+
- Requires minimact-plugin package

---

## 📚 Related Documentation

- [Plugin System Implementation Plan](./PLUGIN_SYSTEM_IMPLEMENTATION_PLAN.md)
- [Template Patch System](./TEMPLATE_PATCH_SYSTEM.md)
- [Minimact Swig - Electron Plan](./MINIMACT_SWIG_ELECTRON_PLAN.md)

---

## ✅ Next Steps

1. **Review this plan** - Gather feedback
2. **Phase 1 implementation** - Build scale calculators
3. **Phase 2 implementation** - Build BarChartPlugin
4. **Test with real data** - Validate performance
5. **Iterate** - Refine based on testing

---

**Status:** Ready for implementation! 🚀
**Confidence Level:** 🟢 High
**Philosophy:** Charts should be as easy to use as Recharts, as fast as native rendering, and as lightweight as pure SVG.

Let's build the most elegant charting library for .NET! ✨
