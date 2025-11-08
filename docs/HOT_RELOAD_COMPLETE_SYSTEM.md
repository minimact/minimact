# Minimact Hot Reload System - Complete Architecture

## Overview

Minimact's hot reload system is a **three-tier architecture** that provides instant feedback for development:

1. **Template Hot Reload** (fastest) - Updates dynamic content without touching component instances
2. **Structural Change Replacement** (medium) - Replaces entire component instances when structure changes
3. **No-Op** (instant) - Skips reload when only keys were added (no real changes)

## The Core Insight: Dehydrationist Architecture

**Key Constraint**: The client **cannot render JSX**. Only the server can evaluate React expressions like `{condition && <Component />}`.

**Implication**: We can't patch component structure on the client. We must either:
- Apply pre-computed template patches (template hot reload)
- Replace the entire instance (structural change replacement)

This constraint **simplifies** the system by eliminating complex patching logic.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Developer edits Counter.tsx in Minimact Swig              │
│  Changes: Added useState hook + new <span> element         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  User Saves (Ctrl+S)                                        │
│  → Dashboard.tsx handleFileSave()                           │
│  → window.api.transpiler.transpileFile()                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Electron IPC → TranspilerService.transpileFile()           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Babel Transpilation (with babel-plugin-minimact)           │
│  • Parses TSX to AST                                        │
│  • Runs through plugin pipeline                             │
│  • Generates multiple outputs:                              │
│    1. Counter.cs (C# component class)                       │
│    2. Counter.tsx.keys (TSX with hex path keys)            │
│    3. Counter.templates.json (parameterized patches)        │
│    4. Counter.hooks.json (hook signature)                   │
│    5. Counter.structural-changes.json (if changes detected) │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  🔑 KEY STEP: TSX Replacement                               │
│  TranspilerService reads Counter.tsx.keys                   │
│  → Replaces Counter.tsx with keys version                   │
│  → Keys now persist in source code                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  C# File Watchers Detect Changes                            │
│  • TemplateHotReloadManager watches *.templates.json        │
│  • StructuralChangeManager watches *.structural-changes.json│
└─────────────────────────────────────────────────────────────┘
                            ↓
            ┌───────────────┴───────────────┐
            ↓                               ↓
┌────────────────────────┐    ┌────────────────────────────┐
│  Template Hot Reload   │    │  Structural Replacement    │
│  (if templates changed)│    │  (if changes.Count > 0)    │
└────────────────────────┘    └────────────────────────────┘
            ↓                               ↓
┌─────────────────────────────────────────────────────────────┐
│  SignalR sends patches to browser                           │
│  Client applies patches via DOMPatcher                      │
│  → UI updates instantly!                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Next Edit Cycle                                            │
│  • Counter.tsx now has keys from previous transpilation    │
│  • Babel compares TSX (with keys) vs .tsx.keys             │
│  • Only detects REAL structural changes                     │
└─────────────────────────────────────────────────────────────┘
```

## Three-Tier Hot Reload System

### Tier 1: Template Hot Reload (Fastest - ~10ms)

**When it triggers:**
- User edits dynamic content (changes a string, number, expression)
- JSX structure stays the same (same elements, same keys)

**How it works:**
1. Babel generates new `.templates.json` with updated slot values
2. `TemplateHotReloadManager` watches for file change
3. Reads new templates, sends to client via SignalR
4. Client's `HintQueue` receives templates as pre-computed patches
5. On next state change, matching template applies instantly

**Example:**
```tsx
// Before
<span>{count}</span>

// After (just changed the binding, structure same)
<span>{count * 2}</span>
```

**Result**: New template generated, client caches it, next render uses new template.

**Characteristics:**
- ✅ Preserves component state (count stays 5)
- ✅ Preserves DOM refs
- ✅ No re-instantiation
- ✅ Surgical update (only affected elements)

---

### Tier 2: Structural Change Replacement (Medium - ~50-100ms)

**When it triggers:**
- User adds/removes JSX elements
- User adds/removes/reorders hooks
- User changes hook types (useState → useClientState)

**How it works:**
1. Babel detects structural changes:
   - **JSX Changes**: Compares current TSX vs previous `.tsx.keys`
     - New elements without keys → Insertions
     - Keys in `.tsx.keys` but not in current → Deletions
   - **Hook Changes**: Compares current hooks vs previous `.hooks.json`
     - Hook added/removed/reordered → Structural change
2. Writes `.structural-changes.json` with all changes
3. `StructuralChangeManager` watches for file change
4. **Binary decision**: `if (changes.Count > 0) → Replace entire instance`
5. New instance created with fresh state

**Example:**
```tsx
// Before
const [count, setCount] = useState(0);
return <div><span>{count}</span></div>

// After (added hook + new element)
const [count, setCount] = useState(0);
const [message, setMessage] = useState("Hello"); // ← NEW HOOK
return (
  <div>
    <span>{count}</span>
    <span>{message}</span> {/* ← NEW ELEMENT */}
  </div>
)
```

**Result**:
- `.structural-changes.json` contains:
  - `{ type: "hook-added", hookType: "useState", varName: "message" }`
  - `{ type: "insert", path: "1.2", vnode: { ... } }`
- `StructuralChangeManager` sees `changes.Count = 2` → Replaces component instance

**Characteristics:**
- ⚠️  Resets component state (count goes back to 0)
- ⚠️  Re-runs effects
- ✅ Ensures C# class matches new structure (has `message` field)
- ✅ No crashes from missing fields
- ✅ Handles all structural changes uniformly

---

### Tier 3: No-Op (Instant - 0ms)

**When it triggers:**
- User saves file without making changes
- Only keys were added by previous transpilation (TSX = keys)

**How it works:**
1. Babel generates `.tsx.keys` (identical to current TSX because keys already there)
2. Babel compares: Keys match → No insertions/deletions
3. Babel compares: Hooks unchanged → No hook changes
4. No `.structural-changes.json` generated (or empty file)
5. No `.templates.json` generated (or unchanged)
6. **No hot reload triggered**

**Example:**
```tsx
// User presses Ctrl+S but made no edits
// TSX already has keys from last transpilation
return <div key="1"><span key="1.1">{count}</span></div>
```

**Result**: No files change → No watchers triggered → No reload

**Characteristics:**
- ✅ Zero overhead
- ✅ No unnecessary re-renders
- ✅ No state disruption

---

## The Hex Path Key System

### Why Keys?

JSX structural changes are detected by comparing **keys**:

```tsx
// Transpilation 1
<div>
  <span>{count}</span>
</div>

// Babel adds keys → Counter.tsx.keys
<div key="1">
  <span key="1.1">{count}</span>
</div>

// Transpilation 2: User adds new span
<div key="1">
  <span key="1.1">{count}</span>
  <span>{message}</span> // ← NO KEY!
</div>

// Detection: Key "1.2" is missing → Insertion at path "1.2"
```

### Hex Path Generation

Keys use **hex paths** for compact representation:

```
Decimal: 1.1.1.1  → 16 chars
Hex:     1.1.1.1  → same (single digits)

Decimal: 1.10.12.15 → 11 chars
Hex:     1.a.c.f     → 7 chars (30% smaller)

Decimal: 1.100.200.300 → 13 chars
Hex:     1.64.c8.12c   → 11 chars
```

**Benefits:**
- Compact representation in HTML
- Hierarchical structure (1.1.1 is child of 1.1)
- Easy to compute parent path (chop off last segment)
- Used for template matching, structural change detection, and DOM patching

### TSX Replacement: The Elegant Trick

**Problem**: After adding keys in transpilation, the original TSX has no keys. Next transpilation would detect all keys as "missing" (false deletions).

**Solution**: Replace TSX with `.tsx.keys` after transpilation.

```javascript
// In TranspilerService.transpileFile()
const keysFilePath = tsxPath + '.keys';
const keysContent = await fs.readFile(keysFilePath, 'utf-8');
await fs.writeFile(tsxPath, keysContent, 'utf-8');
```

**Flow:**
1. User edits `Counter.tsx` (has keys from last time)
2. Transpile → Generate `Counter.tsx.keys` (with new keys for new elements)
3. **Replace** `Counter.tsx` with keys version
4. Next edit → TSX has keys → Only NEW elements lack keys → Accurate detection

**Why this is elegant:**
- ✅ No infinite loops (C# watches JSON files, not TSX)
- ✅ Keys persist in source (developer sees them in editor)
- ✅ Accurate change detection (only real changes detected)
- ✅ Simple implementation (single file write)

---

## Hook Change Detection

### Why It's Needed

C# components have fields for each hook:

```csharp
public partial class Counter : MinimactComponent
{
    [State] private int count = 0;        // From useState
    [State] private string message = "";   // From useState
}
```

If the user adds a hook in TSX but the C# instance doesn't have the field → **crash**.

**Solution**: Detect hook changes and replace the instance.

### Hook Signature Extraction

Babel extracts a **signature** of all hooks in call order:

```typescript
// Counter.tsx
const [count, setCount] = useState(0);
const [message, setMessage] = useState("Hello");
useEffect(() => { ... }, [count]);
const btnRef = useRef(null);
```

**Signature (Counter.hooks.json)**:
```json
{
  "componentName": "Counter",
  "hooks": [
    { "type": "useState", "varName": "count", "index": 0 },
    { "type": "useState", "varName": "message", "index": 1 },
    { "type": "useEffect", "depsCount": 1, "index": 2 },
    { "type": "useRef", "varName": "btnRef", "index": 3 }
  ]
}
```

### Hook Change Comparison

Next transpilation compares current hooks vs previous `.hooks.json`:

**Detected Changes:**
- ✅ Hook added (new hook at any index)
- ✅ Hook removed (hook missing)
- ✅ Hook reordered (same hooks, different indices)
- ✅ Hook type changed (useState → useClientState)
- ✅ Variable name changed (count → counter)
- ℹ️  useEffect deps changed (NOT structural - logged but ignored)

**Example:**
```typescript
// Before
const [count, setCount] = useState(0);

// After
const [count, setCount] = useState(0);
const [message, setMessage] = useState("Hello"); // ← NEW

// Detection
[Hook Changes] Hook count changed: 1 → 2
[Hook Changes] 🆕 Hook added at index 1: useState (message)
```

**Output (Counter.structural-changes.json)**:
```json
{
  "changes": [
    {
      "type": "hook-added",
      "hookType": "useState",
      "varName": "message",
      "index": 1
    }
  ]
}
```

**Result**: `changes.Count > 0` → Instance replaced → New C# class has `message` field

---

## Why This System is Elegant

### 1. **Constraint-Driven Design**

The dehydrationist architecture (client can't render JSX) **forces** a clean separation:
- **Server**: Owns JSX evaluation and reconciliation
- **Client**: Applies pre-computed patches

This eliminates the complexity of client-side reconciliation, virtual DOM diffing, and state hydration.

### 2. **Binary Decisions**

No complex heuristics:
- Structure changed? → Replace instance
- Template changed? → Apply template patches
- Neither? → Do nothing

Each decision is **O(1)** based on file presence.

### 3. **Declarative Signatures**

Both JSX structure (keys) and hook structure (signatures) are captured declaratively:
- **Keys**: Hex paths in TSX
- **Hooks**: JSON array of metadata

Comparison is simple string/object diffing.

### 4. **Single Source of Truth**

Files generated by Babel are the **only** source of truth:
- `.tsx.keys` → JSX structure
- `.hooks.json` → Hook structure
- `.templates.json` → Dynamic bindings
- `.structural-changes.json` → Combined changes

C# doesn't need to parse TSX or understand React semantics.

### 5. **No Infinite Loops**

The system naturally avoids loops:
- **TSX replacement** happens AFTER JSON generation
- **C# watchers** watch JSON files, not TSX
- **Debouncing** built into file watchers (50ms delay)

### 6. **Composable Tiers**

The three tiers work independently:
- Template hot reload doesn't know about structural changes
- Structural change manager doesn't know about templates
- Both can run simultaneously (e.g., template changed + hook added)

Each tier has a single responsibility.

### 7. **Developer Experience**

From the developer's perspective:
- Edit TSX → Save → See changes instantly
- No configuration needed
- No "Fast Refresh broke, restart your app"
- Works with all hooks (even custom ones)

### 8. **Performance Characteristics**

```
Template Hot Reload:     ~10ms   (cache update)
Structural Replacement:  ~50ms   (instance creation)
No-Op:                   ~0ms    (no work done)
```

Most edits (changing strings, numbers, logic) are templates → Fast path.

---

## Comparison with React Fast Refresh

| Feature | React Fast Refresh | Minimact Hot Reload |
|---------|-------------------|---------------------|
| **Architecture** | Client-side reconciliation | Server-side reconciliation |
| **State Preservation** | Tries to preserve state | Templates preserve, structural replaces |
| **Hook Changes** | Manual reset required | Automatic instance replacement |
| **JSX Changes** | Partial support | Full support via binary decision |
| **Performance** | ~100-200ms | Templates: ~10ms, Structural: ~50ms |
| **Complexity** | High (heuristics, edge cases) | Low (binary decisions) |
| **Failure Mode** | "Fast Refresh broke" | Falls back to full replacement |

### Why Minimact is Simpler

React Fast Refresh tries to **preserve state across structural changes** using heuristics:
- Same component name? → Try to patch
- Hook order changed? → Give up, reset
- Conditional rendering added? → Sometimes works, sometimes doesn't

Minimact takes a **pragmatic approach**:
- Structure changed? → Replace instance (reset state)
- Template changed? → Apply patch (preserve state)

This eliminates the "Fast Refresh broke, please reload" errors.

---

## The Complete Flow (Step by Step)

### Scenario: User adds a new `useState` hook

```tsx
// Before
export function Counter() {
  const [count, setCount] = useState(0);
  return <div><span>{count}</span></div>;
}

// After
export function Counter() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("Hello"); // NEW
  return (
    <div>
      <span>{count}</span>
      <span>{message}</span> {/* NEW */}
    </div>
  );
}
```

### Step-by-Step Execution

**1. User Saves File (Ctrl+S in Swig)**
```
Dashboard.tsx: handleFileSave()
→ window.api.transpiler.transpileFile('/path/Counter.tsx')
```

**2. Electron IPC Call**
```
Main Process: transpiler.ts receives IPC
→ TranspilerService.transpileFile('/path/Counter.tsx')
```

**3. Babel Transpilation**
```javascript
// Read Counter.tsx (has keys from last transpilation)
const tsxContent = `
export function Counter() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("Hello");
  return (
    <div key="1">
      <span key="1.1">{count}</span>
      <span>{message}</span> // ← NO KEY (new element)
    </div>
  );
}
`

// Parse to AST
const ast = parse(tsxContent, { plugins: ['typescript', 'jsx'] });

// Run through babel-plugin-minimact
// - Extracts hooks → Counter.hooks.json (2 hooks)
// - Assigns keys → Counter.tsx.keys (new key "1.2")
// - Compares TSX vs .tsx.keys → Detects insertion at "1.2"
// - Compares hooks vs .hooks.json → Detects hook added
// - Generates Counter.structural-changes.json
// - Generates Counter.templates.json
// - Generates Counter.cs
```

**4. Files Generated**

**Counter.cs** (C# component):
```csharp
public partial class Counter : MinimactComponent
{
    [State] private int count = 0;
    [State] private string message = "Hello"; // NEW FIELD

    protected override VNode Render() { ... }
}
```

**Counter.tsx.keys** (TSX with keys):
```tsx
export function Counter() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("Hello");
  return (
    <div key="1">
      <span key="1.1">{count}</span>
      <span key="1.2">{message}</span> {/* ← KEY ADDED */}
    </div>
  );
}
```

**Counter.hooks.json** (Hook signature):
```json
{
  "componentName": "Counter",
  "timestamp": "2025-11-08T19:00:00.000Z",
  "hooks": [
    { "type": "useState", "varName": "count", "index": 0 },
    { "type": "useState", "varName": "message", "index": 1 }
  ]
}
```

**Counter.structural-changes.json** (Changes detected):
```json
{
  "componentName": "Counter",
  "timestamp": "2025-11-08T19:00:00.000Z",
  "sourceFile": "/path/Counter.tsx",
  "changes": [
    {
      "type": "insert",
      "path": "1.2",
      "vnode": {
        "type": "element",
        "tag": "span",
        "path": "1.2",
        "children": [...]
      }
    },
    {
      "type": "hook-added",
      "hookType": "useState",
      "varName": "message",
      "index": 1
    }
  ]
}
```

**Counter.templates.json** (Template patches):
```json
{
  "componentName": "Counter",
  "templates": {
    "1.1.1": { "template": "{0}", "bindings": ["count"], ... },
    "1.2.1": { "template": "{0}", "bindings": ["message"], ... }
  }
}
```

**5. TSX Replacement**
```javascript
// In TranspilerService.transpileFile()
const keysContent = await fs.readFile('/path/Counter.tsx.keys', 'utf-8');
await fs.writeFile('/path/Counter.tsx', keysContent, 'utf-8');

// Counter.tsx now has keys for ALL elements (including new one)
```

**6. C# File Watchers Detect Changes**

**StructuralChangeManager**:
```csharp
// Watches: Counter.structural-changes.json
private async void OnFileChanged(object sender, FileSystemEventArgs e)
{
    var changes = await ReadStructuralChanges(e.FullPath);

    if (changes.Changes.Count > 0) // 2 changes detected
    {
        // Replace component instance
        await ReplaceComponentInstance(changes.ComponentName);
    }
}
```

**TemplateHotReloadManager**:
```csharp
// Watches: Counter.templates.json
private async void OnFileChanged(object sender, FileSystemEventArgs e)
{
    var templates = await ReadTemplates(e.FullPath);

    // Send new templates to client
    await _hubContext.Clients.All.SendAsync("HotReload:Templates", templates);
}
```

**7. Hot Reload Applied**

**Structural Change**:
```csharp
// StructuralChangeManager.ReplaceComponentInstance()
var oldInstance = _registry.GetComponent("Counter");
var newInstance = CreateComponentInstance("Counter"); // Has 'message' field
_registry.ReplaceComponent("Counter", newInstance);

await _hubContext.Clients.All.SendAsync("HotReload:InstanceReplaced", new {
    componentId = "Counter"
});
```

**Template Update**:
```csharp
// Client receives new templates
HintQueue.updateTemplates({
  "1.1.1": { template: "{0}", bindings: ["count"] },
  "1.2.1": { template: "{0}", bindings: ["message"] } // NEW
});
```

**8. Browser Updates**

```javascript
// Client-side (SignalR handler)
connection.on('HotReload:InstanceReplaced', ({ componentId }) => {
  const component = document.getElementById(componentId);

  // Re-render component from server
  fetch(`/minimact/render/${componentId}`)
    .then(html => component.innerHTML = html);

  console.log('✅ Component instance replaced');
});

connection.on('HotReload:Templates', (templates) => {
  hintQueue.updateTemplates(templates);
  console.log('✅ Templates updated');
});
```

**9. Next Edit Cycle**
```
Counter.tsx now has:
- Keys for all elements (including "1.2")
- Hook signature with 2 hooks

Next transpilation will compare against these:
- Only NEW changes detected
- Accurate structural change detection
```

---

## Summary

**The Minimact Hot Reload System is elegant because:**

1. **It embraces constraints** (dehydrationist architecture)
2. **It uses binary decisions** (replace vs patch vs nothing)
3. **It has clear tiers** (template vs structural vs no-op)
4. **It's declarative** (keys, signatures, templates)
5. **It's composable** (each manager independent)
6. **It prevents loops** (C# watches JSON, not TSX)
7. **It's predictable** (no heuristics, no edge cases)
8. **It's fast** (10-50ms for most changes)

**Result**: Developers get instant feedback without "Fast Refresh broke" errors, and the system scales to complex applications with hundreds of components.
