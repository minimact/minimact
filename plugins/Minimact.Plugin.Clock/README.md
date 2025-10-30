# Minimact.Plugin.Clock

A customizable clock widget plugin for Minimact with real-time updates and theme support.

## Features

- ✅ Real-time clock display
- ✅ Light and dark themes
- ✅ 12-hour and 24-hour formats
- ✅ Optional seconds display
- ✅ Optional timezone display
- ✅ Responsive design
- ✅ Beautiful gradients and animations
- ✅ Zero client bundle overhead (server-rendered)

## Installation

```bash
dotnet add package Minimact.Plugin.Clock
```

## Usage

### 1. Install the plugin

```bash
dotnet add package Minimact.Plugin.Clock
```

### 2. Configure Minimact (Optional - auto-discovery enabled by default)

```csharp
// Program.cs
builder.Services.AddMinimact(options =>
{
    options.AutoDiscoverPlugins = true; // Default
});
```

### 3. Use in your TSX component

```tsx
import { useState, useEffect } from 'react';

interface ClockState {
  hours: number;
  minutes: number;
  seconds: number;
  date: string;
  theme: 'light' | 'dark';
  timezone: string;
  showTimezone: boolean;
  showSeconds: boolean;
  use24Hour: boolean;
}

export function Dashboard() {
  const [currentTime, setCurrentTime] = useState<ClockState>({
    hours: 14,
    minutes: 30,
    seconds: 45,
    date: 'October 29, 2025',
    theme: 'light',
    timezone: 'UTC',
    showTimezone: false,
    showSeconds: true,
    use24Hour: true
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(prev => ({
        ...prev,
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        date: now.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <Plugin name="Clock" state={currentTime} />
    </div>
  );
}
```

## State Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `hours` | `number` | ✅ | - | Hour (0-23) |
| `minutes` | `number` | ✅ | - | Minute (0-59) |
| `seconds` | `number` | ✅ | - | Second (0-59) |
| `date` | `string` | ✅ | - | Formatted date string |
| `theme` | `'light' \| 'dark'` | ❌ | `'light'` | Widget theme |
| `timezone` | `string` | ❌ | `'UTC'` | Timezone identifier |
| `showTimezone` | `boolean` | ❌ | `false` | Show timezone indicator |
| `showSeconds` | `boolean` | ❌ | `true` | Show seconds |
| `use24Hour` | `boolean` | ❌ | `true` | Use 24-hour format |

## Themes

### Light Theme
Beautiful purple gradient with white text:
```tsx
<Plugin name="Clock" state={{ ...currentTime, theme: 'light' }} />
```

### Dark Theme
Sleek dark gradient with light text:
```tsx
<Plugin name="Clock" state={{ ...currentTime, theme: 'dark' }} />
```

## Examples

### Simple Clock (24-hour format)
```tsx
const simpleTime = {
  hours: 14,
  minutes: 30,
  seconds: 45,
  date: 'October 29, 2025',
  theme: 'light',
  showSeconds: true,
  use24Hour: true
};

<Plugin name="Clock" state={simpleTime} />
```

### 12-hour Format with Timezone
```tsx
const detailedTime = {
  hours: 14,
  minutes: 30,
  seconds: 45,
  date: 'October 29, 2025',
  theme: 'dark',
  timezone: 'America/New_York',
  showTimezone: true,
  showSeconds: true,
  use24Hour: false  // Shows "02:30:45 PM"
};

<Plugin name="Clock" state={detailedTime} />
```

### No Seconds Display
```tsx
const noSecondsTime = {
  hours: 14,
  minutes: 30,
  seconds: 0,
  date: 'October 29, 2025',
  theme: 'light',
  showSeconds: false,  // Shows "14:30"
  use24Hour: true
};

<Plugin name="Clock" state={noSecondsTime} />
```

## Performance

- **Template-based rendering** - 0ms latency for state updates
- **Embedded CSS** - No external requests
- **Server-side rendering** - No client JavaScript bundle
- **Cached assets** - 24-hour cache duration

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## License

MIT

## Author

Minimact Team

## Version

1.0.0

## Links

- [Documentation](https://docs.minimact.dev/plugins/clock)
- [GitHub](https://github.com/minimact/plugins)
- [NuGet](https://www.nuget.org/packages/Minimact.Plugin.Clock)
