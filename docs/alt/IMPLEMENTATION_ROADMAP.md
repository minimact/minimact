# Minimact Innovation Implementation Roadmap

**Strategic implementation path for groundbreaking Minimact features**

Built on the foundation of:
- ✅ Minimact Punch (complete - all 4 parts + server sync)
- ✅ State synchronization (useState + useDomElementState → server)
- ✅ SignalR infrastructure (ready for multi-client)

---

## Phase 1: useDynamicState (minimact-dynamic) ⭐ **START HERE**

**Goal:** Separate structure from content. Define DOM once in JSX, bind values dynamically with minimal code.

**Status:** Not started
**Estimated Time:** 12-17 hours
**Priority:** HIGHEST - Foundation for all subsequent phases

### Why Phase 1?

- ✅ **Immediate value** - Solves real pain point (JSX duplication)
- ✅ **Zero dependencies** - Can build standalone right now
- ✅ **Quick to implement** - Shortest timeline of all innovations
- ✅ **Performance win** - Direct DOM updates, no VDOM overhead (< 1ms per binding)
- ✅ **Enables Phase 2** - DOM Choreography requires `.order()` API
- ✅ **Perfect with Punch** - State changes trigger DOM observation

### The Problem It Solves

```tsx
// ❌ BEFORE: Painful JSX duplication
{user.isPremium ? (
  <span className="price premium">${product.factoryPrice}</span>
) : (
  <span className="price retail">${product.price}</span>
)}

// ✅ AFTER: Structure ONCE, bind SEPARATELY
<span className="price"></span>

const dynamic = useDynamicState();
dynamic('.price', (state) =>
  state.user.isPremium ? state.product.factoryPrice : state.product.price
);
```

### Core Features

1. **Auto-dependency tracking** - Proxy intercepts property access
2. **Server pre-compilation** - Evaluate functions on server, render values
3. **Direct DOM updates** - `el.textContent = value` (no VDOM)
4. **Smart re-evaluation** - Only when dependencies change
5. **Hydration** - < 5ms for 100 bindings

### Complete API

```typescript
interface DynamicStateAPI {
  // Bind text content (Phase 1.1)
  (selector: string, fn: (state) => string | number): void;

  // Bind element order - DOM CHOREOGRAPHY (Phase 1.2)
  order(containerSelector: string, fn: (state) => string[]): void;

  // Bind attributes (Phase 1.3)
  attr(selector: string, attribute: string, fn: (state) => string): void;

  // Bind classes (Phase 1.4)
  class(selector: string, fn: (state) => string): void;

  // Bind styles (Phase 1.5)
  style(selector: string, property: string, fn: (state) => string): void;

  // Bind visibility (Phase 1.6)
  show(selector: string, fn: (state) => boolean): void;

  // State management
  setState(newState: any): void;
  update(partial: any): void;
  getState(): any;
}
```

### Implementation Steps

**Step 1.1:** Client-side foundation (3-4 hours)
- Package structure (`src/minimact-dynamic/`)
- TypeScript types (`types.ts`)
- Dependency tracker (`dependency-tracker.ts`)
- Value updater (`value-updater.ts`)
- Core hook (`use-dynamic-state.ts`)

**Step 1.2:** Server-side compiler (2-3 hours)
- `DynamicBinding` class (C#)
- `DynamicValueCompiler` (C#)
- MinimactComponent integration

**Step 1.3:** Basic examples (1-2 hours)
- Conditional pricing demo
- User badge demo
- Multi-binding demo

**Step 1.4:** Performance optimizations (2-3 hours)
- Smart dependency tracking
- Batch updates (requestAnimationFrame)
- Memoization cache

**Step 1.5:** Babel transpiler integration (4-5 hours)
- Detect useDynamicState patterns
- Transpile to C#
- Extract dependencies automatically

**Step 1.6:** Testing & polish (1-2 hours)
- End-to-end tests
- Performance validation (< 1ms target)
- Bundle size check (< 3KB target)

### Success Criteria

- [ ] Client package builds successfully
- [ ] Server package builds successfully
- [ ] Functions return VALUES (not JSX)
- [ ] Dependencies tracked automatically via Proxy
- [ ] Bindings re-evaluate when dependencies change
- [ ] DOM updates directly (no VDOM): `el.textContent = value`
- [ ] Server evaluates functions and renders values
- [ ] Hydration picks up bindings in < 5ms
- [ ] Performance: < 1ms per binding update
- [ ] Bundle size: < 3KB gzipped

### Synergy with Existing Work

```tsx
// Dynamic changes value
const dynamic = useDynamicState({ isPremium: false, price: 29.99 });
dynamic('.price', s => s.isPremium ? '$19.99' : '$29.99');
// → Direct DOM update: el.textContent = '$19.99'

// Punch observes the change (minimact-punch)
const price = useDomElementState('.price');
price.history.changeCount      // Increments
price.history.trend            // 'decreasing' (price went down!)
price.history.changesPerSecond // Performance tracking

// State syncs to server (our work from earlier!)
context.signalR.updateComponentState(componentId, stateKey, value);
// → Server stays in sync, no stale data!
```

### Deliverables

- `src/minimact-dynamic/` - Full package
- `docs/DYNAMIC_STATE_GUIDE.md` - Usage guide
- `examples/dynamic-state-demo/` - Live demos
- Updated `README.md` with examples

---

## Phase 2: DOM Choreography (8-10 hours)

**Goal:** Define elements ONCE, move them based on state. Never recreate. Never destroy.

**Status:** Not started
**Estimated Time:** 8-10 hours
**Priority:** HIGH - Enables game-changing UX patterns
**Dependency:** Requires Phase 1 (useDynamicState with `.order()` API)

### Why Phase 2?

- ✅ **Revolutionary UX** - Elements persist, state preserved across moves
- ✅ **Performance 2x better** - Half the DOM operations vs unmount/remount
- ✅ **Perfect use cases** - Chess, Kanban, sortable lists, photo galleries
- ✅ **Works with Punch** - Track choreographed movements with history/lifecycle
- ✅ **Enables Phase 3** - DEP syncs choreography across clients

### The Problem It Solves

```tsx
// ❌ BEFORE: Traditional React destroys/recreates on every sort
{items.sort(sortFn).map(item => <Card key={item.id} data={item} />)}

// Problems:
// - Unmount + mount = 200 DOM operations
// - Input values LOST
// - Scroll position LOST
// - Focus LOST
// - Component state LOST

// ✅ AFTER: Elements defined ONCE, moved forever
<div className="cards">
  <Card id="card-1" />
  <Card id="card-2" />
  <Card id="card-3" />
</div>

dynamic.order('.cards', (state) =>
  state.items
    .sort(sortFn)
    .map(item => `#card-${item.id}`)
);

// Benefits:
// - 100 DOM operations (just move)
// - Input values PRESERVED
// - Scroll PRESERVED
// - Focus PRESERVED
// - Smooth CSS transitions (browser animates!)
```

### Core Features

1. **Element persistence** - Defined once, never destroyed
2. **State preservation** - Input values, scroll, focus survive moves
3. **Smooth animations** - CSS transitions automatically (no FLIP needed)
4. **Cross-container movement** - Elements can move anywhere
5. **Cross-page teleportation** - Elements persist across navigation

### Chess Example (Perfect Use Case)

```tsx
// 32 pieces defined ONCE at game start
<div className="piece-pool" style={{ display: 'none' }}>
  <div id="piece-white-king">♔</div>
  <div id="piece-white-queen">♕</div>
  {/* ... all 32 pieces ... */}
</div>

// Choreograph pieces onto squares based on game state
for (const square of ['a1', 'a2', ..., 'h8']) {
  dynamic.order(`[data-pos="${square}"]`, (state) => {
    const piece = state.board.find(p => p.position === square);
    return piece ? [`#piece-${piece.id}`] : [];
  });
}

// Move pawn: e2 → e4
setState({ board: movePiece('white-pawn-1', 'e2', 'e4') });

// Result:
// - Pawn GLIDES from e2 to e4 (CSS transition)
// - SAME element, just moved
// - No destroy/recreate
// - Smooth 60fps animation
```

### Integration with Punch

```tsx
// Track choreographed piece
const pawn = useDomElementState('#piece-white-pawn-1');

// After move:
pawn.history.changeCount       // Incremented
pawn.history.changesPerSecond  // Animation performance
pawn.lifecycle.state           // 'moving' → 'settled'
pawn.boundingRect              // New position

// Sync to server
context.signalR.updateDomElementState(componentId, 'pawn', pawn.snapshot);
```

### Implementation Steps

**Step 2.1:** Core choreography engine (2-3 hours)
- Element order tracker
- Reparenting algorithm
- CSS transition coordination

**Step 2.2:** Cross-container movement (2 hours)
- Parent → Child movement
- Child → Parent movement
- Sibling movement

**Step 2.3:** Cross-page teleportation (2-3 hours)
- ElementPersistenceService (C#)
- Server-side element storage
- Client-side teleporter

**Step 2.4:** Examples (2 hours)
- Chess board demo
- Kanban board demo
- Sliding puzzle demo
- Photo gallery layouts

### Success Criteria

- [ ] Elements move without unmount/remount
- [ ] Input values preserved across moves
- [ ] Scroll position preserved
- [ ] Focus preserved
- [ ] CSS transitions work automatically
- [ ] Cross-container movement works
- [ ] Cross-page teleportation works
- [ ] Performance: 2x faster than unmount/remount
- [ ] Chess demo: Smooth piece movements

### Deliverables

- DOM choreography API in `minimact-dynamic`
- `docs/DOM_CHOREOGRAPHY_GUIDE.md`
- Chess demo with move history
- Kanban board demo

---

## Phase 3: DOM Entanglement Protocol (30-40 hours)

**Goal:** Multi-client DOM synchronization across physical space. Not collaboration—quantum entanglement.

**Status:** Not started
**Estimated Time:** 30-40 hours
**Priority:** MEDIUM - Most ambitious, enables new paradigms
**Dependencies:** Requires Phase 1 + 2 (useDynamicState + DOM Choreography)

### Why Phase 3?

- 🤯 **Most mind-blowing** concept
- ✅ **Punch enables this** - MutationObserver tracks changes
- ✅ **Choreography makes it killer** - Sync smooth animations across clients
- ✅ **State sync ready** - We already have SignalR infrastructure!
- ✅ **New paradigm** - UI-as-reality-field, not web pages

### The Revolutionary Concept

**NOT data sync. IDENTITY sync.**

```typescript
// Traditional (WRONG):
User A: clicks button → Read state → Send JSON → User B reconstructs
// Different elements, just look the same

// Quantum DOM (CORRECT):
User A: clicks button → DOM mutation → Mutation vector sent → User B applies mutation
// SAME element identity, existing in two places at once
```

### The Problem It Solves

```tsx
// Multiplayer chess - both players see smooth animations
const piece = document.querySelector('#piece-white-pawn');

// Entangle piece between players
await dep.entangle(piece, {
  clientId: opponentId,
  selector: '#piece-white-pawn'
}, 'bidirectional');

// Player 1 moves pawn: e2 → e4
setState({ board: movePiece('white-pawn-1', 'e2', 'e4') });

// What happens:
// → Player 1: Choreography moves piece (smooth CSS transition)
// → Punch: MutationObserver detects position change
// → State sync: signalR.updateDomElementState(...)
// → DEP: Server broadcasts mutation vector to Player 2
// → Player 2: SAME smooth CSS animation plays!
// → BOTH see piece glide from e2 to e4 simultaneously
```

### Core Features

1. **Mutation vectors** - Not full state, just deltas (50 bytes vs 5KB)
2. **Operational Transform** - Conflict-free concurrent updates
3. **Entanglement topology** - 1-to-1, 1-to-many, many-to-1, mesh
4. **Ownership tokens** - Transferable control
5. **Session space** - One DOM, multiple projections

### Complete Stack Integration

```typescript
// The perfect storm:

// 1. useDynamicState choreographs piece
dynamic.order('[data-pos="e4"]', () => ['#piece-white-pawn']);

// 2. Punch tracks the movement
const piece = useDomElementState('#piece-white-pawn');
// → MutationObserver fires

// 3. State sync (our work!)
context.signalR.updateDomElementState(componentId, 'piece', piece.snapshot);

// 4. DEP broadcasts to opponent
server.propagateToEntangledClients({
  mutation: {
    type: 'position',
    elementId: 'piece-white-pawn',
    from: 'e2',
    to: 'e4'
  }
});

// 5. Opponent's piece moves identically
// QUANTUM ENTANGLEMENT ACHIEVED! 🌌
```

### Implementation Steps

**Step 3.1:** Mutation vector system (6-8 hours)
- MutationVector serialization
- Mutation application
- Delta compression

**Step 3.2:** Entanglement channels (6-8 hours)
- EntanglementChannel class
- QuantumLink registration
- SignalR hub methods

**Step 3.3:** Operational Transform (8-10 hours)
- Conflict resolution
- Causal ordering (Lamport timestamps)
- Concurrent edit handling

**Step 3.4:** Session space (4-6 hours)
- Server-side session manager
- Client projection system
- State synchronization

**Step 3.5:** Examples (6-8 hours)
- Multiplayer chess
- Collaborative Kanban
- Remote support demo
- Live dashboard sync

### Success Criteria

- [ ] Mutation vectors < 100 bytes
- [ ] Bidirectional entanglement works
- [ ] Concurrent edits resolve correctly (OT)
- [ ] Latency < 50ms (including network)
- [ ] Chess piece movements sync smoothly
- [ ] No conflicts or state divergence
- [ ] Bandwidth: 100x reduction vs full state sync

### Deliverables

- `src/minimact-dep/` - Full DEP package
- `docs/ENTANGLEMENT_PROTOCOL.md`
- Multiplayer chess demo
- Collaborative Kanban demo

---

## Phase 4: minimact-query (SQL for DOM) (10-15 hours)

**Goal:** Treat the DOM as a relational database. Query it like PostgreSQL.

**Status:** Not started
**Estimated Time:** 10-15 hours
**Priority:** LOW - Nice-to-have, not critical path
**Dependency:** Requires Punch (already complete!)

### Why Phase 4?

- ✅ **Punch enables this** - All 80+ reactive DOM properties available
- ✅ **Cool concept** - SQL semantics for DOM queries
- ⚠️ **Lower priority** - Punch `.vals` already provides basic queries
- ⚠️ **Nice-to-have** - Not blocking any other feature

### The Concept

```typescript
// Instead of:
const unstableComponents = elements
  .filter(el => el.history.changesPerSecond > 10)
  .sort((a, b) => b.history.volatility - a.history.volatility)
  .slice(0, 10);

// Use SQL-like queries:
const unstableComponents = useDomQuery()
  .from('.component')
  .where(c => c.history.changesPerSecond > 10)
  .orderBy(c => c.history.volatility, 'DESC')
  .limit(10);
```

### Implementation Steps

**Step 4.1:** Query builder (4-5 hours)
- SELECT, FROM, WHERE, JOIN
- ORDER BY, GROUP BY, HAVING
- LIMIT, OFFSET

**Step 4.2:** Aggregate functions (2-3 hours)
- COUNT, SUM, AVG, MIN, MAX
- STDDEV, PERCENTILE

**Step 4.3:** Set operations (2-3 hours)
- UNION, INTERSECT, EXCEPT
- DISTINCT

**Step 4.4:** Examples (2-3 hours)
- Performance monitoring queries
- Layout analysis queries
- User interaction queries

### Success Criteria

- [ ] Full SQL semantics implemented
- [ ] Type-safe with autocomplete
- [ ] Reactive (auto-updates on DOM changes)
- [ ] Performance optimized
- [ ] Documentation complete

### Deliverables

- `src/minimact-query/` - SQL query builder
- `docs/QUERY_GUIDE.md`
- Query examples

---

## Timeline Summary

| Phase | Feature | Time | Priority | Status |
|-------|---------|------|----------|--------|
| 1 | useDynamicState | 12-17h | ⭐ HIGHEST | **START HERE** |
| 2 | DOM Choreography | 8-10h | ⭐ HIGH | Blocked by Phase 1 |
| 3 | DOM Entanglement | 30-40h | ⭐ MEDIUM | Blocked by Phase 1+2 |
| 4 | minimact-query | 10-15h | LOW | Optional |

**Total Time:** 60-82 hours for all phases

---

## Next Steps

**Immediate action:** Begin Phase 1 (useDynamicState)

1. ✅ Create implementation roadmap (this file)
2. Create `src/minimact-dynamic/` package structure
3. Implement dependency tracking (Proxy magic)
4. Implement value updater (direct DOM updates)
5. Implement `useDynamicState` hook
6. Build server-side value compiler
7. Create examples
8. Optimize performance (< 1ms target)
9. Babel transpiler integration

---

## Philosophy

> **"Structure ONCE. Bind SEPARATELY. Update DIRECTLY."**

- **useDynamicState** - Minimal value bindings
- **DOM Choreography** - Elements persist, never destroyed
- **DOM Entanglement** - Multi-client quantum sync
- **minimact-query** - SQL for the DOM

**All built on the foundation of Minimact Punch (complete!) and state synchronization (complete!).**

🌵 **MINIMACT = MINIMAL REACT** 🌵

---

**Document Created:** 2025-10-24
**Last Updated:** 2025-10-24
**Status:** Phase 1 ready to start
