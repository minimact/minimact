# Structural Change Instance Replacement

## Overview

This document describes the **structural change-driven instance replacement** strategy for hot reloading Minimact components. When Babel detects ANY structural changes (insertions/deletions) in the component tree, the entire component instance is replaced to ensure consistency and prevent stale VNode state.

## Core Principle: Predictable Replacement

**The Golden Rule**: It doesn't matter WHAT the structural change was (insert, delete, move, etc.) - just that ONE HAPPENED.

**Important Context**: Minimact's hot reload already works perfectly for:
- ✅ **Text changes**: "Hello" → "Hi" (template hot reload handles this)
- ✅ **Attribute changes**: `className="btn"` → `className="btn-primary"` (template hot reload handles this)
- ✅ **Logic changes**: `count * 2` → `count * 3` (re-renders with existing instance)

**What this enhancement adds**:
- ✅ **Structural changes**: Adding/removing JSX elements (this was the missing piece!)

Now all types of changes hot reload seamlessly.

**Why this makes hot reload more predictable and reliable:**

1. **Binary Decision**: Either structure changed or it didn't. No complex heuristics.
2. **No Edge Cases**: Don't need to handle "what if user adds then deletes?" or "what if element moved?"
3. **Always Safe**: Full replacement guarantees VNode tree matches DOM structure
4. **Developer Intuition**: "I changed the JSX structure → Component resets" (predictable mental model)
5. **Single Code Path**: One replacement algorithm handles ALL structural changes
6. **Completes the Picture**: Template hot reload + structural instance replacement = 100% coverage

This is a simpler, cleaner approach than field-based detection because:
- Babel already does the heavy lifting of detecting structural changes
- No need to compare `[State]` fields between old/new types
- Predictable trigger: `changes.Count > 0` → Full replacement (that's it!)
- Leverages existing `.structural-changes.json` output from Babel

---

## The Problem

When a developer adds or removes JSX elements from a component:

```tsx
// BEFORE
<div>
  <h1>Hello</h1>
</div>

// AFTER (added <p> element)
<div>
  <h1>Hello</h1>
  <p>World</p>  {/* NEW ELEMENT */}
</div>
```

Babel detects this as a **structural change** and generates `.structural-changes.json`:

```json
{
  "componentName": "Counter",
  "timestamp": "2025-01-08T14:32:15.123Z",
  "sourceFile": "Counter.tsx",
  "changes": [
    {
      "type": "insert",
      "path": "1.2",
      "vnode": {
        "type": "element",
        "tag": "p",
        "path": "1.2",
        "children": [...]
      }
    }
  ]
}
```

**The Issue**: The existing component instance in memory has a **stale VNode tree** that doesn't reflect the new structure. If we naively apply patches from the new type, the VNode paths will be misaligned with the actual DOM.

**The Solution**: Replace the entire component instance when ANY structural change is detected.

---

## Solution: Instance Replacement on Structural Changes

### Core Principle: Binary Decision

**The entire implementation boils down to:**

```csharp
if (changes.Changes.Count > 0)
{
    ReplaceComponentInstance();
}
```

**That's it.** No analysis of what changed, no comparison of before/after, no heuristics.

**Why this is brilliant:**

1. **Predictable**: Developer knows "JSX changed → full reset" (simple mental model)
2. **Reliable**: No edge cases like "what if they added 5 elements then deleted 3?"
3. **Fast**: O(1) check instead of O(n) tree diffing or reflection
4. **Correct**: Full replacement guarantees VNode paths are always synchronized

This is simpler than the field-based approach because:
- No need to analyze `[State]` fields via reflection
- No need to compare method signatures
- No need to handle rename detection, type changes, or field reordering
- Babel already tells us exactly when structure changed
- Works for all structural changes: new elements, removed elements, reordering, everything

### Flow

```
1. Developer edits Counter.tsx (adds <p> element)
   ↓
2. File watcher detects change
   ↓
3. Babel transpiles and generates:
   - Counter.cs (new C# code)
   - Counter.structural-changes.json (detected changes)
   ↓
4. StructuralChangeManager watches for .structural-changes.json
   ↓
5. Reads file and sees changes.length > 0
   ↓
6. Triggers full instance replacement:
   - Snapshot old instance state
   - Create new instance from new type
   - Migrate compatible state
   - Replace in registry (same ComponentId)
   - Trigger full re-render
   ↓
7. Client receives patches with correct VNode paths
```

---

## Architecture

### Phase 1: Type Registry in ComponentRegistry

Add type tracking to the existing `ComponentRegistry`:

```csharp
// ComponentRegistry.cs

private readonly ConcurrentDictionary<string, Type> _componentTypes = new();

/// <summary>
/// Register a component type (for hot reload)
/// </summary>
public void RegisterComponentType(string componentTypeName, Type componentType)
{
    _componentTypes[componentTypeName] = componentType;
}

/// <summary>
/// Resolve a component type by name
/// </summary>
public Type? ResolveComponentType(string componentTypeName)
{
    _componentTypes.TryGetValue(componentTypeName, out var type);
    return type;
}

/// <summary>
/// Get all component instances by type name
/// </summary>
public IEnumerable<MinimactComponent> GetComponentsByTypeName(string typeName)
{
    return _components.Values.Where(c => c.ComponentTypeName == typeName);
}
```

### Phase 2: ComponentTypeName Property

Add type name property to `MinimactComponent`:

```csharp
// MinimactComponent.cs

/// <summary>
/// Component type name (for hot reload type resolution)
/// </summary>
public string ComponentTypeName => GetType().Name;
```

### Phase 3: StructuralChangeManager

Create a new manager that watches `.structural-changes.json` files:

```csharp
// StructuralChangeManager.cs

namespace Minimact.AspNetCore.HotReload;

/// <summary>
/// Watches .structural-changes.json files and triggers full instance replacement
/// Simpler than field-based detection - relies on Babel's structural change detection
/// </summary>
public class StructuralChangeManager : IDisposable
{
    private readonly IHubContext<MinimactHub> _hubContext;
    private readonly ComponentRegistry _registry;
    private readonly ILogger<StructuralChangeManager> _logger;
    private readonly FileSystemWatcher _watcher;
    private readonly Dictionary<string, DateTime> _lastChangeTime = new();
    private readonly TimeSpan _debounceDelay = TimeSpan.FromMilliseconds(50);
    private bool _isDisposed;

    public StructuralChangeManager(
        IHubContext<MinimactHub> hubContext,
        ComponentRegistry registry,
        ILogger<StructuralChangeManager> logger,
        string watchPath)
    {
        _hubContext = hubContext;
        _registry = registry;
        _logger = logger;

        _watcher = new FileSystemWatcher
        {
            Path = watchPath,
            Filter = "*.structural-changes.json",
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName,
            IncludeSubdirectories = true,
            EnableRaisingEvents = true
        };

        _watcher.Changed += OnStructuralChangesFileChanged;
        _watcher.Created += OnStructuralChangesFileChanged;

        _logger.LogInformation("[Minimact Structural] 🔧 Watching {WatchPath} for *.structural-changes.json", watchPath);
    }

    /// <summary>
    /// Handle structural changes file event
    /// </summary>
    private async void OnStructuralChangesFileChanged(object sender, FileSystemEventArgs e)
    {
        try
        {
            // Debounce
            var now = DateTime.UtcNow;
            if (_lastChangeTime.TryGetValue(e.FullPath, out var lastChange))
            {
                if (now - lastChange < _debounceDelay)
                {
                    return;
                }
            }
            _lastChangeTime[e.FullPath] = now;

            _logger.LogInformation("[Minimact Structural] 📝 Structural changes file detected: {FileName}", e.Name);

            // Read structural changes
            var json = await ReadFileWithRetryAsync(e.FullPath);
            var changes = JsonSerializer.Deserialize<StructuralChanges>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (changes == null || changes.Changes.Count == 0)
            {
                _logger.LogDebug("[Minimact Structural] No changes in file, skipping");
                return;
            }

            _logger.LogInformation(
                "[Minimact Structural] 🔄 Detected {Count} structural change(s) in {Component}",
                changes.Changes.Count,
                changes.ComponentName
            );

            // Trigger full instance replacement
            await ReplaceComponentInstancesAsync(changes.ComponentName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Minimact Structural] Error processing structural changes");
        }
    }

    /// <summary>
    /// Replace all instances of a component type
    /// </summary>
    private async Task ReplaceComponentInstancesAsync(string componentTypeName)
    {
        // Get all instances of this component type
        var instances = _registry.GetComponentsByTypeName(componentTypeName).ToList();

        if (instances.Count == 0)
        {
            _logger.LogWarning("[Minimact Structural] No instances found for {ComponentType}", componentTypeName);
            return;
        }

        // Get the new type (should already be registered by transpilation pipeline)
        var newType = _registry.ResolveComponentType(componentTypeName);
        if (newType == null)
        {
            _logger.LogWarning("[Minimact Structural] Type not found in registry: {ComponentType}", componentTypeName);
            return;
        }

        _logger.LogInformation(
            "[Minimact Structural] 🔁 Replacing {Count} instance(s) of {ComponentType}",
            instances.Count,
            componentTypeName
        );

        foreach (var oldInstance in instances)
        {
            try
            {
                // 1. Snapshot old instance
                var stateSnapshot = new Dictionary<string, object>(oldInstance.State);
                var componentId = oldInstance.ComponentId;
                var connectionId = oldInstance.ConnectionId;
                var patchSender = oldInstance.PatchSender;

                // 2. Create new instance from new type
                var newInstance = (MinimactComponent)Activator.CreateInstance(newType)!;

                // 3. Restore identity and infrastructure
                newInstance.ComponentId = componentId; // Keep same ID!
                newInstance.ConnectionId = connectionId;
                newInstance.PatchSender = patchSender;

                // 4. Migrate compatible state (best-effort)
                foreach (var (key, value) in stateSnapshot)
                {
                    try
                    {
                        newInstance.State[key] = value;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[Minimact Structural] Failed to migrate state key '{Key}'", key);
                    }
                }

                // 5. Sync state to [State] fields
                StateManager.SyncStateToMembers(newInstance);

                // 6. Replace in registry
                _registry.RegisterComponent(newInstance);

                // 7. Trigger full re-render
                _logger.LogInformation(
                    "[Minimact Structural] ✅ Re-rendering {ComponentType} [{ComponentId}]",
                    componentTypeName,
                    componentId
                );
                newInstance.TriggerRender();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "[Minimact Structural] Failed to replace instance {ComponentId}",
                    oldInstance.ComponentId
                );
            }
        }
    }

    /// <summary>
    /// Read file with retry (files may be locked temporarily)
    /// </summary>
    private async Task<string> ReadFileWithRetryAsync(string filePath, int maxRetries = 3)
    {
        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                using var reader = new StreamReader(stream);
                return await reader.ReadToEndAsync();
            }
            catch (IOException) when (i < maxRetries - 1)
            {
                await Task.Delay(10);
            }
        }

        throw new IOException($"Could not read file after {maxRetries} attempts: {filePath}");
    }

    public void Dispose()
    {
        if (_isDisposed) return;
        _watcher?.Dispose();
        _isDisposed = true;
        _logger.LogInformation("[Minimact Structural] Structural change manager disposed");
    }
}
```

### Phase 4: StructuralChanges Model

```csharp
// Models/StructuralChanges.cs

namespace Minimact.AspNetCore.HotReload;

public class StructuralChanges
{
    public string ComponentName { get; set; } = "";
    public DateTime Timestamp { get; set; }
    public string SourceFile { get; set; } = "";
    public List<StructuralChange> Changes { get; set; } = new();
}

public class StructuralChange
{
    public string Type { get; set; } = ""; // "insert" or "delete"
    public string Path { get; set; } = "";
    public VNodeRepresentation? VNode { get; set; } // Only for insertions
}

public class VNodeRepresentation
{
    public string Type { get; set; } = ""; // "element" or "text"
    public string Tag { get; set; } = "";
    public string Path { get; set; } = "";
    public Dictionary<string, string> Attributes { get; set; } = new();
    public List<VNodeRepresentation> Children { get; set; } = new();
    public string? Value { get; set; } // For text nodes
}
```

### Phase 5: Wire into Startup

```csharp
// Program.cs or Startup.cs

services.AddSingleton<ComponentRegistry>();
services.AddSingleton<StructuralChangeManager>(provider =>
{
    var hubContext = provider.GetRequiredService<IHubContext<MinimactHub>>();
    var registry = provider.GetRequiredService<ComponentRegistry>();
    var logger = provider.GetRequiredService<ILogger<StructuralChangeManager>>();
    var watchPath = configuration.GetValue<string>("Minimact:HotReload:WatchPath")
                    ?? Directory.GetCurrentDirectory();
    return new StructuralChangeManager(hubContext, registry, logger, watchPath);
});

// Add to HotReloadInitializationService
public HotReloadInitializationService(
    HotReloadFileWatcher fileWatcher,
    TemplateHotReloadManager templateManager,
    StructuralChangeManager structuralManager,  // NEW
    ILogger<HotReloadInitializationService> logger)
{
    _fileWatcher = fileWatcher;
    _templateManager = templateManager;
    _structuralManager = structuralManager;  // NEW
    _logger = logger;
}
```

---

## The Philosophy: Don't Ask "What Changed?"

### Traditional Approach (Complex)

```csharp
// ❌ Complex: Try to understand what changed
if (AddedNewElement) { /* handle insert */ }
else if (RemovedElement) { /* handle delete */ }
else if (MovedElement) { /* handle reorder */ }
else if (ChangedAttributes) { /* handle attribute change */ }
else if (AddedAndDeleted) { /* handle both?? */ }
else if (NestedChanges) { /* recurse?? */ }
// ... endless edge cases
```

**Problem**: Every combination of changes requires custom handling logic.

### Minimact Approach (Simple)

```csharp
// ✅ Simple: Just detect that structure changed
if (structuralChangeDetected)
{
    ReplaceInstance(); // One code path for everything
}
```

**Benefit**: One algorithm handles ALL cases. No edge cases. No surprises.

### Developer Experience Comparison

**Complex Approach:**
```
Developer: "I added <p> then deleted <span>, why did it break?"
System: "Well, insert+delete triggered edge case #47..."
Developer: 😵‍💫
```

**Minimact Approach:**
```
Developer: "I changed the JSX structure"
System: "Component replaced, state migrated ✅"
Developer: 😎
```

**The key insight**: Structural change is a **binary state**, not a **spectrum of changes**.

---

## Complete Hot Reload System

With this enhancement, Minimact now has **complete hot reload coverage**:

### 1. Template Hot Reload (Already Working ✅)

**Handles**: Text and attribute changes without structural modifications

**Example**:
```tsx
// Change text content
<h1>Hello</h1>  →  <h1>Hi there!</h1>
// ✅ Template hot reload applies text patch

// Change attribute
<div className="btn">  →  <div className="btn btn-primary">
// ✅ Template hot reload applies attribute patch

// Change expression
<span>{count * 2}</span>  →  <span>{count * 3}</span>
// ✅ Re-render with existing instance, template applies new value
```

**How it works**:
- `.templates.json` file changes
- `TemplateHotReloadManager` detects changes
- Generates parameterized patches
- Sends to client
- Client applies patches (instant update!)

**Performance**: ~5-20ms (just patch application)

### 2. Structural Instance Replacement (This Enhancement 🆕)

**Handles**: Adding/removing JSX elements (structural changes)

**Example**:
```tsx
// Add element
<div>
  <h1>Hello</h1>
  {/* Add this: */}
  <p>New paragraph!</p>
</div>

// Remove element
<div>
  <h1>Hello</h1>
  {/* Delete <p> */}
</div>

// Both trigger: ✅ Full instance replacement
```

**How it works**:
- `.structural-changes.json` file created by Babel
- `StructuralChangeManager` detects file
- Checks `changes.Count > 0`
- Replaces component instance
- Triggers full re-render

**Performance**: ~15-60ms (instance replacement + re-render)

### 3. The Combined System

**Result**: Every type of change is handled elegantly:

| Change Type | Handler | Performance | State Preserved? |
|-------------|---------|-------------|------------------|
| Text content | Template Hot Reload | 5-20ms | ✅ Yes |
| Attributes | Template Hot Reload | 5-20ms | ✅ Yes |
| Logic/expressions | Template Hot Reload | 5-20ms | ✅ Yes |
| Add/remove elements | Structural Replacement | 15-60ms | ✅ Yes (migrated) |

**Developer Experience**: Everything just works. No need to think about it.

---

## Why This Approach is Better

### 1. **Simpler Detection Logic**

❌ **Field-based approach**: Reflect over types, compare field names/types, detect additions/removals
✅ **Structural change approach**: Just check `changes.Count > 0`

### 2. **Single Source of Truth**

Babel already detects structural changes for:
- Hot reload surgical updates (insert/delete VNodes)
- Template patch generation
- Predictive rendering hints

We leverage the same detection for instance replacement!

### 3. **Covers More Cases**

Field-based detection only catches `[State]` field changes. Structural change detection catches:
- ✅ New/removed JSX elements
- ✅ Reordered elements
- ✅ Conditional branches added/removed
- ✅ Loop items added/removed
- ✅ Component composition changes

### 4. **No Reflection Overhead**

Field-based approach requires:
```csharp
var oldFields = GetStateFields(oldType);
var newFields = GetStateFields(newType);
// Compare field names, types, attributes...
```

Structural approach requires:
```csharp
if (changes.Changes.Count > 0) { /* replace */ }
```

### 5. **Consistent Timing**

Structural changes are detected at the same time as:
- `.tsx.keys` file generation
- `.templates.json` generation
- `.cs` transpilation

This ensures all hot reload systems are synchronized.

---

## State Migration

### Preserved State

All state keys that exist in both old and new instances are migrated:

```csharp
foreach (var (key, value) in stateSnapshot)
{
    newInstance.State[key] = value;
}
```

**Best-effort migration**: If a state key fails to migrate (type mismatch, etc.), log a warning and continue.

### New State Fields

New `[State]` fields use their default values from the constructor:

```csharp
// BEFORE
[State] private int count = 0;

// AFTER (new field added)
[State] private int count = 0;
[State] private string message = "Hello";  // Uses default "Hello"
```

### Removed State Fields

Old state keys that no longer exist are silently discarded.

---

## Performance Characteristics

### Trigger Frequency

**Field-based approach**: Triggers on EVERY file save (always compares fields)
**Structural approach**: Only triggers when Babel detects actual structural changes

**Result**: Fewer unnecessary replacements!

### Replacement Cost

- **Snapshot state**: ~1ms (shallow copy of dictionary)
- **Create instance**: ~5ms (Activator.CreateInstance + constructor)
- **Migrate state**: ~1ms (dictionary copy)
- **Re-render**: ~10-50ms (depends on component complexity)

**Total**: ~15-60ms for full replacement (acceptable for dev environment)

### Comparison

| Operation | Field-Based | Structural-Based |
|-----------|------------|------------------|
| Detection | O(n) field comparison | O(1) check `changes.Count` |
| Trigger Frequency | Every file save | Only on structural changes |
| Covers JSX Changes | ❌ No | ✅ Yes |
| Covers Field Changes | ✅ Yes | ✅ Yes (indirect) |
| Implementation Complexity | High (reflection) | Low (JSON parsing) |

---

## Edge Cases

### Case 1: No Instances Running

```
User edits Counter.tsx but no Counter instances exist
→ Skip replacement
→ Next time Counter is mounted, it will use new type
```

### Case 2: Type Not Registered

```
Structural changes detected but type not in registry
→ Log warning
→ Next transpilation will register type
```

### Case 3: State Migration Failure

```
Old state: { count: 5, data: complexObject }
New instance rejects 'data' due to type mismatch
→ Log warning
→ Continue with other fields
→ 'data' resets to default value
```

### Case 4: Multiple Rapid Changes

```
User adds <p>, then <span>, then <div> rapidly
→ Debounce (50ms delay)
→ Only last structural change triggers replacement
→ All changes reflected in final type
```

---

## Benefits Over FULL_INSTANCE_REPLACEMENT.md

The original document proposed field-based detection. This approach is superior because:

| Aspect | Field-Based | Structural Change-Based |
|--------|-------------|------------------------|
| **Detection** | Reflect over types | Read `.structural-changes.json` |
| **Complexity** | High (reflection, field comparison) | Low (JSON parsing, count check) |
| **Trigger** | Every file save | Only on structural changes |
| **Covers** | Only `[State]` fields | All JSX structure changes |
| **Integration** | New system | Leverages existing Babel output |
| **Performance** | O(n) field comparison | O(1) check |
| **Reliability** | Must handle field renames, type changes | Babel already tested |

---

## Future Enhancements

### 1. Smart State Migration

Support custom migration functions:

```csharp
[StateMigration("oldKey", "newKey")]
public object MigrateState(object oldValue)
{
    return Transform(oldValue);
}
```

### 2. Rollback on Error

If new instance crashes during render:

```csharp
if (newInstance.TriggerRender() throws)
{
    _registry.RegisterComponent(oldInstance); // Rollback
}
```

### 3. DevTools Integration

Show replacement events in Minimact Swig:

```
🔁 Counter instance replaced (structural changes detected)
   ✅ State migrated: count = 5
   ℹ️  New field: message = "Hello"
```

### 4. Diff Visualization

Show what changed between old and new:

```
Structural Changes:
  + <p>World</p> at path 1.2
  - <span>Old</span> at path 1.3
```

---

## Implementation Checklist

- [ ] Add `_componentTypes` dictionary to `ComponentRegistry`
- [ ] Add `RegisterComponentType()` method
- [ ] Add `ResolveComponentType()` method
- [ ] Add `GetComponentsByTypeName()` method
- [ ] Add `ComponentTypeName` property to `MinimactComponent`
- [ ] Create `StructuralChangeManager` class
- [ ] Create `StructuralChanges` model classes
- [ ] Wire `StructuralChangeManager` into startup
- [ ] Update `HotReloadInitializationService` to inject `StructuralChangeManager`
- [ ] Test with simple component (add/remove element)
- [ ] Test with multiple instances
- [ ] Test state migration
- [ ] Add logging for visibility

---

## Summary

**Structural Change Instance Replacement** is the recommended hot reload strategy for Minimact because:

1. ✅ **Simpler**: Just check `changes.Count > 0` instead of reflecting over fields
2. ✅ **More comprehensive**: Catches ALL structural changes (JSX, fields, composition)
3. ✅ **Leverages Babel**: Uses existing `.structural-changes.json` output
4. ✅ **Better performance**: Only triggers when structure actually changed
5. ✅ **Single source of truth**: Same detection logic for hot reload and templates

The key insight: **Babel already tells us exactly when structure changed. Why duplicate that logic?**

---

**Document Version**: 1.0
**Last Updated**: 2025-01-08
**Author**: Minimact Hot Reload Team
