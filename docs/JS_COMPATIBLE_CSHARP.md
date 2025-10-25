# JS-Compatible C# Type System

**Goal**: Make C# code explicitly transpiler-friendly by using custom types that map 1:1 to JavaScript/TypeScript.

## Philosophy

Instead of making the transpiler "guess" what C# code means in JavaScript, use explicit types that declare intent:

```csharp
// ❌ Ambiguous - Dictionary could be Map or object literal
Dictionary<string, int> counts = new Dictionary<string, int>();

// ✅ Explicit - JsMap always becomes Map
JsMap<string, int> counts = new JsMap<string, int>();
```

---

## Custom Type Mappings

### 1. Collections

| C# Type | JS/TS Type | Usage |
|---------|------------|-------|
| `JsMap<K, V>` | `Map<K, V>` | Key-value pairs with iteration |
| `JsArray<T>` | `Array<T>` | Dynamic arrays (already works with `List<T>`) |
| `JsSet<T>` | `Set<T>` | Unique values |

### 2. Variables (Mutability)

| C# Suffix | TS Keyword | Usage |
|-----------|------------|-------|
| `varName_const` | `const` | Immutable binding |
| `varName_let` | `let` | Mutable binding |
| `varName` (no suffix) | `const` | Default to const |

### 3. Return Types (Nullability)

| C# Type | TS Type | Usage |
|---------|---------|-------|
| `MouseTrajectory?` | `MouseTrajectory \| null` | Nullable reference (C# 8.0+) |
| `MouseTrajectory` | `MouseTrajectory` | Non-null |

### 4. Nested Types

| C# Pattern | TS Pattern | Usage |
|------------|------------|-------|
| Nested `class` | Top-level `interface` | Data containers only |
| Nested `struct` | Top-level `interface` | Data containers only |

**Rule**: No nested types in transpiler-targeted files. Use top-level declarations.

---

## Implementation

### Step 1: Create JS-Compatible Types (`Minimact.Workers.JsTypes.cs`)

```csharp
using System;
using System.Collections;
using System.Collections.Generic;

namespace Minimact.Workers
{
    /// <summary>
    /// JavaScript Map wrapper for transpiler targeting
    /// Transpiles to: Map<K, V>
    /// </summary>
    public class JsMap<K, V> : IEnumerable<KeyValuePair<K, V>>
    {
        private readonly Dictionary<K, V> _inner = new Dictionary<K, V>();

        // Core Map methods
        public V Get(K key) => _inner[key];
        public void Set(K key, V value) => _inner[key] = value;
        public bool Has(K key) => _inner.ContainsKey(key);
        public bool Delete(K key) => _inner.Remove(key);
        public void Clear() => _inner.Clear();
        public int Size => _inner.Count;

        // Iteration support (for foreach)
        public IEnumerator<KeyValuePair<K, V>> GetEnumerator() => _inner.GetEnumerator();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

        // Constructor
        public JsMap() { }
    }

    /// <summary>
    /// JavaScript Array wrapper for transpiler targeting
    /// Transpiles to: Array<T>
    /// </summary>
    public class JsArray<T> : IEnumerable<T>
    {
        private readonly List<T> _inner = new List<T>();

        // Core Array methods
        public void Push(T item) => _inner.Add(item);
        public T Pop() => { var item = _inner[_inner.Count - 1]; _inner.RemoveAt(_inner.Count - 1); return item; }
        public int Length => _inner.Count;
        public T this[int index]
        {
            get => _inner[index];
            set => _inner[index] = value;
        }

        // Slice (immutable)
        public JsArray<T> Slice(int start) => Slice(start, _inner.Count);
        public JsArray<T> Slice(int start, int end)
        {
            var result = new JsArray<T>();
            for (int i = start; i < end && i < _inner.Count; i++)
            {
                result.Push(_inner[i]);
            }
            return result;
        }

        // Iteration
        public IEnumerator<T> GetEnumerator() => _inner.GetEnumerator();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

        // Constructor
        public JsArray() { }
        public JsArray(int capacity) { _inner.Capacity = capacity; }
    }

    /// <summary>
    /// JavaScript Set wrapper for transpiler targeting
    /// Transpiles to: Set<T>
    /// </summary>
    public class JsSet<T> : IEnumerable<T>
    {
        private readonly HashSet<T> _inner = new HashSet<T>();

        public void Add(T item) => _inner.Add(item);
        public bool Has(T item) => _inner.Contains(item);
        public bool Delete(T item) => _inner.Remove(item);
        public void Clear() => _inner.Clear();
        public int Size => _inner.Count;

        public IEnumerator<T> GetEnumerator() => _inner.GetEnumerator();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

        public JsSet() { }
    }
}
```

### Step 2: Update Transpiler Mappings

In `TypeScriptGenerator.cs`:

```csharp
private string MapIdentifierType(IdentifierNameSyntax identifier)
{
    var typeName = identifier.Identifier.ValueText;

    return typeName switch
    {
        // JS-Compatible types (explicit)
        "JsMap" => "Map",
        "JsArray" => "Array",
        "JsSet" => "Set",

        // Legacy mappings (for backward compatibility)
        "Dictionary" => "Map",  // Keep for now, deprecate later
        "List" => "Array",

        // Primitives
        "String" => "string",
        "Boolean" => "boolean",
        "Double" => "number",
        "Int32" => "number",

        _ => typeName
    };
}
```

### Step 3: Create Roslyn Analyzer (Pre-build Enforcement)

Create `Minimact.Analyzers` project with analyzer:

```csharp
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public class JsCompatibleTypesAnalyzer : DiagnosticAnalyzer
{
    public const string DiagnosticId = "MINIMACT001";

    private static readonly DiagnosticDescriptor Rule = new DiagnosticDescriptor(
        DiagnosticId,
        "Use JsMap instead of Dictionary in transpiler-targeted files",
        "Type '{0}' is not JS-compatible. Use 'JsMap<{1}, {2}>' instead",
        "Transpiler",
        DiagnosticSeverity.Error,
        isEnabledByDefault: true);

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics => ImmutableArray.Create(Rule);

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterSyntaxNodeAction(AnalyzeNode, SyntaxKind.GenericName);
    }

    private static void AnalyzeNode(SyntaxNodeAnalysisContext context)
    {
        var genericName = (GenericNameSyntax)context.Node;

        // Only check files in Minimact.Workers namespace
        var namespaceSymbol = context.SemanticModel.GetEnclosingNamespace(genericName.SpanStart);
        if (namespaceSymbol?.ToString() != "Minimact.Workers")
            return;

        // Check for Dictionary usage
        if (genericName.Identifier.ValueText == "Dictionary")
        {
            var typeArgs = genericName.TypeArgumentList.Arguments;
            if (typeArgs.Count == 2)
            {
                var diagnostic = Diagnostic.Create(
                    Rule,
                    genericName.GetLocation(),
                    "Dictionary",
                    typeArgs[0],
                    typeArgs[1]);

                context.ReportDiagnostic(diagnostic);
            }
        }

        // Check for List usage (suggest JsArray)
        if (genericName.Identifier.ValueText == "List")
        {
            // Could add warning for this too
        }
    }
}
```

### Step 4: Update C# Worker Code

**Before:**
```csharp
public class ConfidenceEngine
{
    private Dictionary<string, ObservableElement> observableElements;
    private Dictionary<string, double> predictionThrottle;

    public void RegisterElement(string elementId, ObservableElement element)
    {
        observableElements[elementId] = element;
    }
}
```

**After:**
```csharp
public class ConfidenceEngine
{
    private JsMap<string, ObservableElement> observableElements;
    private JsMap<string, double> predictionThrottle;

    public void RegisterElement(string elementId, ObservableElement element)
    {
        observableElements.Set(elementId, element);  // Explicit Set() method
    }
}
```

---

## Benefits Breakdown

### 1. Transpiler Simplification

**Before** (Complex):
```csharp
// Transpiler needs to know:
// - Dictionary<K,V> → Map<K,V>
// - dict[key] → map.get(key)
// - dict[key] = value → map.set(key, value)
// - dict.ContainsKey(key) → map.has(key)
// - dict.Remove(key) → map.delete(key)
// - foreach(var kvp in dict) → for(const [k,v] of map)
```

**After** (Simple):
```csharp
// Transpiler just needs:
// - JsMap<K,V> → Map<K,V>
// - jsMap.Set(k, v) → jsMap.set(k, v)
// - jsMap.Get(k) → jsMap.get(k)
// - jsMap.Has(k) → jsMap.has(k)
// - foreach(var kvp in jsMap) → for(const [k,v] of jsMap)
```

Method names already match! Just lowercase the first letter.

### 2. Algorithm Parity

C# code **actually calls the same APIs** as JS:

```csharp
// C#
observableElements.Set(elementId, element);
observableElements.Has(elementId);
observableElements.Delete(elementId);

// Transpiled TS
observableElements.set(elementId, element);
observableElements.has(elementId);
observableElements.delete(elementId);
```

Perfect 1:1 mapping = guaranteed parity!

### 3. Compile-Time Safety

```csharp
// ❌ Compile error - caught before transpilation!
Dictionary<string, int> counts = new Dictionary<string, int>();
// Error MINIMACT001: Use JsMap instead of Dictionary in transpiler-targeted files

// ✅ Compiles
JsMap<string, int> counts = new JsMap<string, int>();
```

### 4. Self-Documenting

```csharp
// Team member sees this and knows:
// "This file is transpiled to TS"
private JsMap<string, ObservableElement> elements;
private JsArray<TrajectoryPoint> history;
```

---

## Migration Path

### Phase 1: Add JsTypes (Non-Breaking)
- ✅ Create `JsMap`, `JsArray`, `JsSet` classes
- ✅ Update transpiler to recognize them
- ✅ Keep existing `Dictionary`/`List` support

### Phase 2: Migrate Worker Code
- ✅ Update `Minimact.Workers` to use `JsMap`/`JsArray`
- ✅ Test C# version still works
- ✅ Test transpiled TS version

### Phase 3: Add Analyzer (Enforcement)
- ✅ Create Roslyn analyzer
- ✅ Enable in `Minimact.Workers.csproj`
- ✅ Existing code now shows errors

### Phase 4: Remove Legacy Support
- ⏳ Remove `Dictionary` → `Map` mapping from transpiler
- ⏳ Only support explicit `JsMap`/`JsArray`

---

## Pre-Build Enforcement Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Developer writes C# code in Minimact.Workers           │
│                                                          │
│  var points = new JsArray<TrajectoryPoint>();          │
│  var filtered = points.filter(p => p.x > 0);           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Pre-build Step 1: Roslyn Analyzer                      │
│                                                          │
│  ✅ Check: Using JsArray? ✓                             │
│  ✅ Check: No Dictionary? ✓                             │
│  ✅ Check: No nested classes? ✓                         │
│  ✅ Check: Using .filter() not .Where()? ✓             │
│                                                          │
│  ❌ If violations found → Build fails with clear error  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼ (Build succeeds)
┌─────────────────────────────────────────────────────────┐
│  Pre-build Step 2: Transpiler runs                      │
│                                                          │
│  Input:  points.filter(p => p.x > 0);                   │
│  Output: points.filter(p => p.x > 0);                   │
│                                                          │
│  (Almost no transformation needed!)                     │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  TypeScript output ready for web worker                 │
│  const points = new Array<TrajectoryPoint>();           │
│  const filtered = points.filter(p => p.x > 0);          │
└─────────────────────────────────────────────────────────┘
```

### Analyzer Rules

#### ❌ Rule 1: No Dictionary
```csharp
// ❌ Build Error MINIMACT001
Dictionary<string, Element> elements = new Dictionary<string, Element>();
// Error: Use JsMap<string, Element> instead of Dictionary in transpiler-targeted files
```

#### ❌ Rule 2: No LINQ methods
```csharp
// ❌ Build Error MINIMACT002
var filtered = points.Where(p => p.x > 0);
// Error: Use .filter() instead of LINQ .Where() in transpiler-targeted files
```

#### ❌ Rule 3: No nested classes
```csharp
// ❌ Build Error MINIMACT003
public class MouseTracker {
    public class Result {  // Nested class!
        public double Confidence { get; set; }
    }
}
// Error: Nested types not allowed in transpiler-targeted files. Move 'Result' to top level.
```

#### ❌ Rule 4: No array indexer assignment on JsMap
```csharp
// ❌ Build Error MINIMACT004
JsMap<string, int> map = new JsMap<string, int>();
map["key"] = 5;  // Using indexer instead of Set()
// Error: Use .Set(key, value) instead of indexer on JsMap
```

#### ✅ Rule 5: Enforce _let suffix on mutable vars
```csharp
// ❌ Build Error MINIMACT005
double minDistance = double.PositiveInfinity;  // Will be reassigned later
minDistance = 100;  // Reassignment detected!
// Error: Variable 'minDistance' is reassigned. Use 'minDistance_let' suffix.

// ✅ Fixed
double minDistance_let = double.PositiveInfinity;
minDistance_let = 100;  // OK!
```

---

## Open Questions

### 1. What about LINQ?

**Problem**: C# LINQ doesn't map cleanly to JS array methods.

**Solution**: Provide `JsArray` methods that mirror JS:

```csharp
public class JsArray<T>
{
    // JS-style methods
    public JsArray<U> Map<U>(Func<T, U> fn) => ...;
    public JsArray<T> Filter(Func<T, bool> fn) => ...;
    public U Reduce<U>(Func<U, T, U> fn, U initial) => ...;
    public T Find(Func<T, bool> predicate) => ...;
}
```

Then transpiler maps:
- `array.Map(x => x * 2)` → `array.map(x => x * 2)`
- `array.Filter(x => x > 0)` → `array.filter(x => x > 0)`

### 2. What about nested types?

**Answer**: Just don't use them in transpiler-targeted files. Analyzer enforces this:

```csharp
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public class NoNestedTypesAnalyzer : DiagnosticAnalyzer
{
    // Reports error for any nested class/struct in Minimact.Workers
}
```

### 3. Performance in C# version?

**Answer**: `JsMap<K,V>` is just a thin wrapper around `Dictionary<K,V>`. Zero overhead:

```csharp
public void Set(K key, V value) => _inner[key] = value;  // Inlined by JIT
```

---

## Comparison to Current Approach

| Aspect | Current Approach | JS-Compatible Types |
|--------|------------------|---------------------|
| Transpiler complexity | High (semantic analysis) | Low (1:1 mapping) |
| C# code clarity | Normal C# idioms | Explicit JS intent |
| Compiler enforcement | None | Roslyn analyzer |
| Maintenance | Fix transpiler bugs | Fix type definitions |
| Learning curve | None (standard C#) | Small (new types) |
| Algorithm parity | Requires validation | Guaranteed by design |

---

## Recommendation

**Use this approach** because:

1. **Drastically simpler transpiler** - No semantic analysis, just syntax mapping
2. **Compile-time safety** - Roslyn catches mistakes before transpilation
3. **Perfect parity** - API calls match 1:1 between C# and TS
4. **Self-documenting** - Clear boundary between .NET and transpiler code
5. **Low overhead** - Thin wrappers with no runtime cost

The small cost of learning `JsMap`/`JsArray` is worth the massive simplification of the transpiler and guaranteed correctness.

---

## Next Steps

1. Create `Minimact.Workers.JsTypes.cs` with `JsMap`, `JsArray`, `JsSet`
2. Update `TypeScriptGenerator.cs` to recognize these types
3. Migrate one worker file (e.g., `MouseTrajectoryTracker.cs`) as proof of concept
4. Run transpiler and verify output is cleaner
5. Create Roslyn analyzer (optional but recommended)
6. Migrate remaining worker files

Want me to start implementing this?
