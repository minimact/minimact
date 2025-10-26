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
