# Swig CLI - Mact Modules Management Guide

Complete guide for managing client-side modules using the Swig CLI.

---

## Quick Start

```bash
# Initialize mact_modules with interactive selection
swig init

# Import a specific module
swig import lodash

# List installed modules
swig list

# Update a module
swig update lodash

# Update all modules
swig update --all

# Remove a module
swig uninstall lodash
```

---

## Commands

### `swig init`

Initialize `mact_modules/` with interactive module selection.

**Usage:**
```bash
swig init
```

**Options:**
- `-p, --project <path>` - Project root directory (default: current directory)

**Features:**
- Interactive multi-select menu
- Pre-selects recommended modules (@minimact/power, @minimact/mvc)
- Shows descriptions for each module
- Safe to run multiple times (adds more modules)

**Example:**
```bash
$ swig init

📦 Initialize mact_modules/

Select modules to install:

? Select modules to install:
  ◉ @minimact/power (recommended) - Advanced features (useServerTask, useComputed, etc.)
  ◉ @minimact/mvc (recommended) - MVC Bridge (useMvcState, useMvcViewModel)
  ◯ @minimact/punch - DOM element state tracking (useDomElementState)
  ◯ @minimact/md - Markdown rendering (useMarkdown, useRazorMarkdown)
  ◯ lodash - Utility library for arrays, objects, strings, etc.
  ◯ moment - Date/time manipulation library
  ◯ dayjs - 2KB date library (Moment.js alternative)
  ◯ axios - Promise-based HTTP client
  ◯ chart.js - JavaScript charting library

📦 Installing 2 module(s)...

📦 Importing @minimact/power...
   Found @minimact/power in global cache
   Copied @minimact/power to project

✅ Successfully installed @minimact/power@0.2.0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Successfully installed 2 module(s)

📁 Modules installed in: J:\MyApp\mact_modules
   Use `swig list` to view installed modules
   Use `swig import <package>` to add more modules
```

---

### `swig import <package>`

Install a module from npm to `mact_modules/`.

**Usage:**
```bash
swig import <package>
swig import lodash
swig import @minimact/power
```

**Options:**
- `--force` - Force reinstall even if already installed
- `-p, --project <path>` - Project root directory (default: current directory)

**How it works:**
1. Downloads package from npm to **global cache** (AppData/Application Support)
2. Extracts browser bundle (finds dist/*.min.js or similar)
3. Copies from global cache to project's `mact_modules/`
4. Generates `package.json` metadata

**Global Cache Locations:**
- **Windows:** `%APPDATA%\minimact-cache\mact_modules`
- **macOS:** `~/Library/Application Support/minimact-cache/mact_modules`
- **Linux:** `~/.local/share/minimact-cache/mact_modules`

**Benefits:**
- Multiple projects share the same downloaded files
- Offline-friendly after first download
- Fast subsequent installs (copy from cache)

**Example:**
```bash
$ swig import lodash

📦 Importing lodash...

   Downloading lodash to global cache...
   ✔ Downloaded lodash to global cache
   Copying lodash to project...
   ✔ Copied lodash to project

✅ Successfully installed lodash@4.17.21
   Global cache: C:\Users\YourName\AppData\Roaming\minimact-cache\mact_modules\lodash
   Project: J:\MyApp\mact_modules\lodash
   Lodash modular utilities
```

---

### `swig list`

List all installed modules in `mact_modules/`.

**Usage:**
```bash
swig list
```

**Options:**
- `-p, --project <path>` - Project root directory (default: current directory)

**Features:**
- Groups by Minimact modules and external libraries
- Shows version, size, and type (ESM/UMD)
- Displays descriptions
- Shows total module count and size

**Example:**
```bash
$ swig list

📦 Installed modules in mact_modules/:

  Minimact modules:
    • @minimact/power@0.2.0        [ESM] 5.37 KB
      Advanced features (useServerTask, useComputed, usePaginatedServerTask)
    • @minimact/mvc@0.2.0          [ESM] 2.00 KB
      MVC Bridge (useMvcState, useMvcViewModel)

  External libraries:
    • lodash@4.17.21               [UMD] 24.00 KB
      Lodash modular utilities
    • moment@2.29.4                [UMD] 18.00 KB
      Parse, validate, manipulate, and display dates

  Total: 4 module(s), 49.37 KB
```

---

### `swig update [package]`

Update module(s) to latest versions.

**Usage:**
```bash
# Update specific module
swig update lodash

# Update all modules
swig update --all

# Interactive selection
swig update
```

**Options:**
- `--all` - Update all installed modules
- `-p, --project <path>` - Project root directory (default: current directory)

**How it works:**
1. Checks installed modules
2. Re-downloads from npm (with `--force` flag)
3. Replaces old version with new version

**Example:**
```bash
$ swig update lodash

🔄 Update modules

Updating lodash...

📦 Updating lodash@4.17.21...
   Downloading lodash to global cache...
   ✔ Downloaded lodash to global cache
   Copying lodash to project...
   ✔ Copied lodash to project

✅ Successfully installed lodash@4.17.21

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Successfully updated 1 module(s)

   Use `swig list` to view updated modules
```

**Interactive mode:**
```bash
$ swig update

🔄 Update modules

Installed modules:

? Select modules to update:
  ◯ @minimact/power@0.2.0
  ◯ @minimact/mvc@0.2.0
  ◉ lodash@4.17.21
  ◯ moment@2.29.4
```

---

### `swig uninstall <package>`

Remove a module from `mact_modules/`.

**Usage:**
```bash
swig uninstall lodash
swig uninstall @minimact/power
```

**Options:**
- `--force` - Skip confirmation prompt
- `-p, --project <path>` - Project root directory (default: current directory)

**Features:**
- Prompts for confirmation (unless `--force`)
- Removes module directory
- Cleans up empty parent directories (for scoped packages)
- Does NOT remove from global cache (other projects may use it)

**Example:**
```bash
$ swig uninstall lodash

🗑️  Uninstalling lodash...

? Remove lodash@4.17.21 from mact_modules? (y/N) › Yes

   Removing lodash...
   ✔ Removed lodash@4.17.21

✅ Successfully uninstalled lodash
   Use `swig list` to view remaining modules
```

**Force mode:**
```bash
$ swig uninstall lodash --force

🗑️  Uninstalling lodash...

   Removing lodash...
   ✔ Removed lodash@4.17.21

✅ Successfully uninstalled lodash
```

---

## Available Packages

### Minimact Modules

| Package | Size | Description |
|---------|------|-------------|
| `@minimact/power` | 5.37 KB | Advanced features (useServerTask, useComputed, usePaginatedServerTask, etc.) |
| `@minimact/mvc` | 2 KB | MVC Bridge (useMvcState, useMvcViewModel) |
| `@minimact/punch` | ~3 KB | DOM element state tracking (useDomElementState) |
| `@minimact/md` | ~4 KB | Markdown rendering (useMarkdown, useRazorMarkdown) |

### External Libraries

| Package | Size | Type | Global | Description |
|---------|------|------|--------|-------------|
| `lodash` | 24 KB | UMD | `_` | Utility library for arrays, objects, strings, etc. |
| `moment` | 18 KB | UMD | `moment` | Date/time manipulation library |
| `dayjs` | ~2 KB | UMD | `dayjs` | 2KB date library (Moment.js alternative) |
| `axios` | ~13 KB | UMD | `axios` | Promise-based HTTP client |
| `chart.js` | ~60 KB | UMD | `Chart` | JavaScript charting library |

---

## Workflow Examples

### New Project Setup

```bash
# Create new Minimact project
swig new MyApp

# Navigate to project
cd MyApp

# Initialize modules
swig init
# Select: @minimact/power, @minimact/mvc, lodash

# Run project
swig run
```

### Adding a Module Mid-Development

```bash
# Import axios for API calls
swig import axios

# Verify installation
swig list

# Start using in your TSX files
# axios is now available globally as window.axios
```

### Keeping Modules Up-to-Date

```bash
# Check current versions
swig list

# Update all modules
swig update --all

# Or update specific module
swig update @minimact/power
```

### Cleaning Up Unused Modules

```bash
# List installed modules
swig list

# Remove unused module
swig uninstall chart.js

# Verify removal
swig list
```

---

## Integration with ASP.NET Core

Modules in `mact_modules/` are automatically served and included by Minimact.

### Program.cs Setup

```csharp
using Minimact.AspNetCore.Extensions;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMinimact();
builder.Services.AddMinimactMvcBridge();
builder.Services.AddControllersWithViews();
builder.Services.AddSignalR();

var app = builder.Build();

app.UseStaticFiles();

// Serve mact_modules/ as static files
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(app.Environment.ContentRootPath, "mact_modules")),
    RequestPath = "/mact_modules"
});

app.UseMinimact(options => {
    options.UseWelcomePage = true;
    options.EnableHotReload = app.Environment.IsDevelopment();
});

app.MapControllers();
app.Run();
```

### Component Module Control

```csharp
// Default: All modules auto-included
public class MyDashboard : MinimactComponent { }

// Opt-out: Core only (12 KB)
[ModuleInfo(OptOut = true)]
public class LandingPage : MinimactComponent { }

// Exclude specific modules
[ModuleInfo(Exclude = new[] { "lodash", "moment" })]
public class ProductPage : MinimactComponent { }

// Explicit include only
[ModuleInfo(Include = new[] { "@minimact/power", "lodash" })]
public class DataProcessorPage : MinimactComponent { }
```

---

## Troubleshooting

### Module not found error

```bash
$ swig import some-package

❌ Unknown package: some-package

Available packages:

  Minimact modules:
    • @minimact/power
    • @minimact/mvc
    • @minimact/punch
    • @minimact/md

  External libraries:
    • lodash
    • moment
    • dayjs
    • axios
    • chart.js

  Use `swig import <package-name>` to install.
```

**Solution:** Only packages in the registry are supported. To add custom packages, manually download and place in `mact_modules/`.

### Global cache issues

If the global cache becomes corrupted:

```bash
# Windows
rmdir /s "%APPDATA%\minimact-cache"

# macOS/Linux
rm -rf ~/.local/share/minimact-cache

# Then reinstall
swig import lodash --force
```

### Module not loading in browser

1. Check `mact_modules/` directory exists
2. Verify `UseStaticFiles()` for mact_modules in Program.cs
3. Check browser DevTools Network tab for 404 errors
4. Verify `MactModuleRegistry` is registered and scanning

---

## Best Practices

1. **Use `swig init` for new projects** - Interactive, ensures you don't miss recommended modules
2. **Check in `mact_modules/` to Git** - Team uses exact same versions
3. **Use `[ModuleInfo]` attribute for optimization** - Opt-out unused modules on landing pages
4. **Keep modules updated** - Run `swig update --all` periodically
5. **Use global cache** - Don't delete, saves bandwidth and time

---

## Summary

The Swig CLI provides a **zero-config, npm-powered** module management system for Minimact applications:

- ✅ Uses npm under the hood (full package ecosystem)
- ✅ Global cache for offline-friendly installs
- ✅ Interactive commands (init, update)
- ✅ Automatic ASP.NET Core integration
- ✅ Opt-out performance control

**HIP HIP... MACT YAY!** 🎉
