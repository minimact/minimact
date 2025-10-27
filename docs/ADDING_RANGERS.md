# Adding Rangers to Command Center

## 🦕 The Power Rangers Command Center Architecture

Minimact.CommandCenter is a **WPF testing environment** that lets you test the **real Minimact client runtime** using either:
- **MockClient** - Pure C# simulation (fast, no JS)
- **RealClient** - ClearScript V8 + AngleSharp (real browser environment)

The key insight: **You don't write simulators**. The real JavaScript hooks run in V8, calling the real ComponentEngine via monkey-patched SignalR.

---

## 🎯 Core Philosophy: Monkey-Patching, Not Simulation

### ❌ **WRONG APPROACH**: Writing Simulators

```csharp
// DON'T DO THIS! ❌
public class UseServerTaskSimulator
{
    public ServerTaskHandle UseServerTask()
    {
        // Trying to simulate JavaScript behavior in C#
        // This will drift from the real implementation!
    }
}
```

**Why this fails:**
- You're duplicating logic (violates DRY)
- Tests pass but browser fails (drift)
- Maintenance nightmare

### ✅ **RIGHT APPROACH**: Monkey-Patching Real Runtime

The **real `minimact.js`** runs in ClearScript V8. We just patch SignalR to call C# instead of real network:

```javascript
// minimact.js runs THIS code:
const task = useServerTask();
task.start(); // Calls: connection.invoke('StartServerTask', ...)

// We patch connection.invoke() to call C# RealHub/MockHub
```

**Why this works:**
- Tests run **exact same code** as browser
- Zero drift - if tests pass, browser works
- You can **set breakpoints** in C# ComponentEngine

---

## 📋 Checklist: Adding Support for a New Hook

Let's use `useServerTask` as the reference example.

### 1️⃣ **Check if Client Runtime Already Has It**

```bash
# Does the hook exist in minimact.js?
grep -r "useServerTask" src/client-runtime/src/
```

If it exists, you're **80% done**. The JavaScript already runs in RealClient!

### 2️⃣ **Add Server-Side Hub Methods**

The client JavaScript calls `connection.invoke('MethodName', args)`. You need to handle these in both RealHub and MockHub.

#### **RealHub.cs** (for RealClient mode)

```csharp
// src/Minimact.CommandCenter/Core/RealHub.cs

/// <summary>
/// Start a server task
/// Called from JavaScript: connection.invoke('StartServerTask', componentId, taskId, args)
/// SET BREAKPOINT HERE to debug!
/// </summary>
public async Task StartServerTask(string componentId, string taskId, object[]? args = null)
{
    Console.WriteLine($"[RealHub] 💜 StartServerTask: {componentId}.{taskId}");

    var component = _engine.GetComponent(componentId);
    if (component == null)
    {
        Console.WriteLine($"[RealHub] ⚠️  Component not found: {componentId}");
        return;
    }

    try
    {
        // Use reflection to call the component's server task
        var method = component.GetType()
            .GetMethod("GetServerTask", BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance);

        if (method == null)
        {
            Console.WriteLine($"[RealHub] ❌ GetServerTask method not found");
            return;
        }

        // Find the task method to get return type
        var taskMethod = FindTaskMethod(component, taskId);
        if (taskMethod == null)
        {
            Console.WriteLine($"[RealHub] ❌ No method found with [ServerTask(\"{taskId}\")]");
            return;
        }

        var returnType = taskMethod.ReturnType;
        if (returnType.IsGenericType && returnType.GetGenericTypeDefinition() == typeof(Task<>))
        {
            returnType = returnType.GetGenericArguments()[0];
        }

        // Get the task state
        var genericMethod = method.MakeGenericMethod(returnType);
        dynamic taskState = genericMethod.Invoke(component, new object[] { taskId })!;

        // 🎯 THIS IS WHERE YOU SET BREAKPOINTS!
        await taskState.Start(args ?? Array.Empty<object>());

        Console.WriteLine($"[RealHub] ✅ Task started: {taskId}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[RealHub] ❌ Error starting task: {ex.Message}");
    }
}
```

#### **MockHub.cs** (for MockClient mode)

Same code, but with `[MockHub]` prefix in logs:

```csharp
// src/Minimact.CommandCenter/Core/MockHub.cs

/// <summary>
/// Start a server task from MockClient
/// Uses REAL ComponentEngine - same code as production!
/// </summary>
public async Task StartServerTask(string componentId, string taskId, object[]? args = null)
{
    Console.WriteLine($"[MockHub] → StartServerTask({componentId}, {taskId})");

    // ... same implementation as RealHub ...
}
```

### 3️⃣ **Add Server→Client Messages (if needed)**

If the server needs to send data back to the client (e.g., progress updates), add to **RealPatchSender**:

```csharp
// src/Minimact.CommandCenter/Core/RealHub.cs (inside RealPatchSender class)

/// <summary>
/// Send server task state update to JavaScript
/// This is called by ServerTaskState when task progress/status changes
/// </summary>
public Task SendServerTaskUpdateAsync(string componentId, string taskId, object state)
{
    Console.WriteLine($"[RealPatchSender] Sending task update to JavaScript for {componentId}.{taskId}");

    var stateJson = System.Text.Json.JsonSerializer.Serialize(state);

    _client.JSRuntime.Execute($@"
        (function() {{
            if (typeof Minimact !== 'undefined' && Minimact.updateServerTask) {{
                console.log('[Minimact] Updating server task:', '{taskId}', {stateJson});
                Minimact.updateServerTask('{componentId}', '{taskId}', {stateJson});
            }} else {{
                console.warn('[Minimact] updateServerTask not found - task updates may not work');
            }}
        }})()
    ");

    return Task.CompletedTask;
}
```

### 4️⃣ **Build and Test**

```bash
# Build the CommandCenter project
cd src/Minimact.CommandCenter
dotnet build

# Build client runtime (if you made changes)
cd ../client-runtime
npm run build

# The build embeds minimact.js as a resource (see .csproj line 53)
```

### 5️⃣ **Create a Test Component**

```csharp
// Example: FileUploadComponent.cs

public class FileUploadComponent : MinimactComponent
{
    private ServerTaskState<FileUploadResult> uploadTask;

    protected override void OnInitialized()
    {
        uploadTask = GetServerTask<FileUploadResult>("fileUpload");
    }

    [ServerTask("fileUpload")]
    protected async Task<FileUploadResult> UploadFile(string fileName, byte[] data)
    {
        // Simulate file upload with progress
        for (int i = 0; i <= 100; i += 10)
        {
            await Task.Delay(200);
            uploadTask.UpdateProgress(i / 100.0);
        }

        return new FileUploadResult { Success = true, Url = $"/uploads/{fileName}" };
    }

    protected override VNode Render()
    {
        return VNode.CreateElement("div", null,
            VNode.CreateElement("h1", null, VNode.CreateText("File Upload Test")),

            uploadTask.Status == "running"
                ? VNode.CreateElement("div", null,
                    VNode.CreateText($"Uploading... {uploadTask.Progress * 100}%"))
                : VNode.CreateElement("button", new { onclick = "uploadTask.start(['test.jpg', []])" },
                    VNode.CreateText("Upload File"))
        );
    }
}
```

### 6️⃣ **Run in CommandCenter**

```csharp
// In your test or MainWindow.xaml.cs:

var client = UnifiedMinimactClient.CreateReal(); // or CreateMock()
await client.ConnectAsync();

var component = new FileUploadComponent();
var hub = client.RealClient.Hub;
hub.RegisterComponent("file-upload-1", component);

// Now JavaScript can call:
// connection.invoke('StartServerTask', 'file-upload-1', 'fileUpload', ['test.jpg', []])

// 🎯 SET BREAKPOINT in RealHub.StartServerTask() to step through!
```

---

## 🔍 Debugging Flow

1. **Set breakpoint** in `RealHub.StartServerTask()` (or your method)
2. **Run CommandCenter** in Visual Studio
3. JavaScript calls `connection.invoke('StartServerTask', ...)`
4. **Breakpoint hits!**
5. Step through:
   - RealHub method
   - ComponentEngine.XYZ()
   - Component.ServerTask()
   - Back to JavaScript via RealPatchSender

You can **watch the entire flow** from JavaScript → C# → back to JavaScript!

---

## 🦸 Ranger Gallery (Examples)

### 💜 Amethyst Ranger - useServerTask
**Purpose:** Long-running async operations (file uploads, data processing, ML inference)

**Hub Methods:**
- `StartServerTask(componentId, taskId, args)`
- `RetryServerTask(componentId, taskId, args)`
- `CancelServerTask(componentId, taskId)`

**Patch Sender:**
- `SendServerTaskUpdateAsync(componentId, taskId, state)` - Progress updates

### 🔷 Sapphire Ranger - usePub
**Purpose:** Publish events to channels

**Hub Methods:**
- `PublishToChannel(channel, data)`

**No patch sender needed** (fire-and-forget)

### 🔶 Ruby Ranger - useSub
**Purpose:** Subscribe to event channels

**Hub Methods:**
- `SubscribeToChannel(componentId, channel, callbackId)`
- `UnsubscribeFromChannel(componentId, channel)`

**Patch Sender:**
- `SendChannelMessageAsync(componentId, channel, data)` - Event delivery

### 💚 Emerald Ranger - useSignalR
**Purpose:** Direct SignalR connection control

**Hub Methods:**
- None (uses connection lifecycle events)

**Patch Sender:**
- `SendConnectionStateAsync(componentId, state)` - Connection status updates

### 🧡 Topaz Ranger - usePaginatedServerTask
**Purpose:** Paginated data loading with server tasks

**Hub Methods:**
- `StartPaginatedServerTask(componentId, taskId, page, pageSize, filter)`
- `LoadNextPage(componentId, taskId)`
- `LoadPreviousPage(componentId, taskId)`

**Patch Sender:**
- `SendPageDataAsync(componentId, taskId, pageData)` - Page results

---

## 📐 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Minimact.CommandCenter (WPF)             │
│                                                              │
│  ┌────────────────┐              ┌─────────────────┐        │
│  │  RealClient    │              │   MockClient    │        │
│  │                │              │                 │        │
│  │  ClearScript   │              │   Pure C#       │        │
│  │  V8 Engine     │              │   Simulation    │        │
│  │                │              │                 │        │
│  │  Loads         │              │                 │        │
│  │  minimact.js   │              │                 │        │
│  │  (REAL!)       │              │                 │        │
│  └────────┬───────┘              └────────┬────────┘        │
│           │                               │                 │
│           │ connection.invoke()           │                 │
│           │                               │                 │
│     ┌─────▼──────────┐            ┌──────▼─────┐           │
│     │   RealHub      │            │  MockHub   │           │
│     │                │            │            │           │
│     │  - StartTask() │            │ - StartTask()          │
│     │  - Retry()     │            │ - Retry()  │           │
│     │  - Cancel()    │            │ - Cancel() │           │
│     └────────┬───────┘            └──────┬─────┘           │
│              │                           │                  │
│              └───────────┬───────────────┘                  │
│                          │                                  │
│                    ┌─────▼──────────────┐                   │
│                    │  ComponentEngine   │                   │
│                    │                    │                   │
│                    │  🦕 REAL           │                   │
│                    │  PRODUCTION CODE!  │                   │
│                    │                    │                   │
│                    │  (set breakpoints) │                   │
│                    └────────────────────┘                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Template

```csharp
// 1. Add hub method to RealHub.cs:
public async Task YourMethodName(string componentId, params object[] args)
{
    Console.WriteLine($"[RealHub] 🎯 YourMethodName: {componentId}");

    var component = _engine.GetComponent(componentId);
    if (component == null) return;

    try
    {
        // Your logic here - call component methods, use ComponentEngine, etc.
        // The JavaScript already called this via connection.invoke()!
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[RealHub] ❌ Error: {ex.Message}");
    }
}

// 2. Copy to MockHub.cs (change [RealHub] → [MockHub])

// 3. If server needs to send updates back to client, add to RealPatchSender:
public Task SendYourUpdateAsync(string componentId, object data)
{
    var dataJson = System.Text.Json.JsonSerializer.Serialize(data);

    _client.JSRuntime.Execute($@"
        (function() {{
            if (typeof Minimact !== 'undefined' && Minimact.yourHandler) {{
                Minimact.yourHandler('{componentId}', {dataJson});
            }}
        }})()
    ");

    return Task.CompletedTask;
}

// 4. Build and test!
```

---

## 💡 Key Insights

1. **Don't simulate** - Run the real code
2. **Monkey-patch SignalR** - Bridge JS to C#
3. **Set breakpoints** - Debug the real flow
4. **Both modes work** - MockClient (fast) and RealClient (accurate)
5. **ComponentEngine is shared** - Same production code!

---

## 📚 Reference Files

- **RealHub.cs** - Real client hub with V8 JavaScript
- **MockHub.cs** - Mock client hub (pure C#)
- **RealClient.cs** - ClearScript V8 + AngleSharp setup
- **MockClient.cs** - Pure C# simulation
- **JSRuntime.cs** - V8 engine wrapper with monkey-patching
- **UnifiedMinimactClient.cs** - Unified API for both modes

---

**"It's morphin' time!" 🦕⚡**

Now you can test complex Minimact features with breakpoints, step-through debugging, and confidence that if tests pass, production works!
