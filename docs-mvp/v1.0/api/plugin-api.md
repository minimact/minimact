# Plugin API Reference

Complete API reference for developing Minimact plugins.

---

## Core Interfaces

### IMinimactPlugin

The base interface that all plugins must implement.

```csharp
public interface IMinimactPlugin
{
    string Name { get; }
    string Version { get; }
    string Description { get; }
    string Author { get; }

    VNode Render(object state);
    bool ValidateState(object state);
    PluginAssets GetAssets();
    string GetStateSchema();
    void Initialize(IServiceProvider services);
}
```

#### Properties

##### Name
- **Type:** `string`
- **Required:** Yes
- **Description:** Unique plugin identifier (e.g., "Clock", "Weather")
- **Example:** `"Clock"`
- **Notes:** Must match the name used in `<Plugin name="..." />` JSX

##### Version
- **Type:** `string`
- **Required:** Yes
- **Description:** Plugin version following semantic versioning (semver)
- **Example:** `"1.0.0"`
- **Format:** `MAJOR.MINOR.PATCH`

##### Description
- **Type:** `string`
- **Required:** No
- **Description:** Human-readable description of the plugin
- **Example:** `"A customizable clock widget"`

##### Author
- **Type:** `string`
- **Required:** No
- **Description:** Plugin author or organization
- **Example:** `"Minimact Team"`

#### Methods

##### Render
```csharp
VNode Render(object state)
```

Renders the plugin with the provided state.

**Parameters:**
- `state` (object) - The state object passed from the client

**Returns:** `VNode` - Virtual DOM representation of the plugin

**Example:**
```csharp
public VNode Render(object state)
{
    var typedState = (ClockState)state;
    return new VElement("div",
        new Dictionary<string, string> { ["className"] = "clock" },
        $"{typedState.Hours}:{typedState.Minutes}"
    );
}
```

##### ValidateState
```csharp
bool ValidateState(object state)
```

Validates that the state matches the plugin's contract.

**Parameters:**
- `state` (object) - The state object to validate

**Returns:** `bool` - True if valid, false otherwise

**Default Implementation:** Uses JSON Schema validation via `GetStateSchema()`

**Example:**
```csharp
public override bool ValidateState(object state)
{
    if (state is not ClockState clockState)
        return false;

    return clockState.Hours >= 0 && clockState.Hours <= 23 &&
           clockState.Minutes >= 0 && clockState.Minutes <= 59;
}
```

##### GetAssets
```csharp
PluginAssets GetAssets()
```

Returns the plugin's CSS, JavaScript, images, and fonts.

**Returns:** `PluginAssets` - Asset configuration

**Example:**
```csharp
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
```

##### GetStateSchema
```csharp
string GetStateSchema()
```

Returns the JSON Schema for state validation.

**Returns:** `string` - JSON Schema (Draft 7)

**Default Implementation:** Auto-generates from generic type parameter

**Example:**
```csharp
public override string GetStateSchema()
{
    return @"{
        ""type"": ""object"",
        ""properties"": {
            ""hours"": { ""type"": ""integer"", ""minimum"": 0, ""maximum"": 23 },
            ""minutes"": { ""type"": ""integer"", ""minimum"": 0, ""maximum"": 59 }
        },
        ""required"": [""hours"", ""minutes""]
    }";
}
```

##### Initialize
```csharp
void Initialize(IServiceProvider services)
```

Called once when the plugin is registered. Use for setup, dependency injection, etc.

**Parameters:**
- `services` (IServiceProvider) - Service provider for dependency injection

**Example:**
```csharp
public override void Initialize(IServiceProvider services)
{
    var logger = services.GetRequiredService<ILogger<ClockPlugin>>();
    logger.LogInformation("Clock plugin initialized");
}
```

---

## Base Classes

### MinimactPluginBase

Abstract base class providing default implementations.

```csharp
public abstract class MinimactPluginBase : IMinimactPlugin
{
    public abstract string Name { get; }
    public abstract string Version { get; }
    public virtual string Description => string.Empty;
    public virtual string Author => string.Empty;

    public abstract VNode Render(object state);
    public virtual bool ValidateState(object state) { /* JSON Schema */ }
    public virtual PluginAssets GetAssets() { /* Empty */ }
    public virtual string GetStateSchema() { /* Auto-generate */ }
    public virtual void Initialize(IServiceProvider services) { /* No-op */ }
}
```

**Use When:**
- You want default implementations for optional methods
- You need custom state validation logic
- You're handling state as `object` (not strongly-typed)

**Example:**
```csharp
[MinimactPlugin("Badge")]
public class BadgePlugin : MinimactPluginBase
{
    public override string Name => "Badge";
    public override string Version => "1.0.0";

    public override VNode Render(object state)
    {
        var badge = (BadgeState)state;
        return new VElement("span",
            new Dictionary<string, string> { ["className"] = $"badge {badge.Color}" },
            badge.Text
        );
    }
}
```

---

### MinimactPlugin\<TState\>

Generic base class for strongly-typed state handling.

```csharp
public abstract class MinimactPlugin<TState> : MinimactPluginBase
{
    public sealed override VNode Render(object state)
    {
        return RenderTyped((TState)state);
    }

    protected abstract VNode RenderTyped(TState state);

    public override string GetStateSchema()
    {
        return JsonSchemaGenerator.Generate<TState>();
    }
}
```

**Use When:**
- You want type-safe state handling
- You want automatic JSON Schema generation
- You want compile-time type checking

**Example:**
```csharp
[MinimactPlugin("Clock")]
public class ClockPlugin : MinimactPlugin<ClockState>
{
    public override string Name => "Clock";
    public override string Version => "1.0.0";

    protected override VNode RenderTyped(ClockState state)
    {
        return new VElement("div",
            new Dictionary<string, string> { ["className"] = "clock" },
            $"{state.Hours:D2}:{state.Minutes:D2}"
        );
    }
}
```

---

## Attributes

### MinimactPluginAttribute

Marks a class as a Minimact plugin for auto-discovery.

```csharp
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
public class MinimactPluginAttribute : Attribute
{
    public string Name { get; }

    public MinimactPluginAttribute(string name);
}
```

**Usage:**
```csharp
[MinimactPlugin("Clock")]
public class ClockPlugin : MinimactPlugin<ClockState>
{
    // ...
}
```

**Notes:**
- Required for auto-discovery
- Name should match the `Name` property
- Only one attribute per class

---

## Data Classes

### PluginAssets

Defines the assets (CSS, JS, images, fonts) used by a plugin.

```csharp
public class PluginAssets
{
    public List<string> CssFiles { get; set; } = new();
    public List<string> JsFiles { get; set; } = new();
    public Dictionary<string, string> Images { get; set; } = new();
    public List<string> Fonts { get; set; } = new();
    public AssetSource Source { get; set; } = AssetSource.Embedded;
}
```

#### Properties

##### CssFiles
- **Type:** `List<string>`
- **Description:** CSS file paths or URLs
- **Example:** `["/plugin-assets/Clock@1.0.0/clock.css"]`

##### JsFiles
- **Type:** `List<string>`
- **Description:** JavaScript file paths or URLs
- **Example:** `["/plugin-assets/Chart@1.0.0/chart.js"]`

##### Images
- **Type:** `Dictionary<string, string>`
- **Description:** Image name → URL mapping
- **Example:** `{ ["icon"] = "/plugin-assets/Clock@1.0.0/icon.png" }`

##### Fonts
- **Type:** `List<string>`
- **Description:** Font file paths or URLs
- **Example:** `["/plugin-assets/Clock@1.0.0/custom-font.woff2"]`

##### Source
- **Type:** `AssetSource`
- **Description:** Where assets are located
- **Values:**
  - `AssetSource.Embedded` - Embedded in assembly (default)
  - `AssetSource.Cdn` - External CDN URLs
  - `AssetSource.Mixed` - Combination of both

**Example:**
```csharp
public override PluginAssets GetAssets()
{
    return new PluginAssets
    {
        CssFiles = new List<string>
        {
            "/plugin-assets/Clock@1.0.0/clock-widget.css"
        },
        Images = new Dictionary<string, string>
        {
            ["icon"] = "/plugin-assets/Clock@1.0.0/icon.svg"
        },
        Source = AssetSource.Embedded
    };
}
```

---

### AssetSource

Enum defining where plugin assets are located.

```csharp
public enum AssetSource
{
    Embedded,   // Assets embedded in assembly
    Cdn,        // External CDN URLs
    Mixed       // Combination of both
}
```

**Usage:**
```csharp
new PluginAssets
{
    CssFiles = new List<string> { "https://cdn.example.com/widget.css" },
    Source = AssetSource.Cdn
}
```

---

## VNode API

### VElement

Virtual DOM element node.

```csharp
public class VElement : VNode
{
    public string Tag { get; set; }
    public Dictionary<string, string> Props { get; set; }
    public List<VNode> Children { get; set; }
    public string? Key { get; set; }

    // Constructors
    public VElement(string tag)
    public VElement(string tag, Dictionary<string, string> props)
    public VElement(string tag, string textContent)
    public VElement(string tag, Dictionary<string, string> props, string textContent)
    public VElement(string tag, Dictionary<string, string> props, VNode[] children)
    public VElement(string tag, VNode[] children)
}
```

#### Constructors

##### VElement(string tag)
Creates an element with no props or children.

```csharp
var div = new VElement("div");
// <div></div>
```

##### VElement(string tag, Dictionary<string, string> props)
Creates an element with props, no children.

```csharp
var div = new VElement("div", new Dictionary<string, string>
{
    ["className"] = "container",
    ["id"] = "main"
});
// <div className="container" id="main"></div>
```

##### VElement(string tag, string textContent)
Creates an element with text content.

```csharp
var span = new VElement("span", "Hello World");
// <span>Hello World</span>
```

##### VElement(string tag, Dictionary<string, string> props, string textContent)
Creates an element with props and text content.

```csharp
var button = new VElement("button",
    new Dictionary<string, string> { ["className"] = "btn" },
    "Click Me"
);
// <button className="btn">Click Me</button>
```

##### VElement(string tag, Dictionary<string, string> props, VNode[] children)
Creates an element with props and child nodes.

```csharp
var div = new VElement("div",
    new Dictionary<string, string> { ["className"] = "card" },
    new VNode[]
    {
        new VElement("h1", "Title"),
        new VElement("p", "Content")
    }
);
// <div className="card"><h1>Title</h1><p>Content</p></div>
```

##### VElement(string tag, VNode[] children)
Creates an element with child nodes, no props.

```csharp
var ul = new VElement("ul", new VNode[]
{
    new VElement("li", "Item 1"),
    new VElement("li", "Item 2")
});
// <ul><li>Item 1</li><li>Item 2</li></ul>
```

---

### VText

Virtual DOM text node.

```csharp
public class VText : VNode
{
    public string Content { get; set; }

    public VText(string content)
}
```

**Usage:**
```csharp
var text = new VText("Hello World");
// Hello World
```

**Note:** Usually not needed - use `VElement(tag, textContent)` instead.

---

### Fragment

Virtual DOM fragment (multiple root elements).

```csharp
public class Fragment : VNode
{
    public List<VNode> Children { get; set; }

    public Fragment(VNode[] children)
}
```

**Usage:**
```csharp
var fragment = new Fragment(new VNode[]
{
    new VElement("h1", "Title"),
    new VElement("p", "Paragraph")
});
// <h1>Title</h1><p>Paragraph</p>
```

---

## Plugin Manager API

### PluginManager

Service for managing plugin lifecycle.

```csharp
public class PluginManager
{
    public void AutoDiscover()
    public void Register(IMinimactPlugin plugin)
    public IMinimactPlugin? GetPlugin(string name)
    public IMinimactPlugin? GetPlugin(string name, string version)
    public IMinimactPlugin? GetLatestCompatibleVersion(string name, string minVersion)
    public VNode? RenderPlugin(string name, object state)
    public IReadOnlyDictionary<string, IMinimactPlugin> GetAllPlugins()
    public IReadOnlyDictionary<string, IMinimactPlugin>? GetPluginVersions(string name)
    public bool IsPluginRegistered(string name)
    public bool Unregister(string name)
}
```

#### Methods

##### AutoDiscover
```csharp
void AutoDiscover()
```

Scans all loaded assemblies for plugins with `[MinimactPlugin]` attribute.

**Example:**
```csharp
var pluginManager = serviceProvider.GetRequiredService<PluginManager>();
pluginManager.AutoDiscover();
```

##### Register
```csharp
void Register(IMinimactPlugin plugin)
```

Registers a plugin instance explicitly.

**Parameters:**
- `plugin` - Plugin instance to register

**Example:**
```csharp
var clockPlugin = new ClockPlugin();
pluginManager.Register(clockPlugin);
```

##### GetPlugin (by name)
```csharp
IMinimactPlugin? GetPlugin(string name)
```

Gets the latest version of a plugin by name.

**Parameters:**
- `name` - Plugin name

**Returns:** Plugin instance or null if not found

**Example:**
```csharp
var plugin = pluginManager.GetPlugin("Clock");
```

##### GetPlugin (by name and version)
```csharp
IMinimactPlugin? GetPlugin(string name, string version)
```

Gets a specific version of a plugin.

**Parameters:**
- `name` - Plugin name
- `version` - Plugin version (e.g., "1.0.0")

**Returns:** Plugin instance or null if not found

**Example:**
```csharp
var plugin = pluginManager.GetPlugin("Clock", "1.0.0");
```

##### GetLatestCompatibleVersion
```csharp
IMinimactPlugin? GetLatestCompatibleVersion(string name, string minVersion)
```

Gets the latest version compatible with the specified minimum version.

**Parameters:**
- `name` - Plugin name
- `minVersion` - Minimum required version

**Returns:** Latest compatible plugin instance or null

**Example:**
```csharp
// Gets latest 1.x.x version (not 2.0.0)
var plugin = pluginManager.GetLatestCompatibleVersion("Clock", "1.0.0");
```

##### RenderPlugin
```csharp
VNode? RenderPlugin(string name, object state)
```

Validates state and renders a plugin.

**Parameters:**
- `name` - Plugin name
- `state` - State object

**Returns:** VNode or null if plugin not found or validation fails

**Example:**
```csharp
var state = new ClockState { Hours = 14, Minutes = 30, Seconds = 0 };
var vnode = pluginManager.RenderPlugin("Clock", state);
```

##### GetAllPlugins
```csharp
IReadOnlyDictionary<string, IMinimactPlugin> GetAllPlugins()
```

Gets all registered plugins (latest versions only).

**Returns:** Dictionary of plugin name → plugin instance

**Example:**
```csharp
var allPlugins = pluginManager.GetAllPlugins();
foreach (var (name, plugin) in allPlugins)
{
    Console.WriteLine($"{name} v{plugin.Version}");
}
```

##### GetPluginVersions
```csharp
IReadOnlyDictionary<string, IMinimactPlugin>? GetPluginVersions(string name)
```

Gets all versions of a specific plugin.

**Parameters:**
- `name` - Plugin name

**Returns:** Dictionary of version → plugin instance, or null if not found

**Example:**
```csharp
var versions = pluginManager.GetPluginVersions("Clock");
// { "1.0.0" => ClockPlugin, "1.1.0" => ClockPlugin, "2.0.0" => ClockPlugin }
```

##### IsPluginRegistered
```csharp
bool IsPluginRegistered(string name)
```

Checks if a plugin is registered.

**Parameters:**
- `name` - Plugin name

**Returns:** True if registered, false otherwise

**Example:**
```csharp
if (pluginManager.IsPluginRegistered("Clock"))
{
    // Use plugin
}
```

##### Unregister
```csharp
bool Unregister(string name)
```

Unregisters a plugin.

**Parameters:**
- `name` - Plugin name

**Returns:** True if unregistered, false if not found

**Example:**
```csharp
pluginManager.Unregister("Clock");
```

---

## JSON Schema Validator

### JsonSchemaValidator

Validates JSON objects against JSON Schema (Draft 7).

```csharp
public static class JsonSchemaValidator
{
    public static bool Validate(object state, string schemaJson)
}
```

#### Supported Schema Features

**Type Validation:**
- `"type": "null"`
- `"type": "boolean"`
- `"type": "number"`
- `"type": "integer"`
- `"type": "string"`
- `"type": "array"`
- `"type": "object"`

**Object Validation:**
- `"required": ["prop1", "prop2"]`
- `"properties": { "prop1": {...} }`

**String Validation:**
- `"minLength": 5`
- `"maxLength": 100`
- `"enum": ["value1", "value2"]`

**Number Validation:**
- `"minimum": 0`
- `"maximum": 100`

**Array Validation:**
- `"minItems": 1`
- `"maxItems": 10`
- `"items": {...}`

**Example:**
```csharp
var schema = @"{
    ""type"": ""object"",
    ""properties"": {
        ""hours"": { ""type"": ""integer"", ""minimum"": 0, ""maximum"": 23 }
    },
    ""required"": [""hours""]
}";

var state = new { hours = 14 };
bool isValid = JsonSchemaValidator.Validate(state, schema); // true

var invalidState = new { hours = 25 };
bool isValid2 = JsonSchemaValidator.Validate(invalidState, schema); // false
```

---

### JsonSchemaGenerator

Generates JSON Schema from C# types.

```csharp
public static class JsonSchemaGenerator
{
    public static string Generate<T>()
    public static string Generate(Type type)
}
```

#### Supported Types

| C# Type | JSON Schema Type |
|---------|------------------|
| `string` | `"type": "string"` |
| `int`, `long`, `short` | `"type": "integer"` |
| `float`, `double`, `decimal` | `"type": "number"` |
| `bool` | `"type": "boolean"` |
| `T[]`, `List<T>` | `"type": "array"` |
| Class | `"type": "object"` |

**Example:**
```csharp
public class ClockState
{
    public int Hours { get; set; }
    public int Minutes { get; set; }
    public string? Theme { get; set; }
}

var schema = JsonSchemaGenerator.Generate<ClockState>();
// {
//   "$schema": "http://json-schema.org/draft-07/schema#",
//   "type": "object",
//   "properties": {
//     "hours": { "type": "integer" },
//     "minutes": { "type": "integer" },
//     "theme": { "type": "string" }
//   },
//   "required": ["hours", "minutes"]
// }
```

---

## Configuration API

### MinimactOptions

Configuration options for the Minimact framework.

```csharp
public class MinimactOptions
{
    // Existing options...

    public bool AutoDiscoverPlugins { get; set; } = true;
    public List<IMinimactPlugin> ExplicitPlugins { get; set; } = new();
    public PluginAssetOptions PluginAssets { get; set; } = new();

    public MinimactOptions RegisterPlugin<T>() where T : IMinimactPlugin, new()
    public MinimactOptions RegisterPlugin(IMinimactPlugin plugin)
}
```

#### Properties

##### AutoDiscoverPlugins
- **Type:** `bool`
- **Default:** `true`
- **Description:** Enable automatic plugin discovery via reflection

##### ExplicitPlugins
- **Type:** `List<IMinimactPlugin>`
- **Default:** Empty list
- **Description:** Plugins registered explicitly (bypasses auto-discovery)

##### PluginAssets
- **Type:** `PluginAssetOptions`
- **Default:** New instance with defaults
- **Description:** Plugin asset serving configuration

#### Methods

##### RegisterPlugin\<T\>
```csharp
MinimactOptions RegisterPlugin<T>() where T : IMinimactPlugin, new()
```

Registers a plugin by type.

**Example:**
```csharp
builder.Services.AddMinimact(options =>
{
    options.RegisterPlugin<ClockPlugin>();
});
```

##### RegisterPlugin (instance)
```csharp
MinimactOptions RegisterPlugin(IMinimactPlugin plugin)
```

Registers a plugin instance.

**Example:**
```csharp
builder.Services.AddMinimact(options =>
{
    var clockPlugin = new ClockPlugin();
    options.RegisterPlugin(clockPlugin);
});
```

---

### PluginAssetOptions

Configuration for plugin asset serving.

```csharp
public class PluginAssetOptions
{
    public string BasePath { get; set; } = "/plugin-assets";
    public bool VersionAssetUrls { get; set; } = true;
    public int CacheDuration { get; set; } = 86400;
}
```

#### Properties

##### BasePath
- **Type:** `string`
- **Default:** `"/plugin-assets"`
- **Description:** Base URL path for serving plugin assets

**Example:**
```csharp
options.PluginAssets.BasePath = "/assets/plugins";
// Assets served at: /assets/plugins/Clock@1.0.0/clock.css
```

##### VersionAssetUrls
- **Type:** `bool`
- **Default:** `true`
- **Description:** Include version in asset URLs

**Example:**
```csharp
options.PluginAssets.VersionAssetUrls = true;
// URL: /plugin-assets/Clock@1.0.0/clock.css

options.PluginAssets.VersionAssetUrls = false;
// URL: /plugin-assets/Clock/clock.css
```

##### CacheDuration
- **Type:** `int`
- **Default:** `86400` (24 hours)
- **Description:** Cache duration in seconds

**Example:**
```csharp
options.PluginAssets.CacheDuration = 3600; // 1 hour
```

---

## Extension Methods

### AddMinimact

Registers Minimact services including plugin system.

```csharp
public static IServiceCollection AddMinimact(this IServiceCollection services)
public static IServiceCollection AddMinimact(
    this IServiceCollection services,
    Action<MinimactOptions> configure)
```

**Example:**
```csharp
// Default configuration
builder.Services.AddMinimact();

// Custom configuration
builder.Services.AddMinimact(options =>
{
    options.AutoDiscoverPlugins = true;
    options.RegisterPlugin<ClockPlugin>();
    options.PluginAssets.CacheDuration = 3600;
});
```

---

### UseMinimact

Adds Minimact middleware including plugin asset serving.

```csharp
public static IApplicationBuilder UseMinimact(
    this IApplicationBuilder app,
    string manifestPath = "./Generated/routes.json")
```

**Example:**
```csharp
var app = builder.Build();

app.UseMinimact();
app.Run();
```

---

### UsePluginAssets

Adds plugin asset serving middleware.

```csharp
public static IApplicationBuilder UsePluginAssets(
    this IApplicationBuilder builder,
    string basePath = "/plugin-assets",
    bool versionAssetUrls = true,
    int cacheDuration = 86400)
```

**Example:**
```csharp
app.UsePluginAssets(
    basePath: "/assets/plugins",
    versionAssetUrls: true,
    cacheDuration: 3600
);
```

**Note:** Usually not needed - `UseMinimact()` calls this automatically.

---

## TypeScript Types

### Client-Side State Types

Generate TypeScript types from C# state classes:

```bash
# Manual generation (planned for Phase 6)
dotnet minimact-plugin generate-types
```

**Example Output:**
```typescript
// Generated from ClockState.cs
export interface ClockState {
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
```

**Usage in TSX:**
```tsx
import { ClockState } from './generated/plugin-types';

const [time, setTime] = useState<ClockState>({
  hours: 14,
  minutes: 30,
  seconds: 0,
  date: 'October 29, 2025',
  theme: 'light',
  timezone: 'UTC',
  showTimezone: false,
  showSeconds: true,
  use24Hour: true
});

<Plugin name="Clock" state={time} />
```

---

## Error Handling

### Common Exceptions

#### PluginNotFoundException
Thrown when a requested plugin is not found.

```csharp
var plugin = pluginManager.GetPlugin("NonExistent");
if (plugin == null)
{
    throw new PluginNotFoundException("NonExistent");
}
```

#### StateValidationException
Thrown when plugin state fails validation.

```csharp
if (!plugin.ValidateState(state))
{
    throw new StateValidationException(plugin.Name, state);
}
```

#### AssetNotFoundException
Thrown when a plugin asset cannot be found.

```csharp
// Middleware returns 404 if asset not found
GET /plugin-assets/Clock@1.0.0/missing.css → 404 Not Found
```

---

## Best Practices

### 1. Always Use Generic Base Class

**Good:**
```csharp
public class ClockPlugin : MinimactPlugin<ClockState>
{
    protected override VNode RenderTyped(ClockState state)
    {
        // Type-safe access to state
        return new VElement("div", $"{state.Hours}:{state.Minutes}");
    }
}
```

**Bad:**
```csharp
public class ClockPlugin : MinimactPluginBase
{
    public override VNode Render(object state)
    {
        var clockState = (ClockState)state; // Manual casting
        return new VElement("div", $"{clockState.Hours}:{clockState.Minutes}");
    }
}
```

### 2. Embed Assets in Assembly

**Good:**
```xml
<ItemGroup>
  <EmbeddedResource Include="assets\**\*" />
</ItemGroup>
```

**Bad:**
```csharp
// Relying on external CDN (adds latency)
new PluginAssets
{
    CssFiles = new List<string> { "https://cdn.example.com/widget.css" },
    Source = AssetSource.Cdn
}
```

### 3. Version Your Assets

**Good:**
```csharp
CssFiles = new List<string>
{
    "/plugin-assets/Clock@1.0.0/clock.css"
}
```

**Bad:**
```csharp
CssFiles = new List<string>
{
    "/plugin-assets/Clock/clock.css" // No version
}
```

### 4. Use JSON Schema Validation

**Good:**
```csharp
// Auto-generated from ClockState type
public override string GetStateSchema()
{
    return JsonSchemaGenerator.Generate<ClockState>();
}
```

**Bad:**
```csharp
// No validation
public override bool ValidateState(object state)
{
    return true; // Accepts anything
}
```

---

## Version Compatibility

### Semver Rules

**MAJOR.MINOR.PATCH**

- **MAJOR:** Breaking changes (incompatible state contract)
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes (backward compatible)

**Example:**
- `1.0.0` → `1.1.0` ✅ Compatible
- `1.0.0` → `2.0.0` ❌ Breaking change
- `1.5.0` → `1.5.1` ✅ Compatible

### Multi-Version Support

Minimact can load multiple versions of the same plugin:

```csharp
// App depends on Clock@1.0.0
<Plugin name="Clock" state={time} />

// Another plugin depends on Clock@2.0.0
// Both versions loaded side-by-side
```

---

## Performance Considerations

### Template-Based Rendering

Plugins leverage Minimact's Template Patch System for instant updates:

1. **First Render:** Plugin renders full VNode → Server sends HTML
2. **State Change:** Template patches applied (0ms latency)
3. **Server Verification:** Confirms or corrects in background

### Asset Caching

Assets are cached with aggressive headers:

```
Cache-Control: public, max-age=86400
ETag: "Clock-1.0.0-12345678"
```

**First Request:** ~5ms (read from assembly)
**Cached Request:** 0ms (304 Not Modified)

---

## Related Documentation

- [Creating Plugins Guide](/v1.0/guide/creating-plugins)
- [Template Patch System](/v1.0/architecture/template-patch-system)
- [Hooks API](/v1.0/api/hooks)
