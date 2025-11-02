# MinimactPageRenderer - Extension Script Support

**Status:** ✅ IMPLEMENTED
**Version:** 0.1.3
**Date:** November 1, 2025

## Problem

The `MinimactPageRenderer` was only including the core Minimact runtime (`/js/minimact.js`) in generated HTML, but **not** the extension packages:
- ❌ `/js/minimact-mvc.min.js` (for useMvcState, useMvcViewModel)
- ❌ `/js/minimact-punch.min.js` (for useDomElementState)

This caused **404 errors** and **broken functionality** when TSX components used extension hooks.

## Solution

Added two new properties to `MinimactPageRenderOptions`:
1. **`IncludeMvcExtension`** - Include @minimact/mvc script (default: `true`)
2. **`IncludePunchExtension`** - Include @minimact/punch script (default: `false`)

## Implementation

### MinimactPageRenderOptions.cs

```csharp
public class MinimactPageRenderOptions
{
    // Existing properties...
    public string? ClientScriptPath { get; set; }
    public bool EnableDebugLogging { get; set; } = false;
    public bool EnableCacheBusting { get; set; } = false;

    // NEW: Extension script inclusion
    /// <summary>
    /// Include @minimact/mvc extension script (default: true for MVC Bridge)
    /// Set to true when using useMvcState or useMvcViewModel hooks
    /// Adds: <script src="/js/minimact-mvc.min.js"></script>
    /// </summary>
    public bool IncludeMvcExtension { get; set; } = true;

    /// <summary>
    /// Include @minimact/punch extension script (default: false)
    /// Set to true when using useDomElementState hook
    /// Adds: <script src="/js/minimact-punch.min.js"></script>
    /// </summary>
    public bool IncludePunchExtension { get; set; } = false;

    // Existing properties...
    public string? AdditionalHeadContent { get; set; }
    public string? AdditionalBodyContent { get; set; }
}
```

### GeneratePageHtml() Method

```csharp
private string GeneratePageHtml(
    MinimactComponent component,
    string componentHtml,
    string title,
    string viewModelJson,
    MinimactPageRenderOptions options)
{
    var scriptSrc = options.ClientScriptPath ?? "/js/minimact.js";

    // Add cache busting for development
    if (options.EnableCacheBusting)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        scriptSrc += $"?v={timestamp}";
    }

    // Auto-detect required extension scripts based on options
    var extensionScripts = new System.Text.StringBuilder();

    if (options.IncludeMvcExtension)
    {
        var mvcScriptSrc = "/js/minimact-mvc.min.js";
        if (options.EnableCacheBusting)
        {
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            mvcScriptSrc += $"?v={timestamp}";
        }
        extensionScripts.AppendLine($"    <script src=\"{mvcScriptSrc}\"></script>");
    }

    if (options.IncludePunchExtension)
    {
        var punchScriptSrc = "/js/minimact-punch.min.js";
        if (options.EnableCacheBusting)
        {
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            punchScriptSrc += $"?v={timestamp}";
        }
        extensionScripts.AppendLine($"    <script src=\"{punchScriptSrc}\"></script>");
    }

    var enableDebugLogging = options.EnableDebugLogging ? "true" : "false";

    return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{EscapeHtml(title)}</title>
    <script src=""{EscapeHtml(scriptSrc)}""></script>
{extensionScripts}    {(options.AdditionalHeadContent != null ? options.AdditionalHeadContent : "")}
    ...
</head>
...
```

## Usage

### Default Behavior (MVC Extension Included)

```csharp
// ProductsController.cs
public async Task<IActionResult> Details(int id)
{
    var viewModel = new ProductViewModel { /* ... */ };

    // No options specified → IncludeMvcExtension defaults to true
    return await _renderer.RenderPage<ProductDetailsPage>(
        viewModel: viewModel,
        pageTitle: "Product Details"
    );
}
```

**Generated HTML:**
```html
<head>
    <title>Product Details</title>
    <script src="/js/minimact.js"></script>
    <script src="/js/minimact-mvc.min.js"></script>  <!-- ✅ Included by default -->
</head>
```

### Including Punch Extension

```csharp
// ExamplesController.cs
public async Task<IActionResult> DomStateExample()
{
    var viewModel = new ExampleViewModel();

    return await _renderer.RenderPage<DomStateExamplePage>(
        viewModel: viewModel,
        pageTitle: "DOM State Example",
        options: new MinimactPageRenderOptions
        {
            IncludeMvcExtension = true,   // MVC hooks
            IncludePunchExtension = true  // DOM element state hooks
        }
    );
}
```

**Generated HTML:**
```html
<head>
    <title>DOM State Example</title>
    <script src="/js/minimact.js"></script>
    <script src="/js/minimact-mvc.min.js"></script>    <!-- ✅ MVC -->
    <script src="/js/minimact-punch.min.js"></script>  <!-- ✅ Punch -->
</head>
```

### Excluding MVC Extension (Non-MVC Page)

```csharp
// StandardController.cs
public async Task<IActionResult> Counter()
{
    var viewModel = new CounterViewModel();

    return await _renderer.RenderPage<CounterPage>(
        viewModel: viewModel,
        pageTitle: "Counter",
        options: new MinimactPageRenderOptions
        {
            IncludeMvcExtension = false  // Not using MVC hooks
        }
    );
}
```

**Generated HTML:**
```html
<head>
    <title>Counter</title>
    <script src="/js/minimact.js"></script>  <!-- ✅ Core only -->
</head>
```

## Integration with Swig Hook Library

When Swig's Hook Library generates projects with selected hooks, it:

1. **Copies required JS files** to `wwwroot/js/`:
   - If `useMvcState` selected → copies `minimact-mvc.min.js`
   - If `useDomElementState` selected → copies `minimact-punch.min.js`

2. **MinimactPageRenderer automatically includes them** via options:
   - `IncludeMvcExtension = true` (default for MVC template)
   - `IncludePunchExtension = true` (if Punch hooks selected)

### Flow Diagram

```
User creates MVC project with Punch hooks in Swig
  ↓
HookExampleGenerator.copyRequiredJsFiles()
  ├─ Copies minimact-mvc.min.js to wwwroot/js/
  └─ Copies minimact-punch.min.js to wwwroot/js/
  ↓
ProductsController calls MinimactPageRenderer
  ↓
MinimactPageRenderer checks options
  ├─ IncludeMvcExtension = true  → Add <script src="/js/minimact-mvc.min.js">
  └─ IncludePunchExtension = true → Add <script src="/js/minimact-punch.min.js">
  ↓
HTML generated with all required scripts
  ↓
Browser loads page
  ├─ ✅ GET /js/minimact.js → 200 OK
  ├─ ✅ GET /js/minimact-mvc.min.js → 200 OK
  └─ ✅ GET /js/minimact-punch.min.js → 200 OK
  ↓
All hooks work correctly!
```

## Benefits

### For Developers
- ✅ **No manual script tags** - Automatic inclusion based on options
- ✅ **Type-safe configuration** - Boolean properties in strongly-typed options class
- ✅ **Cache busting support** - Extensions respect `EnableCacheBusting` setting
- ✅ **Consistent URLs** - All scripts follow `/js/minimact-*.min.js` pattern

### For MVC Templates
- ✅ **Default inclusion** - MVC extension included by default (sensible default)
- ✅ **Opt-out if needed** - Set `IncludeMvcExtension = false` for non-MVC pages
- ✅ **Multiple extensions** - Can include both MVC and Punch in same page

### For Hook Library
- ✅ **Automatic integration** - Generated MVC controllers use correct options
- ✅ **Zero manual setup** - Files copied + options set automatically
- ✅ **No 404 errors** - All required scripts present and referenced

## Example: Complete MVC Project Setup

### 1. User Creates Project in Swig

```
Template: MVC
Hooks selected:
  ✓ useState
  ✓ useMvcState
  ✓ useDomElementState
```

### 2. Swig Generates Files

```
MyMvcProject/
├── wwwroot/
│   └── js/
│       ├── minimact.js               ← Core runtime
│       ├── minimact-mvc.min.js       ← MVC extension (from mact_modules)
│       └── minimact-punch.min.js     ← Punch extension (from mact_modules)
├── Controllers/
│   └── ProductsController.cs
├── ViewModels/
│   └── ProductViewModel.cs
└── Pages/
    ├── ProductDetailsPage.tsx        ← Uses useMvcState
    └── Examples/
        ├── Index.tsx
        ├── UseStateExample.tsx
        ├── UseMvcStateExample.tsx
        └── UseDomElementStateExample.tsx
```

### 3. Generated Controller

```csharp
[ApiController]
[Route("[controller]")]
public class ProductsController : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;

    [HttpGet("{id}")]
    public async Task<IActionResult> Details(int id)
    {
        var viewModel = new ProductViewModel { /* ... */ };

        // Default options → IncludeMvcExtension = true
        return await _renderer.RenderPage<ProductDetailsPage>(
            viewModel: viewModel,
            pageTitle: "Product Details"
        );
    }
}
```

### 4. Generated HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Details</title>
    <script src="/js/minimact.js"></script>
    <script src="/js/minimact-mvc.min.js"></script>  <!-- ✅ Automatic -->
    <style>...</style>
</head>
<body>
    <div id="minimact-root" data-minimact-component="...">...</div>

    <!-- MVC ViewModel Data -->
    <script id="minimact-viewmodel" type="application/json">
    {"data":{"productName":"Widget","price":99.99,...},"_mutability":{...}}
    </script>

    <script>
        window.__MINIMACT_VIEWMODEL__ = JSON.parse(
            document.getElementById('minimact-viewmodel').textContent
        );

        const minimact = new Minimact.Minimact('#minimact-root', {
            enableDebugLogging: false
        });
        minimact.start();
    </script>
</body>
</html>
```

### 5. Runtime Behavior

```
Browser loads page
  ↓
Loads minimact.js
  └─ Core runtime initialized
  ↓
Loads minimact-mvc.min.js
  └─ useMvcState and useMvcViewModel registered
  ↓
(Punch not loaded - not included in options)
  ↓
Component renders
  ├─ useMvcState('productName') ✅ Works
  ├─ useMvcState('quantity', { sync: 'immediate' }) ✅ Works
  └─ Mutability enforcement active ✅ Works
```

## Backwards Compatibility

### ✅ No Breaking Changes

Existing code continues to work:

```csharp
// Before (still works)
return await _renderer.RenderPage<ProductDetailsPage>(
    viewModel: viewModel,
    pageTitle: "Product Details"
);

// After (same result - IncludeMvcExtension defaults to true)
return await _renderer.RenderPage<ProductDetailsPage>(
    viewModel: viewModel,
    pageTitle: "Product Details"
);
```

### Migration Path

If you have custom rendering logic:

```csharp
// OLD: Manual script tags in AdditionalHeadContent
options.AdditionalHeadContent = @"
    <script src=""/js/minimact-mvc.min.js""></script>
    <script src=""/js/minimact-punch.min.js""></script>
";

// NEW: Use built-in properties (cleaner)
options.IncludeMvcExtension = true;
options.IncludePunchExtension = true;
// AdditionalHeadContent now only for custom CSS, meta tags, etc.
```

## Testing

### Test Case 1: MVC Extension (Default)

```csharp
var options = new MinimactPageRenderOptions();
Assert.True(options.IncludeMvcExtension);  // ✅ Default is true
Assert.False(options.IncludePunchExtension); // ✅ Default is false
```

### Test Case 2: Generated HTML Includes Scripts

```csharp
var html = await _renderer.RenderPage<ProductDetailsPage>(
    viewModel,
    "Product Details",
    new MinimactPageRenderOptions
    {
        IncludeMvcExtension = true,
        IncludePunchExtension = true
    }
);

Assert.Contains("<script src=\"/js/minimact.js\"></script>", html);
Assert.Contains("<script src=\"/js/minimact-mvc.min.js\"></script>", html);
Assert.Contains("<script src=\"/js/minimact-punch.min.js\"></script>", html);
```

### Test Case 3: Cache Busting

```csharp
var html = await _renderer.RenderPage<ProductDetailsPage>(
    viewModel,
    "Product Details",
    new MinimactPageRenderOptions
    {
        EnableCacheBusting = true,
        IncludeMvcExtension = true,
        IncludePunchExtension = true
    }
);

Assert.Contains("/js/minimact.js?v=", html);
Assert.Contains("/js/minimact-mvc.min.js?v=", html);
Assert.Contains("/js/minimact-punch.min.js?v=", html);
```

## Summary

### Changes Made

**File:** `src/Minimact.AspNetCore/Rendering/MinimactPageRenderer.cs`

1. ✅ Added `IncludeMvcExtension` property to `MinimactPageRenderOptions` (default: `true`)
2. ✅ Added `IncludePunchExtension` property to `MinimactPageRenderOptions` (default: `false`)
3. ✅ Updated `GeneratePageHtml()` to conditionally include extension scripts
4. ✅ Applied cache busting to extension scripts when enabled

### Impact

- ✅ **MVC Bridge:** Fully functional with automatic script inclusion
- ✅ **Punch Hooks:** Supported via `IncludePunchExtension = true`
- ✅ **Swig Integration:** Hook Library generates working projects
- ✅ **No Breaking Changes:** Existing code works unchanged
- ✅ **Better DX:** No manual script management required

### Package Version

Update `Minimact.AspNetCore.csproj`:
```xml
<Version>0.1.3</Version>
```

Changelog:
- Added automatic extension script inclusion support
- New properties: `IncludeMvcExtension`, `IncludePunchExtension`
- Improved integration with @minimact/mvc and @minimact/punch packages
