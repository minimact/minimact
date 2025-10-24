# Cache Hit Detection Problem

## The Goal

When a user clicks a button in the playground, we want to:
1. Check if we have a **cached prediction** for this interaction
2. If YES (🟢 **CACHE HIT**): Apply patches instantly from cache, show green overlay
3. If NO (🔴 **CACHE MISS**): Send to server, wait for response, show red overlay

## The Architecture

### Server Side (Predictions)
```csharp
// playground/backend/Services/PlaygroundService.cs
// When component compiles with state like: count = 0

// 1. Generate predictions
foreach (var field in stateFields) {
    if (field.Name == "count" && currentValue == 0) {
        // Predict: count will go to 1
        var patches = ComputePatchesForStateChange(session, field, 1);

        predictions.Add(new PredictionInfo {
            StateKey = "count",
            PredictedValue = 1,
            Patches = patches,
            Confidence = 0.85f
        });
    }
}

// 2. Send to client via SignalR
await hubContext.Clients.All.SendAsync("queueHint", new {
    componentId = sessionId,
    hintId = "count_1",  // <-- Server creates hintId: "{fieldName}_{predictedValue}"
    patches = patches,
    confidence = 0.85
});
```

**Server sends:** `hintId = "count_1"` (meaning "count will become 1")

### Client Side (Cache Storage)

```typescript
// src/client-runtime/src/hint-queue.ts
// Client receives prediction and stores it

class HintQueue {
  private hints: Map<string, QueuedHint> = new Map();

  queueHint(data: { componentId, hintId, patches, confidence }) {
    const key = `${data.componentId}:${data.hintId}`;
    this.hints.set(key, {
      hintId: data.hintId,  // "count_1"
      patches: data.patches,
      confidence: data.confidence
    });
  }
}
```

**Client has cached:** `"someComponentId:count_1"` with pre-computed patches

## The Problem

### When User Clicks Button

```typescript
// src/client-runtime/src/event-delegation.ts
// User clicks button with data-onclick="Increment"

private async executeHandler(handler: EventHandler) {
  // handler.componentId = "abc123"
  // handler.methodName = "Increment"

  // ❓ PROBLEM: How do we know this will change count from 0 to 1?
  // We need to check if hintId "count_1" exists in the cache
  // But we only know the METHOD NAME ("Increment"), not the STATE CHANGE
}
```

### What We Know vs What We Need

**What we have:**
- `componentId`: "abc123"
- `methodName`: "Increment"

**What we need to find:**
- `hintId`: "count_1"

**The gap:**
- We don't know what state field `Increment` will change
- We don't know the current value of `count`
- We don't know the predicted new value

### Example Flow That Should Work

```
1. Component loads: count = 0
2. Server predicts: "count will become 1" → sends hintId "count_1" with patches
3. Client caches: "abc123:count_1" → [patch1, patch2, ...]

4. User clicks <button data-onclick="Increment">
5. EventDelegation receives: methodName="Increment"
6. ❓ Need to determine: "Increment will change count from 0 to 1"
7. ✅ Look up cache: "abc123:count_1" → CACHE HIT!
8. 🟢 Apply patches instantly, show green overlay
```

## Possible Solutions

### Option 1: Access Component State from EventDelegation

Pass component state to EventDelegation so it can read current values:

```typescript
class EventDelegation {
  private componentState: Map<string, any>; // Store component state

  tryMatchHint(componentId: string, methodName: string) {
    // Read current state
    const count = this.componentState.get('count'); // 0

    // Infer state change based on method name
    if (methodName === 'Increment') {
      const predictedCount = count + 1; // 1
      const hintId = `count_${predictedCount}`; // "count_1"

      // Check cache
      return this.hintQueue.matchHint(componentId, { count: predictedCount });
    }
  }
}
```

**Pros:**
- Can accurately determine state changes
- Matches server's prediction logic

**Cons:**
- Need to sync state from server to client
- Need to know method-to-state mapping (Increment → count + 1)

### Option 2: Server Includes Method Metadata in Predictions

Server tells client which methods trigger which hints:

```csharp
await hubContext.Clients.All.SendAsync("queueHint", new {
    componentId = sessionId,
    hintId = "count_1",
    methodName = "Increment", // <-- Add this
    patches = patches,
    confidence = 0.85
});
```

Client stores method → hintId mapping:

```typescript
class HintQueue {
  private methodHints: Map<string, string> = new Map();

  queueHint(data) {
    this.hints.set(`${data.componentId}:${data.hintId}`, data);
    this.methodHints.set(`${data.componentId}:${data.methodName}`, data.hintId);
  }

  matchByMethod(componentId: string, methodName: string) {
    const hintId = this.methodHints.get(`${componentId}:${methodName}`);
    if (hintId) {
      return this.hints.get(`${componentId}:${hintId}`);
    }
  }
}
```

**Pros:**
- Simple - just match method name
- Server already knows the mapping

**Cons:**
- Only works for single-state methods
- Doesn't scale to complex state changes

### Option 3: Optimistic Matching - Try All Hints for Component

Just grab the first available hint for this component:

```typescript
tryMatchHint(componentId: string, methodName: string) {
  // Find ANY hint for this component
  for (const [key, hint] of this.hints.entries()) {
    if (key.startsWith(`${componentId}:`)) {
      return hint; // Use first match
    }
  }
  return null;
}
```

**Pros:**
- Simple, works for single-interaction predictions
- No state access needed

**Cons:**
- Wrong if multiple predictions exist
- Not scalable

## Current State

The infrastructure is in place:
- ✅ Server generates predictions and sends via SignalR
- ✅ Client HintQueue stores predictions
- ✅ EventDelegation has framework for cache hit/miss
- ✅ PlaygroundBridge ready to emit postMessage events
- ❌ Missing: The matching logic to connect method invocation → cached hint

## Question

**Which solution should we implement for the playground?**

For a demo/playground, Option 3 (optimistic) might be sufficient initially.
For production, Option 1 or 2 would be better.

What's the right approach for Minimact's architecture?
