# 🚀 SignalM² - Next Steps

**What's left to complete Phase 5**

---

## ✅ What We Just Completed

1. ✅ **Transport Interface** - `ISignalMTransport` abstraction layer
2. ✅ **WebSocket Transport** - Wrapped existing SignalM connection
3. ✅ **SignalMManager Refactor** - Now transport-agnostic
4. ✅ **Tauri Transport** - Local IPC implementation for Cactus Browser
5. ✅ **Build Success** - client-runtime builds with no errors

---

## 🎯 What's Next

### Step 1: Add Tauri Backend Handler ⏳

**Estimated Time:** 30 minutes

**What:** Create Rust command to route SignalM messages to Native AOT runtime.

**Files to Create:**

#### `src-tauri/src/signalm.rs` (NEW)

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
    println!("[SignalM²] Received: {} with {} args", method, args.len());

    // Route to appropriate handler based on method name
    match method.as_str() {
        // ========================================
        // Component Initialization
        // ========================================
        "Initialize" => {
            let csharp = args[0].as_str().ok_or("Missing C# source")?;
            crate::dotnet::initialize_component(csharp)
        }

        // ========================================
        // State Management
        // ========================================
        "UpdateComponentState" => {
            let component_id = args[0].as_str().ok_or("Missing componentId")?;
            let state_key = args[1].as_str().ok_or("Missing stateKey")?;
            let value = &args[2];

            println!("[SignalM²] UpdateComponentState: {} {} = {:?}", component_id, state_key, value);

            // Update state in Native AOT runtime
            crate::dotnet::update_component_state(component_id, state_key, value.clone())
        }

        "UpdateDomElementState" => {
            let component_id = args[0].as_str().ok_or("Missing componentId")?;
            let state_key = args[1].as_str().ok_or("Missing stateKey")?;
            let snapshot = &args[2];

            println!("[SignalM²] UpdateDomElementState: {} {}", component_id, state_key);

            // Update DOM state in Native AOT runtime
            crate::dotnet::update_dom_element_state(component_id, state_key, snapshot.clone())
        }

        // ========================================
        // Event Handling
        // ========================================
        "TriggerEvent" => {
            let component_id = args[0].as_str().ok_or("Missing componentId")?;
            let event_name = args[1].as_str().ok_or("Missing eventName")?;
            let event_data = args.get(2);

            println!("[SignalM²] TriggerEvent: {} {}", component_id, event_name);

            // Execute event handler in Native AOT runtime
            let patches = crate::dotnet::trigger_event(
                component_id,
                event_name,
                event_data.cloned()
            )?;

            // Send patches back to client via Tauri event
            app.emit_all("signalm-message", SignalMMessage {
                method: "ApplyPatches".to_string(),
                args: vec![patches]
            }).map_err(|e| e.to_string())?;

            Ok(serde_json::json!({ "success": true }))
        }

        // ========================================
        // Component Registration
        // ========================================
        "RegisterComponent" => {
            let component_id = args[0].as_str().ok_or("Missing componentId")?;

            println!("[SignalM²] RegisterComponent: {}", component_id);

            // Register component in Native AOT runtime
            crate::dotnet::register_component(component_id)?;

            Ok(serde_json::json!({ "success": true }))
        }

        "InvokeComponentMethod" => {
            let component_id = args[0].as_str().ok_or("Missing componentId")?;
            let method_name = args[1].as_str().ok_or("Missing methodName")?;
            let method_args = args[2].as_str().ok_or("Missing args")?;

            println!("[SignalM²] InvokeComponentMethod: {} {}", component_id, method_name);

            // Invoke method in Native AOT runtime
            crate::dotnet::invoke_component_method(component_id, method_name, method_args)?;

            Ok(serde_json::json!({ "success": true }))
        }

        // ========================================
        // Unknown Method
        // ========================================
        _ => {
            eprintln!("[SignalM²] Unknown method: {}", method);
            Err(format!("Unknown SignalM method: {}", method))
        }
    }
}
```

#### `src-tauri/src/main.rs` (UPDATE)

```rust
mod signalm;  // ← Add this
mod dotnet;
mod reconciler;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            signalm::signalm_invoke,  // ← Add this
            // ... other commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Success Criteria:**
- ✅ `signalm_invoke` command registered
- ✅ Routes messages to Native AOT runtime
- ✅ Emits `signalm-message` events for server→client messages

---

### Step 2: Implement Native AOT Handler Stubs ⏳

**Estimated Time:** 20 minutes

**What:** Add stub methods to `dotnet.rs` for SignalM² to call.

**Files to Update:**

#### `src-tauri/src/dotnet.rs` (ADD METHODS)

```rust
// ========================================
// Component Initialization
// ========================================

pub fn initialize_component(csharp_source: &str) -> Result<serde_json::Value, String> {
    println!("[Native AOT] Initializing component");

    // TODO: Compile C# dynamically via Roslyn
    // TODO: Create component instance
    // TODO: Execute Render()
    // TODO: Return initial VNode as JSON

    // Stub for now
    Ok(serde_json::json!({
        "success": true,
        "componentId": "component-1",
        "html": "<div>Component initialized</div>"
    }))
}

// ========================================
// State Management
// ========================================

pub fn update_component_state(
    component_id: &str,
    state_key: &str,
    value: serde_json::Value
) -> Result<serde_json::Value, String> {
    println!("[Native AOT] Updating state: {} {} = {:?}", component_id, state_key, value);

    // TODO: Find component by ID
    // TODO: Update state via SetStateFromClient()
    // TODO: Re-render component
    // TODO: Generate patches via Rust reconciler
    // TODO: Return patches

    // Stub for now
    Ok(serde_json::json!({
        "success": true
    }))
}

pub fn update_dom_element_state(
    component_id: &str,
    state_key: &str,
    snapshot: serde_json::Value
) -> Result<serde_json::Value, String> {
    println!("[Native AOT] Updating DOM state: {} {}", component_id, state_key);

    // TODO: Find component by ID
    // TODO: Update DOM state via SetDomStateFromClient()
    // TODO: Re-render component
    // TODO: Generate patches via Rust reconciler
    // TODO: Return patches

    // Stub for now
    Ok(serde_json::json!({
        "success": true
    }))
}

// ========================================
// Event Handling
// ========================================

pub fn trigger_event(
    component_id: &str,
    event_name: &str,
    event_data: Option<serde_json::Value>
) -> Result<serde_json::Value, String> {
    println!("[Native AOT] Triggering event: {} {}", component_id, event_name);

    // TODO: Find component by ID
    // TODO: Execute event handler
    // TODO: Re-render component
    // TODO: Generate patches via Rust reconciler
    // TODO: Return patches

    // Stub patches for now
    Ok(serde_json::json!([
        {
            "type": "UpdateText",
            "path": [0, 0],
            "content": "Button clicked!"
        }
    ]))
}

// ========================================
// Component Registration
// ========================================

pub fn register_component(component_id: &str) -> Result<(), String> {
    println!("[Native AOT] Registering component: {}", component_id);

    // TODO: Add component to registry
    // TODO: Initialize component state

    Ok(())
}

pub fn invoke_component_method(
    component_id: &str,
    method_name: &str,
    args_json: &str
) -> Result<(), String> {
    println!("[Native AOT] Invoking method: {} {}", component_id, method_name);

    // TODO: Find component by ID
    // TODO: Call method via reflection
    // TODO: Trigger re-render if needed

    Ok(())
}
```

**Success Criteria:**
- ✅ All methods compile
- ✅ Return stub responses
- ✅ Log messages appear in console
- ✅ No panics/crashes

---

### Step 3: Update Cactus Browser Frontend ⏳

**Estimated Time:** 15 minutes

**What:** Use SignalM² in the Cactus Browser app.

**Files to Update:**

#### `src/App.tsx` (UPDATE)

```typescript
import { useEffect, useRef, useState } from 'react';
import { SignalMManager } from '@minimact/core';
import { TauriTransport } from './core/signalm/TauriTransport';

export default function App() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('Ready');
  const [html, setHtml] = useState('');
  const signalMRef = useRef<SignalMManager | null>(null);

  // Initialize SignalM² on mount
  useEffect(() => {
    console.log('[App] Initializing SignalM²...');

    // Create SignalM with auto-detection
    const signalM = SignalMManager.createAuto('/minimact', {
      debugLogging: true,
      tauriTransport: TauriTransport  // Pass constructor
    });

    // Set up event handlers
    signalM.on('ApplyPatches', (patches: any) => {
      console.log('[App] ✅ Received patches:', patches);
      // TODO: Apply patches to DOM
      applyPatchesToDOM(patches);
    });

    signalM.on('UpdateComponent', (data: any) => {
      console.log('[App] ✅ Component update:', data);
      setHtml(data.html);
    });

    // Connect
    signalM.start().then(() => {
      console.log('[App] ✅ SignalM² connected!');
      setStatus('Connected to local runtime');
      signalMRef.current = signalM;
    });

    return () => {
      signalM.stop();
    };
  }, []);

  async function handleGo() {
    if (!signalMRef.current) {
      setStatus('Not connected');
      return;
    }

    setStatus('Loading from GitHub...');

    try {
      // 1. Load from GitHub (Phase 2)
      const result = await loadFromGitHub(url);

      setStatus('Initializing component...');

      // 2. Initialize component via SignalM²
      await signalMRef.current.invoke('Initialize', result.compiled.csharp);

      setStatus('Component loaded! 🌵');

    } catch (err: any) {
      setStatus('Error: ' + err.message);
    }
  }

  function applyPatchesToDOM(patches: any) {
    // TODO: Implement DOM patching
    console.log('[App] Applying patches:', patches);
  }

  return (
    <div className="app">
      <div className="address-bar">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="gh://user/repo/path.tsx"
          onKeyDown={(e) => e.key === 'Enter' && handleGo()}
        />
        <button onClick={handleGo}>Go</button>
      </div>

      <div className="status">{status}</div>

      {html && (
        <div className="site-viewer">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
    </div>
  );
}
```

**Success Criteria:**
- ✅ SignalM² connects on app load
- ✅ "Connected to local runtime" message appears
- ✅ Console shows SignalM² logs
- ✅ No errors in DevTools

---

### Step 4: Test End-to-End Flow ⏳

**Estimated Time:** 30 minutes

**What:** Verify the complete flow works:

```
1. User clicks button in Cactus Browser
2. → TauriTransport.send('TriggerEvent', ...)
3. → Tauri IPC (0.1ms)
4. → signalm_invoke() in Rust
5. → dotnet::trigger_event()
6. → Generate patches
7. → app.emit_all('signalm-message', ...)
8. → TauriTransport receives event
9. → signalM.on('ApplyPatches', ...) fires
10. → Apply patches to DOM
✅ UI updates!
```

**Test Steps:**

1. **Start Cactus Browser:**
   ```bash
   cd cactus-browser
   pnpm tauri:dev
   ```

2. **Open DevTools** and check console for:
   ```
   [SignalM²] Detected Tauri environment → Using Tauri transport
   [SignalM²] Tauri transport connected (local mode, ~0.1ms latency)
   [App] ✅ SignalM² connected!
   ```

3. **Test Message Send:**
   Open DevTools console and run:
   ```javascript
   // Get SignalM instance
   const signalM = window.signalMRef.current;

   // Test send
   await signalM.invoke('Initialize', 'public class Test {}');
   ```

4. **Check Rust console** for:
   ```
   [SignalM²] Received: Initialize with 1 args
   [Native AOT] Initializing component
   ```

5. **Verify Response** in browser console:
   ```javascript
   // Should return stub response
   { success: true, componentId: "component-1", html: "..." }
   ```

**Success Criteria:**
- ✅ Messages sent from browser → Rust
- ✅ Rust receives and routes messages
- ✅ Responses returned to browser
- ✅ Latency < 1ms
- ✅ No errors

---

### Step 5: Implement Full Native AOT Integration ⏳

**Estimated Time:** 2-4 hours

**What:** Replace stubs with actual Native AOT calls.

**Tasks:**

1. **Component Registry** (Rust)
   - Store component instances by ID
   - Manage component lifecycle

2. **Dynamic C# Compilation** (Native AOT)
   - Use Roslyn to compile C# at runtime
   - Create component instances
   - Execute Render() method

3. **VNode Serialization** (Native AOT)
   - Serialize VNode trees to JSON
   - Send to Rust reconciler

4. **Rust Reconciliation**
   - Compute patches via minimact-rust-reconciler
   - Return patches to Tauri

5. **Event Execution** (Native AOT)
   - Find event handlers by name
   - Execute handlers
   - Trigger re-render
   - Return patches

**Success Criteria:**
- ✅ Real components compile and execute
- ✅ State updates trigger re-renders
- ✅ Events execute handlers
- ✅ Patches generated and applied
- ✅ UI updates correctly

---

## 📋 Complete Checklist

### Phase 5.1: Infrastructure (DONE ✅)

- [x] Create `ISignalMTransport` interface
- [x] Create `WebSocketTransport` wrapper
- [x] Refactor `SignalMManager` to use transport
- [x] Create `TauriTransport`
- [x] Build client-runtime successfully

### Phase 5.2: Backend Integration (IN PROGRESS)

- [ ] Create `src-tauri/src/signalm.rs`
- [ ] Add `signalm_invoke` command
- [ ] Register command in `main.rs`
- [ ] Add stub methods to `dotnet.rs`
- [ ] Test message routing

### Phase 5.3: Frontend Integration (PENDING)

- [ ] Update `App.tsx` to use SignalM²
- [ ] Test connection on app load
- [ ] Test message send
- [ ] Test message receive
- [ ] Verify latency < 1ms

### Phase 5.4: Native AOT (PENDING)

- [ ] Implement component registry
- [ ] Implement dynamic C# compilation
- [ ] Implement VNode serialization
- [ ] Integrate Rust reconciler
- [ ] Implement event execution
- [ ] Test full round-trip

### Phase 5.5: Testing & Polish (PENDING)

- [ ] Test Counter component
- [ ] Test TodoMVC component
- [ ] Measure performance metrics
- [ ] Add error handling
- [ ] Add logging
- [ ] Write integration tests

---

## 🎯 Priority Order

**Do these in order:**

1. ✅ **DONE:** Transport abstraction + TauriTransport
2. 🔥 **NEXT:** Tauri backend handler (`signalm.rs`)
3. 🔥 **NEXT:** Frontend integration (`App.tsx`)
4. ⏳ **AFTER:** Native AOT stubs → real implementation
5. ⏳ **AFTER:** End-to-end testing
6. ⏳ **AFTER:** Performance optimization

---

## ⏱️ Estimated Time to Complete

| Phase | Time | Status |
|-------|------|--------|
| 5.1 Infrastructure | 2 hours | ✅ DONE |
| 5.2 Backend | 30 mins | 🔥 IN PROGRESS |
| 5.3 Frontend | 15 mins | ⏳ PENDING |
| 5.4 Native AOT | 3 hours | ⏳ PENDING |
| 5.5 Testing | 1 hour | ⏳ PENDING |
| **TOTAL** | **~6-7 hours** | **30% complete** |

---

## 🚀 Quick Start

**To continue right now:**

```bash
# 1. Create signalm.rs
cd cactus-browser/src-tauri/src
touch signalm.rs

# 2. Copy the code from Step 1 above

# 3. Update main.rs
# Add: mod signalm;
# Add to invoke_handler: signalm::signalm_invoke

# 4. Build
cargo build

# 5. Test
pnpm tauri:dev
```

---

## 📖 Reference Documents

- `SIGNALM2_REFACTOR_COMPLETE.md` - What we just built
- `SIGNALM2_ARCHITECTURE.md` - Overall architecture
- `PHASE5_PLAN.md` - Original plan
- `PHASE3_PLAN.md` - Native AOT runtime details

---

## 🎉 The Vision

**When Phase 5 is complete:**

```typescript
// User clicks button in Cactus Browser
<button onClick={() => setCount(count + 1)}>Count: {count}</button>

// 1. Event fires (0ms)
// 2. TauriTransport.send() (0.1ms)
// 3. Tauri IPC → Native AOT (0.1ms)
// 4. Execute handler + re-render (1ms)
// 5. Rust reconciliation (0.5ms)
// 6. Patches emitted (0.1ms)
// 7. DOM updated (1ms)

// ✅ Total: ~3ms from click to UI update!
// ✅ ALL LOCAL, ZERO NETWORK
// ✅ WORKS 100% OFFLINE
```

**Let's make it happen! 🌵⚡**
