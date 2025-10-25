# 🌌 Minimact Quantum - Next Steps

**Status:** Core protocol complete ✅
**Ready for:** Production hardening & advanced features

---

## Current State

### ✅ What's Complete

**Client-Side:**
- ✅ EntanglementManager with `entangle()` API
- ✅ MutationVector serialization/deserialization
- ✅ MutationObserver integration
- ✅ Bidirectional mutation propagation
- ✅ SignalR communication layer
- ✅ Awareness events (quantum-mutation, quantum-awareness)

**Server-Side:**
- ✅ EntanglementRegistry (thread-safe)
- ✅ QuantumHub (SignalR hub)
- ✅ Target client resolution (wildcards, teams, broadcast)
- ✅ Entanglement lifecycle management
- ✅ Statistics/monitoring

**Documentation:**
- ✅ API documentation
- ✅ Examples (slider, toggle, form)
- ✅ Performance characteristics
- ✅ Architecture overview

---

## Phase 1: Production Readiness (Essential)

### 1.1 Connection Management

**Problem:** Currently no mapping between SignalR `ConnectionId` and `ClientId`

**Solution:** Implement `ConnectionManager` service

```csharp
// Minimact.AspNetCore/Quantum/ConnectionManager.cs

public class ConnectionManager
{
    private readonly ConcurrentDictionary<string, string> _clientToConnection = new();
    private readonly ConcurrentDictionary<string, string> _connectionToClient = new();

    public void RegisterConnection(string clientId, string connectionId)
    {
        _clientToConnection[clientId] = connectionId;
        _connectionToClient[connectionId] = clientId;
    }

    public string? GetConnectionId(string clientId)
    {
        return _clientToConnection.TryGetValue(clientId, out var connectionId)
            ? connectionId
            : null;
    }

    public string? GetClientId(string connectionId)
    {
        return _connectionToClient.TryGetValue(connectionId, out var clientId)
            ? clientId
            : null;
    }

    public void RemoveConnection(string connectionId)
    {
        if (_connectionToClient.TryRemove(connectionId, out var clientId))
        {
            _clientToConnection.TryRemove(clientId, out _);
        }
    }
}
```

**Integration:**
```csharp
// In QuantumHub.cs
private readonly ConnectionManager _connections;

public override async Task OnConnectedAsync()
{
    // Client needs to send their ID on connect
    await base.OnConnectedAsync();
}

public async Task RegisterClient(string clientId, string currentPage)
{
    _connections.RegisterConnection(clientId, Context.ConnectionId);
    _registry.RegisterClient(clientId, currentPage);
    await Clients.Caller.SendAsync("ClientRegistered", clientId);
}

public override async Task OnDisconnectedAsync(Exception? exception)
{
    var clientId = _connections.GetClientId(Context.ConnectionId);
    if (clientId != null)
    {
        _registry.UnregisterClient(clientId);
        _connections.RemoveConnection(Context.ConnectionId);
    }
    await base.OnDisconnectedAsync(exception);
}
```

**Estimated Time:** 2-3 hours
**Priority:** 🔴 Critical

---

### 1.2 Conflict Resolution (Operational Transform)

**Problem:** Concurrent mutations from multiple clients can conflict

**Example:**
```
T0: Text = "hello"
T1: User A inserts "x" at position 2 → "hexllo"
T1: User B inserts "y" at position 3 → "hellylo"

Without OT: Final state is non-deterministic
With OT: Final state is "hexyllo" (both edits preserved)
```

**Solution:** Implement basic Operational Transform

```typescript
// minimact-quantum/src/operational-transform.ts

export interface Operation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  value?: string;
  length?: number;
}

/**
 * Transform operation A against operation B
 * Returns transformed version of A that can be applied after B
 */
export function transform(opA: Operation, opB: Operation): Operation {
  // Insert vs Insert
  if (opA.type === 'insert' && opB.type === 'insert') {
    if (opB.position <= opA.position) {
      // B happened before A's position, shift A right
      return { ...opA, position: opA.position + (opB.value?.length || 0) };
    }
    return opA;
  }

  // Insert vs Delete
  if (opA.type === 'insert' && opB.type === 'delete') {
    if (opB.position <= opA.position) {
      // B deleted before A's position, shift A left
      return { ...opA, position: opA.position - (opB.length || 0) };
    }
    return opA;
  }

  // Delete vs Insert
  if (opA.type === 'delete' && opB.type === 'insert') {
    if (opB.position <= opA.position) {
      // B inserted before A's position, shift A right
      return { ...opA, position: opA.position + (opB.value?.length || 0) };
    }
    return opA;
  }

  // Delete vs Delete
  if (opA.type === 'delete' && opB.type === 'delete') {
    // Complex case - need to handle overlaps
    // Simplified: if B deleted before A, shift A left
    if (opB.position < opA.position) {
      return { ...opA, position: opA.position - (opB.length || 0) };
    }
    return opA;
  }

  return opA;
}
```

**Integration:**
```typescript
// In EntanglementManager
private pendingOperations: Map<string, Operation[]> = new Map();

private async applyWithOT(vector: MutationVector): Promise<void> {
  // Convert vector to operation
  const op = vectorToOperation(vector);

  // Transform against pending operations
  const pending = this.pendingOperations.get(vector.target) || [];
  let transformedOp = op;

  for (const pendingOp of pending) {
    transformedOp = transform(transformedOp, pendingOp);
  }

  // Apply transformed operation
  applyOperation(transformedOp);

  // Clear pending
  this.pendingOperations.delete(vector.target);
}
```

**Estimated Time:** 6-8 hours (for basic implementation)
**Priority:** 🟡 High (needed for multi-user text editing)

---

### 1.3 Reconnection & State Sync

**Problem:** When client disconnects and reconnects, they lose entanglements

**Solution:** Persist entanglement state and resume on reconnect

```typescript
// Client-side: Store entanglements in localStorage
class EntanglementManager {
  private persistEntanglements(): void {
    const bindings = Array.from(this.bindings.values()).map(b => ({
      entanglementId: b.entanglementId,
      selector: b.selector,
      mode: b.mode,
      targetClient: b.targetClient
    }));

    localStorage.setItem('quantum-entanglements', JSON.stringify(bindings));
  }

  async reconnect(): Promise<void> {
    const stored = localStorage.getItem('quantum-entanglements');
    if (!stored) return;

    const bindings = JSON.parse(stored);

    for (const binding of bindings) {
      const element = document.querySelector(binding.selector);
      if (element) {
        await this.entangle(element, {
          clientId: binding.targetClient,
          selector: binding.selector
        }, binding.mode);
      }
    }
  }
}
```

**Server-side:** Track session-based entanglements

```csharp
// Add sessionId to EntanglementBinding
public class EntanglementBinding
{
    public string? SessionId { get; set; } // New field
}

// On reconnect, restore entanglements by session
public async Task RestoreSession(string sessionId)
{
    var bindings = _registry.GetBindingsBySession(sessionId);
    foreach (var binding in bindings)
    {
        binding.Active = true; // Reactivate
    }
}
```

**Estimated Time:** 4-5 hours
**Priority:** 🟡 High

---

### 1.4 Error Handling & Retry Logic

**Problem:** Network failures, server restarts, client crashes

**Solution:** Implement retry queue with exponential backoff

```typescript
// minimact-quantum/src/retry-queue.ts

interface QueuedMutation {
  vector: MutationVector;
  entanglementId: string;
  attempts: number;
  maxAttempts: number;
  lastAttempt: number;
}

export class RetryQueue {
  private queue: QueuedMutation[] = [];
  private retryInterval: number = 1000; // Start at 1s

  async enqueue(entanglementId: string, vector: MutationVector): Promise<void> {
    this.queue.push({
      vector,
      entanglementId,
      attempts: 0,
      maxAttempts: 5,
      lastAttempt: Date.now()
    });

    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    for (const item of this.queue) {
      if (item.attempts >= item.maxAttempts) {
        // Give up, log error
        console.error('[minimact-quantum] Max retries exceeded:', item);
        this.queue = this.queue.filter(i => i !== item);
        continue;
      }

      const backoff = Math.pow(2, item.attempts) * this.retryInterval;
      if (Date.now() - item.lastAttempt < backoff) {
        continue; // Not ready to retry yet
      }

      try {
        await this.signalR.invoke('PropagateQuantumMutation', {
          entanglementId: item.entanglementId,
          sourceClient: this.clientId,
          vector: item.vector
        });

        // Success - remove from queue
        this.queue = this.queue.filter(i => i !== item);
      } catch (error) {
        // Failed - increment attempts
        item.attempts++;
        item.lastAttempt = Date.now();
      }
    }
  }
}
```

**Estimated Time:** 3-4 hours
**Priority:** 🟡 High

---

## Phase 2: Advanced Features

### 2.1 Selective Entanglement (Attribute/Property Filters)

**Use Case:** Only entangle specific attributes, not the entire element

```typescript
await quantum.entangle(slider, {
  clientId: 'user-b',
  selector: '#slider'
}, {
  mode: 'bidirectional',
  attributes: ['value'], // Only sync 'value' attribute
  ignoreAttributes: ['style'] // Don't sync style changes
});
```

**Estimated Time:** 4-5 hours
**Priority:** 🟢 Medium

---

### 2.2 Transformation Functions

**Use Case:** Inverse values, scale, offset

```typescript
// Slider A: 0-100
// Slider B: 100-0 (inverse)
await quantum.entangle(sliderA, {
  clientId: 'user-b',
  selector: '#slider-b'
}, {
  mode: 'bidirectional',
  transform: (value) => 100 - value, // Inverse transform
  inverseTransform: (value) => 100 - value
});
```

**Estimated Time:** 3-4 hours
**Priority:** 🟢 Medium

---

### 2.3 Ownership Tokens

**Use Case:** Transfer control between users

```typescript
class OwnershipToken {
  async transfer(fromClient: string, toClient: string): Promise<void> {
    await this.signalR.invoke('TransferOwnership', {
      entanglementId: this.entanglementId,
      fromClient,
      toClient
    });
  }
}

// Server validates and updates ownership
public async Task TransferOwnership(TransferOwnershipRequest request)
{
    var binding = _registry.GetBinding(request.EntanglementId);

    // Check current owner
    if (binding.SourceClient != request.FromClient) {
        throw new UnauthorizedAccessException("Not current owner");
    }

    // Update ownership
    binding.SourceClient = request.ToClient;

    // Notify both clients
    await Clients.Clients(new[] { request.FromClient, request.ToClient })
        .SendAsync("OwnershipTransferred", binding);
}
```

**Estimated Time:** 5-6 hours
**Priority:** 🟢 Medium

---

### 2.4 Entanglement Mesh (N-to-N)

**Use Case:** Multiple users all entangled with each other

```typescript
await quantum.createMesh(
  [slider1, slider2, slider3],
  ['user-a', 'user-b', 'user-c']
);

// All sliders entangled with all users
// Any change propagates to everyone
```

**Estimated Time:** 4-5 hours
**Priority:** 🟢 Medium

---

### 2.5 Causal Consistency (Lamport Timestamps)

**Use Case:** Ensure correct ordering of mutations

```typescript
interface MutationVector {
  // ...
  causalVector: number[]; // [clientA: 3, clientB: 1, clientC: 5]
}

// Before applying mutation, check causal dependencies
function canApply(vector: MutationVector, localClock: number[]): boolean {
  // Can only apply if:
  // 1. vector.causalVector[sender] == localClock[sender] + 1
  // 2. vector.causalVector[i] <= localClock[i] for all other i
  return checkCausalDependencies(vector.causalVector, localClock);
}
```

**Estimated Time:** 6-8 hours
**Priority:** 🟡 High (for correctness in high-concurrency scenarios)

---

### 2.6 Cross-Page Entanglement (Session Persistence)

**Use Case:** Element follows user across page navigation

```typescript
// Page 1: /cart
const cartItems = document.querySelector('.cart-items');
await quantum.entangle(cartItems, {
  clientId: 'self', // Same user, different page
  selector: '.cart-items',
  sessionId: currentSession
}, 'mirror');

// Navigate to Page 2: /checkout
// Cart items teleport to checkout page
// State preserved across navigation
```

**Estimated Time:** 8-10 hours
**Priority:** 🟢 Medium

---

## Phase 3: Performance & Scalability

### 3.1 Mutation Batching

**Problem:** Too many small mutations flood the network

**Solution:** Batch mutations over time window

```typescript
class MutationBatcher {
  private batch: MutationVector[] = [];
  private batchTimeout: number = 50; // ms
  private batchTimer: any = null;

  add(vector: MutationVector): void {
    this.batch.push(vector);

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flush(), this.batchTimeout);
    }
  }

  private async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    // Merge consecutive mutations on same target
    const merged = mergeMutations(this.batch);

    // Send batch
    await this.signalR.invoke('PropagateQuantumMutationBatch', {
      entanglementId: this.entanglementId,
      vectors: merged
    });

    this.batch = [];
    this.batchTimer = null;
  }
}
```

**Estimated Time:** 4-5 hours
**Priority:** 🟡 High (for performance)

---

### 3.2 Server-Side Event Sourcing

**Problem:** Lost mutations during server restart

**Solution:** Persist mutations to event log

```csharp
public class MutationEventStore
{
    public void Append(MutationEvent evt)
    {
        // Append to log (SQL, Redis, EventStore, etc.)
        _db.MutationEvents.Add(evt);
    }

    public List<MutationEvent> GetEventsSince(string entanglementId, long timestamp)
    {
        return _db.MutationEvents
            .Where(e => e.EntanglementId == entanglementId)
            .Where(e => e.Timestamp > timestamp)
            .OrderBy(e => e.Timestamp)
            .ToList();
    }
}
```

**Estimated Time:** 6-8 hours
**Priority:** 🟢 Medium

---

### 3.3 Rate Limiting

**Problem:** Malicious clients spamming mutations

**Solution:** Rate limit per client

```csharp
public class RateLimiter
{
    private readonly ConcurrentDictionary<string, RateLimitState> _states = new();

    public bool IsAllowed(string clientId, int maxPerSecond = 100)
    {
        var state = _states.GetOrAdd(clientId, _ => new RateLimitState());

        var now = DateTime.UtcNow;
        if ((now - state.WindowStart).TotalSeconds >= 1)
        {
            // New window
            state.WindowStart = now;
            state.Count = 0;
        }

        state.Count++;
        return state.Count <= maxPerSecond;
    }
}

class RateLimitState
{
    public DateTime WindowStart { get; set; } = DateTime.UtcNow;
    public int Count { get; set; } = 0;
}
```

**Estimated Time:** 2-3 hours
**Priority:** 🟡 High (for production)

---

## Phase 4: Developer Experience

### 4.1 React Hook Integration

```typescript
// minimact-quantum/react/use-quantum.ts

export function useQuantum<T extends Element = HTMLDivElement>(
  targetClient: string,
  mode: 'mirror' | 'bidirectional' = 'bidirectional'
) {
  const ref = useRef<T>(null);
  const [quantum] = useState(() => createQuantumManager({
    clientId: getCurrentClientId(),
    signalR: getSignalRManager()
  }));

  useEffect(() => {
    if (!ref.current) return;

    const link = quantum.entangle(ref.current, {
      clientId: targetClient,
      selector: getElementSelector(ref.current)
    }, mode);

    return () => link.then(l => l.disentangle());
  }, [targetClient, mode]);

  return ref;
}

// Usage
function CollaborativeSlider() {
  const sliderRef = useQuantum('user-b', 'bidirectional');

  return <input ref={sliderRef} type="range" />;
}
```

**Estimated Time:** 3-4 hours
**Priority:** 🟢 Medium

---

### 4.2 DevTools Extension

**Features:**
- Visualize active entanglements
- Monitor mutation flow
- Debug conflicts
- Inspect causal vectors

**Estimated Time:** 12-15 hours
**Priority:** 🟢 Low (nice to have)

---

### 4.3 Testing Utilities

```typescript
// minimact-quantum/testing/mock-quantum.ts

export class MockQuantumManager {
  private mutations: MutationVector[] = [];

  async entangle(element: Element, remote: any, mode: any): Promise<QuantumLink> {
    // Record entanglement for testing
    return createMockLink();
  }

  getRecordedMutations(): MutationVector[] {
    return this.mutations;
  }

  simulateRemoteMutation(vector: MutationVector): void {
    // Trigger mutation event for testing
    applyMutationVector(vector);
  }
}
```

**Estimated Time:** 4-5 hours
**Priority:** 🟡 High (for test coverage)

---

## Timeline Estimate

### Phase 1 (Production Readiness): 15-20 hours
- Connection management: 2-3h
- Conflict resolution: 6-8h
- Reconnection: 4-5h
- Error handling: 3-4h

### Phase 2 (Advanced Features): 25-30 hours
- Selective entanglement: 4-5h
- Transformations: 3-4h
- Ownership tokens: 5-6h
- Mesh topology: 4-5h
- Causal consistency: 6-8h

### Phase 3 (Performance): 12-16 hours
- Mutation batching: 4-5h
- Event sourcing: 6-8h
- Rate limiting: 2-3h

### Phase 4 (DX): 20-25 hours
- React hooks: 3-4h
- DevTools: 12-15h
- Testing utils: 4-5h

**Total: 72-91 hours** (~2-3 weeks of focused work)

---

## Success Criteria

### MVP (Phase 1)
- [ ] No connection drops during entanglement
- [ ] Basic conflict handling for text inputs
- [ ] Automatic reconnection with state restore
- [ ] Retry failed mutations up to 5 times

### Production Ready (Phase 1 + 2)
- [ ] 99.9% mutation delivery success rate
- [ ] < 20ms P99 latency for mutation propagation
- [ ] Handle 100+ concurrent entanglements per client
- [ ] Zero data loss during server restart

### Enterprise Ready (All Phases)
- [ ] Comprehensive test coverage (>80%)
- [ ] DevTools for debugging
- [ ] Full documentation
- [ ] Security audit passed

---

## Getting Started

**To implement Phase 1:**

1. Start with Connection Management (highest priority)
2. Add basic error handling
3. Implement reconnection logic
4. Add Operational Transform for text inputs

**To test:**

```typescript
// Create two browser windows
// Window A:
const quantum = createQuantumManager({ clientId: 'user-a', ... });
await quantum.entangle(slider, { clientId: 'user-b', selector: '#slider' }, 'bidirectional');

// Window B:
const quantum = createQuantumManager({ clientId: 'user-b', ... });
await quantum.entangle(slider, { clientId: 'user-a', selector: '#slider' }, 'bidirectional');

// Drag slider in Window A
// → Should update in Window B instantly
// → Drag slider in Window B
// → Should update in Window A instantly
```

---

🌌 **The quantum protocol is live. Now make it unbreakable.** 🌵✨
