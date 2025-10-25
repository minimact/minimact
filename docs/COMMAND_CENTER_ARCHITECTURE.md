# Minimact.CommandCenter - Architecture Design

**Tagline**: "It's Morphin' Time!" - Testing command center for Minimact Core & Minimact Punch

## Overview

Minimact.CommandCenter is a WPF application that acts as a comprehensive testing environment for the entire Minimact ecosystem. It simulates a browser client, runs the same web worker algorithms in C#, connects to the real MinimactHub via SignalR, and provides a visual UI for testing and debugging.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Minimact.CommandCenter (WPF)                  │
│                                                                  │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   MockClient   │  │  WorkerHost  │  │   TestConsole    │   │
│  │                │  │              │  │                  │   │
│  │ • DOM State    │  │ • C# Workers │  │ • Test Scripts   │   │
│  │ • Event Gen    │  │ • JsTypes    │  │ • Assertions     │   │
│  │ • HintQueue    │  │ • Algorithms │  │ • Benchmarks     │   │
│  └────────┬───────┘  └──────┬───────┘  └──────────────────┘   │
│           │                  │                                  │
│           └──────────┬───────┘                                  │
│                      │                                          │
│         ┌────────────▼───────────────┐                         │
│         │   SignalR Client Manager   │                         │
│         │                            │                         │
│         │ • Connection to Hub        │                         │
│         │ • Send/Receive Messages    │                         │
│         │ • Apply Patches            │                         │
│         └────────────┬───────────────┘                         │
└──────────────────────┼──────────────────────────────────────────┘
                       │
                       │ SignalR Connection
                       ▼
         ┌──────────────────────────────┐
         │     ASP.NET Core Server      │
         │                              │
         │  ┌────────────────────────┐  │
         │  │    MinimactHub         │  │
         │  │  (SignalR Hub)         │  │
         │  └───────────┬────────────┘  │
         │              │                │
         │  ┌───────────▼────────────┐  │
         │  │  MinimactComponent     │  │
         │  │  • State Management    │  │
         │  │  • Rendering           │  │
         │  │  • Reconciliation      │  │
         │  └───────────┬────────────┘  │
         │              │                │
         │  ┌───────────▼────────────┐  │
         │  │   Rust Reconciler      │  │
         │  │   (via P/Invoke)       │  │
         │  └────────────────────────┘  │
         └──────────────────────────────┘
```

---

## Components

### 1. MockClient (Browser Simulation)

Simulates a browser DOM and client-side Minimact runtime.

**Responsibilities:**
- Maintain virtual DOM state
- Generate user events (mouse, keyboard, scroll, focus)
- Run HintQueue matching logic
- Apply patches from server
- Track performance metrics

**Key Classes:**
```csharp
public class MockClient
{
    private MockDOM dom;
    private SignalRClientManager signalR;
    private HintQueue hintQueue;
    private Dictionary<string, ComponentState> components;

    // Initialize connection to server
    public async Task ConnectAsync(string serverUrl);

    // Simulate user action
    public void SimulateClick(string elementId);
    public void SimulateMouseMove(int x, int y);
    public void SimulateScroll(int deltaY);

    // Receive patches from server
    public void ApplyPatches(List<DOMPatch> patches);

    // Trigger prediction
    public void TriggerHint(string hintId, Dictionary<string, object> stateChanges);
}
```

**MockDOM Structure:**
```csharp
public class MockDOM
{
    private Dictionary<string, MockElement> elements;

    public MockElement GetElementById(string id);
    public void ApplyPatch(DOMPatch patch);
    public string ToHTML(); // For visualization
    public DOMSnapshot GetSnapshot(); // For assertions
}

public class MockElement
{
    public string Id { get; set; }
    public string TagName { get; set; }
    public Dictionary<string, string> Attributes { get; set; }
    public List<MockElement> Children { get; set; }
    public MockElement Parent { get; set; }
    public Rect BoundingBox { get; set; } // For intersection tests

    // Minimact Punch support
    public bool IsIntersecting { get; set; }
    public int ChildrenCount => Children.Count;
}
```

### 2. WorkerHost (C# Web Worker Simulation)

Runs the same algorithms as the browser web workers, using the C# source code from `Minimact.Workers`.

**Responsibilities:**
- Execute confidence engine algorithms
- Track mouse trajectory
- Detect scroll velocity
- Monitor focus sequences
- Generate predictions

**Key Classes:**
```csharp
public class WorkerHost
{
    private MouseTrajectoryTracker mouseTracker;
    private ScrollVelocityTracker scrollTracker;
    private FocusSequenceTracker focusTracker;
    private ConfidenceEngine confidenceEngine;

    // Process events
    public void OnMouseMove(MouseEventData eventData);
    public void OnScroll(ScrollEventData eventData);
    public void OnFocus(FocusEventData eventData);

    // Get predictions
    public ConfidencePrediction PredictNextAction();
    public List<ElementConfidence> GetElementConfidences();
}
```

**Integration with JsTypes:**
```csharp
// Uses the SAME C# code as gets transpiled!
public class MouseTrajectoryTracker
{
    private JsArray<TrajectoryPoint> history;  // ✅ Using JsTypes

    public MouseTrajectory GetTrajectory()
    {
        var points = history.Slice(0, 5);  // ✅ Same API as browser
        var filtered = points.filter(p => p.x > 0);  // ✅ Same algorithm
        // ... exact same code as browser executes!
    }
}
```

### 3. SignalRClientManager

Manages bidirectional communication with MinimactHub.

**Responsibilities:**
- Establish WebSocket connection
- Send method invocations to server
- Receive patches from server
- Handle connection lifecycle

**Key Classes:**
```csharp
public class SignalRClientManager
{
    private HubConnection connection;
    private MockClient client;

    public async Task ConnectAsync(string hubUrl);
    public async Task DisconnectAsync();

    // Send to server
    public async Task InvokeMethodAsync(string componentId, string methodName, object[] args);
    public async Task UpdateStateAsync(string componentId, string stateKey, object value);

    // Receive from server
    public void OnApplyPatches(string componentId, List<DOMPatch> patches);
    public void OnQueueHint(string componentId, string hintId, List<DOMPatch> patches);
}
```

### 4. TestConsole (Testing UI)

Provides interactive testing capabilities with scripting, assertions, and benchmarking.

**Responsibilities:**
- Run test scripts
- Display test results
- Show performance metrics
- Visualize DOM state
- Log SignalR messages

**UI Sections:**
```
┌─────────────────────────────────────────────────────────────┐
│ Minimact.CommandCenter                              [━][□][✕]│
├─────────────────────────────────────────────────────────────┤
│ 🎮 Rangers   📊 Metrics   📝 Console   🌳 DOM Tree   ⚙ Config│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Rangers Panel - Test Automation]                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Red Ranger    [Run]  ✓ Connected                       │ │
│  │ Test: Click sequence with predictive rendering         │ │
│  │ Status: PASSED (12/12 assertions)                      │ │
│  │                                                         │ │
│  │ Blue Ranger   [Run]  ✓ Connected                       │ │
│  │ Test: Scroll tracking + intersection observer          │ │
│  │ Status: RUNNING (3/8 steps)                            │ │
│  │                                                         │ │
│  │ Yellow Ranger [Run]  ⚠ Disconnected                    │ │
│  │ Test: Mouse trajectory prediction accuracy             │ │
│  │ Status: IDLE                                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Quick Actions]                                             │
│  [Simulate Click]  [Mouse Move]  [Scroll]  [Focus]         │
│                                                              │
│  [Live Metrics]                                              │
│  Cache Hit Rate: ██████████░░░░░░ 67%                      │
│  Avg Latency:    2.3ms                                      │
│  Predictions:    142 (85% accurate)                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Test Scenarios (Power Rangers)

Each "Ranger" represents a test scenario that exercises different parts of Minimact.

### Red Ranger - Core Functionality Test

**Tests:**
- Basic component rendering
- State updates via SignalR
- Patch application
- Event handling

**Script:**
```csharp
public class RedRangerTest : RangerTest
{
    public override async Task RunAsync()
    {
        // 1. Connect to server
        await client.ConnectAsync("http://localhost:5000");

        // 2. Load component
        await client.LoadComponentAsync("CounterComponent");

        // 3. Verify initial render
        Assert.Equal("0", client.DOM.GetElementById("counter-value").TextContent);

        // 4. Click increment button
        await client.SimulateClickAsync("increment-btn");

        // 5. Verify patch received and applied
        await Task.Delay(100); // Wait for SignalR roundtrip
        Assert.Equal("1", client.DOM.GetElementById("counter-value").TextContent);

        // 6. Verify hint queue cached prediction
        Assert.True(client.HintQueue.HasHint("CounterComponent", new { count = 2 }));

        Report.Pass("Red Ranger: Core functionality working!");
    }
}
```

### Blue Ranger - Predictive Rendering Test

**Tests:**
- HintQueue matching
- Cache hit rate
- Latency improvements
- Prediction accuracy

**Script:**
```csharp
public class BlueRangerTest : RangerTest
{
    public override async Task RunAsync()
    {
        await client.ConnectAsync("http://localhost:5000");
        await client.LoadComponentAsync("DropdownComponent");

        // Prime the hint queue
        await client.SimulateClickAsync("dropdown-trigger");
        await Task.Delay(100); // Server sends hint

        // Now test instant feedback
        var startTime = Stopwatch.GetTimestamp();
        await client.SimulateClickAsync("dropdown-trigger");
        var latency = Stopwatch.GetElapsedTime(startTime).TotalMilliseconds;

        // Should be instant (< 1ms) because of cached hint
        Assert.Less(latency, 1.0);

        // Verify DOM was updated immediately
        var dropdown = client.DOM.GetElementById("dropdown-menu");
        Assert.Equal("visible", dropdown.Attributes["data-state"]);

        Report.Pass($"Blue Ranger: Predictive rendering working! ({latency:F2}ms)");
    }
}
```

### Yellow Ranger - Minimact Punch Integration Test

**Tests:**
- useDomElementState tracking
- Intersection observer simulation
- Mutation observer simulation
- Resize observer simulation
- DOM-reactive state sync

**Script:**
```csharp
public class YellowRangerTest : RangerTest
{
    public override async Task RunAsync()
    {
        await client.ConnectAsync("http://localhost:5000");
        await client.LoadComponentAsync("LazyImageComponent");

        // Component uses useDomElementState with intersection observer
        var lazyImage = client.DOM.GetElementById("lazy-img");

        // Initially not intersecting
        Assert.False(lazyImage.IsIntersecting);
        Assert.Equal("", lazyImage.Attributes["src"]); // Not loaded yet

        // Simulate scroll into view
        client.SimulateScroll(500); // Scroll down

        // Worker detects intersection
        worker.OnIntersection(new IntersectionData
        {
            ElementId = "lazy-img",
            IsIntersecting = true,
            IntersectionRatio = 0.5
        });

        // Should trigger state update
        await Task.Delay(100);

        // Image should now be loaded
        Assert.NotEqual("", lazyImage.Attributes["src"]);

        Report.Pass("Yellow Ranger: Minimact Punch working!");
    }
}
```

### Green Ranger - Mouse Trajectory Prediction Test

**Tests:**
- MouseTrajectoryTracker algorithm
- Hover confidence calculation
- Ray-box intersection math
- Prediction accuracy

**Script:**
```csharp
public class GreenRangerTest : RangerTest
{
    public override async Task RunAsync()
    {
        await client.ConnectAsync("http://localhost:5000");
        await client.LoadComponentAsync("MenuComponent");

        // Get element bounds
        var menuButton = client.DOM.GetElementById("menu-btn");
        var bounds = menuButton.BoundingBox;

        // Simulate mouse trajectory toward button
        var trajectory = new[]
        {
            new { x = 100, y = 100, timestamp = 0 },
            new { x = 120, y = 110, timestamp = 50 },
            new { x = 140, y = 120, timestamp = 100 },
            new { x = 160, y = 130, timestamp = 150 },
            // Heading toward button at (200, 150)
        };

        foreach (var point in trajectory)
        {
            worker.OnMouseMove(new MouseEventData
            {
                X = point.x,
                Y = point.y,
                Timestamp = point.timestamp
            });
        }

        // Calculate hover confidence
        var result = worker.MouseTracker.CalculateHoverConfidence(bounds);

        // Should predict high confidence of hover
        Assert.Greater(result.Confidence, 0.7);
        Assert.Less(result.LeadTime, 200); // Within 200ms

        Report.Pass($"Green Ranger: Mouse prediction working! (confidence: {result.Confidence:P})");
    }
}
```

### Pink Ranger - Performance Stress Test

**Tests:**
- High-frequency updates
- Large DOM trees
- Many concurrent components
- Memory usage
- GC pressure

**Script:**
```csharp
public class PinkRangerTest : RangerTest
{
    public override async Task RunAsync()
    {
        await client.ConnectAsync("http://localhost:5000");

        // Load 100 components
        var tasks = Enumerable.Range(0, 100)
            .Select(i => client.LoadComponentAsync($"Component{i}"));
        await Task.WhenAll(tasks);

        // Blast 1000 state updates
        var sw = Stopwatch.StartNew();
        for (int i = 0; i < 1000; i++)
        {
            await client.UpdateStateAsync("Component0", "count", i);
        }
        sw.Stop();

        var avgLatency = sw.ElapsedMilliseconds / 1000.0;

        // Should handle load efficiently
        Assert.Less(avgLatency, 5.0); // < 5ms per update

        Report.Pass($"Pink Ranger: Performance test passed! ({avgLatency:F2}ms avg)");
    }
}
```

---

## Project Structure

```
Minimact.CommandCenter/
├── Minimact.CommandCenter.csproj
├── App.xaml
├── App.xaml.cs
├── MainWindow.xaml
├── MainWindow.xaml.cs
│
├── Core/
│   ├── MockClient.cs
│   ├── MockDOM.cs
│   ├── MockElement.cs
│   ├── SignalRClientManager.cs
│   └── WorkerHost.cs
│
├── Rangers/  (Test Scenarios)
│   ├── RangerTest.cs (base class)
│   ├── RedRanger.cs
│   ├── BlueRanger.cs
│   ├── YellowRanger.cs
│   ├── GreenRanger.cs
│   └── PinkRanger.cs
│
├── UI/
│   ├── Views/
│   │   ├── RangersPanel.xaml
│   │   ├── MetricsPanel.xaml
│   │   ├── ConsolePanel.xaml
│   │   ├── DOMTreePanel.xaml
│   │   └── ConfigPanel.xaml
│   │
│   └── ViewModels/
│       ├── MainViewModel.cs
│       ├── RangersPanelViewModel.cs
│       ├── MetricsPanelViewModel.cs
│       └── ConsolePanelViewModel.cs
│
├── Models/
│   ├── DOMPatch.cs
│   ├── DOMSnapshot.cs
│   ├── TestResult.cs
│   ├── PerformanceMetrics.cs
│   └── EventData.cs
│
└── Utils/
    ├── DOMRenderer.cs  (Visualize DOM as HTML)
    ├── PatchApplicator.cs
    ├── AssertionHelper.cs
    └── Logger.cs
```

---

## Dependencies

```xml
<ItemGroup>
  <!-- WPF -->
  <PackageReference Include="Microsoft.NET.Sdk.WindowsDesktop" Version="8.0.0" />

  <!-- SignalR Client -->
  <PackageReference Include="Microsoft.AspNetCore.SignalR.Client" Version="8.0.0" />

  <!-- MVVM -->
  <PackageReference Include="CommunityToolkit.Mvvm" Version="8.2.2" />

  <!-- JSON -->
  <PackageReference Include="System.Text.Json" Version="8.0.0" />

  <!-- Testing -->
  <PackageReference Include="NUnit" Version="4.0.1" />
  <PackageReference Include="FluentAssertions" Version="6.12.0" />
</ItemGroup>

<ItemGroup>
  <!-- Reference actual worker code -->
  <ProjectReference Include="..\Minimact.Workers\Minimact.Workers.csproj" />

  <!-- Reference core types -->
  <ProjectReference Include="..\Minimact.AspNetCore\Minimact.AspNetCore.csproj" />
</ItemGroup>
```

---

## Key Features

### 1. Algorithm Parity Verification

**The Guarantee**: WorkerHost runs the **exact same C# code** that gets transpiled to TypeScript.

```csharp
// In CommandCenter
var workerResult = worker.MouseTracker.CalculateHoverConfidence(bounds);

// This SAME code transpiles to browser:
// const workerResult = worker.mouseTracker.calculateHoverConfidence(bounds);

// GUARANTEED to produce same results!
```

### 2. Visual DOM Debugging

Render the MockDOM as HTML for inspection:

```csharp
public class DOMRenderer
{
    public string RenderAsHTML(MockDOM dom)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<div id='root'>");

        foreach (var element in dom.GetRootElements())
        {
            RenderElement(element, sb, indent: 1);
        }

        sb.AppendLine("</div>");
        return sb.ToString();
    }

    private void RenderElement(MockElement element, StringBuilder sb, int indent)
    {
        var indentStr = new string(' ', indent * 2);

        sb.Append($"{indentStr}<{element.TagName}");

        foreach (var attr in element.Attributes)
        {
            sb.Append($" {attr.Key}=\"{attr.Value}\"");
        }

        sb.AppendLine(">");

        foreach (var child in element.Children)
        {
            RenderElement(child, sb, indent + 1);
        }

        sb.AppendLine($"{indentStr}</{element.TagName}>");
    }
}
```

### 3. Performance Profiling

Track every metric:

```csharp
public class PerformanceMetrics
{
    public int TotalPatchesReceived { get; set; }
    public int TotalPatchesApplied { get; set; }
    public int CacheHits { get; set; }
    public int CacheMisses { get; set; }
    public double AverageLatency { get; set; }
    public double CacheHitRate => (double)CacheHits / (CacheHits + CacheMisses);

    public List<LatencyMeasurement> Latencies { get; set; } = new();
}

public class LatencyMeasurement
{
    public DateTime Timestamp { get; set; }
    public string Operation { get; set; }
    public double Milliseconds { get; set; }
    public bool CacheHit { get; set; }
}
```

### 4. Test Recording & Playback

Record user interactions for regression testing:

```csharp
public class TestRecorder
{
    private List<UserAction> recording = new();

    public void Record(UserAction action)
    {
        recording.Add(action);
    }

    public async Task PlaybackAsync(MockClient client)
    {
        foreach (var action in recording)
        {
            await action.ExecuteAsync(client);
            await Task.Delay(action.DelayAfter);
        }
    }

    public void SaveToFile(string path)
    {
        var json = JsonSerializer.Serialize(recording);
        File.WriteAllText(path, json);
    }
}
```

---

## Next Steps

1. Create WPF project structure
2. Implement MockClient and MockDOM
3. Implement SignalRClientManager
4. Implement WorkerHost
5. Create Ranger test scenarios
6. Build UI panels
7. Test against real MinimactHub

Want me to start implementing the project structure?
