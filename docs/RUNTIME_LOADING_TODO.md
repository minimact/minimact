# Runtime Component Loading - Integration TODO

**Status:** Core implementation complete, integration pending
**Date:** January 2025

## Executive Summary

We've implemented the **runtime component loading architecture** where components are compiled from JSON at runtime using Roslyn, eliminating pre-generated .cs files. However, several integration steps are needed to make this fully operational.

## ✅ What's Been Completed

### 1. Core Runtime Component Loading
- ✅ `ComponentLoader.cs` - Loads JSON, compiles with Roslyn, returns component instance
- ✅ `ComponentNode.BaseClass` property - Supports user-written codebehind pattern
- ✅ `CSharpCodeGenerator` inheritance support - Generates `class Counter : CounterBase`
- ✅ Roslyn metadata references - All framework DLLs included
- ✅ Cache system - Compiled assemblies cached by component name

**Location:** `src/Minimact.AspNetCore/Runtime/ComponentLoader.cs`

### 2. Template Generation (In-Memory)
- ✅ `GetTemplates()` method generation - Returns `Dictionary<string, object>`
- ✅ `TemplateCollectorVisitor` - Extracts templates from component JSON
- ✅ Template metadata as C# objects - No JSON strings or file I/O
- ✅ All template types supported - Text, attributes, conditionals, loops, complex

**Location:** `src/minimact-transpiler/codegen/Minimact.Transpiler.CodeGen/Visitors/CSharpCodeGenerator.cs` (lines 372-559)

### 3. Babel Plugin Updates (Swig)
- ✅ `transpiler-babel` stores JSON in metadata - `state.file.metadata.minimactJson`
- ✅ `TranspilerService.ts` updated - Uses `transpiler-babel` instead of old plugin
- ✅ Output path unchanged - `.tsx` → `.json` in same location

**Location:**
- `src/minimact-swig-electron/mact_modules/@minimact/transpiler-babel/src/index.js`
- `src/minimact-swig-electron/src/main/services/TranspilerService.ts`

### 4. Hot Reload Infrastructure
- ✅ `RuntimeComponentHotReloadManager.cs` - Watches `.json` files, reloads components
- ✅ Component cache invalidation - `ComponentLoader.InvalidateCache()`
- ✅ SignalR notification - Sends `ComponentReloaded` event with templates

**Location:** `src/Minimact.AspNetCore/HotReload/RuntimeComponentHotReloadManager.cs`

---

## ❌ What Still Needs to Be Done

### CRITICAL: Integration Tasks

#### 1. Wire Up ComponentLoader in ASP.NET Core Startup ⚠️

**Status:** NOT IMPLEMENTED

**What's Missing:**
- ComponentLoader is not registered in DI container
- ComponentLoader is not used to load components at startup
- Components are still loaded the old way (pre-compiled DLLs)

**What Needs to Be Done:**

**File:** `Program.cs` or `Startup.cs` in example projects

```csharp
// Add to Program.cs ConfigureServices / builder.Services

// Register ComponentLoader
builder.Services.AddSingleton(sp =>
{
    var componentsPath = Path.Combine(
        builder.Environment.ContentRootPath,
        "Components" // or "src/Components"
    );
    return new ComponentLoader(componentsPath);
});

// Load all components at startup
var app = builder.Build();

var componentLoader = app.Services.GetRequiredService<ComponentLoader>();
var registry = app.Services.GetRequiredService<ComponentRegistry>();

foreach (var componentName in componentLoader.GetAvailableComponents())
{
    try
    {
        var component = componentLoader.Load(componentName);
        registry.RegisterComponent(componentName, component);
        Console.WriteLine($"[Minimact] ✅ Loaded component: {componentName}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Minimact] ❌ Failed to load {componentName}: {ex.Message}");
    }
}
```

**Impact:** Without this, ComponentLoader is never used and the system falls back to old behavior.

---

#### 2. Update MinimactComponent Base Class ⚠️

**Status:** PARTIALLY IMPLEMENTED (method exists but may need to be abstract/virtual)

**What's Missing:**
- `GetTemplates()` method may not exist in `MinimactComponent` base class
- If it doesn't exist, generated code will fail to compile

**What Needs to Be Done:**

**File:** `src/Minimact.AspNetCore/Core/MinimactComponent.cs`

```csharp
/// <summary>
/// Get template metadata for predictive rendering
/// Override in generated components to provide template data
/// </summary>
public virtual Dictionary<string, object> GetTemplates()
{
    return new Dictionary<string, object>();
}
```

**How to Check:**
```bash
cd src/Minimact.AspNetCore
grep -n "GetTemplates" Core/MinimactComponent.cs
```

If no results, add the method above.

**Impact:** Generated components will fail to compile with error "no suitable method found to override".

---

#### 3. Wire Up RuntimeComponentHotReloadManager ⚠️

**Status:** NOT WIRED UP

**What's Missing:**
- `RuntimeComponentHotReloadManager` created but not registered in DI
- Not instantiated or started
- Hot reload won't work

**What Needs to Be Done:**

**File:** `Program.cs` or `Startup.cs`

```csharp
// Register hot reload manager as singleton
builder.Services.AddSingleton<RuntimeComponentHotReloadManager>(sp =>
{
    var hubContext = sp.GetRequiredService<IHubContext<MinimactHub>>();
    var registry = sp.GetRequiredService<ComponentRegistry>();
    var componentLoader = sp.GetRequiredService<ComponentLoader>();
    var logger = sp.GetRequiredService<ILogger<RuntimeComponentHotReloadManager>>();

    var watchPath = Path.Combine(
        builder.Environment.ContentRootPath,
        "Components" // or "src/Components"
    );

    return new RuntimeComponentHotReloadManager(
        hubContext,
        registry,
        componentLoader,
        logger,
        watchPath
    );
});

// Start hot reload manager
var app = builder.Build();
var hotReloadManager = app.Services.GetRequiredService<RuntimeComponentHotReloadManager>();
// Manager starts watching in constructor
```

**Impact:** Hot reload won't work - editing JSON files won't trigger component reloading.

---

#### 4. Update ComponentRegistry.RegisterComponent() 🤔

**Status:** UNKNOWN - NEEDS VERIFICATION

**What Might Be Missing:**
- Registry might expect Type instead of instance
- Registry might need to store templates separately

**What Needs to Be Checked:**

**File:** `src/Minimact.AspNetCore/Core/ComponentRegistry.cs`

Check the signature:
```csharp
public void RegisterComponent(string componentId, MinimactComponent component);
// OR
public void RegisterComponent(string componentId, Type componentType);
```

If it expects `Type`, we need to change it to accept instances OR change ComponentLoader to return Type.

**How to Fix (if needed):**

Option A: Change registry to accept instances
```csharp
public void RegisterComponent(string componentId, MinimactComponent instance)
{
    _components[componentId] = instance;
}
```

Option B: Change ComponentLoader to return Type
```csharp
public Type LoadType(string componentName)
{
    // ... existing code ...
    return componentType; // Return Type instead of instance
}
```

**Impact:** Registration may fail or components may not be accessible at runtime.

---

#### 5. Update Predictor to Call GetTemplates() ⚠️

**Status:** NOT IMPLEMENTED

**What's Missing:**
- Rust predictor currently expects `.templates.json` files
- Needs to be updated to call C# `GetTemplates()` method instead

**What Needs to Be Done:**

**File:** `src/minimact-rust-predictor/src/lib.rs` or similar

**Current (File-Based):**
```rust
pub fn load_templates(component_id: &str) -> TemplateMap {
    let path = format!("{}.templates.json", component_id);
    let json = std::fs::read_to_string(path)?;
    serde_json::from_str(&json)?
}
```

**New (In-Memory):**
```rust
// C# Bridge function needed
#[no_mangle]
pub extern "C" fn minimact_get_component_templates(
    component_ptr: *const c_void
) -> *const c_char {
    // Call C# component.GetTemplates() via interop
    // Convert Dictionary<string, object> to JSON or native format
}
```

**Alternative (Simpler):**
Keep file-based for now, but generate files from GetTemplates() in ComponentLoader:

```csharp
// In ComponentLoader.Load() after compilation:
var templates = component.GetTemplates();
var templatesJson = JsonSerializer.Serialize(templates, new JsonSerializerOptions { WriteIndented = true });
var templatesPath = Path.Combine(_componentsPath, $"{componentName}.templates.json");
File.WriteAllText(templatesPath, templatesJson);
```

**Impact:** Predictor won't have access to templates for predictive rendering. Hot reload will be broken.

---

#### 6. Handle Component Dependencies/Imports 🤔

**Status:** POTENTIALLY MISSING

**What Might Be Missing:**
- If components import other components, those need to be resolved
- ComponentLoader might need to track dependencies

**What Needs to Be Checked:**

Does JSON include imports?
```json
{
  "componentName": "TodoList",
  "imports": {
    "TodoItem": "./TodoItem"
  }
}
```

If yes, ComponentLoader needs to:
1. Parse imports
2. Load dependent components first
3. Add to Roslyn references

**What Needs to Be Done (if needed):**

```csharp
// In ComponentLoader.Load()
if (componentNode.Imports != null && componentNode.Imports.Count > 0)
{
    foreach (var import in componentNode.Imports)
    {
        // Load imported component first
        var importedComponent = Load(import.Key, forceReload);
        // Add to references for Roslyn compilation
    }
}
```

**Impact:** Components that use other components may fail to compile or runtime errors.

---

#### 7. Error Handling & Logging 📝

**Status:** BASIC IMPLEMENTATION

**What Could Be Better:**
- ComponentLoader errors should be more descriptive
- Failed components should not crash the app
- Error details should be sent to Swig for display

**What Needs to Be Done:**

Add better error handling:
```csharp
public MinimactComponent Load(string componentName, bool forceReload = false)
{
    try
    {
        // ... existing code ...
    }
    catch (FileNotFoundException ex)
    {
        _logger.LogError("Component JSON not found: {ComponentName}. Ensure Babel has transpiled {File}.tsx",
            componentName, componentName);
        throw;
    }
    catch (JsonException ex)
    {
        _logger.LogError("Invalid JSON for component {ComponentName}: {Error}",
            componentName, ex.Message);
        throw;
    }
    catch (CompilationErrorException ex)
    {
        _logger.LogError("Compilation failed for {ComponentName}:\n{Errors}\n\nGenerated Code:\n{Code}",
            componentName, ex.Errors, ex.GeneratedCode);
        throw;
    }
}
```

**Impact:** Debugging will be harder without good error messages.

---

#### 8. Testing & Validation ✅

**Status:** NOT TESTED

**What Needs to Be Done:**

1. **Unit Tests:**
   - Test ComponentLoader with sample JSON
   - Test template extraction
   - Test hot reload manager

2. **Integration Tests:**
   - Create simple Counter component
   - Transpile with Babel
   - Load via ComponentLoader
   - Verify templates exist
   - Test hot reload

3. **End-to-End Test:**
   ```bash
   # 1. Start file manager example
   cd examples/minimact-electron-filemanager
   dotnet run

   # 2. Edit a .tsx file in Swig
   # 3. Verify JSON is regenerated
   # 4. Verify component reloads
   # 5. Verify client sees updates
   ```

---

## 📋 Implementation Checklist

### Phase 1: Core Wiring (Required for Basic Functionality)
- [ ] Add `GetTemplates()` to `MinimactComponent` base class
- [ ] Register `ComponentLoader` in DI container
- [ ] Load components at startup using `ComponentLoader`
- [ ] Verify components compile and load successfully

**Test:** Can we load a simple component from JSON?

### Phase 2: Hot Reload (Required for Development)
- [ ] Register `RuntimeComponentHotReloadManager` in DI
- [ ] Test JSON file change detection
- [ ] Verify component reloading works
- [ ] Verify SignalR notifications sent to clients

**Test:** Can we edit a component and see live updates?

### Phase 3: Template Integration (Required for Predictions)
- [ ] Generate `.templates.json` files from `GetTemplates()` (temporary bridge)
- [ ] OR: Update Rust predictor to call `GetTemplates()` directly
- [ ] Verify predictor can access templates
- [ ] Test predictive rendering works

**Test:** Do predictions work with runtime-loaded components?

### Phase 4: Polish (Nice to Have)
- [ ] Better error handling and logging
- [ ] Component dependency resolution
- [ ] Performance optimization (parallel loading)
- [ ] Unit and integration tests
- [ ] Update documentation

---

## 🚀 Quick Start Guide (Once Wired Up)

### 1. Update Program.cs

Add to your example project's `Program.cs`:

```csharp
using Minimact.AspNetCore.Runtime;
using Minimact.AspNetCore.HotReload;

var builder = WebApplication.CreateBuilder(args);

// Add Minimact services
builder.Services.AddMinimact();

// Register ComponentLoader
builder.Services.AddSingleton(sp =>
{
    var componentsPath = Path.Combine(builder.Environment.ContentRootPath, "Components");
    return new ComponentLoader(componentsPath);
});

// Register Hot Reload Manager
builder.Services.AddSingleton<RuntimeComponentHotReloadManager>(sp =>
{
    var hubContext = sp.GetRequiredService<IHubContext<MinimactHub>>();
    var registry = sp.GetRequiredService<ComponentRegistry>();
    var componentLoader = sp.GetRequiredService<ComponentLoader>();
    var logger = sp.GetRequiredService<ILogger<RuntimeComponentHotReloadManager>>();
    var watchPath = Path.Combine(builder.Environment.ContentRootPath, "Components");

    return new RuntimeComponentHotReloadManager(hubContext, registry, componentLoader, logger, watchPath);
});

var app = builder.Build();

// Load all components at startup
var componentLoader = app.Services.GetRequiredService<ComponentLoader>();
var registry = app.Services.GetRequiredService<ComponentRegistry>();

foreach (var componentName in componentLoader.GetAvailableComponents())
{
    var component = componentLoader.Load(componentName);
    registry.RegisterComponent(componentName, component);
    Console.WriteLine($"[Minimact] ✅ Loaded: {componentName}");
}

// Initialize hot reload
var _ = app.Services.GetRequiredService<RuntimeComponentHotReloadManager>();

app.Run();
```

### 2. Create Components Folder

```bash
mkdir -p Components
```

### 3. Transpile Components

In Swig:
- Edit `.tsx` file
- Transpile → generates `.json` in `Components/`

OR manually:
```bash
npx babel src/Counter.tsx --plugins=@minimact/transpiler-babel --out-file=Components/Counter.json
```

### 4. Run and Test

```bash
dotnet run
# Edit Counter.tsx in Swig
# Watch for hot reload messages in console
```

---

## 🔍 Verification Commands

```bash
# Check if GetTemplates exists in base class
grep -n "GetTemplates" src/Minimact.AspNetCore/Core/MinimactComponent.cs

# Check ComponentRegistry signature
grep -n "RegisterComponent" src/Minimact.AspNetCore/Core/ComponentRegistry.cs

# Check if examples use ComponentLoader
grep -r "ComponentLoader" examples/*/Program.cs

# Check if Rust predictor uses file-based templates
grep -r "templates.json" src/minimact-rust-predictor/
```

---

## 📊 Risk Assessment

| Item | Risk | Impact | Priority |
|------|------|--------|----------|
| GetTemplates() not in base | 🔴 High | Compilation fails | P0 - Critical |
| ComponentLoader not registered | 🔴 High | Runtime loading doesn't work | P0 - Critical |
| Hot reload not wired up | 🟡 Medium | Dev experience degraded | P1 - High |
| Predictor integration | 🟡 Medium | No predictions | P1 - High |
| Component dependencies | 🟢 Low | Some components may fail | P2 - Medium |
| Error handling | 🟢 Low | Harder debugging | P3 - Low |

---

## 💡 Recommendation

**Start with Phase 1 (Core Wiring) immediately:**

1. Add `GetTemplates()` to `MinimactComponent.cs`
2. Update one example project's `Program.cs` to use `ComponentLoader`
3. Create a simple test component and verify it loads
4. If successful, proceed to Phase 2 (Hot Reload)

**Estimated Time:**
- Phase 1: 2-4 hours
- Phase 2: 2-3 hours
- Phase 3: 4-6 hours
- Phase 4: Variable

**Total:** 1-2 days for full integration

---

## 📝 Notes

- The architecture is **sound** - all core components are implemented correctly
- The missing pieces are **integration glue** - wiring up the components
- Once integrated, this will be **significantly cleaner** than the old file-based system
- Hot reload will be **faster** since we compile on-demand with Roslyn
- Templates in memory means **zero I/O** for template access

---

**Status:** Ready for integration phase
**Next Step:** Update `MinimactComponent.cs` and wire up `ComponentLoader`
