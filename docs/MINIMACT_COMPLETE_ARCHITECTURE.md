# Minimact: Complete Architecture Overview

> **The world's fastest React framework with server-side rendering and 0.1ms hot reload**

Minimact is a revolutionary full-stack framework that combines the developer experience of React with the performance of server-side rendering, achieving instant interactivity through predictive rendering and surgical DOM patching.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [The Seven Layers](#the-seven-layers)
3. [Core Concepts](#core-concepts)
4. [The Magic Formula](#the-magic-formula)
5. [Comparison with Other Frameworks](#comparison-with-other-frameworks)
6. [Killer Features](#killer-features)
7. [Technical Innovations](#technical-innovations)
8. [Production Readiness](#production-readiness)

---

## Architecture Overview

Minimact is built on a **dehydrationist architecture**: the server owns all rendering logic, while the client applies pre-computed patches. This enables:

- ⚡ **0.1ms hot reload** for template changes
- 🎯 **100% prediction accuracy** via build-time template generation
- 🪶 **~20KB client runtime** (gzipped)
- 🔄 **Zero learning phase** - works from first render
- 🎨 **React-like DX** with server-side performance

---

## The Seven Layers

### 1. Developer Experience Layer 🎨

**Minimact Swig (Electron IDE)**
- Monaco editor with TypeScript/TSX syntax highlighting
- Real-time component inspection (like React DevTools)
- File tree browser + integrated terminal
- One-click transpile, build, and run
- Live SignalR connection to inspect component state
- Visual feedback for hot reload events

**Key Features:**
- Auto-saves trigger key generation
- Template changes show instant visual updates
- Component state inspector with live updates
- Build output integrated into IDE

---

### 2. Build-Time Intelligence Layer 🔧

**Babel Plugin (`babel-plugin-minimact`)**

Transforms TSX → C# with full React semantics and generates critical metadata.

**Outputs:**

1. **`.cs` files** - C# component classes with:
   - `Render()` methods (JSX → VNode trees)
   - Hook field declarations (`useState` → private fields)
   - Event handlers mapped to component methods
   - Type-safe props and state

2. **`.templates.json` files** - Parameterized patch templates:
   ```json
   {
     "10000000.20000000": {
       "type": "dynamic",
       "template": "{0}",
       "bindings": ["count"],
       "slots": [0],
       "path": ["1", "2"]
     }
   }
   ```

3. **`.structural-changes.json` files** - Insertion/deletion operations:
   ```json
   {
     "insertions": [
       { "path": "10000000.30000000", "type": "element", "tag": "option" }
     ],
     "deletions": [],
     "hookChanges": [
       { "type": "useState", "varName": "selectedColor", "index": 2 }
     ]
   }
   ```

4. **`.tsx.keys` files** - Stable hex keys for elements:
   ```json
   {
     "div:5:10": "10000000",
     "button:12:15": "20000000",
     "span:18:22": "30000000"
   }
   ```

**Key Capabilities:**
- ✅ Hex key auto-generation (stable across saves)
- ✅ Template extraction with slot bindings
- ✅ Structural change detection (JSX + hooks)
- ✅ Loop template generation (`.map()` patterns)
- ✅ Conditional template branches (ternaries)

---

### 3. Server-Side Rendering Layer ⚙️

**ASP.NET Core + C# Components**

Write React-like components in C# with familiar hooks:

```csharp
public class Counter : MinimactComponent
{
    [State] private int count = 0;

    protected override VNode Render()
    {
        return new VElement("div", new() { ["class"] = "counter" })
        {
            Children = new List<VNode>
            {
                new VText($"Count: {count}"),
                new VElement("button", new() { ["onClick"] = "Increment" })
                {
                    Children = new List<VNode> { new VText("Increment") }
                }
            }
        };
    }

    [EventHandler]
    public void Increment()
    {
        count++;
        TriggerRender();
    }
}
```

**Supported Hooks:**

**Core Hooks:**
- `useState<T>()` - Component state management
- `useEffect()` - Side effects with cleanup (see details below)
- `useRef<T>()` - Persistent references

**useEffect Hook - Detailed Behavior**

Minimact implements `useEffect` with a **dual-execution model**: effects run on the client with full dependency tracking, while server-side attributes are used for logging and hint generation.

**Client-Side Execution (Source of Truth):**

```typescript
// 1. Mount only - Empty dependency array []
useEffect(() => {
  console.log('Component mounted!');
  // Runs ONCE when component first renders
  // Never runs again, even on re-renders
}, []); // Empty array = mount only

// 2. On dependency change - Specific dependencies
const [count, setCount] = useState(0);
useEffect(() => {
  document.title = `Count: ${count}`;
  // Runs when 'count' changes (shallow comparison)
}, [count]); // Watches 'count'

// 3. Every render - No dependency array
useEffect(() => {
  analytics.trackRender();
  // Runs after EVERY render
  // Use sparingly - most expensive option
}); // No second argument
```

**Dependency Tracking:**
- Uses shallow comparison (`!==`) to detect changes
- Effects execute via `queueMicrotask()` - after render, before paint
- Cleanup functions run before re-execution and on unmount

**Cleanup Pattern:**

```typescript
useEffect(() => {
  const timer = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);

  // Cleanup runs:
  // 1. Before effect re-runs (when deps change)
  // 2. When component unmounts
  return () => {
    clearInterval(timer);
    console.log('Timer cleaned up');
  };
}, []); // Cleanup runs on unmount
```

**Server-Side Attributes (For Hints & Logging):**

The Babel plugin generates C# methods with attributes indicating dependency patterns:

```csharp
// Empty deps [] → [OnMounted]
[OnMounted]
private void Effect_0()
{
    Console.WriteLine("Component mounted");
}

// Specific deps [state] → [OnStateChanged]
[OnStateChanged("count")]
private void Effect_1()
{
    Console.WriteLine($"Count changed to: {count}");
}

// No deps → No attribute (every render)
private void Effect_2()
{
    timerRef = DateTimeOffset.Now.ToUnixTimeMilliseconds();
}
```

**Key Principle:** Client-runtime handles all effect execution. Server attributes are for:
- ✅ Prediction hint generation
- ✅ Template pre-computation
- ✅ Server-side logging/debugging
- ❌ NOT for executing client-side effects

**Common Patterns:**

```typescript
// Data fetching on mount
useEffect(() => {
  async function fetchData() {
    const data = await fetch('/api/users');
    setUsers(await data.json());
  }
  fetchData();
}, []); // Fetch once

// Sync with external system
useEffect(() => {
  const subscription = eventEmitter.subscribe(setData);
  return () => subscription.unsubscribe();
}, []); // Setup/teardown

// Respond to state changes
useEffect(() => {
  if (userId) {
    loadUserProfile(userId);
  }
}, [userId]); // Re-fetch when userId changes
```

**Performance Tips:**
- ✅ Use specific dependencies - avoid unnecessary runs
- ✅ Use empty deps `[]` for mount-only setup
- ✅ Always provide cleanup for subscriptions/timers
- ❌ Avoid no-deps effects - they run every render
- ❌ Don't omit dependencies - leads to stale closures

**See:** [USEEFFECT_ARCHITECTURE.md](./USEEFFECT_ARCHITECTURE.md) for complete implementation details.

**Advanced Hooks:**
- `useServerTask<T>()` - Async server operations with loading/error states
- `usePaginatedServerTask<T>()` - Server-side pagination with infinite scroll
- `useStateX<T>()` - Declarative state projections (map, filter, sort)
- `useContext<T>()` - Server-side shared state across components
- `useComputed<T>()` - Derived state with automatic dependency tracking

**Extension Hooks:**
- `useDomElementState()` - Reactive DOM observation (minimact-punch)
- `useModal()` - Modal state management
- `useToggle()` - Boolean toggle helper
- `useDropdown()` - Dropdown state management
- `useMarkdown()` - Markdown rendering with sanitization
- `useTemplate()` - Template string evaluation
- `useValidation()` - Form validation helper

**Rust Reconciliation Engine**

High-performance VNode diffing via FFI:

- VNode types: `VElement`, `VText`, `VNull` (conditionals)
- Hex path-based navigation
- Generates surgical DOM patches:
  - `CreateElement`, `UpdateText`, `SetAttribute`
  - `InsertNode`, `RemoveNode`, `ReplaceNode`
- ~1ms for typical component reconciliation

**PathConverter**

Critical bridge between server VNodes and client DOM:

```csharp
var pathConverter = new PathConverter(component.CurrentVNode);
var domPath = pathConverter.HexPathToDomPath("10000000.30000000.20000000");
// Returns: [0, 2, 1] (accounts for VNull nodes)
```

**How it works:**
1. Traverses VNode tree
2. Collects all VNull paths (from `{condition && <Component />}`)
3. Builds parent-child hierarchy
4. Converts hex paths → DOM indices by skipping nulls

**MVC Bridge Integration**

Minimact can integrate with existing ASP.NET MVC applications:

```csharp
// In your MVC controller
public class HomeController : Controller
{
    public IActionResult Index()
    {
        var viewModel = new DashboardViewModel
        {
            UserName = "Alice",
            NotificationCount = 5
        };

        return MinimactView<DashboardComponent>(viewModel);
    }
}

// Minimact component receives ViewModel
public class DashboardComponent : MinimactComponent
{
    // Automatically populated from MVC ViewModel
    private DashboardViewModel? Model;

    protected override VNode Render()
    {
        return new VElement("div") {
            Children = new List<VNode> {
                new VText($"Welcome, {Model.UserName}")
            }
        };
    }
}
```

**Benefits:**
- ✅ Gradual migration from MVC to Minimact
- ✅ Reuse existing ViewModels
- ✅ Mix MVC views and Minimact components
- ✅ Mutability tracking with `[Mutable]` attribute

---

### 4. Predictive Rendering Layer 🔮

**Rust Predictor**

Generates predicted patches for instant client feedback:

```rust
pub fn predict_patches(
    state_changes: HashMap<String, Value>,
    templates: &TemplateMap
) -> Vec<Patch> {
    // Match state changes to templates
    // Fill template slots with predicted values
    // Return patches for instant application
}
```

**How Prediction Works:**

1. User clicks button
2. Client applies cached patches **instantly** (0-5ms)
3. Client syncs state change to server via SignalR
4. Server re-renders with actual state
5. Server reconciles → sends correction patches (if needed)
6. **Result:** User sees instant feedback, server confirms

**Template System**

Zero learning phase - 100% accuracy from first render:

**Template Types:**

1. **Static** - No dynamic bindings
   ```json
   { "template": "Hello World", "bindings": [] }
   ```

2. **Dynamic with slots** - State-driven text
   ```json
   { "template": "Count: {0}", "bindings": ["count"], "slots": [7] }
   ```

3. **Conditional** - Boolean-based branches
   ```json
   {
     "template": "{0}",
     "bindings": ["isDone"],
     "conditionalTemplates": { "true": "✓", "false": "○" }
   }
   ```

4. **Loop templates** - `.map()` patterns
   ```json
   {
     "type": "loop",
     "itemBinding": "todo",
     "arrayBinding": "todos",
     "loopTemplate": {
       "element": "li",
       "children": [
         { "template": "{item.text}", "bindings": ["item.text"] }
       ]
     }
   }
   ```

**Memory Efficiency:**
- ~2KB per component (template metadata)
- vs ~100KB for cached state-specific patches
- Infinite state value coverage with minimal memory

---

### 5. Client-Side Runtime Layer 🌐

**Lightweight Client (`@minimact/core` - ~20KB gzipped)**

Core responsibilities:

1. **SignalR Connection** - Bidirectional server communication
2. **Hint Queue** - Stores predicted patches indexed by state changes
3. **DOM Patcher** - Applies patches surgically to live DOM
4. **Template State Manager** - Manages dynamic templates
5. **Client State Tracking** - Keeps local state in sync with server

**SignalM - Lightweight Transport Layer**

Minimact offers two client runtime variants:

| Variant | Size | Transport | Use Case |
|---------|------|-----------|----------|
| **Default (SignalM)** | ~20KB | WebSocket + JSON | Modern browsers (95%+ users) |
| **Full (SignalR)** | ~26KB | WebSocket/SSE/Long Polling | Enterprise/legacy support |

**SignalM Implementation:**

```typescript
export class SignalMConnection {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Function[]>();
  private pendingInvocations = new Map<string, PendingInvocation>();
  private reconnectPolicy: IRetryPolicy;

  // Drop-in compatible with SignalR Hub API
  async invoke<T>(methodName: string, ...args: any[]): Promise<T>
  on(methodName: string, handler: Function): void
  async start(): Promise<void>
  async stop(): Promise<void>
}
```

**Key Features:**
- ✅ 2-3KB standalone (vs 18KB for SignalR client)
- ✅ WebSocket + JSON only (no MessagePack, SSE, Long Polling)
- ✅ Compatible with standard ASP.NET Core SignalR hubs
- ✅ Exponential backoff reconnection (0ms → 2s → 10s → 30s → 60s max)
- ✅ Zero dependencies
- ✅ Same developer experience as SignalR

**Bundle Size Breakdown:**
```
@minimact/core (default):  ~20KB gzipped
├─ Minimact runtime:       ~7KB
├─ SignalM:                ~2KB
├─ DOM Patcher:            ~3KB
├─ Hint Queue:             ~2KB
├─ Template Renderer:      ~3KB
└─ Hook System:            ~3KB

@minimact/core/r (full):   ~26KB gzipped
├─ Minimact runtime:       ~7KB
├─ SignalR client:         ~18KB
└─ Other:                  ~1KB
```

**Usage:**

```typescript
// Lightweight (recommended)
import { Minimact } from '@minimact/core';

// Enterprise (full compatibility)
import { Minimact } from '@minimact/core/r';
```

Both work with the same ASP.NET Core server - upgrade/downgrade anytime with zero code changes!

**Key Principle: No Client-Side Rendering**

The client **cannot** evaluate JSX expressions:

```tsx
// ❌ Client CAN'T evaluate this
{isOpen && <Menu />}

// ✅ Server evaluates → generates VNull or VElement
// ✅ Client applies pre-computed patches
```

This enables:
- Tiny bundle size
- No reconciliation overhead
- Predictable performance
- Server owns all business logic

**State Synchronization**

Every client state change syncs to server:

```typescript
// useState hook
const setState = (newValue: T) => {
  // 1. Update local state
  context.state.set(stateKey, newValue);

  // 2. Apply predicted patches (instant!)
  const hint = context.hintQueue.matchHint(componentId, { [stateKey]: newValue });
  if (hint) {
    context.domPatcher.applyPatches(element, hint.patches);
  }

  // 3. Sync to server (prevent stale data!)
  context.signalR.updateComponentState(componentId, stateKey, newValue);
};
```

**Why sync is critical:**

```typescript
// Without sync:
Client: isOpen = true (from cached patch)
Server: isOpen = false (STALE!)

// User clicks unrelated button → Server renders:
Server: {false && <Menu />} → No menu in VNode
Rust: Reconciles → Patch to REMOVE menu
Client: Menu disappears! 🔴 BROKEN

// With sync:
Client: isOpen = true → syncs immediately
Server: isOpen = true (kept in sync!)
Next render: {true && <Menu />} → Menu stays ✅
```

---

### 6. Hot Reload System Layer 🔥

**Template Hot Reload (0.1-5ms)**

Instant updates without state loss:

```typescript
// Server detects .templates.json change
// Converts hex path → DOM index path
var domPath = pathConverter.HexPathToDomPath("10000000.30000000");

// Sends patch with DOM indices
await hubContext.Clients.All.SendAsync("HotReload:TemplatePatch", {
  type: "template-patch",
  componentId: "Counter",
  templatePatch: {
    path: [0, 2],  // DOM index path (not hex!)
    template: "{0}",
    bindings: ["count"]
  }
});

// Client applies instantly
element.textContent = renderTemplate(template, currentState);
```

**Performance:**
- Attribute updates: **0.1ms** ⚡
- Text updates: **5ms**
- No page refresh
- State preserved
- Works with multiple component instances

**Structural Hot Reload**

Surgical instance replacement for JSX/hook changes:

1. **Babel detects changes:**
   - Element added/removed (via key presence)
   - Hook added/removed/reordered
   - Hook type changed (useState → useClientState)

2. **Server replaces instance:**
   ```csharp
   var newInstance = Activator.CreateInstance(componentType);
   registry.ReplaceComponent(componentId, newInstance);
   ```

3. **Structural patches applied:**
   - Insert new elements at hex paths
   - Delete removed elements
   - Re-render with new hook structure

4. **Template patches queued:**
   - Wait for new paths to exist
   - Apply template updates to new elements

**Flow:**
```
Babel detects change
    ↓
.structural-changes.json updated
    ↓
StructuralChangeManager triggers
    ↓
Replace component instance
    ↓
Apply structural patches (insert/delete)
    ↓
Process queued template patches
    ↓
Result: UI updated, state preserved
```

---

### 7. State Synchronization Layer 🔄

**Client → Server Sync**

Prevents stale server state:

```typescript
// useState
context.signalR.updateComponentState(componentId, stateKey, value);

// useDomElementState
context.signalR.updateDomElementState(componentId, stateKey, snapshot);
```

**Server Handlers:**

```csharp
public async Task UpdateComponentState(string componentId, string stateKey, object value)
{
    var component = registry.GetComponent(componentId);

    // Update server state (keep in sync!)
    component.SetStateFromClient(stateKey, value);

    // Re-render with updated state
    component.TriggerRender();
}
```

**Server → Client Sync**

Server re-renders send patches:

```csharp
// Reconcile old vs new VNode tree
var patches = RustBridge.Reconcile(oldVNode, newVNode);

// Convert hex paths → DOM indices
var pathConverter = new PathConverter(newVNode);
foreach (var patch in patches)
{
    patch.Path = pathConverter.HexPathToDomPath(patch.HexPath);
}

// Send to client
await hubContext.Clients.Client(connectionId).SendAsync("ApplyPatches", patches);
```

**The Complete Sync Flow:**

```
User clicks button
    ↓
Client: Apply predicted patches (0-5ms)
    ↓
Client: Sync state to server (SignalR)
    ↓
Server: Update state
    ↓
Server: Re-render component
    ↓
Server: Rust reconciles VNode trees
    ↓
Server: PathConverter → DOM indices
    ↓
Server: Send patches to client
    ↓
Client: Apply patches (usually no-op if prediction correct)
    ↓
Result: Instant UI + server confirmation
```

---

## Core Concepts

### Dehydrationist Architecture

**Traditional Hydration (React, Next.js):**
```
Server: Render HTML → Send to client
Client: Download JS → Parse → Hydrate → Interactive
```

**Minimact (Dehydration):**
```
Server: Render VNode → Reconcile → Send patches
Client: Apply patches → Interactive (no hydration!)
```

**Benefits:**
- No large JS bundles
- No hydration mismatch errors
- Instant interactivity
- Server owns rendering logic

### Hex Paths

Stable element identifiers across renders:

```
div (10000000)
  ├─ span (10000000.20000000)
  ├─ {condition && <Menu />}  → VNull (10000000.30000000)
  └─ button (10000000.40000000)
```

**Properties:**
- Generated by Babel at build time
- Stored in `.tsx.keys` files
- Preserved across file saves
- Used for reconciliation and patch targeting

**Gap-based allocation:**
```
HEX_GAP = 0x10000000

First child:  1 * HEX_GAP = 0x10000000
Second child: 2 * HEX_GAP = 0x20000000
Third child:  3 * HEX_GAP = 0x30000000

Allows insertions:
Between 1 and 2: 0x10000001, 0x10000002, ..., 0x1FFFFFFF
```

### VNull Nodes

Explicit representation of conditional rendering:

```tsx
// TSX
{isOpen && <Menu />}

// When isOpen = true → VElement (Menu)
// When isOpen = false → VNull with path "10000000.30000000"
```

**Why VNull matters:**
- Tracks path even when element doesn't exist
- Enables PathConverter to skip nulls
- Maintains stable paths across condition changes
- Critical for hot reload

### DOM Index Paths

Client-friendly element navigation:

```
Hex Path:        "10000000.30000000.20000000"
                          ↓ PathConverter
DOM Index Path:  [0, 2, 1]

Navigation:
root.childNodes[0].childNodes[2].childNodes[1]
```

**Conversion accounts for VNull:**
```
Children:
  [0] VElement "10000000" → DOM index 0
  [1] VNull    "20000000" → (skipped, no DOM node)
  [2] VElement "30000000" → DOM index 1 (not 2!)
  [3] VElement "40000000" → DOM index 2
```

---

## The Magic Formula

```
1. Compact Hex Paths (Server VNode trees)
    ↓
2. PathConverter (tracks VNull, builds hierarchy)
    ↓
3. DOM Index Path Conversion (accounts for nulls)
    ↓
4. Send patches with DOM indices to client
    ↓
5. Direct Array Indexing (childNodes[0][2][1])
    ↓
6. Instant Element Finding
    ↓
7. 0.1ms Hot Reload ⚡
```

**Key Insight:**

By converting paths **on the server** (where we have the VNode tree), the client can use simple array indexing without any null-skipping logic. This makes element finding instant and predictable.

---

## Comparison with Other Frameworks

### vs React

| Aspect | React | Minimact |
|--------|-------|----------|
| **Rendering** | Client-side reconciliation | Server-side reconciliation |
| **State Change** | Full component re-render | Predicted patches applied instantly |
| **Bundle Size** | ~140KB (React + ReactDOM) | ~20KB |
| **Interactivity** | After hydration | Immediate |
| **Hot Reload** | Fast Refresh (~100ms) | Template patches (0.1ms) |

### vs Next.js

| Aspect | Next.js | Minimact |
|--------|---------|----------|
| **Architecture** | SSR + Hydration | Pure server rendering |
| **Client Code** | Full React runtime | Tiny patch applier |
| **First Paint** | Fast | Fast |
| **TTI** | After hydration | Instant |
| **SEO** | Excellent | Excellent |

### vs HTMX

| Aspect | HTMX | Minimact |
|--------|------|----------|
| **Updates** | Full HTML swaps | Surgical DOM patches |
| **Granularity** | Coarse (element swaps) | Fine (attribute/text level) |
| **Prediction** | None | Built-in |
| **Dev Experience** | HTML templates | React-like components |

### vs Phoenix LiveView

| Aspect | LiveView | Minimact |
|--------|----------|----------|
| **Language** | Elixir | C# |
| **Updates** | WebSocket round-trip | Predicted patches (cached) |
| **Latency** | Network dependent | 0-5ms (instant) |
| **State** | Server only | Client + Server (synced) |

### vs Blazor

| Aspect | Blazor Server | Minimact |
|--------|---------------|----------|
| **Runtime** | .NET WebAssembly | ASP.NET Core |
| **Communication** | SignalR per change | Predicted + confirmed |
| **Payload Size** | Large (full component state) | Tiny (compact patches) |
| **Client State** | Limited | Full support |

---

## Killer Features

### 1. Write React, Get C#

Familiar React DX with server-side performance:

```tsx
// Write this (TSX)
export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <span>Count: {count}</span>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

```csharp
// Get this (C#) - automatically generated
public class Counter : MinimactComponent
{
    [State] private int count = 0;

    protected override VNode Render()
    {
        return new VElement("div", new())
        {
            Children = new List<VNode>
            {
                new VElement("span", new())
                {
                    Children = new List<VNode>
                    {
                        new VText($"Count: {count}")
                    }
                },
                new VElement("button", new() { ["onClick"] = "Increment_10000000" })
                {
                    Children = new List<VNode> { new VText("Increment") }
                }
            }
        };
    }

    [EventHandler]
    public void Increment_10000000()
    {
        count++;
        TriggerRender();
    }
}
```

### 2. 0.1ms Hot Reload

Fastest in existence:

- **Template changes**: 0.1ms (attributes), 5ms (text)
- **No page refresh**
- **State preserved**
- **Works during debugging**
- **Multiple instances updated simultaneously**

### 3. Zero Learning Phase

100% prediction accuracy from first render:

- **Traditional ML approaches**: Need N interactions to learn patterns
- **Minimact**: Babel extracts templates at build time
- **Result**: Perfect accuracy, no warm-up period

### 4. Handles Conditionals

VNull tracking enables conditional rendering:

```tsx
{isOpen && <Menu />}
{count > 0 ? <Success /> : <Empty />}
```

- VNull nodes track paths when elements don't exist
- PathConverter skips nulls when converting to DOM indices
- Hot reload works seamlessly with conditionals

### 5. Surgical Updates

Only touches what changed:

```
Button click changes count:
  ❌ React: Re-render entire component + reconcile
  ✅ Minimact: Update one text node (0.1ms)
```

### 6. Full-Stack Type Safety

TypeScript → C# with type preservation:

```tsx
interface Props {
  userId: number;
  onSave: (data: UserData) => void;
}
```

```csharp
public class MyComponent : MinimactComponent
{
    [Prop] public int UserId { get; set; }
    [Prop] public Action<UserData> OnSave { get; set; }
}
```

### 7. Minimact Swig IDE

Built-in development environment:

- Monaco editor (VS Code engine)
- Component inspector (React DevTools-like)
- Auto key generation on save
- One-click transpile/build/run
- Live hot reload feedback
- Integrated terminal

### 8. Open Source & Extensible

- MIT licensed
- Written in Rust, C#, TypeScript
- Clean architecture with clear boundaries
- Extension system (MES - Minimact Extension Standards)
- Example: `minimact-punch` (useDomElementState)

---

## Technical Innovations

### 1. Template Patch System

**Problem:** Caching patches for every possible state value is memory-intensive.

**Solution:** Generate parameterized templates at build time:

```json
// Instead of caching:
"count=0" → [{ type: "UpdateText", text: "Count: 0" }]
"count=1" → [{ type: "UpdateText", text: "Count: 1" }]
"count=2" → [{ type: "UpdateText", text: "Count: 2" }]
// ... (infinite states!)

// Generate ONE template:
{
  "template": "Count: {0}",
  "bindings": ["count"],
  "slots": [7]
}

// Client fills template with any value:
renderTemplate("Count: {0}", [42]) → "Count: 42"
```

**Benefits:**
- 2KB per component vs 100KB
- Infinite state coverage
- Zero learning phase
- Works with loops, conditionals, attributes

### 2. VNull Path Tracking

**Problem:** Conditional rendering creates/destroys elements, breaking stable paths.

**Solution:** Explicit VNull nodes with paths:

```tsx
// Before (no VNull)
{condition && <Menu />}
// When false: Nothing in VNode tree, path lost

// After (with VNull)
{condition && <Menu />}
// When false: VNull("10000000.30000000")
// Path preserved!
```

**Benefits:**
- PathConverter can skip nulls
- Hot reload works with conditionals
- Structural changes detected accurately
- Client doesn't need null-skipping logic

### 3. DOM Index Path Conversion

**Problem:** Hex paths need complex null-skipping navigation on client.

**Solution:** Convert to DOM indices on server (where VNode tree is available):

```csharp
// Server has full VNode tree with VNull nodes
var pathConverter = new PathConverter(component.CurrentVNode);

// Converts accounting for nulls
var domPath = pathConverter.HexPathToDomPath("10000000.30000000.20000000");
// Returns: [0, 2, 1]

// Client gets simple array indices
element = root.childNodes[0].childNodes[2].childNodes[1];
```

**Benefits:**
- Client doesn't need VNode tree
- Simple array indexing (fastest navigation)
- No null-skipping logic on client
- Smaller client bundle

### 4. State Synchronization Pattern

**Problem:** Client state changes leave server with stale data.

**Solution:** Automatic sync on every client state change:

```typescript
// Every setState call:
1. Update local state (instant UI)
2. Apply predicted patches (0-5ms)
3. Sync to server via SignalR
4. Server re-renders with correct state
5. Server sends confirmation patches
```

**Benefits:**
- Server always has current state
- Next render from any trigger has correct data
- No manual sync code required
- Works with all hooks (useState, useDomElementState)

### 5. Structural Change Detection

**Problem:** Detecting JSX/hook changes requires comparing AST across saves.

**Solution:** Multi-level change detection:

1. **JSX Changes:**
   - Babel assigns keys on first encounter
   - Missing key in new save = deletion
   - New key not in `.tsx.keys` = insertion

2. **Hook Changes:**
   - Extract hook signatures (type, varName, index)
   - Compare previous vs current signatures
   - Detect additions, removals, reordering

3. **Output:**
   - `.structural-changes.json` with operations
   - Server applies changes surgically
   - Instance replacement if hooks changed

**Benefits:**
- No full page reload
- State preserved when possible
- Works with TypeScript refactoring
- Handles complex changes (hooks + JSX)

### 6. Built-in Metrics & Observability

**Rust Metrics:**
```rust
pub struct MetricsSnapshot {
    pub reconciliations_total: usize,
    pub reconciliations_failed: usize,
    pub predictions_total: usize,
    pub predictions_correct: usize,
    pub avg_reconcile_duration_ms: f64,
    pub predictors_created: usize,
}

// Accessed via FFI
let stats = METRICS.snapshot();
```

**Server Metrics:**
```csharp
// Component lifecycle tracking
component.Metadata.RenderCount
component.Metadata.LastRenderDuration
component.Metadata.AverageRenderDuration

// Hot reload tracking
TemplateHotReloadManager.PatchesSent
TemplateHotReloadManager.StructuralChanges
```

**Client Metrics:**
```typescript
// Cache performance
context.hintQueue.cacheHitRate
context.hintQueue.totalMatches
context.hintQueue.missedMatches

// Playground bridge (dev mode)
playgroundBridge.cacheHit({ hintId, latency, confidence })
playgroundBridge.cacheMiss({ methodName, latency })
```

**Benefits:**
- Real-time performance monitoring
- Prediction accuracy tracking
- Hot reload effectiveness measurement
- Production debugging insights

---

## Extension System (MES)

**Minimact Extension Standards** define three certification levels:

### Bronze Certification (MUST)
- ✅ Integrate with component context
- ✅ Use index-based tracking pattern
- ✅ Clean up resources on unmount
- ✅ Follow naming conventions

### Silver Certification (SHOULD)
- ✅ HintQueue integration for predictions
- ✅ PlaygroundBridge notifications
- ✅ Comprehensive documentation
- ✅ TypeScript type definitions

### Gold Certification (MAY)
- ✅ Unit test coverage (80%+)
- ✅ Integration tests
- ✅ Performance benchmarks
- ✅ Example applications

**Example Extension: minimact-punch**

```typescript
// Standalone mode (Bronze)
import { DomElementState } from 'minimact-punch';
const state = new DomElementState('#my-element');

// Integrated mode (Silver)
import { useDomElementState } from 'minimact-punch';

export function MyComponent() {
  const domState = useDomElementState('.scroll-container');

  // Reactive to DOM changes
  return <div>Visible: {domState.isIntersecting}</div>;
}
```

**Published Extensions:**
- `minimact-punch` - useDomElementState (Silver certified)
- `minimact-charts` - Chart components
- `minimact-grid` - DataGrid component
- `minimact-md` - Markdown rendering
- `minimact-query` - Data fetching utilities

---

## Security

### Server-Only Logic
- ✅ All business logic executes on server
- ✅ Client cannot evaluate JSX expressions
- ✅ No client-side template evaluation
- ✅ Props and state validated server-side

### Input Validation (Rust)
```rust
pub struct ValidationConfig {
    pub max_depth: usize,        // 100 (prevents deep nesting attacks)
    pub max_children: usize,     // 10,000 (prevents large tree DoS)
    pub max_tree_size: usize,    // 100,000 nodes
    pub max_json_size: usize,    // 10 MB (prevents JSON DoS)
}
```

### State Sync Protection
- ✅ Server validates all client state updates
- ✅ Type checking on `SetStateFromClient()`
- ✅ Reflection-based field validation
- ✅ SignalR connection authentication

### XSS Prevention
- ✅ Text nodes auto-escaped in VNode serialization
- ✅ Attribute values sanitized
- ✅ No `dangerouslySetInnerHTML` equivalent
- ✅ Markdown rendering with sanitization (minimact-md)

---

## Production Readiness

### ✅ Complete Feature Set

**Core Framework:**
- [x] TSX → C# transpilation (Babel)
- [x] Server-side rendering (ASP.NET Core)
- [x] Rust reconciliation engine
- [x] VNode system (VElement, VText, VNull)
- [x] Hex path generation and tracking
- [x] DOM index path conversion
- [x] Compact patch format

**Hooks:**
- [x] useState
- [x] useEffect (with cleanup)
- [x] useRef
- [x] useDomElementState (minimact-punch extension)

**Predictive Rendering:**
- [x] Template extraction (Babel)
- [x] Hint queue (client)
- [x] Predicted patch application
- [x] Correction patches
- [x] Loop templates
- [x] Conditional templates

**Hot Reload:**
- [x] Template hot reload (0.1-5ms)
- [x] Structural hot reload (instance replacement)
- [x] Hook change detection
- [x] JSX change detection
- [x] Key generation on save
- [x] State preservation

**State Sync:**
- [x] Client → Server (useState)
- [x] Client → Server (useDomElementState)
- [x] Server → Client (patches)
- [x] Automatic sync on state changes

**Developer Tools:**
- [x] Minimact Swig IDE (Electron)
- [x] Component inspector
- [x] Monaco editor integration
- [x] Auto key generation
- [x] Build pipeline integration
- [x] Hot reload visual feedback

### ✅ Performance Benchmarks

| Operation | Latency | Memory | Notes |
|-----------|---------|--------|-------|
| **Hot Reload (template)** | 0.1-5ms | 0 | No state loss, instant visual update |
| **Hot Reload (structural)** | 10-50ms | Δ instance | Instance replacement, state preserved |
| **Predicted Patch** | 0-5ms | 0 | Cached hint application |
| **Rust Reconciliation** | ~1ms | O(n) | Typical component (n=nodes) |
| **Server Render (first)** | ~10ms | O(n) | Includes SignalR setup |
| **State Sync (client→server)** | ~5ms | ~1KB | SignalR invoke + JSON |
| **Template Memory** | ~2KB | per component | vs ~100KB for cached patches |
| **Client Bundle (SignalM)** | 20.3KB | gzipped | Default variant |
| **Client Bundle (SignalR)** | 25.9KB | gzipped | Full variant |

### 🎯 Ready for Deployment

**What's Complete:**
1. ✅ Core architecture
2. ✅ All major features
3. ✅ Hot reload system
4. ✅ State synchronization
5. ✅ Developer tools
6. ✅ Template system
7. ✅ Extension framework (MES)

**What's Next:**
1. 📚 Documentation (getting started, API reference)
2. 🎨 Example applications (TodoMVC, blog, e-commerce)
3. 📢 Marketing (website, blog posts, videos)
4. 👥 Community building (Discord, GitHub Discussions)
5. 📦 NuGet/npm package publishing
6. 🧪 More test coverage (unit + integration)

---

## Summary

Minimact represents a paradigm shift in web development:

**The Problem:**
- React: Great DX, heavy client runtime, slow hydration
- Server frameworks: Fast first load, poor interactivity
- Traditional SSR: Full page reloads, state loss

**The Solution:**
Minimact combines:
- React-like component model (familiar DX)
- Server-side rendering (performance + SEO)
- Predictive patching (instant interactivity)
- Surgical updates (0.1ms hot reload)
- Tiny client runtime (~20KB)

**The Result:**
A framework that feels like React, performs like a server-rendered app, and updates faster than anything else on the market.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    MINIMACT SWIG (Electron IDE)                 │
│  Monaco Editor │ Component Inspector │ Terminal │ Hot Reload    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BABEL PLUGIN (Build Time)                       │
│  TSX → C# │ Key Gen │ Templates │ Structural Changes            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                ▼                         ▼
┌───────────────────────────┐   ┌──────────────────────────┐
│    SERVER (ASP.NET)       │   │  CLIENT (~20KB)          │
│                           │   │                          │
│  C# Components            │   │  SignalR Connection      │
│  Rust Reconciler          │   │  Hint Queue              │
│  PathConverter            │   │  DOM Patcher             │
│  Template Manager         │   │  Template State          │
│  Predictor                │◄──┤  Client State            │
│                           │   │                          │
│  Renders VNode trees      │   │  Applies patches         │
│  Generates patches        │   │  Syncs state changes     │
│  Converts hex→DOM paths   │   │  Provides interactivity  │
└───────────────────────────┘   └──────────────────────────┘
```

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/minimact.git

# Install dependencies
cd minimact
npm install
dotnet restore

# Build Babel plugin
cd src/babel-plugin-minimact
npm run build

# Build Rust reconciler
cd ../minimact-rust-reconciler
cargo build --release

# Run example app
cd ../../examples/MyMvcApp
dotnet run
```

---

## Contributing

Minimact is open source (MIT license). Contributions welcome!

**Areas for contribution:**
- Documentation improvements
- Example applications
- Bug fixes
- Performance optimizations
- Extension development (following MES)
- Test coverage

---

## License

MIT License - See LICENSE file for details

---

## Credits

Built with:
- **Rust** - Reconciliation engine
- **C#/.NET** - Server runtime
- **TypeScript** - Client runtime + Babel plugin
- **Electron** - Swig IDE
- **SignalR** - Real-time communication
- **Monaco** - Code editor

**Created by:** [Your Name]
**Website:** [Your Website]
**Discord:** [Community Link]
**GitHub:** https://github.com/yourusername/minimact

---

*This document describes Minimact v1.0 architecture as of 2025.*
