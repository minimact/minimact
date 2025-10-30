# Creating Plugins for Minimact

Minimact's plugin system allows you to create reusable UI widgets that can be distributed as NuGet packages. Plugins are 100% server-side with zero client bundle overhead, leveraging Minimact's Template Patch System for instant updates.

## What is a Minimact Plugin?

A Minimact plugin is a **server-side C# component** that:

- Renders VNodes based on state
- Validates state contracts using JSON Schema
- Serves embedded assets (CSS, JS, images, fonts)
- Integrates seamlessly with Minimact's predictive rendering

**Key Principle:** Plugins are completely server-defined. No separate client bundles, no webpack configuration, no separate JavaScript files.

## Quick Start: 5-Minute Plugin

Let's create a simple "Badge" plugin from scratch:

```bash
# 1. Create plugin project
mkdir Minimact.Plugin.Badge
cd Minimact.Plugin.Badge

# 2. Create .csproj
dotnet new classlib -f net8.0

# 3. Add Minimact reference
dotnet add reference ../../src/Minimact.AspNetCore/Minimact.AspNetCore.csproj
```

**BadgePlugin.cs:**
```csharp
using Minimact.AspNetCore.Plugins;
using Minimact.AspNetCore.Core;

[MinimactPlugin("Badge")]
public class BadgePlugin : MinimactPlugin<BadgeState>
{
    public override string Name => "Badge";
    public override string Version => "1.0.0";

    protected override VNode RenderTyped(BadgeState state)
    {
        return new VElement("span", new Dictionary<string, string>
        {
            ["className"] = $"badge badge-{state.Color}"
        }, state.Text);
    }
}

public class BadgeState
{
    public string Text { get; set; } = "";
    public string Color { get; set; } = "blue";
}
```

**That's it!** Now use it in TSX:

```tsx
<Plugin name="Badge" state={{ text: "New", color: "red" }} />
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│   Your Plugin (NuGet Package)                            │
│                                                          │
│   MyPlugin/                                              │
│   ├── MyPlugin.cs          [MinimactPlugin]             │
│   ├── MyPluginState.cs     (state contract)             │
│   ├── assets/              (CSS, images, fonts)         │
│   │   └── styles.css                                    │
│   ├── schema.json          (validation)                 │
│   └── MyPlugin.csproj                                   │
└─────────────────────────────────────────────────────────┘
                         │
                         │ dotnet pack
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│   NuGet Package: MyPlugin.1.0.0.nupkg                    │
└─────────────────────────────────────────────────────────┘
                         │
                         │ dotnet add package
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│   User's Minimact App                                    │
│                                                          │
│   // Auto-discovery (zero config)                       │
│   builder.Services.AddMinimact();                       │
│                                                          │
│   // Use in TSX                                          │
│   <Plugin name="MyPlugin" state={myState} />            │
└─────────────────────────────────────────────────────────┘
```

## Complete Example: Clock Plugin

Let's walk through creating a full-featured Clock plugin with themes, assets, and validation.

### Step 1: Project Setup

```bash
mkdir plugins/Minimact.Plugin.Clock
cd plugins/Minimact.Plugin.Clock
```

**Minimact.Plugin.Clock.csproj:**
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <PackageId>Minimact.Plugin.Clock</PackageId>
    <Version>1.0.0</Version>
    <Authors>Your Name</Authors>
    <Description>A customizable clock widget for Minimact</Description>
    <PackageTags>minimact;plugin;clock</PackageTags>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\Minimact.AspNetCore\Minimact.AspNetCore.csproj" />
  </ItemGroup>

  <ItemGroup>
    <!-- Embed assets as resources -->
    <EmbeddedResource Include="assets\**\*" />
    <EmbeddedResource Include="clock.schema.json" />
  </ItemGroup>
</Project>
```

### Step 2: Define State Contract

**ClockState.cs:**
```csharp
namespace Minimact.Plugin.Clock;

public class ClockState
{
    public int Hours { get; set; }
    public int Minutes { get; set; }
    public int Seconds { get; set; }
    public string Date { get; set; } = "";
    public string Theme { get; set; } = "light";
    public bool ShowSeconds { get; set; } = true;
}
```

### Step 3: Create JSON Schema

**clock.schema.json:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "hours": { "type": "integer", "minimum": 0, "maximum": 23 },
    "minutes": { "type": "integer", "minimum": 0, "maximum": 59 },
    "seconds": { "type": "integer", "minimum": 0, "maximum": 59 },
    "date": { "type": "string" },
    "theme": { "type": "string", "enum": ["light", "dark"] },
    "showSeconds": { "type": "boolean" }
  },
  "required": ["hours", "minutes", "seconds", "date"]
}
```

### Step 4: Implement Plugin

**ClockPlugin.cs:**
```csharp
using Minimact.AspNetCore.Plugins;
using Minimact.AspNetCore.Core;

namespace Minimact.Plugin.Clock;

[MinimactPlugin("Clock")]
public class ClockPlugin : MinimactPlugin<ClockState>
{
    public override string Name => "Clock";
    public override string Version => "1.0.0";
    public override string Description => "A customizable clock widget";
    public override string Author => "Your Name";

    protected override VNode RenderTyped(ClockState state)
    {
        var timeString = state.ShowSeconds
            ? $"{state.Hours:D2}:{state.Minutes:D2}:{state.Seconds:D2}"
            : $"{state.Hours:D2}:{state.Minutes:D2}";

        var children = new List<VNode>
        {
            new VElement("div", new Dictionary<string, string>
            {
                ["className"] = "clock-time"
            }, timeString),

            new VElement("div", new Dictionary<string, string>
            {
                ["className"] = "clock-date"
            }, state.Date)
        };

        return new VElement("div", new Dictionary<string, string>
        {
            ["className"] = $"clock-widget {state.Theme}"
        }, children.ToArray());
    }

    public override PluginAssets GetAssets()
    {
        return new PluginAssets
        {
            CssFiles = new List<string>
            {
                "/plugin-assets/Clock@1.0.0/clock-widget.css"
            },
            Source = AssetSource.Embedded
        };
    }
}
```

### Step 5: Add CSS Assets

**assets/clock-widget.css:**
```css
.clock-widget {
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  font-family: 'Segoe UI', sans-serif;
}

.clock-widget.light {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.clock-widget.dark {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  color: #e0e0e0;
}

.clock-time {
  font-size: 48px;
  font-weight: 700;
}

.clock-date {
  font-size: 16px;
  opacity: 0.9;
  margin-top: 8px;
}
```

### Step 6: Build and Test

```bash
# Build the plugin
dotnet build

# Pack as NuGet package (optional)
dotnet pack
```

### Step 7: Use in Your App

**Program.cs:**
```csharp
// Zero config - auto-discovery enabled by default
builder.Services.AddMinimact();

var app = builder.Build();
app.UseMinimact();
app.Run();
```

**Dashboard.tsx:**
```tsx
import { useState, useEffect } from 'react';

interface ClockState {
  hours: number;
  minutes: number;
  seconds: number;
  date: string;
  theme: 'light' | 'dark';
  showSeconds: boolean;
}

export function Dashboard() {
  const [time, setTime] = useState<ClockState>({
    hours: 14,
    minutes: 30,
    seconds: 0,
    date: new Date().toLocaleDateString(),
    theme: 'light',
    showSeconds: true
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime({
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        date: now.toLocaleDateString(),
        theme: 'light',
        showSeconds: true
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <Plugin name="Clock" state={time} />
    </div>
  );
}
```

## Plugin Lifecycle

### 1. Discovery

Minimact auto-discovers plugins on startup:

```csharp
// Scans all assemblies for [MinimactPlugin] attributes
builder.Services.AddMinimact(options =>
{
    options.AutoDiscoverPlugins = true; // Default
});
```

### 2. Registration

Plugins are registered as singletons:

```csharp
// Auto-discovery
var plugin = new ClockPlugin();
plugin.Initialize(services);
pluginManager.Register(plugin);
```

### 3. Rendering

When `<Plugin>` is encountered:

```
1. TSX: <Plugin name="Clock" state={time} />
   ↓
2. Babel: new PluginNode("Clock", time)
   ↓
3. Server: pluginManager.RenderPlugin("Clock", time)
   ├─ Validate state against JSON schema
   ├─ Call plugin.Render(time)
   └─ Return VNode
   ↓
4. Server: Convert VNode → HTML
   ↓
5. Client: Receives HTML + plugin templates
   ├─ Loads clock-widget.css
   ├─ Registers templates
   └─ Applies patches on state changes
```

### 4. Updates

State changes trigger template patches:

```
1. Client: setTime(newTime)
   ↓
2. Client: Applies cached template patch (0ms latency!)
   ↓
3. Client: Syncs state to server
   ↓
4. Server: Validates + confirms
```

## Base Classes

Minimact provides three base classes for plugins:

### 1. IMinimactPlugin (Interface)

Full control, implement everything yourself:

```csharp
public class MyPlugin : IMinimactPlugin
{
    public string Name => "MyPlugin";
    public string Version => "1.0.0";
    public string Description => "";
    public string Author => "";

    public VNode Render(object state) { /* ... */ }
    public bool ValidateState(object state) { /* ... */ }
    public PluginAssets GetAssets() { /* ... */ }
    public string GetStateSchema() { /* ... */ }
    public void Initialize(IServiceProvider services) { /* ... */ }
}
```

### 2. MinimactPluginBase (Abstract Class)

Provides default implementations:

```csharp
public class MyPlugin : MinimactPluginBase
{
    public override string Name => "MyPlugin";
    public override string Version => "1.0.0";

    public override VNode Render(object state)
    {
        // Manually cast state
        var typedState = (MyState)state;
        return new VElement("div", typedState.Text);
    }
}
```

### 3. MinimactPlugin<TState> (Recommended)

Type-safe with auto-validation:

```csharp
public class MyPlugin : MinimactPlugin<MyState>
{
    public override string Name => "MyPlugin";
    public override string Version => "1.0.0";

    protected override VNode RenderTyped(MyState state)
    {
        // State is already typed!
        return new VElement("div", state.Text);
    }
}
```

**Best Practice:** Always use `MinimactPlugin<TState>` for type safety and automatic schema generation.

## VNode Construction

Minimact uses VNodes to represent the virtual DOM:

### VElement

```csharp
// Constructor: VElement(tag, props, children)

// Simple element
new VElement("div", "Hello World")

// Element with props
new VElement("button", new Dictionary<string, string>
{
    ["className"] = "btn btn-primary",
    ["onClick"] = "handleClick"
}, "Click Me")

// Element with children
new VElement("ul", new Dictionary<string, string>
{
    ["className"] = "list"
}, new VNode[]
{
    new VElement("li", "Item 1"),
    new VElement("li", "Item 2")
})
```

### Common Patterns

**Conditional Rendering:**
```csharp
var children = new List<VNode>
{
    new VElement("h1", "Title")
};

if (state.ShowDetails)
{
    children.Add(new VElement("p", state.Details));
}

return new VElement("div", children.ToArray());
```

**List Rendering:**
```csharp
var items = state.Items.Select(item =>
    new VElement("li", new Dictionary<string, string>
    {
        ["key"] = item.Id.ToString()
    }, item.Name)
).ToArray();

return new VElement("ul", items);
```

## Assets Management

### Embedding Assets

```xml
<ItemGroup>
  <EmbeddedResource Include="assets\**\*" />
</ItemGroup>
```

### Asset Types

```csharp
public override PluginAssets GetAssets()
{
    return new PluginAssets
    {
        CssFiles = new List<string>
        {
            "/plugin-assets/MyPlugin@1.0.0/styles.css"
        },
        JsFiles = new List<string>
        {
            "/plugin-assets/MyPlugin@1.0.0/behavior.js"
        },
        Images = new Dictionary<string, string>
        {
            ["icon"] = "/plugin-assets/MyPlugin@1.0.0/icon.png"
        },
        Fonts = new List<string>
        {
            "/plugin-assets/MyPlugin@1.0.0/font.woff2"
        },
        Source = AssetSource.Embedded
    };
}
```

### Asset URLs

Assets are automatically served at:
```
/plugin-assets/{PluginName}@{Version}/{AssetPath}
```

Example:
```
/plugin-assets/Clock@1.0.0/clock-widget.css
/plugin-assets/Weather@2.1.0/weather-icon.png
```

### CDN Assets

For external assets:

```csharp
public override PluginAssets GetAssets()
{
    return new PluginAssets
    {
        CssFiles = new List<string>
        {
            "https://cdn.example.com/my-plugin/styles.css"
        },
        Source = AssetSource.Cdn
    };
}
```

## State Validation

### Automatic Validation

When using `MinimactPlugin<TState>`, schema is auto-generated:

```csharp
public class MyPlugin : MinimactPlugin<MyState> { }

// Schema automatically generated from MyState properties
```

### Custom Validation

Override `GetStateSchema()` for custom validation:

```csharp
public override string GetStateSchema()
{
    return @"{
        ""type"": ""object"",
        ""properties"": {
            ""count"": {
                ""type"": ""integer"",
                ""minimum"": 0,
                ""maximum"": 100
            }
        },
        ""required"": [""count""]
    }";
}
```

### Manual Validation

Override `ValidateState()` for complex logic:

```csharp
public override bool ValidateState(object state)
{
    if (state is not MyState typedState)
        return false;

    // Custom validation logic
    if (typedState.StartDate > typedState.EndDate)
        return false;

    return base.ValidateState(state);
}
```

## Configuration Options

### Auto-Discovery

```csharp
builder.Services.AddMinimact(options =>
{
    options.AutoDiscoverPlugins = true; // Default
});
```

### Explicit Registration

```csharp
builder.Services.AddMinimact(options =>
{
    options.AutoDiscoverPlugins = false;
    options.RegisterPlugin<ClockPlugin>();
    options.RegisterPlugin<WeatherPlugin>();
});
```

### Asset Serving Options

```csharp
builder.Services.AddMinimact(options =>
{
    options.PluginAssets.BasePath = "/assets/plugins";
    options.PluginAssets.VersionAssetUrls = true;
    options.PluginAssets.CacheDuration = 86400; // 24 hours
});
```

## Versioning

Plugins follow semantic versioning (semver):

```
MAJOR.MINOR.PATCH

1.0.0 → 1.0.1 (patch: bug fix)
1.0.0 → 1.1.0 (minor: new feature, backward compatible)
1.0.0 → 2.0.0 (major: breaking change)
```

### Multi-Version Support

Minimact can load multiple versions side-by-side:

```csharp
// Both versions available
pluginManager.GetPlugin("Clock", "1.0.0");
pluginManager.GetPlugin("Clock", "2.0.0");

// Get latest compatible version
pluginManager.GetLatestCompatibleVersion("Clock", "1.0.0");
```

## Best Practices

### 1. Type Safety

✅ **Do:**
```csharp
public class MyPlugin : MinimactPlugin<MyState>
{
    protected override VNode RenderTyped(MyState state)
    {
        return new VElement("div", state.Text);
    }
}
```

❌ **Don't:**
```csharp
public class MyPlugin : MinimactPluginBase
{
    public override VNode Render(object state)
    {
        var text = ((dynamic)state).Text; // Unsafe!
        return new VElement("div", text);
    }
}
```

### 2. State Immutability

✅ **Do:**
```csharp
// TSX
setTime({ ...time, hours: newHours }); // Create new object
```

❌ **Don't:**
```csharp
// TSX
time.hours = newHours; // Mutate existing object
setTime(time);
```

### 3. Asset Organization

✅ **Do:**
```
MyPlugin/
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── images/
│   │   └── icon.png
│   └── fonts/
│       └── font.woff2
```

❌ **Don't:**
```
MyPlugin/
├── styles.css  // Unorganized
├── icon.png
└── font.woff2
```

### 4. Schema Validation

✅ **Do:**
```json
{
  "properties": {
    "count": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100
    }
  },
  "required": ["count"]
}
```

❌ **Don't:**
```json
{
  "properties": {
    "count": { "type": "number" }
  }
}
```

### 5. Logging

✅ **Do:**
```csharp
public override void Initialize(IServiceProvider services)
{
    Console.WriteLine($"[{Name}] Initialized v{Version}");
}
```

## Troubleshooting

### Plugin Not Discovered

**Problem:** Plugin doesn't appear in `pluginManager.GetAllPlugins()`

**Solutions:**
1. Check `[MinimactPlugin]` attribute is present
2. Ensure `AutoDiscoverPlugins = true`
3. Verify assembly is loaded
4. Check plugin implements `IMinimactPlugin`

### Assets Not Loading

**Problem:** CSS/images return 404

**Solutions:**
1. Verify assets are `<EmbeddedResource>`
2. Check asset path matches `GetAssets()` URLs
3. Ensure version in URL matches plugin version
4. Check `UsePluginAssets()` is called in `Program.cs`

### State Validation Fails

**Problem:** Plugin renders blank or errors

**Solutions:**
1. Check state matches JSON schema
2. Verify all required properties are present
3. Test schema with sample data
4. Add logging to `ValidateState()`

### TypeScript Errors

**Problem:** TypeScript complains about state type

**Solutions:**
1. Define TypeScript interface matching C# state
2. Use generic `Plugin<ClockState>` in TSX
3. Generate types from C# (future feature)

## Advanced Topics

### Dependency Injection

Plugins can use DI in `Initialize()`:

```csharp
public override void Initialize(IServiceProvider services)
{
    var logger = services.GetRequiredService<ILogger<MyPlugin>>();
    var config = services.GetRequiredService<IConfiguration>();

    logger.LogInformation("Plugin initialized with config: {Config}", config["MyPlugin:Setting"]);
}
```

### Custom Asset Serving

Override asset resolution:

```csharp
public override PluginAssets GetAssets()
{
    var isDevelopment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";

    return new PluginAssets
    {
        CssFiles = new List<string>
        {
            isDevelopment
                ? "/plugin-assets/MyPlugin@1.0.0/styles.css"
                : "https://cdn.example.com/my-plugin/styles.min.css"
        },
        Source = isDevelopment ? AssetSource.Embedded : AssetSource.Cdn
    };
}
```

### Performance Optimization

Cache expensive computations:

```csharp
private readonly Dictionary<string, VNode> _cache = new();

protected override VNode RenderTyped(MyState state)
{
    var cacheKey = $"{state.Id}-{state.Version}";

    if (_cache.TryGetValue(cacheKey, out var cached))
        return cached;

    var result = /* expensive rendering */;
    _cache[cacheKey] = result;
    return result;
}
```

## Publishing to NuGet

### 1. Pack Plugin

```bash
dotnet pack -c Release
```

### 2. Test Locally

```bash
# In consuming app
dotnet add package Minimact.Plugin.Clock --source ./path/to/nupkg
```

### 3. Publish to NuGet.org

```bash
dotnet nuget push Minimact.Plugin.Clock.1.0.0.nupkg \
  --api-key YOUR_API_KEY \
  --source https://api.nuget.org/v3/index.json
```

## Next Steps

- [Plugin API Reference](/v1.0/api/plugins)
- [Example Plugins](https://github.com/minimact/plugins)
- [Template Patch System](/v1.0/architecture/template-patch-system)

---

**Ready to build your first plugin?** Start with the Quick Start example and publish to NuGet in under an hour! 🚀
