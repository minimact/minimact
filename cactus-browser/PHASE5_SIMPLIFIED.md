# 🌵 Phase 5: Interactive Components (SIMPLIFIED - No Server!)

**Goal:** Make components fully interactive with local event handling and state updates

---

## 💡 The Revelation

**We don't need SignalR. We don't need a server.**

Everything runs **locally** in the Native AOT runtime. The entire component lifecycle happens in memory on the client machine.

---

## ❌ What We're NOT Building

~~SignalR WebSocket connection~~ ❌
~~Server-side state management~~ ❌
~~Client-server synchronization~~ ❌
~~Real-time bidirectional communication~~ ❌

**Why?** Because there's no server to communicate with!

---

## ✅ What We ARE Building

**Pure local execution:**

```
User clicks button
    ↓
JavaScript event handler
    ↓
Call .NET runtime: component.HandleClick()
    ↓
.NET: Update state internally
    ↓
.NET: component.Render() → new VNode
    ↓
🦀 Rust: reconcile(oldVNode, newVNode) → patches
    ↓
Return patches to JavaScript
    ↓
JavaScript: Apply patches to DOM
    ↓
✅ UI updates in 3ms! (ALL LOCAL!)
```

---

## 🏗️ Architecture (Simplified)

```
┌─────────────────────────────────────────┐
│   BROWSER (WebView)                     │
│   - Capture DOM events                  │
│   - Call .NET methods via FFI           │
│   - Apply patches to DOM                │
└──────────────┬──────────────────────────┘
               │ Tauri IPC (in-process)
               ↓
┌─────────────────────────────────────────┐
│   NATIVE AOT RUNTIME (Local)            │
│   - Component instance in memory        │
│   - Execute event handlers              │
│   - Update component state              │
│   - Re-render component                 │
│   - Call Rust reconciler                │
└──────────────┬──────────────────────────┘
               │ FFI (in-process)
               ↓
┌─────────────────────────────────────────┐
│   RUST RECONCILER (Local)               │
│   - Diff old vs new VNode trees         │
│   - Generate minimal patches            │
│   - Return patch operations             │
└─────────────────────────────────────────┘
```

**Everything is local. Zero network calls. Pure in-memory execution.**

---

## 📋 Implementation Tasks

### Task 1: Store Component Instance in Memory

**src-tauri/src/component_state.rs (NEW):**

```rust
use std::sync::Mutex;
use once_cell::sync::Lazy;

pub struct ComponentState {
    pub csharp_source: String,
    pub current_vnode: serde_json::Value,
}

static COMPONENT: Lazy<Mutex<Option<ComponentState>>> = Lazy::new(|| Mutex::new(None));

pub fn initialize_component(csharp: String, vnode: serde_json::Value) {
    let mut state = COMPONENT.lock().unwrap();
    *state = Some(ComponentState {
        csharp_source: csharp,
        current_vnode: vnode,
    });
}

pub fn get_current_vnode() -> Option<serde_json::Value> {
    let state = COMPONENT.lock().unwrap();
    state.as_ref().map(|s| s.current_vnode.clone())
}

pub fn update_vnode(new_vnode: serde_json::Value) {
    let mut state = COMPONENT.lock().unwrap();
    if let Some(s) = state.as_mut() {
        s.current_vnode = new_vnode;
    }
}
```

---

### Task 2: Add Tauri Command to Handle Events

**src-tauri/src/commands.rs (UPDATE):**

```rust
use crate::component_state;
use crate::dotnet;
use crate::reconciler;

#[tauri::command]
pub fn handle_event(event_name: String, event_data: Option<serde_json::Value>) -> Result<Vec<serde_json::Value>, String> {
    // 1. Get current VNode (old state)
    let old_vnode = component_state::get_current_vnode()
        .ok_or("Component not initialized")?;

    // 2. Call .NET runtime to execute event handler
    let dotnet_response = dotnet::execute_event_handler(event_name, event_data)?;

    // 3. Parse new VNode from response
    let new_vnode: serde_json::Value = serde_json::from_str(&dotnet_response.vnode_json)
        .map_err(|e| format!("Failed to parse VNode: {}", e))?;

    // 4. Call Rust reconciler
    let patches = reconciler::reconcile(
        &old_vnode,
        &new_vnode
    )?;

    // 5. Update stored VNode
    component_state::update_vnode(new_vnode);

    // 6. Return patches to frontend
    Ok(patches)
}
```

---

### Task 3: Update .NET Runtime for Event Handling

**minimact-runtime/EventHandler.cs (NEW):**

```csharp
using System.Reflection;
using Newtonsoft.Json;

namespace CactusBrowser.Runtime;

public class EventHandler
{
    private readonly MinimactComponent component;

    public EventHandler(MinimactComponent component)
    {
        this.component = component;
    }

    public EventResponse HandleEvent(string eventName, Dictionary<string, object>? eventData = null)
    {
        try
        {
            // Find method by name
            var method = component.GetType().GetMethod(eventName, BindingFlags.Public | BindingFlags.Instance);

            if (method == null)
            {
                return new EventResponse
                {
                    Success = false,
                    Error = $"Event handler not found: {eventName}"
                };
            }

            // Execute handler
            if (eventData != null && eventData.Count > 0)
            {
                method.Invoke(component, new object[] { eventData });
            }
            else
            {
                method.Invoke(component, null);
            }

            // Re-render to get new VNode
            var newVNode = component.Render();

            // Serialize new VNode
            var vnodeJson = VNodeSerializer.Serialize(newVNode);

            return new EventResponse
            {
                Success = true,
                VNodeJson = vnodeJson,
                Error = null
            };
        }
        catch (Exception ex)
        {
            return new EventResponse
            {
                Success = false,
                Error = ex.ToString()
            };
        }
    }
}

public class EventResponse
{
    public bool Success { get; set; }
    public string? VNodeJson { get; set; }
    public string? Error { get; set; }
}
```

**minimact-runtime/Program.cs (UPDATE for CLI interface):**

```csharp
using System;
using System.IO;
using Newtonsoft.Json;
using CactusBrowser.Runtime;

// Read command from stdin
var input = Console.ReadLine();
if (string.IsNullOrEmpty(input))
{
    Console.Error.WriteLine("No input provided");
    return 1;
}

var command = JsonConvert.DeserializeObject<RuntimeCommand>(input);

if (command == null)
{
    Console.Error.WriteLine("Invalid command JSON");
    return 1;
}

// Store component instance globally (simple approach)
if (RuntimeState.Component == null && command.Type == "initialize")
{
    var assembly = DynamicCompiler.Compile(command.CSharpSource!);
    RuntimeState.Component = DynamicCompiler.CreateInstance(assembly);
    RuntimeState.EventHandler = new EventHandler(RuntimeState.Component);

    var vnode = RuntimeState.Component.Render();
    var response = new
    {
        success = true,
        vnodeJson = VNodeSerializer.Serialize(vnode),
        html = VNodeToHtml(vnode)
    };

    Console.WriteLine(JsonConvert.SerializeObject(response));
    return 0;
}

if (command.Type == "event" && RuntimeState.EventHandler != null)
{
    var result = RuntimeState.EventHandler.HandleEvent(command.EventName!, command.EventData);
    Console.WriteLine(JsonConvert.SerializeObject(result));
    return result.Success ? 0 : 1;
}

Console.Error.WriteLine("Unknown command type");
return 1;

// Simple global state holder
public static class RuntimeState
{
    public static MinimactComponent? Component { get; set; }
    public static EventHandler? EventHandler { get; set; }
}

public class RuntimeCommand
{
    public string Type { get; set; } = ""; // "initialize" or "event"
    public string? CSharpSource { get; set; }
    public string? EventName { get; set; }
    public Dictionary<string, object>? EventData { get; set; }
}
```

---

### Task 4: Frontend Event Handling (Pure Local)

**src/core/minimact-client.ts (SIMPLIFIED):**

```typescript
import { invoke } from '@tauri-apps/api/tauri';

export interface Patch {
  type: string;
  path?: number[];
  content?: string;
  tag?: string;
  attributes?: Record<string, string>;
  // ... other fields
}

export class MinimactClient {
  private rootElement: HTMLElement;
  private isInitialized = false;

  constructor(rootElement: HTMLElement) {
    this.rootElement = rootElement;
  }

  async initialize(csharpSource: string, initialHtml: string) {
    // Set initial HTML
    this.rootElement.innerHTML = initialHtml;

    // Attach event listeners
    this.attachEventListeners();

    this.isInitialized = true;
    console.log('[Minimact] Initialized! Component is interactive.');
  }

  private attachEventListeners() {
    // Global click handler
    this.rootElement.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;

      // Check for onClick handler
      const eventHandler = target.getAttribute('data-onclick');

      if (eventHandler) {
        e.preventDefault();
        await this.handleEvent(eventHandler);
      }
    });

    // TODO: Add more event types (input, change, submit, etc.)
  }

  private async handleEvent(eventName: string, eventData?: any) {
    if (!this.isInitialized) {
      console.error('[Minimact] Not initialized');
      return;
    }

    console.log('[Minimact] Handling event:', eventName);

    try {
      // Call Tauri command (which calls .NET locally)
      const patches = await invoke<Patch[]>('handle_event', {
        eventName,
        eventData
      });

      console.log('[Minimact] Received patches:', patches);

      // Apply patches to DOM
      this.applyPatches(patches);

    } catch (err) {
      console.error('[Minimact] Event handling failed:', err);
    }
  }

  private applyPatches(patches: Patch[]) {
    for (const patch of patches) {
      switch (patch.type) {
        case 'UpdateText':
          this.applyUpdateText(patch);
          break;
        case 'SetAttribute':
          this.applySetAttribute(patch);
          break;
        case 'RemoveAttribute':
          this.applyRemoveAttribute(patch);
          break;
        case 'CreateElement':
          this.applyCreateElement(patch);
          break;
        case 'InsertNode':
          this.applyInsertNode(patch);
          break;
        case 'RemoveNode':
          this.applyRemoveNode(patch);
          break;
        case 'ReplaceNode':
          this.applyReplaceNode(patch);
          break;
      }
    }
  }

  private applyUpdateText(patch: Patch) {
    const element = this.findElement(patch.path!);
    if (element) {
      element.textContent = patch.content!;
      console.log('[Minimact] ✅ Updated text:', patch.content);
    }
  }

  private applySetAttribute(patch: Patch) {
    const element = this.findElement(patch.path!);
    if (element && patch.attributes) {
      for (const [name, value] of Object.entries(patch.attributes)) {
        element.setAttribute(name, value);
      }
      console.log('[Minimact] ✅ Set attribute');
    }
  }

  // ... other patch application methods (same as before)

  private findElement(path: number[]): HTMLElement | null {
    let current: Node = this.rootElement;
    for (const index of path) {
      if (current.childNodes[index]) {
        current = current.childNodes[index];
      } else {
        console.warn('[Minimact] Element not found at path:', path);
        return null;
      }
    }
    return current as HTMLElement;
  }
}
```

---

### Task 5: Update C# Component to Add Event Handlers

When Babel compiles TSX with `onClick={...}`, it should generate:

**Input TSX:**
```tsx
export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

**Generated C#:**
```csharp
public class Counter : MinimactComponent
{
    [State] private int count = 0;

    protected override VNode Render()
    {
        return new VElement("button", new Dictionary<string, string>
        {
            ["data-onclick"] = "HandleClick_10000000"  // ← Event handler name
        })
        {
            Children = new List<VNode>
            {
                new VText($"Count: {count}")
            }
        };
    }

    public void HandleClick_10000000()  // ← Event handler method
    {
        count++;
        // TriggerRender() not needed - handled by event loop
    }
}
```

---

## 🧪 Testing Phase 5

### Test 1: Simple Counter

**Component:**
```tsx
export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

**Flow:**
1. Load component → Initial render: `Count: 0`
2. Click button
3. JavaScript: `handleEvent("HandleClick_10000000")`
4. Tauri → .NET: Execute handler
5. .NET: `count++`, re-render
6. .NET → Rust: Reconcile
7. Rust → Tauri: Return patches
8. JavaScript: Apply patch `UpdateText("Count: 1")`
9. **Result:** UI updates in ~3ms ⚡

**ALL LOCAL. ZERO NETWORK CALLS.**

---

### Test 2: Toggle (Conditional Rendering)

**Component:**
```tsx
export function Toggle() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && <p>Content is visible!</p>}
    </div>
  );
}
```

**Expected:**
- Click toggle
- VNull → VElement (or vice versa)
- Patch: `ReplaceNode`
- Content appears/disappears instantly

---

## ✅ Success Criteria

- [ ] Component instance stored in memory
- [ ] Event handlers execute locally
- [ ] State updates trigger re-renders
- [ ] Rust reconciler generates patches
- [ ] Patches apply to DOM correctly
- [ ] **All operations < 10ms**
- [ ] **Zero network calls**
- [ ] **Works offline 100%**

---

## 🎯 Performance Targets

| Operation | Target | Reality |
|-----------|--------|---------|
| **Event → Handler** | 0.5ms | In-process call |
| **.NET Re-render** | 1ms | Component.Render() |
| **Rust Reconcile** | 1ms | Native speed |
| **Apply Patches** | 2ms | DOM manipulation |
| **Total Latency** | **~3ms** | ⚡ ALL LOCAL! |

---

## 📂 File Changes

### New Files
- `src-tauri/src/component_state.rs` - Store component instance
- `minimact-runtime/EventHandler.cs` - Execute event handlers
- `src/core/minimact-client.ts` - Local event handling

### Updated Files
- `src-tauri/src/commands.rs` - Add `handle_event` command
- `minimact-runtime/Program.cs` - Add CLI event handling
- `src/App.tsx` - Use MinimactClient

---

## 🔥 The Key Insight

**Old thinking (with SignalR):**
```
Client → Network → Server → Database → Network → Client
Latency: 50-200ms
```

**New thinking (Cactus Browser):**
```
Click → In-Process Call → Re-render → Patch → DOM
Latency: 3ms
```

**WE DON'T NEED THE NETWORK BECAUSE THERE'S NO SERVER!**

---

## 🚀 Next Steps

1. Implement component state storage in Rust
2. Add Tauri `handle_event` command
3. Update .NET runtime for event execution
4. Create MinimactClient for local event handling
5. Test with Counter component
6. **SHIP IT!** 🌵

---

**This is the Posthydrationist Web. Everything local. Zero latency. Perfect privacy.**

**Let's build it! 🔥**
