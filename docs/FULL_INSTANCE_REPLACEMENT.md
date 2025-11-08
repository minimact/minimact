\# Minimact Hot Reload: Full Instance Replacement Strategy



\## Overview



This document describes the \*\*Full Instance Replacement\*\* approach for hot reloading Minimact components when structural changes occur (e.g., adding/removing `\[State]` fields).



This strategy ensures \*\*safe, predictable hot reloading\*\* by recreating component instances when the component structure changes, while preserving compatible state.



---



\## The Problem



When a developer adds a new state field to a component:



```tsx

// BEFORE

const \[count, setCount] = useState(0);



// AFTER

const \[count, setCount] = useState(0);

const \[message, setMessage] = useState("Hello"); // NEW FIELD

```



The transpiled C# gains a new field:



```csharp

// BEFORE

\[State] private int count = 0;



// AFTER

\[State] private int count = 0;

\[State] private string message = "Hello"; // NEW FIELD

```



\*\*The Issue:\*\* The existing component instance in memory doesn't have the `message` field. If we naively call the new `Render()` method via reflection on the old instance, it will crash when trying to access `message`.



---



\## Solution: Full Instance Replacement



When structural changes are detected, we:



1\. \*\*Detect\*\* the change (new/removed fields)

2\. \*\*Snapshot\*\* the old instance's state

3\. \*\*Create\*\* a new instance from the new type

4\. \*\*Migrate\*\* compatible state (matching field names)

5\. \*\*Replace\*\* the old instance in the registry

6\. \*\*Re-render\*\* with the new instance



---



\## Implementation Architecture



\### Phase 1: Add Type Registry to ComponentRegistry



Extend the existing `ComponentRegistry` to track component \*\*types\*\* in addition to \*\*instances\*\*:



```csharp

// Add to ComponentRegistry.cs

private readonly ConcurrentDictionary<string, Type> \_componentTypes = new();



/// <summary>

/// Register a component type (for hot reload)

/// </summary>

public void RegisterComponentType(string componentName, Type componentType)

{

&nbsp;   \_componentTypes\[componentName] = componentType;

}



/// <summary>

/// Resolve a component type by name

/// </summary>

public Type? ResolveComponentType(string componentName)

{

&nbsp;   \_componentTypes.TryGetValue(componentName, out var type);

&nbsp;   return type;

}



/// <summary>

/// Get all component instances by type name

/// </summary>

public IEnumerable<MinimactComponent> GetComponentsByTypeName(string typeName)

{

&nbsp;   return \_components.Values.Where(c => c.ComponentTypeName == typeName);

}

```



\### Phase 2: Add ComponentTypeName to MinimactComponent



Add this property to `MinimactComponent.cs`:



```csharp

/// <summary>

/// Component type name (for hot reload type resolution)

/// </summary>

public string ComponentTypeName => GetType().Name;

```



\### Phase 3: Structural Change Detection



```csharp

public class HotReloadManager

{

&nbsp;   private readonly ComponentRegistry \_registry;



&nbsp;   public HotReloadManager(ComponentRegistry registry)

&nbsp;   {

&nbsp;       \_registry = registry;

&nbsp;   }



&nbsp;   /// <summary>

&nbsp;   /// Hot reload a component type after TSX file change

&nbsp;   /// </summary>

&nbsp;   public void ReloadComponent(string componentName, Type newType)

&nbsp;   {

&nbsp;       var oldType = \_registry.ResolveComponentType(componentName);



&nbsp;       if (oldType == null)

&nbsp;       {

&nbsp;           // First-time registration

&nbsp;           \_registry.RegisterComponentType(componentName, newType);

&nbsp;           return;

&nbsp;       }



&nbsp;       // Detect if structural changes occurred

&nbsp;       bool hasStructuralChanges = DetectStructuralChanges(oldType, newType);



&nbsp;       if (hasStructuralChanges)

&nbsp;       {

&nbsp;           Console.WriteLine($"\[Hot Reload] Structural changes detected in {componentName}, performing full instance replacement");

&nbsp;           ReplaceComponentInstances(componentName, newType);

&nbsp;       }

&nbsp;       else

&nbsp;       {

&nbsp;           Console.WriteLine($"\[Hot Reload] No structural changes in {componentName}, swapping type only");

&nbsp;           \_registry.RegisterComponentType(componentName, newType);

&nbsp;       }

&nbsp;   }



&nbsp;   /// <summary>

&nbsp;   /// Detect if structural changes occurred between old and new type

&nbsp;   /// </summary>

&nbsp;   private bool DetectStructuralChanges(Type oldType, Type newType)

&nbsp;   {

&nbsp;       var oldFields = GetStateFields(oldType);

&nbsp;       var newFields = GetStateFields(newType);



&nbsp;       // Check if field count changed

&nbsp;       if (oldFields.Count != newFields.Count)

&nbsp;           return true;



&nbsp;       // Check if field names or types changed

&nbsp;       foreach (var oldField in oldFields)

&nbsp;       {

&nbsp;           var newField = newFields.FirstOrDefault(f => f.Name == oldField.Name);

&nbsp;           

&nbsp;           if (newField == null)

&nbsp;               return true; // Field removed

&nbsp;           

&nbsp;           if (newField.FieldType != oldField.FieldType)

&nbsp;               return true; // Field type changed

&nbsp;       }



&nbsp;       return false;

&nbsp;   }



&nbsp;   /// <summary>

&nbsp;   /// Get all \[State] fields from a component type

&nbsp;   /// </summary>

&nbsp;   private List<FieldInfo> GetStateFields(Type type)

&nbsp;   {

&nbsp;       return type

&nbsp;           .GetFields(BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance)

&nbsp;           .Where(f => f.GetCustomAttribute<StateAttribute>() != null)

&nbsp;           .ToList();

&nbsp;   }



&nbsp;   /// <summary>

&nbsp;   /// Replace all instances of a component with new instances from new type

&nbsp;   /// </summary>

&nbsp;   private void ReplaceComponentInstances(string componentName, Type newType)

&nbsp;   {

&nbsp;       var instances = \_registry.GetComponentsByTypeName(componentName).ToList();



&nbsp;       Console.WriteLine($"\[Hot Reload] Replacing {instances.Count} instance(s) of {componentName}");



&nbsp;       foreach (var oldInstance in instances)

&nbsp;       {

&nbsp;           // 1. Snapshot state from old instance

&nbsp;           var stateSnapshot = new Dictionary<string, object>(oldInstance.State);

&nbsp;           var componentId = oldInstance.ComponentId;

&nbsp;           var connectionId = oldInstance.ConnectionId;

&nbsp;           var patchSender = oldInstance.PatchSender;

&nbsp;           var contextCache = oldInstance.ContextCache;



&nbsp;           // 2. Create new instance from new type

&nbsp;           var newInstance = (MinimactComponent)Activator.CreateInstance(newType);



&nbsp;           // 3. Restore identity and infrastructure

&nbsp;           newInstance.ComponentId = componentId; // Keep same ID!

&nbsp;           newInstance.ConnectionId = connectionId;

&nbsp;           newInstance.PatchSender = patchSender;

&nbsp;           newInstance.ContextCache = contextCache;



&nbsp;           // 4. Migrate compatible state (matching keys only)

&nbsp;           foreach (var kvp in stateSnapshot)

&nbsp;           {

&nbsp;               // Only migrate state keys that exist in new instance

&nbsp;               // New fields will use their default values

&nbsp;               if (HasStateKey(newType, kvp.Key))

&nbsp;               {

&nbsp;                   newInstance.State\[kvp.Key] = kvp.Value;

&nbsp;               }

&nbsp;               else

&nbsp;               {

&nbsp;                   Console.WriteLine($"\[Hot Reload] Skipping state key '{kvp.Key}' (not in new type)");

&nbsp;               }

&nbsp;           }



&nbsp;           // 5. Sync state dictionary back to \[State] fields

&nbsp;           StateManager.SyncStateToMembers(newInstance);



&nbsp;           // 6. Replace in registry

&nbsp;           \_registry.RegisterComponent(newInstance);



&nbsp;           // 7. Trigger full re-render with new instance

&nbsp;           Console.WriteLine($"\[Hot Reload] Re-rendering {componentName} \[{componentId}]");

&nbsp;           newInstance.TriggerRender();

&nbsp;       }



&nbsp;       // 8. Update type registry

&nbsp;       \_registry.RegisterComponentType(componentName, newType);

&nbsp;   }



&nbsp;   /// <summary>

&nbsp;   /// Check if a type has a specific state key

&nbsp;   /// </summary>

&nbsp;   private bool HasStateKey(Type type, string stateKey)

&nbsp;   {

&nbsp;       // Check if there's a \[State] field with matching name

&nbsp;       var field = type

&nbsp;           .GetFields(BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance)

&nbsp;           .FirstOrDefault(f => 

&nbsp;               f.GetCustomAttribute<StateAttribute>() != null \&\& 

&nbsp;               f.Name == stateKey);



&nbsp;       return field != null;

&nbsp;   }

}

```



\### Phase 4: Wire into ASP.NET Core Startup



```csharp

// In Program.cs or Startup.cs

services.AddSingleton<ComponentRegistry>();

services.AddSingleton<HotReloadManager>();

```



---



\## Hot Reload Pipeline



\### Complete Flow



```

1\. Developer edits Counter.tsx

&nbsp;  ↓

2\. File watcher detects change

&nbsp;  ↓

3\. Transpiler generates new Counter.cs

&nbsp;  ↓

4\. Roslyn compiles Counter.cs in-memory

&nbsp;  ↓

5\. New Counter type extracted from assembly

&nbsp;  ↓

6\. HotReloadManager.ReloadComponent("Counter", newType)

&nbsp;  ↓

7\. Detect structural changes (compare \[State] fields)

&nbsp;  ↓

&nbsp;  ├─ NO structural changes

&nbsp;  │  └─ Just swap type in registry (fast path)

&nbsp;  │     └─ Next render uses new Render() via reflection

&nbsp;  │

&nbsp;  └─ YES structural changes

&nbsp;     └─ Full instance replacement:

&nbsp;        1. Find all Counter instances

&nbsp;        2. For each instance:

&nbsp;           - Export state: { count: 5 }

&nbsp;           - Create new instance with new type

&nbsp;           - Import compatible state: count = 5

&nbsp;           - New fields get defaults: message = "Hello"

&nbsp;           - Replace in registry (same ComponentId)

&nbsp;           - Trigger full re-render

```



---



\## State Migration Rules



\### Scenario 1: Field Added



```csharp

// OLD TYPE

\[State] private int count = 0;



// NEW TYPE

\[State] private int count = 0;

\[State] private string message = "Hello";

```



\*\*Migration:\*\*

\- ✅ `count` → Preserved (value: 5)

\- ✅ `message` → Default value ("Hello")



\### Scenario 2: Field Removed



```csharp

// OLD TYPE

\[State] private int count = 0;

\[State] private string message = "Hello";



// NEW TYPE

\[State] private int count = 0;

```



\*\*Migration:\*\*

\- ✅ `count` → Preserved (value: 5)

\- ❌ `message` → Discarded (field no longer exists)



\### Scenario 3: Field Renamed



```csharp

// OLD TYPE

\[State] private int count = 0;



// NEW TYPE

\[State] private int counter = 0; // Renamed

```



\*\*Migration:\*\*

\- ❌ `count` → Discarded (no matching field name)

\- ✅ `counter` → Default value (0)



\*\*Note:\*\* Renames are treated as remove + add. No automatic migration.



\### Scenario 4: Field Type Changed



```csharp

// OLD TYPE

\[State] private int count = 0;



// NEW TYPE

\[State] private string count = "0"; // Type changed

```



\*\*Migration:\*\*

\- ❌ `count` → Discarded (type mismatch)

\- ✅ `count` → Default value ("0")



\*\*Note:\*\* Type changes trigger structural change, but value migration is skipped due to incompatible types.



---



\## Render Method Hot Swap (No Structural Changes)



When only the `Render()` method changes (no new fields), we can use the \*\*fast path\*\*:



```csharp

// In MinimactComponent.TriggerRender()

var currentType = ComponentRegistry.ResolveComponentType(ComponentTypeName);



if (currentType != null \&\& currentType != this.GetType())

{

&nbsp;   // Type was swapped, but no structural changes

&nbsp;   // Use reflection to call new Render() on existing instance

&nbsp;   var newRenderMethod = currentType.GetMethod("Render", 

&nbsp;       BindingFlags.NonPublic | BindingFlags.Instance);

&nbsp;   

&nbsp;   var newVNode = (VNode)newRenderMethod.Invoke(this, null);

&nbsp;   

&nbsp;   // Continue with patching...

}

else

{

&nbsp;   // Normal path - no hot reload

&nbsp;   var newVNode = Render();

}

```



\*\*Advantage:\*\* No instance recreation needed, just patches sent to client!



---



\## What Gets Preserved vs. Reset



\### ✅ Always Preserved

\- `ComponentId` (critical for SignalR routing)

\- `ConnectionId` (keeps WebSocket alive)

\- Compatible `\[State]` field values (matching name + type)

\- `PatchSender` reference

\- `ContextCache` reference



\### ❌ Always Reset

\- New `\[State]` fields (use default values)

\- Removed `\[State]` fields (discarded)

\- Renamed fields (treated as remove + add)

\- Constructor logic (runs again on new instance)

\- `OnInitialized()` lifecycle (runs again on new instance)



\### ⚠️ Developer Responsibility

\- Incompatible type changes (int → string)

\- Complex state transformations (manual migration code needed)

\- External resources (database connections, file handles, etc.)



---



\## Performance Characteristics



\### Fast Path (No Structural Changes)

\- \*\*Detection:\*\* O(n) field comparison (n = number of fields, typically < 10)

\- \*\*Execution:\*\* Type swap only

\- \*\*Render:\*\* Patches only (minimal DOM updates)

\- \*\*Speed:\*\* ~5-50ms



\### Slow Path (Structural Changes)

\- \*\*Detection:\*\* O(n) field comparison

\- \*\*Execution:\*\* Instance recreation + state migration

\- \*\*Render:\*\* Full re-render (entire component tree)

\- \*\*Speed:\*\* ~50-200ms (depends on component complexity)



\*\*Note:\*\* Slow path only triggers on structural changes, which are less common than logic-only edits.



---



\## Error Handling



\### Compilation Errors



```csharp

public void ReloadComponent(string componentName, Type newType)

{

&nbsp;   try

&nbsp;   {

&nbsp;       var oldType = \_registry.ResolveComponentType(componentName);

&nbsp;       

&nbsp;       if (oldType == null)

&nbsp;       {

&nbsp;           \_registry.RegisterComponentType(componentName, newType);

&nbsp;           return;

&nbsp;       }



&nbsp;       bool hasStructuralChanges = DetectStructuralChanges(oldType, newType);



&nbsp;       if (hasStructuralChanges)

&nbsp;       {

&nbsp;           ReplaceComponentInstances(componentName, newType);

&nbsp;       }

&nbsp;       else

&nbsp;       {

&nbsp;           \_registry.RegisterComponentType(componentName, newType);

&nbsp;       }

&nbsp;   }

&nbsp;   catch (Exception ex)

&nbsp;   {

&nbsp;       Console.WriteLine($"\[Hot Reload] Failed to reload {componentName}: {ex.Message}");

&nbsp;       // Keep old type in registry - don't break existing instances

&nbsp;   }

}

```



\### State Migration Errors



```csharp

foreach (var kvp in stateSnapshot)

{

&nbsp;   try

&nbsp;   {

&nbsp;       if (HasStateKey(newType, kvp.Key))

&nbsp;       {

&nbsp;           newInstance.State\[kvp.Key] = kvp.Value;

&nbsp;       }

&nbsp;   }

&nbsp;   catch (Exception ex)

&nbsp;   {

&nbsp;       Console.WriteLine($"\[Hot Reload] Failed to migrate state '{kvp.Key}': {ex.Message}");

&nbsp;       // Continue with other fields

&nbsp;   }

}

```



---



\## Comparison: Hot Reload Strategies



| Strategy | Pros | Cons | When to Use |

|----------|------|------|-------------|

| \*\*Full Instance Replacement\*\* | ✅ Safe, predictable<br>✅ Handles all changes<br>✅ Simple implementation | ❌ Full re-render<br>❌ Re-runs constructor | Structural changes (new/removed fields) |

| \*\*Type Swap + Reflection\*\* | ✅ Fast (patches only)<br>✅ Preserves all state<br>✅ No re-render | ❌ Crashes on field changes<br>❌ Complex reflection logic | Render() logic changes only |

| \*\*Hybrid\*\* | ✅ Best of both worlds | ❌ Complex detection logic<br>❌ More edge cases | Production systems |



\*\*Minimact Recommendation:\*\* Start with Full Instance Replacement for reliability, optimize to Hybrid later if needed.



---



\## Future Enhancements



\### 1. Smart State Migration



Support custom migration functions for complex transformations:



```csharp

\[StateMigration("count", "counter")]

public object MigrateCountToCounter(object oldValue)

{

&nbsp;   return (int)oldValue; // Custom logic

}

```



\### 2. Incremental Field Addition



For additive-only changes, dynamically add fields to existing instance using runtime IL generation (advanced).



\### 3. State Diff Visualization



Show developers what state was preserved vs. reset in DevTools.



\### 4. Rollback Support



Keep previous type in case new type crashes:



```csharp

if (newInstanceCrashes)

{

&nbsp;   RollbackToType(componentName, oldType);

}

```



---



\## Summary



\*\*Full Instance Replacement\*\* is the recommended hot reload strategy for Minimact because:



1\. ✅ \*\*Works for all change types\*\* (structure + logic)

2\. ✅ \*\*Preserves compatible state\*\* (count = 5 maintained)

3\. ✅ \*\*Safe and predictable\*\* (no runtime crashes)

4\. ✅ \*\*Simple to implement\*\* (minimal reflection hacks)

5\. ✅ \*\*Easy to reason about\*\* (clear migration rules)



The tradeoff of full re-renders on structural changes is acceptable because:

\- Structural changes are less frequent than logic changes

\- Re-render cost is amortized over development time savings

\- Can be optimized later with hybrid approach if needed



---



\## Next Steps



1\. Implement `HotReloadManager` class

2\. Add type tracking to `ComponentRegistry`

3\. Build file watcher for `.tsx` files

4\. Integrate Roslyn in-memory compilation

5\. Wire hot reload pipeline into ASP.NET Core

6\. Test with Counter component

7\. Add error boundaries for safety

8\. Build DevTools integration for state visualization



---



\*\*Document Version:\*\* 1.0  

\*\*Last Updated:\*\* 2025-11-08  

\*\*Author:\*\* Minimact Hot Reload Team

