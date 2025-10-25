# Minimact.CommandCenter - Critical Notes for Future Me

## Things You'll Definitely Forget (But Shouldn't)

### 1. **Why the MockClient Uses the SAME ComponentContext Structure**

**Critical**: The MockClient's `ComponentContext` is not just similar - it's **byte-for-byte identical** to the browser's TypeScript version.

**Why this matters**:
- When you test in CommandCenter, you're testing the **exact same state management flow** as the browser
- If a bug exists in state sync, it will appear in **both** CommandCenter and browser
- This is the ONLY way to guarantee test validity

**What will break if you don't maintain parity**:
```csharp
// ❌ DON'T DO THIS - diverging from browser structure
public class ComponentContext
{
    public Dictionary<int, object> State { get; set; } // ❌ Browser uses string keys!
}

// ✅ DO THIS - exact mirror
public class ComponentContext
{
    public Dictionary<string, object> State { get; set; } // ✅ Matches browser
}
```

---

### 2. **The HintQueue Matching Algorithm Must Be Simple**

**Trap**: You'll be tempted to make the hint matching "smarter" with ML or fuzzy matching.

**DON'T**. Here's why:
- The browser HintQueue uses **simple equality checks**
- If CommandCenter uses a different algorithm, tests will pass but browser will fail
- Keep it stupid simple: exact state key matches only

**Current design**:
```csharp
public QueuedHint MatchHint(string componentId, Dictionary<string, object> stateChanges)
{
    // Simple: just find ANY hint for this component
    // Server sends hints pre-matched to specific state changes
    return hints[componentId].FirstOrDefault();
}
```

**Future improvement** (if needed):
- Server includes a `stateFingerprint` with each hint
- Client matches hint only if `stateFingerprint` matches current state
- Both client and server use **identical fingerprint algorithm**

---

### 3. **Worker Algorithms Run in BOTH Places**

**This is the entire point of the transpiler!**

```
┌─────────────────────────────────────────────────────┐
│  C# Source: MouseTrajectoryTracker.cs              │
│                                                      │
│  double minDistance_let = double.PositiveInfinity;  │
│  // ... algorithm ...                               │
└──────────────┬──────────────────────────────────────┘
               │
               ├──────────────────┐
               │                  │
               ▼                  ▼
      ┌────────────────┐  ┌──────────────────┐
      │ CommandCenter  │  │  Transpiler      │
      │ (runs C#)      │  │  (C# → TS)       │
      └────────────────┘  └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  Browser         │
                          │  (runs TS)       │
                          └──────────────────┘
```

**What this means**:
- Any bug fix in C# **automatically** propagates to browser via transpiler
- CommandCenter runs the **actual production algorithm**, not a mock
- If CommandCenter test passes, browser behavior is **guaranteed correct**

**Future footgun**:
If you ever add browser-specific code that can't run in C#:
```typescript
// ❌ This breaks CommandCenter parity
const result = await navigator.geolocation.getCurrentPosition();
```

Solution: Use dependency injection
```typescript
// ✅ This works in both
const result = await geolocationProvider.getCurrentPosition();
// CommandCenter: inject mock provider
// Browser: inject real navigator
```

---

### 4. **The MockDOM Bounding Boxes Are Not Optional**

**You'll forget**: Minimact Punch's `useDomElementState` needs element positions for intersection observer.

**MockDOM MUST track**:
```csharp
public class MockElement
{
    public Rect BoundingBox { get; set; }  // ✅ REQUIRED for Minimact Punch
    // ... other properties
}
```

**Why**:
```csharp
// When you simulate scroll
client.SimulateScroll(500);

// Intersection observer needs to know:
// - Where is the element? (BoundingBox)
// - Where is the viewport? (viewportRect)
// - Do they intersect? (geometry calculation)

bool isIntersecting = viewportRect.Intersects(element.BoundingBox);
```

**Future footgun**:
You'll add elements to MockDOM and forget to set BoundingBox.
Result: `useDomElementState` tests will silently fail (no intersections detected).

**Solution**: Make BoundingBox required in constructor
```csharp
public MockElement(string id, string tagName, Rect boundingBox)
{
    Id = id;
    TagName = tagName;
    BoundingBox = boundingBox ?? throw new ArgumentNullException(nameof(boundingBox));
}
```

---

### 5. **SignalR Connection State Matters**

**You'll write a test like this**:
```csharp
var client = new MockClient();
await client.ConnectAsync("http://localhost:5000");

// Immediately try to invoke
await client.SignalR.InvokeMethodAsync("Counter", "Increment"); // ❌ MIGHT FAIL!
```

**Problem**: SignalR connection is async. Connection might not be ready.

**Solution**: Wait for connection state
```csharp
var client = new MockClient();
await client.ConnectAsync("http://localhost:5000");

// ✅ Wait for connection to be ready
await client.WaitForConnectionAsync();

await client.SignalR.InvokeMethodAsync("Counter", "Increment"); // ✅ Works
```

**Add this to MockClient**:
```csharp
public async Task WaitForConnectionAsync(TimeSpan? timeout = null)
{
    var maxWait = timeout ?? TimeSpan.FromSeconds(5);
    var stopwatch = Stopwatch.StartNew();

    while (signalR.ConnectionState != HubConnectionState.Connected)
    {
        if (stopwatch.Elapsed > maxWait)
            throw new TimeoutException("SignalR connection timeout");

        await Task.Delay(50);
    }
}
```

---

### 6. **The Rangers Are Not Just Tests - They're Living Documentation**

**Each Ranger test should**:
1. Test a specific feature
2. Document how that feature works
3. Serve as an example for developers

**Example**:
```csharp
/// <summary>
/// Red Ranger - Tests core Minimact functionality
///
/// What this tests:
/// - Component initialization
/// - State management via useState
/// - Event handling via SignalR
/// - DOM patch application
/// - HintQueue predictive rendering
///
/// How to run:
/// 1. Start ASP.NET Core server (dotnet run in Minimact.Server)
/// 2. Click "Red Ranger" in CommandCenter
/// 3. Watch console for detailed logs
///
/// Expected result:
/// - All assertions pass
/// - Cache hit rate > 50%
/// - Average latency < 10ms
/// </summary>
public class RedRanger : RangerTest
{
    // ...
}
```

**Future you will thank past you** for these detailed comments when debugging a failing test at 2 AM.

---

### 7. **Performance Metrics Are for Regression Detection, Not Absolute Numbers**

**You'll write tests like**:
```csharp
Assert.Less(latency, 5.0); // ❌ Flaky! Depends on machine speed
```

**Better**:
```csharp
// Store baseline metrics
var baseline = PerformanceBaseline.Load("RedRanger");

// Run test
var metrics = await RunTestAsync();

// Compare to baseline (allow 20% variance)
Assert.InRange(metrics.AverageLatency,
    baseline.AverageLatency * 0.8,
    baseline.AverageLatency * 1.2);

// Update baseline if test passes
baseline.Update(metrics);
```

**Why**: Absolute numbers vary by machine. Relative performance matters.

---

### 8. **The DOM Tree Visualization Is Critical for Debugging**

**You'll spend hours debugging**:
```
Test failed: Expected element #menu to be visible
```

**Without DOM visualization**: You have no idea what the DOM actually looks like.

**With DOM visualization**:
```xml
<div id="root">
  <div id="app" data-component-id="AppComponent">
    <nav id="navbar">
      <button id="menu-btn">Menu</button>
      <!-- ❌ #menu is missing! Bug in patch application? -->
    </nav>
  </div>
</div>
```

**Add this to CommandCenter UI**:
```csharp
// In DOMTreePanel.xaml.cs
private void UpdateDOMTree()
{
    var html = DOMRenderer.RenderAsHTML(client.DOM);
    DOMTreeView.Text = html;
}
```

**Future you**: Set up auto-refresh every 100ms during test runs.

---

### 9. **Test Isolation Is Not Automatic**

**You'll write tests like**:
```csharp
[Test]
public async Task Test1()
{
    var client = new MockClient();
    await client.ConnectAsync("...");
    // Test uses component "Counter"
}

[Test]
public async Task Test2()
{
    var client = new MockClient();
    await client.ConnectAsync("...");
    // Also uses component "Counter" ❌ STATE LEAK!
}
```

**Problem**: Server-side components persist between tests.

**Solution**: Reset server state between tests
```csharp
public class RangerTest
{
    protected MockClient client;

    [SetUp]
    public async Task SetUp()
    {
        client = new MockClient();
        await client.ConnectAsync("http://localhost:5000");

        // ✅ Tell server to reset all components
        await client.SignalR.InvokeAsync("ResetAllComponents");
    }

    [TearDown]
    public async Task TearDown()
    {
        await client.DisconnectAsync();
        client.Dispose();
    }
}
```

**Add this to MinimactHub.cs**:
```csharp
public Task ResetAllComponents()
{
    _componentRegistry.Clear();
    return Task.CompletedTask;
}
```

---

### 10. **Error Handling in SignalR Is Not What You Think**

**This WON'T catch server errors**:
```csharp
try
{
    await signalR.InvokeMethodAsync("Counter", "Divide", 10, 0);
}
catch (Exception ex)
{
    // ❌ This might not catch the division by zero error!
}
```

**Why**: SignalR doesn't throw on server-side exceptions by default.

**Solution**: Server must send error explicitly
```csharp
// In MinimactHub.cs
public async Task InvokeComponentMethod(string componentId, string methodName, object[] args)
{
    try
    {
        // ... invoke method ...
    }
    catch (Exception ex)
    {
        // ✅ Send error to client explicitly
        await Clients.Caller.SendAsync("Error", new
        {
            componentId,
            methodName,
            error = ex.Message,
            stackTrace = ex.StackTrace
        });
    }
}
```

**In MockClient**:
```csharp
connection.On<object>("Error", (error) =>
{
    Console.WriteLine($"[SignalR] ❌ Server error: {error}");
    LastError = error;
});
```

---

### 11. **The WorkerHost Is Not a Sandbox**

**You'll assume**: WorkerHost runs in isolation like a browser web worker.

**Reality**: It's just C# code in the same process.

**This means**:
```csharp
// ❌ This will modify shared state!
public class MouseTracker
{
    private static List<Point> globalHistory = new(); // ❌ STATIC!

    public void TrackMove(Point p)
    {
        globalHistory.Add(p); // ❌ Shared across ALL tests!
    }
}
```

**Solution**: NO STATIC STATE in worker code
```csharp
// ✅ Instance state only
public class MouseTracker
{
    private List<Point> history = new(); // ✅ Per-instance

    public void TrackMove(Point p)
    {
        history.Add(p);
    }
}
```

**Add this to your Roslyn analyzer** (future task):
```csharp
// Rule: No static fields in Minimact.Workers namespace
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public class NoStaticStateAnalyzer : DiagnosticAnalyzer
{
    // Error if static field found in worker files
}
```

---

### 12. **Timing Is Everything in Predictive Rendering Tests**

**This test will be flaky**:
```csharp
// Click button
await client.SimulateClickAsync("increment-btn");

// Check DOM immediately
var value = client.DOM.GetElementById("counter-value").TextContent;
Assert.Equal("1", value); // ❌ RACE CONDITION!
```

**Why**:
1. Client applies cached patches (instant)
2. Server processes method (async)
3. Server sends patches back (async)
4. Patches might arrive AFTER the assertion

**Solution**: Distinguish between cached and server updates
```csharp
// Click button
await client.SimulateClickAsync("increment-btn");

// ✅ Check CACHED patch was applied (synchronous)
var cachedValue = client.DOM.GetElementById("counter-value").TextContent;
Assert.Equal("1", cachedValue); // From HintQueue

// ✅ Wait for server confirmation
await client.WaitForServerPatchAsync();

// ✅ Check server patch matches cached patch
var confirmedValue = client.DOM.GetElementById("counter-value").TextContent;
Assert.Equal("1", confirmedValue); // Server confirmed
```

---

### 13. **The Command Center Is NOT a Browser**

**What's missing**:
- No JavaScript execution
- No CSS layout engine
- No actual rendering
- No real browser APIs (localStorage, fetch, etc.)

**Implications**:
- You can't test "Does the button look right?" (CSS)
- You can't test "Does the animation play?" (CSS transitions)
- You CAN test "Does the state update correctly?" (Logic)
- You CAN test "Do the right DOM mutations happen?" (Structure)

**CommandCenter tests logic, not presentation.**

**For visual testing**: Use browser-based E2E tests (Playwright, Cypress)
**For logic testing**: Use CommandCenter

---

### 14. **Version Compatibility Matrix**

**Future you will ask**: "Which version of CommandCenter works with which version of Minimact.AspNetCore?"

**Create a compatibility matrix**:

| CommandCenter | Minimact.AspNetCore | Notes |
|---------------|---------------------|-------|
| 1.0.0         | 1.0.0              | Initial release |
| 1.1.0         | 1.0.0, 1.1.0       | Added Minimact Punch support |
| 2.0.0         | 2.0.0+             | Breaking: New SignalR protocol |

**Store this in**:
- `docs/VERSION_COMPATIBILITY.md`
- Check at runtime:

```csharp
public async Task ConnectAsync(string hubUrl)
{
    await connection.StartAsync();

    // ✅ Check version compatibility
    var serverVersion = await connection.InvokeAsync<string>("GetVersion");
    if (!IsCompatible(CLIENT_VERSION, serverVersion))
    {
        throw new InvalidOperationException(
            $"Version mismatch: CommandCenter {CLIENT_VERSION} incompatible with server {serverVersion}"
        );
    }
}
```

---

### 15. **The Power Rangers Theme Is Not Just Fun - It's Functional**

**You'll be tempted** to rename Rangers to boring names like "Test1", "Test2".

**DON'T**.

**Why the Power Rangers theme works**:
1. **Memorable**: "Red Ranger failed" is easier to remember than "Test_CoreFunctionality failed"
2. **Color coding**: UI can show Rangers with actual colors (Red=❌, Green=✅)
3. **Team metaphor**: Each Ranger has a specialty, like a real team
4. **Fun**: Testing is boring. Rangers make it less boring.

**Future additions**:
- Gold Ranger: Advanced features test
- Black Ranger: Error handling test
- White Ranger: Integration test (all features together)

**UI mockup**:
```
Rangers Panel:
🔴 Red Ranger    [Run] ✓ Passed
🔵 Blue Ranger   [Run] ❌ Failed (assertion #3)
🟡 Yellow Ranger [Run] ⏳ Running...
🟢 Green Ranger  [Run] ✓ Passed
🩷 Pink Ranger   [Run] - Not run
```

---

## Summary: Don't Repeat These Mistakes

1. ❌ Diverging MockClient structure from browser
2. ❌ Making HintQueue matching "smart"
3. ❌ Forgetting MockDOM bounding boxes
4. ❌ Not waiting for SignalR connection
5. ❌ Writing flaky performance assertions
6. ❌ Not visualizing DOM during debugging
7. ❌ Leaking state between tests
8. ❌ Assuming SignalR throws on server errors
9. ❌ Using static state in workers
10. ❌ Race conditions in timing-sensitive tests
11. ❌ Trying to test visual presentation
12. ❌ Ignoring version compatibility
13. ❌ Removing the Power Rangers theme (seriously, keep it!)

**When in doubt**: Keep it simple, keep it parity, keep it Power Rangers. 🦕⚡
