# Extensions

The Minimact Quantum Stack extends the core framework with powerful, specialized capabilities.

---

## Official Extensions

### 🥊 [minimact-punch](./punch)

**DOM as Reactive Data Source**

Makes the DOM a comprehensive, queryable state system with 80+ properties.

```typescript
const state = useDomElementState('#card');

// Access 80+ reactive properties
state.isIntersecting     // Viewport visibility
state.childrenCount      // DOM structure
state.state.hover        // Pseudo-states
state.theme.isDark       // User preferences
state.history.changeCount // Performance tracking
```

**Use Cases:**
- Infinite scroll with intersection tracking
- Responsive design based on actual DOM state
- Performance monitoring and diagnostics
- Accessibility auditing

[Learn more →](./punch)

---

### 🗃️ [minimact-query](./query)

**SQL for the DOM**

Query the DOM like a relational database with full SQL syntax.

```typescript
const cards = useDomQuery()
  .from('.card')
  .where(card => card.isIntersecting && card.state.hover)
  .orderBy(card => card.history.changeCount, 'DESC')
  .limit(10);

// SELECT projection in JSX
{cards.select(card => ({
  id: card.attributes.id,
  title: card.textContent
})).map(row => <Card key={row.id} {...row} />)}
```

**Features:**
- SELECT, WHERE, JOIN, GROUP BY, HAVING, ORDER BY
- Aggregate functions (COUNT, SUM, AVG, MIN, MAX)
- Set operations (UNION, INTERSECT, EXCEPT)
- Full type safety with TypeScript

[Learn more →](./query)

---

### 🌌 [minimact-quantum](./quantum)

**Quantum DOM Entanglement**

Share DOM identity across physical space. Not data sync - **IDENTITY sync**.

```typescript
const quantum = createQuantumManager({
  clientId: 'user-123',
  signalR: signalRManager
});

// Entangle slider with collaborator
await quantum.entangle(slider, {
  clientId: 'user-456',
  selector: '#volume-slider'
}, 'bidirectional');

// One user moves slider → Both see it move (7-17ms latency)
```

**Revolutionary concept:** The same element existing in two places at once through mutation vectors.

**Use Cases:**
- Real-time collaboration
- Live presentations
- Remote support
- Multi-device control

[Learn more →](./quantum)

---

### 🎯 [minimact-bundle](./bundle)

**Declarative DOM Selector Primitives**

Behavioral anchors without wrappers. Apply attributes, classes, and styles to arbitrary DOM elements.

```typescript
registerBundle("hero", ".hero h1, .hero p, button");

useBundle("hero", {
  class: visible ? "fade-in visible" : "fade-in",
  style: { opacity: visible ? 1 : 0 }
});

<section className="hero">
  <h1>Welcome</h1>
  <p>Description</p>
  <button>Click</button>
</section>
```

**Revolutionary concept:** Control any DOM elements declaratively without wrapper divs or manual DOM manipulation.

**Use Cases:**
- Scroll animations without wrappers
- Theme switching across disparate elements
- Loading states for all interactive elements
- Print styling
- Dynamic layout control

[Learn more →](./bundle)

---

### 📐 [minimact-spatial](./spatial)

**Spatial Computing for the Web**

Query viewport regions as a 2D database. Turn spatial areas into reactive data sources.

```typescript
const header = useArea({ top: 0, height: 80 });
const viewport = useArea('viewport');

// Spatial analysis
console.log(header.elementsCount);    // 5
console.log(header.coverage);         // 0.85 (85% covered)
console.log(header.isEmpty);          // false

// Reactive rendering
{header.isFull && <CompactMode />}
{viewport.isSparse && <EmptyState />}
```

**Use Cases:**
- Collision detection
- Heat mapping
- Scroll analytics
- Layout optimization
- Drag & drop zones

[Learn more →](./spatial)

---

### 🌳 [minimact-trees](./trees)

**Universal Decision Trees**

XState but declarative, predictive, and minimal. Works with any value type.

```typescript
const price = useDecisionTree({
  tierGold: {
    quantity1: 0,
    quantity10: 0      // Gold: always free
  },
  tierSilver: {
    quantity1: 5,
    quantity10: 0      // Silver: free above 10
  },
  tierBronze: {
    quantity1: 10,
    quantity5: 8,
    quantity10: 5
  }
}, {
  tier: currentTier,
  quantity: itemCount
});

// → Returns shipping price based on tier + quantity
```

**Features:**
- Automatic key parsing (`tierGold` → `tier === 'gold'`)
- Supports strings, numbers, floats, booleans
- Predictive rendering with Rust (0-1ms cache hits)
- Server-side rendering compatible

[Learn more →](./trees)

---

## Extension Architecture

All Minimact extensions follow a consistent pattern:

### 1. Client-Side Hooks

```typescript
// Evaluate on client
const result = useExtension(config, context);
```

### 2. Server Sync

```typescript
// Automatically sync to server
context.signalR.updateComponentState(
  componentId,
  stateKey,
  result
);
```

### 3. Server-Side Rendering

```csharp
// Server reads synced state
protected override VNode Render()
{
    var extensionState = State["extension_state_0"];
    // Render with correct state
}
```

### 4. Predictive Rendering

```typescript
// Check hint queue first
const hint = context.hintQueue.matchHint(componentId, stateChanges);
if (hint) {
  // 🟢 CACHE HIT! Apply patches instantly (0-1ms)
  context.domPatcher.applyPatches(element, hint.patches);
}
```

---

## Performance Comparison

| Extension | Operation | Latency | vs Traditional |
|-----------|-----------|---------|----------------|
| **minimact-punch** | DOM state read | < 1ms | 95% faster |
| **minimact-query** | Query 1000 elements | 5-10ms | 90% faster |
| **minimact-quantum** | Mutation propagation | 7-17ms | 90% faster |
| **minimact-bundle** | Attribute application (10 elements) | < 2ms | 93% faster |
| **minimact-spatial** | Spatial query | 2-5ms | 85% faster |
| **minimact-trees** | Tree evaluation (predicted) | 0-1ms | 99% faster |

---

## Integration Example

Combining multiple extensions:

```typescript
import { useDomElementState } from 'minimact-punch';
import { useDomQuery } from 'minimact-query';
import { createQuantumManager } from 'minimact-quantum';
import { useArea } from 'minimact-spatial';
import { useDecisionTree } from 'minimact-trees';

function Dashboard() {
  // Track viewport visibility
  const cards = useDomQuery()
    .from('.card')
    .where(c => c.isIntersecting)
    .orderBy(c => c.history.changeCount, 'DESC');

  // Analyze layout regions
  const sidebar = useArea('#sidebar');

  // Calculate pricing
  const price = useDecisionTree({
    tierGold: 0,
    tierSilver: 5,
    tierBronze: 10
  }, { tier: userTier });

  // Enable collaboration
  const quantum = createQuantumManager({
    clientId: userId,
    signalR: signalRManager
  });

  return (
    <div>
      <p>Visible cards: {cards.count()}</p>
      <p>Sidebar coverage: {(sidebar.coverage * 100).toFixed(0)}%</p>
      <p>Shipping: ${price}</p>
    </div>
  );
}
```

---

## Philosophy

> **"The DOM is no longer a view layer."**
>
> **"The DOM is a queryable, reactive, distributed database."**

Minimact extensions transform the browser into a powerful computing platform:

- **minimact-punch**: DOM as data source
- **minimact-query**: DOM as SQL database
- **minimact-quantum**: DOM as distributed system
- **minimact-bundle**: DOM as declarative puppet
- **minimact-spatial**: DOM as 2D spatial database
- **minimact-trees**: DOM as state machine runtime

---

## Installation

Each extension is published separately:

```bash
# Install individual extensions
npm install minimact-punch
npm install minimact-query
npm install minimact-quantum
npm install minimact-bundle
npm install minimact-spatial
npm install minimact-trees

# Or install all at once
npm install minimact-punch minimact-query minimact-quantum minimact-bundle minimact-spatial minimact-trees
```

---

## Next Steps

- [Getting Started with Minimact](/v1.0/guide/getting-started)
- [Core Hooks API](/v1.0/api/hooks)
- [Predictive Rendering Guide](/v1.0/guide/predictive-rendering)
- [Architecture Overview](/v1.0/architecture/what-makes-minimact-different)

---

**Part of the Minimact Quantum Stack** 🌵✨🌌
