# Minimact Charts Implementation Plan

**Package:** `@minimact/charts`
**Goal:** Recharts-compatible API with multiple rendering backends
**Status:** 📋 Planning Phase

---

## 🎯 Vision

Create a charting library for Minimact that:

1. **Borrows Recharts' elegant JSX API** - Familiar to React developers
2. **Works with server-side rendering** - Minimact's C#/Rust architecture
3. **Supports multiple renderers** - ApexCharts, Chart.js, SVG, Plotly
4. **Provides fallback rendering** - Server-side SVG when JS disabled
5. **Integrates with Minimact Swig** - Available in hook library for easy project setup

---

## 📦 Package Structure

```
src/minimact-charts/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                      # Main exports
│   ├── types.ts                      # Recharts-compatible types
│   ├── core/
│   │   ├── ChartContext.tsx          # Renderer selection context
│   │   ├── useChart.ts               # Core chart hook
│   │   └── configBuilder.ts          # Transform Recharts → renderer config
│   ├── renderers/
│   │   ├── ApexRenderer.ts           # ApexCharts backend
│   │   ├── ChartJsRenderer.ts        # Chart.js backend
│   │   ├── SvgRenderer.ts            # Server-side SVG
│   │   └── PlotlyRenderer.ts         # Plotly (future)
│   ├── charts/
│   │   ├── BarChart.tsx              # <BarChart> component
│   │   ├── LineChart.tsx             # <LineChart> component
│   │   ├── PieChart.tsx              # <PieChart> component
│   │   ├── AreaChart.tsx             # <AreaChart> component
│   │   └── ComposedChart.tsx         # Mixed charts (future)
│   ├── components/
│   │   ├── Bar.tsx                   # <Bar> config component
│   │   ├── Line.tsx                  # <Line> config component
│   │   ├── Pie.tsx                   # <Pie> config component
│   │   ├── Area.tsx                  # <Area> config component
│   │   ├── XAxis.tsx                 # <XAxis> config component
│   │   ├── YAxis.tsx                 # <YAxis> config component
│   │   ├── Tooltip.tsx               # <Tooltip> config component
│   │   ├── Legend.tsx                # <Legend> config component
│   │   ├── CartesianGrid.tsx         # <CartesianGrid> styling
│   │   └── ResponsiveContainer.tsx   # <ResponsiveContainer> wrapper
│   └── utils/
│       ├── idGenerator.ts            # Unique chart IDs
│       ├── dataTransformer.ts        # Data normalization
│       └── colorPalette.ts           # Default color schemes
├── dist/
│   ├── charts.js                     # UMD bundle
│   ├── charts.min.js                 # Minified
│   └── charts.d.ts                   # TypeScript declarations
└── README.md
```

---

## 🏗️ Architecture

### **1. Component Layer (Recharts-Compatible API)**

Users write familiar Recharts code:

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from '@minimact/charts';

export function SalesDashboard() {
  const [data] = useState([
    { month: 'Jan', sales: 4000, revenue: 2400 },
    { month: 'Feb', sales: 3000, revenue: 1398 },
    { month: 'Mar', sales: 2000, revenue: 9800 }
  ]);

  return (
    <BarChart width={600} height={300} data={data}>
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="sales" fill="#8884d8" />
      <Bar dataKey="revenue" fill="#82ca9d" />
    </BarChart>
  );
}
```

### **2. Config Builder Layer**

Transforms Recharts component tree → renderer-agnostic config:

```typescript
interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area';
  width: number | string;
  height: number | string;
  data: any[];
  series: SeriesConfig[];
  axes: AxisConfig[];
  tooltip: TooltipConfig;
  legend: LegendConfig;
  grid: GridConfig;
}

function buildChartConfig(props: ChartProps, children: ReactNode): ChartConfig {
  const series = extractSeries(children); // Extract <Bar>, <Line>, etc.
  const axes = extractAxes(children);     // Extract <XAxis>, <YAxis>
  const tooltip = extractTooltip(children);
  const legend = extractLegend(children);

  return {
    type: props.type,
    width: props.width,
    height: props.height,
    data: props.data,
    series,
    axes,
    tooltip,
    legend,
    grid: extractGrid(children)
  };
}
```

### **3. Renderer Layer**

Multiple backends implement common interface:

```typescript
interface ChartRenderer {
  render(element: HTMLElement, config: ChartConfig): ChartInstance;
  update(instance: ChartInstance, config: ChartConfig): void;
  destroy(instance: ChartInstance): void;
}

class ApexRenderer implements ChartRenderer {
  render(element: HTMLElement, config: ChartConfig): ChartInstance {
    const apexConfig = transformToApexConfig(config);
    const chart = new ApexCharts(element, apexConfig);
    chart.render();
    return { type: 'apex', instance: chart };
  }

  update(instance: ChartInstance, config: ChartConfig): void {
    const apexConfig = transformToApexConfig(config);
    instance.instance.updateOptions(apexConfig);
  }

  destroy(instance: ChartInstance): void {
    instance.instance.destroy();
  }
}
```

### **4. Minimact Integration Layer**

Use `useClientComputed` for client-side initialization:

```typescript
export function BarChart({ width, height, data, children }: BarChartProps) {
  const chartId = useState(`chart-${Date.now()}`)[0];
  const renderer = useContext(RendererContext) || 'apex';

  // Build renderer-agnostic config
  const config = buildChartConfig({ type: 'bar', width, height, data }, children);

  // Initialize chart on client
  useClientComputed(`chart-${chartId}`, () => {
    const element = document.getElementById(chartId);
    if (!element) return;

    const rendererInstance = getRenderer(renderer);
    const chart = rendererInstance.render(element, config);

    // Cleanup on unmount
    return () => rendererInstance.destroy(chart);
  }, [data, config]);

  // Server-side: render placeholder div
  return (
    <div
      id={chartId}
      style={{ width, height }}
      data-chart-type="bar"
      data-chart-renderer={renderer}
    />
  );
}
```

---

## 🚀 MVP Feature Checklist

### **Phase 1: Foundation** (Est. 2-3 days)

| Feature | Effort | Priority | Status |
|---------|--------|----------|--------|
| Package scaffold | 2 hours | P0 | 📋 Todo |
| TypeScript types (Recharts-compatible) | 3 hours | P0 | 📋 Todo |
| Config builder core | 4 hours | P0 | 📋 Todo |
| ApexCharts renderer | 4 hours | P0 | 📋 Todo |
| useChart hook | 3 hours | P0 | 📋 Todo |
| ChartContext provider | 2 hours | P0 | 📋 Todo |

### **Phase 2: Basic Charts** (Est. 3-4 days)

| Feature | Effort | Priority | Status |
|---------|--------|----------|--------|
| `<BarChart>` + `<Bar>` | 1 day | P0 | 📋 Todo |
| `<LineChart>` + `<Line>` | 1 day | P0 | 📋 Todo |
| `<PieChart>` + `<Pie>` | 0.5 day | P0 | 📋 Todo |
| `<AreaChart>` + `<Area>` | 0.5 day | P1 | 📋 Todo |
| `<XAxis>` / `<YAxis>` | 1 day | P0 | 📋 Todo |
| `<Tooltip>` | 0.5 day | P0 | 📋 Todo |
| `<Legend>` | 0.5 day | P0 | 📋 Todo |

### **Phase 3: Advanced Features** (Est. 2-3 days)

| Feature | Effort | Priority | Status |
|---------|--------|----------|--------|
| `<CartesianGrid>` | 0.5 day | P1 | 📋 Todo |
| `<ResponsiveContainer>` | 0.5 day | P1 | 📋 Todo |
| Multi-renderer support | 1.5 days | P1 | 📋 Todo |
| Server-side SVG fallback | 2 days | P2 | 📋 Todo |
| Stacked bars/areas | 1 day | P2 | 📋 Todo |
| Multi-axis charts | 1 day | P2 | 📋 Todo |

### **Phase 4: Integration** (Est. 1-2 days)

| Feature | Effort | Priority | Status |
|---------|--------|----------|--------|
| Build system (Rollup/Vite) | 0.5 day | P0 | 📋 Todo |
| Add to Swig hook library | 0.5 day | P0 | 📋 Todo |
| Update Dashboard template | 0.5 day | P0 | 📋 Todo |
| Documentation & examples | 1 day | P0 | 📋 Todo |

**Total MVP Estimate:** 8-12 days

---

## 📐 Recharts API Compatibility

### **Target API Surface**

#### **Chart Components**
```tsx
<BarChart width={600} height={400} data={data}>
  {children}
</BarChart>

<LineChart width={600} height={400} data={data}>
  {children}
</LineChart>

<PieChart width={600} height={400}>
  {children}
</PieChart>

<AreaChart width={600} height={400} data={data}>
  {children}
</AreaChart>
```

#### **Series Components**
```tsx
<Bar dataKey="sales" fill="#8884d8" name="Sales" />
<Line dataKey="revenue" stroke="#82ca9d" strokeWidth={2} />
<Pie data={data} dataKey="value" nameKey="name" />
<Area dataKey="profit" fill="#ffc658" stroke="#ffc658" />
```

#### **Axis Components**
```tsx
<XAxis dataKey="month" />
<YAxis />
<YAxis yAxisId="right" orientation="right" />
```

#### **Utility Components**
```tsx
<Tooltip />
<Tooltip formatter={(value) => `$${value}`} />

<Legend />
<Legend verticalAlign="top" height={36} />

<CartesianGrid strokeDasharray="3 3" />

<ResponsiveContainer width="100%" height={400}>
  <BarChart data={data}>
    {/* ... */}
  </BarChart>
</ResponsiveContainer>
```

---

## 🎨 Renderer Comparison

### **ApexCharts** (Recommended Default)

**Pros:**
- ✅ Modern, actively maintained
- ✅ 300+ chart types
- ✅ Great TypeScript support
- ✅ Professional animations
- ✅ Built-in responsive
- ✅ Interactive tooltips

**Cons:**
- ❌ 165KB (50KB gzipped) - larger than Chart.js
- ❌ Less npm downloads than Chart.js

**Best for:** Production dashboards, business apps

### **Chart.js** (Alternative)

**Pros:**
- ✅ Most popular (4M+ weekly downloads)
- ✅ Smaller (64KB, 20KB gzipped)
- ✅ Simple API
- ✅ Great documentation

**Cons:**
- ❌ Less chart types than Apex
- ❌ Older API design
- ❌ Less built-in interactivity

**Best for:** Simple charts, smaller bundles

### **Server-Side SVG** (Fallback)

**Pros:**
- ✅ Zero client dependencies
- ✅ SEO-friendly
- ✅ Works without JS
- ✅ Fast initial render

**Cons:**
- ❌ No interactivity (unless hydrated)
- ❌ More server processing
- ❌ Complex to implement all features

**Best for:** Static content, accessibility

---

## 🔧 Implementation Details

### **1. Component Extraction Pattern**

Extract child component configs from JSX tree:

```typescript
function extractSeries(children: ReactNode): SeriesConfig[] {
  return React.Children.toArray(children)
    .filter(child => isValidElement(child) &&
            (child.type === Bar || child.type === Line || child.type === Pie))
    .map(child => ({
      type: child.type.name.toLowerCase(), // 'bar', 'line', 'pie'
      dataKey: child.props.dataKey,
      fill: child.props.fill || child.props.stroke,
      name: child.props.name || child.props.dataKey,
      ...child.props
    }));
}

function extractAxes(children: ReactNode): AxisConfig[] {
  return React.Children.toArray(children)
    .filter(child => isValidElement(child) &&
            (child.type === XAxis || child.type === YAxis))
    .map(child => ({
      type: child.type === XAxis ? 'x' : 'y',
      dataKey: child.props.dataKey,
      orientation: child.props.orientation,
      ...child.props
    }));
}
```

### **2. ApexCharts Transformation**

```typescript
function transformToApexConfig(config: ChartConfig): ApexOptions {
  return {
    chart: {
      type: config.type === 'bar' ? 'bar' : config.type,
      width: config.width,
      height: config.height,
      animations: {
        enabled: true,
        speed: 800
      }
    },
    series: config.series.map(series => ({
      name: series.name,
      data: config.data.map(d => d[series.dataKey])
    })),
    xaxis: {
      categories: config.data.map(d => {
        const xAxis = config.axes.find(a => a.type === 'x');
        return xAxis ? d[xAxis.dataKey] : d.name;
      })
    },
    colors: config.series.map(s => s.fill),
    legend: {
      show: config.legend.enabled,
      position: config.legend.position || 'bottom'
    },
    tooltip: {
      enabled: config.tooltip.enabled,
      shared: true,
      intersect: false
    },
    grid: {
      show: config.grid.enabled,
      strokeDashArray: config.grid.strokeDasharray
    }
  };
}
```

### **3. Chart.js Transformation**

```typescript
function transformToChartJsConfig(config: ChartConfig): ChartConfiguration {
  return {
    type: config.type,
    data: {
      labels: config.data.map(d => {
        const xAxis = config.axes.find(a => a.type === 'x');
        return xAxis ? d[xAxis.dataKey] : d.name;
      }),
      datasets: config.series.map(series => ({
        label: series.name,
        data: config.data.map(d => d[series.dataKey]),
        backgroundColor: series.fill,
        borderColor: series.stroke || series.fill,
        borderWidth: series.strokeWidth || 2
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: config.legend.enabled,
          position: config.legend.position || 'top'
        },
        tooltip: {
          enabled: config.tooltip.enabled
        }
      },
      scales: {
        x: {
          display: config.axes.some(a => a.type === 'x')
        },
        y: {
          display: config.axes.some(a => a.type === 'y')
        }
      }
    }
  };
}
```

### **4. Server-Side SVG Rendering**

```typescript
function renderSvg(config: ChartConfig): string {
  const { width, height, data, series } = config;
  const maxValue = Math.max(...data.flatMap(d =>
    series.map(s => d[s.dataKey])
  ));

  const barWidth = (width as number) / data.length * 0.8;
  const barGroupWidth = barWidth / series.length;

  const bars = data.flatMap((datum, dataIndex) =>
    series.map((s, seriesIndex) => {
      const value = datum[s.dataKey];
      const barHeight = (value / maxValue) * (height as number * 0.8);
      const x = dataIndex * barWidth + seriesIndex * barGroupWidth;
      const y = (height as number) - barHeight;

      return `<rect
        x="${x}"
        y="${y}"
        width="${barGroupWidth * 0.9}"
        height="${barHeight}"
        fill="${s.fill}"
      />`;
    })
  ).join('\n');

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <g class="bars">${bars}</g>
  </svg>`;
}
```

---

## 🧪 Testing Strategy

### **Unit Tests**
- Config builder logic
- Data transformation
- Component prop extraction
- Renderer transformations

### **Integration Tests**
- Full chart rendering
- State updates trigger re-render
- Multiple charts on same page
- Renderer switching

### **Visual Regression Tests**
- Screenshot comparison
- Chart appearance consistency
- Responsive behavior

---

## 📚 Documentation Plan

### **README.md**
- Quick start guide
- Installation instructions
- Basic examples
- Renderer selection guide

### **API.md**
- Complete component reference
- Prop types and descriptions
- Advanced usage patterns
- Renderer-specific notes

### **EXAMPLES.md**
- Common chart patterns
- Real-world use cases
- Styling customization
- Performance tips

### **MIGRATION.md**
- Differences from Recharts
- Unsupported features
- Workarounds and alternatives

---

## 🔄 Integration with Minimact Ecosystem

### **1. Hook Library Entry**

Add to `src/minimact-swig-electron/src/main/data/hook-library.ts`:

```typescript
{
  id: 'useCharts',
  name: 'Charts (Recharts-compatible)',
  description: 'Bar, Line, Pie, Area charts with ApexCharts/Chart.js rendering',
  category: 'visualization',
  packageName: '@minimact/charts',
  imports: [
    "import { BarChart, Bar, LineChart, Line, PieChart, Pie } from '@minimact/charts';",
    "import { XAxis, YAxis, Tooltip, Legend, CartesianGrid } from '@minimact/charts';"
  ],
  example: `export function SalesDashboard() {
  const [data] = useState([
    { month: 'Jan', sales: 4000, revenue: 2400 },
    { month: 'Feb', sales: 3000, revenue: 1398 },
    { month: 'Mar', sales: 2000, revenue: 9800 },
    { month: 'Apr', sales: 2780, revenue: 3908 },
    { month: 'May', sales: 1890, revenue: 4800 },
    { month: 'Jun', sales: 2390, revenue: 3800 }
  ]);

  return (
    <div>
      <h1>Sales Dashboard</h1>

      {/* Bar Chart */}
      <BarChart width={600} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="sales" fill="#8884d8" name="Sales" />
        <Bar dataKey="revenue" fill="#82ca9d" name="Revenue" />
      </BarChart>

      {/* Line Chart */}
      <LineChart width={600} height={300} data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="sales" stroke="#8884d8" />
        <Line type="monotone" dataKey="revenue" stroke="#82ca9d" />
      </LineChart>
    </div>
  );
}`,
  isDefault: false
}
```

### **2. Swig Package Copying**

Update `HookExampleGenerator.ts` to copy chart renderer libraries:

```typescript
// Copy ApexCharts to wwwroot/js
if (selectedHooks.includes('useCharts')) {
  await this.copyApexCharts(projectPath);
}

private async copyApexCharts(projectPath: string): Promise<void> {
  const jsDir = path.join(projectPath, 'wwwroot', 'js');
  const source = path.join(__dirname, '..', '..', 'mact_modules', '@minimact', 'charts', 'dist', 'charts.min.js');
  const dest = path.join(jsDir, 'minimact-charts.min.js');

  await fs.copyFile(source, dest);
  console.log('[HookExampleGenerator] ✓ Copied @minimact/charts → wwwroot/js/minimact-charts.min.js');
}
```

### **3. MinimactPageRenderer Integration**

Add chart extension support:

```csharp
public class MinimactPageRenderOptions
{
    // ... existing properties ...

    /// <summary>
    /// Include @minimact/charts extension script (default: false)
    /// Set to true when using BarChart, LineChart, PieChart components
    /// Adds: <script src="/js/minimact-charts.min.js"></script>
    /// </summary>
    public bool IncludeChartsExtension { get; set; } = false;

    /// <summary>
    /// Chart renderer to use (default: "apex")
    /// Options: "apex" (ApexCharts), "chartjs" (Chart.js), "svg" (server-side)
    /// </summary>
    public string ChartRenderer { get; set; } = "apex";
}
```

### **4. Dashboard Template Update**

Replace pure CSS charts with `@minimact/charts`:

```tsx
import { useState } from 'minimact';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from '@minimact/charts';

export function Index() {
  const [salesData] = useState([
    { month: 'Jan', sales: 45, revenue: 62 },
    { month: 'Feb', sales: 62, revenue: 58 },
    { month: 'Mar', sales: 58, revenue: 71 },
    { month: 'Apr', sales: 71, revenue: 89 },
    { month: 'May', sales: 89, revenue: 94 },
    { month: 'Jun', sales: 94, revenue: 102 }
  ]);

  const [metrics] = useState([
    { label: 'Total Sales', value: '$124,532', change: '+12.5%', positive: true },
    { label: 'Active Users', value: '8,429', change: '+8.2%', positive: true },
    { label: 'Conversion Rate', value: '3.24%', change: '-0.5%', positive: false },
    { label: 'Avg. Order Value', value: '$89.50', change: '+5.1%', positive: true }
  ]);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Sales Dashboard</h1>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {metrics.map(metric => (
          <div key={metric.label} style={{
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: 'white'
          }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              {metric.label}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
              {metric.value}
            </div>
            <div style={{ fontSize: '14px', color: metric.positive ? '#4CAF50' : '#F44336' }}>
              {metric.change}
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Monthly Performance</h2>
        <BarChart width={800} height={300} data={salesData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="sales" fill="#8884d8" name="Sales ($k)" />
          <Bar dataKey="revenue" fill="#82ca9d" name="Revenue ($k)" />
        </BarChart>
      </div>

      {/* Line Chart */}
      <div>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Trend Analysis</h2>
        <LineChart width={800} height={300} data={salesData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} name="Sales ($k)" />
          <Line type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={2} name="Revenue ($k)" />
        </LineChart>
      </div>
    </div>
  );
}
```

---

## 🚦 Success Metrics

### **MVP Success Criteria**

- ✅ 4 chart types working (Bar, Line, Pie, Area)
- ✅ Recharts API compatibility (core components)
- ✅ ApexCharts renderer functional
- ✅ Integrated with Swig hook library
- ✅ Dashboard template uses @minimact/charts
- ✅ Documentation complete
- ✅ 0 critical bugs
- ✅ Bundle size < 100KB (gzipped)

### **Performance Targets**

- Chart initialization: < 100ms
- Re-render on state change: < 50ms
- Multiple charts on page: < 500ms total
- Memory usage: < 5MB per chart

### **Developer Experience**

- Installation time: < 2 minutes
- Time to first chart: < 5 minutes
- API discoverability: TypeScript IntelliSense
- Migration from Recharts: < 1 hour

---

## 🛣️ Future Roadmap

### **Phase 5: Advanced Charts** (Post-MVP)

- `<ScatterChart>` - Scatter plots
- `<RadarChart>` - Radar/spider charts
- `<RadialBarChart>` - Radial bars
- `<ComposedChart>` - Mixed chart types
- `<Treemap>` - Hierarchical data
- `<Sankey>` - Flow diagrams
- `<Funnel>` - Conversion funnels

### **Phase 6: Interactivity**

- Click events on bars/lines/slices
- Brush selection for zooming
- Synchronized tooltips across multiple charts
- Real-time data updates (WebSocket integration)

### **Phase 7: Customization**

- Custom tooltip renderers
- Custom legend renderers
- Theme support (dark mode, custom palettes)
- Animation customization

### **Phase 8: Performance**

- Virtual scrolling for large datasets
- Data aggregation/sampling
- WebGL rendering for massive datasets
- Server-side data pagination

---

## 📝 Open Questions

1. **Renderer Selection:** Should ApexCharts or Chart.js be the default?
   - **Recommendation:** ApexCharts (more features, modern API)

2. **Server-Side SVG:** MVP or post-MVP?
   - **Recommendation:** Post-MVP (complex, less critical)

3. **ResponsiveContainer:** Use ResizeObserver or percentage width?
   - **Recommendation:** ResizeObserver (better DX)

4. **Bundle Strategy:** Single bundle or separate renderer bundles?
   - **Recommendation:** Separate (users only load chosen renderer)

5. **TypeScript Strictness:** Match Recharts types exactly or improve?
   - **Recommendation:** Match exactly for compatibility

---

## 🎯 Implementation Priority

**Week 1: Foundation**
- Day 1-2: Package scaffold, types, config builder
- Day 3-4: ApexCharts renderer + useChart hook
- Day 5: BarChart + Bar components

**Week 2: Core Charts**
- Day 1: LineChart + Line
- Day 2: PieChart + Pie
- Day 3: XAxis, YAxis, Tooltip, Legend
- Day 4-5: Testing + bug fixes

**Week 3: Integration & Polish**
- Day 1: Build system + bundle optimization
- Day 2: Swig integration (hook library + file copying)
- Day 3: Update Dashboard template
- Day 4-5: Documentation + examples

---

## ✅ Next Steps

1. **Approve this plan** - Review and sign-off
2. **Create package** - Run `npm init` in `src/minimact-charts`
3. **Implement BarChart POC** - Prove the architecture works
4. **Iterate** - Build remaining charts following proven pattern

---

**Estimated Delivery:** 3 weeks from start
**Estimated Effort:** 60-80 developer hours
**Risk Level:** Low (well-defined scope, proven technologies)
**Impact:** High (major DX improvement, production-ready charting)
