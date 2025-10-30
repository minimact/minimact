# Minimact Plugin System - Comprehensive Implementation Plan

**Version:** 1.0
**Last Updated:** October 29, 2025
**Status:** Design Phase

---

## 🎯 Vision

Create a **server-side C# plugin system** for Minimact that enables third-party developers to build reusable UI widgets distributed as NuGet packages. Plugins leverage Minimact's Template Patch System for instant client updates without requiring separate client bundles.

**Key Principle:** Plugins are **100% server-defined** with **zero client bundle overhead** (no webpack, no separate JS files).

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│   Developer Creates Plugin (NuGet Package)              │
│                                                          │
│   MyPlugin.Clock/                                        │
│   ├── ClockPlugin.cs         [MinimactPlugin]           │
│   ├── ClockState.cs          (state contract)           │
│   ├── clock.schema.json      (validation)               │
│   ├── assets/                                            │
│   │   ├── clock-widget.css                              │
│   │   └── clock-icon.svg                                │
│   └── MyPlugin.Clock.csproj                             │
└─────────────────────────────────────────────────────────┘
                         │
                         │ dotnet pack
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│   NuGet Package: MyPlugin.Clock.1.0.0.nupkg             │
└─────────────────────────────────────────────────────────┘
                         │
                         │ dotnet add package
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│   User's Minimact App                                    │
│                                                          │
│   Program.cs:                                            │
│   builder.Services.AddMinimact(options => {             │
│       options.AutoDiscoverPlugins = true;               │
│       options.RegisterPlugin<ClockPlugin>();  // or     │
│   });                                                    │
│                                                          │
│   Component.tsx:                                         │
│   <Plugin name="Clock" state={currentTime} />           │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Transpile (Babel)
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│   Generated C# Code                                      │
│                                                          │
│   new PluginNode("Clock", state_currentTime)            │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Runtime
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│   Server Plugin Manager                                  │
│   - Discovers plugins via reflection                     │
│   - Validates state with JSON schema                     │
│   - Invokes plugin.Render(state)                         │
│   - Returns VNode with [LoopTemplate] metadata          │
└─────────────────────────────────────────────────────────┘
                         │
                         │ First Render
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│   SignalR: Send Template Patches to Client              │
│   {                                                      │
│     pluginName: "Clock",                                 │
│     version: "1.0.0",                                    │
│     templates: [ /* LoopTemplate metadata */ ],         │
│     assets: [ "/plugin-assets/Clock@1.0.0/clock.css" ]  │
│   }                                                      │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Template Registration
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│   Client (minimact-plugin package)                       │
│   - Registers plugin templates                           │
│   - Loads plugin CSS                                     │
│   - Applies template patches on state change             │
│   - No hydration, no client rendering                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Component Design

### 1. Plugin Contract (Interface)

**File:** `Minimact.AspNetCore/Plugins/IMinimactPlugin.cs`

```csharp
namespace Minimact.AspNetCore.Plugins;

/// <summary>
/// Interface that all Minimact plugins must implement
/// </summary>
public interface IMinimactPlugin
{
    /// <summary>
    /// Unique plugin identifier (e.g., "Clock", "Weather", "Chart")
    /// </summary>
    string Name { get; }

    /// <summary>
    /// Plugin version (semver)
    /// </summary>
    string Version { get; }

    /// <summary>
    /// Plugin description
    /// </summary>
    string Description { get; }

    /// <summary>
    /// Plugin author/publisher
    /// </summary>
    string Author { get; }

    /// <summary>
    /// Render the plugin with given state
    /// </summary>
    VNode Render(object state);

    /// <summary>
    /// Validate that the provided state matches the plugin's contract
    /// </summary>
    bool ValidateState(object state);

    /// <summary>
    /// Get plugin assets (CSS, JS, images)
    /// </summary>
    PluginAssets GetAssets();

    /// <summary>
    /// Get JSON schema for state validation
    /// </summary>
    string GetStateSchema();

    /// <summary>
    /// Initialize plugin (called once on startup)
    /// </summary>
    void Initialize(IServiceProvider services);
}

/// <summary>
/// Base class with default implementations
/// </summary>
public abstract class MinimactPluginBase : IMinimactPlugin
{
    public abstract string Name { get; }
    public abstract string Version { get; }
    public virtual string Description => string.Empty;
    public virtual string Author => string.Empty;

    public abstract VNode Render(object state);

    public virtual bool ValidateState(object state)
    {
        // Default: use JSON schema validation
        var schema = GetStateSchema();
        if (string.IsNullOrEmpty(schema)) return true;
        return JsonSchemaValidator.Validate(state, schema);
    }

    public virtual PluginAssets GetAssets()
    {
        return new PluginAssets();
    }

    public virtual string GetStateSchema()
    {
        // Auto-generate from generic type parameter if available
        return string.Empty;
    }

    public virtual void Initialize(IServiceProvider services)
    {
        // Default: no initialization needed
    }
}

/// <summary>
/// Strongly-typed base class for type-safe state handling
/// </summary>
public abstract class MinimactPlugin<TState> : MinimactPluginBase
{
    public sealed override VNode Render(object state)
    {
        if (state is not TState typedState)
        {
            throw new ArgumentException($"State must be of type {typeof(TState).Name}");
        }
        return RenderTyped(typedState);
    }

    protected abstract VNode RenderTyped(TState state);

    public override string GetStateSchema()
    {
        // Auto-generate JSON schema from TState type
        return JsonSchemaGenerator.Generate<TState>();
    }
}
```

---

### 2. Plugin Attribute

**File:** `Minimact.AspNetCore/Plugins/MinimactPluginAttribute.cs`

```csharp
namespace Minimact.AspNetCore.Plugins;

/// <summary>
/// Marks a class as a Minimact plugin for auto-discovery
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
public class MinimactPluginAttribute : Attribute
{
    public string Name { get; }

    public MinimactPluginAttribute(string name)
    {
        Name = name;
    }
}
```

---

### 3. Plugin Assets

**File:** `Minimact.AspNetCore/Plugins/PluginAssets.cs`

```csharp
namespace Minimact.AspNetCore.Plugins;

public class PluginAssets
{
    /// <summary>
    /// CSS files (embedded or CDN URLs)
    /// </summary>
    public List<string> CssFiles { get; set; } = new();

    /// <summary>
    /// JavaScript files (for complex client interactions)
    /// </summary>
    public List<string> JsFiles { get; set; } = new();

    /// <summary>
    /// Images/icons (embedded or CDN URLs)
    /// </summary>
    public Dictionary<string, string> Images { get; set; } = new();

    /// <summary>
    /// Fonts
    /// </summary>
    public List<string> Fonts { get; set; } = new();

    /// <summary>
    /// Whether assets are embedded resources or external URLs
    /// </summary>
    public AssetSource Source { get; set; } = AssetSource.Embedded;
}

public enum AssetSource
{
    Embedded,   // Assets embedded in assembly
    Cdn,        // External CDN URLs
    Mixed       // Combination of both
}
```

---

### 4. Plugin Manager

**File:** `Minimact.AspNetCore/Plugins/PluginManager.cs`

```csharp
namespace Minimact.AspNetCore.Plugins;

public class PluginManager
{
    private readonly Dictionary<string, IMinimactPlugin> _plugins = new();
    private readonly IServiceProvider _services;
    private readonly ILogger<PluginManager> _logger;

    public PluginManager(IServiceProvider services, ILogger<PluginManager> logger)
    {
        _services = services;
        _logger = logger;
    }

    /// <summary>
    /// Auto-discover plugins via reflection
    /// </summary>
    public void AutoDiscover()
    {
        _logger.LogInformation("Auto-discovering Minimact plugins...");

        var assemblies = AppDomain.CurrentDomain.GetAssemblies();
        var pluginTypes = assemblies
            .SelectMany(a => a.GetTypes())
            .Where(t => !t.IsAbstract && !t.IsInterface)
            .Where(t => typeof(IMinimactPlugin).IsAssignableFrom(t))
            .Where(t => t.GetCustomAttribute<MinimactPluginAttribute>() != null);

        foreach (var type in pluginTypes)
        {
            try
            {
                var plugin = (IMinimactPlugin)ActivatorUtilities.CreateInstance(_services, type);
                Register(plugin);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to instantiate plugin: {type.Name}");
            }
        }

        _logger.LogInformation($"Discovered {_plugins.Count} plugin(s)");
    }

    /// <summary>
    /// Register a plugin instance
    /// </summary>
    public void Register(IMinimactPlugin plugin)
    {
        if (_plugins.ContainsKey(plugin.Name))
        {
            _logger.LogWarning($"Plugin '{plugin.Name}' already registered. Overwriting.");
        }

        plugin.Initialize(_services);
        _plugins[plugin.Name] = plugin;

        _logger.LogInformation($"Registered plugin: {plugin.Name} v{plugin.Version}");
    }

    /// <summary>
    /// Get a plugin by name
    /// </summary>
    public IMinimactPlugin? GetPlugin(string name)
    {
        return _plugins.GetValueOrDefault(name);
    }

    /// <summary>
    /// Render a plugin with state
    /// </summary>
    public VNode? RenderPlugin(string name, object state)
    {
        var plugin = GetPlugin(name);
        if (plugin == null)
        {
            _logger.LogError($"Plugin '{name}' not found");
            return null;
        }

        if (!plugin.ValidateState(state))
        {
            _logger.LogError($"Invalid state for plugin '{name}'");
            return null;
        }

        return plugin.Render(state);
    }

    /// <summary>
    /// Get all registered plugins
    /// </summary>
    public IReadOnlyDictionary<string, IMinimactPlugin> GetAllPlugins()
    {
        return _plugins;
    }
}
```

---

### 5. Plugin VNode Type

**File:** `Minimact.AspNetCore/Core/VNode.cs` (addition)

```csharp
public class PluginNode : VNode
{
    public string PluginName { get; }
    public object State { get; }

    public PluginNode(string pluginName, object state)
        : base("plugin", new { name = pluginName }, null)
    {
        PluginName = pluginName;
        State = state;
    }
}
```

---

### 6. Configuration Options

**File:** `Minimact.AspNetCore/Configuration/MinimactOptions.cs` (addition)

```csharp
public class MinimactOptions
{
    // ... existing options ...

    /// <summary>
    /// Enable automatic plugin discovery via reflection
    /// </summary>
    public bool AutoDiscoverPlugins { get; set; } = true;

    /// <summary>
    /// Plugin asset serving options
    /// </summary>
    public PluginAssetOptions PluginAssets { get; set; } = new();
}

public class PluginAssetOptions
{
    /// <summary>
    /// Base path for serving plugin assets (default: /plugin-assets)
    /// </summary>
    public string BasePath { get; set; } = "/plugin-assets";

    /// <summary>
    /// Whether to version asset URLs (e.g., /plugin-assets/Clock@1.0.0/clock.css)
    /// </summary>
    public bool VersionAssetUrls { get; set; } = true;

    /// <summary>
    /// Cache duration for plugin assets (in seconds)
    /// </summary>
    public int CacheDuration { get; set; } = 86400; // 24 hours
}
```

---

## 🔧 Babel Plugin Integration

### Transform `<Plugin>` JSX to C# Code

**File:** `babel-plugin-minimact/src/analyzers/analyzePluginUsage.cjs`

```javascript
/**
 * Detects <Plugin name="..." state={...} /> JSX elements
 * Transforms to: new PluginNode(name, state)
 */
function analyzePluginUsage(path, componentState) {
  const pluginNodes = [];

  path.traverse({
    JSXElement(nodePath) {
      const openingElement = nodePath.node.openingElement;

      if (openingElement.name.name === 'Plugin') {
        const nameAttr = openingElement.attributes.find(
          attr => attr.name?.name === 'name'
        );
        const stateAttr = openingElement.attributes.find(
          attr => attr.name?.name === 'state'
        );

        if (!nameAttr || !stateAttr) {
          throw new Error('Plugin requires both "name" and "state" attributes');
        }

        const pluginName = nameAttr.value.value; // String literal
        const stateBinding = extractBinding(stateAttr.value); // {currentTime} -> "currentTime"

        pluginNodes.push({
          pluginName,
          stateBinding,
          path: nodePath
        });
      }
    }
  });

  return pluginNodes;
}

module.exports = { analyzePluginUsage };
```

**C# Code Generation:**

```csharp
// Input TSX:
<Plugin name="Clock" state={currentTime} />

// Generated C#:
new PluginNode("Clock", currentTime)
```

---

## 📡 Client-Side Package: `minimact-plugin`

**Package:** `npm install minimact-plugin`

**File:** `src/minimact-plugin/src/index.ts`

```typescript
import { Minimact } from 'minimact-runtime';

export interface PluginTemplate {
  pluginName: string;
  version: string;
  templates: LoopTemplate[];
  assets: PluginAssets;
}

export interface PluginAssets {
  cssFiles: string[];
  jsFiles: string[];
  images: Record<string, string>;
}

export class PluginRenderer {
  private registeredPlugins = new Map<string, PluginTemplate>();

  /**
   * Register a plugin's templates (sent from server on first render)
   */
  registerPlugin(template: PluginTemplate): void {
    const key = `${template.pluginName}@${template.version}`;

    if (this.registeredPlugins.has(key)) {
      console.log(`[minimact-plugin] Plugin ${key} already registered`);
      return;
    }

    // Load CSS assets
    template.assets.cssFiles.forEach(url => {
      this.loadCss(url);
    });

    // Load JS assets (if any)
    template.assets.jsFiles.forEach(url => {
      this.loadScript(url);
    });

    // Register templates with Minimact runtime
    template.templates.forEach(t => {
      Minimact.registerTemplate(template.pluginName, t);
    });

    this.registeredPlugins.set(key, template);
    console.log(`[minimact-plugin] Registered plugin: ${key}`);
  }

  /**
   * Apply plugin template patch
   */
  applyPatch(pluginName: string, state: any, element: HTMLElement): void {
    const template = this.getLatestVersion(pluginName);

    if (!template) {
      console.error(`[minimact-plugin] Plugin not registered: ${pluginName}`);
      return;
    }

    // Apply template using Minimact's template system
    Minimact.applyTemplate(element, template.templates[0], state);
  }

  private getLatestVersion(pluginName: string): PluginTemplate | undefined {
    const versions = Array.from(this.registeredPlugins.keys())
      .filter(k => k.startsWith(pluginName + '@'))
      .sort()
      .reverse();

    return versions.length > 0
      ? this.registeredPlugins.get(versions[0])
      : undefined;
  }

  private loadCss(url: string): void {
    if (document.querySelector(`link[href="${url}"]`)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  }

  private loadScript(url: string): void {
    if (document.querySelector(`script[src="${url}"]`)) return;

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    document.head.appendChild(script);
  }
}

// Global singleton
export const pluginRenderer = new PluginRenderer();

// Auto-register with Minimact runtime
if (typeof window !== 'undefined') {
  (window as any).__minimactPluginRenderer = pluginRenderer;
}
```

---

## 🎨 Example Plugin: Clock Widget

### Plugin Implementation

**File:** `MyPlugin.Clock/ClockPlugin.cs`

```csharp
using Minimact.AspNetCore.Plugins;

namespace MyPlugin.Clock;

[MinimactPlugin("Clock")]
public class ClockPlugin : MinimactPlugin<ClockState>
{
    public override string Name => "Clock";
    public override string Version => "1.0.0";
    public override string Description => "A customizable clock widget";
    public override string Author => "Minimact Team";

    [LoopTemplate("clockData", @"{
      ""stateKey"": ""clockData"",
      ""itemTemplate"": {
        ""type"": ""Element"",
        ""tag"": ""div"",
        ""propsTemplates"": {
          ""className"": {
            ""template"": ""clock-widget {0}"",
            ""bindings"": [""item.theme""],
            ""slots"": [13],
            ""type"": ""dynamic""
          }
        },
        ""childrenTemplates"": [
          {
            ""type"": ""Element"",
            ""tag"": ""div"",
            ""propsTemplates"": {
              ""className"": { ""template"": ""clock-time"", ""type"": ""static"" }
            },
            ""childrenTemplates"": [
              {
                ""type"": ""Text"",
                ""template"": ""{0}:{1}:{2}"",
                ""bindings"": [""item.hours"", ""item.minutes"", ""item.seconds""],
                ""slots"": [0, 3, 6]
              }
            ]
          },
          {
            ""type"": ""Element"",
            ""tag"": ""div"",
            ""propsTemplates"": {
              ""className"": { ""template"": ""clock-date"", ""type"": ""static"" }
            },
            ""childrenTemplates"": [
              {
                ""type"": ""Text"",
                ""template"": ""{0}"",
                ""bindings"": [""item.date""],
                ""slots"": [0]
              }
            ]
          }
        ]
      }
    }")]
    protected override VNode RenderTyped(ClockState state)
    {
        return new VNode("div", new { className = $"clock-widget {state.Theme}" },
            new VNode("div", new { className = "clock-time" },
                $"{state.Hours:D2}:{state.Minutes:D2}:{state.Seconds:D2}"
            ),
            new VNode("div", new { className = "clock-date" },
                state.Date
            )
        );
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

public class ClockState
{
    public int Hours { get; set; }
    public int Minutes { get; set; }
    public int Seconds { get; set; }
    public string Date { get; set; } = string.Empty;
    public string Theme { get; set; } = "light";
    public string Timezone { get; set; } = "UTC";
    public bool ShowTimezone { get; set; } = false;
}
```

**File:** `MyPlugin.Clock/assets/clock-widget.css`

```css
.clock-widget {
  padding: 20px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  text-align: center;
}

.clock-widget.light {
  background: #f0f0f0;
  color: #333;
}

.clock-widget.dark {
  background: #1a1a1a;
  color: #fff;
}

.clock-time {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 10px;
}

.clock-date {
  font-size: 18px;
  opacity: 0.8;
}
```

**File:** `MyPlugin.Clock/clock.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "hours": {
      "type": "integer",
      "minimum": 0,
      "maximum": 23
    },
    "minutes": {
      "type": "integer",
      "minimum": 0,
      "maximum": 59
    },
    "seconds": {
      "type": "integer",
      "minimum": 0,
      "maximum": 59
    },
    "date": {
      "type": "string"
    },
    "theme": {
      "type": "string",
      "enum": ["light", "dark"]
    },
    "timezone": {
      "type": "string"
    },
    "showTimezone": {
      "type": "boolean"
    }
  },
  "required": ["hours", "minutes", "seconds", "date"]
}
```

**File:** `MyPlugin.Clock/MyPlugin.Clock.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <PackageId>MyPlugin.Clock</PackageId>
    <Version>1.0.0</Version>
    <Authors>Minimact Team</Authors>
    <Description>A customizable clock widget for Minimact</Description>
    <PackageTags>minimact;plugin;widget;clock</PackageTags>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Minimact.AspNetCore" Version="1.0.0" />
  </ItemGroup>

  <ItemGroup>
    <EmbeddedResource Include="assets\**\*" />
    <EmbeddedResource Include="clock.schema.json" />
  </ItemGroup>
</Project>
```

---

## 🚀 Usage Example

### 1. Install Plugin

```bash
cd MyMinimactApp
dotnet add package MyPlugin.Clock
```

### 2. Configure in Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMinimact(options =>
{
    // Option A: Auto-discover all plugins
    options.AutoDiscoverPlugins = true;

    // Option B: Explicit registration
    // options.RegisterPlugin<ClockPlugin>();
});

var app = builder.Build();

app.UseMinimact();
app.Run();
```

### 3. Use in TSX Component

```tsx
// Dashboard.tsx
import { useState, useEffect } from 'react';

interface ClockState {
  hours: number;
  minutes: number;
  seconds: number;
  date: string;
  theme: 'light' | 'dark';
  timezone: string;
  showTimezone: boolean;
}

export function Dashboard() {
  const [currentTime, setCurrentTime] = useState<ClockState>({
    hours: 14,
    minutes: 30,
    seconds: 45,
    date: 'October 29, 2025',
    theme: 'light',
    timezone: 'UTC',
    showTimezone: false
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(prev => ({
        ...prev,
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds()
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

### 4. Generated C# Code

```csharp
public partial class Dashboard : MinimactComponent
{
    [State]
    private ClockState currentTime = new()
    {
        Hours = 14,
        Minutes = 30,
        Seconds = 45,
        Date = "October 29, 2025",
        Theme = "light",
        Timezone = "UTC",
        ShowTimezone = false
    };

    protected override VNode Render()
    {
        return new VNode("div", null,
            new VNode("h1", null, "Dashboard"),
            new PluginNode("Clock", currentTime)
        );
    }
}
```

---

## 🔄 Runtime Flow

### First Render (Plugin Not Loaded)

```
1. Component renders → PluginNode("Clock", currentTime)
2. Server's PluginManager.RenderPlugin("Clock", currentTime)
   ├─ Finds ClockPlugin
   ├─ Validates state against clock.schema.json
   └─ Calls ClockPlugin.Render(currentTime) → VNode
3. Server sends HTML + PluginTemplate over SignalR:
   {
     pluginName: "Clock",
     version: "1.0.0",
     templates: [ /* LoopTemplate metadata */ ],
     assets: {
       cssFiles: ["/plugin-assets/Clock@1.0.0/clock-widget.css"]
     }
   }
4. Client (minimact-plugin):
   ├─ Registers plugin templates
   ├─ Loads clock-widget.css
   └─ Stores templates for future use
```

### Subsequent Updates (Plugin Loaded)

```
1. User triggers state change (setCurrentTime)
2. Client updates local state
3. Client matches HintQueue prediction
4. Client applies template patch instantly:
   ├─ Template: "{0}:{1}:{2}"
   ├─ Bindings: ["hours", "minutes", "seconds"]
   └─ Values: [14, 31, 46]
   → DOM updated to "14:31:46"
5. Server confirms (or corrects) via SignalR
```

**Result:** 0ms latency for predicted state changes!

---

## 🧩 Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

**Deliverables:**
- [ ] `IMinimactPlugin` interface
- [ ] `MinimactPluginBase` abstract class
- [ ] `MinimactPlugin<TState>` generic base
- [ ] `MinimactPluginAttribute`
- [ ] `PluginAssets` class
- [ ] `PluginNode` VNode type

**Files to Create:**
- `Minimact.AspNetCore/Plugins/IMinimactPlugin.cs`
- `Minimact.AspNetCore/Plugins/MinimactPluginAttribute.cs`
- `Minimact.AspNetCore/Plugins/PluginAssets.cs`
- `Minimact.AspNetCore/Core/PluginNode.cs`

**Tests:**
- Unit tests for plugin validation
- Integration tests for plugin registration

---

### Phase 2: Plugin Manager (Week 2)

**Deliverables:**
- [ ] `PluginManager` service
- [ ] Auto-discovery via reflection
- [ ] Explicit registration API
- [ ] Plugin asset serving middleware
- [ ] JSON schema validation

**Files to Create:**
- `Minimact.AspNetCore/Plugins/PluginManager.cs`
- `Minimact.AspNetCore/Plugins/JsonSchemaValidator.cs`
- `Minimact.AspNetCore/Middleware/PluginAssetMiddleware.cs`
- `Minimact.AspNetCore/Configuration/MinimactOptions.cs` (update)

**Tests:**
- Test auto-discovery
- Test explicit registration
- Test plugin not found error handling
- Test state validation

---

### Phase 3: Babel Plugin Integration (Week 3)

**Deliverables:**
- [ ] `analyzePluginUsage.cjs` - Detect `<Plugin>` JSX
- [ ] C# code generation for `PluginNode`
- [ ] Type-safe state binding extraction
- [ ] Error handling for missing attributes

**Files to Create:**
- `babel-plugin-minimact/src/analyzers/analyzePluginUsage.cjs`
- `babel-plugin-minimact/src/generators/plugin.cjs`

**Tests:**
- Test `<Plugin name="..." state={...} />` transformation
- Test error on missing name/state
- Test nested plugin usage
- Test plugin in loops

---

### Phase 4: Client Package (Week 4)

**Deliverables:**
- [ ] `minimact-plugin` npm package
- [ ] `PluginRenderer` class
- [ ] Template registration
- [ ] Asset loading (CSS, JS)
- [ ] Integration with Minimact runtime

**Files to Create:**
- `src/minimact-plugin/src/index.ts`
- `src/minimact-plugin/src/PluginRenderer.ts`
- `src/minimact-plugin/package.json`
- `src/minimact-plugin/README.md`

**Tests:**
- Test plugin template registration
- Test CSS loading
- Test template patch application
- Test versioning

---

### Phase 5: Example Plugin (Week 5)

**Deliverables:**
- [ ] `MyPlugin.Clock` NuGet package
- [ ] Complete implementation with templates
- [ ] Embedded CSS assets
- [ ] JSON schema
- [ ] TypeScript typings

**Files to Create:**
- `examples/MyPlugin.Clock/ClockPlugin.cs`
- `examples/MyPlugin.Clock/ClockState.cs`
- `examples/MyPlugin.Clock/assets/clock-widget.css`
- `examples/MyPlugin.Clock/clock.schema.json`
- `examples/MyPlugin.Clock/MyPlugin.Clock.csproj`

**Tests:**
- Integration test with sample app
- Visual regression tests
- Performance benchmarks

---

### Phase 6: Developer Tools (Week 6)

**Deliverables:**
- [ ] `dotnet minimact-plugin` CLI tool
- [ ] `generate-types` command (C# → TypeScript)
- [ ] `validate-schema` command
- [ ] `pack` command for NuGet publishing
- [ ] Plugin template scaffolding

**Files to Create:**
- `tools/Minimact.Plugin.Cli/Program.cs`
- `tools/Minimact.Plugin.Cli/Commands/GenerateTypesCommand.cs`
- `tools/Minimact.Plugin.Cli/Commands/ValidateSchemaCommand.cs`

**Tests:**
- Test type generation
- Test schema validation
- Test scaffolding

---

### Phase 7: Documentation & Examples (Week 7)

**Deliverables:**
- [ ] Plugin development guide
- [ ] API reference
- [ ] Example plugins:
  - Clock widget
  - Weather widget
  - Chart widget
  - Calendar widget
- [ ] Video tutorial

**Files to Create:**
- `docs/PLUGIN_DEVELOPMENT_GUIDE.md`
- `docs/PLUGIN_API_REFERENCE.md`
- `examples/plugins/Weather/`
- `examples/plugins/Chart/`
- `examples/plugins/Calendar/`

---

### Phase 8: Advanced Features (Week 8+)

**Deliverables:**
- [ ] Plugin marketplace
- [ ] Version conflict resolution
- [ ] Plugin sandboxing (iframes/shadow DOM)
- [ ] Plugin analytics
- [ ] Plugin discovery API

---

## 🎯 Success Metrics

**MVP is successful when:**

1. ✅ Developer can create a plugin NuGet package in < 30 minutes
2. ✅ Plugin can be installed with `dotnet add package MyPlugin.X`
3. ✅ Plugin automatically discovered (zero config)
4. ✅ TSX `<Plugin name="X" state={...} />` works seamlessly
5. ✅ Template patches apply with 0ms latency
6. ✅ No client bundle overhead (no webpack needed)
7. ✅ Type-safe state contracts (C# ↔ TypeScript)
8. ✅ Assets (CSS/images) served automatically

**Performance Targets:**

- Plugin discovery: < 50ms on startup
- Template registration: < 10ms per plugin
- Asset loading: < 100ms (cached after first load)
- Template patch application: < 2ms

---

## 🔐 Security Considerations

### Plugin Sandboxing

**Problem:** Malicious plugins could execute arbitrary code on the server.

**Solution:**
1. Plugins run in the same process (trust model similar to NuGet packages)
2. For untrusted plugins, use **plugin sandboxing**:
   - Load plugin assembly in isolated `AssemblyLoadContext`
   - Limit access to sensitive APIs via `[SecuritySafeCritical]`
   - Option to run plugins in separate process via IPC

### State Validation

**Problem:** Client could send malicious state to plugin.

**Solution:**
1. **JSON Schema Validation:** All state validated before passing to plugin
2. **Type Safety:** Strongly-typed `MinimactPlugin<TState>` enforces contracts
3. **Sanitization:** Auto-sanitize strings for XSS prevention

### Asset Serving

**Problem:** Plugin assets could contain malicious code.

**Solution:**
1. **Content-Type enforcement:** CSS must be `text/css`, images must be valid formats
2. **CSP headers:** Strict Content Security Policy for plugin assets
3. **Asset scanning:** Optional malware scanning on plugin install

---

## 🌐 Versioning & Compatibility

### Semantic Versioning

Plugins follow **semver** (MAJOR.MINOR.PATCH):

- **MAJOR:** Breaking changes to state contract
- **MINOR:** New features, backward compatible
- **PATCH:** Bug fixes

### Version Resolution

**Scenario:** App depends on `Clock@1.2.0`, but another plugin depends on `Clock@1.5.0`.

**Resolution:**
1. **Load highest compatible version:** `Clock@1.5.0` (backward compatible)
2. **Multi-version support:** Load both if MAJOR version differs (`Clock@1.5.0` and `Clock@2.0.0`)
3. **Explicit version:** User can pin version in `Program.cs`:
   ```csharp
   options.RegisterPlugin<ClockPlugin>("1.2.0");
   ```

### Client Versioning

**Problem:** Server has `Clock@2.0.0`, but client cached templates for `Clock@1.0.0`.

**Solution:**
1. **Version tag in DOM:** `data-plugin="Clock@2.0.0"`
2. **Cache invalidation:** Client detects version mismatch, requests new templates
3. **Graceful fallback:** If template not found, request from server

---

## 📊 Performance Optimizations

### Template Caching

**Server-Side:**
- Cache plugin VNode output for identical state (memoization)
- Cache template metadata (read from `[LoopTemplate]` once)

**Client-Side:**
- Cache template definitions in `localStorage`
- Cache CSS (browser handles this automatically)

### Lazy Loading

**Default Behavior:**
- Templates sent on first render
- Assets loaded on first render

**Preloading (Optional):**
```csharp
options.PreloadPlugins = new[] { "Clock", "Weather" };
```
- Bundles templates into initial payload
- Inlines critical CSS

### Asset Optimization

**CSS:**
- Minify CSS before embedding
- Use CSS-in-JS for critical styles

**Images:**
- Embed small images as base64
- Use CDN for large assets

---

## 🧪 Testing Strategy

### Unit Tests

**Plugin Contract:**
- Test `IMinimactPlugin` interface compliance
- Test state validation
- Test VNode rendering

**Plugin Manager:**
- Test auto-discovery
- Test explicit registration
- Test plugin not found
- Test version resolution

### Integration Tests

**End-to-End:**
- Install plugin NuGet package
- Use in TSX component
- Verify template patches applied
- Verify assets loaded

**Performance:**
- Benchmark plugin discovery time
- Benchmark template registration
- Benchmark patch application

### Visual Regression Tests

- Snapshot testing for plugin UI
- Cross-browser testing
- Mobile responsiveness

---

## 🚢 Distribution

### NuGet Packages

**Primary Package:**
- `Minimact.AspNetCore` - Core framework with plugin support

**Plugin Packages:**
- `MyPlugin.Clock`
- `MyPlugin.Weather`
- `MyPlugin.Chart`

### NPM Packages

**Client Runtime:**
- `minimact-plugin` - Client-side plugin renderer

### CLI Tools

**Developer CLI:**
```bash
npm install -g minimact-plugin-cli

minimact-plugin create MyPlugin.Calendar
minimact-plugin generate-types
minimact-plugin validate-schema clock.schema.json
minimact-plugin pack
```

---

## 🎓 Developer Experience

### Creating a Plugin (30-Minute Workflow)

```bash
# 1. Create plugin project
dotnet new minimact-plugin -n MyPlugin.Calendar

# 2. Implement plugin
# Edit CalendarPlugin.cs, CalendarState.cs

# 3. Add assets
# Add calendar.css to assets/

# 4. Generate TypeScript types
dotnet minimact-plugin generate-types

# 5. Test locally
dotnet pack
dotnet add package MyPlugin.Calendar --source ./bin/Debug

# 6. Publish to NuGet
dotnet nuget push MyPlugin.Calendar.1.0.0.nupkg
```

### Using a Plugin (5-Minute Workflow)

```bash
# 1. Install plugin
dotnet add package MyPlugin.Calendar

# 2. Use in TSX
# <Plugin name="Calendar" state={calendarState} />

# 3. Run app
dotnet run

# Done! Plugin auto-discovered and rendered.
```

---

## 🏆 Competitive Advantages

**Why Minimact Plugins > WordPress Plugins:**

| Feature | WordPress | Minimact Plugins |
|---------|-----------|------------------|
| **Language** | PHP | C# (strongly-typed) |
| **Distribution** | Manual upload | NuGet (one command) |
| **Client Bundle** | Separate JS/CSS | Zero bundle overhead ✅ |
| **Type Safety** | None | Full TypeScript + C# ✅ |
| **Instant Updates** | No | Template patches (0ms) ✅ |
| **Versioning** | Manual | Semantic versioning ✅ |
| **Security** | High risk | Schema validation ✅ |

**Why Minimact Plugins > React Component Libraries:**

| Feature | React Libs | Minimact Plugins |
|---------|------------|------------------|
| **Bundle Size** | +100KB per lib | 0KB (server-rendered) ✅ |
| **Hydration** | Required | None ✅ |
| **Server-Side** | Limited | Full C# logic ✅ |
| **Predictive Updates** | No | Template patches ✅ |

---

## 🔮 Future Enhancements

### Phase 9: Plugin Marketplace

**Features:**
- Browse plugins by category
- Plugin ratings & reviews
- One-click install
- License management
- Analytics dashboard

### Phase 10: Visual Plugin Builder

**SWIG Integration:**
- Drag-and-drop plugin creation
- Visual template editor
- Live preview
- Auto-generate C# code

### Phase 11: Plugin Analytics

**Track:**
- Plugin usage metrics
- Performance impact
- Error rates
- User engagement

### Phase 12: Plugin Monetization

**Features:**
- Paid plugins (license keys)
- Usage-based billing
- Subscription model
- Revenue sharing

---

## 📚 Related Documentation

- [Template Patch System](./TEMPLATE_PATCH_SYSTEM.md)
- [Minimact Swig - Electron Plan](./MINIMACT_SWIG_ELECTRON_PLAN.md)
- [Client-Server Synchronization](./CLIENT_SERVER_SYNC_ANALYSIS.md)
- [Extension Standards (MES)](./EXTENSION_STANDARDS.md)

---

## ✅ Next Steps

1. **Review this plan** - Gather feedback from team
2. **Phase 1 implementation** - Start with core infrastructure
3. **Create Clock example** - Validate design with real plugin
4. **Iterate** - Refine based on developer experience

---

**Status:** Ready for implementation! 🚀

**Confidence Level:** 🟢 High

**Philosophy:** Plugins should be as easy to create as NuGet packages, as easy to use as JSX components, and as fast as native code.

Let's build the WordPress of the .NET ecosystem—without the hydration tax! ✨
