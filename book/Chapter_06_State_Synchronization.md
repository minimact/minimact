# Chapter 6: State Synchronization - Keeping Client and Server in Sync

## The Stale Data Problem

Chapter 5 gave us magic: instant UI updates via template prediction. But it introduced a deadly bug.

Let me show you the problem:

```tsx
function Menu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Open Menu</button>
      {isOpen && (
        <nav>
          <a href="/home">Home</a>
          <a href="/about">About</a>
        </nav>
      )}
    </div>
  );
}
```

**User clicks "Open Menu":**

1. Client applies cached template patch (instant)
2. Menu appears on screen ✅
3. Client notifies server: "user clicked button"
4. Server handles event, calls `setIsOpen(true)`, re-renders
5. Server sends confirmation patches

Perfect, right?

**Wrong.**

Now imagine the user clicks something else—anything else—before the server confirms:

```tsx
function App() {
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Menu isOpen={isOpen} setIsOpen={setIsOpen} />
      <button onClick={() => setCount(count + 1)}>
        Increment: {count}
      </button>
    </div>
  );
}
```

**Timeline:**

```
T=0ms:   User clicks "Open Menu"
T=1ms:   Client predicts: isOpen = true, applies patches, menu appears
T=5ms:   User clicks "Increment" (menu is still visible!)
T=10ms:  Client sends "increment" to server
T=30ms:  Server receives "increment"
T=31ms:  Server state: { count: 0, isOpen: false }  ← STALE!
T=32ms:  Server increments count: { count: 1, isOpen: false }
T=33ms:  Server renders: {false && <nav>...} → No menu in VNode!
T=34ms:  Rust reconciler: Old VNode has menu, new doesn't → REMOVE MENU
T=50ms:  Client receives patches: [RemoveNode at menu path]
T=51ms:  Menu disappears from screen! 🔴
```

The user sees the menu vanish unexpectedly. They're confused. They click "Open Menu" again. Same bug. Repeat.

**Root cause:** The server never knew `isOpen` changed to `true`. The client updated local state but never synced it to the server.

This is the stale data problem, and it's catastrophic for a dehydrationist architecture.

## Why This Doesn't Happen in React

React doesn't have this problem because **all state lives on the client**. There's no server to get out of sync with.

```jsx
// React
const [isOpen, setIsOpen] = useState(false);

// Client updates state → Client re-renders → Done
// No server involved, no sync needed
```

Phoenix LiveView and Blazor Server don't have this problem either, but for a different reason: **every state change goes through the server**. No client-side prediction.

```elixir
# Phoenix LiveView
def handle_event("open_menu", _, socket) do
  # State update happens on server
  {:noreply, assign(socket, is_open: true)}
end

# Client waits for server response before updating UI
# 50-100ms latency, but state is always in sync
```

Minimact is different. We want:
- ✅ Client-side prediction (instant UI)
- ✅ Server-side state (source of truth)

To get both, we need **automatic state synchronization**.

## The Sync Strategy

The fix is simple in concept: whenever the client updates state locally, immediately sync it to the server.

```javascript
// Client-side useState
const setState = (newValue) => {
  // 1. Update local state (for predictions)
  context.state.set(stateKey, newValue);

  // 2. Apply template patches (instant UI)
  const hint = context.hintQueue.matchHint(componentId, { [stateKey]: newValue });
  if (hint) {
    context.domPatcher.applyPatches(element, hint.patches);
  }

  // 3. 🔥 SYNC TO SERVER (THE FIX!)
  context.signalR.updateComponentState(componentId, stateKey, newValue);
};
```

Now the timeline becomes:

```
T=0ms:   User clicks "Open Menu"
T=1ms:   Client: isOpen = true (local)
T=1ms:   Client: Apply patches (menu appears)
T=2ms:   Client: Sync to server (isOpen = true)
T=30ms:  Server receives: UpdateComponentState('menu-1', 'isOpen', true)
T=31ms:  Server: isOpen = true (synced!)
T=32ms:  Server re-renders: {true && <nav>...} → Menu in VNode ✅
T=50ms:  Client receives confirmation patches (no-op, prediction was correct)

// Later:
T=5000ms: User clicks "Increment"
T=5001ms: Client sends increment
T=5030ms: Server receives increment
T=5031ms: Server state: { count: 0, isOpen: true }  ← CORRECT!
T=5032ms: Server increments: { count: 1, isOpen: true }
T=5033ms: Server renders: {true && <nav>...} → Menu still in VNode ✅
T=5034ms: Rust reconciler: Both old and new have menu → No change
T=5050ms: Client receives patches: [UpdateText for count]
T=5051ms: Count updates, menu stays open ✅
```

Perfect. The menu stays open because the server knew about the state change.

## Implementing Client-Side Sync

Let's implement the `updateComponentState` method:

```javascript
// signalr-manager.js

export class SignalRManager {
  constructor(connection) {
    this.connection = connection;
  }

  /**
   * Sync component state to server
   * Called automatically by useState hook
   */
  async updateComponentState(componentId, stateKey, value) {
    try {
      await this.connection.invoke('UpdateComponentState', {
        componentId,
        stateKey,
        value
      });

      console.log(`[Minimact] Synced ${stateKey} = ${value}`);
    } catch (error) {
      console.error('[Minimact] Failed to sync state:', error);
      // TODO: Retry logic, offline queue
      throw error;
    }
  }
}
```

Update the useState hook to call it:

```javascript
// hooks.js

export function useState(initialValue) {
  if (!currentContext) {
    throw new Error('useState must be called within a component');
  }

  const context = currentContext;
  const index = stateIndex++;
  const stateKey = `state_${index}`;

  // Initialize state
  if (!context.state.has(stateKey)) {
    context.state.set(stateKey, initialValue);
  }

  const currentValue = context.state.get(stateKey);

  const setState = (newValue) => {
    const actualValue = typeof newValue === 'function'
      ? newValue(context.state.get(stateKey))
      : newValue;

    // 1. Update local state
    context.state.set(stateKey, actualValue);

    // 2. Apply template predictions
    const stateChanges = { [stateKey]: actualValue };
    const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

    if (hint) {
      context.domPatcher.applyPatches(context.element, hint.patches);
    }

    // 3. 🔥 SYNC TO SERVER
    context.signalR.updateComponentState(
      context.componentId,
      stateKey,
      actualValue
    ).catch(err => {
      console.error('[Minimact] State sync failed:', err);
    });
  };

  return [currentValue, setState];
}
```

Every `setState` call now automatically syncs to the server. No manual sync code needed in components.

## Implementing Server-Side Sync Handler

On the server, we need to handle the sync request:

```csharp
// MinimactHub.cs

public async Task UpdateComponentState(UpdateComponentStateRequest request)
{
    var component = _registry.GetComponent(request.ComponentId);

    if (component == null)
    {
        await Clients.Caller.SendAsync("Error", new {
            message = $"Component {request.ComponentId} not found"
        });
        return;
    }

    try
    {
        // 1. Update component state
        component.SetStateFromClient(request.StateKey, request.Value);

        // 2. Re-render with updated state
        component.TriggerRender();

        // Note: TriggerRender() internally:
        // - Calls Render()
        // - Reconciles old vs new VNode
        // - Sends patches to client
        // - Notifies predictor

        _logger.LogDebug(
            "Updated state: {ComponentId}.{StateKey} = {Value}",
            request.ComponentId,
            request.StateKey,
            request.Value
        );
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Failed to update component state");
        await Clients.Caller.SendAsync("Error", new {
            message = $"State update failed: {ex.Message}"
        });
    }
}

public class UpdateComponentStateRequest
{
    public string ComponentId { get; set; }
    public string StateKey { get; set; }
    public object Value { get; set; }
}
```

And the `SetStateFromClient` method in the component:

```csharp
// MinimactComponent.cs

public void SetStateFromClient(string key, object value)
{
    // Store previous value for diffing
    if (State.ContainsKey(key))
    {
        PreviousState[key] = State[key];
    }

    // Update state dictionary
    State[key] = value;

    // Sync back to [State] fields (if any)
    StateManager.SyncStateToMembers(this);

    // Note: We don't call TriggerRender() here
    // The hub method will do that after updating state
}
```

The `StateManager.SyncStateToMembers` method uses reflection to update any `[State]` fields:

```csharp
// StateManager.cs

public static void SyncStateToMembers(MinimactComponent component)
{
    var type = component.GetType();
    var fields = type.GetFields(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
        .Where(f => f.GetCustomAttribute<StateAttribute>() != null);

    foreach (var field in fields)
    {
        var stateKey = $"state_{field.Name}";

        if (component.State.TryGetValue(stateKey, out var value))
        {
            // Convert value to field type
            var convertedValue = Convert.ChangeType(value, field.FieldType);
            field.SetValue(component, convertedValue);
        }
    }
}
```

Now when the client syncs `isOpen = true`, the server's `[State] private bool isOpen` field gets updated immediately.

## Handling Race Conditions

State sync introduces race conditions. Consider:

```
T=0ms:   User clicks button A
T=1ms:   Client syncs: stateA = 1
T=50ms:  User clicks button B (before A's response arrives)
T=51ms:  Client syncs: stateB = 2
T=80ms:  Server receives: stateA = 1
T=81ms:  Server processes, re-renders, sends patches for A
T=85ms:  Server receives: stateB = 2
T=86ms:  Server processes, re-renders, sends patches for B
T=100ms: Client receives patches for A
T=105ms: Client receives patches for B
```

Both updates process correctly because each includes the full component state. No conflict.

But what about this:

```
T=0ms:   User clicks: setState(count + 1)  // count = 5
T=1ms:   Client: count = 6 (local)
T=2ms:   Client syncs to server
T=50ms:  User clicks again: setState(count + 1)  // count = 6
T=51ms:  Client: count = 7 (local)
T=52ms:  Client syncs to server
T=80ms:  Server receives: count = 6, renders, sends patches
T=100ms: Server receives: count = 7, renders, sends patches
T=120ms: Client receives patches for count = 6
T=125ms: Client receives patches for count = 7
```

This works fine. Each sync is absolute ("set count to 6", "set count to 7"), not relative ("increment count"). The second sync supersedes the first.

**Problem case:**

```
T=0ms:   Client: count = 5
T=1ms:   User clicks: setState(count + 1)
T=2ms:   Client: count = 6 (computed from local count = 5)
T=3ms:   Client syncs: count = 6
T=4ms:   Server SLOW, hasn't received sync yet
T=50ms:  Different client updates count = 10 (via different action)
T=51ms:  Server processes: count = 10
T=52ms:  Server sends patches to all clients
T=53ms:  Our client receives: count = 10, updates local state
T=54ms:  Our delayed sync arrives: count = 6
T=55ms:  Server processes: count = 6 (WRONG! Overwrites 10!)
```

This is a classic race condition: **stale write**.

**Solution: Version numbers (optimistic locking)**

```javascript
// Client tracks state version
let stateVersion = 0;

const setState = (newValue) => {
  stateVersion++;
  const thisVersion = stateVersion;

  // ... update local state ...

  // Sync with version
  context.signalR.updateComponentState(
    componentId,
    stateKey,
    actualValue,
    thisVersion  // Include version
  );
};
```

```csharp
// Server checks version
public async Task UpdateComponentState(UpdateComponentStateRequest request)
{
    var component = _registry.GetComponent(request.ComponentId);

    // Check if this update is stale
    if (request.Version < component.StateVersion)
    {
        _logger.LogWarning(
            "Rejecting stale state update: {ComponentId}.{StateKey} (version {Version} < {Current})",
            request.ComponentId,
            request.StateKey,
            request.Version,
            component.StateVersion
        );
        return;
    }

    // Update state version
    component.StateVersion = request.Version;

    // Proceed with update
    component.SetStateFromClient(request.StateKey, request.Value);
    component.TriggerRender();
}
```

Now stale writes are rejected. The server only accepts updates with newer versions.

## Batching Sync Requests

If the user rapidly clicks a button, we don't want to spam the server with sync requests:

```
User clicks 10 times in 100ms
→ 10 sync requests to server
→ 10 re-renders
→ 10 reconciliations
→ Waste of CPU/network
```

**Solution: Debounce sync requests**

```javascript
class SyncBatcher {
  constructor(signalR, debounceMs = 16) {
    this.signalR = signalR;
    this.debounceMs = debounceMs;
    this.pendingUpdates = new Map(); // componentId → { stateKey → value }
    this.timeouts = new Map(); // componentId → timeoutId
  }

  scheduleSync(componentId, stateKey, value) {
    // Store update
    if (!this.pendingUpdates.has(componentId)) {
      this.pendingUpdates.set(componentId, new Map());
    }
    this.pendingUpdates.get(componentId).set(stateKey, value);

    // Cancel previous timeout
    if (this.timeouts.has(componentId)) {
      clearTimeout(this.timeouts.get(componentId));
    }

    // Schedule new timeout
    const timeoutId = setTimeout(() => {
      this.flush(componentId);
    }, this.debounceMs);

    this.timeouts.set(componentId, timeoutId);
  }

  flush(componentId) {
    const updates = this.pendingUpdates.get(componentId);

    if (!updates || updates.size === 0) {
      return;
    }

    // Batch sync all pending updates
    const batch = Object.fromEntries(updates);

    this.signalR.updateComponentStateBatch(componentId, batch);

    // Clear pending
    this.pendingUpdates.delete(componentId);
    this.timeouts.delete(componentId);
  }
}
```

Usage:

```javascript
const batcher = new SyncBatcher(signalR, 16); // 16ms = 1 frame

const setState = (newValue) => {
  // ... update local state ...

  // Schedule batched sync
  batcher.scheduleSync(context.componentId, stateKey, actualValue);
};
```

Now 10 rapid clicks become 1 batched sync request after 16ms of inactivity.

**Server-side batch handler:**

```csharp
public async Task UpdateComponentStateBatch(UpdateComponentStateBatchRequest request)
{
    var component = _registry.GetComponent(request.ComponentId);

    if (component == null) return;

    // Update all state keys
    foreach (var kvp in request.Updates)
    {
        component.SetStateFromClient(kvp.Key, kvp.Value);
    }

    // Single re-render for all updates
    component.TriggerRender();

    _logger.LogDebug(
        "Batch updated {Count} state values for {ComponentId}",
        request.Updates.Count,
        request.ComponentId
    );
}
```

**Performance gain:**
- 10 rapid clicks: 10 renders → 1 render (10x reduction)
- Network: 10 requests → 1 request
- CPU: 10 reconciliations → 1 reconciliation

## Syncing DOM Element State

Remember `useDomElementState` from minimact-punch? It also needs sync:

```javascript
// minimact-punch/integration.js

export function useDomElementState(selector, options) {
  const context = getCurrentContext();
  const index = domElementStateIndex++;
  const stateKey = `domElementState_${index}`;

  if (!context.domElementStates) {
    context.domElementStates = new Map();
  }

  if (!context.domElementStates.has(stateKey)) {
    const domState = new DomElementState(selector, options);

    // Set up change callback
    domState.setOnChange((snapshot) => {
      // Apply template predictions
      const stateChanges = { [stateKey]: snapshot };
      const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

      if (hint) {
        context.domPatcher.applyPatches(context.element, hint.patches);
      }

      // 🔥 SYNC TO SERVER
      context.signalR.updateDomElementState(
        context.componentId,
        stateKey,
        snapshot
      ).catch(err => {
        console.error('[minimact-punch] DOM state sync failed:', err);
      });
    });

    context.domElementStates.set(stateKey, domState);
  }

  return context.domElementStates.get(stateKey);
}
```

Server-side handler:

```csharp
public async Task UpdateDomElementState(UpdateDomElementStateRequest request)
{
    var component = _registry.GetComponent(request.ComponentId);

    if (component == null) return;

    // Store DOM state snapshot
    component.SetDomStateFromClient(request.StateKey, request.Snapshot);

    // Re-render with updated DOM state
    component.TriggerRender();
}

public class UpdateDomElementStateRequest
{
    public string ComponentId { get; set; }
    public string StateKey { get; set; }
    public DomElementStateSnapshot Snapshot { get; set; }
}

public class DomElementStateSnapshot
{
    public bool IsIntersecting { get; set; }
    public double IntersectionRatio { get; set; }
    public int ChildrenCount { get; set; }
    public int GrandChildrenCount { get; set; }
    public Dictionary<string, string> Attributes { get; set; }
    public List<string> ClassList { get; set; }
    public bool Exists { get; set; }
    public int Count { get; set; }
}
```

Now when an element scrolls into view (IntersectionObserver fires), the server immediately knows about it and can render accordingly.

## Offline Handling

What if the user goes offline? Sync requests will fail.

```javascript
class OfflineQueue {
  constructor(signalR) {
    this.signalR = signalR;
    this.queue = [];
    this.isOnline = navigator.onLine;

    // Listen for online/offline events
    window.addEventListener('online', () => this.onOnline());
    window.addEventListener('offline', () => this.onOffline());
  }

  enqueue(syncRequest) {
    if (this.isOnline) {
      // Send immediately
      return this.signalR.updateComponentState(
        syncRequest.componentId,
        syncRequest.stateKey,
        syncRequest.value
      );
    } else {
      // Queue for later
      this.queue.push(syncRequest);
      console.log('[Minimact] Offline: queued state update');
    }
  }

  onOffline() {
    this.isOnline = false;
    console.log('[Minimact] Went offline');
  }

  async onOnline() {
    this.isOnline = true;
    console.log('[Minimact] Back online, flushing queue');

    // Flush queued updates
    for (const request of this.queue) {
      try {
        await this.signalR.updateComponentState(
          request.componentId,
          request.stateKey,
          request.value
        );
      } catch (error) {
        console.error('[Minimact] Failed to sync queued update:', error);
      }
    }

    this.queue = [];
  }
}
```

Now offline edits are queued and synced when connectivity returns.

## Measuring Sync Performance

Track sync performance to identify issues:

```javascript
class SyncMetrics {
  constructor() {
    this.totalSyncs = 0;
    this.successfulSyncs = 0;
    this.failedSyncs = 0;
    this.avgSyncDuration = 0;
  }

  recordSync(startTime, success) {
    this.totalSyncs++;

    if (success) {
      this.successfulSyncs++;
    } else {
      this.failedSyncs++;
    }

    const duration = performance.now() - startTime;
    this.avgSyncDuration = (this.avgSyncDuration * (this.totalSyncs - 1) + duration) / this.totalSyncs;
  }

  getStats() {
    return {
      total: this.totalSyncs,
      successful: this.successfulSyncs,
      failed: this.failedSyncs,
      successRate: (this.successfulSyncs / this.totalSyncs) * 100,
      avgDuration: this.avgSyncDuration
    };
  }
}

// Usage
const metrics = new SyncMetrics();

async function syncState(componentId, stateKey, value) {
  const start = performance.now();

  try {
    await signalR.updateComponentState(componentId, stateKey, value);
    metrics.recordSync(start, true);
  } catch (error) {
    metrics.recordSync(start, false);
    throw error;
  }
}

// Log stats every 10 seconds
setInterval(() => {
  console.log('[Minimact] Sync stats:', metrics.getStats());
}, 10000);
```

Output:
```
[Minimact] Sync stats: {
  total: 247,
  successful: 245,
  failed: 2,
  successRate: 99.19%,
  avgDuration: 8.3ms
}
```

## Real-World Example: Shopping Cart

Let's see sync in action with a shopping cart:

```tsx
export function ShoppingCart() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  function addItem(item) {
    const newItems = [...items, item];
    setItems(newItems);

    const newTotal = newItems.reduce((sum, i) => sum + i.price, 0);
    setTotal(newTotal);
  }

  return (
    <div>
      <h2>Cart ({items.length} items)</h2>
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.name} - ${item.price}</li>
        ))}
      </ul>
      <div>Total: ${total}</div>
    </div>
  );
}
```

**User clicks "Add to Cart":**

```
T=0ms:   User clicks "Add to Cart" button
T=1ms:   Client: addItem({ id: 123, name: 'Book', price: 15 })
T=2ms:   Client: setItems([{ id: 123, name: 'Book', price: 15 }])
T=3ms:   Client: Apply template → "Cart (1 items)" appears
T=4ms:   Client: Sync items to server
T=5ms:   Client: setTotal(15)
T=6ms:   Client: Apply template → "Total: $15" appears
T=7ms:   Client: Sync total to server
T=30ms:  Server receives items update
T=31ms:  Server: items = [{ ... }]
T=32ms:  Server re-renders, sends confirmation patches
T=35ms:  Server receives total update
T=36ms:  Server: total = 15
T=37ms:  Server re-renders, sends confirmation patches
T=50ms:  Client receives all confirmation patches (no-op)
```

User saw instant feedback (T=3ms and T=6ms). Server confirmed (T=50ms). Perfect sync.

**Now user clicks "Checkout":**

```tsx
async function checkout() {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ items, total })
  });

  if (response.ok) {
    setItems([]);
    setTotal(0);
  }
}
```

```
T=0ms:   User clicks "Checkout"
T=1ms:   Client sends POST to /api/checkout
T=50ms:  Server receives checkout request
T=51ms:  Server validates: items = [{ id: 123, ... }], total = 15 ✅
T=52ms:  Server processes payment
T=53ms:  Server responds: { success: true }
T=100ms: Client receives response
T=101ms: Client: setItems([])
T=102ms: Client: Apply template → Cart clears
T=103ms: Client: Sync items to server
T=104ms: Client: setTotal(0)
T=105ms: Client: Apply template → "Total: $0"
T=106ms: Client: Sync total to server
T=150ms: Server receives state updates, confirms
```

Crucially, at T=51ms, the server has the correct cart state because we synced it earlier. The checkout succeeds.

**Without sync:**

```
T=51ms:  Server validates: items = [], total = 0 ❌ STALE!
T=52ms:  Server responds: { error: 'Cart is empty' }
```

Checkout would fail. State sync is critical for correctness.

## The Complete Sync Flow

Let's visualize the entire system:

```
═══════════════════════════════════════════════════════════════
                    USER INTERACTION
═══════════════════════════════════════════════════════════════

User clicks button
    ↓
Client: Event handler fires
    ↓
Client: setState(newValue)
    ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Update Local State                                 │
│  context.state.set(stateKey, newValue)                      │
│  Duration: <0.1ms                                            │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Apply Template Prediction                          │
│  const hint = hintQueue.matchHint(componentId, stateChanges)│
│  if (hint) domPatcher.applyPatches(element, hint.patches)   │
│  Duration: 0-5ms                                             │
└─────────────────────────────────────────────────────────────┘
    ↓
USER SEES UPDATE ⚡ (instant!)
    ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Sync to Server (Async)                             │
│  signalR.updateComponentState(componentId, stateKey, value) │
│  Duration: ~5-10ms (network async)                           │
└─────────────────────────────────────────────────────────────┘
    ↓
Server receives UpdateComponentState
    ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Server Updates State                               │
│  component.SetStateFromClient(stateKey, value)              │
│  Duration: <0.1ms                                            │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Server Re-Renders                                  │
│  component.TriggerRender() → newVNode                       │
│  Duration: 2-10ms                                            │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: Rust Reconciliation                                │
│  patches = Reconcile(oldVNode, newVNode)                    │
│  Duration: 0.9ms                                             │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 7: Send Confirmation Patches                          │
│  signalR.send('ApplyPatches', patches)                      │
│  Duration: ~20-50ms (network)                                │
└─────────────────────────────────────────────────────────────┘
    ↓
Client receives patches
    ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 8: Apply Confirmation Patches                         │
│  domPatcher.applyPatches(element, patches)                  │
│  Duration: <1ms (usually no-op if prediction was correct)   │
└─────────────────────────────────────────────────────────────┘
    ↓
Done! State fully synced.

═══════════════════════════════════════════════════════════════
```

## Performance Characteristics

Let's measure the sync system:

**Metrics (typical):**
- Local state update: <0.1ms
- Template prediction: 0-5ms
- Sync request (async): ~5-10ms network
- Server state update: <0.1ms
- Server re-render: 2-10ms
- Rust reconciliation: 0.9ms
- Confirmation patches: ~20-50ms network
- Client apply patches: <1ms

**User-perceived latency:**
- UI updates: 0-5ms (instant!)
- Server confirmation: 25-80ms (imperceptible)

**Bandwidth:**
- Sync request: ~50-200 bytes (depending on value)
- Confirmation patches: ~100-500 bytes (depending on changes)
- Total: ~150-700 bytes per state change

**Sync success rate:**
- Typical: 99%+
- Failures usually due to: network issues, server errors, race conditions (handled by versioning)

## What We've Built

In this chapter, we built automatic state synchronization:

✅ **The problem** - Stale server data breaks dehydrationist architecture
✅ **The solution** - Auto-sync every setState call
✅ **Client-side** - SignalRManager.updateComponentState()
✅ **Server-side** - MinimactHub.UpdateComponentState(), SetStateFromClient()
✅ **Race conditions** - Version numbers for optimistic locking
✅ **Batching** - Debounce rapid updates (10x perf gain)
✅ **DOM state sync** - useDomElementState syncs to server
✅ **Offline handling** - Queue updates, flush on reconnect
✅ **Metrics** - Track sync performance and success rate
✅ **Real example** - Shopping cart with correct server validation

**Key insight:** State synchronization isn't optional in a dehydrationist architecture—it's foundational. Without it, the server has stale data and subsequent renders are incorrect.

**Performance:**
- User sees UI update: 0-5ms
- Server confirms: 25-80ms
- Bandwidth: ~150-700 bytes per change
- Success rate: 99%+

This completes the predictive rendering system. Client predicts instantly (templates), server confirms accurately (sync), and users get native-app responsiveness with server-side correctness.

---

*End of Chapter 6*

**Next Chapter Preview:**
*Chapter 7: Hot Reload - The 0.1ms Miracle*

We'll implement the fastest hot reload system ever built. You'll learn how template patches enable 0.1ms updates for text changes, how structural changes trigger instance replacement, and how the file watcher detects changes and triggers the right reload strategy. This is where developers fall in love with Minimact—edit code, see instant updates, never lose state. It's magic that actually works.
