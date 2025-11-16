# 🌵 Phase 5: Interactive Components + SignalM² Transport

**Goal:** Make components fully interactive using SignalM with Tauri transport (local execution)

---

## 💡 The Architecture Shift

**We're NOT removing SignalM. We're evolving it!**

**SignalM² = SignalM with pluggable transports**

```
┌────────────────────────────────────────┐
│     MINIMACT APPLICATION CODE          │
│  (STAYS THE SAME!)                     │
│                                        │
│  signalM.send('UpdateState', data)     │
│  signalM.on('ApplyPatches', handler)   │
└────────────┬───────────────────────────┘
             │
      [SignalM Core API]
             │
      ┌──────┴──────┐
      ▼             ▼
┌──────────┐  ┌──────────┐
│ SignalR  │  │  Tauri   │  ← Phase 5 adds this!
│Transport │  │Transport │
│ (Web)    │  │ (Local)  │
└────┬─────┘  └────┬─────┘
     │             │
     ▼             ▼
┌─────────┐  ┌──────────┐
│ Remote  │  │  Native  │
│ Server  │  │   AOT    │
│         │  │ Runtime  │
└─────────┘  └──────────┘
```

**Key Insight:** Same API, different transport underneath!

---

## 📋 What We're Building

### Phase 5 Tasks

1. ✅ **Keep SignalM API** - No changes to application code
2. 🆕 **Create Transport Interface** - `ISignalMTransport`
3. 🆕 **Implement Tauri Transport** - Local IPC instead of WebSocket
4. 🆕 **Add Auto-Detection** - `SignalM.createAuto()` picks transport
5. 🆕 **Tauri Backend Handler** - Route SignalM messages to Native AOT
6. 🆕 **Event Emission** - Server→Client messages via Tauri events

---

## 🔄 The Complete Flow

### User Clicks Button

```
1. DOM Event (JavaScript)
      ↓
2. signalM.send('TriggerEvent', 'OnClick_123')
      ↓
3. TauriTransport.send()
      ↓
4. invoke('signalm_invoke', { method: 'TriggerEvent', ... })
      ↓
5. Tauri IPC (in-process, 0.1ms)
      ↓
6. signalm_invoke() in Rust
      ↓
7. dotnet::trigger_event() → Native AOT Runtime
      ↓
8. Execute C# event handler
      ↓
9. component.Render() → New VNode
      ↓
10. Rust reconciler → Generate patches
      ↓
11. app.emit_all('signalm-message', { method: 'ApplyPatches', patches })
      ↓
12. Tauri event → TauriTransport.handleMessage()
      ↓
13. signalM handler: on('ApplyPatches', ...)
      ↓
14. applyPatchesToDOM()
      ↓
✅ UI updates in ~3ms! (ALL LOCAL!)
```

---

## 🏗️ Implementation

### Task 1: Create Transport Interface

**src/core/signalm/transport.ts (NEW):**

```typescript
export interface ISignalMTransport {
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Messaging
  send(method: string, ...args: any[]): Promise<any>;
  on(method: string, handler: (...args: any[]) => void): void;
  off(method: string, handler: (...args: any[]) => void): void;

  // Events (optional)
  onReconnecting?(callback: () => void): void;
  onReconnected?(callback: () => void): void;
  onClose?(callback: (error?: Error) => void): void;
}
```

---

### Task 2: Tauri Transport Implementation

**src/core/signalm/tauri-transport.ts (NEW):**

```typescript
import { invoke } from '@tauri-apps/api/tauri';
import { listen, Event as TauriEvent } from '@tauri-apps/api/event';
import { ISignalMTransport } from './transport';

export class TauriTransport implements ISignalMTransport {
  private handlers = new Map<string, Set<Function>>();
  private connected = false;
  private unlistenFunctions: (() => void)[] = [];

  async connect(): Promise<void> {
    // Listen for messages from Native AOT runtime
    const unlisten = await listen('signalm-message', (event: TauriEvent<any>) => {
      const { method, args } = event.payload;
      this.handleMessage(method, args);
    });

    this.unlistenFunctions.push(unlisten);
    this.connected = true;

    console.log('[SignalM²] Tauri transport connected (local mode)');
  }

  async disconnect(): Promise<void> {
    for (const unlisten of this.unlistenFunctions) {
      unlisten();
    }
    this.unlistenFunctions = [];
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async send(method: string, ...args: any[]): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected');
    }

    console.log('[SignalM²] → Runtime:', method);

    // Call Tauri command (in-process, ~0.1ms)
    return await invoke('signalm_invoke', { method, args });
  }

  on(method: string, handler: (...args: any[]) => void): void {
    if (!this.handlers.has(method)) {
      this.handlers.set(method, new Set());
    }
    this.handlers.get(method)!.add(handler);
  }

  off(method: string, handler: (...args: any[]) => void): void {
    this.handlers.get(method)?.delete(handler);
  }

  private handleMessage(method: string, args: any[]) {
    const handlers = this.handlers.get(method);
    if (handlers) {
      for (const handler of handlers) {
        handler(...args);
      }
    }
  }
}
```

---

### Task 3: SignalM Core with Auto-Detection

**src/core/signalm/signalm.ts (UPDATE):**

```typescript
import { ISignalMTransport } from './transport';
import { SignalRTransport } from './signalr-transport';
import { TauriTransport } from './tauri-transport';

export class SignalM {
  private transport: ISignalMTransport;

  constructor(transport: ISignalMTransport) {
    this.transport = transport;
  }

  // Factory methods
  static createWebTransport(url: string): SignalM {
    return new SignalM(new SignalRTransport(url));
  }

  static createTauriTransport(): SignalM {
    return new SignalM(new TauriTransport());
  }

  // 🎯 AUTO-DETECT ENVIRONMENT
  static createAuto(fallbackUrl?: string): SignalM {
    if (window.__TAURI__) {
      console.log('[SignalM²] Detected Tauri → Using local transport');
      return SignalM.createTauriTransport();
    }

    console.log('[SignalM²] Web environment → Using SignalR transport');
    return SignalM.createWebTransport(fallbackUrl || 'http://localhost:5000/minimact');
  }

  // Core API (unchanged!)
  async connect(): Promise<void> {
    await this.transport.connect();
  }

  async disconnect(): Promise<void> {
    await this.transport.disconnect();
  }

  isConnected(): boolean {
    return this.transport.isConnected();
  }

  async send(method: string, ...args: any[]): Promise<any> {
    return await this.transport.send(method, ...args);
  }

  on(method: string, handler: (...args: any[]) => void): void {
    this.transport.on(method, handler);
  }

  off(method: string, handler: (...args: any[]) => void): void {
    this.transport.off(method, handler);
  }
}
```

---

### Task 4: Tauri Backend Handler

**src-tauri/src/signalm.rs (NEW):**

```rust
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize)]
struct SignalMMessage {
    method: String,
    args: Vec<serde_json::Value>,
}

#[tauri::command]
pub async fn signalm_invoke(
    app: AppHandle,
    method: String,
    args: Vec<serde_json::Value>
) -> Result<serde_json::Value, String> {
    println!("[SignalM²] Routing: {}", method);

    // Route to appropriate Native AOT handler
    match method.as_str() {
        "Initialize" => {
            let csharp = args[0].as_str().ok_or("Missing C# source")?;
            crate::dotnet::initialize_component(csharp)
        }

        "UpdateComponentState" => {
            let component_id = args[0].as_str().ok_or("Missing componentId")?;
            let state_key = args[1].as_str().ok_or("Missing stateKey")?;
            let value = &args[2];

            crate::dotnet::update_component_state(component_id, state_key, value.clone())
        }

        "UpdateDomElementState" => {
            let component_id = args[0].as_str().ok_or("Missing componentId")?;
            let state_key = args[1].as_str().ok_or("Missing stateKey")?;
            let snapshot = &args[2];

            crate::dotnet::update_dom_element_state(component_id, state_key, snapshot.clone())
        }

        "TriggerEvent" => {
            let component_id = args[0].as_str().ok_or("Missing componentId")?;
            let event_name = args[1].as_str().ok_or("Missing eventName")?;
            let event_data = args.get(2);

            // Execute event handler in Native AOT
            let patches = crate::dotnet::trigger_event(
                component_id,
                event_name,
                event_data.cloned()
            )?;

            // Send patches back via Tauri event
            app.emit_all("signalm-message", SignalMMessage {
                method: "ApplyPatches".to_string(),
                args: vec![patches]
            }).map_err(|e| e.to_string())?;

            Ok(serde_json::json!({ "success": true }))
        }

        _ => Err(format!("Unknown SignalM method: {}", method))
    }
}
```

**src-tauri/src/main.rs (UPDATE):**

```rust
mod signalm;
mod dotnet;
mod reconciler;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            signalm::signalm_invoke,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

### Task 5: Update Application Code

**src/App.tsx (MINIMAL CHANGES!):**

```typescript
import { SignalM } from './core/signalm/signalm';
import { useEffect, useRef } from 'react';

export default function App() {
  const signalMRef = useRef<SignalM | null>(null);

  useEffect(() => {
    // 🎯 AUTO-DETECT: Uses Tauri in Cactus Browser, SignalR in web
    const signalM = SignalM.createAuto();

    // Set up handlers (SAME AS BEFORE!)
    signalM.on('ApplyPatches', (patches) => {
      console.log('[App] Applying patches:', patches);
      applyPatchesToDOM(patches);
    });

    // Connect
    signalM.connect().then(() => {
      console.log('[App] SignalM² connected!');
      signalMRef.current = signalM;
    });

    return () => {
      signalM.disconnect();
    };
  }, []);

  async function loadComponent(csharp: string) {
    if (!signalMRef.current) return;

    // Initialize component (SAME API AS BEFORE!)
    await signalMRef.current.send('Initialize', csharp);
  }

  // ... rest stays the same!
}
```

**THE APPLICATION CODE DOESN'T CHANGE! 🎉**

---

## 📊 Performance Comparison

| Metric | SignalR (Web) | SignalM² + Tauri (Local) |
|--------|---------------|--------------------------|
| **Connection** | 50-100ms | 0ms (no network) |
| **send() Latency** | 10-50ms | **0.1ms** ⚡ |
| **Round-trip** | 50-200ms | **3ms** ⚡ |
| **Throughput** | 1K msg/s | 100K msg/s |
| **Network** | Required | None needed |

---

## ✅ Success Criteria

- [ ] `ISignalMTransport` interface defined
- [ ] `TauriTransport` implemented
- [ ] `SignalM.createAuto()` auto-detects environment
- [ ] Tauri `signalm_invoke` command routes messages
- [ ] Tauri events emit server→client messages
- [ ] Application code uses `SignalM.createAuto()`
- [ ] Button clicks trigger events locally
- [ ] State updates apply patches to DOM
- [ ] **Total latency < 5ms**
- [ ] **Zero network calls**
- [ ] **Works offline 100%**

---

## 🧪 Testing

### Test 1: Counter (Button Click)

**Component:**
```tsx
export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

**Expected Flow:**
1. Click button
2. `signalM.send('TriggerEvent', 'OnClick_xyz')`
3. Tauri → Native AOT → Execute handler
4. `count++`, re-render
5. Rust reconciler → patches
6. Tauri event → Apply patches
7. **Text updates: "Count: 0" → "Count: 1" in 3ms**

---

### Test 2: Todo List (Add Item)

**Component:**
```tsx
export function TodoList() {
  const [todos, setTodos] = useState([]);
  return (
    <div>
      <button onClick={() => setTodos([...todos, 'New'])}>Add</button>
      <ul>{todos.map(t => <li>{t}</li>)}</ul>
    </div>
  );
}
```

**Expected:**
- Click "Add"
- New `<li>` appears instantly
- **Latency: 3-5ms**

---

## 🚀 Benefits of This Approach

### 1. **Zero Breaking Changes**
All existing Minimact code works:
```typescript
// This code runs in BOTH web AND Cactus Browser!
await signalM.send('UpdateComponentState', componentId, stateKey, value);
signalM.on('ApplyPatches', (patches) => applyPatches(patches));
```

### 2. **Progressive Enhancement**
Start with Tauri (local), add SignalR later for web deployment:
```typescript
const signalM = SignalM.createAuto();
// Uses Tauri in Cactus Browser
// Uses SignalR when deployed to web
// SAME CODE! 🎉
```

### 3. **Future-Proof**
Add more transports without changing application code:
- WebRTC for P2P
- gRPC for microservices
- Native messaging for browser extensions

### 4. **Clean Architecture**
Transport layer is completely abstracted away.

---

## 📁 File Structure

```
cactus-browser/
├── src/
│   └── core/
│       └── signalm/
│           ├── transport.ts           ✨ NEW: Interface
│           ├── signalr-transport.ts   🔄 WRAP: Existing SignalR
│           ├── tauri-transport.ts     ✨ NEW: Tauri IPC
│           └── signalm.ts             🔄 UPDATE: Add auto-detect
│
├── src-tauri/
│   └── src/
│       ├── signalm.rs                 ✨ NEW: SignalM handler
│       ├── dotnet.rs                  🔄 UPDATE: Native AOT calls
│       └── main.rs                    🔄 UPDATE: Add signalm_invoke
│
└── minimact-runtime/
    ├── EventHandler.cs                ✨ NEW: Handle events
    ├── ComponentExecutor.cs           🔄 UPDATE: Store VNode state
    └── RustReconciler.cs              ✅ EXISTS: Reconcile VNodes
```

---

## 🎉 The Result

**SignalM API stays unchanged.**

**All application code keeps working.**

**We just swap the transport:**

- **Web app:** `SignalR` (WebSocket → Server)
- **Cactus Browser:** `Tauri` (IPC → Native AOT)

**Same code. Different runtime. Zero rewrites.**

---

## 🔮 Future: SignalM² as Universal Message Bus

```
┌────────────────────────────────────┐
│       SignalM² Core API             │
└────────────┬───────────────────────┘
             │
    ┌────────┼────────┬────────┐
    ▼        ▼        ▼        ▼
┌────────┐┌──────┐┌───────┐┌──────┐
│SignalR ││Tauri ││WebRTC ││gRPC  │
│ (Web)  ││(Local)││(P2P)  ││(µSvc)│
└────────┘└──────┘└───────┘└──────┘
```

**One API. Multiple transports. Infinite possibilities.**

---

## 🎯 Implementation Checklist

### Core Transport System
- [ ] Create `ISignalMTransport` interface
- [ ] Wrap existing SignalR as `SignalRTransport`
- [ ] Implement `TauriTransport` with Tauri events
- [ ] Update `SignalM` core with auto-detection
- [ ] Test auto-detection logic

### Tauri Backend
- [ ] Create `signalm.rs` with `signalm_invoke` command
- [ ] Implement message routing to Native AOT
- [ ] Add Tauri event emission for server→client
- [ ] Update `main.rs` to register command
- [ ] Test Tauri IPC performance

### Native AOT Integration
- [ ] Create `EventHandler.cs` for C# events
- [ ] Update `ComponentExecutor.cs` to store VNode state
- [ ] Ensure Rust reconciler integration
- [ ] Test event execution flow
- [ ] Verify patch generation

### Frontend Updates
- [ ] Update `App.tsx` to use `SignalM.createAuto()`
- [ ] Implement `applyPatchesToDOM()` function
- [ ] Add event listener for patch application
- [ ] Test in Cactus Browser (Tauri mode)
- [ ] Test in web browser (SignalR mode)

### Testing
- [ ] Test Counter component (button clicks)
- [ ] Test Todo List (add/remove items)
- [ ] Test conditional rendering (toggle)
- [ ] Measure latency (should be < 5ms)
- [ ] Verify offline functionality

---

## 🚀 Next Steps

1. **Week 1:** Implement transport interface and Tauri transport
2. **Week 2:** Add Tauri backend handler and routing
3. **Week 3:** Update application code and test
4. **Week 4:** Performance optimization and polish
5. **Ship Phase 5!** 🎉

---

**SignalM² - Evolution, not revolution. The same API you love, now with local-first power! 🌵⚡**
