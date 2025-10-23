# Minimact Playground Design Document

## Overview

The Minimact Playground is an interactive web-based IDE where developers can:
1. Write TSX/JSX components
2. See real-time transpilation to C#
3. Run the component in a sandboxed .NET environment
4. Interact with the rendered component
5. Observe prediction cache hits/misses with visual feedback
6. Track prediction accuracy and latency metrics
7. Add usePredictHint directives to improve predictions

**URL**: `minimact.com/playground`

## User Experience Flow

### Step 1: Write Code
```typescript
// User enters TSX code
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

### Step 2: Compile (Click "Run Full Demo")
- Frontend sends C# code to backend
- Backend compiles C# to .NET assembly
- Component instantiated and initial render executed
- Rust predictor pre-computes likely state changes
- Backend returns: HTML + predictions + session ID
- **Display**: "Compiled in 234ms" badge

### Step 3: Interact (User clicks button)
```
Timeline:
0ms    → User clicks button
1ms    → Frontend sends interaction request
         (sessionId, eventType, stateChanges)

Backend:
2-5ms  → Check predictor cache
         - If HIT: Return cached patches (2-3ms total backend time)
         - If MISS: Re-render and reconcile (15-20ms total backend time)

Frontend:
6-25ms → Receive response with patches and latency
        → Display:
           🟢 "3ms CACHED" (green overlay, fades)
           OR
           🔴 "18ms COMPUTED" (red overlay, fades)
        → Update HTML via patches
        → Flash affected elements (green = hit, red = miss)
```

### Step 4: View Metrics
```
Prediction Performance

Cache Hit Rate: 87% (13/15) ▓▓▓▓▓▓▓▓░░
Avg Latency (Predicted): 2.3ms ✅
Avg Latency (Computed):  16.8ms ⏱️
Savings Per Interaction: 14.5ms 🚀

Recent Interactions:
✅ Click          3ms   (hit)
✅ Click          2ms   (hit)
❌ Click         18ms   (miss)
✅ Input          2ms   (hit)
✅ Toggle         3ms   (hit)
```

### Step 5: Improve with Hints (Optional)
```typescript
// Add to component:
usePredictHint('increment', { count: count + 1 });

// Before hints: 60% hit rate
// After hints:  94% hit rate
// ↑ +34 points!
```

## Architecture

### Frontend (React + Vite + TypeScript)

```
playground-frontend/
├── src/
│   ├── components/
│   │   ├── Editor.tsx              # Monaco editor for C# code
│   │   ├── Preview.tsx             # HTML preview in iframe
│   │   ├── PredictionOverlay.tsx   # Green/red cache visualization
│   │   ├── MetricsDashboard.tsx    # Stats and charts
│   │   ├── HintBuilder.tsx         # usePredictHint UI
│   │   ├── Sidebar.tsx             # Layout
│   │   └── Layout.tsx              # Main grid layout
│   │
│   ├── hooks/
│   │   ├── usePlayground.ts        # Compile + interact API calls
│   │   ├── usePredictionTracker.ts # Track hit/miss history
│   │   ├── useMetrics.ts           # Aggregate metrics
│   │   └── useInteraction.ts       # Handle clicks/inputs in iframe
│   │
│   ├── services/
│   │   └── playground.api.ts       # HTTP client for API
│   │
│   ├── types/
│   │   └── playground.ts           # TypeScript interfaces (matches backend)
│   │
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
│
├── public/
│   └── index.html
│
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### Backend (.NET Core)

```
Minimact.Playground/ (new project)
├── Controllers/
│   └── PlaygroundController.cs      # API endpoints
│
├── Services/
│   ├── PlaygroundService.cs         # Compilation + execution
│   └── CompilationService.cs        # C# to assembly compilation
│
├── Models/
│   ├── Requests/
│   │   ├── CompileRequest.cs
│   │   └── InteractionRequest.cs
│   │
│   └── Responses/
│       ├── CompileResponse.cs
│       ├── InteractionResponse.cs
│       └── MetricsResponse.cs
│
├── Services/
│   ├── SessionManager.cs            # Track active sessions
│   └── PredictionTracker.cs         # Track hits/misses
│
├── Program.cs                       # DI setup
└── appsettings.json
```

## API Contract

### POST /api/playground/compile

**Request**:
```json
{
  "csharpCode": "public class Counter : MinimactComponent { ... }",
  "predictHints": ["usePredictHint('increment', { count: count + 1 });"]
}
```

**Response** (200 OK):
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "html": "<div>...</div>",
  "vnode": {
    "type": "Element",
    "tag": "div",
    "props": {},
    "children": [...]
  },
  "predictions": [
    {
      "stateKey": "count",
      "predictedValue": 1,
      "confidence": 0.95
    }
  ],
  "compilationTimeMs": 234
}
```

**Error** (400 Bad Request):
```json
{
  "error": "Compilation failed",
  "details": "error CS0103: The name 'setCount' does not exist...",
  "line": 15,
  "column": 12
}
```

### POST /api/playground/interact

**Request**:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "click",
  "elementId": "button-increment",
  "stateChanges": {
    "count": 1
  }
}
```

**Response** (200 OK):
```json
{
  "elapsedMs": 3,
  "cacheHit": true,
  "latency": "3ms 🟢 CACHED",
  "actualPatches": [
    {
      "op": "UpdateText",
      "path": [0],
      "content": "Count: 1"
    }
  ],
  "predictedPatches": [
    {
      "op": "UpdateText",
      "path": [0],
      "content": "Count: 1"
    }
  ],
  "predictionConfidence": 0.95,
  "html": "<div><p>Count: 1</p><button>+1</button></div>"
}
```

### GET /api/playground/metrics/{sessionId}

**Response** (200 OK):
```json
{
  "totalInteractions": 15,
  "cacheHits": 13,
  "hitRate": 86.67,
  "avgPredictedLatency": 2.3,
  "avgComputedLatency": 16.8,
  "recentInteractions": [
    {
      "timestamp": "2024-10-23T10:15:30Z",
      "eventType": "click",
      "cacheHit": true,
      "latencyMs": 3
    },
    ...
  ]
}
```

## Key Implementation Details

### 1. Session Management

Each playground session maintains:
- Compiled component instance
- Current VNode state
- Predictor instance with learned patterns
- Metrics history
- Timeout after 30 minutes of inactivity

```csharp
public class PlaygroundSession
{
    public string SessionId { get; set; }
    public MinimactComponent Component { get; set; }
    public VNode CurrentVNode { get; set; }
    public Predictor Predictor { get; set; }
    public SessionMetrics Metrics { get; set; }
    public DateTime LastAccessTime { get; set; }
}
```

### 2. Compilation Pipeline

```
C# Code
    ↓
Roslyn Compilation
    ↓
Assembly Generation
    ↓
Type Extraction
    ↓
Reflection: Create Instance
    ↓
Call: component.Render()
    ↓
VNode
    ↓
Serialize to JSON
```

### 3. Interaction Flow

```
Frontend Sends Interaction
    ↓
Backend Gets Session
    ↓
Apply StateChanges to Component
    ↓
Check Predictor Cache
    ├─ HIT: Return Cached Patches (2-3ms)
    └─ MISS:
       ├─ Call component.Render()
       ├─ Reconcile: Reconciler.Reconcile(oldVNode, newVNode)
       ├─ Learn: predictor.Learn(...)
       └─ Return Actual Patches (15-20ms)
    ↓
Update Session Metrics
    ↓
Return Response with Timing
    ↓
Frontend Shows Green (hit) or Red (miss) Flash
```

### 4. Prediction Visualization

When interaction completes, show overlay:
- **Cache Hit (🟢 GREEN)**: "3ms CACHED - Prediction was correct!"
  - Show confidence percentage
  - Flash green highlight on changed elements
  - Fade out after 500ms

- **Cache Miss (🔴 RED)**: "18ms COMPUTED - Prediction miss"
  - Show predicted vs actual patches
  - Flash red highlight on changed elements
  - Suggest: "Add usePredictHint to improve accuracy"

### 5. Metrics Aggregation

Track per session:
- Total interactions
- Cache hits/misses
- Latency per interaction (predicted vs computed)
- Prediction confidence
- State changes

Display:
- Hit rate percentage + bar chart
- Average latencies (predicted vs computed)
- Latency savings per interaction
- Recent 10 interactions with status

## Error Handling

### Compilation Errors

User enters invalid C#:
```
❌ Compilation Failed

error CS0103: The name 'setCount' does not exist in the current context
  at Line 12, Column 8

Hint: Did you mean 'SetState(nameof(count), value)'?
```

### Runtime Errors

Component throws exception during render:
```
❌ Render Failed

Null reference exception when accessing post.Title

Stack trace:
  at Counter.Render() in generated code
  at PlaygroundService.Interact()
```

### Session Expired

Session times out after 30 minutes:
```
❌ Session Expired

Your playground session has expired.
Click "Run Full Demo" again to start a new session.
```

## Performance Considerations

### Frontend
- Monaco editor: Lazy load on first interaction
- Iframe: Keep HTML preview in separate DOM tree
- Metrics: Update every 500ms (debounced)
- Overlays: CSS animations (GPU-accelerated)

### Backend
- Session cleanup: Background task every 5 minutes
- Compilation caching: Cache assemblies by code hash (TTL: 24h)
- Predictor state: In-memory (session-local)
- Serialization: Use MessagePack for VNode if JSON too large

## Future Enhancements

### Phase 2
- Share playground links (save to database)
- Component templates (Counter, TodoList, etc.)
- Comparison mode (before/after predict hints)
- Export as downloadable component

### Phase 3
- Multi-component support (compose components)
- Time-travel debugging (step through interactions)
- AI suggestions for usePredictHint
- Performance profiling per component

### Phase 4
- Collaborative editing (multiple users in one playground)
- Component marketplace
- Integration with GitHub gists
- Progressive Web App (offline support)

## Success Metrics

- Load time: <2 seconds
- Compile time: <500ms
- Interact latency: <50ms end-to-end
- Prediction accuracy: >80% after 10 interactions
- User engagement: >5 minutes average session
- Share rate: >20% of users share a playground link

## Development Timeline

Estimate:
- Backend API: 3-4 weeks
- Frontend UI: 3-4 weeks
- Testing & Deployment: 1-2 weeks
- Polish & Optimization: 1 week

Total: ~2-3 months for MVP
