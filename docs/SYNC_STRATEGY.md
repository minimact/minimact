# Elegant Client-Server Synchronization Strategy

**Status:** Design Proposal
**Date:** 2025-01-XX
**Purpose:** Define a comprehensive, elegant, and minimal synchronization architecture for Minimact

---

## Philosophy

> *The cactus doesn't overthink water storage. It has one simple rule: store when it rains, use when dry. Minimact should have one simple rule: sync when it matters, skip when it doesn't.*

**Core Principles:**
1. **Minimal by default** - Don't sync unless necessary
2. **Explicit when needed** - Clear APIs for sync control
3. **Predictable always** - Developers know exactly what syncs
4. **Self-correcting** - Server is always the source of truth

---

## The Three-Tier State Model

### Tier 1: Server State (Always Synced)

**Definition:** State that affects server rendering or business logic.

**Characteristics:**
- ✅ Single source of truth: Server
- ✅ Automatically synced on change
- ✅ Predictive patches cached for instant feedback
- ✅ Server verifies and corrects if needed

**API:**
```tsx
// Option A: Traditional event handler (CURRENT - WORKS)
<button data-onclick="Increment">+</button>

// C# server method
private void Increment() {
  count++;
  SetState(nameof(count), count);  // Triggers sync automatically
}
```

```tsx
// Option B: Reactive hook with auto-sync (NEW - PROPOSED)
const [count, setCount] = useServerState(0, 'count');

<button onClick={() => setCount(count + 1)}>+</button>
// ^ Automatically syncs to server via SignalR
// ^ Server calls SetState('count', 1)
// ^ Server re-renders
// ^ Patches sent back to client
```

**When to use:**
- User authentication state
- Shopping cart contents
- Database-backed data
- Multi-user shared state
- Anything affecting server logic

---

### Tier 2: Client State (Never Synced)

**Definition:** State that only affects client UI, never needs server.

**Characteristics:**
- ✅ Source of truth: Client only
- ✅ Zero network overhead
- ✅ Instant updates (~1ms)
- ✅ Never sent to server

**API:**
```tsx
const [isOpen, setIsOpen] = useClientState(false);

<Dropdown open={isOpen} onToggle={() => setIsOpen(!isOpen)}>
  {/* Purely client-side interaction */}
</Dropdown>
```

**When to use:**
- UI toggles (dropdowns, modals, tooltips)
- Form input values (before submit)
- Animation states
- Scroll positions
- Hover states
- Focus management

---

### Tier 3: Hybrid State (Selectively Synced)

**Definition:** State that can work client-side but occasionally syncs to server.

**Characteristics:**
- ✅ Source of truth: Client (optimistic)
- ✅ Syncs to server on demand
- ✅ Server corrects if needed
- ✅ Best of both worlds

**API:**
```tsx
// Optimistic with background sync
const [draft, saveDraft] = useOptimisticState('', {
  syncOnChange: debounce(500),  // Auto-save every 500ms
  syncKey: 'draftContent'
});

<textarea
  value={draft}
  onChange={e => saveDraft(e.target.value)}
/>
// ^ Updates instantly
// ^ Syncs to server after 500ms
// ^ Server persists to DB
```

```tsx
// Explicit sync control
const [cart, setCart, syncCart] = useHybridState([], {
  syncKey: 'cartItems',
  syncStrategy: 'manual'
});

<button onClick={() => {
  setCart([...cart, item]);  // Local update
  syncCart();                // Explicit sync when ready
}}>
  Add to Cart
</button>
```

**When to use:**
- Draft content (auto-save)
- Shopping cart (sync on checkout)
- Form fields (sync on submit)
- Collaborative editing (periodic sync)
- Offline-capable features

---

## Synchronization Mechanisms

### Mechanism 1: Event-Driven Sync (Current, Works)

**Flow:** `Client Event → Server Method → SetState → Render → Patches`

```tsx
// HTML with event handler
<button data-onclick="Increment">Increment</button>

// C# server method
private void Increment() {
  count++;
  SetState(nameof(count), count);  // Auto-triggers render & sync
}
```

**Pros:**
- ✅ Simple mental model
- ✅ Server is always authoritative
- ✅ Works today without changes

**Cons:**
- ❌ Requires C# method for every action
- ❌ No optimistic updates without predictions
- ❌ Network round-trip required

**When to use:** Admin dashboards, forms, CRUD operations

---

### Mechanism 2: State-Change Sync (New, Proposed)

**Flow:** `setState → Check hint → Apply cached → Sync to server → Verify`

```typescript
// Client-side
const setState = (newValue: T) => {
  const startTime = performance.now();

  // 1. Update local state immediately
  context.state.set(stateKey, newValue);

  // 2. Check for cached prediction (instant feedback!)
  const hint = context.hintQueue.matchHint(componentId, { [stateKey]: newValue });

  if (hint) {
    // 🟢 CACHE HIT - Apply patches instantly
    context.domPatcher.applyPatches(element, hint.patches);
    console.log(`🟢 INSTANT UPDATE: ${performance.now() - startTime}ms`);
  }

  // 3. Sync to server in background
  if (shouldSync) {  // Based on state tier
    signalR.invoke('UpdateComponentState', {
      componentId,
      stateKey,
      value: newValue
    }).then(() => {
      // 4. Server re-renders and sends authoritative patches
      // If prediction was wrong, server sends correction
    });
  }
};
```

**Pros:**
- ✅ Instant feedback (cached patches)
- ✅ Self-correcting (server verifies)
- ✅ Feels like React but server-rendered

**Cons:**
- ❌ More complex than event-driven
- ❌ Requires server-side state management
- ❌ Potential for sync conflicts

**When to use:** Interactive apps, social feeds, real-time collaboration

---

### Mechanism 3: Batch Sync (New, Proposed)

**Flow:** `Multiple changes → Batch → Sync once → Server reconciles`

```typescript
const batchSync = useBatchSync();

// Make multiple changes
batchSync.start();
setName('Alice');
setAge(25);
setEmail('alice@example.com');
batchSync.commit();  // Single sync call

// Or automatic batching
const [name, setName] = useServerState('', 'name', { batch: true });
const [age, setAge] = useServerState(0, 'age', { batch: true });

// Changes within same event loop batch automatically
setName('Alice');
setAge(25);
// ^ Single SignalR call with both changes
```

**Pros:**
- ✅ Reduces network overhead
- ✅ Atomic updates on server
- ✅ Better performance

**Cons:**
- ❌ More complex
- ❌ Timing can be tricky
- ❌ Potential for partial failures

**When to use:** Form submissions, multi-field updates, bulk operations

---

### Mechanism 4: Observable Sync (New, Proposed)

**Flow:** `DOM changes → Observer fires → Sync to server → Re-render`

```typescript
// For useDomElementState
const box = useDomElementState('.box', {
  syncToServer: true,  // Opt-in
  syncKey: 'boxState'
});

// When DOM changes:
// 1. MutationObserver fires
// 2. Updates local state (childrenCount, etc.)
// 3. Checks hint queue for cached patches
// 4. Syncs to server if configured
signalR.invoke('UpdateDomState', {
  componentId,
  stateKey: 'boxState',
  snapshot: {
    childrenCount: box.childrenCount,
    isIntersecting: box.isIntersecting
  }
});

// 5. Server uses DOM state in rendering
protected override VNode Render() {
  var boxState = GetDomState("boxState");

  return new VElement("div",
    boxState.ChildrenCount > 3
      ? new VElement("button", "Collapse")
      : null
  );
}
```

**Pros:**
- ✅ DOM becomes reactive across client/server boundary
- ✅ Server can make decisions based on DOM state
- ✅ Predictive patches pre-cached

**Cons:**
- ❌ Complex to implement
- ❌ Overhead for syncing DOM state
- ❌ May not always be needed

**When to use:** Advanced DOM-driven logic that affects server rendering

---

## API Design

### Proposed Hook APIs

#### 1. `useServerState()` - Always synced

```typescript
const [count, setCount] = useServerState(0, 'count', {
  // Options
  batch?: boolean;           // Batch with other changes
  debounce?: number;         // Debounce sync (ms)
  optimistic?: boolean;      // Apply locally before server confirms
  onSyncError?: (err) => void;  // Handle sync failures
});

// Usage
<button onClick={() => setCount(count + 1)}>
  Count: {count}
</button>
// ^ Updates instantly (cached patch)
// ^ Syncs to server automatically
// ^ Server verifies and corrects if needed
```

#### 2. `useClientState()` - Never synced

```typescript
const [isOpen, setIsOpen] = useClientState(false);

// Usage - purely client-side
<Modal open={isOpen} onClose={() => setIsOpen(false)}>
  {/* No server involved */}
</Modal>
```

#### 3. `useOptimisticState()` - Syncs with strategy

```typescript
const [draft, saveDraft, { isSyncing, lastSaved }] = useOptimisticState('', {
  syncKey: 'draftContent',
  syncStrategy: 'debounce',  // 'debounce' | 'manual' | 'immediate'
  debounceMs: 500,
  onSyncComplete: () => showToast('Saved!'),
  onSyncError: (err) => showToast('Save failed')
});

// Usage
<textarea value={draft} onChange={e => saveDraft(e.target.value)} />
{isSyncing && <Spinner />}
{lastSaved && <span>Last saved: {lastSaved}</span>}
```

#### 4. `useHybridState()` - Full control

```typescript
const [cart, setCart, syncCart, { synced, pending }] = useHybridState([], {
  syncKey: 'cartItems',
  syncStrategy: 'manual',
  conflictResolution: 'server-wins'  // 'server-wins' | 'client-wins' | 'merge'
});

// Usage
<button onClick={() => {
  setCart([...cart, item]);  // Instant local update
  // Sync when ready
  if (readyToCheckout) {
    syncCart();
  }
}}>
  Add to Cart {!synced && '(not saved)'}
</button>
```

---

## State Classification Decision Tree

```
Is the state needed for server rendering or business logic?
│
├─ YES → Use useServerState()
│   └─ Automatically syncs to server
│   └─ Predictive patches for instant feedback
│   └─ Server is source of truth
│
└─ NO → Is it ever needed on server?
    │
    ├─ YES (sometimes) → Use useOptimisticState() or useHybridState()
    │   └─ Client-side for instant feedback
    │   └─ Syncs to server when needed
    │   └─ Server corrects if conflict
    │
    └─ NO (never) → Use useClientState()
        └─ Purely client-side
        └─ Zero network overhead
        └─ Perfect for UI state
```

---

## Server-Side API

### C# Extensions for Hook Support

```csharp
public class MyComponent : MinimactComponent
{
    // Traditional server state (existing)
    [State]
    private int count = 0;

    // Hook-synced state (new)
    [HookState("count")]
    private int count = 0;
    // ^ Automatically updated when client calls setCount()

    // Client-computed state (existing)
    [ClientComputed]
    private double average = 0;

    // DOM state (new - from useDomElementState)
    [DomState("boxState")]
    private DomStateSnapshot boxState;

    protected override VNode Render()
    {
        return new VElement("div",
            new VElement("p", $"Count: {count}"),
            new VElement("button",
                new VAttribute("onClick", "Increment"),
                "Increment")
        );
    }

    private void Increment()
    {
        count++;
        SetState(nameof(count), count);
    }
}
```

### SignalR Hub Methods (New)

```csharp
// In MinimactHub.cs

public async Task UpdateComponentState(UpdateStateRequest request)
{
    var component = _registry.GetComponent(request.ComponentId);

    // 1. Update state on server
    component.SetStateFromClient(request.StateKey, request.Value);

    // 2. Trigger re-render
    component.TriggerRender();

    // 3. Send patches back to client
    var patches = component.GetLastPatches();
    await Clients.Client(Context.ConnectionId)
        .SendAsync("ApplyPatches", new {
            componentId = request.ComponentId,
            patches
        });
}

public async Task BatchUpdateComponentState(BatchUpdateRequest request)
{
    var component = _registry.GetComponent(request.ComponentId);

    // Update all states atomically
    foreach (var change in request.Changes)
    {
        component.SetStateFromClient(change.Key, change.Value);
    }

    // Single re-render for all changes
    component.TriggerRender();

    var patches = component.GetLastPatches();
    await Clients.Client(Context.ConnectionId)
        .SendAsync("ApplyPatches", new {
            componentId = request.ComponentId,
            patches
        });
}
```

---

## Conflict Resolution Strategies

### Strategy 1: Server Wins (Default, Safest)

```typescript
// Client makes optimistic update
setCount(5);  // Applied locally immediately

// Server processes and decides count should be 3
// Server sends correction patches

// Client applies correction
domPatcher.applyPatches(correctionPatches);
// ^ Count becomes 3 (server's value)
```

**Use when:** Financial data, inventory, multi-user state

---

### Strategy 2: Client Wins (Rare)

```typescript
// Client makes change
setDraft('my text');

// Server tries to override with old draft
// Client rejects server's patches for this field

// Client re-syncs to confirm
syncToServer(draft);
```

**Use when:** User's draft content, user preferences

---

### Strategy 3: Merge (Complex)

```typescript
// Client has: { items: [1, 2] }
// Server has: { items: [1, 3] }

// Merge strategy: Union
// Result: { items: [1, 2, 3] }

// Or CRDT-based merge (Automerge, Yjs)
```

**Use when:** Collaborative editing, real-time multi-user

---

## Migration Path

### Phase 1: Document Current (✅ Already done)
- CLIENT_SERVER_SYNC_ANALYSIS.md explains current patterns

### Phase 2: Add Basic Sync to Hooks (Immediate)

**Changes needed:**
```typescript
// In hooks.ts - useState
const setState = (newValue: T) => {
  // ... existing hint queue logic ...

  // ADD THIS:
  // Check if this state should sync to server
  const shouldSync = context.stateSyncConfig?.get(stateKey);

  if (shouldSync) {
    context.signalR.invoke('UpdateComponentState', {
      componentId: context.componentId,
      stateKey,
      value: newValue
    }).catch(err => {
      console.error('[Minimact] State sync failed:', err);
    });
  }
};
```

### Phase 3: Add New Hook APIs (Next)

Create new hooks:
- `useServerState()` - Wraps `useState` with auto-sync
- `useClientState()` - Pure client state (rename existing)
- `useOptimisticState()` - With sync strategies

### Phase 4: Server-Side Support (After client works)

Add C# attributes and hub methods:
- `[HookState]` attribute
- `UpdateComponentState` hub method
- `SetStateFromClient()` method

### Phase 5: Advanced Features (Future)

- Batch sync
- Conflict resolution
- Offline support
- CRDT integration

---

## Examples

### Example 1: Counter (Server State)

```tsx
// Client
import { useServerState } from 'minimact';

export function Counter() {
  const [count, setCount] = useServerState(0, 'count');

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount(count - 1)}>-</button>
    </div>
  );
}
```

```csharp
// Server
public class Counter : MinimactComponent
{
    [HookState("count")]
    private int count = 0;

    protected override VNode Render()
    {
        return new VElement("div",
            new VElement("p", $"Count: {count}"),
            new VElement("button", "+"),
            new VElement("button", "-")
        );
    }
}
```

**Flow:**
1. User clicks + button
2. Client: `setCount(1)` → checks hint queue → applies cached patch instantly
3. Client: Sends `UpdateComponentState('count', 1)` to server
4. Server: Updates `count = 1`, calls `Render()`, computes patches
5. Server: Sends patches back to client (usually matches prediction, no visual change)

---

### Example 2: Dropdown (Client State)

```tsx
import { useClientState } from 'minimact';

export function Dropdown() {
  const [isOpen, setIsOpen] = useClientState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>
        Toggle Menu
      </button>
      {isOpen && (
        <ul>
          <li>Option 1</li>
          <li>Option 2</li>
        </ul>
      )}
    </div>
  );
}
```

**Flow:**
1. User clicks button
2. Client: `setIsOpen(true)` → updates DOM immediately
3. **No server communication** (pure client state)

---

### Example 3: Auto-Save Draft (Optimistic State)

```tsx
import { useOptimisticState } from 'minimact';

export function Editor() {
  const [draft, saveDraft, { isSyncing }] = useOptimisticState('', {
    syncKey: 'draftContent',
    debounceMs: 500
  });

  return (
    <div>
      <textarea
        value={draft}
        onChange={e => saveDraft(e.target.value)}
      />
      {isSyncing && <span>Saving...</span>}
    </div>
  );
}
```

**Flow:**
1. User types → `saveDraft('hello')` called on every keystroke
2. Client: Updates local state instantly (no lag)
3. Client: Debounces sync for 500ms
4. After 500ms: Sends to server once
5. Server: Persists to database, sends confirmation

---

### Example 4: Shopping Cart (Hybrid State)

```tsx
import { useHybridState } from 'minimact';

export function Cart() {
  const [items, setItems, syncCart] = useHybridState([], {
    syncKey: 'cartItems',
    syncStrategy: 'manual'
  });

  return (
    <div>
      <button onClick={() => setItems([...items, newItem])}>
        Add to Cart
      </button>
      <button onClick={syncCart}>
        Checkout
      </button>
    </div>
  );
}
```

**Flow:**
1. User adds items → Updates instantly (local only)
2. User clicks checkout → `syncCart()` called
3. Server: Validates inventory, pricing
4. Server: Either confirms or corrects (out of stock, price changed)

---

## Performance Characteristics

| Mechanism | Latency | Network | Server Load | Use Case |
|-----------|---------|---------|-------------|----------|
| **Event-driven** | ~45ms | 1 round-trip | Medium | Forms, CRUD |
| **State-change (cached)** | ~1ms | 1 async call | Medium | Interactive UI |
| **State-change (uncached)** | ~45ms | 1 round-trip | Medium | Rare updates |
| **Client-only** | ~1ms | None | None | UI toggles |
| **Batch sync** | ~45ms | 1 round-trip | Low | Multi-field forms |
| **Optimistic** | ~1ms + async | 1 async call | Medium | Auto-save, drafts |

---

## Testing Strategy

### Unit Tests

```typescript
describe('useServerState', () => {
  it('syncs to server on setState', async () => {
    const { result } = renderHook(() => useServerState(0, 'count'));
    const [count, setCount] = result.current;

    setCount(1);

    // Verify SignalR call made
    expect(mockSignalR.invoke).toHaveBeenCalledWith('UpdateComponentState', {
      componentId: 'test-1',
      stateKey: 'count',
      value: 1
    });
  });

  it('applies cached patches instantly', async () => {
    mockHintQueue.matchHint.mockReturnValue({
      patches: [/* ... */],
      confidence: 0.95
    });

    const { result } = renderHook(() => useServerState(0, 'count'));
    const [count, setCount] = result.current;

    setCount(1);

    // Verify patches applied synchronously
    expect(mockDOMPatcher.applyPatches).toHaveBeenCalled();
  });
});
```

### Integration Tests

```csharp
[Test]
public async Task StateSync_UpdatesServerAndReturnsPatches()
{
    var component = new Counter();
    var hub = new MinimactHub(/* ... */);

    // Client updates state
    await hub.UpdateComponentState(new UpdateStateRequest {
        ComponentId = "counter-1",
        StateKey = "count",
        Value = 5
    });

    // Verify server state updated
    Assert.AreEqual(5, component.GetState("count"));

    // Verify patches computed and sent
    Assert.IsNotEmpty(component.GetLastPatches());
}
```

---

## Security Considerations

### 1. Validate State Changes

```csharp
public void SetStateFromClient(string key, object value)
{
    // Validate the state key is allowed to be set by client
    if (!IsClientSettableState(key))
    {
        throw new UnauthorizedAccessException($"State '{key}' cannot be set by client");
    }

    // Validate the value
    if (!ValidateStateValue(key, value))
    {
        throw new ArgumentException($"Invalid value for state '{key}'");
    }

    // Set state
    _state[key] = value;
}
```

### 2. Rate Limiting

```csharp
[RateLimit(requests: 100, perSeconds: 60)]
public async Task UpdateComponentState(UpdateStateRequest request)
{
    // Process update
}
```

### 3. State Permissions

```csharp
[HookState("count", ClientSettable = true, Validation = "PositiveInteger")]
private int count = 0;

[HookState("balance", ClientSettable = false)]  // Server-only
private decimal balance = 0;
```

---

## Conclusion

**The Elegant Minimal Strategy:**

1. **Three-tier model** (Server / Client / Hybrid)
2. **Clear APIs** (`useServerState`, `useClientState`, `useOptimisticState`)
3. **Predictive caching** (hint queue for instant feedback)
4. **Self-correcting** (server is always source of truth)
5. **Progressive** (works with existing event-driven pattern)

**Key Insight:** Don't try to be too clever. Give developers explicit control over sync vs no-sync. The cactus doesn't guess when to store water—it stores when it rains. Minimact shouldn't guess when to sync—it syncs when you call `useServerState`. 🌵

---

**Next Steps:**
1. ✅ Design complete
2. ⏳ Implement `useServerState()` hook
3. ⏳ Add `UpdateComponentState` SignalR method
4. ⏳ Update client-runtime with sync logic
5. ⏳ Write migration guide
6. ⏳ Add to MES standards

The desert is mapped. Time to build the irrigation system. 🌵💧
