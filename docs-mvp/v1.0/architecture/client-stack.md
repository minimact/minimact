# Minimact Client Architecture: Layered Reactive DOM Stack

Minimact's client modules form a coherent hierarchy of reactive capabilities — from predictive rendering to distributed DOM synchronization.

**Each layer is a separate npm package.** Install only what you need.

## The Evolution Stack

```
┌────────────────────────────┐
│   minimact-quantum         │  ← 6️⃣ Distributed Identity
│   Entanglement Protocol    │
└────────────────────────────┘
            ▲
┌────────────────────────────┐
│   minimact-trees           │  ← 5️⃣ Semantic Trees
│   Declarative State        │
└────────────────────────────┘
            ▲
┌────────────────────────────┐
│   minimact-spatial         │  ← 4️⃣ Layout & Flow Analysis
│   Viewport as 2D Database  │
└────────────────────────────┘
            ▲
┌────────────────────────────┐
│   minimact-dynamic         │  ← 3️⃣ Function-Based Binding
│   Structure/Logic Split    │
└────────────────────────────┘
            ▲
┌────────────────────────────┐
│   minimact-query           │  ← 2️⃣ SQL for Reactive DOM
│   Relational Queries       │
└────────────────────────────┘
            ▲
┌────────────────────────────┐
│   minimact-punch           │  ← 1️⃣ DOM as Reactive State
│   80+ Observable Props     │
└────────────────────────────┘
            ▲
┌────────────────────────────┐
│   minimact (core)          │  ← 0️⃣ Predictive Rendering
│   13.33 KB Runtime         │
└────────────────────────────┘
```

**The Journey:**
```
React → Reactive DOM → Queryable DOM → Predictive Layout → Distributed DOM
```

---

## 0️⃣ minimact (Core)

**Foundation:** Predictive rendering, state hooks, and patch cache execution.

```bash
npm install minimact
```

### What It Includes

- **Hooks:** `useState`, `useEffect`, `useRef`, `useContext`, `useComputed`, `useServerTask`
- **Predictive patches** via template cache
- **Server-rendered HTML** with client patch application
- **13.33 KB runtime** (gzipped) — 71% smaller than React
- **Alternative:** `minimact-r` with full SignalR (25.03 KB)

### Key Features

```tsx
// Server-managed state
const [count, setCount] = useState(0);

// Client-only state (no server round-trip)

// Long-running server tasks with progress
const [task, startTask] = useServerTask(async (updateProgress) => {
  for (let i = 0; i <= 100; i += 10) {
    await delay(500);
    updateProgress(i);
  }
  return 'Complete!';
});
```

**See:** [Core Hooks Documentation](/v1.0/api/hooks)

---

## 1️⃣ minimact-punch: DOM as Reactive Data Source

**Capability:** Make the DOM observable — structure, pseudo-state, styles, lifecycle.

```bash
npm install minimact-punch
```

### What It Adds

- **`useDomElementState(selector)`** - Makes DOM queryable like a database
- **80+ reactive properties** (isIntersecting, childrenCount, attributes, classList, etc.)
- **MutationObserver integration** (automatic updates)
- **IntersectionObserver integration** (viewport tracking)
- **Statistical aggregates** (`.vals.avg()`, `.vals.sum()`, `.vals.median()`)
- **Collection queries** (count, map, filter, find)
- **MES Silver certified** (Minimact Extension Standards)

### Example

```tsx
import { useDomElementState } from 'minimact-punch';

function AdaptiveHeader() {
  const scrollContainer = useDomElementState('#main-content');

  return (
    <header className={scrollContainer.scrollTop > 100 ? 'compact' : 'full'}>
      {/* Header adapts based on scroll position */}
    </header>
  );
}
```

**See:** [DOM as Data Source Use Cases](/v1.0/use-cases#dom-as-data-source-extensions)

---

## 2️⃣ minimact-query: SQL for the DOM

**Capability:** Query reactive DOM state declaratively with SQL semantics.

```bash
npm install minimact-query
```

### What It Adds

- **`useDomQuery()`** - Query DOM like a relational database
- **Full SQL semantics** (SELECT, FROM, WHERE, JOIN, GROUP BY, ORDER BY, LIMIT)
- **Aggregate functions** (COUNT, SUM, AVG, MIN, MAX, STDDEV)
- **Set operations** (UNION, INTERSECT, EXCEPT, DISTINCT)
- **Reactive by default** (queries auto-update when DOM changes)
- **Type-safe** with autocomplete for 80+ DOM properties
- **Performance optimized** (throttling/debouncing built-in)

### Example

```tsx
import { useDomQuery } from 'minimact-query';

function PerformanceMonitor() {
  const unstableComponents = useDomQuery()
    .from('.component')
    .where(c => c.history.changesPerSecond > 10)
    .orderBy(c => c.history.volatility, 'DESC')
    .limit(10);

  return (
    <div>
      <h3>Unstable Components ({unstableComponents.count})</h3>
      {unstableComponents.map(c => (
        <div>{c.id}: {c.history.changesPerSecond} changes/sec</div>
      ))}
    </div>
  );
}
```

**Status:** 🧪 Experimental (in development)

---

## 3️⃣ minimact-dynamic: Function-Based Value Binding

**Capability:** Separate structure from logic. JSX stays clean; logic lives in TypeScript functions.

```bash
npm install minimact-dynamic
```

### What It Adds

- **`useDynamicState(selector, fn)`** - Separate structure from content
- **Define DOM once, bind values with functions**
- **Auto dependency tracking** with Proxy
- **Direct DOM updates** (< 1ms, no VDOM)
- **Server pre-compilation** support
- **Minimal bundle** (< 3KB gzipped)

### Example

```tsx
import { dynamic } from 'minimact-dynamic';

function PricingCard({ product, user }) {
  // Structure ONCE
  return (
    <div className="card">
      <span className="price"></span>
    </div>
  );
}

// Bind SEPARATELY (logic outside JSX)
dynamic('.price', (state) =>
  state.user.isPremium
    ? state.product.factoryPrice
    : state.product.price
);
```

**Key Benefit:** Structure is static, logic is dynamic. Re-bind without re-rendering.

---

## 4️⃣ minimact-spatial: Physical Layout Reasoning

**Capability:** DOM spatial intelligence — gaps, overlaps, flow, lookahead/lookbehind.

```bash
npm install minimact-spatial
```

### What It Adds

- **`useArea()`** - Query spatial regions of the viewport
- **Track coverage, density, element counts**
- **Reactive spatial queries**
- **Region-based event handling**
- **Spatial collision detection**

### Example

```tsx
import { useArea } from 'minimact-spatial';

function AdaptiveLayout() {
  const header = useArea({ top: 0, height: 80 });
  const sidebar = useArea('#sidebar');

  return (
    <div>
      {header.isFull && <CompactMode />}
      {sidebar.elementsCount > 10 && <ScrollIndicator />}
    </div>
  );
}
```

**Use Cases:**
- Sticky headers that adapt to content
- Scroll indicators based on viewport coverage
- Layout collision detection
- Responsive design based on actual layout (not just viewport size)

---

## 5️⃣ minimact-trees: Declarative State Machines

**Capability:** Understand ancestry, depth, siblings, and tree relationships declaratively.

```bash
npm install minimact-trees
```

### What It Adds

- **`useDecisionTree()`** - XState but minimal and declarative
- **Universal value type support** (any primitive or object)
- **Nested decision paths**
- **Predictive transition pre-computation**
- **Server-side rendering integration**
- **TypeScript inference** for tree structure

### Example

```tsx
import { useDecisionTree } from 'minimact-trees';

function PricingEngine({ user, cartSize }) {
  const price = useDecisionTree({
    roleAdmin: 0,
    rolePremium: {
      count5: 0,
      count3: 5
    },
    roleBasic: 10
  }, { role: user.role, count: cartSize });

  return <div>Price: ${price}</div>;
}
```

**Key Insight:** Decision trees are predictable state machines. Server can pre-compute all transitions.

---

## 6️⃣ minimact-quantum: The Entangled DOM

**Capability:** DOM sync across clients & pages. Mutation vectors. Shared identity.

```bash
npm install minimact-quantum
```

### What It Adds

- **Multi-client DOM synchronization** across physical space
- **Identity sync** (not data sync - same element in two places at once)
- **Mutation vectors** for efficient transmission
- **Bidirectional entanglement**
- **Operational Transform** for conflict resolution
- **100x bandwidth reduction** vs full state sync
- **WebWormhole integration** for P2P

### Example

```tsx
import { quantum } from 'minimact-quantum';

async function CollaborativeSlider() {
  const slider = document.querySelector('#volume-slider');

  // User A in New York, User B in Tokyo
  const link = await quantum.entangle(slider, {
    clientId: 'user-b',
    selector: '#volume-slider'
  }, 'bidirectional');

  // User A drags → User B's slider moves instantly
  // SAME IDENTITY. DIFFERENT SPACETIME COORDINATES.
}
```

**Key Concept:**
```
Traditional: Sync data, reconstruct UI
Quantum: Sync DOM identity, mutations propagate
```

**Status:** 🧪 Experimental (proof-of-concept)

---

## Layer Composition

Each layer builds on the previous:

| Layer | Adds | Builds On |
|-------|------|-----------|
| **0: Core** | Predictive rendering | Server HTML |
| **1: Punch** | DOM observability | Core state |
| **2: Query** | Relational queries | Punch properties |
| **3: Dynamic** | Function binding | Core patches |
| **4: Spatial** | Layout intelligence | Punch spatial data |
| **5: Trees** | State machines | Core prediction |
| **6: Quantum** | Multi-client sync | Core patches + Punch state |

**You can use any layer without the ones above it.**

Example:
- Use just `minimact-dynamic` with core (no Punch/Query needed)
- Use `minimact-spatial` without Query
- Use `minimact-quantum` directly with core

---

## Philosophy: From React to Reactive

### Traditional React
```
React Component → VDOM → Reconciliation → DOM
```

### Minimact Core
```
TSX Component → Server Render → Predictive Patches → DOM
```

### Minimact + Extensions
```
TSX Component → Server Render → Predictive Patches → DOM
                                                      ↓
                                              Observable State
                                                      ↓
                                              SQL Queries
                                                      ↓
                                              Function Bindings
                                                      ↓
                                              Spatial Reasoning
                                                      ↓
                                              State Machines
                                                      ↓
                                              Quantum Sync
```

**The DOM becomes:**
1. **Reactive** (Punch) - Observable like state
2. **Queryable** (Query) - Relational like a database
3. **Declarative** (Dynamic) - Bindable like templates
4. **Spatial** (Spatial) - Geometric like a canvas
5. **Structural** (Trees) - Hierarchical like a filesystem
6. **Distributed** (Quantum) - Synchronized like CRDT

---

## Production Readiness

### ✅ Production-Ready
- **minimact** (core)
- **minimact-punch** (MES Silver certified)
- **minimact-dynamic**
- **minimact-spatial**
- **minimact-trees**

### 🧪 Experimental
- **minimact-query** (in development)
- **minimact-quantum** (proof-of-concept)

---

## Next Steps

- [What Makes Minimact Different](/v1.0/architecture/what-makes-minimact-different) - Core paradigm
- [Predictive Rendering 101](/v1.0/architecture/predictive-rendering-101) - How prediction works
- [Use Cases](/v1.0/use-cases) - Real-world applications
- [Hooks API](/v1.0/api/hooks) - Complete hook reference

---

**React gave us components.**

**Minimact gives us a reactive, queryable, distributed DOM.**

🌵 **The future is layered.** 🌵
