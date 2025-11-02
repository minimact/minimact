# Minimact.Powered

Interactive "Powered by Minimact" badge plugin with smooth slide-out animation.

## Features

- ✅ **Smooth animations** - CSS-powered transitions
- ✅ **Instant state updates** - Parameterized template patches
- ✅ **Customizable** - Position, theme, and link options
- ✅ **Zero latency** - Template-based rendering

## Installation

```bash
dotnet add package Minimact.Powered
```

## Quick Start

```tsx
export function MyPage() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <h1>My App</h1>

      <Plugin name="PoweredBadge" state={{
        isExpanded,
        position: 'bottom-right',
        theme: 'dark'
      }}
      onClick={() => setIsExpanded(!isExpanded)} />
    </div>
  );
}
```

## Configuration

- **position**: `'bottom-right'`, `'bottom-left'`, `'top-right'`, `'top-left'`
- **theme**: `'light'`, `'dark'`
- **isExpanded**: `boolean` - Slide-out state
- **link**: Custom URL (default: `https://minimact.dev`)

## Documentation

For full documentation, visit: [https://github.com/minimact/minimact](https://github.com/minimact/minimact)

## License

MIT © 2025 Minimact Contributors
