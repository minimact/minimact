# Counter with Debug Mode - Minimact SPA Example

This example demonstrates Minimact's **client debug mode**, which sends all client-side debug messages to the server via SignalR, allowing you to set breakpoints in C# and inspect client state!

## Features

- ✅ Simple counter with useState
- ✅ SPA architecture (Shell + Page)
- ✅ **Debug mode enabled** - all client activity sent to server
- ✅ Template-based predictive rendering

## How to Run

```bash
cd examples/CounterWithDebug
dotnet run
```

Navigate to: http://localhost:5000

## How to Debug

1. **Open Visual Studio**
2. **Set breakpoint** in `MinimactHub.cs` at line **27** (inside `DebugMessage` method)
3. **Click any button** in the browser
4. **Watch the breakpoint hit!**

### What You'll See

When the breakpoint hits, inspect the parameters:

- **`category`** - Type of debug message:
  - `state` - useState calls
  - `templates` - Template match results
  - `minimact` - General framework activity
  - `dom-patcher` - DOM patch operations
  - `event-delegation` - Event handling

- **`message`** - Human-readable description

- **`data`** - Full debug object with details:
  ```json
  {
    "componentId": "counter-page-abc123",
    "stateKey": "state_0",
    "oldValue": 5,
    "newValue": 6
  }
  ```

## Architecture

### Shell (DefaultShell.tsx)
```tsx
import { Page } from '@minimact/spa';

export default function DefaultShell() {
  return (
    <div>
      <header>Counter App</header>
      <main>
        <Page />  {/* CounterPage renders here */}
      </main>
      <footer>Debug mode active!</footer>
    </div>
  );
}
```

### Page (CounterPage.tsx)
```tsx
import { useState } from '@minimact/core';

export default function CounterPage() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

## Debug Mode Configuration

Debug mode is enabled in `Program.cs`:

```csharp
builder.Services.AddMinimact(options =>
{
    options.EnableClientDebugMode = true;  // 🔥 Enable server debug breakpoints!
});
```

## What Gets Logged

Every client action sends debug data to the server:

| Action | Category | Message | Data |
|--------|----------|---------|------|
| Click button | `event-delegation` | Event triggered | handler, target, event type |
| useState called | `state` | useState called | componentId, stateKey, oldValue, newValue |
| Template match | `templates` | Template matched | hintId, patches, latency, confidence |
| Template miss | `templates` | Template match failed | componentId, stateChanges |
| Patch failure | `patches` | Failed to apply patch | patch, error, stack |
| Reconnection | `connection` | SignalR reconnected | timestamp |

## Files

- `Program.cs` - Enables debug mode
- `Shells/DefaultShell.tsx` - Persistent shell layout
- `Pages/CounterPage.tsx` - Counter page component
- `Generated/` - Transpiled C# code (auto-generated)

## Benefits of Debug Mode

1. **No more console.log hunting** - Set breakpoints in C#
2. **Inspect full object graphs** - Visual Studio debugger
3. **Understand client flow** - See every state change, patch, event
4. **Catch bugs faster** - Centralized error inspection

## Tip

Toggle debug mode on/off from browser console:

```javascript
minimactDebug.enable()   // Start sending to server
minimactDebug.disable()  // Stop sending to server
minimactDebug.isEnabled() // Check status
```

---

**HIP HIP... MACT YAY!** 🎉
