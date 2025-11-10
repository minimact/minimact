# Mock Client Testing Strategy for Minimact

## Overview

This document describes a comprehensive testing strategy that uses **C# XUnit tests as mock clients** to test the complete Minimact stack: Web Workers, SignalR real-time communication, and ASP.NET Core backend.

## The Problem

Traditional approaches to testing full-stack real-time applications face several challenges:

1. **Browser-based testing is slow** - Selenium/Playwright adds significant overhead
2. **Mocking loses fidelity** - Mocked SignalR/Workers don't behave like the real thing
3. **Integration gaps** - Unit tests miss issues in the communication layer
4. **Debugging complexity** - Hard to step through client → server → client flows
5. **Prediction accuracy unknown** - No way to measure how well the prediction engine works

## The Solution: C# Mock Client Architecture

Instead of mocking components or running browser tests, we create a **mock client in C#** that:

- Executes the **real web worker logic** (written in C# via Bridge.NET)
- Connects to the **real SignalR hub** (using TestServer)
- Calls the **real ASP.NET Core backend** (in-process)
- Validates the **complete interaction flow**

```
┌─────────────────────────────────────────────────────────┐
│  XUnit Test (C#)                                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Mock Client                                      │  │
│  │  ├─ Web Worker Logic (C# → Bridge.NET → JS)      │  │
│  │  ├─ SignalR HubConnection (Real)                 │  │
│  │  └─ HttpClient (Real, via TestServer)            │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ASP.NET Core (Real, In-Process)                  │  │
│  │  ├─ SignalR Hub                                   │  │
│  │  ├─ Controllers/Minimal APIs                      │  │
│  │  ├─ Services & Business Logic                     │  │
│  │  └─ EF Core / Database (In-Memory or TestContainers)│ │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Web Worker in C#

Write your web worker logic in C# and transpile to JavaScript using Bridge.NET:

```csharp
// PredictionWorker.cs - Runs in tests AND browser
namespace Minimact.Workers
{
    public class PredictionWorker
    {
        public static PredictionHint[] AnalyzeInteraction(dynamic data)
        {
            // Prediction logic here
            if (data.type == "click" && data.target == "increment")
            {
                return new[] 
                { 
                    new PredictionHint 
                    { 
                        Key = "increment",
                        State = new { count = data.state.count + 1 }
                    }
                };
            }
            
            return Array.Empty<PredictionHint>();
        }
    }
}
```

**Benefits:**
- ✅ Same code runs in tests and production
- ✅ No JavaScript needed for worker logic
- ✅ Share prediction algorithms with server
- ✅ Type-safe worker development

### 2. Mock Client Class

A C# class that simulates browser behavior:

```csharp
public class MockClient : IAsyncDisposable
{
    private readonly HubConnection _hubConnection;
    private readonly HttpClient _httpClient;
    private readonly List<DomPatch> _receivedPatches = new();

    public MockClient(TestServer server)
    {
        _httpClient = server.CreateClient();
        
        _hubConnection = new HubConnectionBuilder()
            .WithUrl($"http://localhost/minimact-hub", options =>
            {
                options.HttpMessageHandlerFactory = _ => server.CreateHandler();
            })
            .Build();

        // Subscribe to SignalR events
        _hubConnection.On<DomPatch>("ReceivePatch", patch =>
        {
            _receivedPatches.Add(patch);
        });
    }

    public async Task ConnectAsync()
    {
        await _hubConnection.StartAsync();
    }

    // Simulate web worker prediction
    public PredictionHint[] SimulateWorkerPrediction(
        InteractionEvent interaction, 
        object currentState)
    {
        // Call REAL worker code
        return PredictionWorker.AnalyzeInteraction(new 
        { 
            type = interaction.Type,
            target = interaction.Target,
            state = currentState
        });
    }

    // Simulate user interaction
    public async Task<StateChangeResult> TriggerInteraction(
        string componentId, 
        string action, 
        object payload)
    {
        // 1. Generate prediction (like browser worker would)
        var predictions = SimulateWorkerPrediction(
            new InteractionEvent { Type = "click", Target = action },
            payload
        );

        // 2. Apply optimistic patch
        var optimisticPatch = predictions.FirstOrDefault();
        
        // 3. Send to server via SignalR
        await _hubConnection.InvokeAsync(
            "TriggerAction", 
            componentId, 
            action, 
            payload
        );

        // 4. Wait for server verification
        var verificationPatch = await WaitForPatch(
            timeout: TimeSpan.FromSeconds(5)
        );

        // 5. Compare prediction vs reality
        return new StateChangeResult
        {
            PredictedPatch = optimisticPatch,
            VerifiedPatch = verificationPatch,
            PredictionAccurate = optimisticPatch?.StateHash == 
                                 verificationPatch?.StateHash
        };
    }
}
```

### 3. Integration Tests

XUnit tests that exercise the complete flow:

```csharp
public class MinimactIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Counter_Increment_WorkerPredictsCorrectly()
    {
        // Arrange
        await using var client = new MockClient(_factory.Server);
        await client.ConnectAsync();
        await client.LoadPage("/counter");
        
        // Act - Simulate user clicking increment
        var result = await client.TriggerInteraction(
            componentId: "counter-1",
            action: "increment",
            payload: new { count = 0 }
        );

        // Assert - Verify complete flow
        Assert.NotNull(result.PredictedPatch);
        Assert.NotNull(result.VerifiedPatch);
        Assert.True(result.PredictionAccurate);
        Assert.Equal(1, result.VerifiedPatch.State.count);
    }

    [Fact]
    public async Task MeasurePredictionAccuracy_AcrossMultipleInteractions()
    {
        await using var client = new MockClient(_factory.Server);
        await client.ConnectAsync();

        var results = new List<StateChangeResult>();

        // Simulate 100 user interactions
        for (int i = 0; i < 100; i++)
        {
            var result = await client.TriggerInteraction(
                componentId: "counter-1",
                action: "increment",
                payload: new { count = i }
            );
            results.Add(result);
        }

        // Calculate prediction accuracy
        var accuracy = results.Count(r => r.PredictionAccurate) / 100.0;
        
        Assert.True(accuracy >= 0.95, 
            $"Expected 95%+ accuracy, got {accuracy:P}");
    }
}
```

## Architecture Flow

### Typical Test Execution Flow

```
1. XUnit Test Starts
   ↓
2. MockClient Created
   ├─ TestServer started (ASP.NET Core in-process)
   ├─ HttpClient configured
   └─ SignalR HubConnection established
   ↓
3. Simulate Page Load
   ├─ HTTP GET /counter
   ├─ Parse initial state from HTML
   └─ Worker generates initial predictions
   ↓
4. Simulate User Interaction (e.g., button click)
   ├─ Worker analyzes interaction → generates prediction
   ├─ Apply optimistic patch (cached)
   ├─ Send action to server via SignalR
   └─ Wait for server verification patch
   ↓
5. Validation
   ├─ Compare predicted vs verified patch
   ├─ Measure latency
   ├─ Track prediction accuracy
   └─ Assert expected behavior
   ↓
6. Cleanup
   └─ Dispose MockClient (closes SignalR, TestServer)
```

## Benefits of This Approach

### 1. **No Mocking Required**
- Worker logic: ✅ Real (C# code)
- SignalR: ✅ Real (TestServer)
- Backend: ✅ Real (in-process)
- Database: ✅ Real (in-memory or TestContainers)

### 2. **Fast Execution**
- No browser startup overhead
- No Selenium/Playwright
- All in-process communication
- Tests run in milliseconds

### 3. **Easy Debugging**
- Single process
- Step through entire flow in one debugger
- Set breakpoints across client → server → client
- Inspect SignalR messages in real-time

### 4. **Prediction Metrics**
- Measure prediction accuracy per component
- Track prediction hit rates over time
- Identify problematic interaction patterns
- Optimize prediction algorithms based on data

### 5. **Code Reuse**
- Worker logic shared between production and tests
- Prediction algorithms shared with server
- Type-safe contracts across the stack
- Single source of truth for business logic

### 6. **Comprehensive Coverage**
- Tests the complete interaction flow
- Validates SignalR communication
- Verifies prediction → verification cycle
- Catches integration issues early

## Test Scenarios

### Basic Interactions

```csharp
[Fact]
public async Task Button_Click_TriggersStateChange()
{
    // Test basic user interaction flow
}

[Fact]
public async Task Input_Change_UpdatesClientState()
{
    // Test client-side state (useClientState)
}

[Fact]
public async Task Form_Submit_ValidatesAndUpdatesServer()
{
    // Test server-side validation and state update
}
```

### Prediction Accuracy

```csharp
[Fact]
public async Task DeterministicUI_HighPredictionAccuracy()
{
    // Counters, toggles should be 95%+ accurate
}

[Fact]
public async Task DynamicUI_ModeratePredictionAccuracy()
{
    // Lists, conditionals should be 70-85% accurate
}

[Fact]
public async Task ServerValidation_PredictionCorrection()
{
    // Test cases where prediction is wrong and server corrects
}
```

### Performance Testing

```csharp
[Fact]
public async Task RapidInteractions_MaintainAccuracy()
{
    // Simulate rapid clicking, measure stability
}

[Fact]
public async Task LatencyMeasurement_UnderThreshold()
{
    // Verify perceived latency stays under 5ms
}

[Fact]
public async Task ConcurrentUsers_SignalRScalability()
{
    // Create multiple MockClients, test concurrent interactions
}
```

### Edge Cases

```csharp
[Fact]
public async Task NetworkDisconnect_GracefulDegradation()
{
    // Disconnect SignalR, verify app still works
}

[Fact]
public async Task ServerError_ClientRecovers()
{
    // Server returns error, verify client handles it
}

[Fact]
public async Task StaleState_ConflictResolution()
{
    // Concurrent updates, verify operational transform
}
```

## Implementation Steps

### Step 1: Setup Bridge.NET for Worker

```xml
<!-- Minimact.Workers.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
  
  <ItemGroup>
    <PackageReference Include="Bridge" Version="17.10.1" />
    <PackageReference Include="Bridge.Core" Version="17.10.1" />
  </ItemGroup>
</Project>
```

### Step 2: Write Worker Logic in C#

```csharp
// PredictionWorker.cs
namespace Minimact.Workers
{
    [FileName("prediction-worker.js")]
    public class PredictionWorker
    {
        public static PredictionHint[] AnalyzeInteraction(dynamic data)
        {
            // Your prediction logic
            return PredictionEngine.GenerateHints(data);
        }
    }
}
```

### Step 3: Create Mock Client Infrastructure

```csharp
// MockClient.cs
public class MockClient : IAsyncDisposable
{
    // Implementation from above
}

// Supporting types
public class StateChangeResult
{
    public PredictionHint PredictedPatch { get; set; }
    public DomPatch VerifiedPatch { get; set; }
    public bool PredictionAccurate { get; set; }
    public TimeSpan Latency { get; set; }
}

public class InteractionEvent
{
    public string Type { get; set; }
    public string Target { get; set; }
}
```

### Step 4: Write Integration Tests

```csharp
// MinimactIntegrationTests.cs
public class MinimactIntegrationTests : 
    IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public MinimactIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    // Add tests here
}
```

### Step 5: Configure TestServer

```csharp
// Custom WebApplicationFactory if needed
public class MinimactTestFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Replace database with in-memory version
            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseInMemoryDatabase("TestDb");
            });

            // Configure test-specific services
        });
    }
}
```

## Testing with MSW (Optional)

While the Mock Client approach tests the real backend, you can optionally combine it with MSW for:

1. **External API mocking** - If your backend calls external services
2. **Offline testing** - Test without network dependencies
3. **Failure simulation** - Mock specific error conditions

```typescript
// In a Node.js test runner (if needed for MSW)
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/external-api/*', () => {
    return HttpResponse.json({ data: 'mocked' });
  })
);

// But for internal Minimact testing, use the C# Mock Client
```

## Metrics and Reporting

Track key metrics from your tests:

```csharp
public class PredictionMetrics
{
    public double AccuracyRate { get; set; }
    public TimeSpan AverageLatency { get; set; }
    public int TotalInteractions { get; set; }
    public int CacheHits { get; set; }
    public int CacheMisses { get; set; }
    
    public Dictionary<string, double> AccuracyByComponent { get; set; }
    public Dictionary<string, TimeSpan> LatencyByComponent { get; set; }
}

[Fact]
public async Task GeneratePredictionReport()
{
    var metrics = new PredictionMetrics();
    
    // Run many interactions, collect metrics
    // ...
    
    // Generate report
    var report = $"""
        Prediction Accuracy Report
        ==========================
        Total Interactions: {metrics.TotalInteractions}
        Overall Accuracy: {metrics.AccuracyRate:P2}
        Average Latency: {metrics.AverageLatency.TotalMilliseconds}ms
        Cache Hit Rate: {metrics.CacheHits / (double)metrics.TotalInteractions:P2}
        
        By Component:
        {string.Join("\n", metrics.AccuracyByComponent.Select(
            kvp => $"  {kvp.Key}: {kvp.Value:P2}"))}
        """;
    
    _output.WriteLine(report);
}
```

## Comparison with Traditional Testing

| Aspect | Browser Tests | Unit Tests (Mocked) | Mock Client (This Approach) |
|--------|---------------|---------------------|----------------------------|
| **Speed** | Slow (seconds) | Fast (ms) | Fast (ms) |
| **Fidelity** | High | Low | High |
| **Debugging** | Hard | Easy | Easy |
| **Coverage** | Full E2E | Isolated | Full E2E |
| **Flakiness** | High | Low | Low |
| **Real Worker Logic** | ✅ Yes | ❌ Mocked | ✅ Yes |
| **Real SignalR** | ✅ Yes | ❌ Mocked | ✅ Yes |
| **Real Backend** | ✅ Yes | ❌ Mocked | ✅ Yes |
| **Prediction Metrics** | Hard | N/A | ✅ Easy |

## Advanced Scenarios

### Testing Multi-Client Synchronization

```csharp
[Fact]
public async Task MultipleClients_SignalRBroadcast()
{
    // Create two mock clients
    await using var client1 = new MockClient(_factory.Server);
    await using var client2 = new MockClient(_factory.Server);
    
    await client1.ConnectAsync();
    await client2.ConnectAsync();
    
    // Client 1 triggers action
    await client1.TriggerInteraction("shared-counter", "increment", 
        new { count = 0 });
    
    // Client 2 should receive broadcast
    var client2Patches = await client2.WaitForPatches(1);
    
    Assert.Single(client2Patches);
    Assert.Equal(1, client2Patches[0].State.count);
}
```

### Testing DOM Entanglement Protocol

```csharp
[Fact]
public async Task DEP_CrossClientMutations()
{
    await using var clientA = new MockClient(_factory.Server);
    await using var clientB = new MockClient(_factory.Server);
    
    // Entangle elements across clients
    await clientA.EntangleElement("#slider", clientB.ClientId, 
        EntanglementMode.Bidirectional);
    
    // Client A modifies entangled element
    await clientA.TriggerInteraction("slider", "drag", 
        new { value = 75 });
    
    // Client B should receive mutation
    var mutations = await clientB.WaitForMutations(1);
    Assert.Equal(75, mutations[0].NewValue);
}
```

### Performance Benchmarking

```csharp
[Fact]
public async Task Benchmark_1000InteractionsPerSecond()
{
    await using var client = new MockClient(_factory.Server);
    await client.ConnectAsync();
    
    var stopwatch = Stopwatch.StartNew();
    var interactions = 1000;
    
    for (int i = 0; i < interactions; i++)
    {
        await client.TriggerInteraction("counter", "increment", 
            new { count = i });
    }
    
    stopwatch.Stop();
    
    var throughput = interactions / stopwatch.Elapsed.TotalSeconds;
    
    Assert.True(throughput >= 1000, 
        $"Expected 1000+ interactions/sec, got {throughput:F0}");
}
```

## Best Practices

### 1. Use Fixtures for Expensive Setup

```csharp
public class MockClientFixture : IAsyncDisposable
{
    public MockClient Client { get; }
    
    public MockClientFixture()
    {
        // Expensive setup once per test class
        Client = new MockClient(/* ... */);
    }
    
    public async ValueTask DisposeAsync()
    {
        await Client.DisposeAsync();
    }
}

public class MyTests : IClassFixture<MockClientFixture>
{
    private readonly MockClient _client;
    
    public MyTests(MockClientFixture fixture)
    {
        _client = fixture.Client;
    }
}
```

### 2. Isolate Test Data

```csharp
[Fact]
public async Task TestWithIsolatedData()
{
    // Create unique component ID per test
    var componentId = $"counter-{Guid.NewGuid()}";
    
    await _client.TriggerInteraction(componentId, "increment", 
        new { count = 0 });
}
```

### 3. Use Parallel Execution Carefully

```csharp
// For tests that can run in parallel
[Collection("Parallel")]
public class ParallelTests { }

// For tests that need isolation
[Collection("Sequential")]
public class SequentialTests { }
```

### 4. Clean Up State Between Tests

```csharp
public class MyTests : IAsyncLifetime
{
    public async Task InitializeAsync()
    {
        // Setup before each test
    }
    
    public async Task DisposeAsync()
    {
        // Cleanup after each test
        await _client.ResetState();
    }
}
```

## Conclusion

The **C# Mock Client** testing strategy provides:

- ✅ **Real integration testing** without browser overhead
- ✅ **Surgical precision** by testing actual code paths
- ✅ **Fast feedback loops** for development
- ✅ **Measurable prediction accuracy** for optimization
- ✅ **Code reuse** across production and tests
- ✅ **Easy debugging** with single-process execution

This approach aligns perfectly with the Minimact philosophy: **minimal changes, maximum impact**. Instead of building complex mocking infrastructure, we leverage C# to simulate the client while testing the real system.

## Resources

- [XUnit Documentation](https://xunit.net/)
- [Bridge.NET Documentation](http://bridge.net/)
- [ASP.NET Core Testing](https://docs.microsoft.com/en-us/aspnet/core/test/integration-tests)
- [SignalR Testing](https://docs.microsoft.com/en-us/aspnet/core/signalr/testing)
- [WebApplicationFactory](https://docs.microsoft.com/en-us/aspnet/core/test/integration-tests#basic-tests-with-the-default-webapplicationfactory)

---

**"Test the real thing, not a shadow of it."**