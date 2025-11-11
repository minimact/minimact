# @minimact/charts

Server-side charting library for Minimact with zero client bundle overhead. 🌵📊

## Features

✅ **Recharts-inspired API** - Familiar JSX syntax for React developers
✅ **Zero client bundle** - All rendering happens server-side
✅ **Instant updates** - Parameterized template patches for 0ms latency
✅ **Type-safe** - Full TypeScript support
✅ **4 chart types** - Bar, Line, Pie, Area

## Installation

**C# (Server):**
```bash
dotnet add package Minimact.Charts
```

**TypeScript (Client):**
```bash
npm install @minimact/charts
```

## Usage

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
<Plugin name="LineChart" state={{
  data: temperatureData,
  width: 600,
  height: 400,
  strokeColor: '#8884d8',
  strokeWidth: 2,
  smooth: true,
  xAxis: { dataKey: 'time', label: 'Time' },
  yAxis: { label: 'Temperature (°C)' }
}} />
```

### Pie Chart

```tsx
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
```

### Area Chart

```tsx
<Plugin name="AreaChart" state={{
  data: revenueData,
  width: 600,
  height: 400,
  fill: 'rgba(136, 132, 216, 0.3)',
  stroke: '#8884d8',
  strokeWidth: 2,
  smooth: true,
  xAxis: { dataKey: 'quarter', label: 'Quarter' },
  yAxis: { label: 'Revenue ($)' }
}} />
```

## How It Works

1. **You write JSX** with Recharts-style API
2. **Babel transpiles** to C# PluginNode
3. **Server renders** SVG with calculated positions
4. **Template metadata** sent to client on first render
5. **Client registers** parameterized templates
6. **Data updates** apply template patches instantly (0ms!)

## Type Safety

Full TypeScript definitions for all chart states:

```typescript
import type { BarChartState, DataPoint } from '@minimact/charts';

const chartState: BarChartState = {
  data: salesData,
  width: 600,
  height: 400,
  xAxis: { dataKey: 'category' },
  yAxis: { useNiceTicks: true }
};
```

## License

MIT © Minimact Team
