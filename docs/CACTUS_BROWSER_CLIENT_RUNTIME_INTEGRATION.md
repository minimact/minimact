# Cactus Browser: Client-Runtime Integration Implementation

## Overview

This document describes how to integrate the Minimact client-runtime into Cactus Browser's Phase 3 execution pipeline. Currently, `ComponentExecutor.cs` only generates raw HTML fragments. To enable full interactivity (event handlers, client state, DOM patching), we need to replicate the functionality of `MinimactPageRenderer.GeneratePageHtml()` but adapted for Tauri IPC instead of SignalR.

**Related Documentation**: This implementation builds on the SignalM² architecture described in `cactus-browser/SIGNALM2_ARCHITECTURE.md`, which provides transport abstraction allowing the same SignalM API to work with both SignalR (web) and Tauri IPC (desktop) transports.

## Architecture Comparison

### Traditional Minimact (ASP.NET Core)

```
┌─────────────────────────────────────────────────────────────┐
│ ASP.NET Core Server                                         │
│                                                              │
│  ┌────────────────────┐        ┌──────────────────────┐    │
│  │ MinimactComponent  │───────▶│ MinimactPageRenderer │    │
│  │ (C# Component)     │        │                      │    │
│  └────────────────────┘        └──────────────────────┘    │
│           │                              │                  │
│           │ RenderComponent()            │ GeneratePageHtml()│
│           ▼                              ▼                  │
│       VNode Tree              Complete HTML Document        │
│                                 with client-runtime.js      │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Browser                                                      │
│                                                              │
│  ┌──────────────────┐        ┌──────────────────────┐      │
│  │ client-runtime.js│◀───────│ SignalM (SignalR)    │      │
│  │ (DOM Patching)   │        │                      │      │
│  └──────────────────┘        └──────────────────────┘      │
│           │                              ▲                  │
│           │ Sends Events                 │ Receives Patches │
│           ▼                              │                  │
│       Interactive DOM ───────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Cactus Browser (Tauri) - SignalM² Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Minimact Runtime (C# + Roslyn)                              │
│                                                              │
│  ┌────────────────────┐        ┌──────────────────────┐    │
│  │ MinimactComponent  │───────▶│ ComponentExecutor    │    │
│  │ (Dynamically       │        │ (Enhanced)           │    │
│  │  Compiled)         │        │                      │    │
│  └────────────────────┘        └──────────────────────┘    │
│           │                              │                  │
│           │ RenderComponent()            │ GeneratePageHtml()│
│           ▼                              ▼                  │
│       VNode Tree              Complete HTML Document        │
│                                 with client-runtime.js      │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼ (via Tauri IPC)
┌─────────────────────────────────────────────────────────────┐
│ Tauri Frontend (React + Vite)                               │
│                                                              │
│  ┌──────────────────┐        ┌──────────────────────┐      │
│  │ client-runtime.js│◀───────│ SignalM (Tauri)      │      │
│  │ (DOM Patching)   │        │ ISignalMTransport    │      │
│  └──────────────────┘        └──────────────────────┘      │
│           │                              ▲                  │
│           │ signalM.send()               │ signalM.on()     │
│           ▼                              │                  │
│       Interactive DOM ───────────────────┘                  │
│                                                              │
│  Key: Same API, different transport!                        │
└─────────────────────────────────────────────────────────────┘
```

**Critical Insight from SIGNALM2_ARCHITECTURE.md:**

> "Don't throw away SignalM. Evolve it. SignalM already provides the perfect API. All we need to do is swap the transport underneath!"

This means we use the **existing SignalM abstraction** with a new **TauriTransport** implementation.

## Current State Analysis

### What Works ✅

1. **GitHub Loading** (`github-loader.ts`) - Loads TSX files from GitHub repositories
2. **Babel Compilation** (`@minimact/babel-plugin`) - Transpiles TSX → C# code with templates and handlers
3. **Dynamic C# Compilation** (`DynamicCompiler.cs`) - Uses Roslyn to compile C# at runtime
4. **Full MinimactComponent Instances** - Dynamically compiled components are real `MinimactComponent` subclasses with:
   - ✅ Access to useState/useEffect/useRef (backend-side hooks)
   - ✅ Rust reconciler integration (via Minimact.AspNetCore.Core)
   - ✅ VNode rendering and diffing capabilities
   - ✅ Template system integration
5. **VNode Rendering** (`ComponentExecutor.cs`) - Generates raw HTML from VNode tree
6. **Tauri Integration** (`runtime.rs`) - Executes C# runtime via Tauri commands

**Important Clarification**: The use of Roslyn dynamic compilation does NOT limit functionality. The compiled components are full-fledged `MinimactComponent` instances with complete access to the Minimact.AspNetCore infrastructure, including the Rust reconciler.

### What's Missing ❌

1. **Stateful Component Runtime** - Components are created and discarded after single render
   - No component instance persistence between re-renders
   - No event handling → state update → re-render cycle
   - Component state lives only for initial render

2. **SignalM Message Loop** - No handler for client events
   - Need to implement handlers for UpdateComponentState, InvokeComponentMethod, etc.
   - Need component registry to lookup instances by ID
   - Need to trigger re-renders and generate patches

3. **Client-Runtime Integration** - No `minimact.js` bundle included in HTML

4. **Hydration Data** - VNode JSON not embedded for client-side hydration

5. **Handler Configuration** - Event handlers not extracted from templates and configured

6. **Effect Configuration** - Client effects not extracted and set up

7. **Complete HTML Document** - Only HTML fragments, not full `<!DOCTYPE html>` pages with initialization scripts

**The Core Gap**: We have all the building blocks (full MinimactComponent with Rust reconciler), but we're missing the **stateful runtime wrapper** that keeps components alive and handles the request/response cycle that SignalM provides in web apps.

## Stateful Component Runtime Architecture

### Current: Single-Shot Rendering

```csharp
// Current ComponentExecutor.Execute()
public static RenderResponse Execute(RenderRequest request) {
    var assembly = DynamicCompiler.Compile(request.CSharp);
    var component = DynamicCompiler.CreateInstance(assembly);  // Create
    var vnode = component.RenderComponent();                   // Render once
    var html = VNodeToHtml(vnode);                            // Convert to HTML

    return new RenderResponse { Html = html };                // Component discarded!
}
```

**Problem**: Component instance is destroyed after initial render. No state persistence, no re-renders.

### Needed: Stateful Component Manager

```csharp
public class ComponentManager {
    // Keep component instances alive
    private static Dictionary<string, MinimactComponent> _components = new();

    // Initial render (called by execute_component)
    public static RenderResponse InitializeComponent(string csharp, string componentId) {
        var assembly = DynamicCompiler.Compile(csharp);
        var component = DynamicCompiler.CreateInstance(assembly);

        // Store for later re-renders
        _components[componentId] = component;

        var vnode = component.RenderComponent();
        var html = GeneratePageHtml(component, vnode, componentId);

        return new RenderResponse { Html = html };
    }

    // Handle state updates (called by signalm_invoke)
    public static PatchResponse UpdateComponentState(
        string componentId,
        string stateKey,
        object value
    ) {
        var component = _components[componentId];

        // Save old VNode for diffing
        var oldVNode = component.CurrentVNode;

        // Update state (triggers re-render internally)
        component.UpdateState(stateKey, value);

        // Get new VNode
        var newVNode = component.RenderComponent();

        // Use Rust reconciler to generate patches
        var patches = Reconciler.Diff(oldVNode, newVNode);

        return new PatchResponse { Patches = patches };
    }

    // Handle method invocations (called by signalm_invoke)
    public static PatchResponse InvokeComponentMethod(
        string componentId,
        string methodName,
        object args
    ) {
        var component = _components[componentId];
        var oldVNode = component.CurrentVNode;

        // Invoke the method (may update state)
        component.InvokeMethod(methodName, args);

        // Re-render and diff
        var newVNode = component.RenderComponent();
        var patches = Reconciler.Diff(oldVNode, newVNode);

        return new PatchResponse { Patches = patches };
    }
}
```

### The Complete Lifecycle

```
1. Initial Load:
   Frontend: signalM.send('Initialize', csharp, componentId)
   ↓
   Rust: signalm_invoke("Initialize", [...])
   ↓
   C#: ComponentManager.InitializeComponent()
   → Compile, instantiate, STORE component
   → Generate full HTML with client-runtime
   ↓
   Frontend: Receives HTML, renders in DOM
   ↓
   Client-Runtime: Hydrates, attaches event handlers

2. User Interaction:
   User clicks button
   ↓
   Client-Runtime: Finds handler via DOM path
   ↓
   Frontend: signalM.send('UpdateComponentState', componentId, key, value)
   ↓
   Rust: signalm_invoke("UpdateComponentState", [...])
   ↓
   C#: ComponentManager.UpdateComponentState()
   → RETRIEVE stored component
   → Update state
   → Re-render (Rust reconciler generates patches)
   ↓
   Rust: app.emit('signalm-message', { method: 'ApplyPatches', patches })
   ↓
   Frontend: signalM.on('ApplyPatches', patches => {...})
   ↓
   Client-Runtime: Applies patches to DOM
```

This is exactly what MinimactHub does in Minimact.AspNetCore - it manages component instances and handles the SignalM message loop.

## Reference Implementation: MinimactPageRenderer

The `MinimactPageRenderer.GeneratePageHtml()` method (Minimact.AspNetCore/Rendering/MinimactPageRenderer.cs:170-306) shows the complete pattern:

### Key Components

#### 1. Complete HTML Document Structure

```csharp
return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{EscapeHtml(title)}</title>
    <script src=""{EscapeHtml(scriptSrc)}""></script>  <!-- client-runtime.js -->
{extensionScripts}
    <style>/* ... */</style>
</head>
<body>
    <div id=""minimact-root"" data-minimact-component=""{component.ComponentId}"">{componentHtml}</div>
    <!-- ... hydration data and initialization ... -->
</body>
</html>";
```

#### 2. Embedded VNode/ViewModel JSON

```csharp
<!-- MVC ViewModel Data -->
<script id=""minimact-viewmodel"" type=""application/json"">
{viewModelJson}
</script>
```

#### 3. Client-Runtime Initialization

```csharp
<script>
    // Make ViewModel available globally for hooks
    window.__MINIMACT_VIEWMODEL__ = JSON.parse(
        document.getElementById('minimact-viewmodel').textContent
    );

    // Initialize Minimact client runtime with handlers and effects
    const minimact = new Minimact.Minimact('#minimact-root', {
        componentId: '{component.ComponentId}',
        enableDebugLogging: {enableDebugLogging},
        handlers: [
{GenerateHandlerConfigs(component)}
        ],
        effects: [
{GenerateEffectConfigs(component)}
        ]
    });
    minimact.start();
</script>
```

#### 4. Handler Configuration Generation

The `GenerateHandlerConfigs()` method (lines 339-390) walks the VNode tree to find event handlers:

```csharp
private string GenerateHandlerConfigs(MinimactComponent component)
{
    var clientHandlers = component.GetClientHandlers();
    var handlers = new List<string>();
    var vnode = component.CurrentVNode;
    var pathConverter = new PathConverter(vnode);

    // Walk VNode tree to find event handlers
    WalkVNodeForHandlers(vnode, (node, hexPath) =>
    {
        if (node is VElement element)
        {
            foreach (var prop in element.Props)
            {
                // Check for event handlers (onClick, onChange, etc.)
                if (prop.Key.StartsWith("on") && prop.Key.Length > 2 && char.IsUpper(prop.Key[2]))
                {
                    var handlerName = prop.Value?.ToString();
                    if (handlerName != null && clientHandlers.ContainsKey(handlerName))
                    {
                        var jsCode = clientHandlers[handlerName];
                        var domPath = pathConverter.HexPathToDomPath(hexPath);
                        var domPathJson = JsonSerializer.Serialize(domPath);
                        var eventType = prop.Key.Substring(2).ToLowerInvariant();

                        handlers.Add($@"                {{
                domPath: {domPathJson},
                eventType: ""{eventType}"",
                jsCode: {jsCode}
            }}");
                    }
                }
            }
        }
    });

    return string.Join(",\n", handlers);
}
```

#### 5. Effect Configuration Generation

Similar pattern for client effects (lines 392-417):

```csharp
private string GenerateEffectConfigs(MinimactComponent component)
{
    var clientEffects = component.GetClientEffects();
    if (clientEffects == null || clientEffects.Count == 0)
    {
        return string.Empty;
    }

    var effects = clientEffects.Select(kv => $@"                {{
                name: ""{EscapeJs(kv.Key)}"",
                jsCode: {kv.Value}
            }}");

    return string.Join(",\n", effects);
}
```

## Implementation Plan for Cactus Browser

### Phase 1: Enhance ComponentExecutor.cs

**File**: `cactus-browser/minimact-runtime/ComponentExecutor.cs`

**Changes Needed**:

1. Add `GeneratePageHtml()` method similar to MinimactPageRenderer
2. Walk VNode tree to extract handlers and effects
3. Embed VNode JSON for hydration
4. Include client-runtime.js bundle reference
5. Generate initialization script

**New Methods to Add**:

```csharp
public static class ComponentExecutor
{
    // Existing Execute() method enhanced to use GeneratePageHtml()
    public static RenderResponse Execute(RenderRequest request)
    {
        try
        {
            var assembly = DynamicCompiler.Compile(request.CSharp);
            var component = DynamicCompiler.CreateInstance(assembly);
            var vnode = component.RenderComponent();
            var vnodeJson = VNodeSerializer.Serialize(vnode);

            // NEW: Generate complete HTML with client-runtime integration
            var html = GeneratePageHtml(component, vnode, vnodeJson, request);

            return new RenderResponse
            {
                Success = true,
                VNodeJson = vnodeJson,
                Html = html,
                Error = null
            };
        }
        catch (Exception ex)
        {
            return new RenderResponse
            {
                Success = false,
                VNodeJson = null,
                Html = null,
                Error = $"{ex.GetType().Name}: {ex.Message}\n{ex.StackTrace}"
            };
        }
    }

    private static string GeneratePageHtml(
        MinimactComponent component,
        VNode vnode,
        string vnodeJson,
        RenderRequest request)
    {
        var componentHtml = VNodeToHtml(vnode);
        var componentId = component.ComponentId;
        var title = request.Title ?? "Minimact Component";

        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{HtmlEncode(title)}</title>
    <script src=""/__minimact__/client-runtime.js""></script>
    <style>
        body {{
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, sans-serif;
        }}
        #minimact-root {{
            width: 100%;
            height: 100vh;
        }}
    </style>
</head>
<body>
    <div id=""minimact-root"" data-minimact-component=""{componentId}"">{componentHtml}</div>

    <!-- VNode/ViewModel Hydration Data -->
    <script id=""minimact-vnode"" type=""application/json"">
{vnodeJson}
    </script>

    <script>
        // Make VNode available globally
        window.__MINIMACT_VNODE__ = JSON.parse(
            document.getElementById('minimact-vnode').textContent
        );

        // Initialize SignalM with auto-detected transport
        // (Will use TauriTransport in Cactus Browser, SignalRTransport in web)
        const signalM = window.Minimact.SignalM.createAuto();

        signalM.on('ApplyPatches', (patches) => {{
            console.log('[Minimact] Received patches:', patches);
            // Apply patches via client-runtime
        }});

        signalM.connect().then(() => {{
            console.log('[Minimact] SignalM connected via',
                window.__TAURI__ ? 'Tauri' : 'SignalR');
        }});

        // Initialize Minimact client runtime with handlers and effects
        const minimact = new Minimact.Minimact('#minimact-root', {{
            componentId: '{componentId}',
            enableDebugLogging: true,
            signalM: signalM,  // Pass SignalM instance
            handlers: [
{GenerateHandlerConfigs(component, vnode)}
            ],
            effects: [
{GenerateEffectConfigs(component)}
            ]
        }});

        minimact.start();
    </script>
</body>
</html>";
    }

    private static string GenerateHandlerConfigs(MinimactComponent component, VNode vnode)
    {
        var clientHandlers = component.GetClientHandlers();
        if (clientHandlers == null || clientHandlers.Count == 0)
        {
            return string.Empty;
        }

        var handlers = new List<string>();
        var pathConverter = new PathConverter(vnode);

        WalkVNodeForHandlers(vnode, "", (node, hexPath) =>
        {
            if (node is VElement element)
            {
                foreach (var prop in element.Props)
                {
                    if (prop.Key.StartsWith("on") && prop.Key.Length > 2 && char.IsUpper(prop.Key[2]))
                    {
                        var handlerName = prop.Value?.ToString();
                        if (handlerName != null && clientHandlers.ContainsKey(handlerName))
                        {
                            var jsCode = clientHandlers[handlerName];
                            var domPath = pathConverter.HexPathToDomPath(hexPath);
                            var domPathJson = JsonSerializer.Serialize(domPath);
                            var eventType = prop.Key.Substring(2).ToLowerInvariant();

                            handlers.Add($@"                {{
                    domPath: {domPathJson},
                    eventType: ""{eventType}"",
                    jsCode: {jsCode}
                }}");
                        }
                    }
                }
            }
        });

        return string.Join(",\n", handlers);
    }

    private static void WalkVNodeForHandlers(VNode node, string hexPath, Action<VNode, string> callback)
    {
        callback(node, hexPath);

        if (node is VElement element)
        {
            for (int i = 0; i < element.Children.Count; i++)
            {
                var childPath = hexPath + i.ToString("X");
                WalkVNodeForHandlers(element.Children[i], childPath, callback);
            }
        }
    }

    private static string GenerateEffectConfigs(MinimactComponent component)
    {
        var clientEffects = component.GetClientEffects();
        if (clientEffects == null || clientEffects.Count == 0)
        {
            return string.Empty;
        }

        var effects = clientEffects.Select(kv => $@"                {{
                    name: ""{JsEncode(kv.Key)}"",
                    jsCode: {kv.Value}
                }}");

        return string.Join(",\n", effects);
    }

    private static string JsEncode(string text)
    {
        return text.Replace("\\", "\\\\").Replace("\"", "\\\"");
    }

    // ... existing VNodeToHtml, RenderElement, HtmlEncode methods ...
}
```

### Phase 2: Bundle Client-Runtime.js

**Options**:

#### Option A: Copy from src/client-runtime/dist/

Create a build step that copies the built client-runtime bundle:

```batch
REM build-runtime-roslyn.bat
echo [3/3] Copying client-runtime bundle...
xcopy /Y ..\src\client-runtime\dist\core.min.js minimact-runtime\assets\client-runtime.js
```

#### Option B: Serve via Tauri Custom Protocol

Register a custom protocol handler in `runtime.rs` to serve the client-runtime bundle:

```rust
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .register_uri_scheme_protocol("minimact", |_app, request| {
            let path = request.uri().path();

            if path == "/client-runtime.js" {
                // Serve embedded client-runtime bundle
                let bundle = include_bytes!("../assets/client-runtime.js");
                tauri::http::ResponseBuilder::new()
                    .status(200)
                    .mimetype("application/javascript")
                    .body(bundle.to_vec())
            } else {
                tauri::http::ResponseBuilder::new()
                    .status(404)
                    .body(vec![])
            }
        })
        .invoke_handler(tauri::generate_handler![execute_component, handle_event])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Then use `<script src="minimact://client-runtime.js"></script>` in the generated HTML.

### Phase 3: Implement SignalM TauriTransport

**Reference**: `cactus-browser/SIGNALM2_ARCHITECTURE.md:183-263`

**File**: `cactus-browser/src/core/signalm/tauri-transport.ts` (NEW)

Implement the `ISignalMTransport` interface for Tauri IPC:

```typescript
import { invoke } from '@tauri-apps/api/core';
import { listen, Event as TauriEvent } from '@tauri-apps/api/event';
import { ISignalMTransport } from './transport';

/**
 * Tauri IPC Transport for SignalM
 *
 * Implements ISignalMTransport using Tauri's invoke() and event system
 * Replaces SignalR WebSocket with in-process IPC
 */
export class TauriTransport implements ISignalMTransport {
    private handlers: Map<string, Set<(...args: any[]) => void>> = new Map();
    private connected = false;
    private unlistenFunctions: (() => void)[] = [];

    async connect(): Promise<void> {
        // Set up global event listener for messages from C# runtime
        const unlisten = await listen('signalm-message', (event: TauriEvent<any>) => {
            const { method, args } = event.payload;
            this.handleMessage(method, args);
        });

        this.unlistenFunctions.push(unlisten);
        this.connected = true;

        console.log('[SignalM] Tauri transport connected');
    }

    async disconnect(): Promise<void> {
        // Clean up event listeners
        for (const unlisten of this.unlistenFunctions) {
            unlisten();
        }
        this.unlistenFunctions = [];
        this.connected = false;

        console.log('[SignalM] Tauri transport disconnected');
    }

    isConnected(): boolean {
        return this.connected;
    }

    async send(method: string, ...args: any[]): Promise<any> {
        if (!this.connected) {
            throw new Error('Not connected');
        }

        console.log('[SignalM] Sending to runtime:', method, args);

        // Call Tauri command that routes to C# runtime
        const result = await invoke('signalm_invoke', {
            method,
            args
        });

        return result;
    }

    on(method: string, handler: (...args: any[]) => void): void {
        if (!this.handlers.has(method)) {
            this.handlers.set(method, new Set());
        }
        this.handlers.get(method)!.add(handler);
    }

    off(method: string, handler: (...args: any[]) => void): void {
        const handlers = this.handlers.get(method);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    private handleMessage(method: string, args: any[]) {
        console.log('[SignalM] Received from runtime:', method, args);
        const handlers = this.handlers.get(method);
        if (handlers) {
            for (const handler of handlers) {
                handler(...args);
            }
        }
    }
}
```

**Key Design Points**:
1. Implements the same `ISignalMTransport` interface as `SignalRTransport`
2. Uses Tauri's `invoke()` for client→runtime calls
3. Uses Tauri's `listen()` for runtime→client events
4. **Zero changes to application code** - SignalM API stays the same!

### Phase 4: Add Tauri Command Handler

**File**: `cactus-browser/src-tauri/src/runtime.rs`

Add a new Tauri command to handle events from the client-runtime:

```rust
#[derive(Debug, serde::Deserialize)]
struct EventRequest {
    component_id: String,
    event_type: String,
    dom_path: Vec<i32>,
    value: Option<serde_json::Value>,
}

#[derive(Debug, serde::Serialize)]
struct EventResponse {
    success: bool,
    patches: Option<Vec<serde_json::Value>>,
    error: Option<String>,
}

#[tauri::command]
async fn handle_event(request: EventRequest) -> Result<EventResponse, String> {
    // Call C# runtime to handle event
    let input = serde_json::json!({
        "ComponentId": request.component_id,
        "EventType": request.event_type,
        "DomPath": request.dom_path,
        "Value": request.value
    });

    let output = run_minimact_runtime("HandleEvent", &input)
        .map_err(|e| format!("Runtime error: {}", e))?;

    // Parse response
    let response: serde_json::Value = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(EventResponse {
        success: response["success"].as_bool().unwrap_or(false),
        patches: response["patches"].as_array().cloned().map(|v| v.to_vec()),
        error: response["error"].as_str().map(|s| s.to_string()),
    })
}

// Update invoke_handler to include new command
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            execute_component,
            handle_event  // NEW
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Phase 5: Update C# Runtime to Handle Events

**File**: `cactus-browser/minimact-runtime/EventHandler.cs` (NEW)

```csharp
using System;
using System.Collections.Generic;
using System.Text.Json;
using Minimact.AspNetCore.Core;

namespace CactusBrowser.Runtime;

public class EventRequest
{
    public string ComponentId { get; set; } = "";
    public string EventType { get; set; } = "";
    public List<int> DomPath { get; set; } = new();
    public JsonElement? Value { get; set; }
}

public class EventResponse
{
    public bool Success { get; set; }
    public List<JsonElement>? Patches { get; set; }
    public string? Error { get; set; }
}

public static class EventHandler
{
    // In-memory component cache (in real implementation, use proper state management)
    private static Dictionary<string, MinimactComponent> _components = new();

    public static void RegisterComponent(string componentId, MinimactComponent component)
    {
        _components[componentId] = component;
    }

    public static EventResponse HandleEvent(EventRequest request)
    {
        try
        {
            if (!_components.TryGetValue(request.ComponentId, out var component))
            {
                return new EventResponse
                {
                    Success = false,
                    Error = $"Component not found: {request.ComponentId}"
                };
            }

            // Get the event handler at the DOM path
            var vnode = component.CurrentVNode;
            var element = NavigateToElement(vnode, request.DomPath);

            if (element == null)
            {
                return new EventResponse
                {
                    Success = false,
                    Error = $"Element not found at path: {string.Join(".", request.DomPath)}"
                };
            }

            // Find the event handler
            var handlerKey = "on" + char.ToUpper(request.EventType[0]) + request.EventType.Substring(1);
            if (!element.Props.TryGetValue(handlerKey, out var handlerName))
            {
                return new EventResponse
                {
                    Success = false,
                    Error = $"No handler found for event: {request.EventType}"
                };
            }

            // Execute the server-side event handler
            // (This would need to be implemented based on how Minimact handles server events)
            // For now, just re-render the component
            var newVNode = component.RenderComponent();

            // Generate patches (diff old VNode vs new VNode)
            var patches = GeneratePatches(vnode, newVNode);

            // Update cached component
            _components[request.ComponentId] = component;

            return new EventResponse
            {
                Success = true,
                Patches = patches
            };
        }
        catch (Exception ex)
        {
            return new EventResponse
            {
                Success = false,
                Error = $"{ex.GetType().Name}: {ex.Message}"
            };
        }
    }

    private static VElement? NavigateToElement(VNode vnode, List<int> domPath)
    {
        var current = vnode;

        foreach (var index in domPath)
        {
            if (current is VElement element && index < element.Children.Count)
            {
                current = element.Children[index];
            }
            else
            {
                return null;
            }
        }

        return current as VElement;
    }

    private static List<JsonElement> GeneratePatches(VNode oldVNode, VNode newVNode)
    {
        // TODO: Implement VNode diffing algorithm
        // For now, return empty list (full re-render)
        return new List<JsonElement>();
    }
}
```

### Phase 6: Update Program.cs Entry Point

**File**: `cactus-browser/minimact-runtime/Program.cs`

Update to handle both "Execute" and "HandleEvent" commands:

```csharp
using System;
using System.Text.Json;
using CactusBrowser.Runtime;

class Program
{
    static void Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.Error.WriteLine("Usage: minimact-runtime <command> <json-input>");
            Environment.Exit(1);
            return;
        }

        var command = args[0];
        var inputJson = args[1];

        try
        {
            string outputJson;

            switch (command)
            {
                case "Execute":
                    var renderRequest = JsonSerializer.Deserialize<RenderRequest>(inputJson);
                    if (renderRequest == null)
                    {
                        throw new Exception("Failed to deserialize RenderRequest");
                    }
                    var renderResponse = ComponentExecutor.Execute(renderRequest);
                    outputJson = JsonSerializer.Serialize(renderResponse);
                    break;

                case "HandleEvent":
                    var eventRequest = JsonSerializer.Deserialize<EventRequest>(inputJson);
                    if (eventRequest == null)
                    {
                        throw new Exception("Failed to deserialize EventRequest");
                    }
                    var eventResponse = EventHandler.HandleEvent(eventRequest);
                    outputJson = JsonSerializer.Serialize(eventResponse);
                    break;

                default:
                    throw new Exception($"Unknown command: {command}");
            }

            Console.WriteLine(outputJson);
        }
        catch (Exception ex)
        {
            var errorResponse = new
            {
                success = false,
                error = $"{ex.GetType().Name}: {ex.Message}\n{ex.StackTrace}"
            };
            Console.WriteLine(JsonSerializer.Serialize(errorResponse));
            Environment.Exit(1);
        }
    }
}
```

## Key Architectural Differences from MinimactPageRenderer

### SignalM Transport Abstraction (SignalM²)

**Reference**: `cactus-browser/SIGNALM2_ARCHITECTURE.md`

The key insight is that **SignalM already provides transport abstraction**. We don't replace SignalR - we swap the transport layer underneath while keeping the same API.

**Traditional Minimact (SignalR Transport)**:
```typescript
import { SignalM } from './core/signalm/signalm';

// Create SignalM with SignalR transport
const signalM = SignalM.createWebTransport('http://localhost:5000/minimact');

// Same API for all transports
await signalM.connect();
await signalM.send('UpdateComponentState', componentId, stateKey, value);
signalM.on('ApplyPatches', (patches) => {
    // Handle patches
});
```

**Cactus Browser (Tauri Transport)**:
```typescript
import { SignalM } from './core/signalm/signalm';

// Create SignalM with Tauri transport
const signalM = SignalM.createTauriTransport();

// SAME API - no code changes!
await signalM.connect();
await signalM.send('UpdateComponentState', componentId, stateKey, value);
signalM.on('ApplyPatches', (patches) => {
    // Handle patches
});
```

**Even Better - Auto-Detection**:
```typescript
// Automatically detects environment (Tauri vs Web)
const signalM = SignalM.createAuto();

// This code works EVERYWHERE:
// - In Cactus Browser → uses TauriTransport
// - In web browser → uses SignalRTransport
// - Zero code changes required!
```

This approach provides:
- ✅ **Zero code changes** in application logic
- ✅ **Same API** across all environments
- ✅ **Transport flexibility** (Tauri, SignalR, WebRTC, etc.)
- ✅ **Future-proof** architecture

### Bundle Serving

**Traditional Minimact**:
- Serves `minimact.js` from ASP.NET Core static files
- URL: `/js/minimact.js`

**Cactus Browser**:
- Bundles client-runtime.js with Tauri app
- Serves via custom protocol: `minimact://client-runtime.js`
- Or embeds directly in HTML with `<script>` tag containing bundle content

### Component Lifecycle

**Traditional Minimact**:
1. HTTP request → ASP.NET Core controller
2. Controller calls `MinimactPageRenderer.RenderPage()`
3. Page rendered with SignalR scripts
4. Client connects to SignalR hub
5. Bidirectional communication established

**Cactus Browser**:
1. User enters `gh://` URL in Cactus Browser
2. Frontend loads TSX from GitHub
3. Babel compiles TSX → C#
4. Tauri invokes C# runtime: `invoke('execute_component')`
5. C# runtime generates HTML with embedded client-runtime
6. HTML displayed in Tauri webview
7. Client-runtime initializes with TauriTransport
8. Events handled via `invoke('handle_event')`

## Testing Strategy

### Phase 1: Static Rendering
1. Test that `GeneratePageHtml()` produces valid HTML
2. Verify client-runtime.js script tag is included
3. Check VNode JSON is properly embedded

### Phase 2: Client-Runtime Loading
1. Verify client-runtime.js bundle loads successfully
2. Check console for initialization messages
3. Ensure `Minimact` object is available globally

### Phase 3: Handler Configuration
1. Create test component with `onClick` handler
2. Verify handler appears in generated config
3. Check DOM path calculation is correct

### Phase 4: Tauri IPC Integration
1. Test `handle_event` command with mock event
2. Verify event reaches C# runtime
3. Check patches are returned and applied

### Phase 5: End-to-End Interactivity
1. Load sample component with button
2. Click button
3. Verify state change
4. Check DOM updates correctly

## Example Component for Testing

Create `gh://minimact/test/Counter.tsx`:

```tsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Counter Test</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button onClick={() => setCount(count - 1)}>
        Decrement
      </button>
      <button onClick={() => setCount(0)}>
        Reset
      </button>
    </div>
  );
}
```

Expected behavior:
1. Initial render shows "Count: 0"
2. Clicking "Increment" updates count to 1
3. DOM updates without full page reload
4. Console shows Tauri IPC events

## Performance Considerations

### Bundle Size
- `client-runtime.js` is ~50KB minified
- Consider gzip compression for production
- May want to strip debug code in release builds

### IPC Overhead
- Tauri IPC is faster than WebSocket (native process communication)
- No network latency
- Direct process-to-process communication

### Component Caching
- Need to maintain component state between events
- Use in-memory dictionary keyed by componentId
- Consider serialization for persistence

## Security Considerations

### XSS Prevention
- All user content must be HTML-encoded
- Use `HtmlEncode()` for all dynamic content
- Client-runtime handles this automatically

### Script Injection
- Validate all JavaScript code from component handlers
- Consider CSP (Content Security Policy) headers
- Tauri provides sandboxing by default

### Component Isolation
- Each component has unique componentId
- Events only affect the target component
- No cross-component interference

## Open Questions

1. **State Persistence**: How should component state be persisted across sessions?
2. **Multiple Components**: Can one page have multiple Minimact components?
3. **Hot Reload**: Can we integrate with Minimact's hot reload system?
4. **Error Boundaries**: How should runtime errors be handled and displayed?
5. **Debugging**: What debugging tools do we need for Cactus Browser development?

## Next Steps

### Phase 1: SignalM² Transport Layer (leverages existing `src/client-runtime`)

**What Already Exists:**
- ✅ `ISignalMTransport` interface (`src/client-runtime/src/signalm/ISignalMTransport.ts`)
- ✅ `SignalMManager` with `createAuto()` (`src/client-runtime/src/signalm-manager.ts`)
- ✅ `WebSocketTransport` implementation (reference for TauriTransport)

**What Needs to Be Created:**

1. ⬜ Create `cactus-browser/src/core/signalm/tauri-transport.ts`
   - Implements existing `ISignalMTransport` interface from `@minimact/core`
   - Import from: `import { ISignalMTransport } from '@minimact/core/signalm'`
   - Uses Tauri `invoke()` for client→runtime calls
   - Uses Tauri `listen()` for runtime→client events
   - See reference: `src/client-runtime/src/signalm/WebSocketTransport.ts`

2. ⬜ Update `App-phase3.tsx` to use SignalMManager
   - Import: `import { SignalMManager } from '@minimact/core'`
   - Import: `import { TauriTransport } from './core/signalm/tauri-transport'`
   - Initialize: `SignalMManager.createAuto(undefined, { tauriTransport: TauriTransport })`

3. ⬜ Add Tauri `signalm_invoke` command in `src-tauri/src/signalm.rs`
   - Routes method calls to C# ComponentManager
   - Handles: Initialize, UpdateComponentState, InvokeComponentMethod, etc.

4. ⬜ Test SignalM auto-detection
   - Verify `SignalMManager.createAuto()` detects Tauri environment
   - Verify TauriTransport is instantiated correctly

### Phase 2: Stateful Component Runtime (THE CRITICAL PIECE)
4. ⬜ Create `ComponentManager.cs` in minimact-runtime
   - Component registry: `Dictionary<string, MinimactComponent>`
   - `InitializeComponent()` - compile, instantiate, store component
   - `UpdateComponentState()` - retrieve component, update state, re-render, diff
   - `InvokeComponentMethod()` - retrieve component, invoke method, re-render, diff

5. ⬜ Integrate Rust reconciler for diffing
   - Call reconciler to generate patches from VNode diff
   - Return patches to Rust layer for emission to client

6. ⬜ Update `Program.cs` to support multiple commands
   - Route "Initialize" → ComponentManager.InitializeComponent()
   - Route "UpdateComponentState" → ComponentManager.UpdateComponentState()
   - Route "InvokeComponentMethod" → ComponentManager.InvokeComponentMethod()

### Phase 3: Complete HTML Generation
7. ⬜ Implement `GeneratePageHtml()` in ComponentManager
   - Include client-runtime.js bundle
   - Embed VNode JSON for hydration
   - Generate handler configurations from component templates
   - Generate effect configurations
   - Initialize SignalM with auto-detection

8. ⬜ Bundle client-runtime.js with Tauri app
   - Copy from `src/client-runtime/dist/` to Tauri assets
   - Or serve via custom Tauri protocol

### Phase 4: Client-Runtime Integration
9. ⬜ Update `App-phase3.tsx` to use SignalM
   - Initialize: `SignalM.createAuto({ tauriTransport: TauriTransport })`
   - Send initial component via SignalM instead of direct invoke
   - Listen for ApplyPatches events

10. ⬜ Verify client-runtime hydration
    - Event handlers attached correctly
    - DOM path calculations work
    - Click events trigger SignalM messages

### Phase 5: Testing and Validation
11. ⬜ Test with simple Counter component
    - Initial render shows count
    - Click increment → state updates → DOM patches
    - Verify Rust reconciler generates correct patches

12. ⬜ Test useState/useEffect/useRef integration
    - Verify backend hooks work in dynamically compiled components
    - Test effect execution on mount/update
    - Test ref persistence across re-renders

13. ⬜ Add error handling and logging
    - Component not found errors
    - Compilation errors
    - Re-render errors

### Phase 6: Polish
14. ⬜ Performance profiling and optimization
15. ⬜ Documentation and examples
16. ⬜ Integration tests

## References

- **SignalM² Architecture**: `cactus-browser/SIGNALM2_ARCHITECTURE.md` - Transport abstraction design
- **MinimactPageRenderer.cs**: `src/Minimact.AspNetCore/Rendering/MinimactPageRenderer.cs:170-306` - Reference implementation
- **Client-Runtime README**: `src/client-runtime/README.md` - Client-runtime features and architecture
- **Current ComponentExecutor**: `cactus-browser/minimact-runtime/ComponentExecutor.cs` - Needs enhancement
- **Tauri Runtime**: `cactus-browser/src-tauri/src/runtime.rs` - Rust IPC layer
- **Phase 3 App**: `cactus-browser/src/App-phase3.tsx` - Current frontend implementation

## API Reference - What Already Exists

### MinimactComponent Methods (src/Minimact.AspNetCore/Core/MinimactComponent.cs)

```csharp
// Client handlers and effects
protected internal virtual Dictionary<string, string> GetClientHandlers() // Line 216
protected internal virtual Dictionary<string, EffectDefinition> GetClientEffects() // Line 229

// State management
protected internal void SetState(string key, object value) // Line 278
protected object? GetState(string key) // Line 284
public Dictionary<string, object> GetState() // Line 401

// VNode access
internal VNode? CurrentVNode { get; set; } // Line 37

// Rendering
public VNode RenderComponent() // Line 181
protected abstract VNode Render() // Line 176

// Metadata for templates
public ComponentMetadata GetMetadata() // Line 949
```

### PathConverter (src/Minimact.AspNetCore/Core/PathConverter.cs)

```csharp
public PathConverter(VNode root) // Constructor
public List<int> HexPathToDomPath(string hexPath) // Line 88
// Converts "10000000.30000000" → [0, 2]
// Automatically accounts for VNull nodes
```

### VNodeSerializer (cactus-browser/minimact-runtime/VNodeSerializer.cs)

```csharp
public static string Serialize(VNode vnode) // Line 10
// Returns JSON: { type: "VElement", tag: "div", path: "...", props: {...}, children: [...] }
```

### RustBridge (src/Minimact.AspNetCore/Core/RustBridge.cs)

```csharp
public static List<Patch> Reconcile(VNode oldTree, VNode newTree)
// P/Invoke to minimact.dll
// Serializes VNodes to JSON, calls Rust reconciler, returns patches
```

### DomPatch (for client-side application)

```csharp
public static List<DomPatch> FromPatches(List<Patch> patches, PathConverter converter)
// Converts hex-path patches to DOM-index patches
```

## Conclusion

The client-runtime integration transforms Cactus Browser from a static renderer into a fully interactive TSX execution environment. By replicating `MinimactPageRenderer`'s approach but using Tauri IPC instead of SignalR, we get:

- ✅ Full event handling (onClick, onChange, etc.)
- ✅ Client state management (useClientState)
- ✅ Surgical DOM updates (DOM patching)
- ✅ Hydration of server-rendered HTML
- ✅ Native desktop performance (no network latency)

**All infrastructure already exists in Minimact.AspNetCore.Core** - we just need to wire it up in Cactus Browser with SignalM² TauriTransport!

This makes Cactus Browser a true "TSX-native browser" capable of running interactive components directly from GitHub repositories.
