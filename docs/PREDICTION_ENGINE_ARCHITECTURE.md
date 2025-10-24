# The Two-Headed Prediction Engine

**Core Concept:** Minimact's prediction engine has two complementary heads that work together.

```
                    ┌──────────────────────────────┐
                    │   Prediction Engine          │
                    │   (Two-Headed Architecture)  │
                    └──────────────────────────────┘
                               /  \
                              /    \
                             /      \
                            /        \
                           ▼          ▼
            ┌──────────────────┐  ┌──────────────────┐
            │  Rust Head        │  │  Web Worker Head │
            │  (Server-Side)    │  │  (Client-Side)   │
            │                   │  │                   │
            │  Deterministic    │  │  Intent-Based    │
            │  State Changes    │  │  Observations    │
            └──────────────────┘  └──────────────────┘
```

---

## Head 1: Rust Prediction Engine (Server-Side)

### What It Predicts

**Deterministic state transitions** - State changes with clear cause-and-effect.

```tsx
// Example: Button click increments counter
const [count, setCount] = useState(0);

<button onClick={() => setCount(count + 1)}>
  Count: {count}
</button>

// Rust engine predicts:
// State: count = 5
// User clicks button
// Prediction: count will become 6
// Confidence: 95%+ (deterministic)
```

### When It Runs

**After an event is triggered**, before the actual render completes.

```
1. User clicks button
2. SignalR: InvokeComponentMethod("Increment")
3. Server: count++
4. 🔮 Rust Predictor: "I predict count will render as '6'"
5. Server: SendAsync("ApplyPrediction", patches)  ← INSTANT
6. Server: Actually renders (background verification)
7. Server: Compares prediction vs reality
8. If different: SendAsync("ApplyCorrection")
```

### Prediction Strategy

**Pattern-based learning** from past renders.

```rust
// Rust prediction engine
struct StateChange {
    component_id: String,
    state_key: String,
    old_value: Value,
    new_value: Value,
}

impl Predictor {
    fn predict(&self, change: StateChange, current_tree: VNode) -> Prediction {
        // 1. Look up historical patterns
        let patterns = self.pattern_db.find_similar(change);

        // 2. Find most confident prediction
        let best_match = patterns.iter()
            .max_by_key(|p| p.confidence)
            .filter(|p| p.confidence >= 0.7);

        // 3. Return predicted patches
        best_match.map(|p| Prediction {
            patches: p.patches.clone(),
            confidence: p.confidence
        })
    }
}
```

### Use Cases

- ✅ Button clicks
- ✅ Form inputs
- ✅ Toggle switches
- ✅ Dropdown selections
- ✅ Counter increments/decrements
- ✅ List item selections
- ✅ Any deterministic state change

### Characteristics

| Aspect | Value |
|--------|-------|
| **Runs on** | Server (ASP.NET Core + Rust) |
| **Predicts** | Next state after user action |
| **Timing** | After event, before render |
| **Confidence** | High (90-95%) for deterministic changes |
| **Latency saved** | Render time (~10-30ms) |
| **Storage** | Pattern database on server |

---

## Head 2: Web Worker Confidence Engine (Client-Side)

### What It Predicts

**Intent-based observations** - User intentions before they manifest as actual observations.

```tsx
// Example: Mouse moving toward element
const box = useDomElementState();

<div ref={el => box.attachElement(el)}>
  {box.hover && <Tooltip />}
</div>

// Web Worker predicts:
// Mouse at (100, 100), moving toward element at (200, 150)
// Trajectory analysis: 87% confidence hover will occur in 180ms
// Prediction: Pre-fetch hover patches NOW
// Confidence: 87% (probabilistic)
```

### When It Runs

**Continuously in background**, predicting future observations before they happen.

```
1. User moves mouse (event captured)
2. Main thread: postMessage(event) to worker
3. 🔮 Worker: Analyzes trajectory continuously
4. Worker: "87% confidence user will hover element in 180ms"
5. Worker: postMessage("requestPrediction") to main
6. Main: SignalR.invoke("RequestPrediction", { hover: true })
7. Server: Renders patches for hover state
8. Client: Caches patches in HintQueue
9. --- 180ms later ---
10. User actually hovers element
11. Client: 🟢 CACHE HIT! Apply patches instantly (0ms network latency)
```

### Prediction Strategy

**Physics-based intent detection** using sensor data.

```typescript
// Web Worker confidence engine
class ConfidenceEngine {
  // Sensors
  private mouseTracker: MouseTrajectoryTracker;
  private scrollTracker: ScrollVelocityTracker;
  private focusTracker: FocusSequenceTracker;
  private resizeTracker: ResizeVelocityTracker;

  // Event history
  private eventHistory: CircularBuffer<Event>;

  // Confidence calculations
  calculateHoverConfidence(elementId: string): number {
    const element = this.elements.get(elementId);
    const trajectory = this.mouseTracker.getTrajectory();

    // Physics: Will mouse trajectory intersect element?
    const intersection = calculateIntersection(trajectory, element.bounds);
    if (!intersection) return 0.0;

    // Calculate confidence based on:
    // - Distance to element
    // - Mouse velocity
    // - Trajectory angle
    // - Historical patterns

    const distance = intersection.distance;
    const timeToIntersect = distance / trajectory.velocity;

    if (timeToIntersect < 200 && trajectory.angleToElement < 30) {
      return 0.85; // HIGH confidence
    }

    return 0.3; // LOW confidence
  }

  calculateIntersectionConfidence(elementId: string): number {
    const element = this.elements.get(elementId);
    const scroll = this.scrollTracker.getVelocity();

    // Physics: Will element enter viewport?
    const viewportBottom = window.scrollY + window.innerHeight;
    const elementTop = element.bounds.top;
    const distance = elementTop - viewportBottom;

    if (distance < 0) return 1.0; // Already intersecting

    const timeToIntersect = distance / scroll.velocity;

    if (timeToIntersect < 300 && scroll.direction === 'down') {
      return 0.90; // VERY HIGH confidence
    }

    return 0.2; // LOW confidence
  }

  calculateFocusConfidence(elementId: string): number {
    const sequence = this.focusTracker.getSequence();
    const currentIndex = sequence.indexOf(document.activeElement.id);
    const nextElement = sequence[currentIndex + 1];

    if (nextElement === elementId) {
      return 0.95; // EXTREMELY HIGH - Tab was just pressed
    }

    return 0.0; // Can't predict focus without Tab sequence
  }
}
```

### Use Cases

- ✅ Hover predictions (mouse trajectory)
- ✅ Intersection predictions (scroll velocity)
- ✅ Focus predictions (tab sequences)
- ✅ Resize/breakpoint predictions (resize velocity)
- ✅ Temporal metrics (widget.history.changesPerSecond)
- ✅ Any observation with **lead time**

### Characteristics

| Aspect | Value |
|--------|-------|
| **Runs on** | Client (Web Worker) |
| **Predicts** | Future observations before they occur |
| **Timing** | Continuously, with lead time (50-300ms) |
| **Confidence** | Variable (70-95%) for intent-based |
| **Latency saved** | Network round-trip (~45ms) + render (~20ms) |
| **Storage** | Pattern models in worker memory |

---

## How They Work Together

### Example: Hover State with Both Heads

```tsx
const box = useDomElementState();
const [tooltipExpanded, setTooltipExpanded] = useState(false);

<div ref={el => box.attachElement(el)}>
  {box.hover && (
    <Tooltip expanded={tooltipExpanded}>
      <button onClick={() => setTooltipExpanded(!tooltipExpanded)}>
        Expand
      </button>
    </Tooltip>
  )}
</div>
```

**Scenario 1: Mouse approaches element**

```
Time T=0: Mouse at (100, 100), element at (200, 150)

🔮 Web Worker (Client):
  - Analyzes trajectory
  - Confidence: 87%
  - Predicts: hover will occur in 180ms
  - Action: Request patches for { hover: true }

Time T=50ms: Server computes patches
  - Renders: <Tooltip expanded={false}>
  - Rust reconciles
  - Sends patches to client
  - Client caches in HintQueue

Time T=180ms: Mouse actually hovers element
  - 🟢 CACHE HIT!
  - Applies patches instantly (0ms network latency)
  - Tooltip appears immediately
```

**Scenario 2: User clicks "Expand" button**

```
Time T=0: User clicks button

SignalR: InvokeComponentMethod("toggleExpanded")

🔮 Rust Engine (Server):
  - State: tooltipExpanded = false
  - Predicts: tooltipExpanded will become true
  - Confidence: 95%
  - Action: Send prediction patches immediately

Time T=5ms: Client receives prediction
  - 🟢 Applies patches instantly
  - Button shows "Collapse" immediately
  - (Server still rendering in background)

Time T=50ms: Server finishes actual render
  - Compares: Prediction was correct ✅
  - No correction needed
```

**Scenario 3: Both together**

```
User hovers → Web Worker predicted (cached)
Then clicks → Rust Engine predicted (instant)

Total latency: ~0ms for both interactions
User experience: Feels like a native app
```

---

## Confidence Threshold Strategy

### Rust Engine (Server-Side)

```csharp
// Only send predictions if confidence >= 0.7
if (prediction != null && prediction.Confidence >= 0.7)
{
    await HubContext.Clients.Client(ConnectionId)
        .SendAsync("ApplyPrediction", new { patches, confidence });
}
```

**Why 0.7?**
- Below 70%: Too risky - wrong predictions create bad UX
- Above 70%: Safe enough - corrections are rare
- 90%+: Deterministic changes (button clicks)
- 70-89%: Probabilistic changes (complex state logic)

### Web Worker (Client-Side)

```typescript
// Only request predictions if confidence >= 0.7
if (confidence > 0.7) {
  worker.postMessage({
    type: 'requestPrediction',
    componentId,
    observation,
    confidence
  });
}

// Special case: Very high confidence (0.9+)
if (confidence > 0.9) {
  // Also pre-fetch related states
  worker.postMessage({
    type: 'requestPrediction',
    componentId,
    observation: { hover: true, focus: true } // Piggyback
  });
}
```

**Why 0.7?**
- Below 70%: Don't waste bandwidth - accept network latency
- Above 70%: Worth pre-fetching - likely to be used
- 90%+: Very high confidence - pre-fetch multiple related states

---

## Bandwidth Optimization

### Selective Pre-computation

Only compute what has high confidence.

```
Traditional (Naive):
  ❌ Pre-compute all 640 DOM state variations
  ❌ 640 renders per component
  ❌ Massive bandwidth waste

Two-Headed Engine:
  ✅ Web Worker calculates confidence: 2 high (hover, intersection)
  ✅ Server renders only 2 variations
  ✅ Client caches 2 predictions
  ✅ Bandwidth: 2x patches instead of 640x
```

### Adaptive Requests

```typescript
// Worker learns user patterns
class AdaptiveLearning {
  userAlwaysHoversBeforeClicking = false;

  learn(events: Event[]) {
    const hoverBeforeClick = events.filter(e =>
      e.type === 'click' &&
      this.hadRecentHover(e.target)
    ).length / events.filter(e => e.type === 'click').length;

    if (hoverBeforeClick > 0.8) {
      this.userAlwaysHoversBeforeClicking = true;
      // Increase hover prediction confidence multiplier
    }
  }
}
```

---

## Message Protocol

### Main Thread ↔ Web Worker

```typescript
// Main → Worker: Send raw events
worker.postMessage({
  type: 'event',
  event: 'mousemove',
  x: 450,
  y: 320,
  timestamp: performance.now()
});

// Worker → Main: Request prediction
worker.onmessage = (e) => {
  if (e.data.type === 'requestPrediction') {
    signalR.invoke('RequestPrediction',
      e.data.componentId,
      e.data.observation
    );
  }
};
```

### Client ↔ Server

```typescript
// Client → Server: Request prediction
signalR.invoke('RequestPrediction', componentId, { hover: true });

// Server → Client: Send patches for caching
signalR.on('QueueHint', (data) => {
  hintQueue.queueHint({
    componentId: data.componentId,
    hintId: data.hintId,
    patches: data.patches,
    predictedState: { hover: true }
  });
});
```

---

## Performance Characteristics

### Rust Engine

| Metric | Value |
|--------|-------|
| Latency saved | 10-30ms (render time) |
| Prediction time | ~2ms |
| Confidence | 90-95% |
| Cache hit rate | 85-95% |
| Bandwidth overhead | ~5KB per prediction |

### Web Worker Engine

| Metric | Value |
|--------|-------|
| Latency saved | 45-65ms (full round-trip) |
| Prediction time | ~5-10ms (off main thread) |
| Confidence | 70-95% |
| Cache hit rate | 70-85% |
| Bandwidth overhead | ~5KB per prediction |
| Main thread impact | 0ms (runs in worker) |

### Combined

| Metric | Value |
|--------|-------|
| Perceived latency | ~0-5ms (both predictions hit) |
| Total predictions | Rust + Worker |
| Cache hit rate | 75-90% overall |
| User experience | Feels native/instant |

---

## Fallback Strategy

### When Confidence Is Low

```typescript
if (confidence < 0.7) {
  // Don't pre-fetch
  // Accept network latency (~45ms)
  // Still faster than most SPAs
}
```

### Three-Tier System

```
Tier 1: Pre-cached (Rust + Worker hit)
  └─> Latency: ~0-5ms
  └─> User experience: Instant

Tier 2: Pre-fetched (Worker hit only)
  └─> Latency: ~10-20ms
  └─> User experience: Very fast

Tier 3: Reactive (No prediction)
  └─> Latency: ~45ms
  └─> User experience: Still acceptable
```

---

## MES Requirements Addition

Extensions that provide observable state MUST declare:

```typescript
export const MINIMACT_EXTENSION_METADATA = {
  hooks: {
    useDomElementState: {
      // Web Worker integration
      worker: {
        script: './dom-element-state.worker.js',
        required: true,
        fallback: 'lazy-sync'
      },

      // Observable declarations
      observables: {
        hover: {
          predictableBy: ['mouseTrajectory', 'mouseVelocity'],
          leadTime: 200,           // ms before actual observation
          confidenceStrategy: 'physics-based',
          threshold: 0.7,
          bandwidth: 'low'         // Prediction is small
        },

        isIntersecting: {
          predictableBy: ['scrollVelocity', 'scrollDirection'],
          leadTime: 300,
          confidenceStrategy: 'physics-based',
          threshold: 0.7,
          bandwidth: 'low'
        },

        focus: {
          predictableBy: ['tabSequence', 'clickProximity'],
          leadTime: 100,
          confidenceStrategy: 'sequence-based',
          threshold: 0.9,          // Very high - Tab is deterministic
          bandwidth: 'low'
        },

        changesPerSecond: {
          predictableBy: [],       // Not predictable
          leadTime: 0,
          confidenceStrategy: 'none',
          threshold: 0.0,
          bandwidth: 'none',       // No pre-fetching
          note: 'Computed by worker, not pre-fetched'
        }
      }
    }
  }
};
```

---

## Summary

| Aspect | Rust Engine | Web Worker Engine |
|--------|-------------|-------------------|
| **Location** | Server | Client |
| **Predicts** | State changes | DOM observations |
| **When** | After event | Before event |
| **Strategy** | Pattern matching | Physics/Intent |
| **Confidence** | 90-95% | 70-95% |
| **Lead Time** | 0ms | 50-300ms |
| **Latency Saved** | Render time | Full round-trip |
| **Use Cases** | Button clicks, forms | Hover, scroll, focus |

**Together:** A complete prediction system that covers both deterministic state changes and probabilistic intent-based observations.

---

**The cactus has two heads. One looks at what just happened. One looks at what's about to happen.** 🌵🔮

Both save water.
