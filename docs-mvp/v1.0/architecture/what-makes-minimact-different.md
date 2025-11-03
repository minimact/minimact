# What Makes Minimact Different

Minimact isn't just another React framework. It represents a fundamental paradigm shift in how we think about server-side rendering, state management, and client-server communication.

## The Hydration Problem

Traditional server-side rendering frameworks face a dilemma:

```
┌─────────────────────────────────────────┐
│  Traditional SSR Flow (React)           │
├─────────────────────────────────────────┤
│  1. Server renders HTML                 │
│  2. Client downloads 45 KB JS bundle    │
│  3. Client "hydrates" - replays render  │
│  4. Client reconciles every interaction │
│  5. VDOM diff on every state change     │
└─────────────────────────────────────────┘
```

**Problems:**
- ❌ Large JavaScript bundles
- ❌ Hydration waterfall delays interactivity
- ❌ CPU overhead from client-side reconciliation
- ❌ Wasted work - server already rendered the HTML!

## The Minimact Solution

Minimact flips the model entirely:

```
┌─────────────────────────────────────────┐
│  Minimact Flow                          │
├─────────────────────────────────────────┤
│  1. Server renders HTML                 │
│  2. Client downloads 13.33 KB runtime   │
│  3. Server pre-computes state changes   │
│  4. Client caches predicted patches     │
│  5. User interacts → instant update     │
│     (patch already in cache!)           │
│  6. Server verifies in background       │
└─────────────────────────────────────────┘
```

**Benefits:**
- ✅ 13.33 KB client vs 45 KB React (71% smaller)
- ✅ No hydration required
- ✅ Zero client-side reconciliation
- ✅ 2-3ms perceived latency (vs 30-60ms traditional)
- ✅ Instant interactions (cached patches)

## Client-Side Stored Procedures

The core insight: **treat UI state transitions like database stored procedures**.

### Traditional Approach
```typescript
// Client downloads logic
// Client executes on every interaction
function handleClick() {
  const newState = computeNextState(currentState);
  reconcile(vdom, newState); // Expensive!
  applyPatches(dom);
}
```

**Problem:** Client does expensive work **every single time**.

### Minimact Approach
```typescript
// Server pre-compiles state transitions
// Client executes pre-computed patches
function handleClick() {
  const patch = cache.get(hintId); // Already cached!
  applyPatch(dom, patch);          // Instant!
}
```

**Insight:** Just like stored procedures move computation to the database, Minimact moves UI computation to the server and caches the results.

## Universal Template Prediction

The breakthrough: **one template handles infinite values**.

### Before Templates
```
State 0 → Prediction: "Count: 0"  (150 bytes)
State 1 → Prediction: "Count: 1"  (150 bytes)
State 2 → Prediction: "Count: 2"  (150 bytes)
...
State 1000 → 150KB of predictions!
```

### After Templates (Phase 1-9)
```
Any state → Template: "Count: {0}"  (200 bytes)

State 0 → Apply template → "Count: 0"  ✅
State 1 → Apply template → "Count: 1"  ✅
State 1000000 → Apply template → "Count: 1000000"  ✅
```

**Result:** 750x memory reduction, 100% coverage after first interaction.

## React Syntax, .NET Performance

Write familiar React code:

```tsx
import { useState } from '@minimact/core';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

**Babel transpiles to C#:**

```csharp
public class Counter : MinimactComponent
{
    [UseState]
    private int count = 0;

    protected override VNode Render()
    {
        return new VElement("button",
            new { onclick = nameof(Increment) },
            new VText($"Count: {count}")
        );
    }

    public void Increment()
    {
        count++;
        TriggerRender();
    }
}
```

**Rust engine predicts:**
- Extracts template: `"Count: {0}"`
- Pre-computes patch for `count + 1`
- Caches patch on client
- Client applies instantly on click

## Hybrid State Management

The best of both worlds:

```tsx
function SearchBox() {
  // Client-only - instant, no network

  // Server-managed - secure, persistent
  const [results, setResults] = useState([]);

  return (
    <div>
      {/* Instant typing feedback */}
      <input
        value={query}
        onInput={e => setQuery(e.target.value)}
      />

      {/* Server computation */}
      <button onClick={() => setResults(search(query))}>
        Search
      </button>

      {/* Server-rendered results */}
      {results.map(r => <Result {...r} />)}
    </div>
  );
}
```

**Key insight:** Not everything needs a server round-trip. Use the right tool for the job.

## Zero Hydration

Traditional frameworks ship the framework to the client:

```
React Client Bundle:
├── React reconciliation engine
├── VDOM implementation
├── Component tree
├── State management
└── Event system
Total: 45 KB (gzipped)
```

Minimact ships only what's needed:

```
Minimact Client Bundle:
├── SignalM WebSocket client (or SignalR)
├── DOM patcher
├── Event delegation
├── Patch cache
└── State synchronization
Total: 13.33 KB (gzipped) - 71% smaller
```

**With full SignalR:** 25.03 KB (still 44% smaller than React)

**Why?** The server already has all the logic. Client just needs to:
1. Send events to server
2. Apply patches from server
3. Cache predicted patches

## TypeScript → C# Type Safety

End-to-end type safety:

```tsx
// TypeScript component
interface User {
  name: string;
  email: string;
}

export function UserProfile({ user }: { user: User }) {
  return <div>{user.name}</div>;
}
```

**Babel infers C# types:**

```csharp
public class User
{
    public string Name { get; set; }
    public string Email { get; set; }
}

public class UserProfile : MinimactComponent<UserProfileProps>
{
    public class UserProfileProps
    {
        public User User { get; set; }
    }

    // ...
}
```

**Result:** Refactor-safe, autocomplete everywhere, catch errors at compile time.

## Progressive Enhancement

Works without JavaScript:

```html
<!-- Server renders full HTML -->
<form method="POST" action="/search">
  <input name="query" />
  <button type="submit">Search</button>
</form>

<!-- JavaScript enhances with SignalR -->
<script>
  // Intercepts form, uses SignalR instead
  // Falls back to POST if JS disabled
</script>
```

**Philosophy:** Start with solid HTML, enhance progressively.

## Comparison to Alternatives

### vs Next.js/Remix (Client-Side React)

| Aspect | Minimact | Next.js/Remix |
|--------|----------|---------------|
| **Client bundle** | 13.33 KB (71% smaller) | ~45 KB |
| **Hydration** | None | Required |
| **Interaction latency** | 2-3ms | 30-60ms |
| **Server language** | .NET | Node.js |
| **Type safety** | TS→C# | TS only |

**When to use Minimact:** Enterprise .NET apps, strict security requirements, minimal client footprint

**When to use Next/Remix:** Heavy client interactivity, existing Node.js infrastructure

### vs Blazor Server (.NET SSR)

| Aspect | Minimact | Blazor |
|--------|----------|--------|
| **Syntax** | React JSX/TSX | Razor C# |
| **Learning curve** | Low (React) | Medium (Blazor) |
| **Prediction** | ✅ Rust-powered | ❌ None |
| **Template system** | ✅ 98% memory reduction | ❌ None |
| **Hybrid state** | ✅ Built-in | ❌ Manual |

**When to use Minimact:** React developers, predictive rendering needs, hybrid state

**When to use Blazor:** Pure .NET teams, existing Blazor experience

### vs HTMX (Hypermedia)

| Aspect | Minimact | HTMX |
|--------|----------|------|
| **Paradigm** | Component-based | Hypermedia |
| **Bundle size** | 13.33 KB | ~14 KB |
| **Type safety** | ✅ TS→C# | ❌ None |
| **Prediction** | ✅ Intelligent | ❌ None |
| **Complexity** | React components | HTML attributes |

**When to use Minimact:** Complex UIs, type safety, predictive rendering

**When to use HTMX:** Simple apps, hypermedia architecture, extreme simplicity

## The Posthydrationist Philosophy

> *The cactus doesn't hydrate—it stores.*
> *It doesn't react—it anticipates.*
> *It doesn't reconcile—it persists.*

Traditional frameworks are built on **hydration** - sending code to the client and reconstructing state.

Minimact is built on **prediction** - knowing what will happen before it does, and having the answer ready.

Like a cactus in the desert:
- **Minimal** - Only what's needed (~5KB)
- **Resilient** - Works without JavaScript
- **Anticipatory** - Pre-computed state changes
- **Efficient** - No wasted reconciliation

## Summary: The Paradigm Shift

**Traditional SSR:**
- Ship framework to client
- Hydrate on client
- Reconcile on every interaction
- Compute state changes in real-time

**Minimact:**
- Keep framework on server
- No hydration needed
- Pre-compute state changes
- Cache predictions on client
- Apply cached patches instantly

**Result:** Faster, smaller, more secure.

## Next Steps

- [Predictive Rendering 101](/v1.0/architecture/predictive-rendering-101) - Deep dive into prediction
- [DOM as Data Source](/v1.0/architecture/dom-as-data-source) - Extensions ecosystem
- [Posthydrationist Manifesto](/v1.0/architecture/posthydrationist-manifesto) - The philosophy
- [Getting Started](/v1.0/guide/getting-started) - Build your first app
