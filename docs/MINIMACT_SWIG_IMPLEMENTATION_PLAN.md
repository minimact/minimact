# Minimact.Swig Implementation Plan

**The Developer Experience Platform for Minimact**

> Like Swagger for APIs, but for server-side React with real-time instrumentation, control, and visualization.

---

## Vision

Minimact.Swig is a standalone ASP.NET MVC application that provides a complete developer experience platform for Minimact applications. It combines:

- **Real-time instrumentation** - Monitor every render, state change, and SignalR message
- **Live control** - Start/stop/pause target app, trigger state changes, inject commands
- **Visual debugging** - See which DOM elements will be affected by state changes
- **TSX transpilation** - Convert TSX to C# with instant preview
- **Performance analysis** - Detailed metrics, bottleneck detection, cache hit rates
- **Component preview** - Isolated component rendering with live prop editing

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│              Minimact.Swig (Port 5001)                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Frontend (React + TypeScript)                │  │
│  │  - Component Tree Viewer                             │  │
│  │  - State Inspector & Editor                          │  │
│  │  - SignalR Message Monitor                           │  │
│  │  - Performance Dashboard                             │  │
│  │  - Visual Impact Overlay                             │  │
│  │  - TSX Transpiler UI                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▲                                  │
│                          │                                  │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │            Swig SignalR Hub                          │  │
│  │  - Receives telemetry from target app               │  │
│  │  - Sends control commands to target app             │  │
│  │  - Broadcasts to connected Swig UI clients          │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▲                                  │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │         Backend Services (C#)                        │  │
│  │  - AppLifecycleManager (start/stop/pause target)    │  │
│  │  - TranspilerService (TSX → C# via Node.js)         │  │
│  │  - MetricsCollector (aggregate performance data)    │  │
│  │  - ComponentPreviewService (isolated rendering)     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ Swig Instrumentation Protocol (SIP)
                          │ via SignalR
                          │
┌─────────────────────────▼───────────────────────────────────┐
│           Target Minimact App (Port 5000)                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    Minimact.Swig.Instrumentation Client              │  │
│  │  - Connects to Swig on startup (dev mode only)       │  │
│  │  - Hooks into MinimactHub intercept all operations   │  │
│  │  - Reports telemetry in real-time                    │  │
│  │  - Accepts control commands from Swig                │  │
│  │  - Monitors app health & performance                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▲                                  │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │          MinimactHub (existing)                      │  │
│  │  - All SignalR messages pass through instrumentation│  │
│  │  - State changes, renders, patches monitored         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Project Setup

**Create Minimact.Swig ASP.NET MVC Project**

```bash
cd src
dotnet new mvc -n Minimact.Swig
cd Minimact.Swig
dotnet add package Microsoft.AspNetCore.SignalR
dotnet add package Newtonsoft.Json
```

**Project Structure:**

```
src/Minimact.Swig/
├── Controllers/
│   ├── HomeController.cs           # Main dashboard
│   ├── TranspilerController.cs     # TSX → C# conversion API
│   ├── ComponentController.cs      # Component preview API
│   └── MetricsController.cs        # Performance metrics API
├── Hubs/
│   └── SwigHub.cs                  # SignalR hub for instrumentation
├── Services/
│   ├── AppLifecycleManager.cs      # Start/stop/pause target app
│   ├── TranspilerService.cs        # Invoke babel-plugin-minimact
│   ├── MetricsCollector.cs         # Aggregate telemetry
│   └── InstrumentationSession.cs   # Manage connection to target app
├── Models/
│   ├── InstrumentationProtocol/
│   │   ├── ComponentRendered.cs
│   │   ├── StateChanged.cs
│   │   ├── HintMatched.cs
│   │   ├── ErrorOccurred.cs
│   │   └── ControlCommand.cs
│   ├── ComponentTreeNode.cs
│   ├── StateSnapshot.cs
│   ├── PerformanceMetric.cs
│   └── TranspileRequest.cs
├── wwwroot/
│   ├── js/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ComponentTree.tsx
│   │   │   │   ├── StateInspector.tsx
│   │   │   │   ├── SignalRMonitor.tsx
│   │   │   │   ├── PerformanceDashboard.tsx
│   │   │   │   ├── VisualImpact.tsx
│   │   │   │   └── TranspilerUI.tsx
│   │   │   ├── services/
│   │   │   │   ├── SwigConnection.ts
│   │   │   │   └── TargetAppProxy.ts
│   │   │   └── App.tsx
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── css/
│       └── swig.css
├── Views/
│   ├── Home/
│   │   └── Index.cshtml             # Main dashboard page
│   ├── Transpiler/
│   │   └── Index.cshtml             # TSX → C# tool
│   └── Shared/
│       └── _Layout.cshtml
├── appsettings.json
└── Program.cs
```

### 1.2 Swig Instrumentation Protocol (SIP)

**Define message types for bidirectional communication:**

#### Target App → Swig (Telemetry Messages)

```csharp
// Models/InstrumentationProtocol/ComponentRendered.cs
public class ComponentRendered
{
    public string ComponentId { get; set; }
    public string ComponentType { get; set; }
    public VNodeSnapshot VNode { get; set; }
    public List<DOMPatch> Patches { get; set; }
    public double DurationMs { get; set; }
    public DateTime Timestamp { get; set; }
}

// Models/InstrumentationProtocol/StateChanged.cs
public class StateChanged
{
    public string ComponentId { get; set; }
    public string StateKey { get; set; }
    public object OldValue { get; set; }
    public object NewValue { get; set; }
    public DateTime Timestamp { get; set; }
}

// Models/InstrumentationProtocol/HintMatched.cs
public class HintMatched
{
    public string ComponentId { get; set; }
    public string HintId { get; set; }
    public Dictionary<string, object> StateChanges { get; set; }
    public double LatencyMs { get; set; }
    public double Confidence { get; set; }
    public int PatchCount { get; set; }
    public DateTime Timestamp { get; set; }
}

// Models/InstrumentationProtocol/HintMissed.cs
public class HintMissed
{
    public string ComponentId { get; set; }
    public Dictionary<string, object> StateChanges { get; set; }
    public DateTime Timestamp { get; set; }
}

// Models/InstrumentationProtocol/ErrorOccurred.cs
public class ErrorOccurred
{
    public string ComponentId { get; set; }
    public string ErrorMessage { get; set; }
    public string StackTrace { get; set; }
    public string ErrorType { get; set; } // "Render", "State", "SignalR", "Unknown"
    public DateTime Timestamp { get; set; }
}

// Models/InstrumentationProtocol/PerformanceMetric.cs
public class PerformanceMetricEvent
{
    public string MetricName { get; set; }
    public double Value { get; set; }
    public string Unit { get; set; } // "ms", "count", "ratio", "bytes"
    public Dictionary<string, object> Tags { get; set; }
    public DateTime Timestamp { get; set; }
}

// Models/InstrumentationProtocol/AppStarted.cs
public class AppStarted
{
    public string AppName { get; set; }
    public int Port { get; set; }
    public string Version { get; set; }
    public List<string> Components { get; set; }
    public DateTime Timestamp { get; set; }
}
```

#### Swig → Target App (Control Commands)

```csharp
// Models/InstrumentationProtocol/TriggerStateChange.cs
public class TriggerStateChange
{
    public string ComponentId { get; set; }
    public string StateKey { get; set; }
    public object NewValue { get; set; }
}

// Models/InstrumentationProtocol/TriggerRerender.cs
public class TriggerRerender
{
    public string ComponentId { get; set; }
}

// Models/InstrumentationProtocol/PreviewStateChange.cs
public class PreviewStateChange
{
    public string ComponentId { get; set; }
    public string StateKey { get; set; }
    public object NewValue { get; set; }
    // Response: List<DOMPatch> without applying them
}

// Models/InstrumentationProtocol/GetComponentTree.cs
public class GetComponentTree
{
    // Response: ComponentTreeNode (recursive structure)
}

// Models/InstrumentationProtocol/GetComponentState.cs
public class GetComponentState
{
    public string ComponentId { get; set; }
    // Response: Dictionary<string, object>
}

// Models/InstrumentationProtocol/PauseExecution.cs
public class PauseExecution
{
    public string Reason { get; set; } // "InfiniteLoop", "Manual", "Error"
}

// Models/InstrumentationProtocol/ResumeExecution.cs
public class ResumeExecution
{
}
```

### 1.3 SwigHub Implementation

```csharp
// Hubs/SwigHub.cs
using Microsoft.AspNetCore.SignalR;

namespace Minimact.Swig.Hubs;

public class SwigHub : Hub
{
    private readonly ILogger<SwigHub> _logger;
    private readonly MetricsCollector _metricsCollector;
    private static readonly Dictionary<string, string> _targetAppConnections = new();

    public SwigHub(ILogger<SwigHub> logger, MetricsCollector metricsCollector)
    {
        _logger = logger;
        _metricsCollector = metricsCollector;
    }

    // ============================================================
    // Target App → Swig (Telemetry)
    // ============================================================

    public async Task RegisterTargetApp(AppStarted appInfo)
    {
        _targetAppConnections[appInfo.AppName] = Context.ConnectionId;
        _logger.LogInformation($"Target app registered: {appInfo.AppName} on port {appInfo.Port}");

        // Broadcast to all Swig UI clients
        await Clients.Others.SendAsync("TargetAppConnected", appInfo);
    }

    public async Task ReportComponentRendered(ComponentRendered data)
    {
        _metricsCollector.RecordRender(data);
        await Clients.Others.SendAsync("ComponentRendered", data);
    }

    public async Task ReportStateChanged(StateChanged data)
    {
        _metricsCollector.RecordStateChange(data);
        await Clients.Others.SendAsync("StateChanged", data);
    }

    public async Task ReportHintMatched(HintMatched data)
    {
        _metricsCollector.RecordCacheHit(data);
        await Clients.Others.SendAsync("HintMatched", data);
    }

    public async Task ReportHintMissed(HintMissed data)
    {
        _metricsCollector.RecordCacheMiss(data);
        await Clients.Others.SendAsync("HintMissed", data);
    }

    public async Task ReportError(ErrorOccurred data)
    {
        _metricsCollector.RecordError(data);
        await Clients.Others.SendAsync("ErrorOccurred", data);
    }

    public async Task ReportPerformanceMetric(PerformanceMetricEvent data)
    {
        _metricsCollector.RecordMetric(data);
        await Clients.Others.SendAsync("PerformanceMetric", data);
    }

    // ============================================================
    // Swig UI → Target App (Control Commands)
    // ============================================================

    public async Task SendTriggerStateChange(string targetApp, TriggerStateChange command)
    {
        if (_targetAppConnections.TryGetValue(targetApp, out var connectionId))
        {
            await Clients.Client(connectionId).SendAsync("TriggerStateChange", command);
        }
    }

    public async Task SendTriggerRerender(string targetApp, TriggerRerender command)
    {
        if (_targetAppConnections.TryGetValue(targetApp, out var connectionId))
        {
            await Clients.Client(connectionId).SendAsync("TriggerRerender", command);
        }
    }

    public async Task<List<DOMPatch>> SendPreviewStateChange(string targetApp, PreviewStateChange command)
    {
        if (_targetAppConnections.TryGetValue(targetApp, out var connectionId))
        {
            return await Clients.Client(connectionId).InvokeAsync<List<DOMPatch>>("PreviewStateChange", command);
        }
        return new List<DOMPatch>();
    }

    public async Task<ComponentTreeNode> SendGetComponentTree(string targetApp)
    {
        if (_targetAppConnections.TryGetValue(targetApp, out var connectionId))
        {
            return await Clients.Client(connectionId).InvokeAsync<ComponentTreeNode>("GetComponentTree");
        }
        return null;
    }

    public async Task SendPauseExecution(string targetApp, PauseExecution command)
    {
        if (_targetAppConnections.TryGetValue(targetApp, out var connectionId))
        {
            await Clients.Client(connectionId).SendAsync("PauseExecution", command);
        }
    }

    public override async Task OnDisconnectedAsync(Exception exception)
    {
        // Remove from registry if it's a target app
        var entry = _targetAppConnections.FirstOrDefault(x => x.Value == Context.ConnectionId);
        if (entry.Key != null)
        {
            _targetAppConnections.Remove(entry.Key);
            await Clients.Others.SendAsync("TargetAppDisconnected", entry.Key);
        }

        await base.OnDisconnectedAsync(exception);
    }
}
```

---

## Phase 2: Instrumentation Client (Weeks 2-3)

### 2.1 Create Minimact.Swig.Instrumentation NuGet Package

**Target apps will reference this package to enable instrumentation.**

```bash
cd src
dotnet new classlib -n Minimact.Swig.Instrumentation
cd Minimact.Swig.Instrumentation
dotnet add package Microsoft.AspNetCore.SignalR.Client
dotnet add reference ../Minimact.AspNetCore/Minimact.AspNetCore.csproj
```

**Project Structure:**

```
src/Minimact.Swig.Instrumentation/
├── SwigInstrumentationClient.cs    # Main client that connects to Swig
├── MinimactHubInterceptor.cs       # Intercepts MinimactHub operations
├── ComponentStateTracker.cs        # Tracks all component state
├── PerformanceMonitor.cs           # Collects performance metrics
├── ErrorCapturer.cs                # Catches and reports errors
├── InfiniteLoopDetector.cs         # Detects render loops
└── SwigServiceExtensions.cs        # DI extensions for easy setup
```

### 2.2 SwigInstrumentationClient Implementation

```csharp
// SwigInstrumentationClient.cs
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Minimact.Swig.Instrumentation;

public class SwigInstrumentationClient : IHostedService
{
    private readonly ILogger<SwigInstrumentationClient> _logger;
    private readonly SwigInstrumentationOptions _options;
    private readonly MinimactHubInterceptor _interceptor;
    private HubConnection? _connection;

    public SwigInstrumentationClient(
        ILogger<SwigInstrumentationClient> logger,
        SwigInstrumentationOptions options,
        MinimactHubInterceptor interceptor)
    {
        _logger = logger;
        _options = options;
        _interceptor = interceptor;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("Swig instrumentation is disabled");
            return;
        }

        _logger.LogInformation($"Connecting to Swig at {_options.SwigUrl}");

        _connection = new HubConnectionBuilder()
            .WithUrl($"{_options.SwigUrl}/hubs/swig")
            .WithAutomaticReconnect()
            .Build();

        // Register control command handlers
        RegisterControlHandlers();

        await _connection.StartAsync(cancellationToken);

        // Register this app with Swig
        await _connection.InvokeAsync("RegisterTargetApp", new AppStarted
        {
            AppName = _options.AppName,
            Port = _options.Port,
            Version = _options.Version,
            Components = _interceptor.GetComponentList(),
            Timestamp = DateTime.UtcNow
        }, cancellationToken);

        _logger.LogInformation("Connected to Swig successfully");
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_connection != null)
        {
            await _connection.StopAsync(cancellationToken);
            await _connection.DisposeAsync();
        }
    }

    private void RegisterControlHandlers()
    {
        _connection.On<TriggerStateChange>("TriggerStateChange", async (command) =>
        {
            await _interceptor.HandleTriggerStateChange(command);
        });

        _connection.On<TriggerRerender>("TriggerRerender", async (command) =>
        {
            await _interceptor.HandleTriggerRerender(command);
        });

        _connection.On<PreviewStateChange, List<DOMPatch>>("PreviewStateChange", async (command) =>
        {
            return await _interceptor.HandlePreviewStateChange(command);
        });

        _connection.On<GetComponentTree, ComponentTreeNode>("GetComponentTree", async () =>
        {
            return await _interceptor.HandleGetComponentTree();
        });

        _connection.On<PauseExecution>("PauseExecution", (command) =>
        {
            _interceptor.PauseExecution(command.Reason);
        });

        _connection.On<ResumeExecution>("ResumeExecution", () =>
        {
            _interceptor.ResumeExecution();
        });
    }

    // ============================================================
    // Telemetry Reporting (called by MinimactHubInterceptor)
    // ============================================================

    public async Task ReportComponentRendered(ComponentRendered data)
    {
        if (_connection?.State == HubConnectionState.Connected)
        {
            await _connection.InvokeAsync("ReportComponentRendered", data);
        }
    }

    public async Task ReportStateChanged(StateChanged data)
    {
        if (_connection?.State == HubConnectionState.Connected)
        {
            await _connection.InvokeAsync("ReportStateChanged", data);
        }
    }

    public async Task ReportHintMatched(HintMatched data)
    {
        if (_connection?.State == HubConnectionState.Connected)
        {
            await _connection.InvokeAsync("ReportHintMatched", data);
        }
    }

    public async Task ReportHintMissed(HintMissed data)
    {
        if (_connection?.State == HubConnectionState.Connected)
        {
            await _connection.InvokeAsync("ReportHintMissed", data);
        }
    }

    public async Task ReportError(ErrorOccurred data)
    {
        if (_connection?.State == HubConnectionState.Connected)
        {
            await _connection.InvokeAsync("ReportError", data);
        }
    }

    public async Task ReportPerformanceMetric(PerformanceMetricEvent data)
    {
        if (_connection?.State == HubConnectionState.Connected)
        {
            await _connection.InvokeAsync("ReportPerformanceMetric", data);
        }
    }
}
```

### 2.3 MinimactHub Interception

**Hook into existing MinimactHub to monitor all operations:**

```csharp
// MinimactHubInterceptor.cs
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.SignalR;

namespace Minimact.Swig.Instrumentation;

public class MinimactHubInterceptor
{
    private readonly ILogger<MinimactHubInterceptor> _logger;
    private readonly ComponentRegistry _registry;
    private readonly SwigInstrumentationClient _client;
    private readonly PerformanceMonitor _perfMonitor;
    private readonly InfiniteLoopDetector _loopDetector;
    private bool _isPaused = false;

    public MinimactHubInterceptor(
        ILogger<MinimactHubInterceptor> logger,
        ComponentRegistry registry,
        SwigInstrumentationClient client,
        PerformanceMonitor perfMonitor,
        InfiniteLoopDetector loopDetector)
    {
        _logger = logger;
        _registry = registry;
        _client = client;
        _perfMonitor = perfMonitor;
        _loopDetector = loopDetector;
    }

    // ============================================================
    // Hook into Component Lifecycle
    // ============================================================

    public async Task OnComponentRendered(MinimactComponent component, VNode vnode, List<DOMPatch> patches, double durationMs)
    {
        // Check for infinite loop
        if (_loopDetector.CheckRenderLoop(component.ComponentId))
        {
            _logger.LogError($"Infinite render loop detected for component {component.ComponentId}");
            _isPaused = true;
            await _client.ReportError(new ErrorOccurred
            {
                ComponentId = component.ComponentId,
                ErrorMessage = "Infinite render loop detected",
                ErrorType = "InfiniteLoop",
                Timestamp = DateTime.UtcNow
            });
            return;
        }

        // Report render event to Swig
        await _client.ReportComponentRendered(new ComponentRendered
        {
            ComponentId = component.ComponentId,
            ComponentType = component.GetType().Name,
            VNode = VNodeSnapshot.FromVNode(vnode),
            Patches = patches,
            DurationMs = durationMs,
            Timestamp = DateTime.UtcNow
        });

        // Report performance metric
        await _client.ReportPerformanceMetric(new PerformanceMetricEvent
        {
            MetricName = "render_duration",
            Value = durationMs,
            Unit = "ms",
            Tags = new Dictionary<string, object>
            {
                { "component_id", component.ComponentId },
                { "component_type", component.GetType().Name },
                { "patch_count", patches.Count }
            },
            Timestamp = DateTime.UtcNow
        });
    }

    public async Task OnStateChanged(string componentId, string stateKey, object oldValue, object newValue)
    {
        await _client.ReportStateChanged(new StateChanged
        {
            ComponentId = componentId,
            StateKey = stateKey,
            OldValue = oldValue,
            NewValue = newValue,
            Timestamp = DateTime.UtcNow
        });
    }

    public async Task OnHintMatched(string componentId, string hintId, Dictionary<string, object> stateChanges, double latency, double confidence, int patchCount)
    {
        await _client.ReportHintMatched(new HintMatched
        {
            ComponentId = componentId,
            HintId = hintId,
            StateChanges = stateChanges,
            LatencyMs = latency,
            Confidence = confidence,
            PatchCount = patchCount,
            Timestamp = DateTime.UtcNow
        });
    }

    public async Task OnHintMissed(string componentId, Dictionary<string, object> stateChanges)
    {
        await _client.ReportHintMissed(new HintMissed
        {
            ComponentId = componentId,
            StateChanges = stateChanges,
            Timestamp = DateTime.UtcNow
        });
    }

    // ============================================================
    // Control Command Handlers
    // ============================================================

    public async Task HandleTriggerStateChange(TriggerStateChange command)
    {
        var component = _registry.GetComponent(command.ComponentId);
        if (component != null)
        {
            component.SetStateFromClient(command.StateKey, command.NewValue);
            component.TriggerRender();
        }
    }

    public async Task HandleTriggerRerender(TriggerRerender command)
    {
        var component = _registry.GetComponent(command.ComponentId);
        component?.TriggerRender();
    }

    public async Task<List<DOMPatch>> HandlePreviewStateChange(PreviewStateChange command)
    {
        var component = _registry.GetComponent(command.ComponentId);
        if (component == null) return new List<DOMPatch>();

        // Temporarily set state WITHOUT committing
        var oldValue = component.State.ContainsKey(command.StateKey)
            ? component.State[command.StateKey]
            : null;

        component.State[command.StateKey] = command.NewValue;

        // Render with new state
        var newVNode = component.Render();

        // Compute patches
        var patches = component.Reconciler.ComputePatches(component.CurrentVNode, newVNode);

        // Restore old state
        if (oldValue != null)
            component.State[command.StateKey] = oldValue;
        else
            component.State.Remove(command.StateKey);

        return patches;
    }

    public async Task<ComponentTreeNode> HandleGetComponentTree()
    {
        return BuildComponentTree(_registry.GetAllComponents());
    }

    public void PauseExecution(string reason)
    {
        _isPaused = true;
        _logger.LogWarning($"Execution paused: {reason}");
    }

    public void ResumeExecution()
    {
        _isPaused = false;
        _loopDetector.Reset();
        _logger.LogInformation("Execution resumed");
    }

    public bool IsPaused() => _isPaused;

    // ============================================================
    // Helpers
    // ============================================================

    public List<string> GetComponentList()
    {
        return _registry.GetAllComponents()
            .Select(c => c.GetType().Name)
            .Distinct()
            .ToList();
    }

    private ComponentTreeNode BuildComponentTree(List<MinimactComponent> components)
    {
        // Build hierarchical tree structure
        // This would traverse VNodes to determine parent-child relationships
        // Simplified for now:
        return new ComponentTreeNode
        {
            ComponentId = "root",
            ComponentType = "App",
            Children = components.Select(c => new ComponentTreeNode
            {
                ComponentId = c.ComponentId,
                ComponentType = c.GetType().Name,
                State = c.State.ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
                Children = new List<ComponentTreeNode>()
            }).ToList()
        };
    }
}
```

### 2.4 Easy Setup for Target Apps

```csharp
// SwigServiceExtensions.cs
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Minimact.Swig.Instrumentation;

public static class SwigServiceExtensions
{
    public static IServiceCollection AddMinimactSwig(
        this IServiceCollection services,
        Action<SwigInstrumentationOptions> configure)
    {
        var options = new SwigInstrumentationOptions();
        configure(options);
        services.AddSingleton(options);

        if (options.Enabled)
        {
            services.AddSingleton<SwigInstrumentationClient>();
            services.AddSingleton<MinimactHubInterceptor>();
            services.AddSingleton<PerformanceMonitor>();
            services.AddSingleton<InfiniteLoopDetector>();
            services.AddHostedService<SwigInstrumentationClient>(sp =>
                sp.GetRequiredService<SwigInstrumentationClient>());
        }

        return services;
    }
}

public class SwigInstrumentationOptions
{
    public bool Enabled { get; set; } = true;
    public string SwigUrl { get; set; } = "http://localhost:5001";
    public string AppName { get; set; } = "MinimactApp";
    public int Port { get; set; } = 5000;
    public string Version { get; set; } = "1.0.0";
}
```

**Usage in target app:**

```csharp
// Program.cs in target Minimact app
builder.Services.AddMinimactSwig(options =>
{
    options.SwigUrl = "http://localhost:5001";
    options.AppName = "MyMinimactApp";
    options.Port = 5000;
    options.Enabled = builder.Environment.IsDevelopment(); // Only in dev mode
});
```

---

## Phase 3: Frontend UI (Weeks 3-5)

### 3.1 React Frontend Setup

**wwwroot/js/package.json:**

```json
{
  "name": "minimact-swig-ui",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@microsoft/signalr": "^7.0.0",
    "lucide-react": "^0.300.0",
    "recharts": "^2.10.0",
    "monaco-editor": "^0.45.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

### 3.2 Component Tree Viewer

```tsx
// wwwroot/js/src/components/ComponentTree.tsx
import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Box } from 'lucide-react';

interface ComponentTreeNode {
  componentId: string;
  componentType: string;
  state: Record<string, any>;
  children: ComponentTreeNode[];
}

interface Props {
  tree: ComponentTreeNode;
  onSelectComponent: (componentId: string) => void;
  selectedComponentId?: string;
}

export function ComponentTree({ tree, onSelectComponent, selectedComponentId }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']));

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderNode = (node: ComponentTreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expanded.has(node.componentId);
    const hasChildren = node.children.length > 0;
    const isSelected = node.componentId === selectedComponentId;

    return (
      <div key={node.componentId}>
        <div
          className={`tree-node ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 20}px` }}
          onClick={() => onSelectComponent(node.componentId)}
        >
          {hasChildren && (
            <button
              className="expand-button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.componentId);
              }}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
          {!hasChildren && <span className="spacer" />}
          <Box size={16} className="component-icon" />
          <span className="component-type">{node.componentType}</span>
          <span className="component-id">{node.componentId}</span>
        </div>
        {isExpanded && hasChildren && (
          <div className="tree-children">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="component-tree">
      {renderNode(tree)}
    </div>
  );
}
```

### 3.3 State Inspector

```tsx
// wwwroot/js/src/components/StateInspector.tsx
import React, { useState } from 'react';
import { Edit2, Play, Eye } from 'lucide-react';

interface Props {
  componentId: string;
  componentType: string;
  state: Record<string, any>;
  onTriggerStateChange: (stateKey: string, newValue: any) => void;
  onTriggerRerender: () => void;
  onPreviewStateChange: (stateKey: string, newValue: any) => void;
}

export function StateInspector({
  componentId,
  componentType,
  state,
  onTriggerStateChange,
  onTriggerRerender,
  onPreviewStateChange
}: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const startEdit = (key: string, value: any) => {
    setEditingKey(key);
    setEditValue(JSON.stringify(value));
  };

  const commitEdit = (key: string) => {
    try {
      const newValue = JSON.parse(editValue);
      onTriggerStateChange(key, newValue);
      setEditingKey(null);
    } catch (e) {
      alert('Invalid JSON');
    }
  };

  const previewEdit = (key: string) => {
    try {
      const newValue = JSON.parse(editValue);
      onPreviewStateChange(key, newValue);
    } catch (e) {
      alert('Invalid JSON');
    }
  };

  return (
    <div className="state-inspector">
      <div className="inspector-header">
        <h3>{componentType}</h3>
        <span className="component-id">{componentId}</span>
      </div>

      <div className="state-list">
        {Object.entries(state).map(([key, value]) => (
          <div key={key} className="state-item">
            <div className="state-key">{key}:</div>
            {editingKey === key ? (
              <div className="state-editor">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit(key);
                    if (e.key === 'Escape') setEditingKey(null);
                  }}
                  autoFocus
                />
                <button onClick={() => previewEdit(key)} title="Preview">
                  <Eye size={14} />
                </button>
                <button onClick={() => commitEdit(key)} className="commit">
                  ✓
                </button>
                <button onClick={() => setEditingKey(null)} className="cancel">
                  ✕
                </button>
              </div>
            ) : (
              <div className="state-value">
                <span>{JSON.stringify(value)}</span>
                <button
                  className="edit-button"
                  onClick={() => startEdit(key, value)}
                  title="Edit"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="inspector-actions">
        <button onClick={onTriggerRerender} className="action-button">
          <Play size={16} />
          Trigger Re-render
        </button>
      </div>
    </div>
  );
}
```

### 3.4 SignalR Monitor

```tsx
// wwwroot/js/src/components/SignalRMonitor.tsx
import React, { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Zap, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  direction: 'incoming' | 'outgoing';
  type: string;
  data: any;
  timestamp: Date;
  duration?: number;
}

interface Props {
  messages: Message[];
  maxMessages?: number;
}

export function SignalRMonitor({ messages, maxMessages = 100 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const getIcon = (message: Message) => {
    if (message.direction === 'incoming') return <ArrowDown size={16} className="incoming" />;
    if (message.direction === 'outgoing') return <ArrowUp size={16} className="outgoing" />;
    return null;
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('Error')) return <AlertCircle size={14} className="error" />;
    if (type.includes('Hint')) return <Zap size={14} className="hint" />;
    return null;
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 1000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className="signalr-monitor">
      <div className="monitor-header">
        <h3>SignalR Messages</h3>
        <span className="message-count">{messages.length} messages</span>
      </div>

      <div className="message-list" ref={containerRef}>
        {messages.slice(-maxMessages).map(message => (
          <div key={message.id} className={`message-item ${message.direction}`}>
            <div className="message-header">
              {getIcon(message)}
              {getTypeIcon(message.type)}
              <span className="message-type">{message.type}</span>
              <span className="message-timestamp">{formatTimestamp(message.timestamp)}</span>
              {message.duration && (
                <span className="message-duration">{message.duration.toFixed(2)}ms</span>
              )}
            </div>
            <div className="message-data">
              <pre>{JSON.stringify(message.data, null, 2)}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3.5 Performance Dashboard

```tsx
// wwwroot/js/src/components/PerformanceDashboard.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Zap, AlertTriangle } from 'lucide-react';

interface PerformanceMetrics {
  avgRenderTime: number;
  cacheHitRate: number;
  totalRenders: number;
  totalErrors: number;
  renderTimeHistory: Array<{ time: string; duration: number }>;
}

interface Props {
  metrics: PerformanceMetrics;
}

export function PerformanceDashboard({ metrics }: Props) {
  const getCacheHitRateColor = (rate: number) => {
    if (rate >= 90) return '#10b981'; // green
    if (rate >= 70) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div className="performance-dashboard">
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <TrendingUp size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Avg Render Time</div>
            <div className="metric-value">{metrics.avgRenderTime.toFixed(2)}ms</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <Zap size={24} style={{ color: getCacheHitRateColor(metrics.cacheHitRate) }} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Cache Hit Rate</div>
            <div className="metric-value">{metrics.cacheHitRate.toFixed(1)}%</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <TrendingUp size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Total Renders</div>
            <div className="metric-value">{metrics.totalRenders}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <AlertTriangle size={24} className={metrics.totalErrors > 0 ? 'error' : ''} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Errors</div>
            <div className="metric-value">{metrics.totalErrors}</div>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <h4>Render Time History</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics.renderTimeHistory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="duration" stroke="#8884d8" name="Render Time (ms)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

### 3.6 Main App Component

```tsx
// wwwroot/js/src/App.tsx
import React, { useState, useEffect } from 'react';
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr';
import { ComponentTree } from './components/ComponentTree';
import { StateInspector } from './components/StateInspector';
import { SignalRMonitor } from './components/SignalRMonitor';
import { PerformanceDashboard } from './components/PerformanceDashboard';

export function App() {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [componentTree, setComponentTree] = useState<any>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [componentState, setComponentState] = useState<Record<string, any>>({});
  const [messages, setMessages] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    avgRenderTime: 0,
    cacheHitRate: 0,
    totalRenders: 0,
    totalErrors: 0,
    renderTimeHistory: []
  });

  useEffect(() => {
    const newConnection = new HubConnectionBuilder()
      .withUrl('/hubs/swig')
      .withAutomaticReconnect()
      .build();

    // Register event handlers
    newConnection.on('TargetAppConnected', (appInfo) => {
      console.log('Target app connected:', appInfo);
      // Request component tree
      newConnection.invoke('SendGetComponentTree', appInfo.appName);
    });

    newConnection.on('ComponentRendered', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        direction: 'incoming',
        type: 'ComponentRendered',
        data,
        timestamp: new Date(data.timestamp)
      }]);

      // Update metrics
      setMetrics(prev => ({
        ...prev,
        totalRenders: prev.totalRenders + 1,
        avgRenderTime: (prev.avgRenderTime * prev.totalRenders + data.durationMs) / (prev.totalRenders + 1),
        renderTimeHistory: [...prev.renderTimeHistory, {
          time: new Date(data.timestamp).toLocaleTimeString(),
          duration: data.durationMs
        }].slice(-50)
      }));
    });

    newConnection.on('StateChanged', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        direction: 'incoming',
        type: 'StateChanged',
        data,
        timestamp: new Date(data.timestamp)
      }]);

      // Update component state if it's selected
      if (selectedComponent === data.componentId) {
        setComponentState(prev => ({
          ...prev,
          [data.stateKey]: data.newValue
        }));
      }
    });

    newConnection.on('HintMatched', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        direction: 'incoming',
        type: 'HintMatched',
        data,
        timestamp: new Date(data.timestamp),
        duration: data.latencyMs
      }]);

      // Update cache hit rate
      setMetrics(prev => {
        const totalHints = prev.totalHints || 0;
        const totalHits = prev.totalHits || 0;
        return {
          ...prev,
          totalHints: totalHints + 1,
          totalHits: totalHits + 1,
          cacheHitRate: ((totalHits + 1) / (totalHints + 1)) * 100
        };
      });
    });

    newConnection.on('HintMissed', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        direction: 'incoming',
        type: 'HintMissed',
        data,
        timestamp: new Date(data.timestamp)
      }]);

      // Update cache hit rate
      setMetrics(prev => {
        const totalHints = prev.totalHints || 0;
        const totalHits = prev.totalHits || 0;
        return {
          ...prev,
          totalHints: totalHints + 1,
          cacheHitRate: (totalHits / (totalHints + 1)) * 100
        };
      });
    });

    newConnection.on('ErrorOccurred', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        direction: 'incoming',
        type: 'ErrorOccurred',
        data,
        timestamp: new Date(data.timestamp)
      }]);

      setMetrics(prev => ({
        ...prev,
        totalErrors: prev.totalErrors + 1
      }));
    });

    newConnection.start()
      .then(() => {
        console.log('Connected to Swig hub');
        setConnection(newConnection);
      })
      .catch(err => console.error('Connection failed:', err));

    return () => {
      newConnection.stop();
    };
  }, []);

  const handleSelectComponent = async (componentId: string) => {
    setSelectedComponent(componentId);
    if (connection) {
      // Request component state
      // This would need to be implemented in the protocol
      // For now, we'll use the state from the tree
      const node = findNodeInTree(componentTree, componentId);
      if (node) {
        setComponentState(node.state);
      }
    }
  };

  const handleTriggerStateChange = async (stateKey: string, newValue: any) => {
    if (connection && selectedComponent) {
      await connection.invoke('SendTriggerStateChange', 'MyMinimactApp', {
        componentId: selectedComponent,
        stateKey,
        newValue
      });
    }
  };

  const handleTriggerRerender = async () => {
    if (connection && selectedComponent) {
      await connection.invoke('SendTriggerRerender', 'MyMinimactApp', {
        componentId: selectedComponent
      });
    }
  };

  const handlePreviewStateChange = async (stateKey: string, newValue: any) => {
    if (connection && selectedComponent) {
      const patches = await connection.invoke('SendPreviewStateChange', 'MyMinimactApp', {
        componentId: selectedComponent,
        stateKey,
        newValue
      });
      console.log('Preview patches:', patches);
      // TODO: Highlight affected DOM elements in target app
    }
  };

  const findNodeInTree = (node: any, componentId: string): any => {
    if (!node) return null;
    if (node.componentId === componentId) return node;
    for (const child of node.children || []) {
      const found = findNodeInTree(child, componentId);
      if (found) return found;
    }
    return null;
  };

  return (
    <div className="swig-app">
      <header className="swig-header">
        <h1>Minimact Swig</h1>
        <div className="connection-status">
          {connection ? '⚡ Connected' : '⚪ Disconnected'}
        </div>
      </header>

      <div className="swig-layout">
        <aside className="sidebar">
          {componentTree && (
            <ComponentTree
              tree={componentTree}
              onSelectComponent={handleSelectComponent}
              selectedComponentId={selectedComponent}
            />
          )}
        </aside>

        <main className="main-content">
          <div className="top-section">
            {selectedComponent && (
              <StateInspector
                componentId={selectedComponent}
                componentType={componentState.componentType || 'Component'}
                state={componentState}
                onTriggerStateChange={handleTriggerStateChange}
                onTriggerRerender={handleTriggerRerender}
                onPreviewStateChange={handlePreviewStateChange}
              />
            )}

            <PerformanceDashboard metrics={metrics} />
          </div>

          <div className="bottom-section">
            <SignalRMonitor messages={messages} />
          </div>
        </main>
      </div>
    </div>
  );
}
```

---

## Phase 4: Advanced Features (Weeks 5-7)

### 4.1 TSX → C# Transpiler UI

```tsx
// wwwroot/js/src/components/TranspilerUI.tsx
import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Download, Upload, RefreshCw } from 'lucide-react';

export function TranspilerUI() {
  const [tsxCode, setTsxCode] = useState('');
  const [csharpCode, setCsharpCode] = useState('');
  const [isTranspiling, setIsTranspiling] = useState(false);

  const handleTranspile = async () => {
    setIsTranspiling(true);
    try {
      const response = await fetch('/api/transpiler/transpile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tsxCode })
      });
      const result = await response.json();
      setCsharpCode(result.csharpCode);
    } catch (error) {
      console.error('Transpilation failed:', error);
    } finally {
      setIsTranspiling(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([csharpCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Component.cs';
    a.click();
  };

  return (
    <div className="transpiler-ui">
      <div className="transpiler-header">
        <h2>TSX → C# Transpiler</h2>
        <div className="transpiler-actions">
          <button onClick={handleTranspile} disabled={isTranspiling}>
            <RefreshCw size={16} />
            {isTranspiling ? 'Transpiling...' : 'Transpile'}
          </button>
          <button onClick={handleDownload} disabled={!csharpCode}>
            <Download size={16} />
            Download C#
          </button>
        </div>
      </div>

      <div className="transpiler-editors">
        <div className="editor-pane">
          <h3>TSX Input</h3>
          <Editor
            height="600px"
            defaultLanguage="typescript"
            value={tsxCode}
            onChange={(value) => setTsxCode(value || '')}
            theme="vs-dark"
          />
        </div>

        <div className="editor-pane">
          <h3>C# Output</h3>
          <Editor
            height="600px"
            defaultLanguage="csharp"
            value={csharpCode}
            theme="vs-dark"
            options={{ readOnly: true }}
          />
        </div>
      </div>
    </div>
  );
}
```

**Backend Controller:**

```csharp
// Controllers/TranspilerController.cs
using Microsoft.AspNetCore.Mvc;
using Minimact.Swig.Services;

namespace Minimact.Swig.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TranspilerController : ControllerBase
{
    private readonly TranspilerService _transpiler;

    public TranspilerController(TranspilerService transpiler)
    {
        _transpiler = transpiler;
    }

    [HttpPost("transpile")]
    public async Task<IActionResult> Transpile([FromBody] TranspileRequest request)
    {
        try
        {
            var csharpCode = await _transpiler.TranspileTsxToCSharp(request.TsxCode);
            return Ok(new { csharpCode });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

public class TranspileRequest
{
    public string TsxCode { get; set; }
}
```

**Transpiler Service:**

```csharp
// Services/TranspilerService.cs
using System.Diagnostics;

namespace Minimact.Swig.Services;

public class TranspilerService
{
    private readonly ILogger<TranspilerService> _logger;
    private readonly string _babelPluginPath;

    public TranspilerService(ILogger<TranspilerService> logger)
    {
        _logger = logger;
        // Path to babel-plugin-minimact
        _babelPluginPath = Path.Combine(AppContext.BaseDirectory, "../babel-plugin-minimact");
    }

    public async Task<string> TranspileTsxToCSharp(string tsxCode)
    {
        // Write TSX to temp file
        var tempTsxPath = Path.GetTempFileName() + ".tsx";
        var tempCsPath = Path.GetTempFileName() + ".cs";

        try
        {
            await File.WriteAllTextAsync(tempTsxPath, tsxCode);

            // Run babel-plugin-minimact via Node.js
            var startInfo = new ProcessStartInfo
            {
                FileName = "node",
                Arguments = $"{_babelPluginPath}/cli.js {tempTsxPath} -o {tempCsPath}",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(startInfo);
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                var error = await process.StandardError.ReadToEndAsync();
                throw new Exception($"Transpilation failed: {error}");
            }

            // Read generated C# code
            var csharpCode = await File.ReadAllTextAsync(tempCsPath);
            return csharpCode;
        }
        finally
        {
            // Cleanup temp files
            if (File.Exists(tempTsxPath)) File.Delete(tempTsxPath);
            if (File.Exists(tempCsPath)) File.Delete(tempCsPath);
        }
    }
}
```

### 4.2 Visual Impact Overlay

**Inject overlay into target app's browser:**

```tsx
// wwwroot/js/src/components/VisualImpact.tsx
import React, { useEffect, useState } from 'react';

interface Props {
  patches: Array<{ selector: string; operation: string }>;
  targetUrl: string;
}

export function VisualImpact({ patches, targetUrl }: Props) {
  const [overlayScript, setOverlayScript] = useState('');

  useEffect(() => {
    // Generate script to highlight affected elements in target app
    const script = `
      (function() {
        // Remove previous highlights
        document.querySelectorAll('.swig-highlight').forEach(el => {
          el.classList.remove('swig-highlight');
        });

        // Add new highlights
        ${patches.map((patch, i) => `
          setTimeout(() => {
            const el = document.querySelector('${patch.selector}');
            if (el) {
              el.classList.add('swig-highlight');
              el.style.outline = '2px solid #f59e0b';
              el.style.outlineOffset = '2px';
              el.style.animation = 'swig-pulse 1s infinite';
            }
          }, ${i * 100});
        `).join('\n')}

        // Inject animation CSS if not exists
        if (!document.getElementById('swig-styles')) {
          const style = document.createElement('style');
          style.id = 'swig-styles';
          style.textContent = \`
            @keyframes swig-pulse {
              0%, 100% { outline-color: #f59e0b; }
              50% { outline-color: #fbbf24; }
            }
          \`;
          document.head.appendChild(style);
        }
      })();
    `;
    setOverlayScript(script);
  }, [patches]);

  const handleInject = async () => {
    // Send script to target app via SignalR
    // This requires a new protocol message: InjectScript
    // For now, just copy to clipboard
    await navigator.clipboard.writeText(overlayScript);
    alert('Script copied to clipboard! Paste in target app console.');
  };

  return (
    <div className="visual-impact">
      <h3>Visual Impact Preview</h3>
      <p>{patches.length} DOM elements would be affected</p>
      <button onClick={handleInject}>Highlight in Target App</button>

      <div className="patch-list">
        {patches.map((patch, i) => (
          <div key={i} className="patch-item">
            <span className="patch-index">#{i + 1}</span>
            <span className="patch-selector">{patch.selector}</span>
            <span className="patch-operation">{patch.operation}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4.3 Infinite Loop Detection

```csharp
// InfiniteLoopDetector.cs
namespace Minimact.Swig.Instrumentation;

public class InfiniteLoopDetector
{
    private readonly Dictionary<string, Queue<DateTime>> _renderHistory = new();
    private readonly int _threshold = 10; // 10 renders
    private readonly TimeSpan _window = TimeSpan.FromSeconds(1); // within 1 second

    public bool CheckRenderLoop(string componentId)
    {
        if (!_renderHistory.ContainsKey(componentId))
        {
            _renderHistory[componentId] = new Queue<DateTime>();
        }

        var history = _renderHistory[componentId];
        var now = DateTime.UtcNow;

        // Add current render
        history.Enqueue(now);

        // Remove renders outside the time window
        while (history.Count > 0 && (now - history.Peek()) > _window)
        {
            history.Dequeue();
        }

        // Check if threshold exceeded
        if (history.Count >= _threshold)
        {
            return true; // Infinite loop detected!
        }

        return false;
    }

    public void Reset()
    {
        _renderHistory.Clear();
    }
}
```

### 4.4 App Lifecycle Manager

```csharp
// Services/AppLifecycleManager.cs
using System.Diagnostics;

namespace Minimact.Swig.Services;

public class AppLifecycleManager
{
    private readonly ILogger<AppLifecycleManager> _logger;
    private Process? _targetAppProcess;

    public AppLifecycleManager(ILogger<AppLifecycleManager> logger)
    {
        _logger = logger;
    }

    public async Task<bool> StartTargetApp(string appPath, int port)
    {
        if (_targetAppProcess != null && !_targetAppProcess.HasExited)
        {
            _logger.LogWarning("Target app is already running");
            return false;
        }

        try
        {
            _targetAppProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "dotnet",
                    Arguments = $"run --project {appPath} --urls http://localhost:{port}",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                }
            };

            _targetAppProcess.OutputDataReceived += (sender, args) =>
            {
                if (!string.IsNullOrEmpty(args.Data))
                    _logger.LogInformation($"[Target App] {args.Data}");
            };

            _targetAppProcess.ErrorDataReceived += (sender, args) =>
            {
                if (!string.IsNullOrEmpty(args.Data))
                    _logger.LogError($"[Target App Error] {args.Data}");
            };

            _targetAppProcess.Start();
            _targetAppProcess.BeginOutputReadLine();
            _targetAppProcess.BeginErrorReadLine();

            _logger.LogInformation($"Started target app on port {port}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start target app");
            return false;
        }
    }

    public async Task<bool> StopTargetApp()
    {
        if (_targetAppProcess == null || _targetAppProcess.HasExited)
        {
            _logger.LogWarning("Target app is not running");
            return false;
        }

        try
        {
            _targetAppProcess.Kill(entireProcessTree: true);
            await _targetAppProcess.WaitForExitAsync();
            _targetAppProcess.Dispose();
            _targetAppProcess = null;

            _logger.LogInformation("Stopped target app");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to stop target app");
            return false;
        }
    }

    public bool IsRunning()
    {
        return _targetAppProcess != null && !_targetAppProcess.HasExited;
    }
}
```

---

## Phase 5: Polish & Documentation (Week 8)

### 5.1 Styling

**wwwroot/css/swig.css:**

```css
/* Modern dark theme inspired by VS Code / Chrome DevTools */

:root {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d30;
  --border-color: #3e3e42;
  --text-primary: #cccccc;
  --text-secondary: #858585;
  --accent-blue: #0e639c;
  --accent-green: #10b981;
  --accent-yellow: #f59e0b;
  --accent-red: #ef4444;
}

body {
  margin: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.swig-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.swig-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.swig-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.connection-status {
  font-size: 14px;
  color: var(--text-secondary);
}

.swig-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 300px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-section {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.bottom-section {
  flex: 1;
  overflow: hidden;
}

/* Component Tree */
.component-tree {
  padding: 8px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.tree-node:hover {
  background: var(--bg-tertiary);
}

.tree-node.selected {
  background: var(--accent-blue);
}

.expand-button {
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}

.component-type {
  font-weight: 500;
}

.component-id {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: auto;
}

/* State Inspector */
.state-inspector {
  flex: 1;
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
}

.inspector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.state-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.state-item {
  display: flex;
  gap: 12px;
  align-items: center;
}

.state-key {
  font-weight: 500;
  min-width: 100px;
}

.state-value {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.edit-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.edit-button:hover {
  opacity: 1;
}

/* Performance Dashboard */
.performance-dashboard {
  flex: 1;
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  gap: 12px;
}

.metric-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--accent-blue);
}

.metric-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.metric-value {
  font-size: 24px;
  font-weight: 600;
}

/* SignalR Monitor */
.signalr-monitor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  padding: 16px;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-item {
  background: var(--bg-tertiary);
  border-radius: 4px;
  padding: 12px;
  border-left: 3px solid var(--accent-blue);
}

.message-item.incoming {
  border-left-color: var(--accent-green);
}

.message-item.outgoing {
  border-left-color: var(--accent-yellow);
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
}

.message-type {
  font-weight: 500;
}

.message-timestamp {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary);
}

.message-data {
  font-size: 12px;
  font-family: 'Courier New', monospace;
  color: var(--text-secondary);
}

.message-data pre {
  margin: 0;
  white-space: pre-wrap;
}
```

### 5.2 Documentation

**Create comprehensive docs:**

- **SWIG_USER_GUIDE.md** - How to use Swig UI
- **SWIG_API_REFERENCE.md** - Complete API documentation
- **SWIG_INTEGRATION_GUIDE.md** - How to integrate with target apps
- **SWIG_ARCHITECTURE.md** - Technical architecture details

---

## Summary

### Deliverables

1. **Minimact.Swig** - ASP.NET MVC app with SignalR hub
2. **Minimact.Swig.Instrumentation** - NuGet package for target apps
3. **React Frontend** - Complete UI for monitoring and control
4. **TSX Transpiler** - Web-based TSX → C# conversion
5. **Visual Impact Tool** - DOM highlight overlay
6. **Performance Monitoring** - Real-time metrics and analysis
7. **Component Preview** - Isolated component rendering
8. **App Lifecycle Management** - Start/stop/pause target app
9. **Comprehensive Documentation**

### Timeline

- **Phase 1** (Weeks 1-2): Foundation, protocol, hub
- **Phase 2** (Weeks 2-3): Instrumentation client
- **Phase 3** (Weeks 3-5): React frontend UI
- **Phase 4** (Weeks 5-7): Advanced features
- **Phase 5** (Week 8): Polish and documentation

**Total: 8 weeks to MVP**

---

## Next Steps

1. Create `src/Minimact.Swig` project
2. Implement `SwigHub` and protocol messages
3. Create `Minimact.Swig.Instrumentation` NuGet package
4. Build React frontend incrementally
5. Test with example Minimact app
6. Iterate and refine

---

**Minimact.Swig will revolutionize the developer experience for Minimact applications!**
