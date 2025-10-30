# @minimact/plugin

> Plugin system for Minimact - Server-side widgets with zero client bundle overhead 🧩

## Overview

`@minimact/plugin` enables third-party developers to build reusable UI widgets as **NuGet packages** that work seamlessly with Minimact's Template Patch System. Plugins are **100% server-defined** with parameterized templates, eliminating the need for separate client bundles.

## Key Features

- ✅ **Zero client bundle overhead** - No webpack, no separate JS files
- ✅ **Server-side rendering** - Plugins defined entirely in C#
- ✅ **Template patches** - Instant updates via Minimact's predictive rendering
- ✅ **Automatic asset loading** - CSS, JS, images, fonts loaded on-demand
- ✅ **Version management** - Semver support with conflict resolution
- ✅ **Type-safe state** - JSON schema validation + TypeScript types

## Installation

```bash
npm install @minimact/plugin
```

## Usage

### 1. Server-Side Plugin (C# NuGet Package)

Create a plugin that implements `IMinimactPlugin`:

```csharp
using Minimact.AspNetCore.Plugins;

[MinimactPlugin("Clock")]
public class ClockPlugin : MinimactPlugin<ClockState>
{
    public override string Name => "Clock";
    public override string Version => "1.0.0";

    [LoopTemplate("clockData", @"{
      ""stateKey"": ""clockData"",
      ""itemTemplate"": {
        ""type"": ""Element"",
        ""tag"": ""div"",
        ""childrenTemplates"": [{
          ""type"": ""Text"",
          ""template"": ""{0}:{1}:{2}"",
          ""bindings"": [""item.hours"", ""item.minutes"", ""item.seconds""]
        }]
      }
    }")]
    protected override VNode RenderTyped(ClockState state)
    {
        return new VNode("div", new { className = "clock-widget" },
            $"{state.Hours:D2}:{state.Minutes:D2}:{state.Seconds:D2}"
        );
    }
}

public class ClockState
{
    public int Hours { get; set; }
    public int Minutes { get; set; }
    public int Seconds { get; set; }
}
```

### 2. Client-Side Integration

The client automatically handles plugin templates:

```typescript
import { pluginRenderer } from '@minimact/plugin';

// Register plugin (sent from server on first render)
pluginRenderer.registerPlugin({
  pluginName: 'Clock',
  version: '1.0.0',
  templates: [ /* server-generated templates */ ],
  assets: {
    cssFiles: ['/plugin-assets/Clock@1.0.0/clock.css'],
    jsFiles: [],
    images: {},
    fonts: []
  }
});

// Apply template with state (called by Minimact runtime)
const element = document.getElementById('clock-widget');
pluginRenderer.applyTemplate('Clock', {
  hours: 14,
  minutes: 30,
  seconds: 45
}, element);
```

### 3. Use in TSX Component

```tsx
import { useState } from 'react';

export function Dashboard() {
  const [currentTime, setCurrentTime] = useState({
    hours: 14,
    minutes: 30,
    seconds: 45
  });

  return (
    <div>
      <h1>Dashboard</h1>
      <Plugin name="Clock" state={currentTime} />
    </div>
  );
}
```

## API Reference

### `PluginRenderer`

Main class for managing plugin templates and rendering.

#### Methods

##### `registerPlugin(template: PluginTemplate): void`

Register a plugin's templates and assets.

**Parameters:**
- `template` - Plugin metadata from server

**Example:**
```typescript
pluginRenderer.registerPlugin({
  pluginName: 'Weather',
  version: '2.1.0',
  templates: [...],
  assets: { cssFiles: [...] }
});
```

##### `applyTemplate(pluginName: string, state: any, element: HTMLElement): void`

Apply plugin template with state to a DOM element.

**Parameters:**
- `pluginName` - Name of the plugin (e.g., "Clock")
- `state` - State object matching plugin's contract
- `element` - Target DOM element

**Example:**
```typescript
pluginRenderer.applyTemplate('Clock', { hours: 10, minutes: 30 }, clockDiv);
```

##### `getPlugin(pluginName: string, version?: string): PluginTemplate | undefined`

Get a registered plugin by name and optional version.

##### `isRegistered(pluginName: string, version?: string): boolean`

Check if a plugin is registered.

##### `unregisterPlugin(pluginName: string, version?: string): void`

Remove a plugin from the registry.

##### `getAllPlugins(): Map<string, PluginTemplate>`

Get all registered plugins.

### Types

#### `PluginTemplate`

```typescript
interface PluginTemplate {
  pluginName: string;
  version: string;
  templates: LoopTemplate[];
  assets: PluginAssets;
  stateSchema?: string;
}
```

#### `PluginAssets`

```typescript
interface PluginAssets {
  cssFiles: string[];
  jsFiles: string[];
  images: Record<string, string>;
  fonts: string[];
}
```

#### `LoopTemplate`

```typescript
interface LoopTemplate {
  stateKey: string;
  arrayBinding: string;
  itemVar: string;
  indexVar?: string;
  keyBinding?: string;
  itemTemplate: ItemTemplate;
}
```

## How It Works

### First Render (Plugin Not Loaded)

1. Component renders → `PluginNode("Clock", currentTime)`
2. Server's `PluginManager` finds plugin and validates state
3. Server sends HTML + `PluginTemplate` over SignalR
4. Client registers plugin templates and loads CSS
5. Templates stored for future use

### Subsequent Updates (Plugin Loaded)

1. State changes → `setCurrentTime({ hours: 14, minutes: 31 })`
2. Client matches HintQueue prediction
3. Client applies template patch instantly (0ms latency!)
4. Server confirms via SignalR

**Result:** Instant updates with no client bundle overhead!

## Performance

- **Plugin registration:** < 10ms per plugin
- **Asset loading:** < 100ms (cached after first load)
- **Template application:** < 2ms
- **Bundle size:** 0KB (server-rendered)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## MES Certification

**Bronze** - Core functionality implemented

Roadmap to Silver:
- [ ] Template composition
- [ ] Expression functions
- [ ] Animation templates

Roadmap to Gold:
- [ ] Plugin marketplace integration
- [ ] Visual builder support
- [ ] Advanced caching strategies

## Related Packages

- [`@minimact/core`](../client-runtime) - Core Minimact runtime
- [`@minimact/punch`](../minimact-punch) - DOM observation addon

## License

MIT

## Contributing

See [PLUGIN_SYSTEM_IMPLEMENTATION_PLAN.md](../../docs/PLUGIN_SYSTEM_IMPLEMENTATION_PLAN.md) for implementation details.

---

**Built with ❤️ by the Minimact Team**
