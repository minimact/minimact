# Minimact Architecture Diagrams

This document contains comprehensive Mermaid diagrams showing the architecture, data flows, and messaging patterns for Minimact and Minimact Punch.

---

## Table of Contents

1. [Minimact Core Architecture](#minimact-core-architecture)
2. [Minimact Data Flow](#minimact-data-flow)
3. [Minimact Predictive Rendering](#minimact-predictive-rendering)
4. [Minimact State Synchronization](#minimact-state-synchronization)
5. [Minimact Punch Architecture](#minimact-punch-architecture)
6. [Minimact Punch Integration](#minimact-punch-integration)
7. [Complete System Overview](#complete-system-overview)

---

## Minimact Core Architecture

### System Components

```mermaid
graph TB
    subgraph "Developer Layer"
        TSX[TSX/JSX Components]
        TS[TypeScript]
    end

    subgraph "Compilation Layer"
        BABEL[Babel Plugin]
        CODEGEN[Code Generator]
    end

    subgraph "Server Runtime (.NET)"
        COMP[MinimactComponent]
        STATE[State Manager]
        RENDER[Render Engine]
        HUB[MinimactHub SignalR]
        RUST[Rust Reconciler FFI]
    end

    subgraph "Rust Engine"
        RECON[Reconciliation Engine]
        PRED[Prediction Engine]
        DIFF[VNode Differ]
    end

    subgraph "Client Runtime (Browser)"
        SIGNALR[SignalR Manager]
        PATCHER[DOM Patcher]
        HOOKS[Hook System]
        QUEUE[Hint Queue]
        BRIDGE[Playground Bridge]
    end

    subgraph "Client DOM"
        DOM[Browser DOM]
        EVENTS[Event Delegation]
    end

    TSX --> BABEL
    TS --> BABEL
    BABEL --> CODEGEN
    CODEGEN --> COMP

    COMP --> STATE
    STATE --> RENDER
    RENDER --> RUST
    RUST --> RECON
    RECON --> DIFF
    DIFF --> PRED

    PRED --> HUB
    RENDER --> HUB
    HUB --> SIGNALR

    SIGNALR --> PATCHER
    SIGNALR --> QUEUE
    PATCHER --> DOM
    QUEUE --> PATCHER

    HOOKS --> SIGNALR
    DOM --> EVENTS
    EVENTS --> SIGNALR

    PATCHER --> BRIDGE
    QUEUE --> BRIDGE
```

---

## Minimact Data Flow

### Complete Request/Response Cycle

```mermaid
sequenceDiagram
    participant User
    participant DOM
    participant EventDel as Event Delegation
    participant SignalR as SignalR Manager
    participant Hub as MinimactHub
    participant Comp as Component
    participant Rust as Rust Engine
    participant Predictor
    participant Queue as Hint Queue
    participant Patcher as DOM Patcher

    Note over User,Patcher: Initial Render
    Comp->>Rust: Render() → VNode
    Rust->>Rust: Generate patches
    Rust->>Hub: Send patches
    Hub->>SignalR: ApplyPatches
    SignalR->>Patcher: Apply to DOM
    Patcher->>DOM: Update elements

    Note over User,Patcher: Predictive Pre-Caching
    Predictor->>Rust: Predict state changes
    Rust->>Rust: Pre-compute patches
    Rust->>Hub: Send predictions
    Hub->>SignalR: QueueHint
    SignalR->>Queue: Cache patches
    Queue-->>Queue: Ready for instant use

    Note over User,Patcher: User Interaction (Cache Hit)
    User->>DOM: Click button
    DOM->>EventDel: Capture event
    EventDel->>Queue: Check for hint
    Queue-->>Queue: 🟢 CACHE HIT!
    Queue->>Patcher: Apply cached patches
    Patcher->>DOM: Instant update (0ms)
    EventDel->>SignalR: Notify server (background)
    SignalR->>Hub: InvokeComponentMethod
    Hub->>Comp: Call method
    Comp->>Comp: Update state
    Comp->>Rust: Re-render
    Rust->>Hub: Verify patches
    Hub->>SignalR: ApplyCorrection (if needed)

    Note over User,Patcher: User Interaction (Cache Miss)
    User->>DOM: Click button
    DOM->>EventDel: Capture event
    EventDel->>Queue: Check for hint
    Queue-->>Queue: 🔴 CACHE MISS
    EventDel->>SignalR: Invoke method
    SignalR->>Hub: InvokeComponentMethod
    Hub->>Comp: Call method
    Comp->>Comp: Update state
    Comp->>Rust: Re-render
    Rust->>Rust: Compute patches
    Rust->>Hub: Send patches
    Hub->>SignalR: ApplyPatches
    SignalR->>Patcher: Apply to DOM
    Patcher->>DOM: Update (~45ms latency)
```

---

## Minimact Predictive Rendering

### Prediction Pipeline

```mermaid
flowchart TD
    START[Component State Change] --> PREDICT{Can Predict?}

    PREDICT -->|Yes| CONF{Confidence >= 0.7?}
    PREDICT -->|No| RENDER[Normal Render]

    CONF -->|Yes| SEND_PRED[Send Prediction Immediately]
    CONF -->|No| RENDER

    SEND_PRED --> CLIENT_CACHE[Client Caches Patches]
    CLIENT_CACHE --> APPLY_PRED[Apply Prediction Instantly]

    APPLY_PRED --> BG_RENDER[Background: Server Renders]
    RENDER --> BG_RENDER

    BG_RENDER --> RECON[Rust Reconciliation]
    RECON --> ACTUAL_PATCHES[Actual Patches]

    ACTUAL_PATCHES --> COMPARE{Prediction Match?}

    COMPARE -->|✅ Match| NO_ACTION[No Action Needed]
    COMPARE -->|❌ Mismatch| CORRECTION[Send Correction]

    CORRECTION --> CLIENT_FIX[Client Applies Fix]

    style SEND_PRED fill:#90EE90
    style APPLY_PRED fill:#90EE90
    style NO_ACTION fill:#90EE90
    style CORRECTION fill:#FFB6C1
    style CLIENT_FIX fill:#FFB6C1
```

### Hint Queue System

```mermaid
stateDiagram-v2
    [*] --> ServerPredict: Server predicts state changes

    ServerPredict --> GeneratePatches: Rust computes patches
    GeneratePatches --> SendToClient: SignalR.send("QueueHint")
    SendToClient --> ClientCache: HintQueue caches

    ClientCache --> Waiting: Ready for interaction

    Waiting --> CheckCache: User interacts

    CheckCache --> CacheHit: Hint matches state
    CheckCache --> CacheMiss: No hint found

    CacheHit --> ApplyInstant: Apply patches (0ms)
    ApplyInstant --> NotifyServer: Background sync
    NotifyServer --> Verify: Server verifies
    Verify --> CacheHit_End: ✅ Prediction correct

    CacheMiss --> ServerRender: Request server render
    ServerRender --> WaitPatches: Wait ~45ms
    WaitPatches --> ApplyPatches: Apply new patches
    ApplyPatches --> CacheMiss_End: Update complete

    CacheHit_End --> [*]
    CacheMiss_End --> [*]
```

---

## Minimact State Synchronization

### State Sync Flow (NEW)

```mermaid
sequenceDiagram
    participant User
    participant Client as Client Hook (useState)
    participant SignalR as SignalR Manager
    participant Hub as MinimactHub
    participant Comp as MinimactComponent
    participant Rust as Rust Reconciler

    Note over User,Rust: NEW: Automatic State Sync

    User->>Client: setCount(5)
    Client->>Client: Update local state

    par Check Hint Queue
        Client->>Client: Check HintQueue
        alt Cache Hit
            Client->>Client: Apply cached patches (instant)
        else Cache Miss
            Client->>Client: No instant feedback
        end
    and Sync to Server
        Client->>SignalR: updateComponentState(componentId, "count", 5)
        SignalR->>Hub: UpdateComponentState
        Hub->>Comp: SetStateFromClient("count", 5)
        Comp->>Comp: Update internal state
        Comp->>Rust: TriggerRender()
        Rust->>Rust: Compute patches
        Rust->>Hub: Patches ready
        Hub->>SignalR: ApplyPatches (verification)
        SignalR->>Client: Patches applied
    end

    Note over User,Rust: Result: Server always has correct state!
```

### State Classification

```mermaid
graph LR
    subgraph "State Types"
        SERVER[Server State<br/>[State] attribute<br/>Source: Server]
        CLIENT[Client State<br/>useClientState<br/>Source: Client]
        COMPUTED[Client-Computed<br/>[ClientComputed]<br/>Computed on client]
        HYBRID[Hybrid State<br/>useState + sync<br/>Both client & server]
    end

    subgraph "Synchronization"
        NONE[No Sync<br/>Pure client-side]
        ONEWAY[One-Way<br/>Client → Server]
        BIDIRECTIONAL[Bidirectional<br/>Auto-sync both ways]
    end

    subgraph "Latency"
        INSTANT[~1ms<br/>Local only]
        MEDIUM[~5ms<br/>Cached patches]
        NETWORK[~45ms<br/>Network round-trip]
    end

    CLIENT --> NONE
    CLIENT --> INSTANT

    COMPUTED --> ONEWAY
    COMPUTED --> NETWORK

    SERVER --> BIDIRECTIONAL
    SERVER --> NETWORK

    HYBRID --> BIDIRECTIONAL
    HYBRID --> MEDIUM

    style HYBRID fill:#90EE90
    style MEDIUM fill:#90EE90
```

---

## Minimact Punch Architecture

### useDomElementState Overview

```mermaid
graph TB
    subgraph "Client Runtime"
        HOOK[useDomElementState hook]
        STATE[DomElementState class]
        OBSERVERS[Browser Observers]
        SNAPSHOT[State Snapshot]
    end

    subgraph "Observers Layer"
        INTERSECT[IntersectionObserver]
        MUTATION[MutationObserver]
        RESIZE[ResizeObserver]
    end

    subgraph "Reactive Properties"
        PROPS[Properties<br/>- isIntersecting<br/>- childrenCount<br/>- attributes<br/>- classList]
        COLLECTION[Collection Methods<br/>- every()<br/>- some()<br/>- filter()]
        STATS[Statistics<br/>- vals.avg()<br/>- vals.sum()<br/>- vals.median()]
    end

    subgraph "Integration"
        CONTEXT[ComponentContext]
        HINTQUEUE[HintQueue]
        SIGNALR[SignalR Manager]
        PATCHER[DOM Patcher]
    end

    subgraph "Server Side"
        CSHARP[C# DomElementStateHook]
        HUB[MinimactHub]
        PREDICTOR[Prediction Engine]
    end

    HOOK --> STATE
    STATE --> OBSERVERS

    OBSERVERS --> INTERSECT
    OBSERVERS --> MUTATION
    OBSERVERS --> RESIZE

    INTERSECT --> SNAPSHOT
    MUTATION --> SNAPSHOT
    RESIZE --> SNAPSHOT

    SNAPSHOT --> PROPS
    SNAPSHOT --> COLLECTION
    SNAPSHOT --> STATS

    STATE --> CONTEXT
    CONTEXT --> HINTQUEUE
    CONTEXT --> SIGNALR
    CONTEXT --> PATCHER

    SIGNALR --> HUB
    HUB --> CSHARP
    CSHARP --> PREDICTOR
    PREDICTOR --> HINTQUEUE
```

### DOM State Reactive Loop

```mermaid
sequenceDiagram
    participant DOM
    participant Observer as MutationObserver
    participant State as DomElementState
    participant Queue as HintQueue
    participant SignalR as SignalR Manager
    participant Server
    participant Patcher as DOM Patcher

    Note over DOM,Patcher: Setup Phase
    State->>Observer: Attach to DOM element
    Server->>SignalR: Send predicted patches
    SignalR->>Queue: Cache DOM predictions

    Note over DOM,Patcher: DOM Changes
    DOM->>DOM: Child element added
    DOM->>Observer: Mutation detected
    Observer->>State: Trigger onChange()
    State->>State: Update snapshot<br/>(childrenCount++)

    Note over DOM,Patcher: Check Predictions
    State->>Queue: matchHint(childrenCount: 3)

    alt Cache Hit (🟢)
        Queue-->>State: Hint found!
        State->>Patcher: Apply cached patches
        Patcher->>DOM: Instant update (0ms)
    else Cache Miss (🔴)
        Queue-->>State: No hint
        State->>SignalR: No instant feedback
    end

    Note over DOM,Patcher: Sync to Server
    State->>SignalR: updateDomElementState(snapshot)
    SignalR->>Server: Notify DOM change
    Server->>Server: Update state & re-render
    Server->>SignalR: Send verification patches
    SignalR->>Patcher: Apply (correction if needed)
```

---

## Minimact Punch Integration

### Hook Integration Pattern

```mermaid
flowchart LR
    subgraph "Component Context"
        STATE_MAP[state: Map]
        EFFECTS[effects: Array]
        REFS[refs: Map]
        DOM_STATES[domElementStates: Map]
        HINT_QUEUE[hintQueue: HintQueue]
        DOM_PATCHER[domPatcher: DOMPatcher]
        SIGNALR_MGR[signalR: SignalRManager]
    end

    subgraph "Hooks"
        USE_STATE[useState]
        USE_EFFECT[useEffect]
        USE_REF[useRef]
        USE_DOM[useDomElementState]
    end

    subgraph "Symmetry"
        PATTERN[Same Pattern:<br/>1. Index tracking<br/>2. Context integration<br/>3. HintQueue check<br/>4. Server sync<br/>5. Cleanup]
    end

    USE_STATE --> STATE_MAP
    USE_EFFECT --> EFFECTS
    USE_REF --> REFS
    USE_DOM --> DOM_STATES

    USE_STATE --> HINT_QUEUE
    USE_DOM --> HINT_QUEUE

    USE_STATE --> SIGNALR_MGR
    USE_DOM --> SIGNALR_MGR

    STATE_MAP --> PATTERN
    DOM_STATES --> PATTERN

    style USE_DOM fill:#FFD700
    style DOM_STATES fill:#FFD700
    style PATTERN fill:#90EE90
```

### MES Compliance Architecture

```mermaid
graph TD
    subgraph "MES Bronze - Core Integration"
        B1[✅ Component context integration]
        B2[✅ Index-based state tracking]
        B3[✅ Proper cleanup on unmount]
        B4[✅ Error handling]
        B5[✅ TypeScript declarations]
    end

    subgraph "MES Silver - Predictive"
        S1[✅ HintQueue integration]
        S2[✅ Cache hit/miss handling]
        S3[✅ Performance metrics]
        S4[✅ PlaygroundBridge notifications]
    end

    subgraph "MES Gold - Advanced"
        G1[⏳ ML-based predictions]
        G2[⏳ Adaptive learning]
        G3[⏳ Cross-component optimization]
    end

    B1 --> S1
    B2 --> S1
    B3 --> S2
    B4 --> S2
    B5 --> S2

    S1 --> G1
    S2 --> G2
    S4 --> G3

    style B1 fill:#CD7F32
    style B2 fill:#CD7F32
    style B3 fill:#CD7F32
    style B4 fill:#CD7F32
    style B5 fill:#CD7F32

    style S1 fill:#C0C0C0
    style S2 fill:#C0C0C0
    style S3 fill:#C0C0C0
    style S4 fill:#C0C0C0

    style G1 fill:#FFD700
    style G2 fill:#FFD700
    style G3 fill:#FFD700
```

---

## Complete System Overview

### End-to-End Architecture

```mermaid
graph TB
    subgraph "Developer Experience"
        DEV[Developer writes TSX]
        IDE[TypeScript IntelliSense]
    end

    subgraph "Build Time"
        BABEL[Babel Plugin]
        CODEGEN[Code Generator]
        CSHARP[C# Classes]
    end

    subgraph "Server Runtime"
        ASPNET[ASP.NET Core]
        COMPONENT[MinimactComponent]
        STATEMGR[State Manager]
        HOOKS_CS[C# Hook Implementations]
    end

    subgraph "Rust Engine"
        FFI[FFI Bridge]
        RECONCILER[Reconciliation Engine]
        PREDICTOR[Prediction Engine]
        VNODE[VNode Differ]
    end

    subgraph "SignalR Layer"
        HUB[MinimactHub]
        CONNECTION[SignalR Connection]
    end

    subgraph "Client Runtime"
        SIGNALR_CLIENT[SignalR Manager]
        HOOKS_TS[TypeScript Hooks]
        CONTEXT[Component Context]
        HINTQUEUE[Hint Queue]
        PATCHER[DOM Patcher]
        PLAYGROUND[Playground Bridge]
    end

    subgraph "minimact-punch Extension"
        DOM_STATE[DomElementState]
        OBSERVERS[DOM Observers]
        STATS[Statistical Engine]
        INTEGRATION[Integration Layer]
    end

    subgraph "Browser"
        DOM[DOM]
        EVENTS[Event System]
        WEB_APIS[Web APIs]
    end

    DEV --> BABEL
    IDE --> DEV
    BABEL --> CODEGEN
    CODEGEN --> CSHARP
    CSHARP --> COMPONENT

    COMPONENT --> STATEMGR
    COMPONENT --> HOOKS_CS
    STATEMGR --> FFI
    HOOKS_CS --> FFI

    FFI --> RECONCILER
    FFI --> PREDICTOR
    RECONCILER --> VNODE
    PREDICTOR --> VNODE

    VNODE --> HUB
    COMPONENT --> HUB
    HUB --> CONNECTION

    CONNECTION --> SIGNALR_CLIENT
    SIGNALR_CLIENT --> HOOKS_TS
    SIGNALR_CLIENT --> HINTQUEUE

    HOOKS_TS --> CONTEXT
    CONTEXT --> PATCHER
    CONTEXT --> PLAYGROUND

    HINTQUEUE --> PATCHER
    PATCHER --> DOM

    INTEGRATION --> HOOKS_TS
    INTEGRATION --> CONTEXT
    DOM_STATE --> OBSERVERS
    OBSERVERS --> WEB_APIS
    DOM_STATE --> STATS
    STATS --> INTEGRATION

    DOM --> EVENTS
    EVENTS --> SIGNALR_CLIENT
    WEB_APIS --> DOM

    style DOM_STATE fill:#FFD700
    style INTEGRATION fill:#FFD700
    style OBSERVERS fill:#FFD700
    style STATS fill:#FFD700
```

### Message Flow Matrix

```mermaid
flowchart TD
    subgraph "Client to Server Messages"
        C2S1[InvokeComponentMethod<br/>User action → Server method]
        C2S2[UpdateComponentState<br/>useState sync]
        C2S3[UpdateDomElementState<br/>useDomElementState sync]
        C2S4[UpdateClientComputedState<br/>Client-computed values]
    end

    subgraph "Server to Client Messages"
        S2C1[ApplyPatches<br/>Normal render patches]
        S2C2[ApplyPrediction<br/>Predicted patches]
        S2C3[ApplyCorrection<br/>Fix wrong prediction]
        S2C4[QueueHint<br/>Pre-cache patches]
        S2C5[UpdateComponent<br/>Full HTML replacement]
        S2C6[Error<br/>Server error]
    end

    subgraph "Message Characteristics"
        SYNC[Synchronous<br/>Block until complete]
        ASYNC[Asynchronous<br/>Fire and forget]
        BG[Background<br/>No user-visible delay]
    end

    C2S1 --> ASYNC
    C2S2 --> BG
    C2S3 --> BG
    C2S4 --> BG

    S2C1 --> SYNC
    S2C2 --> ASYNC
    S2C3 --> ASYNC
    S2C4 --> ASYNC
    S2C5 --> SYNC
    S2C6 --> ASYNC

    style C2S2 fill:#90EE90
    style C2S3 fill:#FFD700
    style S2C4 fill:#90EE90
```

---

## Performance Characteristics

### Latency Comparison

```mermaid
gantt
    title Interaction Latency by Pattern
    dateFormat X
    axisFormat %L ms

    section Traditional SSR
    Network request: 0, 20
    Server processing: 20, 30
    Network response: 30, 50
    DOM update: 50, 52
    Total Traditional: milestone, 52, 0ms

    section Minimact Cache Hit
    Check cache: 0, 1
    Apply patches: 1, 2
    Background sync: 2, 47
    Total Cache Hit: milestone, 2, 0ms

    section Minimact Cache Miss
    Network request: 0, 20
    Server processing: 20, 30
    Network response: 30, 50
    Apply patches: 50, 52
    Total Cache Miss: milestone, 52, 0ms

    section Minimact Punch Hit
    DOM observer: 0, 0.5
    Check cache: 0.5, 1
    Apply patches: 1, 2
    Background sync: 2, 47
    Total Punch Hit: milestone, 2, 0ms
```

---

## Conclusion

These diagrams illustrate the complete architecture of Minimact and Minimact Punch, showing:

1. **Component Architecture** - How pieces fit together
2. **Data Flow** - Request/response cycles
3. **Predictive Rendering** - Cache hit/miss logic
4. **State Synchronization** - NEW auto-sync pattern
5. **Minimact Punch** - DOM reactivity extension
6. **Integration Patterns** - How hooks integrate
7. **Message Flows** - SignalR communication
8. **Performance** - Latency comparisons

The key innovation: **Server and client stay synchronized automatically**, preventing stale data issues while maintaining instant user feedback through predictive caching.

🌵 The cactus knows the topology of the desert. 🍹

---

## Additional Deep-Dive Diagrams

The following diagrams provide detailed answers to common architectural questions.

---

## Component Lifecycle & Initial Load

### Initial Page Load Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Server as ASP.NET Core
    participant Rust as Rust Engine
    participant Component
    participant SignalR as SignalR Hub
    participant Client as Client Runtime

    Note over Browser,Client: 1. Initial SSR (No JavaScript Yet)
    Browser->>Server: HTTP GET /page
    Server->>Component: Create instance
    Component->>Component: OnInitializedAsync()
    Component->>Rust: Render() → VNode
    Rust->>Rust: Generate HTML
    Rust->>Server: HTML string
    Server->>Browser: Return HTML page
    Browser->>Browser: Display HTML immediately

    Note over Browser,Client: 2. Progressive Enhancement (JavaScript Loads)
    Browser->>Browser: Parse & execute ~5KB client.js
    Browser->>Client: Initialize Minimact client
    Client->>SignalR: Establish WebSocket connection

    Note over Browser,Client: 3. Component Registration
    SignalR->>Server: Connection established
    Server->>SignalR: Assign ConnectionId
    Client->>Client: Query DOM for [data-component-id]
    Client->>SignalR: RegisterComponent(componentId)
    SignalR->>Server: Store mapping: ConnectionId → ComponentId
    Server->>Component: Attach connection to instance

    Note over Browser,Client: 4. Ready State
    Component->>Rust: Generate initial predictions
    Rust->>SignalR: QueueHint messages
    SignalR->>Client: Cache predictions
    Client->>Client: System ready - instant interactions enabled

    Note over Browser,Client: Result: Page works WITHOUT JS, enhanced WITH JS
```

### Component ID Tracking

```mermaid
graph LR
    subgraph "Server-Side Rendering"
        COMP[Component Instance]
        ID[Generate GUID]
        HTML[Rendered HTML]
    end

    subgraph "HTML Output"
        ATTR[data-component-id attribute]
    end

    subgraph "Client-Side Discovery"
        DOM[DOM Query]
        MAP[ComponentId → Element Map]
    end

    subgraph "Server Registry"
        REGISTRY[Component Registry]
        CONN[ConnectionId → Component Map]
    end

    COMP --> ID
    ID --> ATTR
    ATTR --> HTML

    HTML --> DOM
    DOM --> MAP

    MAP --> REGISTRY
    REGISTRY --> CONN

    style ATTR fill:#FFD700
    style MAP fill:#90EE90
```

---

## Prediction Engine Deep Dive

### Learning & Pattern Detection

```mermaid
flowchart TD
    START[User Interaction] --> RECORD[Record to History]

    RECORD --> PATTERN{Pattern Analysis}

    PATTERN -->|Frequency Analysis| FREQ[Track state change frequency]
    PATTERN -->|Sequence Detection| SEQ[Detect interaction sequences]
    PATTERN -->|Conditional Patterns| COND[Learn conditional branches]

    FREQ --> CONFIDENCE[Calculate Confidence Score]
    SEQ --> CONFIDENCE
    COND --> CONFIDENCE

    CONFIDENCE --> THRESHOLD{Confidence >= 0.7?}

    THRESHOLD -->|Yes| GENERATE[Generate Prediction]
    THRESHOLD -->|No| SKIP[Skip prediction]

    GENERATE --> PRECOMPUTE[Pre-compute patches]
    PRECOMPUTE --> QUEUE[Queue to client]

    QUEUE --> MEASURE[Measure accuracy on use]
    MEASURE --> FEEDBACK[Adjust confidence weights]
    FEEDBACK --> PATTERN

    SKIP --> END[End]

    style GENERATE fill:#90EE90
    style QUEUE fill:#90EE90
    style CONFIDENCE fill:#FFD700
```

### Prediction Triggers & Processing

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Comp as Component
    participant Pred as Prediction Engine
    participant Rust as Rust Reconciler
    participant Queue as Hint Queue

    Note over Dev,Queue: Trigger 1: Explicit usePredictHint
    Dev->>Comp: usePredictHint('increment', {count: count+1})
    Comp->>Pred: Register hint
    Pred->>Rust: Compute patches for predicted state
    Rust->>Pred: Return patches
    Pred->>Queue: QueueHint(hintId, patches, confidence: 1.0)

    Note over Dev,Queue: Trigger 2: Automatic Pattern Learning
    Comp->>Comp: setState(newValue)
    Comp->>Pred: Notify state change
    Pred->>Pred: Analyze historical patterns
    Pred->>Pred: Detect: "count always increments by 1"
    Pred->>Rust: Compute patches for likely next state
    Rust->>Pred: Return patches
    Pred->>Queue: QueueHint(hintId, patches, confidence: 0.85)

    Note over Dev,Queue: Trigger 3: User Behavior Patterns
    Comp->>Pred: Track: User hovered button for 500ms
    Pred->>Pred: Pattern: Hover → Click (78% probability)
    Pred->>Rust: Pre-compute click result
    Rust->>Pred: Return patches
    Pred->>Queue: QueueHint(hintId, patches, confidence: 0.78)

    Note over Dev,Queue: Accuracy Feedback Loop
    Queue->>Queue: User clicked → Check cache
    Queue->>Pred: Report: Hit/Miss + actual state
    Pred->>Pred: Update pattern weights
```

### Prediction Accuracy Measurement

```mermaid
graph TB
    subgraph "Prediction Generation"
        GEN[Generate Prediction]
        CONF[Assign Confidence Score]
        CACHE[Cache on Client]
    end

    subgraph "User Interaction"
        CLICK[User Clicks]
        CHECK[Check Cache]
    end

    subgraph "Verification"
        MATCH{Patches Match?}
        HIT[Cache Hit - Correct]
        MISS[Cache Miss - Wrong]
    end

    subgraph "Feedback Loop"
        RECORD[Record Outcome]
        ANALYZE[Analyze Pattern]
        ADJUST[Adjust Weights]
    end

    GEN --> CONF
    CONF --> CACHE

    CACHE --> CLICK
    CLICK --> CHECK
    CHECK --> MATCH

    MATCH -->|Yes| HIT
    MATCH -->|No| MISS

    HIT --> RECORD
    MISS --> RECORD

    RECORD --> ANALYZE
    ANALYZE --> ADJUST
    ADJUST --> GEN

    style HIT fill:#90EE90
    style MISS fill:#FFB6C1
    style ADJUST fill:#FFD700
```

---

## Babel Plugin Transformation

### TSX to C# Example

**Input (Counter.tsx):**
```typescript
import { useState } from 'minimact';

export function Counter() {
    const [count, setCount] = useState(0);

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>
                Increment
            </button>
        </div>
    );
}
```

**Output (Counter.cs):**
```csharp
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.VNodes;

namespace MyApp.Components
{
    public partial class Counter : MinimactComponent
    {
        [State]
        private int count = 0;

        protected override VNode Render()
        {
            return new VElement("div",
                new VElement("p", $"Count: {count}"),
                new VElement("button",
                    new VAttribute("onClick", nameof(Increment)),
                    "Increment"
                )
            );
        }

        private void Increment()
        {
            count++;
            SetState(nameof(count), count);
        }
    }
}
```

### Transformation Pipeline

```mermaid
flowchart TD
    START[Counter.tsx] --> PARSE[Babel Parse AST]

    PARSE --> DETECT[Detect Hooks]
    DETECT --> HOOK_STATE{Hook Type?}

    HOOK_STATE -->|useState| GEN_STATE[Generate [State] field]
    HOOK_STATE -->|useEffect| GEN_EFFECT[Generate lifecycle method]
    HOOK_STATE -->|useRef| GEN_REF[Generate private field]

    GEN_STATE --> TRACK_DEPS[Track dependencies]
    GEN_EFFECT --> TRACK_DEPS
    GEN_REF --> TRACK_DEPS

    TRACK_DEPS --> JSX[Parse JSX]
    JSX --> BUILD_VNODE[Build VNode tree]

    BUILD_VNODE --> EVENTS{Event Handlers?}
    EVENTS -->|Yes| GEN_METHODS[Generate C# methods]
    EVENTS -->|No| CONTINUE

    GEN_METHODS --> CONTINUE[Continue]
    CONTINUE --> TYPE_MAP[Map TS types to C# types]

    TYPE_MAP --> OUTPUT[Generate Counter.cs]

    style GEN_STATE fill:#90EE90
    style BUILD_VNODE fill:#FFD700
    style OUTPUT fill:#3b82f6
```

### Type Mapping Table

```mermaid
graph LR
    subgraph "TypeScript Types"
        TS_NUM[number]
        TS_STR[string]
        TS_BOOL[boolean]
        TS_ARR[Array&lt;T&gt;]
        TS_OBJ[interface]
        TS_FUNC[Function]
    end

    subgraph "C# Types"
        CS_NUM[int / double]
        CS_STR[string]
        CS_BOOL[bool]
        CS_ARR[List&lt;T&gt;]
        CS_OBJ[class / record]
        CS_FUNC[Action / Func]
    end

    TS_NUM --> CS_NUM
    TS_STR --> CS_STR
    TS_BOOL --> CS_BOOL
    TS_ARR --> CS_ARR
    TS_OBJ --> CS_OBJ
    TS_FUNC --> CS_FUNC

    style TS_NUM fill:#3b82f6
    style TS_STR fill:#3b82f6
    style TS_BOOL fill:#3b82f6
    style CS_NUM fill:#10b981
    style CS_STR fill:#10b981
    style CS_BOOL fill:#10b981
```

---

## Security & Authorization Model

### Method Invocation Security

```mermaid
sequenceDiagram
    participant Client
    participant SignalR as SignalR Hub
    participant Auth as Authorization
    participant Registry as Component Registry
    participant Comp as Component

    Note over Client,Comp: Secure Method Invocation Flow

    Client->>SignalR: InvokeComponentMethod(componentId, "UpdateProfile", args)

    SignalR->>Auth: ValidateConnection()
    Auth->>Auth: Check User.Identity
    Auth->>Auth: Verify ConnectionId is authenticated

    alt Not Authenticated
        Auth->>Client: 401 Unauthorized
    end

    SignalR->>Registry: GetComponent(componentId)

    alt Component Not Found
        Registry->>Client: Error: Component not found
    end

    Registry->>Registry: Verify component belongs to this connection

    alt Wrong Connection
        Registry->>Client: Error: Unauthorized access
    end

    SignalR->>Comp: Check [Authorize] attribute on method

    alt Has [Authorize(Roles="Admin")]
        Comp->>Auth: Check User.IsInRole("Admin")
        Auth-->>Comp: False
        Comp->>Client: Error: Forbidden
    end

    Comp->>Comp: Validate method parameters

    alt Invalid Parameters
        Comp->>Client: Error: Validation failed
    end

    Comp->>Comp: Invoke method via reflection
    Comp->>Comp: Update state
    Comp->>Client: Success
```

### State Validation Flow

```mermaid
flowchart TD
    START[Client sends UpdateComponentState] --> AUTH{User Authenticated?}

    AUTH -->|No| REJECT1[Reject: 401 Unauthorized]
    AUTH -->|Yes| OWNER{Owns Component?}

    OWNER -->|No| REJECT2[Reject: 403 Forbidden]
    OWNER -->|Yes| VALIDATE[Validate State Value]

    VALIDATE --> TYPE{Type Valid?}
    TYPE -->|No| REJECT3[Reject: Invalid type]
    TYPE -->|Yes| RANGE{Range Valid?}

    RANGE -->|No| REJECT4[Reject: Out of range]
    RANGE -->|Yes| SANITIZE[Sanitize Input]

    SANITIZE --> CUSTOM{Custom Validator?}
    CUSTOM -->|Yes| RUN_VALIDATOR[Run validation logic]
    CUSTOM -->|No| APPLY

    RUN_VALIDATOR --> VALID{Valid?}
    VALID -->|No| REJECT5[Reject: Custom validation failed]
    VALID -->|Yes| APPLY[Apply state change]

    APPLY --> LOG[Log change for audit]
    LOG --> SUCCESS[Success]

    style REJECT1 fill:#FFB6C1
    style REJECT2 fill:#FFB6C1
    style REJECT3 fill:#FFB6C1
    style REJECT4 fill:#FFB6C1
    style REJECT5 fill:#FFB6C1
    style SUCCESS fill:#90EE90
```

### Security Layers

```mermaid
graph TB
    subgraph "Layer 1: Connection Security"
        SSL[HTTPS/WSS Only]
        AUTH[ASP.NET Core Authentication]
        SESSION[Session Management]
    end

    subgraph "Layer 2: Component Ownership"
        REGISTRY[Component Registry]
        MAPPING[ConnectionId → Component]
        ISOLATION[Per-connection isolation]
    end

    subgraph "Layer 3: Method Authorization"
        ATTR[Authorize Attributes]
        ROLES[Role-based access]
        CLAIMS[Claims-based access]
    end

    subgraph "Layer 4: Input Validation"
        TYPE_CHECK[Type validation]
        RANGE_CHECK[Range validation]
        SANITIZE[Input sanitization]
        CUSTOM[Custom validators]
    end

    subgraph "Layer 5: Rate Limiting"
        THROTTLE[Request throttling]
        QUOTA[Per-user quotas]
        ABUSE[Abuse detection]
    end

    SSL --> REGISTRY
    AUTH --> REGISTRY
    SESSION --> REGISTRY

    REGISTRY --> ATTR
    MAPPING --> ATTR
    ISOLATION --> ATTR

    ATTR --> TYPE_CHECK
    ROLES --> TYPE_CHECK
    CLAIMS --> TYPE_CHECK

    TYPE_CHECK --> THROTTLE
    RANGE_CHECK --> THROTTLE
    SANITIZE --> THROTTLE
    CUSTOM --> THROTTLE

    style SSL fill:#90EE90
    style AUTH fill:#90EE90
    style ATTR fill:#FFD700
    style TYPE_CHECK fill:#3b82f6
```

### Example: Preventing Malicious State Updates

```mermaid
sequenceDiagram
    participant Attacker as Malicious Client
    participant SignalR
    participant Validator
    participant Component

    Note over Attacker,Component: Attack Attempt: Send Invalid State

    Attacker->>SignalR: UpdateComponentState("count", 999999999)

    SignalR->>Validator: Validate state change

    Validator->>Validator: Check type: int ✓
    Validator->>Validator: Check range: > max allowed (1000)

    Validator->>Attacker: ❌ Error: Value exceeds maximum (1000)

    Note over Attacker,Component: Attack Attempt: Access Other User's Component

    Attacker->>SignalR: InvokeComponentMethod("other-user-component", "DeleteAccount")

    SignalR->>SignalR: Verify component ownership
    SignalR->>SignalR: ComponentId belongs to different ConnectionId

    SignalR->>Attacker: ❌ Error: Unauthorized access to component

    Note over Attacker,Component: Attack Attempt: Call Protected Method

    Attacker->>SignalR: InvokeComponentMethod("admin-panel", "DeleteAllUsers")

    SignalR->>Component: Check [Authorize(Roles="Admin")]
    Component->>Component: User.IsInRole("Admin") = false

    Component->>Attacker: ❌ Error: Forbidden - Admin role required

    Note over Attacker,Component: Result: All attacks blocked by security layers
```

---

## Conclusion

These additional diagrams provide deep dives into:

1. **Component Lifecycle** - From initial SSR through SignalR connection to ready state
2. **Prediction Engine** - Learning patterns, triggers, and accuracy measurement
3. **Babel Transformation** - Concrete TSX→C# examples with type mapping
4. **Security Model** - Multi-layer security with validation and authorization

Together with the original diagrams, this provides complete architectural documentation for Minimact.

**The cactus doesn't just survive—it thrives by knowing what comes next.** 🌵⚡

---

## Developer Workflow & Experience

The following diagrams show how developers actually build and iterate on Minimact applications.

---

## Project Setup & Scaffolding

### New Project Creation

```mermaid
flowchart TD
    START[minimact new my-app] --> SCAFFOLD[Run scaffolding tool]

    SCAFFOLD --> CREATE_DIRS[Create directory structure]
    CREATE_DIRS --> GEN_FILES[Generate template files]
    GEN_FILES --> INSTALL[Install dependencies]

    INSTALL --> NPM[npm install]
    INSTALL --> DOTNET[dotnet restore]

    NPM --> READY[Project ready]
    DOTNET --> READY

    READY --> SHOW[Display welcome message]

    style SCAFFOLD fill:#3b82f6
    style READY fill:#90EE90
```

### Generated Project Structure

```mermaid
graph TB
    subgraph "Project Root"
        ROOT[my-app/]
    end

    subgraph "Source Code"
        SRC[src/]
        COMP[components/]
        PAGES[pages/]
        TEMPLATES[templates/]
        SERVICES[services/]
    end

    subgraph "Component Files"
        TSX[Counter.tsx<br/>Developer writes]
        CS_GEN[Counter.cs<br/>Generated - do not edit]
        CS_BEHIND[Counter.codebehind.cs<br/>Optional - business logic]
    end

    subgraph "Configuration"
        BABEL[babel.config.js<br/>Minimact plugin]
        TSCONFIG[tsconfig.json<br/>TypeScript config]
        CSPROJ[MyApp.csproj<br/>C# project file]
        PROGRAM[Program.cs<br/>ASP.NET setup]
    end

    subgraph "Client Assets"
        WWWROOT[wwwroot/]
        CLIENT_JS[minimact-client.js<br/>~5KB runtime]
        STATIC[static assets]
    end

    subgraph "Build Output"
        BIN[bin/]
        OBJ[obj/]
        DIST[dist/]
    end

    ROOT --> SRC
    ROOT --> WWWROOT
    ROOT --> BABEL
    ROOT --> TSCONFIG
    ROOT --> CSPROJ
    ROOT --> PROGRAM
    ROOT --> BIN

    SRC --> COMP
    SRC --> PAGES
    SRC --> TEMPLATES
    SRC --> SERVICES

    COMP --> TSX
    COMP --> CS_GEN
    COMP --> CS_BEHIND

    WWWROOT --> CLIENT_JS
    WWWROOT --> STATIC

    style TSX fill:#3b82f6
    style CS_GEN fill:#f59e0b
    style CS_BEHIND fill:#10b981
```

---

## Development Loop

### Inner Development Loop

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant IDE as VS Code/Rider
    participant Watch as File Watcher
    participant Babel as Babel Plugin
    participant DotNet as .NET Compiler
    participant Server as Dev Server
    participant Browser

    Note over Dev,Browser: Developer Iteration Cycle

    Dev->>IDE: Edit Counter.tsx
    IDE->>IDE: Save file

    IDE->>Watch: File change detected
    Watch->>Babel: Transform Counter.tsx

    Babel->>Babel: Parse TSX AST
    Babel->>Babel: Generate C# code
    Babel->>CS_File: Write Counter.cs

    Note over Watch,Server: Automatic Build
    Watch->>DotNet: Trigger incremental build
    DotNet->>DotNet: Compile Counter.cs

    alt Compilation Error
        DotNet->>IDE: Show error in Problems panel
        IDE->>Dev: Display error
    else Success
        DotNet->>Server: Hot reload (if supported)
        alt Hot Reload Available
            Server->>Browser: Inject update (no refresh)
        else No Hot Reload
            Dev->>Browser: Manual refresh F5
        end
        Browser->>Browser: Re-render component
    end

    Note over Dev,Browser: Changes visible in ~2-3 seconds
```

### File Save Cascade

```mermaid
flowchart LR
    SAVE[Save Counter.tsx] --> DETECT[File Watcher]

    DETECT --> BABEL{Babel Transform}

    BABEL -->|Generate| CS[Counter.cs]
    BABEL -->|Error| TS_ERR[TypeScript Error<br/>Show in IDE]

    CS --> COMPILE{C# Compile}

    COMPILE -->|Success| HOT{Hot Reload?}
    COMPILE -->|Error| CS_ERR[C# Error<br/>Show in IDE]

    HOT -->|Yes| INJECT[Inject changes]
    HOT -->|No| MANUAL[Manual refresh]

    INJECT --> BROWSER[Browser updates]
    MANUAL --> BROWSER

    style SAVE fill:#3b82f6
    style BROWSER fill:#90EE90
    style TS_ERR fill:#FFB6C1
    style CS_ERR fill:#FFB6C1
```

---

## Build Pipeline

### Development Build

```mermaid
flowchart TD
    START[minimact dev] --> CLEAN[Clean previous build]

    CLEAN --> WATCH_START[Start file watchers]

    WATCH_START --> BABEL_WATCH[Babel: Watch *.tsx]
    WATCH_START --> DOTNET_WATCH[dotnet: Watch *.cs]

    BABEL_WATCH --> TRANSFORM[Transform all .tsx → .cs]
    TRANSFORM --> COMPILE[dotnet build]

    COMPILE --> RUN[dotnet run]

    RUN --> SERVE[Start Kestrel server]
    SERVE --> SIGNALR[Initialize SignalR hub]
    SIGNALR --> READY[Server ready on localhost:5000]

    READY --> LOOP[Watch loop active]

    style READY fill:#90EE90
    style LOOP fill:#FFD700
```

### Production Build

```mermaid
flowchart TD
    START[minimact build] --> CLEAN[Clean output]

    CLEAN --> BABEL[Babel: Transform all .tsx]
    BABEL --> VERIFY[Verify no TypeScript errors]

    VERIFY --> COMPILE[dotnet publish -c Release]

    COMPILE --> OPTIMIZE[Optimize C# code]
    OPTIMIZE --> MINIFY[Minify client.js]
    MINIFY --> BUNDLE[Bundle assets]

    BUNDLE --> OUTPUT[Output to /dist]

    OUTPUT --> ARTIFACTS{Build artifacts}

    ARTIFACTS --> DLLS[*.dll assemblies]
    ARTIFACTS --> WWWROOT[wwwroot/ static files]
    ARTIFACTS --> RUNTIME[ASP.NET runtime files]

    style OUTPUT fill:#90EE90
```

---

## Code-Behind Pattern

### When to Use Code-Behind

```mermaid
graph TB
    subgraph "Counter.tsx - UI Logic"
        TSX_UI["export function Counter() {
  const [count, setCount] = useState(0);
  const data = useServerData();

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
    </div>
  );
}"]
    end

    subgraph "Counter.cs - Generated (Don't Edit)"
        CS_GEN["public partial class Counter : MinimactComponent {
  [State] private int count = 0;

  protected override VNode Render() {
    var data = UseServerData();
    return new VElement(...);
  }

  private void increment() {
    count++;
    SetState(nameof(count), count);
  }
}"]
    end

    subgraph "Counter.codebehind.cs - Business Logic"
        CS_BEHIND["public partial class Counter {
  private readonly AppDbContext _db;

  public Counter(AppDbContext db) {
    _db = db;
  }

  private async Task<UserData> UseServerData() {
    return await _db.Users
      .Where(u => u.Id == UserId)
      .Include(u => u.Orders)
      .FirstOrDefaultAsync();
  }
}"]
    end

    TSX_UI -->|Babel transforms| CS_GEN
    CS_GEN -->|partial class| CS_BEHIND

    style TSX_UI fill:#3b82f6
    style CS_GEN fill:#f59e0b
    style CS_BEHIND fill:#10b981
```

### Code-Behind Use Cases

```mermaid
flowchart TD
    QUESTION{What are you doing?}

    QUESTION -->|UI state & logic| TSX[Write in .tsx only]
    QUESTION -->|Database queries| CODEBEHIND[Use .codebehind.cs]
    QUESTION -->|API calls| CODEBEHIND
    QUESTION -->|Complex validation| CODEBEHIND
    QUESTION -->|Business rules| CODEBEHIND
    QUESTION -->|DI services| CODEBEHIND

    TSX --> TSX_RESULT[Babel handles everything]
    CODEBEHIND --> CS_RESULT[Manual C# code<br/>Full .NET power]

    style TSX fill:#3b82f6
    style CODEBEHIND fill:#10b981
```

---

## Developer Commands

### Common Workflows

```mermaid
graph LR
    subgraph "Development Commands"
        DEV[minimact dev]
        BUILD[minimact build]
        NEW_COMP[minimact new component]
        NEW_PAGE[minimact new page]
        TEST[minimact test]
    end

    subgraph "What They Do"
        DEV_DESC["Start dev server
        - File watching
        - Hot reload
        - Source maps"]

        BUILD_DESC["Production build
        - Optimize
        - Minify
        - Bundle"]

        COMP_DESC["Scaffold component
        - Counter.tsx
        - Optional .codebehind.cs"]

        PAGE_DESC["Scaffold page
        - Route setup
        - Template"]

        TEST_DESC["Run tests
        - Unit tests
        - Integration tests"]
    end

    DEV --> DEV_DESC
    BUILD --> BUILD_DESC
    NEW_COMP --> COMP_DESC
    NEW_PAGE --> PAGE_DESC
    TEST --> TEST_DESC

    style DEV fill:#3b82f6
    style BUILD fill:#10b981
```

---

## Debugging Experience

### Error Handling & Display

```mermaid
sequenceDiagram
    participant Dev
    participant IDE
    participant Babel
    participant Compiler
    participant Server
    participant Browser
    participant Playground

    Note over Dev,Playground: TypeScript Error
    Dev->>IDE: Write invalid TSX
    IDE->>IDE: TypeScript LSP check
    IDE->>Dev: Red squiggle + error
    Dev->>IDE: Save anyway
    IDE->>Babel: Transform
    Babel->>IDE: ❌ Syntax Error
    IDE->>Dev: Show in Problems panel

    Note over Dev,Playground: C# Compilation Error
    Dev->>IDE: Reference undefined method
    Babel->>Compiler: Generate .cs
    Compiler->>Compiler: ❌ Cannot resolve method
    Compiler->>IDE: Error CS0103
    IDE->>Dev: Show in Problems panel

    Note over Dev,Playground: Runtime Error (Server)
    Dev->>Browser: Trigger action
    Browser->>Server: SignalR method call
    Server->>Server: ❌ NullReferenceException
    Server->>Browser: Error message
    Browser->>Dev: Console error
    Server->>IDE: Exception in Output panel

    Note over Dev,Playground: Runtime Error (Client)
    Browser->>Browser: ❌ Cannot apply patch
    Browser->>Playground: Show error in bridge
    Playground->>Dev: Visual indicator
    Browser->>Dev: Console error with stack trace
```

### Debugging Tools

```mermaid
graph TB
    subgraph "IDE Debugging"
        BREAKPOINT[C# Breakpoints]
        WATCH[Watch Variables]
        CALL_STACK[Call Stack]
        IMMEDIATE[Immediate Window]
    end

    subgraph "Browser DevTools"
        CONSOLE[Console Logging]
        NETWORK[SignalR Traffic]
        ELEMENTS[DOM Inspection]
        PERF[Performance Timeline]
    end

    subgraph "Minimact Tools"
        PLAYGROUND[Playground Bridge]
        HINTS[Hint Queue Viewer]
        PATCHES[Patch Inspector]
        METRICS[Performance Metrics]
    end

    BREAKPOINT --> SERVER_DEBUG[Debug server-side logic]
    WATCH --> SERVER_DEBUG

    CONSOLE --> CLIENT_DEBUG[Debug client-side]
    NETWORK --> CLIENT_DEBUG

    PLAYGROUND --> VISUAL[Visual debugging]
    HINTS --> VISUAL
    PATCHES --> VISUAL

    style PLAYGROUND fill:#FFD700
    style BREAKPOINT fill:#3b82f6
    style CONSOLE fill:#10b981
```

---

## Integration Points

### Adding Database (EF Core)

```mermaid
flowchart TD
    START[Need database access] --> INSTALL[Install EF Core packages]

    INSTALL --> CONTEXT[Create DbContext]

    CONTEXT --> MODELS[Define entity models]

    MODELS --> REGISTER[Register in Program.cs]

    REGISTER --> CONFIG["services.AddDbContext<AppDbContext>(...)"]

    CONFIG --> MIGRATE[Create migrations]

    MIGRATE --> USE[Use in component]

    USE --> INJECT[Inject via constructor]

    INJECT --> CODEBEHIND[Write queries in .codebehind.cs]

    CODEBEHIND --> EXAMPLE["private async Task<List<Todo>> LoadTodos() {
  return await _db.Todos
    .Where(t => t.UserId == UserId)
    .ToListAsync();
}"]

    style CONFIG fill:#3b82f6
    style CODEBEHIND fill:#10b981
```

### Adding Authentication

```mermaid
flowchart LR
    START[Add auth] --> CHOOSE{Auth type?}

    CHOOSE -->|Cookie| COOKIE[ASP.NET Identity]
    CHOOSE -->|JWT| JWT[JWT tokens]
    CHOOSE -->|OAuth| OAUTH[External providers]

    COOKIE --> SETUP_COOKIE[Configure in Program.cs]
    JWT --> SETUP_JWT[Configure JWT middleware]
    OAUTH --> SETUP_OAUTH[Configure OAuth providers]

    SETUP_COOKIE --> USE_AUTH[Use in components]
    SETUP_JWT --> USE_AUTH
    SETUP_OAUTH --> USE_AUTH

    USE_AUTH --> ATTR["[Authorize] attribute"]
    USE_AUTH --> USER[Access User.Identity]
    USE_AUTH --> CLAIMS[Access User.Claims]

    style ATTR fill:#10b981
```

### Project Integration Overview

```mermaid
graph TB
    subgraph "Minimact Component"
        COMP[MyComponent.tsx]
        CODEBEHIND[MyComponent.codebehind.cs]
    end

    subgraph "ASP.NET Core Services"
        DB[(Database<br/>EF Core)]
        AUTH[Authentication]
        DI[Dependency Injection]
        CONFIG[Configuration]
        LOGGING[Logging]
    end

    subgraph "External Services"
        API[External APIs]
        CACHE[Redis Cache]
        QUEUE[Message Queue]
        STORAGE[Blob Storage]
    end

    CODEBEHIND --> DB
    CODEBEHIND --> AUTH
    CODEBEHIND --> DI
    CODEBEHIND --> CONFIG
    CODEBEHIND --> LOGGING

    CODEBEHIND --> API
    CODEBEHIND --> CACHE
    CODEBEHIND --> QUEUE
    CODEBEHIND --> STORAGE

    style COMP fill:#3b82f6
    style CODEBEHIND fill:#10b981
    style DB fill:#FFD700
```

---

## Complete Developer Journey

### From Zero to Deployed App

```mermaid
flowchart TD
    START[Developer starts] --> INSTALL[Install Minimact CLI]

    INSTALL --> CREATE[minimact new my-app]

    CREATE --> STRUCTURE[Project scaffolded]

    STRUCTURE --> DEV_START[minimact dev]

    DEV_START --> WRITE[Write components in TSX]

    WRITE --> SAVE[Save file]

    SAVE --> AUTO_BUILD[Automatic build & reload]

    AUTO_BUILD --> BROWSER[See changes in browser]

    BROWSER --> DEBUG{Need debugging?}

    DEBUG -->|Yes| BREAKPOINT[Set C# breakpoints]
    DEBUG -->|No| MORE{More features?}

    BREAKPOINT --> BROWSER

    MORE -->|Yes| ADD_DB[Add database]
    MORE -->|No| READY[Ready for production]

    ADD_DB --> ADD_AUTH[Add authentication]
    ADD_AUTH --> ADD_API[Add API integration]
    ADD_API --> TEST[Write tests]

    TEST --> READY

    READY --> BUILD_PROD[minimact build]

    BUILD_PROD --> DEPLOY[Deploy to Azure/AWS]

    DEPLOY --> LIVE[App is live! 🎉]

    style START fill:#3b82f6
    style LIVE fill:#90EE90
    style WRITE fill:#FFD700
```

---

## Conclusion - Developer Experience

These diagrams show the complete developer workflow:

1. **Project Setup** - Scaffolding and structure
2. **Development Loop** - Inner loop with file watching and hot reload
3. **Build Pipeline** - Dev vs production builds
4. **Code-Behind Pattern** - When and how to use it
5. **Commands** - Common workflows and CLI
6. **Debugging** - Tools and error handling
7. **Integration** - Database, auth, and services
8. **Journey** - End-to-end developer experience

**The cactus knows not just the topology, but how to navigate it.** 🌵🧭
