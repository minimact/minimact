# Minimact Hint System Guide

**Core Concept:** Hints are pre-computed patches that are cached on the client and applied instantly when state changes match predictions.

---

## The Unified Hint Architecture

```
                    ┌──────────────────────┐
                    │     HintQueue        │
                    │  (Unified Cache)     │
                    └──────────────────────┘
                              ▲
                              │ All hints flow here
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
      ┌──────────┐      ┌──────────┐    ┌──────────┐
      │  Manual  │      │   Rust   │    │  Client  │
      │  Hints   │      │ Predictor│    │ Worker   │
      └──────────┘      └──────────┘    └──────────┘
      usePredictHint    Automatic       Automatic
      (developer)       (state-based)   (intent-based)
```

**All hint sources:**
1. Use the same `QueueHint` SignalR channel
2. Store patches in the same `HintQueue`
3. Apply patches with the same `DOMPatcher`
4. Report metrics to the same `PlaygroundBridge`

---

## Hint Source 1: usePredictHint (Manual)

### What It Is

A **developer-controlled hint** that explicitly tells Minimact to pre-compute and cache patches for a specific state change.

### When to Use

- You know a state change will happen
- The pattern is predictable
- You want guaranteed instant feedback

### Basic Usage

```tsx
import { usePredictHint } from 'minimact';

export function Counter() {
  const [count, setCount] = useState(0);

  // Hint: Pre-compute patches for count + 1
  usePredictHint('increment', { count: count + 1 });

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

**Flow:**
```
1. Component renders with count = 5
2. usePredictHint called with hint 'increment', state { count: 6 }
3. SignalR: RequestPrediction('counter-1', 'increment', { count: 6 })
4. Server: Renders component with count = 6
5. Server: Computes patches (diff between count=5 and count=6)
6. Server: SendAsync('QueueHint', { hintId: 'increment', patches, predictedState })
7. Client: HintQueue caches patches
8. --- Later ---
9. User clicks button
10. setCount(6) called
11. HintQueue.matchHint({ count: 6 }) → 🟢 CACHE HIT!
12. DOMPatcher applies patches instantly (0ms network latency)
```

### Advanced Usage

**Dynamic hints:**
```tsx
// Compute hint based on current state
usePredictHint('addTodo', () => ({
  todos: [...todos, { id: nextId(), text: newTodo }]
}));
```

**Multiple hints:**
```tsx
// Pre-compute several likely outcomes
usePredictHint('increment', { count: count + 1 });
usePredictHint('decrement', { count: count - 1 });
usePredictHint('reset', { count: 0 });
```

**Conditional hints:**
```tsx
// Only hint if state meets condition
{count < 100 && usePredictHint('increment', { count: count + 1 })}
```

**Complex state hints:**
```tsx
usePredictHint('modal-open', () => ({
  modalVisible: true,
  backdropOpacity: 0.5,
  bodyScroll: 'locked',
  focusedElement: 'modal-close-button'
}));
```

### Use Cases

- ✅ Button clicks (increment, decrement, toggle)
- ✅ Form submissions (known next state)
- ✅ Modal open/close (predictable transitions)
- ✅ Dropdown hover (pre-fetch on mouseEnter)
- ✅ Tab navigation (pre-compute next tab content)
- ✅ Pagination (pre-compute next/prev page)

### Characteristics

| Aspect | Value |
|--------|-------|
| **Control** | Developer explicit |
| **Timing** | On every render with hint |
| **Confidence** | 100% (developer specified) |
| **Latency** | 0ms (if cache hit) |
| **Bandwidth** | ~5KB per hint |
| **Overhead** | Server renders per hint |

---

## Hint Source 2: Rust Predictor (Automatic - State-Based)

### What It Is

**Automatic predictions** based on historical state change patterns. The Rust engine learns from past renders and predicts future patches.

### When It Runs

**Automatically** whenever state changes. No developer intervention needed.

### How It Works

```csharp
// In TriggerRender()
if (GlobalPredictor != null && changedKeys.Length == 1)
{
    var stateChange = new StateChange
    {
        ComponentId = ComponentId,
        StateKey = key,
        OldValue = PreviousState[key],
        NewValue = State[key]
    };

    // Rust engine predicts
    var prediction = GlobalPredictor.Predict(stateChange, CurrentVNode);

    if (prediction != null && prediction.Confidence >= 0.7)
    {
        // Send prediction immediately
        await HubContext.Clients.Client(ConnectionId)
            .SendAsync("ApplyPrediction", new {
                componentId = ComponentId,
                patches = prediction.Patches,
                confidence = prediction.Confidence
            });
    }
}

// Later: Verify prediction
var actualPatches = RustBridge.Reconcile(CurrentVNode, newVNode);
if (!PatchesMatch(prediction.Patches, actualPatches))
{
    // Send correction
    await HubContext.Clients.Client(ConnectionId)
        .SendAsync("ApplyCorrection", new {
            componentId = ComponentId,
            patches = actualPatches
        });
}
```

### Prediction Strategy

**Pattern-based learning:**

```rust
// Simplified Rust predictor
impl Predictor {
    fn predict(&self, change: StateChange, tree: VNode) -> Option<Prediction> {
        // 1. Find historical patterns
        let patterns = self.pattern_db
            .find_similar(&change)
            .filter(|p| p.confidence >= 0.7);

        // 2. Return best match
        patterns.max_by_key(|p| p.confidence).map(|p| Prediction {
            patches: p.patches.clone(),
            confidence: p.confidence
        })
    }

    fn learn(&mut self, change: StateChange, actual_patches: Vec<Patch>) {
        // Store pattern for future predictions
        self.pattern_db.insert(Pattern {
            state_change: change,
            patches: actual_patches,
            confidence: self.calculate_confidence()
        });
    }
}
```

### Use Cases

- ✅ Deterministic state changes (counter++)
- ✅ Toggle switches (true ↔ false)
- ✅ Simple form inputs
- ✅ List selections
- ❌ Complex multi-state changes (lower confidence)
- ❌ External data dependencies (unpredictable)

### Characteristics

| Aspect | Value |
|--------|-------|
| **Control** | Fully automatic |
| **Timing** | After state change, before render |
| **Confidence** | 70-95% (learned) |
| **Latency** | Saves render time (~10-30ms) |
| **Bandwidth** | ~5KB per prediction |
| **Learning** | Improves over time |

---

## Hint Source 3: Web Worker (Automatic - Intent-Based)

### What It Is

**Automatic predictions** based on user intent detection. The Web Worker monitors browser events and predicts future observations before they happen.

**Key difference:** Rust predicts *after* state changes. Web Worker predicts *before* observations occur.

### When It Runs

**Continuously in background**, analyzing user behavior patterns to predict future DOM observations.

### How It Works

```typescript
// Web Worker (runs off main thread)
class ConfidenceEngine {
  onMouseMove(event: MouseEvent) {
    // Analyze trajectory
    const trajectory = this.calculateTrajectory(this.mouseHistory);

    // Check elements in path
    for (const element of this.observableElements) {
      const confidence = this.calculateHoverConfidence(
        trajectory,
        element.bounds
      );

      if (confidence > 0.7) {
        // Request prediction proactively
        postMessage({
          type: 'requestPrediction',
          componentId: element.componentId,
          observation: { hover: true },
          confidence: confidence,
          leadTime: this.calculateLeadTime(trajectory, element)
        });
      }
    }
  }

  calculateHoverConfidence(trajectory: Trajectory, bounds: Rect): number {
    // Physics-based calculation
    const intersection = this.rayIntersection(trajectory, bounds);
    if (!intersection) return 0.0;

    const distance = intersection.distance;
    const velocity = trajectory.velocity;
    const timeToIntersect = distance / velocity;

    // High confidence if:
    // - Mouse moving toward element
    // - Will arrive in 50-300ms
    // - Trajectory angle < 30 degrees
    if (timeToIntersect < 300 &&
        timeToIntersect > 50 &&
        trajectory.angleToElement < 30) {
      return 0.85;
    }

    return 0.3;
  }
}

// Main thread receives prediction request
worker.onmessage = (e) => {
  if (e.data.type === 'requestPrediction') {
    // Same flow as usePredictHint!
    signalR.invoke('RequestPrediction',
      e.data.componentId,
      e.data.observation
    );
  }
};

// Server sends hint (same channel as usePredictHint)
signalR.on('QueueHint', (data) => {
  hintQueue.queueHint(data);
});

// Later, when observation actually happens
const hint = hintQueue.matchHint(componentId, {
  domElementState_0: { hover: true }
});

if (hint) {
  // 🟢 CACHE HIT!
  domPatcher.applyPatches(element, hint.patches);
}
```

### Use Cases (minimact-punch)

```tsx
import { useDomElementState } from 'minimact-punch';

const box = useDomElementState();

<div ref={el => box.attachElement(el)}>
  {/* Web Worker predicts hover before it happens */}
  {box.hover && <Tooltip />}

  {/* Web Worker predicts intersection before scroll completes */}
  {box.isIntersecting && <LazyImage />}

  {/* Web Worker predicts focus from Tab key sequence */}
  {box.focus && <FocusIndicator />}
</div>
```

**Predictions:**
- **Hover** - Mouse trajectory analysis (200ms lead time)
- **Intersection** - Scroll velocity analysis (300ms lead time)
- **Focus** - Tab sequence detection (100ms lead time)
- **Resize/Breakpoint** - Resize velocity patterns

### Confidence Strategies

**Hover (Mouse Trajectory):**
```typescript
confidence = f(
  distance_to_element,
  mouse_velocity,
  trajectory_angle,
  time_to_intersect
)

// High confidence (0.85+): Mouse moving straight toward element
// Low confidence (0.3-): Mouse moving away or perpendicular
```

**Intersection (Scroll Velocity):**
```typescript
confidence = f(
  distance_to_viewport,
  scroll_velocity,
  scroll_direction,
  deceleration_rate
)

// High confidence (0.90+): Element in scroll path, 200ms away
// Low confidence (0.2-): User stopped scrolling or reversed
```

**Focus (Tab Sequence):**
```typescript
confidence = f(
  tab_key_pressed,
  current_focus_index,
  next_focusable_element
)

// Very high confidence (0.95+): Tab pressed, next element known
// Zero confidence: No Tab key, unpredictable focus change
```

### Characteristics

| Aspect | Value |
|--------|-------|
| **Control** | Fully automatic |
| **Timing** | Before observation occurs |
| **Confidence** | 70-95% (physics-based) |
| **Latency** | Saves full round-trip (~45-65ms) |
| **Lead Time** | 50-300ms before event |
| **Bandwidth** | ~5KB per prediction |
| **Main Thread Impact** | 0ms (runs in worker) |

---

## The Unified Flow

All three hint sources use the **exact same mechanism**:

### 1. Request Prediction

```typescript
// All hint sources eventually do this:
signalR.invoke('RequestPrediction', componentId, predictedState);
```

**Sources:**
- `usePredictHint`: Developer calls directly
- Rust Predictor: Automatic after state change
- Web Worker: Automatic based on confidence

### 2. Server Generates Hint

```csharp
// Server (same for all sources)
public async Task RequestPrediction(string componentId, Dictionary<string, object> predictedState)
{
    var component = _registry.GetComponent(componentId);

    // Clone component state
    var clonedState = new Dictionary<string, object>(component.State);

    // Apply predicted state
    foreach (var kvp in predictedState)
    {
        clonedState[kvp.Key] = kvp.Value;
    }

    // Render with predicted state
    var predictedHtml = component.RenderWithState(clonedState);

    // Compute patches
    var patches = _reconciler.ComputePatches(
        component.CurrentHtml,
        predictedHtml
    );

    // Send hint to client
    await Clients.Caller.SendAsync("QueueHint", new
    {
        componentId = componentId,
        hintId = GenerateHintId(),
        patches = patches,
        confidence = 0.9,
        predictedState = predictedState
    });
}
```

### 3. Client Caches Hint

```typescript
// Client (same for all sources)
signalR.on('QueueHint', (data) => {
  hintQueue.queueHint({
    componentId: data.componentId,
    hintId: data.hintId,
    patches: data.patches,
    predictedState: data.predictedState
  });

  console.log(`📦 Cached hint '${data.hintId}'`);
});
```

### 4. State Changes

```typescript
// When actual state change occurs
const stateChanges = {
  count: 6
  // OR
  domElementState_0: { hover: true }
};
```

### 5. Check Cache

```typescript
// Same for all hint sources
const hint = hintQueue.matchHint(componentId, stateChanges);

if (hint) {
  // 🟢 CACHE HIT!
  const startTime = performance.now();

  domPatcher.applyPatches(element, hint.patches);

  const latency = performance.now() - startTime;
  console.log(`🟢 Applied cached hint in ${latency.toFixed(2)}ms`);

  // Report metrics
  if (playgroundBridge) {
    playgroundBridge.cacheHit({
      componentId,
      hintId: hint.hintId,
      latency,
      confidence: hint.confidence,
      patchCount: hint.patches.length
    });
  }
} else {
  // 🔴 CACHE MISS
  console.log(`🔴 No cached hint found`);

  if (playgroundBridge) {
    playgroundBridge.cacheMiss({
      componentId,
      methodName: 'stateChange',
      latency: 0,
      patchCount: 0
    });
  }
}
```

---

## Hint State Matching

The `matchHint` function compares predicted state to actual state:

```typescript
class HintQueue {
  matchHint(componentId: string, stateChanges: Record<string, any>): Hint | null {
    // Find hints for this component
    const componentHints = Array.from(this.hints.entries())
      .filter(([key]) => key.startsWith(`${componentId}:`))
      .map(([, hint]) => hint);

    // Check each hint
    for (const hint of componentHints) {
      if (this.stateMatches(hint.predictedState, stateChanges)) {
        // 🟢 MATCH FOUND!
        this.hints.delete(`${componentId}:${hint.hintId}`);
        return hint;
      }
    }

    // 🔴 NO MATCH
    return null;
  }

  private stateMatches(predicted: Record<string, any>, actual: Record<string, any>): boolean {
    // Deep equality check
    for (const [key, predictedValue] of Object.entries(predicted)) {
      if (!(key in actual)) return false;

      // Compare (handles nested objects)
      if (JSON.stringify(actual[key]) !== JSON.stringify(predictedValue)) {
        return false;
      }
    }

    return true;
  }
}
```

**Examples:**

```typescript
// Example 1: Simple state
predicted = { count: 6 }
actual = { count: 6 }
// ✅ MATCH

// Example 2: Nested state
predicted = { domElementState_0: { hover: true, childrenCount: 3 } }
actual = { domElementState_0: { hover: true, childrenCount: 3 } }
// ✅ MATCH

// Example 3: Mismatch
predicted = { count: 6 }
actual = { count: 7 }
// ❌ NO MATCH (cache miss, accept network latency)
```

---

## Performance Characteristics

### Cache Hit Rates

| Hint Source | Typical Hit Rate | Reasoning |
|-------------|------------------|-----------|
| usePredictHint | 90-95% | Developer controlled |
| Rust Predictor | 85-90% | Deterministic patterns |
| Web Worker | 70-85% | Intent-based (probabilistic) |

### Latency Savings

| Scenario | Without Hints | With Cache Hit | Savings |
|----------|---------------|----------------|---------|
| Button click | ~45ms | ~1ms | 44ms (97%) |
| Hover transition | ~45ms | ~1ms | 44ms (97%) |
| Scroll intersection | ~45ms | ~1ms | 44ms (97%) |

### Bandwidth Usage

| Metric | Value |
|--------|-------|
| Hint size | ~5KB average |
| Max hints cached | 20 per component |
| Total cache size | ~100KB per component |
| Hint TTL | 5 seconds |
| Cleanup | Automatic (stale hints removed) |

---

## Best Practices

### 1. **Use usePredictHint for Known Patterns**

```tsx
// ✅ GOOD: Explicit control for predictable interactions
usePredictHint('increment', { count: count + 1 });

// ❌ AVOID: Over-hinting (wastes bandwidth)
usePredictHint('increment', { count: count + 1 });
usePredictHint('incrementByTwo', { count: count + 2 });
usePredictHint('incrementByThree', { count: count + 3 });
// ... (only hint likely scenarios)
```

### 2. **Let Rust Handle Simple State**

```tsx
// ✅ GOOD: Let Rust learn automatically
const [toggle, setToggle] = useState(false);
// Rust will learn: toggle = false → toggle = true

// ❌ AVOID: Redundant hint
usePredictHint('toggle', { toggle: !toggle });
// Rust already predicts this!
```

### 3. **Let Web Worker Handle Intent**

```tsx
// ✅ GOOD: Web Worker automatically predicts
const box = useDomElementState();
{box.hover && <Tooltip />}

// ❌ AVOID: Manual hints for DOM observations
onMouseEnter={() => usePredictHint('hover', { hover: true })}
// Web Worker already does this automatically!
```

### 4. **Combine for Complex Interactions**

```tsx
// ✅ GOOD: Use all three together
const box = useDomElementState();
const [expanded, setExpanded] = useState(false);

// Web Worker predicts hover
{box.hover && (
  <Tooltip>
    {/* Manual hint for known next state */}
    <button onClick={() => {
      usePredictHint('expand', { expanded: true });
      setExpanded(true);
    }}>
      Expand
    </button>

    {/* Rust predicts toggle */}
    Content: {expanded ? 'Expanded' : 'Collapsed'}
  </Tooltip>
)}
```

---

## Monitoring & Debugging

### Console Logs

```
📦 Cached hint 'increment' (5 patches)
🟢 CACHE HIT! Hint 'increment' matched - applying 5 patches in 0.87ms
🔴 CACHE MISS - No prediction for state change: { count: 7 }
```

### Playground Bridge

```typescript
// Visualize hint performance in playground
playgroundBridge.cacheHit({
  componentId: 'counter-1',
  hintId: 'increment',
  latency: 0.87,
  confidence: 0.95,
  patchCount: 5
});
```

### HintQueue Stats

```typescript
const stats = hintQueue.getStats();
// {
//   totalHints: 12,
//   hintsByComponent: {
//     'counter-1': 5,
//     'modal-1': 7
//   }
// }
```

---

## Summary

| Aspect | usePredictHint | Rust Predictor | Web Worker |
|--------|----------------|----------------|------------|
| **Type** | Manual | Automatic | Automatic |
| **Timing** | Every render | After state change | Before observation |
| **Target** | Any state | State changes | DOM observations |
| **Confidence** | 100% | 70-95% | 70-95% |
| **Control** | Developer | Framework | Framework |
| **Use Case** | Known patterns | Deterministic | Intent-based |

**All three feed into the same HintQueue. All three use the same matching and application logic. All three report to the same PlaygroundBridge.**

---

**The cactus stores water three ways. Manual reservoirs. Underground roots. Morning dew collectors. All serve the same purpose.** 🌵💧

**Same destination. Different sources.**
