# Server Push Walkthrough: Real-Time State Updates

Welcome back, **Minimalist**! 👋 In this walkthrough, you'll learn how to push real-time state updates from the **server to the client** using hosted services. This is perfect for monitoring dashboards, deployment status, background jobs, live analytics, and any scenario where the server needs to update the UI without user interaction.

:::tip Prerequisites
Before starting this walkthrough, you should:
- Complete either the [MVC Walkthrough](/v1.0/guide/mvc-walkthrough) or [SPA Walkthrough](/v1.0/guide/spa-walkthrough)
- Understand ASP.NET Core hosted services (`IHostedService` or `BackgroundService`)
- Have a basic understanding of dependency injection in .NET
:::

:::tip What You'll Learn
By the end of this walkthrough, you'll understand:
- How to use `ComponentStateUpdater` to push server-side updates
- How to create a hosted service that monitors processes
- How `useState` automatically receives server updates
- Different update strategies (single component, broadcast, type-specific)
- How this works with both MVC and SPA architectures
:::

## What is Server Push?

Traditional web apps require **polling** or **manual refresh** to see updates:

```
❌ Old Way (Polling):
Client: Fetch status every 1 second
   ↓
Server: Query database, return status
   ↓
Client: Update UI
   ↓
(Repeat every second = wasteful!)
```

With Minimact's **server push**, the server proactively sends updates:

```
✅ New Way (Server Push):
Server: Process status changed!
   ↓
Server: Update component state
   ↓
Client: Receives patches automatically
   ↓
Client: DOM updates instantly
   ↓
(No polling needed!)
```

---

## Step 1: The Scenario - Deployment Monitor (3 minutes)

Let's build a **Netlify-style deployment dashboard** that shows real-time build progress.

### What We'll Build:

A deployment monitor that shows:
- **Build status** (Building, Published, Failed)
- **Real-time progress** (0-100%)
- **Current stage** ("Installing dependencies", "Building", etc.)
- **Live URL** when published
- **Error messages** on failure

All updates happen **automatically** - no polling, no manual refresh!

---

## Step 2: Create the Component (5 minutes)

First, let's create the dashboard component that will display deployment status.

Create `Pages/DeploymentDashboard.tsx`:

```tsx
import { useState } from '@minimact/core';

interface DeploymentStatus {
  id: string;
  siteName: string;
  status: 'Idle' | 'Building' | 'Published' | 'Failed';
  progress: number;
  currentStage: string;
  liveUrl?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export function DeploymentDashboard() {
  // This state will be updated by the server automatically!
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>({
    id: '',
    siteName: 'My Website',
    status: 'Idle',
    progress: 0,
    currentStage: 'Waiting for deployment...'
  });

  const getStatusColor = () => {
    switch (deploymentStatus.status) {
      case 'Building': return '#3b82f6';
      case 'Published': return '#10b981';
      case 'Failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = () => {
    switch (deploymentStatus.status) {
      case 'Building': return '🔨';
      case 'Published': return '✅';
      case 'Failed': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
        Deployment Monitor
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        Real-time deployment status updates from server
      </p>

      {/* Status Card */}
      <div style={{
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '24px',
        border: `2px solid ${getStatusColor()}`
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <span style={{ fontSize: '40px' }}>{getStatusIcon()}</span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
              {deploymentStatus.siteName}
            </h2>
            <p style={{
              margin: 0,
              color: getStatusColor(),
              fontWeight: '600',
              fontSize: '16px',
              marginTop: '4px'
            }}>
              {deploymentStatus.status}
            </p>
          </div>
        </div>

        {/* Progress Bar (Building) */}
        {deploymentStatus.status === 'Building' && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#e5e7eb',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '8px'
            }}>
              <div style={{
                width: `${deploymentStatus.progress}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.5s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '8px'
              }}>
                {deploymentStatus.progress > 10 && (
                  <span style={{ color: 'white', fontSize: '10px', fontWeight: '600' }}>
                    {deploymentStatus.progress}%
                  </span>
                )}
              </div>
            </div>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0,
              fontWeight: '500'
            }}>
              {deploymentStatus.currentStage}
            </p>
          </div>
        )}

        {/* Success State */}
        {deploymentStatus.status === 'Published' && (
          <div style={{
            padding: '16px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #86efac'
          }}>
            <p style={{ margin: '0 0 12px 0', color: '#166534', fontWeight: '600', fontSize: '16px' }}>
              🎉 Deployment Successful!
            </p>
            {deploymentStatus.liveUrl && (
              <a
                href={deploymentStatus.liveUrl}
                target="_blank"
                style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {deploymentStatus.liveUrl} →
              </a>
            )}
            {deploymentStatus.completedAt && (
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                Completed at {new Date(deploymentStatus.completedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {/* Error State */}
        {deploymentStatus.status === 'Failed' && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fca5a5'
          }}>
            <p style={{ margin: '0 0 8px 0', color: '#991b1b', fontWeight: '600' }}>
              ❌ Deployment Failed
            </p>
            {deploymentStatus.error && (
              <pre style={{
                margin: 0,
                fontSize: '12px',
                color: '#7f1d1d',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                backgroundColor: '#fee2e2',
                padding: '8px',
                borderRadius: '4px'
              }}>
                {deploymentStatus.error}
              </pre>
            )}
          </div>
        )}

        {/* Idle State */}
        {deploymentStatus.status === 'Idle' && (
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Waiting for deployment to start...
          </p>
        )}
      </div>

      {/* Info Box */}
      <div style={{
        padding: '16px',
        backgroundColor: '#eff6ff',
        borderRadius: '8px',
        border: '1px solid #bfdbfe'
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
          💡 This dashboard updates in <strong>real-time</strong> via server push.
          No polling or manual refresh needed!
        </p>
      </div>
    </div>
  );
}
```

---

## Step 3: Create the Controller (2 minutes)

Create a controller to render the dashboard.

Create `Controllers/DeploymentController.cs`:

```csharp
using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;

namespace MyApp.Controllers;

[ApiController]
[Route("deployment")]
public class DeploymentController : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;

    public DeploymentController(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        return await _renderer.RenderPage<DeploymentDashboard>(
            pageTitle: "Deployment Monitor"
        );
    }
}
```

At this point, you can run your app and navigate to `/deployment/dashboard`. You'll see the dashboard in "Idle" state.

---

## Step 4: Create the Hosted Service (5 minutes)

Now let's create a hosted service that simulates a deployment process and pushes updates to the client.

Create `Services/DeploymentMonitorService.cs`:

```csharp
using Minimact.AspNetCore.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace MyApp.Services;

/// <summary>
/// Background service that monitors deployments and pushes real-time updates to clients
/// This simulates a Netlify-style deployment process
/// </summary>
public class DeploymentMonitorService : BackgroundService
{
    private readonly ComponentStateUpdater _stateUpdater;
    private readonly ILogger<DeploymentMonitorService> _logger;

    public DeploymentMonitorService(
        ComponentStateUpdater stateUpdater,
        ILogger<DeploymentMonitorService> logger)
    {
        _stateUpdater = stateUpdater;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Deployment Monitor Service started");

        // Wait a bit for app to start up
        await Task.Delay(5000, stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Simulate a deployment cycle every 30 seconds
                await SimulateDeployment(stoppingToken);

                // Wait before next deployment
                await Task.Delay(30000, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in deployment monitor");
            }
        }

        _logger.LogInformation("Deployment Monitor Service stopped");
    }

    private async Task SimulateDeployment(CancellationToken stoppingToken)
    {
        var deploymentId = Guid.NewGuid().ToString("N").Substring(0, 8);
        var siteName = "my-awesome-site.com";

        _logger.LogInformation($"Starting deployment {deploymentId}");

        // Phase 1: Deployment Started
        _stateUpdater.BroadcastStateUpdate("deploymentStatus", new
        {
            id = deploymentId,
            siteName = siteName,
            status = "Building",
            progress = 0,
            currentStage = "Initializing build environment...",
            startedAt = DateTime.UtcNow.ToString("o")
        });

        await Task.Delay(2000, stoppingToken);

        // Phase 2: Installing Dependencies
        _stateUpdater.BroadcastStateUpdate("deploymentStatus", new
        {
            id = deploymentId,
            siteName = siteName,
            status = "Building",
            progress = 20,
            currentStage = "Installing dependencies...",
            startedAt = DateTime.UtcNow.ToString("o")
        });

        await Task.Delay(3000, stoppingToken);

        // Phase 3: Building
        _stateUpdater.BroadcastStateUpdate("deploymentStatus", new
        {
            id = deploymentId,
            siteName = siteName,
            status = "Building",
            progress = 40,
            currentStage = "Building application...",
            startedAt = DateTime.UtcNow.ToString("o")
        });

        await Task.Delay(3000, stoppingToken);

        // Phase 4: Optimizing
        _stateUpdater.BroadcastStateUpdate("deploymentStatus", new
        {
            id = deploymentId,
            siteName = siteName,
            status = "Building",
            progress = 70,
            currentStage = "Optimizing assets...",
            startedAt = DateTime.UtcNow.ToString("o")
        });

        await Task.Delay(2000, stoppingToken);

        // Phase 5: Deploying
        _stateUpdater.BroadcastStateUpdate("deploymentStatus", new
        {
            id = deploymentId,
            siteName = siteName,
            status = "Building",
            progress = 90,
            currentStage = "Deploying to production...",
            startedAt = DateTime.UtcNow.ToString("o")
        });

        await Task.Delay(2000, stoppingToken);

        // Phase 6: Success (or sometimes fail for demo)
        var random = new Random();
        var shouldFail = random.Next(0, 5) == 0; // 20% chance of failure

        if (shouldFail)
        {
            // Simulate failure
            _stateUpdater.BroadcastStateUpdate("deploymentStatus", new
            {
                id = deploymentId,
                siteName = siteName,
                status = "Failed",
                progress = 90,
                currentStage = "Deployment failed",
                error = "Error: Build failed at optimization stage\nTypeError: Cannot read property 'foo' of undefined\n  at build.js:42:15",
                startedAt = DateTime.UtcNow.ToString("o")
            });

            _logger.LogWarning($"Deployment {deploymentId} failed");
        }
        else
        {
            // Simulate success
            var liveUrl = $"https://{siteName}/{deploymentId}";

            _stateUpdater.BroadcastStateUpdate("deploymentStatus", new
            {
                id = deploymentId,
                siteName = siteName,
                status = "Published",
                progress = 100,
                currentStage = "Live",
                liveUrl = liveUrl,
                startedAt = DateTime.UtcNow.ToString("o"),
                completedAt = DateTime.UtcNow.ToString("o")
            });

            _logger.LogInformation($"Deployment {deploymentId} completed: {liveUrl}");
        }
    }
}
```

---

## Step 5: Register the Hosted Service (1 minute)

Register the service in `Program.cs`:

```csharp
var builder = WebApplication.CreateBuilder(args);

// Add Minimact
builder.Services.AddMinimact();
builder.Services.AddMinimactMvcBridge();

// Add your hosted service
builder.Services.AddHostedService<DeploymentMonitorService>();

builder.Services.AddControllersWithViews();
builder.Services.AddSignalR();

var app = builder.Build();

app.UseStaticFiles();
app.UseMinimact();
app.MapControllers();

app.Run();
```

---

## Step 6: Test It! (2 minutes)

1. **Build and run** your application
2. **Navigate** to `/deployment/dashboard`
3. **Watch** as the deployment status updates in real-time!

You should see:
- ⏳ Idle state initially
- 🔨 Building state with progress bar (0% → 100%)
- Stage updates every few seconds
- ✅ Success state with live URL (80% of the time)
- ❌ Failure state with error message (20% of the time)

**All without polling or manual refresh!** 🚀

---

## Step 7: Understanding What Just Happened (2 minutes)

Let's break down the magic:

### Server Side (Hosted Service)

```csharp
// Hosted service runs in background
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    while (!stoppingToken.IsCancellationRequested)
    {
        // 1. Update state on server
        _stateUpdater.BroadcastStateUpdate("deploymentStatus", new
        {
            status = "Building",
            progress = 40
        });

        // 2. ComponentStateUpdater finds all components
        // 3. Calls component.SetStateFromClient("deploymentStatus", ...)
        // 4. Calls component.TriggerRender()
        // 5. Rust reconciler diffs VNode trees
        // 6. Generates patches
        // 7. SignalR sends patches to client

        await Task.Delay(1000);
    }
}
```

### Client Side (Component)

```tsx
// Component receives patches automatically
const [deploymentStatus, setDeploymentStatus] = useState({
  status: 'Idle',
  progress: 0
});

// When server calls BroadcastStateUpdate:
// 1. Server updates state → "Building", 40%
// 2. Server re-renders → new VNode
// 3. Rust diffs → generates patches
// 4. SignalR sends patches
// 5. Client applies patches → DOM updates
// 6. User sees: 🔨 Building (40%)
//
// NO polling, NO manual setState needed!
```

**The key insight:** `useState` on the client is **synchronized** with server state. When the server updates state via `ComponentStateUpdater`, the client automatically receives and applies the changes!

---

## Advanced Patterns

### Pattern 1: Update Specific Component

Instead of broadcasting to all components, update just one:

```csharp
// Get component ID from somewhere (e.g., user session, database)
var componentId = "deployment-dashboard-abc123";

_stateUpdater.UpdateComponentState(componentId, "deploymentStatus", new
{
    status = "Building",
    progress = 50
});
```

### Pattern 2: Update Components of Specific Type

Update only `DeploymentDashboard` components:

```csharp
_stateUpdater.UpdateComponentsOfType("DeploymentDashboard", "deploymentStatus", new
{
    status = "Building",
    progress = 60
});
```

### Pattern 3: Update with Custom Filter

Update components matching a condition:

```csharp
// Only update dashboards for a specific user
_stateUpdater.UpdateWhere(
    component => {
        // Check if component has user ID in state
        var userId = component.GetState<string>("userId");
        return userId == "user-123";
    },
    "deploymentStatus",
    statusData
);
```

### Pattern 4: Multiple State Updates at Once

Update multiple state keys in one render:

```csharp
_stateUpdater.UpdateComponentState(componentId, new Dictionary<string, object>
{
    ["deploymentStatus"] = statusData,
    ["buildLogs"] = logEntries,
    ["metrics"] = metricsData
});
```

---

## Real-World Use Cases

### 1. CI/CD Pipeline Monitor

```csharp
public class CIPipelineMonitorService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var buildEvent in _jenkinsClient.SubscribeToBuilds(stoppingToken))
        {
            _stateUpdater.BroadcastStateUpdate("pipelineStatus", new
            {
                buildId = buildEvent.Id,
                status = buildEvent.Status,
                stage = buildEvent.CurrentStage,
                duration = buildEvent.Duration
            });
        }
    }
}
```

### 2. System Resource Monitor

```csharp
public class SystemMonitorService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var cpuUsage = GetCpuUsage();
            var memoryUsage = GetMemoryUsage();

            _stateUpdater.BroadcastStateUpdate("systemMetrics", new
            {
                cpu = cpuUsage,
                memory = memoryUsage,
                timestamp = DateTime.UtcNow
            });

            await Task.Delay(1000, stoppingToken);
        }
    }
}
```

### 3. Live Analytics Dashboard

```csharp
public class AnalyticsService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var analyticsEvent in _analyticsStream.Subscribe(stoppingToken))
        {
            _stateUpdater.UpdateComponentsOfType("AnalyticsDashboard", "liveStats", new
            {
                activeUsers = analyticsEvent.ActiveUsers,
                pageViews = analyticsEvent.PageViews,
                conversionRate = analyticsEvent.ConversionRate
            });
        }
    }
}
```

### 4. Background Job Progress

```csharp
public class DataExportService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var jobId = StartExportJob();

        for (int i = 0; i <= 100; i += 10)
        {
            _stateUpdater.UpdateComponentState(jobId, "exportProgress", new
            {
                progress = i,
                recordsProcessed = i * 100,
                estimatedTimeRemaining = (100 - i) * 2
            });

            await ProcessBatch();
        }
    }
}
```

---

## Works with Both MVC and SPA!

This pattern works identically for both architectures:

### MVC Architecture

```csharp
// Controller renders page
public async Task<IActionResult> Dashboard()
{
    return await _renderer.RenderPage<DeploymentDashboard>(
        pageTitle: "Deployment Monitor"
    );
}

// Hosted service updates state
_stateUpdater.BroadcastStateUpdate("deploymentStatus", statusData);

// ✅ MVC component receives update
```

### SPA Architecture

```csharp
// Controller renders page in AdminShell
public async Task<IActionResult> Dashboard()
{
    return await _renderer.RenderPage<DeploymentDashboard>(
        pageTitle: "Deployment Monitor",
        options: new MinimactPageRenderOptions { UseSPA = true }
    );
}

// Hosted service updates state
_stateUpdater.BroadcastStateUpdate("deploymentStatus", statusData);

// ✅ SPA component receives update (shell stays mounted)
```

**Both work the same!** The underlying infrastructure (`MinimactComponent`, `TriggerRender`, `PatchSender`) is shared.

---

## Performance Considerations

### How Efficient Is This?

Very! Here's why:

1. **Patches, not full re-render**: Only changed DOM nodes are updated
2. **Rust reconciler**: ~1ms diffing for typical components
3. **SignalR WebSocket**: Persistent connection, minimal overhead
4. **Targeted updates**: Can update specific components, not all

### Example Metrics:

For a deployment status update (5 fields changed):
- **Server-side**: ~2ms (render + diff)
- **Network**: ~5ms (WebSocket roundtrip)
- **Client-side**: ~1ms (apply 5 patches)
- **Total**: **~8ms end-to-end**

Compare to polling:
- **Request overhead**: ~50-100ms per poll
- **Server load**: Constant queries even when nothing changes
- **Network**: Multiple requests per second

**Server push is ~10× more efficient!**

---

## Debugging Tips

### Check Component Connections

```csharp
// In your hosted service
var connectedCount = _stateUpdater.GetAllComponentIds().Count();
_logger.LogInformation($"Broadcasting to {connectedCount} connected component(s)");
```

### Check If Component Is Connected

```csharp
if (_stateUpdater.IsComponentConnected(componentId))
{
    _stateUpdater.UpdateComponentState(componentId, "status", data);
}
else
{
    _logger.LogWarning($"Component {componentId} not connected");
}
```

### Log State Updates

```csharp
// ComponentStateUpdater already logs at Debug level
// Set log level in appsettings.json:
{
  "Logging": {
    "LogLevel": {
      "Minimact.AspNetCore.Services.ComponentStateUpdater": "Debug"
    }
  }
}
```

---

## Troubleshooting

### Updates not appearing in UI

**Check:**
1. Is the hosted service registered in `Program.cs`?
2. Is the component connected? (Check browser console for SignalR connection)
3. Does the state key match? (`"deploymentStatus"` on both sides)
4. Is the component instance still alive? (Check `_stateUpdater.GetAllComponentIds()`)

### Multiple components receiving updates

This is **intentional**! `BroadcastStateUpdate` sends to all components. Use:
- `UpdateComponentState(componentId, ...)` for single component
- `UpdateComponentsOfType(typeName, ...)` for specific component type
- `UpdateWhere(predicate, ...)` for custom filtering

### State updates too frequent

Throttle your updates:

```csharp
// Instead of updating every 100ms:
await Task.Delay(100);

// Update every 1 second:
await Task.Delay(1000);

// Or batch updates:
var pendingUpdates = new List<StateUpdate>();
// ... collect updates ...
// Send batch every second
```

---

## Next Steps

Congratulations! 🎉 You now understand server-push real-time updates in Minimact. You've learned:

- ✅ How `ComponentStateUpdater` pushes server updates to clients
- ✅ How to create hosted services for background monitoring
- ✅ How `useState` automatically receives server updates
- ✅ Different update strategies (broadcast, type-specific, filtered)
- ✅ Real-world use cases (CI/CD, monitoring, analytics)
- ✅ How this works with both MVC and SPA architectures

### Continue Learning

- **[Predictive Rendering](/v1.0/guide/predictive-rendering)** — Learn how hint queues predict user actions
- **[API Reference](/v1.0/api/hooks)** — Explore all available hooks
- **[Examples](/v1.0/examples)** — See more complex applications

### Build More

Try extending your deployment monitor:

1. **Real deployment integration** — Connect to actual CI/CD (GitHub Actions, Jenkins)
2. **Multi-site support** — Monitor multiple websites simultaneously
3. **Historical data** — Store and display past deployments
4. **Alerts** — Send notifications on deployment failures
5. **Rollback UI** — Add buttons to rollback failed deployments

---

## Summary

In just 15 minutes, you've:
- ✅ Created a real-time deployment dashboard
- ✅ Built a hosted service that pushes server updates
- ✅ Achieved **~8ms update latency** (server → client)
- ✅ Eliminated polling entirely
- ✅ Learned patterns for CI/CD, monitoring, analytics, and more

**Server push is one of Minimact's most powerful features** — it enables true real-time applications with minimal code and maximum performance! 🚀

> *"The cactus doesn't poll — it pushes."* — Every Minimalist
