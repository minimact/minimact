# Minimact.Charts

Server-side charting library for Minimact with **zero client bundle overhead**.

## Features

- ✅ **Recharts-inspired API** - Familiar JSX syntax
- ✅ **Zero client bundle** - All rendering happens server-side
- ✅ **Instant updates** - Parameterized template patches for 0ms latency
- ✅ **Type-safe** - Full C# and TypeScript support

## Supported Chart Types

- **BarChart** - Vertical and horizontal bars
- **LineChart** - Single and multi-line charts
- **PieChart** - Pie and donut charts
- **AreaChart** - Filled area charts

## Installation

```bash
dotnet add package Minimact.Charts
```

## Quick Start

```tsx
import { useState } from '@minimact/core';

export function Dashboard() {
  const [salesData] = useState([
    { month: 'Jan', sales: 4000 },
    { month: 'Feb', sales: 3000 },
    { month: 'Mar', sales: 2000 }
  ]);

  return (
    <Plugin name="BarChart" state={{
      data: salesData,
      width: 600,
      height: 400
    }}>
      <XAxis dataKey="month" />
      <YAxis />
      <Bar dataKey="sales" fill="#8884d8" />
    </Plugin>
  );
}
```

## Documentation

For full documentation, visit: [https://github.com/minimact/minimact](https://github.com/minimact/minimact)

## License

MIT © 2025 Minimact Contributors
