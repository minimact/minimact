# Minimact Punch Integration Guide

## Overview

Minimact Punch 🌵 + 🍹 is a **standalone extension package** that adds DOM observation and reactivity to Minimact. This document outlines how to integrate it with the Minimact ecosystem.

## Architecture

```
┌─────────────────────────────────────────────┐
│         minimact-punch (Extension)          │
│  • DomElementState class                    │
│  • Observer management                      │
│  • Statistical aggregations                 │
│  • useDomElementState() hook                │
└─────────────────┬───────────────────────────┘
                  │ imports/uses
┌─────────────────▼───────────────────────────┐
│      client-runtime (Core)                  │
│  • Component hydration                      │
│  • SignalR manager                          │
│  • DOM patcher                              │
│  • Hook context                             │
└─────────────────┬───────────────────────────┘
                  │ communicates with
┌─────────────────▼───────────────────────────┐
│    Minimact.AspNetCore (Server)             │
│  • MinimactComponent base class             │
│  • DomElementStateHook (NEW)                │
│  • SignalR hub with DOM notifications       │
└─────────────────────────────────────────────┘
```

## Package Relationships

### 1. minimact-punch (This Package)
- **Type**: Extension/addon
- **Dependencies**: None (pure browser APIs)
- **Peer Dependencies**: `minimact` (for hook integration)
- **Exports**: `DomElementState`, `useDomElementState`

### 2. client-runtime
- **Type**: Core package
- **Optional Dependency**: `minimact-punch`
- **Integration**: Imports Punch when DOM observation is used

### 3. Minimact.AspNetCore
- **Type**: Server-side package (.NET)
- **New Classes**: `DomElementStateHook.cs`
- **SignalR**: New hub method `NotifyDomStateChange`

## Integration Steps

### Step 1: Client-Runtime Integration

**File**: `src/client-runtime/src/hooks.ts`

```typescript
// Add optional import (only when Punch is installed)
let DomElementState: typeof import('minimact-punch').DomElementState | null = null;
let useDomElementStateImpl: typeof import('minimact-punch').useDomElementState | null = null;

// Lazy load Punch if available
async function loadPunch() {
  try {
    const punch = await import('minimact-punch');
    DomElementState = punch.DomElementState;
    useDomElementStateImpl = punch.useDomElementState;
  } catch (e) {
    console.warn('[Minimact] minimact-punch not installed. DOM observation features disabled.');
  }
}

// Export wrapper that loads Punch on first use
export function useDomElementState(selector?: string) {
  if (!useDomElementStateImpl) {
    throw new Error(
      'useDomElementState requires minimact-punch package. ' +
      'Install it with: npm install minimact-punch'
    );
  }
  return useDomElementStateImpl(selector);
}

// Auto-load if imported
if (typeof window !== 'undefined') {
  loadPunch();
}
```

### Step 2: Component Context Integration

**File**: `src/client-runtime/src/types.ts`

```typescript
export interface ComponentContext {
  componentId: string;
  element: HTMLElement;
  state: Map<string, any>;
  effects: Array<Effect>;
  refs: Map<string, Ref>;

  // NEW: DOM element state tracking
  domElementStates?: Map<string, any>; // 'any' is DomElementState from Punch

  hintQueue: HintQueue;
  domPatcher: DOMPatcher;
  signalRManager: SignalRManager;
}
```

### Step 3: Server-Side C# Integration

**File**: `src/Minimact.AspNetCore/Core/Hooks/DomElementStateHook.cs` (NEW)

```csharp
namespace Minimact.AspNetCore.Core.Hooks;

/// <summary>
/// Server-side representation of useDomElementState() hook.
/// Tracks DOM state synchronized from client.
/// </summary>
public class DomElementStateHook
{
    public string StateKey { get; set; } = string.Empty;
    public string? Selector { get; set; }

    // DOM state (synchronized from client)
    public bool IsIntersecting { get; set; }
    public double IntersectionRatio { get; set; }
    public int ChildrenCount { get; set; }
    public int GrandChildrenCount { get; set; }
    public Dictionary<string, string> Attributes { get; set; } = new();
    public List<string> ClassList { get; set; } = new();
    public bool Exists { get; set; }

    // Collection state (when selector matches multiple)
    public int Count { get; set; }
    public List<DomElementStateHook> Elements { get; set; } = new();
}
```

**File**: `src/Minimact.AspNetCore/Core/MinimactComponent.cs` (UPDATE)

```csharp
public abstract class MinimactComponent
{
    // Existing properties...

    // NEW: DOM element state hooks
    internal int DomElementStateIndex { get; set; } = 0;
    internal Dictionary<string, DomElementStateHook> DomElementStates { get; set; } = new();

    /// <summary>
    /// Register a DOM element state hook (called from Babel-generated code).
    /// </summary>
    public DomElementStateHook UseDomElementState(string? selector = null)
    {
        var stateKey = $"domElementState_{DomElementStateIndex++}";

        var hook = new DomElementStateHook
        {
            StateKey = stateKey,
            Selector = selector
        };

        DomElementStates[stateKey] = hook;

        return hook;
    }

    /// <summary>
    /// Called when client reports DOM state change via SignalR.
    /// </summary>
    public virtual async Task OnDomStateChangedAsync(string stateKey, object stateData)
    {
        if (DomElementStates.TryGetValue(stateKey, out var hook))
        {
            UpdateDomElementStateFromClient(hook, stateData);

            // Trigger re-render
            await TriggerRenderAsync();
        }
    }

    private void UpdateDomElementStateFromClient(DomElementStateHook hook, object stateData)
    {
        var json = JsonSerializer.Serialize(stateData);
        var clientState = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);

        if (clientState == null) return;

        if (clientState.TryGetValue("isIntersecting", out var intersecting))
            hook.IsIntersecting = intersecting.GetBoolean();

        if (clientState.TryGetValue("childrenCount", out var count))
            hook.ChildrenCount = count.GetInt32();

        if (clientState.TryGetValue("exists", out var exists))
            hook.Exists = exists.GetBoolean();

        // Update other properties...
    }
}
```

### Step 4: SignalR Hub Integration

**File**: `src/Minimact.AspNetCore/SignalR/MinimactHub.cs` (UPDATE)

```csharp
public class MinimactHub : Hub
{
    private readonly ComponentRegistry _componentRegistry;

    // Existing methods...

    /// <summary>
    /// Client notifies server of DOM state change.
    /// This triggers server-side re-render with updated DOM state.
    /// </summary>
    public async Task NotifyDomStateChange(
        string componentId,
        string stateKey,
        object stateData)
    {
        var component = _componentRegistry.GetComponent(componentId);
        if (component != null)
        {
            await component.OnDomStateChangedAsync(stateKey, stateData);
        }
    }
}
```

### Step 5: Client-Server Communication Flow

```
1. Component renders with useDomElementState()
    ↓
2. Client: DomElementState sets up observers
    ↓
3. DOM changes (scroll, mutation, etc.)
    ↓
4. Client: Observer fires, builds state snapshot
    ↓
5. Client: SignalR.invoke('NotifyDomStateChange', componentId, stateKey, snapshot)
    ↓
6. Server: MinimactHub.NotifyDomStateChange() called
    ↓
7. Server: component.OnDomStateChangedAsync() updates hook
    ↓
8. Server: component.TriggerRenderAsync() generates new VNode
    ↓
9. Server: Compute patches, send via SignalR
    ↓
10. Client: Apply patches to DOM
```

## Usage Example

### JSX (Developer writes):
```jsx
import { useDomElementState } from 'minimact-punch';

export function LazyGallery() {
  const section = useDomElementState();

  return (
    <div ref={section}>
      <h2>Photo Gallery</h2>
      {section.isIntersecting ? (
        <div>
          <img src="photo1.jpg" />
          <img src="photo2.jpg" />
        </div>
      ) : (
        <p>Scroll down to load images...</p>
      )}
    </div>
  );
}
```

### Babel Output (Generated C#):
```csharp
public class LazyGallery : MinimactComponent
{
    protected override VNode Render()
    {
        var section = UseDomElementState(); // Server-side hook

        return Div()
            .Ref(section) // Tracks this element
            .Children(
                H2().Text("Photo Gallery"),
                section.IsIntersecting
                    ? Div().Children(
                        Img().Src("photo1.jpg"),
                        Img().Src("photo2.jpg")
                      )
                    : P().Text("Scroll down to load images...")
            );
    }
}
```

## Testing Integration

### 1. Standalone Test (minimact-punch only)
```bash
cd src/minimact-punch
npm run build
# Open examples/demo.html in browser
```

### 2. Client-Runtime Integration Test
```typescript
// In client-runtime tests
import { useDomElementState } from '../src/hooks';

const domState = useDomElementState('.test-elem');
expect(domState).toBeInstanceOf(DomElementState);
```

### 3. Full Stack Integration Test
```csharp
// In Minimact.AspNetCore.Tests
[Fact]
public async Task Should_Handle_DOM_State_Change()
{
    var component = new TestComponent();
    var hook = component.UseDomElementState();

    await component.OnDomStateChangedAsync(
        hook.StateKey,
        new { isIntersecting = true }
    );

    Assert.True(hook.IsIntersecting);
}
```

## Build & Publish

### minimact-punch package:
```bash
cd src/minimact-punch
npm run build
npm version patch
npm publish
```

### Update client-runtime:
```bash
cd src/client-runtime
npm install minimact-punch@latest
npm run build
```

### Update Minimact.AspNetCore:
```bash
cd src/Minimact.AspNetCore
dotnet build
dotnet pack
```

## Deployment Checklist

- [ ] Build minimact-punch standalone
- [ ] Test DOM observers work in isolation
- [ ] Integrate into client-runtime
- [ ] Add C# DomElementStateHook class
- [ ] Update MinimactComponent base class
- [ ] Add SignalR hub method
- [ ] Test client-server communication
- [ ] Update playground to support Punch
- [ ] Write documentation
- [ ] Publish packages

## Benefits of This Approach

1. **Optional**: Apps can use Minimact without Punch
2. **Standalone**: Punch can be tested independently
3. **Extensible**: Other addons can follow this pattern
4. **Lazy Loading**: Punch loads only when needed
5. **Type Safe**: Full TypeScript + C# types
6. **Minimal Core**: Keeps client-runtime lean

## Future Extensions

Following the same pattern:
- **minimact-forms** - Form validation and state
- **minimact-router** - Client-side routing
- **minimact-gestures** - Touch/swipe detection
- **minimact-analytics** - Event tracking

---

**Status**: Ready for integration
**Next Steps**: Implement Step 1 (client-runtime hooks)
