# Dashboard Template Enhancement Plan

**Version:** 1.0
**Date:** November 2, 2025
**Status:** Design Phase

---

## 🎯 Vision

Transform the **Dashboard template** in Minimact Swig from a basic hand-coded chart example into a **stunning showcase** of the new `@minimact/charts` plugin and `@minimact/powered` badge, demonstrating the power of server-side charting with template patches.

**Key Goals:**
1. ✅ Replace hand-coded SVG bars with real **@minimact/charts** plugin usage
2. ✅ Showcase **all 4 chart types**: Bar, Line, Pie, Area
3. ✅ Add the **@minimact/powered** badge with slide-out animation
4. ✅ Demonstrate **instant updates** via template patches (0ms latency)
5. ✅ Create a **production-ready** dashboard that developers can learn from

---

## 📊 Current State Analysis

### What Exists Now (Dashboard Template)

**Location:** `src/minimact-swig-electron/src/main/services/ProjectManager.ts` (lines 506-620)

**Current Implementation:**
```tsx
export function Index() {
  const [salesData] = useState<ChartData[]>([
    { label: 'Jan', value: 45, color: '#4CAF50' },
    // ... more data
  ]);

  // Hand-coded bar chart with divs
  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
    {salesData.map(data => (
      <div style={{ height: `${(data.value / maxValue) * 100}%` }} />
    ))}
  </div>
}
```

**Problems:**
- ❌ Hand-coded chart using CSS flexbox (not real charting library)
- ❌ Only shows one chart type (bars)
- ❌ No X/Y axes, no grid lines, no tooltips
- ❌ Not using the new @minimact/charts plugin
- ❌ No PoweredBadge integration
- ❌ No demonstration of template patches

---

## 🚀 Enhanced Dashboard Design

### New Dashboard Features

#### 1. **Multiple Chart Showcase**

Display **4 different chart types** to demonstrate the full @minimact/charts capability:

```
┌─────────────────────────────────────────────────────────┐
│  📊 Sales Dashboard                        [Powered By] │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Total   │ │  Active  │ │ Convert  │ │   Avg    │  │
│  │  Sales   │ │  Users   │ │   Rate   │ │  Order   │  │
│  │ $124,532 │ │  8,429   │ │  3.24%   │ │ $89.50   │  │
│  │  +12.5%  │ │  +8.2%   │ │  -0.5%   │ │  +5.1%   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │  📈 Monthly Sales Trend (Bar Chart)              │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │  [Interactive bar chart with axes]       │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌─────────────────────┐ ┌─────────────────────────┐  │
│  │  📊 Revenue (Line)  │ │  💰 Sales Mix (Pie)     │  │
│  │  ┌────────────────┐ │ │  ┌────────────────┐    │  │
│  │  │ [Line chart]   │ │ │  │ [Pie chart]    │    │  │
│  │  └────────────────┘ │ │  └────────────────┘    │  │
│  └─────────────────────┘ └─────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  📈 Quarterly Growth (Area Chart)                │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │  [Area chart with gradient fill]         │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### 2. **Interactive Updates**

Add buttons to demonstrate **instant template patch updates**:

```tsx
<button onClick={() => setTimeRange('week')}>This Week</button>
<button onClick={() => setTimeRange('month')}>This Month</button>
<button onClick={() => setTimeRange('year')}>This Year</button>

// Charts update INSTANTLY (0ms latency via template patches)
```

#### 3. **PoweredBadge Integration**

Add the "Powered by Minimact" badge to bottom-right corner:

```tsx
<Plugin name="PoweredBadge" state={{
  position: 'bottom-right',
  expanded: false,
  theme: 'dark'
}} />
```

- Defaults to collapsed (just cactus icon)
- Slides out on hover
- Links to https://minimact.dev

---

## 📝 Implementation Details

### File Structure

```
ProjectName/
├── Pages/
│   ├── Index.tsx              # Main dashboard (enhanced)
│   └── Examples/              # Created by hook examples (optional)
├── wwwroot/
│   └── js/
│       ├── minimact.js        # Core runtime
│       ├── minimact-charts.min.js   # ← NEW!
│       └── minimact-powered.min.js  # ← NEW!
├── Program.cs                 # Updated to include charts/powered
└── ProjectName.csproj
```

### Enhanced Index.tsx

```tsx
import { useState } from 'minimact';
import type { DataPoint } from '@minimact/charts';

interface MetricData {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

export function Index() {
  // Time range selector
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  // Sales data (changes based on time range)
  const [salesData] = useState<DataPoint[]>([
    { category: 'Jan', value: 4500 },
    { category: 'Feb', value: 6200 },
    { category: 'Mar', value: 5800 },
    { category: 'Apr', value: 7100 },
    { category: 'May', value: 8900 },
    { category: 'Jun', value: 9400 }
  ]);

  // Revenue trend data (for line chart)
  const [revenueData] = useState<DataPoint[]>([
    { category: 'Week 1', value: 12500 },
    { category: 'Week 2', value: 15200 },
    { category: 'Week 3', value: 14800 },
    { category: 'Week 4', value: 18300 }
  ]);

  // Product mix data (for pie chart)
  const [productMixData] = useState<DataPoint[]>([
    { category: 'Electronics', value: 45, fill: '#4CAF50' },
    { category: 'Clothing', value: 25, fill: '#2196F3' },
    { category: 'Food', value: 20, fill: '#FF9800' },
    { category: 'Other', value: 10, fill: '#9C27B0' }
  ]);

  // Quarterly growth data (for area chart)
  const [growthData] = useState<DataPoint[]>([
    { category: 'Q1', value: 45000 },
    { category: 'Q2', value: 52000 },
    { category: 'Q3', value: 48000 },
    { category: 'Q4', value: 61000 }
  ]);

  // Metrics cards
  const [metrics] = useState<MetricData[]>([
    { label: 'Total Sales', value: '$124,532', change: '+12.5%', positive: true },
    { label: 'Active Users', value: '8,429', change: '+8.2%', positive: true },
    { label: 'Conversion Rate', value: '3.24%', change: '-0.5%', positive: false },
    { label: 'Avg. Order Value', value: '$89.50', change: '+5.1%', positive: true }
  ]);

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{ fontSize: '32px', margin: 0 }}>📊 Sales Dashboard</h1>

        {/* Time Range Selector */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setTimeRange('week')}
            style={{
              padding: '8px 16px',
              border: timeRange === 'week' ? '2px solid #4CAF50' : '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            This Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            style={{
              padding: '8px 16px',
              border: timeRange === 'month' ? '2px solid #4CAF50' : '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeRange('year')}
            style={{
              padding: '8px 16px',
              border: timeRange === 'year' ? '2px solid #4CAF50' : '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            This Year
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {metrics.map(metric => (
          <div
            key={metric.label}
            style={{
              padding: '24px',
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
              {metric.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
              {metric.value}
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: metric.positive ? '#4CAF50' : '#F44336'
            }}>
              {metric.change}
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart - Monthly Sales */}
      <div style={{
        padding: '24px',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        backgroundColor: 'white',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
          📈 Monthly Sales Trend
        </h2>

        <Plugin name="BarChart" state={{
          data: salesData,
          width: 800,
          height: 400,
          margin: { top: 20, right: 30, bottom: 50, left: 60 },
          barFill: '#4CAF50',
          showGrid: true,
          xAxis: { dataKey: 'category', label: 'Month' },
          yAxis: { label: 'Sales ($K)', tickCount: 5 }
        }} />
      </div>

      {/* Two Column Layout: Line Chart + Pie Chart */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '30px',
        marginBottom: '30px'
      }}>
        {/* Line Chart - Revenue Trend */}
        <div style={{
          padding: '24px',
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
            📊 Weekly Revenue
          </h2>

          <Plugin name="LineChart" state={{
            data: revenueData,
            width: 450,
            height: 300,
            margin: { top: 20, right: 30, bottom: 50, left: 60 },
            strokeColor: '#2196F3',
            strokeWidth: 3,
            showGrid: true,
            xAxis: { dataKey: 'category' },
            yAxis: { label: 'Revenue ($)', tickCount: 5 }
          }} />
        </div>

        {/* Pie Chart - Product Mix */}
        <div style={{
          padding: '24px',
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
            💰 Sales by Category
          </h2>

          <Plugin name="PieChart" state={{
            data: productMixData,
            width: 450,
            height: 300,
            innerRadius: 0,
            outerRadius: 100,
            cx: '50%',
            cy: '50%'
          }} />
        </div>
      </div>

      {/* Area Chart - Quarterly Growth */}
      <div style={{
        padding: '24px',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        backgroundColor: 'white',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
          📈 Quarterly Growth Trend
        </h2>

        <Plugin name="AreaChart" state={{
          data: growthData,
          width: 800,
          height: 300,
          margin: { top: 20, right: 30, bottom: 50, left: 60 },
          fill: 'rgba(76, 175, 80, 0.3)',
          stroke: '#4CAF50',
          strokeWidth: 2,
          showGrid: true,
          xAxis: { dataKey: 'category', label: 'Quarter' },
          yAxis: { label: 'Revenue ($)', tickCount: 5 }
        }} />
      </div>

      {/* Powered Badge */}
      <Plugin name="PoweredBadge" state={{
        position: 'bottom-right',
        expanded: false,
        theme: 'dark',
        linkUrl: 'https://minimact.dev',
        openInNewTab: true
      }} />
    </div>
  );
}
```

---

## 🔧 Required Changes

### 1. Update ProjectManager.ts

**File:** `src/minimact-swig-electron/src/main/services/ProjectManager.ts`

**Changes:**

#### A. Update `createDashboardTemplate()` method (line 506)

Replace the current hand-coded chart with the enhanced version above.

#### B. Update `copyClientRuntimeToProject()` to include chart/powered packages

**Current (line 619):**
```typescript
await this.copyClientRuntimeToProject(projectPath);
```

**New:**
```typescript
await this.copyClientRuntimeToProject(projectPath);
await this.copyChartPackagesToProject(projectPath);  // ← NEW
await this.copyPoweredPackageToProject(projectPath); // ← NEW
```

#### C. Add new helper methods:

```typescript
/**
 * Copy @minimact/charts package to project
 */
private async copyChartPackagesToProject(projectPath: string): Promise<void> {
  const chartsSource = path.join(__dirname, '../../mact_modules/@minimact/charts/dist/charts.min.js');
  const chartsDest = path.join(projectPath, 'wwwroot/js/minimact-charts.min.js');

  await fs.copyFile(chartsSource, chartsDest);
}

/**
 * Copy @minimact/powered package to project
 */
private async copyPoweredPackageToProject(projectPath: string): Promise<void> {
  const poweredSource = path.join(__dirname, '../../mact_modules/@minimact/powered/dist/powered.min.js');
  const poweredDest = path.join(projectPath, 'wwwroot/js/minimact-powered.min.js');

  await fs.copyFile(poweredSource, poweredDest);
}
```

#### D. Update Program.cs generation

**Current Program.cs includes:**
```csharp
// Client runtime
app.MapGet("/js/minimact.js", async context =>
{
    var js = await File.ReadAllTextAsync("wwwroot/js/minimact.js");
    context.Response.ContentType = "application/javascript";
    await context.Response.WriteAsync(js);
});
```

**Add:**
```csharp
// Charts plugin
app.MapGet("/js/minimact-charts.min.js", async context =>
{
    var js = await File.ReadAllTextAsync("wwwroot/js/minimact-charts.min.js");
    context.Response.ContentType = "application/javascript";
    await context.Response.WriteAsync(js);
});

// Powered badge plugin
app.MapGet("/js/minimact-powered.min.js", async context =>
{
    var js = await File.ReadAllTextAsync("wwwroot/js/minimact-powered.min.js");
    context.Response.ContentType = "application/javascript";
    await context.Response.WriteAsync(js);
});
```

#### E. Update HTML generation to include plugin scripts

**In the Index HTML output, add:**
```html
<script src="/js/minimact-charts.min.js"></script>
<script src="/js/minimact-powered.min.js"></script>
```

---

### 2. Update HookLibrary.ts

**File:** `src/minimact-swig-electron/src/main/data/hook-library.ts`

**Add new entries for Charts and Powered:**

```typescript
{
  id: 'barChart',
  name: 'BarChart (Plugin)',
  description: 'Server-side bar chart with instant template patch updates',
  category: 'charts',
  packageName: '@minimact/charts',
  imports: ["import type { DataPoint } from '@minimact/charts';"],
  example: `export function SalesDashboard() {
  const [salesData] = useState<DataPoint[]>([
    { category: 'Jan', value: 4000 },
    { category: 'Feb', value: 3000 },
    { category: 'Mar', value: 2000 }
  ]);

  return (
    <Plugin name="BarChart" state={{
      data: salesData,
      width: 600,
      height: 400,
      barFill: '#4CAF50',
      xAxis: { dataKey: 'category' },
      yAxis: {}
    }} />
  );
}`,
  isDefault: false
},
{
  id: 'lineChart',
  name: 'LineChart (Plugin)',
  description: 'Server-side line chart with smooth curves',
  category: 'charts',
  packageName: '@minimact/charts',
  imports: ["import type { DataPoint } from '@minimact/charts';"],
  example: `export function TrendAnalysis() {
  const [trendData] = useState<DataPoint[]>([
    { category: 'Week 1', value: 12500 },
    { category: 'Week 2', value: 15200 },
    { category: 'Week 3', value: 14800 }
  ]);

  return (
    <Plugin name="LineChart" state={{
      data: trendData,
      width: 600,
      height: 400,
      strokeColor: '#2196F3',
      xAxis: { dataKey: 'category' },
      yAxis: {}
    }} />
  );
}`,
  isDefault: false
},
{
  id: 'pieChart',
  name: 'PieChart (Plugin)',
  description: 'Server-side pie/donut chart',
  category: 'charts',
  packageName: '@minimact/charts',
  imports: ["import type { DataPoint } from '@minimact/charts';"],
  example: `export function CategoryBreakdown() {
  const [categoryData] = useState<DataPoint[]>([
    { category: 'Electronics', value: 45, fill: '#4CAF50' },
    { category: 'Clothing', value: 25, fill: '#2196F3' },
    { category: 'Food', value: 20, fill: '#FF9800' },
    { category: 'Other', value: 10, fill: '#9C27B0' }
  ]);

  return (
    <Plugin name="PieChart" state={{
      data: categoryData,
      width: 400,
      height: 400,
      cx: '50%',
      cy: '50%'
    }} />
  );
}`,
  isDefault: false
},
{
  id: 'areaChart',
  name: 'AreaChart (Plugin)',
  description: 'Server-side area chart with gradient fill',
  category: 'charts',
  packageName: '@minimact/charts',
  imports: ["import type { DataPoint} from '@minimact/charts';"],
  example: `export function GrowthTrend() {
  const [growthData] = useState<DataPoint[]>([
    { category: 'Q1', value: 45000 },
    { category: 'Q2', value: 52000 },
    { category: 'Q3', value: 48000 },
    { category: 'Q4', value: 61000 }
  ]);

  return (
    <Plugin name="AreaChart" state={{
      data: growthData,
      width: 600,
      height: 400,
      fill: 'rgba(76, 175, 80, 0.3)',
      stroke: '#4CAF50',
      xAxis: { dataKey: 'category' },
      yAxis: {}
    }} />
  );
}`,
  isDefault: false
},
{
  id: 'poweredBadge',
  name: 'PoweredBadge (Plugin)',
  description: 'Interactive "Powered by Minimact" badge with slide-out animation',
  category: 'branding',
  packageName: '@minimact/powered',
  imports: [],
  example: `export function AppLayout() {
  return (
    <div>
      {/* Your app content */}

      <Plugin name="PoweredBadge" state={{
        position: 'bottom-right',
        expanded: false,
        theme: 'dark'
      }} />
    </div>
  );
}`,
  isDefault: false
}
```

---

### 3. Update CreateProject.tsx

**File:** `src/minimact-swig-electron/src/renderer/src/pages/CreateProject.tsx`

**Already updated line 129:**
```tsx
<option value="Dashboard">Dashboard (Charts + Powered Badge)</option>
```

✅ **No further changes needed here!**

---

## 🎯 Success Criteria

**Enhanced Dashboard Template is successful when:**

1. ✅ Creates a project with 4 real chart types (Bar, Line, Pie, Area)
2. ✅ All charts use `@minimact/charts` plugin (not hand-coded)
3. ✅ Charts have proper axes, grid lines, and labels
4. ✅ PoweredBadge appears in bottom-right corner
5. ✅ PoweredBadge slides out on hover
6. ✅ Time range selector updates charts instantly (template patches)
7. ✅ All chart JS packages are copied to wwwroot/js
8. ✅ Program.cs serves chart/powered packages correctly
9. ✅ Project builds and runs successfully
10. ✅ Dashboard looks professional and production-ready

---

## 📊 Performance Targets

| Operation | Target | Expected |
|-----------|--------|----------|
| Initial page load | < 500ms | ~300ms |
| Chart render (first) | < 100ms | ~50ms |
| Chart update (template patch) | < 5ms | ~2ms |
| Badge slide animation | 300ms | 300ms |
| Total JS bundle size | < 150KB | ~120KB |

---

## 🎨 Visual Design

### Color Palette

- **Primary Green:** `#4CAF50` (success, bar charts)
- **Primary Blue:** `#2196F3` (line charts)
- **Orange:** `#FF9800` (warnings, highlights)
- **Purple:** `#9C27B0` (accents)
- **Red:** `#F44336` (negative changes)
- **Gray Background:** `#f5f5f5`
- **White Cards:** `#ffffff` with subtle shadows

### Layout Principles

- **Consistent spacing:** 20-30px between sections
- **Card-based design:** All charts in white cards with borders
- **Responsive grid:** Auto-fit columns (250px min for metrics, 400px for charts)
- **Professional shadows:** `0 2px 4px rgba(0,0,0,0.05)`
- **Clear typography:** system-ui font, clear hierarchy

---

## 🧩 Implementation Phases

### Phase 1: Update Dashboard Template Code (30 minutes)
- ✅ Replace hand-coded chart with enhanced Index.tsx
- ✅ Add all 4 chart types
- ✅ Add PoweredBadge
- ✅ Add time range selector

### Phase 2: Update Package Copying (20 minutes)
- ✅ Add copyChartPackagesToProject() method
- ✅ Add copyPoweredPackageToProject() method
- ✅ Update createDashboardTemplate() to call them

### Phase 3: Update Program.cs Generation (15 minutes)
- ✅ Add routes for chart/powered JS files
- ✅ Update HTML generation to include script tags

### Phase 4: Update Hook Library (20 minutes)
- ✅ Add BarChart, LineChart, PieChart, AreaChart entries
- ✅ Add PoweredBadge entry
- ✅ Categorize as 'charts' and 'branding'

### Phase 5: Testing (30 minutes)
- ✅ Create new Dashboard project in Swig
- ✅ Verify all charts render correctly
- ✅ Verify PoweredBadge appears and animates
- ✅ Test time range selector updates
- ✅ Check browser console for errors
- ✅ Verify template patches are working (0ms updates)

**Total Estimated Time:** ~2 hours

---

## 🔐 Security Considerations

### Data Validation

**Charts:**
- JSON Schema validation for chart state
- Boundary checks (min/max values)
- Sanitize labels/categories for XSS

**Badge:**
- Link URL validation (prevent javascript: URIs)
- Position validation (only allowed values)
- Theme validation (only 'dark' or 'light')

---

## 📚 Documentation Updates Needed

### 1. README.md in generated project

Add section:

```markdown
## 📊 Charts

This project uses **@minimact/charts** for server-side charting:

- **BarChart**: Monthly sales trends
- **LineChart**: Weekly revenue
- **PieChart**: Sales by category
- **AreaChart**: Quarterly growth

All charts update instantly via template patches (0ms latency)!

### Powered Badge

The "Powered by Minimact" badge in the bottom-right corner:
- Slides out on hover
- Links to https://minimact.dev
- Fully customizable (position, theme, etc.)
```

### 2. Comments in Index.tsx

Add explanatory comments:

```tsx
// 📊 Bar Chart - Showcases monthly sales with template patch updates
// When timeRange changes, the chart updates INSTANTLY (0ms latency)
// via parameterized template patches sent from the server!

<Plugin name="BarChart" state={{ ... }} />
```

---

## ✅ Next Steps After Implementation

1. **Create video demo** showing:
   - Dashboard creation in Swig
   - All 4 chart types rendering
   - Instant updates via time range selector
   - PoweredBadge slide-out animation

2. **Write blog post**:
   - "Building Production Dashboards with Minimact Charts"
   - Comparison with client-side libraries (Chart.js, D3.js)
   - Performance metrics (0ms latency updates)

3. **Add to Swig examples gallery**:
   - Screenshot of dashboard
   - "Try Dashboard Template" button
   - Link to GitHub

4. **Create variations**:
   - Dark mode dashboard
   - Real-time dashboard (with WebSocket updates)
   - Multi-page dashboard (tabs/navigation)

---

## 🎓 Learning Outcomes for Developers

After creating a Dashboard project, developers will learn:

1. ✅ How to use the `@minimact/charts` plugin
2. ✅ How to integrate multiple chart types
3. ✅ How template patches enable instant updates
4. ✅ How to use the PoweredBadge plugin
5. ✅ How to structure a professional dashboard
6. ✅ How to use Plugin syntax in Minimact
7. ✅ How server-side rendering works with interactive charts

---

**Status:** Ready for implementation! 🚀
**Confidence:** 🟢 Very High
**Philosophy:** "Dashboards should be as easy to create as they are beautiful to look at."

Let's build the most stunning dashboard template for .NET! ✨
