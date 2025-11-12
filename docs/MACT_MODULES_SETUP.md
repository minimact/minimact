# Mact Modules System - Setup Guide

## Quick Start

### 1. Update Program.cs

Configure static file serving for mact_modules:

```csharp
using Minimact.AspNetCore.Extensions;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Add Minimact services (MactModuleRegistry is automatically registered)
builder.Services.AddMinimact();
builder.Services.AddMinimactMvcBridge();

// Add MVC and SignalR
builder.Services.AddControllersWithViews();
builder.Services.AddSignalR();

var app = builder.Build();

// Serve wwwroot/ static files (default)
app.UseStaticFiles();

// ✅ Serve mact_modules/ as static files
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(app.Environment.ContentRootPath, "mact_modules")),
    RequestPath = "/mact_modules"
});

// UseMinimact automatically scans mact_modules/ at startup
app.UseMinimact(options => {
    options.UseWelcomePage = true;
    options.EnableHotReload = app.Environment.IsDevelopment();
});

app.MapControllers();
app.Run();
```

**What happens automatically:**
- `AddMinimact()` registers `MactModuleRegistry` as a singleton
- `UseMinimact()` scans `mact_modules/` directory at startup
- Modules are automatically included based on component `[ModuleInfo]` attributes

### 2. Install Modules with Swig CLI

```bash
# Install Minimact modules
swig import @minimact/power
swig import @minimact/mvc
swig import @minimact/punch

# Install external libraries
swig import lodash
swig import moment
```

### 3. Use in Components (Zero Config!)

**Default behavior** - All modules auto-included:

```csharp
public class MyDashboard : MinimactComponent
{
    protected override VNode Render()
    {
        return new VElement("div", new VText("Dashboard"));
    }
}
```

**Generated HTML**:
```html
<script src="/js/minimact.js"></script>
<script src="/mact_modules/@minimact/power/power.min.js"></script>
<script src="/mact_modules/@minimact/mvc/mvc.min.js"></script>
<script src="/mact_modules/lodash/lodash.min.js"></script>
<script src="/mact_modules/moment/moment.min.js"></script>
```

---

## Component Module Control

### Opt-Out (Core Only - 12 KB)

```csharp
using Minimact.AspNetCore.Attributes;

[ModuleInfo(OptOut = true)]
public class LandingPage : MinimactComponent
{
    protected override VNode Render()
    {
        return new VElement("div", new VText("Fast landing page"));
    }
}
```

**Generated HTML**:
```html
<script src="/js/minimact.js"></script>
<!-- Only core, no modules! -->
```

### Exclude Specific Modules

```csharp
[ModuleInfo(Exclude = new[] { "lodash", "moment" })]
public class ProductPage : MinimactComponent
{
    // Includes @minimact/power, @minimact/mvc
    // Excludes lodash and moment
}
```

### Explicit Include Only

```csharp
[ModuleInfo(Include = new[] { "@minimact/power", "lodash" })]
public class DataProcessorPage : MinimactComponent
{
    // ONLY includes @minimact/power and lodash
    // Excludes everything else
}
```

---

## Module Directory Structure

```
MyMinimactApp/
├── mact_modules/               # Local module registry
│   ├── lodash/
│   │   ├── package.json        # Module metadata
│   │   └── lodash.min.js       # Script file
│   ├── moment/
│   │   ├── package.json
│   │   └── moment.min.js
│   ├── @minimact/
│   │   ├── power/
│   │   │   ├── package.json
│   │   │   └── power.min.js
│   │   ├── mvc/
│   │   │   ├── package.json
│   │   │   └── mvc.min.js
│   │   └── punch/
│   │       ├── package.json
│   │       └── punch.min.js
│   └── chart.js/
│       ├── package.json
│       └── chart.min.js
├── Pages/
├── Controllers/
├── wwwroot/
│   └── js/
│       └── minimact.js         # Core runtime (always included)
└── Program.cs
```

---

## Module Metadata (package.json)

Example for `@minimact/power`:

```json
{
  "name": "@minimact/power",
  "version": "0.2.0",
  "description": "Advanced Minimact features (useServerTask, useComputed, etc.)",
  "main": "power.min.js",
  "type": "module",
  "cdn": "https://unpkg.com/@minimact/core@0.2.0/dist/power.min.js",
  "dependencies": {
    "@minimact/core": ">=0.2.0"
  }
}
```

Example for lodash:

```json
{
  "name": "lodash",
  "version": "4.17.21",
  "description": "Lodash modular utilities",
  "main": "lodash.min.js",
  "type": "umd",
  "cdn": "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js",
  "global": "_"
}
```

---

## Load Order

Modules are loaded in this order:

1. **@minimact/core modules** (priority 10)
2. **Other @minimact/* modules** (priority 20)
3. **External libraries** (priority 100)

Within each priority level, modules are sorted alphabetically.

---

## Fallback Behavior

If `mact_modules/` directory doesn't exist or is empty, the system falls back to legacy behavior using the options properties:

```csharp
var options = new MinimactPageRenderOptions
{
    IncludeMvcExtension = true,      // /js/minimact-mvc.min.js
    IncludePunchExtension = false,   // /js/minimact-punch.min.js
    IncludeMarkdownExtension = false // /js/minimact-md.min.js
};

return await _renderer.RenderPage<ProductPage>(viewModel, "Products", options);
```

---

## CLI Commands

```bash
# Initialize mact_modules/
swig init

# Install a module
swig import lodash
swig import @minimact/power

# List installed modules
swig list

# Remove a module
swig remove lodash

# Update a module
swig update lodash
swig update --all
```

---

## Benefits

✅ **Zero Configuration** - Drop files in `mact_modules/`, auto-included on every page
✅ **Offline-First** - No CDN dependencies, all files local
✅ **Version Control Friendly** - Check in `mact_modules/` to Git
✅ **Opt-Out Performance** - Default: include everything, production: opt-out unused modules
✅ **Simple CLI** - `swig import lodash` just works
✅ **No Build System** - No webpack, no npm, pure simplicity

---

## Migration from Legacy System

### Before (manual script tags):

```html
<script src="/js/minimact.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/moment@2.29.4/moment.min.js"></script>
```

### After (mact_modules):

```bash
swig import lodash
swig import moment
```

HTML is auto-generated! No manual script tags needed.

---

## Troubleshooting

### Module not loading?

1. Check `mact_modules/{module-name}/package.json` exists
2. Verify `main` field points to correct file
3. Check ASP.NET Core logs for scanning errors
4. Ensure `UseStaticFiles()` for mact_modules is registered

### Wrong load order?

Modules load based on:
1. Package name prefix (`@minimact/core` → `@minimact/` → others)
2. Alphabetical within same priority

To force specific order, use `Include` attribute:

```csharp
[ModuleInfo(Include = new[] { "dependency-first", "then-this" })]
```

### Module not found at runtime?

Check that mact_modules are being served as static files:

```csharp
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(app.Environment.ContentRootPath, "mact_modules")),
    RequestPath = "/mact_modules"
});
```

---

## Next Steps

1. Run `swig init` to initialize mact_modules/
2. Install modules with `swig import <package>`
3. Update Program.cs to register MactModuleRegistry
4. Build and run your app
5. Verify modules are loading in browser DevTools (Network tab)

That's it! The mact_modules system is now active and modules will be automatically included on all pages.
