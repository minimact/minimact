# Predictive Rendering Implementation TODO

## Current Status

The Minimact Playground has all the **infrastructure** in place for predictive rendering:

✅ **Client-runtime** - Full SignalR-based runtime with event delegation
✅ **SignalR Hub** - MinimactHub mapped at `/minimact`
✅ **Event attributes** - `onClick` → `data-onclick` conversion
✅ **Component wrapping** - `data-minimact-component` for hydration
✅ **Rust predictor** - Available via `RustBridge.Predictor`

**But**: The playground currently operates in **reactive mode**, not **predictive mode**.

## The Vision vs. Reality

### What SHOULD Happen (The Vision)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Component loads with initial state (count: 0)           │
│    Server renders: <button>Count: 0</button>                │
├─────────────────────────────────────────────────────────────┤
│ 2. Rust predictor analyzes component + hints                │
│    → Identifies likely state change: count 0 → 1            │
├─────────────────────────────────────────────────────────────┤
│ 3. Server PRE-COMPUTES patches for count=1                  │
│    Patch: { op: "replace", path: ["text"], value: "1" }     │
├─────────────────────────────────────────────────────────────┤
│ 4. Server SENDS patches to client via SignalR               │
│    SignalR: applyPrediction({ patches, confidence: 0.95 })  │
├─────────────────────────────────────────────────────────────┤
│ 5. Client CACHES patches in memory                          │
│    Cache: { "count+1": [patch1, patch2, ...] }              │
├─────────────────────────────────────────────────────────────┤
│ 6. User clicks "Increment" button                           │
│    Client runtime intercepts data-onclick="Increment"       │
├─────────────────────────────────────────────────────────────┤
│ 7. ⭐ Client checks cache → CACHE HIT!                      │
│    Applies patch INSTANTLY (0ms network latency)            │
│    DOM updates: <button>Count: 1</button>                   │
├─────────────────────────────────────────────────────────────┤
│ 8. Client notifies server in BACKGROUND                     │
│    SignalR: InvokeComponentMethod("Increment")              │
├─────────────────────────────────────────────────────────────┤
│ 9. Server verifies prediction was correct                   │
│    Actual state: count=1 ✓                                  │
│    No correction needed                                     │
├─────────────────────────────────────────────────────────────┤
│ 10. Server PRE-COMPUTES next likely patch (count 1 → 2)     │
│     Cycle repeats...                                        │
└─────────────────────────────────────────────────────────────┘

Result: User sees instant feedback (0ms), server verified in background
```

### What CURRENTLY Happens (Reactive Mode)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Component loads with initial state (count: 0)           │
│    Server renders: <button>Count: 0</button>                │
├─────────────────────────────────────────────────────────────┤
│ 2. ❌ No prediction happens                                │
│    No patches pre-computed or sent                          │
├─────────────────────────────────────────────────────────────┤
│ 3. User clicks "Increment" button                           │
│    Client runtime intercepts data-onclick="Increment"       │
├─────────────────────────────────────────────────────────────┤
│ 4. Client checks cache → CACHE MISS                         │
│    No pre-computed patches available                        │
├─────────────────────────────────────────────────────────────┤
│ 5. Client sends request to server                           │
│    SignalR: InvokeComponentMethod("Increment")              │
│    ⏳ User waits for network round-trip (15-50ms)           │
├─────────────────────────────────────────────────────────────┤
│ 6. Server executes method, reconciles patches               │
│    Computes: { op: "replace", path: ["text"], value: "1" }  │
├─────────────────────────────────────────────────────────────┤
│ 7. Server sends patches back                                │
│    SignalR: applyPatches({ patches })                       │
├─────────────────────────────────────────────────────────────┤
│ 8. Client applies patches                                   │
│    DOM updates: <button>Count: 1</button>                   │
└─────────────────────────────────────────────────────────────┘

Result: User waits for network (15-50ms) - just like traditional SSR
```

## Implementation Roadmap

### Phase 1: Basic Prediction Pipeline

**Goal**: Get predictions flowing from server to client

#### Backend Changes

**File**: `playground/backend/Services/PlaygroundService.cs`

```csharp
public async Task<CompileResponse> CompileAsync(CompileRequest request, CancellationToken ct)
{
    // ... existing compilation code ...

    // NEW: After initial render, generate predictions
    var predictions = await GeneratePredictionsAsync(session);

    // NEW: Send predictions to client via SignalR
    await SendPredictionsToClient(session.SessionId, predictions);

    return new CompileResponse { /* ... */ };
}

private async Task<List<PredictedPatch>> GeneratePredictionsAsync(PlaygroundSession session)
{
    var predictions = new List<PredictedPatch>();
    var component = session.Component;
    var currentVNode = session.CurrentVNode;

    // For each likely state change, pre-compute patches
    // Example: For counter, predict increment
    var stateFields = component.GetType()
        .GetFields(BindingFlags.NonPublic | BindingFlags.Instance)
        .Where(f => f.GetCustomAttribute<StateAttribute>() != null);

    foreach (var field in stateFields)
    {
        var currentValue = field.GetValue(component);

        // Predict likely next values
        if (field.FieldType == typeof(int))
        {
            var predictedValue = (int)currentValue + 1;
            var predictedPatches = await ComputePatchesForStateChange(
                session,
                field.Name,
                predictedValue
            );

            predictions.Add(new PredictedPatch
            {
                StateKey = field.Name,
                PredictedValue = predictedValue,
                Patches = predictedPatches,
                Confidence = 0.85f // Deterministic increment = high confidence
            });
        }
    }

    return predictions;
}

private async Task<Patch[]> ComputePatchesForStateChange(
    PlaygroundSession session,
    string stateKey,
    object newValue)
{
    // Clone component state
    var component = session.Component;
    var oldVNode = session.CurrentVNode;

    // Apply hypothetical state change
    var field = component.GetType().GetField(
        stateKey,
        BindingFlags.NonPublic | BindingFlags.Instance
    );
    var oldValue = field.GetValue(component);
    field.SetValue(component, newValue);

    // Re-render with new state
    var newVNode = component.RenderComponent();

    // Compute patches
    var patches = RustBridge.Reconcile((VNode)oldVNode, (VNode)newVNode);

    // Restore original state
    field.SetValue(component, oldValue);

    return patches.ToArray();
}

private async Task SendPredictionsToClient(string sessionId, List<PredictedPatch> predictions)
{
    // Get SignalR hub context
    var hub = _serviceProvider.GetRequiredService<IHubContext<MinimactHub>>();

    foreach (var prediction in predictions)
    {
        await hub.Clients.All.SendAsync("queueHint", new
        {
            componentId = sessionId,
            hintId = $"{prediction.StateKey}_{prediction.PredictedValue}",
            patches = prediction.Patches,
            confidence = prediction.Confidence
        });
    }
}
```

#### Client-Runtime (Already Handles This!)

The client-runtime **already** has the code to receive and cache predictions:

```typescript
// src/client-runtime/src/index.ts (ALREADY IMPLEMENTED)
this.signalR.on('queueHint', (data) => {
  this.hintQueue.queueHint(data);
  // Patches are now cached and ready!
});
```

When user clicks, the event delegation **already** checks the cache first.

### Phase 2: Handle usePredictHint

**Goal**: Parse explicit prediction hints from user code

```typescript
// User writes this in their TSX:
function Counter() {
    const [count, setCount] = useState(0);

    usePredictHint('increment', { count: count + 1 });

    return <button onClick={() => setCount(count + 1)}>
        Count: {count}
    </button>;
}
```

**Backend must**:

1. **Extract hints from compiled C# code** (Babel plugin should emit them)
2. **Pre-compute patches for hinted states**
3. **Send via SignalR with hintId**

```csharp
// Parse usePredictHint calls from component metadata
var hints = ExtractPredictHintsFromComponent(component);

foreach (var hint in hints)
{
    var patches = await ComputePatchesForStateChange(
        session,
        hint.StateKey,
        hint.PredictedValue
    );

    await hub.Clients.All.SendAsync("queueHint", new {
        componentId = sessionId,
        hintId = hint.HintId,
        patches = patches,
        confidence = 0.95f // Explicit hint = very high confidence
    });
}
```

### Phase 3: SignalR Event Handling

**Goal**: Wire up component methods to SignalR invocations

**File**: `MinimactHub.cs` (Already exists! Just needs to be used)

The hub **already** has the infrastructure:

```csharp
public async Task InvokeComponentMethod(string componentId, string methodName, string argsJson)
{
    var component = _registry.GetComponent(componentId);
    // ... invoke method via reflection ...
    // ... trigger re-render ...
    // ... send patches back to client ...
}
```

**What's missing**: The playground needs to **register components** with the ComponentRegistry when they're compiled.

```csharp
// In PlaygroundService.CompileAsync:
var registry = _serviceProvider.GetRequiredService<ComponentRegistry>();
registry.RegisterComponent(sessionId, component);
```

### Phase 4: Verification & Correction

**Goal**: Server verifies prediction was correct, sends correction if needed

```csharp
public async Task InvokeComponentMethod(string componentId, string methodName, string argsJson)
{
    var component = _registry.GetComponent(componentId);

    // Capture state before method execution
    var oldVNode = CaptureVNode(component);

    // Execute method
    await ExecuteMethod(component, methodName, argsJson);

    // Capture state after method execution
    var newVNode = component.RenderComponent();

    // Compute ACTUAL patches
    var actualPatches = RustBridge.Reconcile(oldVNode, newVNode);

    // Check if client's prediction was correct
    // (Client tells us which hintId it used)
    var predictedPatches = GetPredictedPatchesFromCache(hintId);

    if (PatchesMatch(actualPatches, predictedPatches))
    {
        // ✅ Prediction was correct! Nothing to do
        _logger.LogInformation("🟢 Cache hit - prediction was correct");
    }
    else
    {
        // ❌ Prediction was wrong, send correction
        await Clients.Caller.SendAsync("applyCorrection", new {
            componentId = componentId,
            patches = actualPatches
        });
        _logger.LogWarning("🔴 Cache miss - sending correction");
    }

    // Pre-compute NEXT predictions
    var nextPredictions = await GeneratePredictionsAsync(component);
    await SendPredictionsToClient(componentId, nextPredictions);
}
```

## Metrics to Track

To demonstrate Minimact's value, the playground should track:

- **Hit Rate**: % of interactions that were cache hits
- **Predicted Latency**: Time to apply cached patch (should be <5ms)
- **Computed Latency**: Time for server round-trip on cache miss (15-50ms)
- **Time Saved**: (Computed - Predicted) × Hit Rate

Display these in the MetricsDashboard component.

## Testing the Flow

### Test 1: Simple Counter

```typescript
const [count, setCount] = useState(0);
return <button onClick={() => setCount(count + 1)}>
    Count: {count}
</button>;
```

**Expected behavior**:
1. On load: Server sends prediction for count=1
2. User clicks: Instant update (cache hit)
3. Click again: Another cache hit (count=2 was predicted after first click)

### Test 2: With Explicit Hint

```typescript
const [count, setCount] = useState(0);
usePredictHint('doubleIncrement', { count: count + 2 });

return <button onClick={() => setCount(count + 2)}>
    Count: {count}
</button>;
```

**Expected behavior**:
1. On load: Server sends prediction for count=2 (not count=1!)
2. User clicks: Instant update (cache hit because of hint)

### Test 3: Conditional Rendering

```typescript
const [count, setCount] = useState(0);
return (
    <div>
        {count < 5 ?
            <button onClick={() => setCount(count + 1)}>Increment</button> :
            <span>Max reached!</span>
        }
    </div>
);
```

**Expected behavior**:
1. Clicks 1-4: Cache hits (count < 5 branch)
2. Click 5: Cache hit (count >= 5 branch was predicted)
3. Visual feedback: Green overlay on cache hits, red on misses

## Files to Modify

### Backend

- [ ] `playground/backend/Services/PlaygroundService.cs`
  - Add `GeneratePredictionsAsync()`
  - Add `ComputePatchesForStateChange()`
  - Add `SendPredictionsToClient()`
  - Call these in `CompileAsync()`

- [ ] `playground/backend/Services/SessionManager.cs`
  - Integrate with ComponentRegistry

- [ ] `playground/backend/Program.cs`
  - Register ComponentRegistry as singleton
  - Ensure MinimactHub has access to it

### Client-Runtime (Already Done!)

The client-runtime **already implements** all the cache logic:
- `HintQueue` for storing predictions
- Cache checking on events
- Applying predictions instantly

**No client changes needed!**

### Frontend (Metrics Display)

- [ ] `playground/frontend/src/components/MetricsDashboard.tsx`
  - Show hit rate
  - Show avg latencies
  - Show green/red indicators for last interaction

## Success Criteria

✅ **Basic Prediction**: Counter increments show <5ms latency on first click
✅ **High Hit Rate**: >85% cache hit rate on deterministic UIs
✅ **Visual Feedback**: Green overlay on cache hits, red on misses
✅ **Explicit Hints**: `usePredictHint` increases hit rate to >95%
✅ **Metrics Dashboard**: Shows real-time hit rate and latency comparison

## The Vision

Once implemented, users will **feel** the difference:

- Traditional React: Click → 15ms wait → DOM update
- Minimact: Click → **0ms** → DOM update (patch was already cached!)

The playground becomes a **proof of concept** that shows:
1. Write normal React code
2. Get instant interactions (feels native)
3. All logic stays secure on server
4. Works with zero client-side JavaScript framework

**This is the "stored procedures for UI" vision come to life.** 🌵✨

## Next Steps

1. Implement Phase 1 (basic prediction pipeline)
2. Test with simple counter component
3. Add metrics tracking
4. Implement Phase 2 (hint parsing)
5. Polish the demo experience
6. **Show the world what Minimact can do!**
