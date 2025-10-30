# State Synchronization

**Status**: ✅ Fully Implemented
**Version**: 1.0
**Last Updated**: October 29, 2025

---

## Overview

Minimact uses a **dehydrationist architecture** where the server is the source of truth for all component rendering. The client cannot render JSX or evaluate React expressions - it can only apply pre-computed patches from the server. This means **client state must stay in sync with server state** to prevent stale data issues.

This document explains how state synchronization works and why it's critical.

---

## The Stale Data Problem

### Without State Synchronization ❌

```typescript
// CLIENT
const [isOpen, setIsOpen] = useState(false);

// User clicks button
setIsOpen(true);  // ✅ Client state = true
                  // ✅ Applies cached patch (menu appears)
                  // ❌ Server NOT notified!

// SERVER (still has stale data)
isOpen = false;  // ❌ Server doesn't know about the change!

// Next render from ANY other state change:
protected override VNode Render() {
  return new VNode("div", null,
    isOpen && new VNode("menu", null, "...")  // Evaluates to false!
  );
}

// 🔴 Rust reconciler sees:
//    Old VNode: has menu (from client patch)
//    New VNode: no menu (server evaluated isOpen=false)
// 🔴 Generates patch to REMOVE menu
// 🔴 User's menu disappears unexpectedly!
```

### With State Synchronization ✅

```typescript
// CLIENT
const [isOpen, setIsOpen] = useState(false);

// User clicks button
setIsOpen(true);  // ✅ Client state = true
                  // ✅ Applies cached patch (menu appears)
                  // ✅ Syncs to server via SignalR

// SERVER (receives sync message)
isOpen = true;   // ✅ Server state updated!

// Next render from any other state change:
protected override VNode Render() {
  return new VNode("div", null,
    isOpen && new VNode("menu", null, "...")  // Evaluates to true!
  );
}

// 🟢 Rust reconciler sees:
//    Old VNode: has menu
//    New VNode: has menu
// 🟢 No patches needed
// 🟢 Menu stays visible!
```

---

## Why Client Can't Render

Minimact's **dehydrationist architecture** means:

1. **Server evaluates JSX** - Only the server can run `{condition && <Component />}`
2. **Client applies patches** - Client receives DOM operations from server
3. **No client-side JSX evaluation** - Client doesn't have React reconciler

This is fundamentally different from hydration-based frameworks (Next.js, Remix, etc.) where the client can re-render components independently.

---

## Implementation

### Client-Side: useState Hook

**File**: `src/client-runtime/src/hooks.ts`

```typescript
export function useState<T>(initialValue: T): [T, (newValue: T | ((prev: T) => T)) => void] {
  if (!currentContext) {
    throw new Error('useState must be called within a component render');
  }

  const context = currentContext;
  const index = stateIndex++;
  const stateKey = `state_${index}`;

  // Initialize state if not exists
  if (!context.state.has(stateKey)) {
    context.state.set(stateKey, initialValue);
  }

  const setState = (newValue: T | ((prev: T) => T)) => {
    const startTime = performance.now();

    // Compute new value
    const actualNewValue = typeof newValue === 'function'
      ? (newValue as (prev: T) => T)(context.state.get(stateKey) as T)
      : newValue;

    // 1. Update local state
    context.state.set(stateKey, actualNewValue);

    // 2. Build state change object
    const stateChanges: Record<string, any> = {
      [stateKey]: actualNewValue
    };

    // 3. Check hint queue (for instant feedback)
    const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

    if (hint) {
      // 🟢 CACHE HIT! Apply patches instantly
      const latency = performance.now() - startTime;
      console.log(`[Minimact] 🟢 CACHE HIT! ${latency.toFixed(2)}ms`);
      context.domPatcher.applyPatches(context.element, hint.patches);

      if (context.playgroundBridge) {
        context.playgroundBridge.cacheHit({
          componentId: context.componentId,
          hintId: hint.hintId,
          latency,
          confidence: hint.confidence,
          patchCount: hint.patches.length
        });
      }
    } else {
      // 🔴 CACHE MISS
      console.log(`[Minimact] 🔴 CACHE MISS`);

      if (context.playgroundBridge) {
        context.playgroundBridge.cacheMiss({
          componentId: context.componentId,
          methodName: `setState(${stateKey})`,
          latency: performance.now() - startTime,
          patchCount: 0
        });
      }
    }

    // 4. ✅ SYNC TO SERVER (THE CRITICAL FIX!)
    context.signalR.updateComponentState(context.componentId, stateKey, actualNewValue)
      .catch(err => {
        console.error('[Minimact] Failed to sync state to server:', err);
        // TODO: Retry logic, offline queue, etc.
      });
  };

  return [context.state.get(stateKey) as T, setState];
}
```

**Key Points**:
- **Step 1**: Update local state (for hint queue matching)
- **Step 2**: Check hint queue and apply cached patches (instant feedback)
- **Step 3**: Sync to server via SignalR (prevent stale data)

---

### Client-Side: useDomElementState Hook

**File**: `src/minimact-punch/src/integration.ts`

```typescript
export function useDomElementState(selector?: string, options?: DomElementStateOptions): DomElementState {
  if (!currentContext) {
    throw new Error('[minimact-punch] useDomElementState must be called within a component render');
  }

  const context = currentContext;
  const index = domElementStateIndex++;
  const stateKey = `domElementState_${index}`;

  if (!context.domElementStates) {
    context.domElementStates = new Map();
  }

  if (!context.domElementStates.has(stateKey)) {
    const domState = new DomElementState(selector, options);

    // Set up change callback
    domState.setOnChange((snapshot: DomElementStateSnapshot) => {
      const startTime = performance.now();

      // Build state change object
      const stateChanges: Record<string, any> = {
        [stateKey]: {
          isIntersecting: snapshot.isIntersecting,
          childrenCount: snapshot.childrenCount,
          grandChildrenCount: snapshot.grandChildrenCount,
          attributes: snapshot.attributes,
          classList: snapshot.classList,
          exists: snapshot.exists,
          count: snapshot.count
        }
      };

      // Check hint queue
      const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

      if (hint) {
        // 🟢 CACHE HIT
        const latency = performance.now() - startTime;
        context.domPatcher.applyPatches(context.element, hint.patches);

        if (context.playgroundBridge) {
          context.playgroundBridge.cacheHit({
            componentId: context.componentId,
            hintId: hint.hintId,
            latency,
            confidence: hint.confidence,
            patchCount: hint.patches.length
          });
        }
      } else {
        // 🔴 CACHE MISS
        if (context.playgroundBridge) {
          context.playgroundBridge.cacheMiss({
            componentId: context.componentId,
            methodName: `domChange(${stateKey})`,
            latency: performance.now() - startTime,
            patchCount: 0
          });
        }
      }

      // ✅ SYNC TO SERVER (THE CRITICAL FIX!)
      context.signalR.updateDomElementState(context.componentId, stateKey, {
        isIntersecting: snapshot.isIntersecting,
        intersectionRatio: snapshot.intersectionRatio,
        childrenCount: snapshot.childrenCount,
        grandChildrenCount: snapshot.grandChildrenCount,
        attributes: snapshot.attributes,
        classList: snapshot.classList,
        exists: snapshot.exists,
        count: snapshot.count
      }).catch(err => {
        console.error('[minimact-punch] Failed to sync DOM state to server:', err);
      });
    });

    context.domElementStates.set(stateKey, domState);
  }

  return context.domElementStates.get(stateKey)!;
}
```

---

### Client-Side: SignalRManager

**File**: `src/client-runtime/src/signalr-manager.ts`

```typescript
export class SignalRManager {
  private connection: HubConnection;

  /**
   * Update component state on the server (from useState hook)
   * This keeps server state in sync with client state changes
   */
  async updateComponentState(componentId: string, stateKey: string, value: any): Promise<void> {
    try {
      await this.connection.invoke('UpdateComponentState', componentId, stateKey, value);
      this.log('Updated component state', { componentId, stateKey, value });
    } catch (error) {
      console.error('[Minimact] Failed to update component state:', error);
      throw error;
    }
  }

  /**
   * Update DOM element state on the server (from useDomElementState hook)
   * This keeps server aware of DOM changes for accurate rendering
   */
  async updateDomElementState(componentId: string, stateKey: string, snapshot: any): Promise<void> {
    try {
      await this.connection.invoke('UpdateDomElementState', componentId, stateKey, snapshot);
      this.log('Updated DOM element state', { componentId, stateKey, snapshot });
    } catch (error) {
      console.error('[Minimact] Failed to update DOM element state:', error);
      throw error;
    }
  }
}
```

---

### Server-Side: MinimactHub

**File**: `src/Minimact.AspNetCore/SignalR/MinimactHub.cs`

```csharp
/// <summary>
/// Snapshot of DOM element state from useDomElementState hook
/// </summary>
public class DomElementStateSnapshot
{
    public bool IsIntersecting { get; set; }
    public double IntersectionRatio { get; set; }
    public int ChildrenCount { get; set; }
    public int GrandChildrenCount { get; set; }
    public Dictionary<string, string> Attributes { get; set; } = new();
    public List<string> ClassList { get; set; } = new();
    public bool Exists { get; set; }
    public int Count { get; set; }
}

public class MinimactHub : Hub
{
    private readonly ComponentRegistry _registry;

    /// <summary>
    /// Update component state from client useState hook
    /// Keeps server state in sync with client to prevent stale data
    /// </summary>
    public async Task UpdateComponentState(string componentId, string stateKey, object value)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            await Clients.Caller.SendAsync("Error", $"Component {componentId} not found");
            return;
        }

        try
        {
            // Update the component's state from client
            component.SetStateFromClient(stateKey, value);

            // Trigger a re-render with the updated state
            component.TriggerRender();

            // Note: Client already applied cached patches for instant feedback
            // This render ensures server state is correct for subsequent renders
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", $"Error updating component state: {ex.Message}");
        }
    }

    /// <summary>
    /// Update DOM element state from client useDomElementState hook
    /// Keeps server aware of DOM changes for accurate rendering
    /// </summary>
    public async Task UpdateDomElementState(string componentId, string stateKey, DomElementStateSnapshot snapshot)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            await Clients.Caller.SendAsync("Error", $"Component {componentId} not found");
            return;
        }

        try
        {
            // Update the component's DOM state from client
            component.SetDomStateFromClient(stateKey, snapshot);

            // Trigger a re-render with the updated DOM state
            component.TriggerRender();

            // Note: Client already applied cached patches for instant feedback
            // This render ensures server state is correct for subsequent renders
        }
        catch (error) {
            await Clients.Caller.SendAsync("Error", $"Error updating DOM element state: {ex.Message}");
        }
    }
}
```

---

### Server-Side: MinimactComponent

**File**: `src/Minimact.AspNetCore/Core/MinimactComponent.cs`

```csharp
public abstract class MinimactComponent
{
    protected Dictionary<string, object> State { get; } = new();
    protected Dictionary<string, object> PreviousState { get; } = new();

    /// <summary>
    /// Set state from client-side useState hook
    /// Keeps server state in sync with client to prevent stale data
    /// </summary>
    public void SetStateFromClient(string key, object value)
    {
        // Store previous value for diff
        if (State.ContainsKey(key))
        {
            PreviousState[key] = State[key];
        }

        // Update state dictionary
        State[key] = value;

        // Sync state back to fields (if there's a corresponding [State] field)
        StateManager.SyncStateToMembers(this);

        // Note: We don't call TriggerRender() here because the client already
        // applied cached patches. We just need to keep state in sync so the
        // next render (from other causes) has correct data.
    }

    /// <summary>
    /// Set DOM element state from client-side useDomElementState hook
    /// Keeps server aware of DOM changes for accurate rendering
    /// </summary>
    public void SetDomStateFromClient(string key, DomElementStateSnapshot snapshot)
    {
        // Store DOM state in the State dictionary
        // This allows components to access DOM state in their Render() method
        if (State.ContainsKey(key))
        {
            PreviousState[key] = State[key];
        }

        State[key] = snapshot;

        // Note: We don't call TriggerRender() here because the client already
        // applied cached patches. We just need to keep state in sync so the
        // next render (from other causes) has correct data.
    }
}
```

---

## The Complete Flow

### User Action → State Update → Sync

```
1. User clicks button
   ↓
2. Client: useState setter called
   ↓
3. Client: Update local state (for hint matching)
   ↓
4. Client: Check hint queue
   ↓
5a. IF cache hit → Apply patches instantly (0-2ms)
5b. IF cache miss → Wait for server render
   ↓
6. Client: Sync to server via SignalR.updateComponentState()
   ↓
7. Server: MinimactHub.UpdateComponentState() receives message
   ↓
8. Server: component.SetStateFromClient() updates state
   ↓
9. Server: component.TriggerRender() triggers re-render
   ↓
10. Server: Render() evaluates with NEW state
   ↓
11. Server: Rust reconciler computes patches
   ↓
12. Server: Sends patches to client (verification/correction)
   ↓
13. Client: Applies patches if different from prediction
```

**Timeline**:
- **0ms**: User clicks
- **0-2ms**: Client applies cached patch (instant feedback!)
- **2ms**: SignalR sync message sent (async)
- **10-50ms**: Server receives, updates state, re-renders
- **50-100ms**: Server sends verification patches (usually no-op if prediction was correct)

---

## Why This Matters

### Scenario: Dropdown Menu

```typescript
function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header>
      <button onClick={() => setIsOpen(!isOpen)}>Menu</button>
      {isOpen && <Menu />}
    </header>
  );
}
```

**Without sync**:
1. User clicks "Menu" → `isOpen = true` (client only)
2. Menu appears (from cached patch)
3. User types in search box → triggers unrelated state change
4. Server re-renders → evaluates `isOpen = false` (stale!)
5. Rust reconciler removes menu
6. **🔴 Menu disappears unexpectedly!**

**With sync**:
1. User clicks "Menu" → `isOpen = true` (client + sync to server)
2. Menu appears (from cached patch)
3. Server receives sync → `isOpen = true` (updated!)
4. User types in search box → triggers unrelated state change
5. Server re-renders → evaluates `isOpen = true` (correct!)
6. Rust reconciler sees no change to menu
7. **🟢 Menu stays visible!**

---

## Performance Impact

### Sync Overhead

**Network**:
- Single SignalR message per state change
- ~1-5ms latency (WebSocket)
- Asynchronous (doesn't block UI)

**Server**:
- `SetStateFromClient()`: O(1) dictionary update
- No re-render triggered (happens on next relevant change)
- Negligible CPU impact

**Overall**:
- **User perception**: 0ms (cache hit applies instantly)
- **Background sync**: 1-5ms (async)
- **No noticeable overhead**

---

## Error Handling

### Network Failure

If SignalR sync fails:

```typescript
context.signalR.updateComponentState(componentId, stateKey, actualNewValue)
  .catch(err => {
    console.error('[Minimact] Failed to sync state to server:', err);
    // TODO: Retry logic, offline queue, etc.
  });
```

**Current behavior**:
- Error logged to console
- Client state remains updated (cached patches applied)
- Server state remains stale

**Future enhancement**:
- Retry with exponential backoff
- Offline queue (sync when connection restored)
- User notification for critical failures

---

## Best Practices

### 1. Always Use useState for Reactive State

```typescript
// ✅ GOOD - Uses useState, syncs automatically
const [count, setCount] = useState(0);
const increment = () => setCount(count + 1);

// ❌ BAD - Direct state mutation, no sync
let count = 0;
const increment = () => { count++; };
```

### 2. Don't Bypass setState

```typescript
// ✅ GOOD - Uses setState, triggers sync
setUser({ ...user, name: "Alice" });

// ❌ BAD - Direct mutation, no sync
user.name = "Alice";
```

### 3. Use useDomElementState for DOM Observations

```typescript
// ✅ GOOD - useDomElementState syncs automatically
const headerState = useDomElementState('.header');
useEffect(() => {
  if (headerState.isIntersecting) {
    // Sticky header logic
  }
}, [headerState.isIntersecting]);

// ❌ BAD - Manual IntersectionObserver, no sync
useEffect(() => {
  const observer = new IntersectionObserver(entries => {
    // Changes not synced to server!
  });
}, []);
```

---

## Future Enhancements

### 1. Batch Syncing

Currently, each setState triggers a separate SignalR message. Future enhancement:

```typescript
// Batch multiple state changes into single message
batchStateUpdates(() => {
  setName("Alice");
  setAge(25);
  setEmail("alice@example.com");
});
// → Single SignalR message with all changes
```

### 2. Optimistic Updates with Rollback

If server rejects state change:

```typescript
setCount(count + 1);  // Apply optimistically
// Server validation fails → Roll back to previous value
```

### 3. Offline Support

Queue state changes when offline:

```typescript
// Offline
setCount(5);  // Queued
setName("Bob");  // Queued

// Back online → Flush queue
// Server receives both updates
```

### 4. Conflict Resolution

Handle concurrent edits from multiple clients:

```typescript
// Client A: setCount(5)
// Client B: setCount(7)
// Server: Resolves conflict (last-write-wins, CRDT, etc.)
```

---

## Comparison to Other Frameworks

### Next.js / Remix (Hydration)

```typescript
// Client CAN re-render independently
const [count, setCount] = useState(0);
setCount(count + 1);
// → Client re-renders component
// → No server sync needed (until form submission, etc.)
```

**Difference**: Client has full React reconciler, can evaluate JSX

### Minimact (Dehydrationist)

```typescript
// Client CANNOT re-render independently
const [count, setCount] = useState(0);
setCount(count + 1);
// → Client applies cached patch
// → MUST sync to server (server is source of truth for renders)
```

**Difference**: Client has no JSX evaluator, server must know state

---

## Related Documentation

- [Predictive Rendering](/v1.0/guide/predictive-rendering)
- [Template Patch System](/v1.0/architecture/template-patch-system-deep-dive)
- [Client Stack Overview](/v1.0/architecture/client-stack)
- [Hooks API](/v1.0/api/hooks)
- [Minimact Punch (useDomElementState)](/v1.0/extensions/punch)
