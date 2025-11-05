# Runtime Component Loading Architecture

**Status:** ✅ Implemented
**Version:** 2.0
**Date:** January 2025

## Executive Summary

Minimact 2.0 introduces **runtime component loading** - a revolutionary architecture where components are compiled from JSON at runtime using Roslyn, eliminating the need for generated .cs files.

### Before (File-Based)
```
TSX → Babel → JSON → CodeGen CLI → .cs files → dotnet build → DLL → Runtime
```

### Now (Runtime)
```
TSX → Babel → JSON
             ↓
ASP.NET Startup: JSON → Roslyn → Component instance
```

## Key Benefits

| Benefit | Impact |
|---------|--------|
| **No .cs file clutter** | JSON is the single source of truth |
| **Instant hot reload** | Edit TSX → regenerate JSON → server reloads |
| **Simpler deployment** | Ship JSON files, no pre-compilation needed |
| **Better for IDEs** | Swig can watch and auto-reload seamlessly |
| **Roslyn integration** | Native C# compilation at runtime |

## Architecture Overview

### ComponentLoader

The `ComponentLoader` class (in `Minimact.AspNetCore.Runtime`) is responsible for:

1. **Reading JSON** from disk
2. **Deserializing** to `ComponentNode` objects
3. **Generating C# code** using `CSharpCodeGenerator` visitor
4. **Compiling with Roslyn** to in-memory assembly
5. **Instantiating** the component class
6. **Caching** compiled components for performance

### JSON → C# Flow

```csharp
// 1. Read JSON
var json = File.ReadAllText("components/Counter.json");
var componentNode = JsonSerializer.Deserialize<ComponentNode>(json);

// 2. Generate C# code
var codeGenerator = new CSharpCodeGenerator();
componentNode.Accept(codeGenerator);
var csharpCode = codeGenerator.GetGeneratedCode();

// 3. Compile with Roslyn
var compilation = CSharpCompilation.Create("MinimactComponent_Counter")
    .AddReferences(...)
    .AddSyntaxTrees(CSharpSyntaxTree.ParseText(csharpCode));

// 4. Load assembly
using var ms = new MemoryStream();
compilation.Emit(ms);
var assembly = Assembly.Load(ms.ToArray());

// 5. Instantiate component
var componentType = assembly.GetTypes()
    .FirstOrDefault(t => typeof(MinimactComponent).IsAssignableFrom(t));
return (MinimactComponent)Activator.CreateInstance(componentType);
```

## Codebehind Strategy: Option 3 (JSON Declares Base Class)

### The Pattern

User writes server logic in a C# base class. JSON references it and generates a derived class with the Render() method.

### Example

**Counter.cs (User-Written Codebehind)**
```csharp
namespace Minimact.Components;

public class CounterBase : MinimactComponent
{
    [State] protected int count = 0;

    [ServerMethod]
    public void Increment()
    {
        count++;
        TriggerRender();
    }

    [ServerMethod]
    public void Decrement()
    {
        count--;
        TriggerRender();
    }
}
```

**Counter.json (From Babel Plugin)**
```json
{
  "type": "Component",
  "componentName": "Counter",
  "baseClass": "Minimact.Components.CounterBase",
  "renderMethod": {
    "type": "RenderMethod",
    "children": [
      {
        "type": "JSXElement",
        "tag": "div",
        "path": "10000000",
        ...
      }
    ]
  }
}
```

**Counter.Generated.cs (From ComponentLoader at Runtime)**
```csharp
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using System.Collections.Generic;
using System.Linq;

namespace Minimact.Components;

[TextTemplate(Path = new[] { "10000000", "10000000" }, Template = "Count: {0}", Bindings = new[] { "count" })]
[Component]
public partial class Counter : Minimact.Components.CounterBase
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div",
            children: new VNode[] {
                new VText($"Count: {count}"),
                new VElement("button",
                    attributes: new Dictionary<string, object> {
                        { "onClick", new ServerMethod(nameof(Increment)) }
                    },
                    children: new VNode[] { new VText("+") }
                ),
                new VElement("button",
                    attributes: new Dictionary<string, object> {
                        { "onClick", new ServerMethod(nameof(Decrement)) }
                    },
                    children: new VNode[] { new VText("-") }
                )
            }
        );
    }
}
```

### Why This Pattern?

✅ **Clear separation**: User writes logic, JSON defines UI
✅ **TSX is source of truth** for UI structure
✅ **Optional codebehind**: Can have pure JSON components (no base class)
✅ **Easy to understand**: "Component extends my base class"
✅ **Type-safe**: User C# gets full IntelliSense and compile-time checking

## Hot Reload Integration

### File Watcher (for Swig)

```csharp
// Watch TSX files
var watcher = new FileSystemWatcher("components", "*.tsx");
watcher.Changed += async (sender, e) =>
{
    // 1. Run Babel to regenerate JSON
    await RunBabelPlugin(e.FullPath);

    // 2. Invalidate ComponentLoader cache
    componentLoader.InvalidateCache(componentName);

    // 3. Reload component
    var newComponent = componentLoader.Load(componentName, forceReload: true);

    // 4. Trigger re-render for all connected clients
    await hub.Clients.All.SendAsync("ComponentReloaded", componentName);
};
```

### Babel Integration

```bash
# Watch mode (for development)
npx babel src/components --watch --plugins=minimact-transpiler/babel --out-dir=components
```

## Usage in ASP.NET Core

### Startup Configuration

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Register ComponentLoader
builder.Services.AddSingleton(sp =>
{
    var componentsPath = Path.Combine(builder.Environment.ContentRootPath, "components");
    return new ComponentLoader(componentsPath);
});

var app = builder.Build();

// Load components at startup
var componentLoader = app.Services.GetRequiredService<ComponentLoader>();
var availableComponents = componentLoader.GetAvailableComponents();

foreach (var componentName in availableComponents)
{
    var component = componentLoader.Load(componentName);
    // Register with component registry
    registry.RegisterComponent(componentName, component);
}

app.Run();
```

### Dynamic Loading

```csharp
// Load component on-demand
public class MyController : Controller
{
    private readonly ComponentLoader _loader;

    public MyController(ComponentLoader loader)
    {
        _loader = loader;
    }

    public IActionResult Index()
    {
        var counter = _loader.Load("Counter");
        return View(counter);
    }
}
```

## Performance Considerations

### Caching

The `ComponentLoader` maintains an in-memory cache of compiled assemblies:

```csharp
private readonly Dictionary<string, (Assembly Assembly, Type ComponentType)> _cache;
```

- **First load**: Reads JSON, generates C#, compiles with Roslyn (~50-200ms)
- **Subsequent loads**: Returns cached type, instantiates (~1-5ms)
- **Cache invalidation**: On file change or explicit call to `InvalidateCache()`

### Memory Usage

Each compiled component assembly is ~10-50KB in memory. For a typical app with 50 components:
- Total memory: ~500KB - 2.5MB
- Negligible compared to typical ASP.NET Core memory footprint

### Compilation Time

| Component Complexity | Compilation Time |
|---------------------|------------------|
| Simple (Counter) | 50-100ms |
| Medium (TodoList) | 100-200ms |
| Complex (Dashboard) | 200-500ms |

**Note:** This is one-time cost at startup or hot reload. Runtime performance is identical to pre-compiled components.

## Deployment

### Development

```
MyApp/
├── components/
│   ├── Counter.json       ← From Babel
│   ├── Counter.cs         ← User-written codebehind
│   ├── TodoList.json
│   └── TodoList.cs
└── src/
    └── Program.cs         ← Initializes ComponentLoader
```

### Production

Ship the same structure:
```bash
dotnet publish -c Release
```

The published output includes:
- `components/*.json` (UI definitions)
- `components/*.cs` (server logic)
- `Minimact.AspNetCore.dll` (framework with ComponentLoader)

No pre-generated .cs files needed!

## Migration from File-Based System

### Old Workflow

1. Write TSX
2. Run `minimact transpile` (generates .cs files)
3. Run `dotnet build`
4. Run `dotnet run`

### New Workflow

1. Write TSX
2. Run Babel watch (generates JSON in real-time)
3. Run `dotnet run` (loads from JSON at startup)

### Migration Steps

1. **Remove old codegen step** from build scripts
2. **Add Babel watch** to development workflow
3. **Register ComponentLoader** in Program.cs
4. **Move user logic** to `ComponentBase` classes
5. **Update JSON** to reference base classes

### Example Migration

**Before:**
```bash
npm run transpile  # Generates Counter.Generated.cs
dotnet build
dotnet run
```

**After:**
```bash
npx babel src/components --watch --plugins=minimact-transpiler/babel --out-dir=components &
dotnet run  # Loads from JSON automatically
```

## Future Enhancements

### 1. Source Maps
Generate source maps to map generated C# back to TSX for debugging.

### 2. Type Inference
Infer C# types from TypeScript definitions for better type safety.

### 3. Incremental Compilation
Only recompile changed components instead of full rebuild.

### 4. Assembly Sharing
Share common code across component assemblies to reduce memory.

### 5. Roslyn Caching
Use Roslyn's incremental compilation APIs for faster hot reload.

### 6. VSCode Extension
Real-time feedback on TSX → JSON → C# pipeline with inline errors.

## API Reference

### ComponentLoader

```csharp
public class ComponentLoader
{
    // Constructor
    public ComponentLoader(string componentsPath);

    // Load a component (with optional cache bypass)
    public MinimactComponent Load(string componentName, bool forceReload = false);

    // Cache management
    public void InvalidateCache(string componentName);
    public void InvalidateAllCache();

    // Discovery
    public IEnumerable<string> GetAvailableComponents();
}
```

### ComponentNode

```csharp
public class ComponentNode : BaseNode
{
    public string ComponentName { get; set; }
    public string? BaseClass { get; set; }          // ← NEW!
    public RenderMethodNode? RenderMethod { get; set; }
    public Dictionary<string, string> Imports { get; set; }
    public HooksMetadata? Hooks { get; set; }
    public List<EventHandlerMetadata> EventHandlers { get; set; }
}
```

### CSharpCodeGenerator

```csharp
public class CSharpCodeGenerator : INodeVisitor
{
    // Generate code from component node
    public void Visit(ComponentNode node);

    // Get generated C# code
    public string GetGeneratedCode();
}
```

## Troubleshooting

### Component fails to load

**Error:** `Component JSON not found: components/Counter.json`

**Solution:** Ensure Babel plugin has run and generated the JSON file.

```bash
npx babel src/components/Counter.tsx --plugins=minimact-transpiler/babel --out-file=components/Counter.json
```

### Compilation errors

**Error:** `Component compilation failed: CS0246: The type or namespace name 'CounterBase' could not be found`

**Solution:** Ensure the base class exists and is accessible:
```csharp
// Check namespace matches JSON
namespace Minimact.Components;  // Must match JSON's baseClass

public class CounterBase : MinimactComponent
{
    // ...
}
```

### Performance issues

**Problem:** Slow startup time

**Solution:** Enable parallel component loading:

```csharp
var tasks = availableComponents.Select(async name =>
{
    await Task.Run(() => componentLoader.Load(name));
});

await Task.WhenAll(tasks);
```

### Memory leaks

**Problem:** Memory usage grows over time

**Solution:** Ensure old assemblies are unloaded after hot reload (requires `AssemblyLoadContext`):

```csharp
// TODO: Implement AssemblyLoadContext for proper unloading
var context = new AssemblyLoadContext("Component_" + componentName, isCollectible: true);
var assembly = context.LoadFromStream(ms);
// ... later ...
context.Unload();
```

## Conclusion

Runtime component loading transforms Minimact into a truly dynamic, live-reloadable framework where:

- ✅ **JSON is the source of truth** for UI structure
- ✅ **User C# is the source of truth** for server logic
- ✅ **Roslyn bridges the gap** at runtime
- ✅ **No generated file clutter** in source control
- ✅ **Instant hot reload** for rapid development
- ✅ **Seamless deployment** with no build-time codegen step

This architecture enables Minimact Swig (IDE) to provide the ultimate developer experience:

```
Edit TSX → Babel → JSON → Hot Reload → See changes instantly
```

All without ever leaving your IDE.🚀

---

**Next Steps:**
1. Integrate with Minimact Swig for IDE experience
2. Add file watcher for automatic hot reload
3. Create example projects using new architecture
4. Update documentation and tutorials

