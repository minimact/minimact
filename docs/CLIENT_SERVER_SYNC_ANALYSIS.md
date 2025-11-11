# Client-Server Synchronization Analysis

**Status:** Current Implementation Review
**Date:** 2025-01-XX
**Purpose:** Document existing patterns and identify options for elegant synchronization

---

## Current Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT SYNC FLOW                             │
└─────────────────────────────────────────────────────────────────┘

CLIENT (Browser)                        SERVER (ASP.NET Core)
─────────────────                       ─────────────────────

1. User clicks button
   │
   ▼
2. EventDelegation captures
   │
   ▼
3. SignalR.invoke("InvokeComponentMethod", ...)
   │
   │                                     ▼
   │                              4. MinimactHub receives
   │                                  └─> Reflection invokes method
   │                                  └─> Method updates [State] field
   │                                  │
   │                                  ▼
   │                              5. SetState() called
   │                                  └─> Updates State dict
   │                                  └─> Calls TriggerRender()
   │                                  │
   │                                  ▼
   │                              6. TriggerRender()
   │                                  └─> Calls Render()
   │                                  └─> Rust reconciliation
   │                                  └─> Computes patches
   │                                  │
   │                                  ▼ (optional)
   │                              7. Predictor predicts
   │                              │  └─> If confidence >= 0.7
   │                              │      sends ApplyPrediction
   │                              │
   │   ◄───────────────────────── SignalR.send("ApplyPrediction")
   │   (instant speculative update)
   │
   ▼
8. DOMPatcher applies patches
   (instant feedback!)
   │
   │                                  ▼
   │                              9. Actual render completes
   │                                  └─> Computes real patches
   │                                  │
   │                                  ▼
   │                              10. Compare prediction vs reality
   │                                   ├─> Match: ✅ (do nothing)
   │                                   └─> Mismatch: ❌ (send correction)
   │   ◄───────────────────────── SignalR.send("ApplyCorrection")
   │   (rare, only if prediction wrong)
   │
   ▼
11. Apply correction if needed
```

---

## Current Synchronization Patterns

### Pattern 1: Event-Driven State Updates (Primary)

**Flow:** `Client Event → Server Method → SetState → Render → Patches → Client`

**C# (Server):**
```csharp
public class Counter : MinimactComponent
{
    [State]
    private int count = 0;

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
        SetState(nameof(count), count);  // Triggers TriggerRender()
    }
}
```

**TypeScript (Client):**
```typescript
// Automatic - EventDelegation handles it
document.querySelector('[data-onclick="Increment"]').click();
  └─> SignalR.invoke('InvokeComponentMethod', 'counter-1', 'Increment', {})
    └─> Server: Increment() called
      └─> count++
        └─> SetState()
          └─> TriggerRender()
            └─> Patches computed
              └─> Client receives patches
                └─> DOMPatcher applies
```

**Characteristics:**
- ✅ Simple mental model
- ✅ Single source of truth (server)
- ✅ Automatic via reflection
- ❌ Network round-trip required (~45ms)
- ❌ No optimistic updates without prediction

---

### Pattern 2: Client-Computed State (Read-Only Sync)

**Flow:** `Client computes → Sends to server → Server re-renders → Patches`

**Used for:** External library computations (lodash, moment, chart.js)

**C# (Server):**
```csharp
public class DataDashboard : MinimactComponent
{
    [State]
    private List<int> numbers = new() { 1, 2, 3, 4, 5 };

    [ClientComputed]
    private double average = 0;  // Computed in browser

    protected override VNode Render()
    {
        return new VElement("div",
            new VElement("p", $"Average: {average}")  // Uses client-computed value
        );
    }
}
```

**TypeScript (Client):**
```typescript
import { registerClientComputed } from '@minimact/core';
import _ from 'lodash';

registerClientComputed('counter-1', 'average', (component) => {
  const numbers = component.getState('numbers');
  return _.mean(numbers);  // Uses lodash on client
});

// When numbers changes:
// 1. Client recomputes average using lodash
// 2. SignalR.invoke('UpdateClientComputedState', { average: 3.0 })
// 3. Server: component.ClientState['average'] = 3.0
// 4. Server calls TriggerRender()
// 5. Patches sent back to client
```

**Characteristics:**
- ✅ Leverages client-side libraries
- ✅ Avoids shipping libraries to server
- ✅ Read-only on server (safety)
- ❌ Still requires round-trip
- ❌ Two-step process (compute → sync → render)

---

### Pattern 3: Predictive Rendering (Optimistic)

**Flow:** `State change → Predict patches → Send immediately → Verify → Correct if wrong`

**C# (Server):**
```csharp
internal void TriggerRender()
{
    // 1. Check if we can predict
    if (GlobalPredictor != null && changedKeys.Length == 1)
    {
        var prediction = GlobalPredictor.Predict(stateChange, CurrentVNode);

        if (prediction != null && prediction.Confidence >= 0.7)
        {
            // 2. Send prediction IMMEDIATELY (don't wait for render)
            HubContext.Clients.Client(ConnectionId)
                .SendAsync("ApplyPrediction", new { patches, confidence });
        }
    }

    // 3. Render actual tree (in background)
    var newVNode = Render();
    var actualPatches = RustBridge.Reconcile(CurrentVNode, newVNode);

    // 4. Compare prediction vs reality
    if (!PatchesMatch(prediction.Patches, actualPatches))
    {
        // Send correction
        HubContext.Clients.Client(ConnectionId)
            .SendAsync("ApplyCorrection", new { patches = actualPatches });
    }
}
```

**TypeScript (Client):**
```typescript
signalR.on('ApplyPrediction', ({ componentId, patches, confidence }) => {
  // Apply immediately - instant feedback!
  domPatcher.applyPatches(element, patches);
  console.log(`🟢 Prediction applied (${confidence * 100}% confident)`);
});

signalR.on('ApplyCorrection', ({ componentId, patches }) => {
  // Rare - only if prediction was wrong
  domPatcher.applyPatches(element, patches);
  console.log(`🔴 Correction applied (prediction was incorrect)`);
});
```

**Characteristics:**
- ✅ Near-instant feedback (prediction applied immediately)
- ✅ Feels like client-side React
- ✅ Server verifies in background
- ✅ Self-correcting if wrong
- ❌ Only works for predictable state changes
- ❌ Requires trained prediction model
- ❌ Extra complexity

---

### Pattern 4: Hint Queue (Pre-cached Predictions)

**Flow:** `Server pre-computes → Client caches → User acts → Instant patch from cache`

**C# (Server):**
```csharp
// In PlaygroundService or similar
public void GeneratePredictions(Component component)
{
    // Pre-compute likely state changes
    var predictions = new List<Prediction>();

    // Example: Predict button click
    var predictedState = component.State.Clone();
    predictedState["count"] = (int)component.State["count"] + 1;

    var predictedHtml = component.RenderWithState(predictedState);
    var patches = Reconcile(currentHtml, predictedHtml);

    // Send to client for caching
    HubContext.Clients.Client(connectionId).SendAsync("QueueHint", new
    {
        componentId = component.ComponentId,
        hintId = "increment",
        patches = patches,
        confidence = 0.95,
        predictedState = new { count = predictedState["count"] }
    });
}
```

**TypeScript (Client):**
```typescript
// Client receives and caches
signalR.on('QueueHint', (data) => {
  hintQueue.queueHint(data);
  console.log(`📦 Cached prediction '${data.hintId}'`);
});

// Later, when state changes
const hint = hintQueue.matchHint(componentId, { count: 1 });
if (hint) {
  // 🟢 INSTANT! No network round-trip needed
  domPatcher.applyPatches(element, hint.patches);
  console.log(`🟢 CACHE HIT! Applied in 1ms`);
}
```

**Characteristics:**
- ✅ Zero network latency (patches already cached)
- ✅ Predictable patterns work great
- ✅ Multiple predictions can be cached
- ✅ Best UX - truly instant
- ❌ Requires predictable interaction patterns
- ❌ Cache management complexity
- ❌ Memory overhead for cached patches

---

## Communication Channels

### SignalR Hub Methods (Server → Client)

**Defined in:** `MinimactHub.cs`

| Method | Purpose | When Used |
|--------|---------|-----------|
| `RegisterComponent` | Associate component with connection | On component mount |
| `InvokeComponentMethod` | Call C# method from client | Button clicks, events |
| `UpdateClientState` | Sync single client state value | Legacy? |
| `UpdateClientComputedState` | Sync multiple computed values | After client computations |

### SignalR Events (Client → Server)

**Defined in:** `signalr-manager.ts`

| Event | Purpose | Triggered By |
|-------|---------|--------------|
| `UpdateComponent` | Full HTML replacement | Rare, fallback |
| `ApplyPatches` | Normal patch application | Most renders |
| `ApplyPrediction` | Speculative patch | Predictive rendering |
| `ApplyCorrection` | Fix wrong prediction | Prediction mismatch |
| `QueueHint` | Cache future patches | Hint queue system |
| `Error` | Server error message | Exceptions |

---

## State Management Types

### 1. Server State ([State] attribute)

**Location:** C# fields marked with `[State]`
**Source of truth:** Server
**Synchronization:** Automatic via SetState()
**Latency:** ~45ms (round-trip)

```csharp
[State]
private int count = 0;  // Server owns this
```

### 2. Client State (useClientState in client-runtime)

**Location:** Client-side only
**Source of truth:** Client
**Synchronization:** None (purely local)
**Latency:** ~1ms (local DOM update)

```typescript
const [username, setUsername] = useClientState('');  // Never sent to server
```

### 3. Client-Computed State ([ClientComputed] attribute)

**Location:** Computed on client, read on server
**Source of truth:** Client computation
**Synchronization:** Client → Server (one-way)
**Latency:** ~45ms (send to server, re-render)

```csharp
[ClientComputed]
private double average = 0;  // Computed by lodash on client
```

### 4. Hybrid State (Planned - useDomElementState)

**Location:** DOM observations on client, reactive on both
**Source of truth:** DOM itself
**Synchronization:** Bidirectional (DOM → Client → Server)
**Latency:** ~1ms (cached prediction) or ~45ms (cache miss)

```typescript
const box = useDomElementState();
{box.childrenCount > 3 && <CollapseButton />}
```

---

## Current Pain Points

### 1. **No Optimistic Updates (Without Prediction)**

```tsx
// Current: Must wait ~45ms for server
<button onClick={increment}>
  Count: {count}  {/* Updates after network round-trip */}
</button>

// Desired: Instant feedback
<button onClick={increment}>
  Count: {count}  {/* Updates immediately */}
</button>
```

**Options:**
- A) Use prediction (requires training)
- B) Add optimistic update layer
- C) Hybrid: client-side state for UI, sync to server in background

### 2. **Client-Computed Requires Round-Trip**

```csharp
[ClientComputed]
private double average = 0;

// Problem: Even though client computed it,
// we still need server round-trip to re-render
```

**Options:**
- A) Allow client-side rendering for client-computed values
- B) Pre-compute and cache server renders
- C) Hybrid rendering zones (client-computed values render client-side)

### 3. **State Classification Is Manual**

```csharp
// Developer must decide:
[State]           // Server state
[ClientComputed]  // Client-computed

// What about:
[ClientState]?    // Pure client state?
[Hybrid]?         // Both client and server?
```

**Options:**
- A) Add more attributes
- B) Convention-based (naming patterns)
- C) Analyzer suggests classification

### 4. **No Built-in Conflict Resolution**

```
Client: count = 5 (local)
Server: count = 3 (authoritative)
   ↓
Client applies patch: count = 3
(Client's optimistic update discarded)
```

**Options:**
- A) Last-write-wins (current)
- B) Merge strategies
- C) Conflict detection + user resolution
- D) Operational transforms (CRDTs)

### 5. **SignalR Is Single Channel**

Currently all communication goes through one hub.

**Options:**
- A) Keep single hub (simple)
- B) Multiple hubs (state, events, predictions)
- C) Custom protocols (WebSockets, SSE)

---

## Design Options Analysis

### Option A: Keep Current (Event-Driven)

**Pros:**
- ✅ Simple mental model
- ✅ Single source of truth
- ✅ No conflicts
- ✅ Already works

**Cons:**
- ❌ No instant feedback without prediction
- ❌ Requires prediction training
- ❌ Network latency always felt

**Best for:** Admin dashboards, data-heavy apps where consistency > speed

---

### Option B: Add Optimistic Layer

```typescript
// Client-side optimistic update
function increment() {
  // 1. Update local state immediately
  setCountOptimistic(count + 1);

  // 2. Send to server in background
  signalR.invoke('Increment').then((actualValue) => {
    // 3. Reconcile if different
    if (actualValue !== count + 1) {
      setCount(actualValue);
    }
  });
}
```

**Pros:**
- ✅ Instant feedback
- ✅ No prediction needed
- ✅ Self-correcting

**Cons:**
- ❌ More complex state management
- ❌ Potential for conflicts
- ❌ Rollback complexity

**Best for:** Social apps, collaborative tools, chat

---

### Option C: Hybrid Rendering Zones

```tsx
// Client zone - renders client-side
<div data-minimact-client-scope>
  <input value={username} onChange={e => setUsername(e.target.value)} />
  <p>Hello, {username}!</p>
</div>

// Server zone - renders server-side
<div data-minimact-server-scope>
  <button onClick={loadData}>Load</button>
  <p>Items: {itemCount}</p>
</div>
```

**Pros:**
- ✅ Best of both worlds
- ✅ Instant for client zones
- ✅ Consistent for server zones
- ✅ Clear boundaries

**Cons:**
- ❌ More complex architecture
- ❌ Need to partition correctly
- ❌ Potential sync issues at boundaries

**Best for:** Most apps (already partially implemented!)

---

### Option D: Full CRDT Sync

Use Conflict-free Replicated Data Types for automatic merge.

```typescript
// Y.js or Automerge integration
const doc = new Y.Doc();
const count = doc.getArray('count');

count.observe(() => {
  // Automatically syncs with server
  // No conflicts - CRDT guarantees convergence
});
```

**Pros:**
- ✅ No conflicts ever
- ✅ Works offline
- ✅ Automatic sync
- ✅ Collaborative editing ready

**Cons:**
- ❌ Very complex
- ❌ Large bundle size
- ❌ Overkill for most apps
- ❌ Learning curve

**Best for:** Collaborative editors, offline-first apps

---

### Option E: Smart State Classification

```typescript
// Automatic classification based on usage
const [count, setCount] = useState(0);  // Inferred as hybrid

if (usedInServerMethod()) {
  // Sync to server
} else {
  // Keep client-side only
}
```

**Pros:**
- ✅ Less manual work
- ✅ Optimal sync automatically
- ✅ Framework handles complexity

**Cons:**
- ❌ Magic can be confusing
- ❌ Hard to predict behavior
- ❌ Requires sophisticated analysis

**Best for:** Next-gen framework feature (v2.0)

---

## Recommendation Matrix

| App Type | Recommended Approach |
|----------|---------------------|
| **Admin Dashboard** | Current (Event-Driven) + Predictions |
| **E-commerce** | Hybrid Zones + Optimistic Cart |
| **Social Feed** | Optimistic Updates + Server Verification |
| **Collaborative Editor** | CRDT (Automerge/Y.js) |
| **Chat App** | Optimistic + WebSocket Stream |
| **Form-heavy** | Current + Client Validation Zones |
| **Data Visualization** | Client-Computed + Hybrid Zones |

---

## Next Steps

1. **Document current patterns** ✅ (this document)
2. **Identify elegant minimal approach** ⏳
3. **Prototype Option C (Hybrid Zones)** - Already partially implemented!
4. **Create sync patterns guide** ⏳
5. **Add to MES standards** ⏳

---

## Questions to Answer

1. **Should we expand hybrid rendering?**
   - Currently: Client scopes vs server scopes
   - Future: More granular control? Automatic detection?

2. **Should we add optimistic update helpers?**
   - Library or framework feature?
   - Opt-in or default?

3. **Should we expose more sync primitives?**
   - `useOptimistic()`?
   - `useServerState()` vs `useClientState()`?
   - `useSyncedState()`?

4. **Should we have sync strategies per component?**
   - `<Component syncStrategy="optimistic" />`?
   - Per-state-field configuration?

5. **Should we support offline mode?**
   - Queue mutations?
   - IndexedDB persistence?
   - Conflict resolution UI?

---

## Conclusion

**Current state:** Minimact has a solid foundation with event-driven sync, client-computed state, predictive rendering, and hint queue caching.

**Strengths:**
- Simple mental model
- Predictive rendering for common patterns
- Hybrid client/server zones (partially implemented)
- Single source of truth (server)

**Opportunities:**
- Expand hybrid rendering
- Add optimistic update patterns
- Better state classification
- Sync strategy documentation

**Philosophy:** Start simple, optimize incrementally. Don't over-engineer.

The cactus doesn't overthink hydration. It adapts. 🌵
