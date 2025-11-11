# @minimact/powered

Interactive **"Powered by Minimact"** badge plugin with smooth slide-out animation.

## Features

- ✅ **Smooth slide-out animation** - Badge expands on hover/click
- ✅ **Parameterized template patches** - 0ms latency state transitions
- ✅ **Highly configurable** - Position, theme, animation duration
- ✅ **Responsive** - Works on mobile and desktop
- ✅ **Accessible** - Keyboard navigation, reduced motion support
- ✅ **Zero client bundle** - Rendered server-side

## Installation

### C# Package (NuGet)

```bash
dotnet add package Minimact.Powered
```

### TypeScript Types (NPM)

```bash
npm install @minimact/powered
```

## Usage

### Basic Usage

```tsx
import type { PoweredBadgeState } from '@minimact/powered';

export function AppLayout() {
  return (
    <div>
      {/* Your app content */}

      <Plugin name="PoweredBadge" state={{
        position: 'bottom-right',
        expanded: false,
        theme: 'dark'
      } as PoweredBadgeState} />
    </div>
  );
}
```

### Interactive Badge (Hover to Expand)

```tsx
import { useState } from '@minimact/core';
import type { PoweredBadgeState } from '@minimact/powered';

export function AppLayout() {
  const [badgeExpanded, setBadgeExpanded] = useState(false);

  return (
    <div
      onMouseEnter={() => setBadgeExpanded(true)}
      onMouseLeave={() => setBadgeExpanded(false)}
    >
      {/* Your app content */}

      <Plugin name="PoweredBadge" state={{
        position: 'bottom-right',
        expanded: badgeExpanded,
        theme: 'dark'
      } as PoweredBadgeState} />
    </div>
  );
}
```

### Click to Toggle

```tsx
export function AppLayout() {
  const [badgeExpanded, setBadgeExpanded] = useState(false);

  return (
    <div>
      {/* Your app content */}

      <Plugin name="PoweredBadge" state={{
        position: 'bottom-right',
        expanded: badgeExpanded,
        theme: 'dark'
      } as PoweredBadgeState}
      onClick={() => setBadgeExpanded(!badgeExpanded)} />
    </div>
  );
}
```

## Configuration

### PoweredBadgeState

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `position` | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `'bottom-right'` | Badge position on screen |
| `expanded` | `boolean` | `false` | Whether badge is expanded (showing full text) |
| `theme` | `'dark' \| 'light'` | `'dark'` | Color theme |
| `animationDuration` | `number` | `300` | Animation duration in milliseconds |
| `linkUrl` | `string` | `'https://minimact.dev'` | Custom link URL |
| `openInNewTab` | `boolean` | `true` | Whether to open link in new tab |

## Examples

### Different Positions

```tsx
// Top right corner
<Plugin name="PoweredBadge" state={{ position: 'top-right' }} />

// Bottom left corner
<Plugin name="PoweredBadge" state={{ position: 'bottom-left' }} />
```

### Light Theme

```tsx
<Plugin name="PoweredBadge" state={{
  theme: 'light',
  position: 'bottom-right'
}} />
```

### Custom Animation Duration

```tsx
<Plugin name="PoweredBadge" state={{
  animationDuration: 500, // Slower animation
  position: 'bottom-right'
}} />
```

### Custom Link

```tsx
<Plugin name="PoweredBadge" state={{
  linkUrl: 'https://yourdomain.com',
  openInNewTab: false
}} />
```

## How It Works

### Template Patch System

The badge uses **parameterized template patches** for instant state transitions:

1. **Server renders** badge SVG with template metadata
2. **Client registers** template with slots: `className="{0}"`, `width="{1}"`
3. **State changes** (e.g., `setExpanded(true)`)
4. **Client fills** template slots instantly
5. **CSS handles** smooth animation via transitions

**Result:** 0ms latency state updates! ⚡

### Animation Flow

```
Collapsed (48px) → User hovers → Expanded (356px)
      ↓                              ↓
  Only icon                    Icon + Full text
    visible                    with smooth slide
```

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- ✅ Keyboard navigation support
- ✅ `prefers-reduced-motion` support
- ✅ ARIA labels
- ✅ Focus indicators

## License

MIT © Minimact Team
