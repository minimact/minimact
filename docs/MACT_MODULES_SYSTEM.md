# Mact Modules System - Comprehensive Enhancement Plan

## Overview

A zero-config, file-based module system for Minimact that automatically manages client-side dependencies without requiring CDN links, build systems, or manual script tag management.

**Key Innovation**: ASP.NET Core scans `mact_modules/` at startup and auto-includes all discovered modules on every page. Components can opt-out for optimization.

---

## Architecture

### 1. Directory Structure

```
MyMinimactApp/
├── mact_modules/               # Local module registry (like node_modules but for client scripts)
│   ├── lodash/
│   │   ├── package.json        # Module metadata
│   │   └── lodash.min.js       # Actual script file
│   ├── moment/
│   │   ├── package.json
│   │   └── moment.min.js
│   ├── @minimact/
│   │   ├── power/
│   │   │   ├── package.json    # { "name": "@minimact/core/power", "version": "0.2.0", "main": "power.min.js" }
│   │   │   └── power.min.js
│   │   ├── mvc/
│   │   │   ├── package.json
│   │   │   └── mvc.min.js
│   │   ├── punch/
│   │   │   ├── package.json
│   │   │   └── punch.min.js
│   │   └── md/
│   │       ├── package.json
│   │       └── md.min.js
│   └── chart.js/
│       ├── package.json
│       └── chart.min.js
├── Pages/
├── Components/
├── wwwroot/
│   └── js/
│       └── minimact.js         # Core runtime (always included)
└── Program.cs
```

### 2. Module Metadata Format (`package.json`)

```json
{
  "name": "@minimact/core/power",
  "version": "0.2.0",
  "description": "Advanced Minimact features (useServerTask, useComputed, usePaginatedServerTask, etc.)",
  "main": "power.min.js",
  "type": "module",
  "cdn": "https://unpkg.com/@minimact/core@0.2.0/dist/power.min.js",
  "integrity": "sha384-...",
  "dependencies": {
    "@minimact/core": ">=0.2.0"
  },
  "keywords": ["minimact", "server-task", "computed", "pagination"]
}
```

**For external libraries (lodash, moment):**
```json
{
  "name": "lodash",
  "version": "4.17.21",
  "description": "Lodash modular utilities",
  "main": "lodash.min.js",
  "type": "umd",
  "cdn": "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js",
  "integrity": "sha384-...",
  "global": "_",
  "keywords": ["lodash", "utility"]
}
```

**Key Fields**:
- `main`: Script file to include
- `type`: `"module"` (ESM) or `"umd"` (global)
- `cdn`: Fallback CDN URL
- `global`: Global variable name (for UMD libraries)
- `dependencies`: Module dependencies (for ordering)

---

## Component Usage

### Default Behavior (Zero Config)

```csharp
// ✅ Auto-includes ALL modules from mact_modules/
// No attributes needed!
public class MyDashboard : MinimactComponent
{
    protected override VNode Render()
    {
        return new VElement("div", new VText("Dashboard"));
    }
}
```

**Generated HTML** (automatic):
```html
<script src="/js/minimact.js"></script>              <!-- Core (12 KB) -->
<script src="/mact_modules/@minimact/power/power.min.js"></script>  <!-- +5.37 KB -->
<script src="/mact_modules/@minimact/mvc/mvc.min.js"></script>      <!-- +2 KB -->
<script src="/mact_modules/lodash/lodash.min.js"></script>          <!-- +24 KB -->
<script src="/mact_modules/moment/moment.min.js"></script>          <!-- +18 KB -->
```

### Opt-Out (Lightweight Pages)

```csharp
// ❌ Exclude ALL extra modules (core only)
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
<script src="/js/minimact.js"></script>  <!-- Core only (12 KB) -->
```

### Selective Opt-Out

```csharp
// ❌ Exclude specific modules
[ModuleInfo(OptOut = true, Exclude = new[] { "lodash", "moment" })]
public class ProductPage : MinimactComponent
{
    // Still includes @minimact/power, @minimact/mvc, etc.
    // But excludes lodash and moment
}
```

**Generated HTML**:
```html
<script src="/js/minimact.js"></script>
<script src="/mact_modules/@minimact/power/power.min.js"></script>
<script src="/mact_modules/@minimact/mvc/mvc.min.js"></script>
<!-- lodash and moment excluded -->
```

### Explicit Include (Override)

```csharp
// ✅ Only include specific modules
[ModuleInfo(Include = new[] { "@minimact/power", "lodash" })]
public class DataProcessorPage : MinimactComponent
{
    // Only includes power and lodash, excludes everything else
}
```

---

## CLI Commands

### 1. `swig import <package-name>`

**Install a module into mact_modules/**

```bash
# Install Minimact modules
swig import @minimact/power
swig import @minimact/mvc
swig import @minimact/punch
swig import @minimact/md

# Install external libraries
swig import lodash
swig import moment
swig import axios
swig import chart.js
```

**Behavior**:
1. Downloads module from npm registry or CDN
2. Extracts to `mact_modules/{package-name}/`
3. Creates `package.json` with metadata
4. Verifies integrity (optional)

**Output**:
```
✓ Downloaded lodash@4.17.21
✓ Extracted to mact_modules/lodash/
✓ Verified integrity (sha384-...)
✓ Module ready to use!
```

---

### 2. `swig remove <package-name>`

**Remove a module from mact_modules/**

```bash
swig remove lodash
swig remove @minimact/power
```

---

### 3. `swig list`

**List installed modules**

```bash
swig list
```

**Output**:
```
Installed modules in mact_modules/:

@minimact/power@0.2.0         (5.37 KB)  - Advanced features
@minimact/mvc@0.2.0           (2 KB)     - MVC Bridge
lodash@4.17.21                (24 KB)    - Utility library
moment@2.29.4                 (18 KB)    - Date/time library

Total size: 49.37 KB
```

---

### 4. `swig update <package-name>`

**Update a module to latest version**

```bash
swig update lodash
swig update @minimact/power
swig update --all  # Update all modules
```

---

### 5. `swig init`

**Initialize mact_modules/ with common modules**

```bash
swig init
```

**Interactive prompt**:
```
? Select modules to install:
  [x] @minimact/power    - Advanced features (useServerTask, useComputed, etc.)
  [x] @minimact/mvc      - MVC Bridge (useMvcState, useMvcViewModel)
  [ ] @minimact/punch    - DOM state (useDomElementState)
  [ ] @minimact/md       - Markdown (useMarkdown)
  [ ] lodash             - Utility library
  [ ] moment             - Date/time library
  [ ] axios              - HTTP client
  [ ] chart.js           - Charting library

✓ Installed 2 modules in mact_modules/
```

---

## ASP.NET Core Implementation

### 1. MactModuleRegistry Service

**Scans mact_modules/ at startup and builds module registry**

```csharp
namespace Minimact.AspNetCore.Services;

public class MactModuleRegistry
{
    private readonly Dictionary<string, ModuleMetadata> _modules = new();
    private readonly ILogger<MactModuleRegistry> _logger;
    private readonly string _mactModulesPath;

    public MactModuleRegistry(IWebHostEnvironment env, ILogger<MactModuleRegistry> logger)
    {
        _logger = logger;
        _mactModulesPath = Path.Combine(env.ContentRootPath, "mact_modules");
    }

    /// <summary>
    /// Scan mact_modules/ directory and load all modules
    /// Called at startup in Program.cs
    /// </summary>
    public void ScanModules()
    {
        if (!Directory.Exists(_mactModulesPath))
        {
            _logger.LogWarning("mact_modules/ not found. Run 'swig init' to initialize.");
            return;
        }

        _modules.Clear();

        // Scan all package.json files
        var packageFiles = Directory.GetFiles(_mactModulesPath, "package.json", SearchOption.AllDirectories);

        foreach (var packageFile in packageFiles)
        {
            try
            {
                var json = File.ReadAllText(packageFile);
                var metadata = JsonSerializer.Deserialize<ModuleMetadata>(json);

                if (metadata != null)
                {
                    var moduleDir = Path.GetDirectoryName(packageFile)!;
                    metadata.ScriptPath = Path.Combine(moduleDir, metadata.Main);
                    _modules[metadata.Name] = metadata;
                    _logger.LogInformation($"Loaded module: {metadata.Name}@{metadata.Version}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to load module from {packageFile}");
            }
        }

        _logger.LogInformation($"Loaded {_modules.Count} modules from mact_modules/");
    }

    /// <summary>
    /// Get all modules (for default inclusion)
    /// </summary>
    public IEnumerable<ModuleMetadata> GetAllModules()
    {
        return _modules.Values.OrderBy(m => m.LoadOrder);
    }

    /// <summary>
    /// Get specific modules by name
    /// </summary>
    public IEnumerable<ModuleMetadata> GetModules(IEnumerable<string> moduleNames)
    {
        return moduleNames
            .Select(name => _modules.TryGetValue(name, out var module) ? module : null)
            .Where(m => m != null)
            .OrderBy(m => m.LoadOrder);
    }

    /// <summary>
    /// Exclude specific modules from a list
    /// </summary>
    public IEnumerable<ModuleMetadata> GetModulesExcluding(IEnumerable<string> excludeNames)
    {
        var excludeSet = new HashSet<string>(excludeNames);
        return _modules.Values
            .Where(m => !excludeSet.Contains(m.Name))
            .OrderBy(m => m.LoadOrder);
    }
}

public class ModuleMetadata
{
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Main { get; set; } = string.Empty;
    public string Type { get; set; } = "umd"; // "module" or "umd"
    public string? Cdn { get; set; }
    public string? Integrity { get; set; }
    public string? Global { get; set; }
    public Dictionary<string, string>? Dependencies { get; set; }
    public string? ScriptPath { get; set; } // Computed at runtime

    /// <summary>
    /// Load order priority (lower = earlier)
    /// Auto-computed based on dependencies
    /// </summary>
    public int LoadOrder { get; set; } = 100;
}
```

---

### 2. ModuleInfoAttribute

**Opt-out attribute for components**

```csharp
namespace Minimact.AspNetCore.Attributes;

/// <summary>
/// Controls which client-side modules are included for this component
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
public class ModuleInfoAttribute : Attribute
{
    /// <summary>
    /// Opt-out of automatic module inclusion
    /// Default: false (include all modules)
    /// </summary>
    public bool OptOut { get; set; } = false;

    /// <summary>
    /// Exclude specific modules (when OptOut = true)
    /// </summary>
    public string[]? Exclude { get; set; }

    /// <summary>
    /// Explicitly include only these modules (overrides default behavior)
    /// </summary>
    public string[]? Include { get; set; }
}
```

---

### 3. MinimactPageRenderer Integration

**Update to check ModuleInfo attribute and include scripts**

```csharp
private string GeneratePageHtml(
    MinimactComponent component,
    string componentHtml,
    string title,
    string viewModelJson,
    MinimactPageRenderOptions options)
{
    var scriptSrc = options.ClientScriptPath ?? "/js/minimact.js";

    // Determine which modules to include
    var modulesToInclude = DetermineModulesToInclude(component, options);

    // Generate module script tags
    var moduleScripts = new StringBuilder();
    foreach (var module in modulesToInclude)
    {
        var moduleSrc = GetModuleScriptPath(module);
        if (options.EnableCacheBusting)
        {
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            moduleSrc += $"?v={timestamp}";
        }

        if (module.Type == "module")
        {
            moduleScripts.AppendLine($"    <script type=\"module\" src=\"{moduleSrc}\"></script>");
        }
        else
        {
            moduleScripts.AppendLine($"    <script src=\"{moduleSrc}\"></script>");
        }
    }

    // ... rest of HTML generation
}

private IEnumerable<ModuleMetadata> DetermineModulesToInclude(
    MinimactComponent component,
    MinimactPageRenderOptions options)
{
    var registry = _serviceProvider.GetRequiredService<MactModuleRegistry>();
    var moduleInfo = component.GetType().GetCustomAttribute<ModuleInfoAttribute>();

    // Option 1: Explicit include list (overrides everything)
    if (moduleInfo?.Include != null && moduleInfo.Include.Length > 0)
    {
        return registry.GetModules(moduleInfo.Include);
    }

    // Option 2: OptOut = true (core only)
    if (moduleInfo?.OptOut == true && (moduleInfo.Exclude == null || moduleInfo.Exclude.Length == 0))
    {
        return Enumerable.Empty<ModuleMetadata>();
    }

    // Option 3: OptOut = true with Exclude list (include all except excluded)
    if (moduleInfo?.OptOut == true && moduleInfo.Exclude != null)
    {
        return registry.GetModulesExcluding(moduleInfo.Exclude);
    }

    // Option 4: Default (include everything)
    return registry.GetAllModules();
}

private string GetModuleScriptPath(ModuleMetadata module)
{
    // mact_modules/lodash/lodash.min.js → /mact_modules/lodash/lodash.min.js
    var relativePath = Path.GetRelativePath(
        _environment.ContentRootPath,
        module.ScriptPath!
    ).Replace('\\', '/');

    return $"/{relativePath}";
}
```

---

### 4. Program.cs Registration

```csharp
using Minimact.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Add Minimact services
builder.Services.AddMinimact();
builder.Services.AddMinimactMvcBridge();

// Add MactModuleRegistry (singleton)
builder.Services.AddSingleton<MactModuleRegistry>();

// Add MVC and SignalR
builder.Services.AddControllersWithViews();
builder.Services.AddSignalR();

var app = builder.Build();

// Scan mact_modules/ at startup
var moduleRegistry = app.Services.GetRequiredService<MactModuleRegistry>();
moduleRegistry.ScanModules();

// Serve mact_modules/ as static files
app.UseStaticFiles(); // Serves wwwroot/
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(app.Environment.ContentRootPath, "mact_modules")),
    RequestPath = "/mact_modules"
});

app.UseRouting();
app.MapControllers();

app.Run();
```

---

## CLI Implementation

### 1. `swig import` Command

```typescript
// src/swig-cli/src/commands/import.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import * as https from 'https';
import chalk from 'chalk';

const CDN_REGISTRY = {
  'lodash': 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js',
  'moment': 'https://cdn.jsdelivr.net/npm/moment@2.29.4/moment.min.js',
  'axios': 'https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js',
  'chart.js': 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js',
  '@minimact/power': 'https://unpkg.com/@minimact/core@0.2.0/dist/power.min.js',
  '@minimact/mvc': 'https://unpkg.com/@minimact/mvc@0.2.0/dist/mvc.min.js',
  '@minimact/punch': 'https://unpkg.com/@minimact/punch@0.1.0/dist/punch.min.js',
  '@minimact/md': 'https://unpkg.com/@minimact/md@0.1.0/dist/md.min.js'
};

export async function importCommand(packageName: string): Promise<void> {
  const projectRoot = process.cwd();
  const mactModulesDir = path.join(projectRoot, 'mact_modules');

  // Ensure mact_modules/ exists
  await fs.mkdir(mactModulesDir, { recursive: true });

  // Determine package directory (handle scoped packages)
  const packageDir = packageName.startsWith('@')
    ? path.join(mactModulesDir, ...packageName.split('/'))
    : path.join(mactModulesDir, packageName);

  await fs.mkdir(packageDir, { recursive: true });

  console.log(chalk.cyan(`Importing ${packageName}...`));

  // Download from CDN
  const cdnUrl = CDN_REGISTRY[packageName];
  if (!cdnUrl) {
    console.error(chalk.red(`❌ Unknown package: ${packageName}`));
    console.log(chalk.gray('Available packages:'));
    Object.keys(CDN_REGISTRY).forEach(pkg => console.log(`  - ${pkg}`));
    process.exit(1);
  }

  const scriptContent = await downloadFromCdn(cdnUrl);
  const scriptFileName = path.basename(new URL(cdnUrl).pathname);
  const scriptPath = path.join(packageDir, scriptFileName);

  await fs.writeFile(scriptPath, scriptContent, 'utf-8');

  // Create package.json
  const metadata = generatePackageJson(packageName, scriptFileName, cdnUrl);
  await fs.writeFile(
    path.join(packageDir, 'package.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );

  console.log(chalk.green(`✓ Installed ${packageName}`));
  console.log(chalk.gray(`  Location: ${packageDir}`));
  console.log(chalk.gray(`  Script: ${scriptFileName}`));
}

async function downloadFromCdn(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
  });
}

function generatePackageJson(packageName: string, mainFile: string, cdnUrl: string) {
  const versions = {
    'lodash': '4.17.21',
    'moment': '2.29.4',
    'axios': '1.6.0',
    'chart.js': '4.4.0',
    '@minimact/power': '0.2.0',
    '@minimact/mvc': '0.2.0',
    '@minimact/punch': '0.1.0',
    '@minimact/md': '0.1.0'
  };

  const globals = {
    'lodash': '_',
    'moment': 'moment',
    'axios': 'axios',
    'chart.js': 'Chart'
  };

  return {
    name: packageName,
    version: versions[packageName] || '0.0.0',
    description: `Client-side module: ${packageName}`,
    main: mainFile,
    type: packageName.startsWith('@minimact/') ? 'module' : 'umd',
    cdn: cdnUrl,
    global: globals[packageName]
  };
}
```

---

## Benefits

### ✅ Zero Configuration
- Drop files in `mact_modules/`
- Auto-included on every page
- No script tags, no imports, just works

### ✅ Offline-First
- No CDN dependencies
- All files local
- Works without internet

### ✅ Version Control Friendly
- Check in `mact_modules/` to Git
- Team uses exact same versions
- No "works on my machine"

### ✅ Opt-Out Performance
- Default: Include everything (developer-friendly)
- Production: Opt-out unused modules (performance-friendly)
- Best of both worlds

### ✅ Simple CLI
- `swig import lodash` - Just works
- `swig list` - See what's installed
- `swig remove lodash` - Clean up

### ✅ No Build System
- No webpack, no rollup, no vite
- No package.json, no npm install
- Pure simplicity

---

## Migration Path

### From Current System

**Before** (manual script tags):
```html
<script src="/js/minimact.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/moment@2.29.4/moment.min.js"></script>
```

**After** (mact_modules):
```bash
swig import lodash
swig import moment
```

HTML is auto-generated, no manual script tags!

---

## Future Enhancements

### 1. mact_modules.json (Optional Lock File)

```json
{
  "modules": {
    "lodash": {
      "version": "4.17.21",
      "integrity": "sha384-...",
      "resolved": "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"
    },
    "@minimact/power": {
      "version": "0.2.0",
      "integrity": "sha384-...",
      "resolved": "https://unpkg.com/@minimact/core@0.2.0/dist/power.min.js"
    }
  }
}
```

### 2. Dependency Resolution

Auto-install dependencies when importing:
```bash
swig import @minimact/charts
# Automatically installs @minimact/power (dependency)
```

### 3. CDN Fallback

```csharp
// If local file missing, fall back to CDN
var scriptSrc = File.Exists(module.ScriptPath)
    ? GetModuleScriptPath(module)
    : module.Cdn;
```

### 4. Import from npm Registry

```bash
# Download from npm instead of hardcoded CDN list
swig import lodash --registry npm
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `MactModuleRegistry` service
- [ ] Create `ModuleInfoAttribute`
- [ ] Update `MinimactPageRenderer` to scan `mact_modules/`
- [ ] Update `Program.cs` to scan modules at startup
- [ ] Serve `mact_modules/` as static files

### Phase 2: CLI Commands
- [ ] Implement `swig import <package>`
- [ ] Implement `swig list`
- [ ] Implement `swig remove <package>`
- [ ] Implement `swig init`
- [ ] Implement `swig update`

### Phase 3: Testing
- [ ] Test with @minimact modules (power, mvc, punch, md)
- [ ] Test with external libraries (lodash, moment, axios)
- [ ] Test opt-out scenarios
- [ ] Test module ordering and dependencies

### Phase 4: Documentation
- [ ] Update README.md with mact_modules guide
- [ ] Create getting-started tutorial
- [ ] Document CLI commands
- [ ] Add examples to docs

---

## Conclusion

The mact_modules system provides a **zero-config, offline-first, version-controlled** approach to managing client-side dependencies in Minimact applications.

**Key Principle**: Include everything by default, opt-out when needed.

This aligns perfectly with Minimact's philosophy: **Simplicity first, optimization second.**
