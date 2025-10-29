using Microsoft.AspNetCore.SignalR;
using Minimact.Swig.Models;
using Minimact.Swig.Models.InstrumentationProtocol;
using Minimact.Swig.Services;

namespace Minimact.Swig.Hubs;

/// <summary>
/// SignalR Hub for bidirectional communication between Swig UI and target Minimact apps
///
/// Flow:
/// 1. Target App connects → Registers via RegisterTargetApp
/// 2. Target App sends telemetry → ReportXxx methods
/// 3. Swig UI connects → Receives telemetry broadcasts
/// 4. Swig UI sends commands → SendXxx methods forward to target app
/// </summary>
public class SwigHub : Hub
{
    private readonly ILogger<SwigHub> _logger;
    private readonly MetricsCollector _metricsCollector;

    // Registry of connected target apps: AppName -> ConnectionId
    private static readonly Dictionary<string, string> _targetAppConnections = new();
    private static readonly object _registryLock = new();

    public SwigHub(ILogger<SwigHub> logger, MetricsCollector metricsCollector)
    {
        _logger = logger;
        _metricsCollector = metricsCollector;
    }

    // ============================================================
    // Target App → Swig (Telemetry)
    // ============================================================

    /// <summary>
    /// Called by target app when it starts up and connects to Swig
    /// </summary>
    public async Task RegisterTargetApp(AppStarted appInfo)
    {
        lock (_registryLock)
        {
            _targetAppConnections[appInfo.AppName] = Context.ConnectionId;
        }

        _logger.LogInformation($"✅ Target app registered: {appInfo.AppName} on port {appInfo.Port}");

        // Broadcast to all Swig UI clients
        await Clients.Others.SendAsync("TargetAppConnected", appInfo);
    }

    /// <summary>
    /// Called when a component finishes rendering
    /// </summary>
    public async Task ReportComponentRendered(ComponentRendered data)
    {
        _metricsCollector.RecordRender(data);
        await Clients.Others.SendAsync("ComponentRendered", data);
    }

    /// <summary>
    /// Called when component state changes
    /// </summary>
    public async Task ReportStateChanged(StateChanged data)
    {
        _metricsCollector.RecordStateChange(data);
        await Clients.Others.SendAsync("StateChanged", data);
    }

    /// <summary>
    /// Called when a hint matches (cache hit)
    /// </summary>
    public async Task ReportHintMatched(HintMatched data)
    {
        _metricsCollector.RecordCacheHit(data);
        await Clients.Others.SendAsync("HintMatched", data);
    }

    /// <summary>
    /// Called when no hint exists (cache miss)
    /// </summary>
    public async Task ReportHintMissed(HintMissed data)
    {
        _metricsCollector.RecordCacheMiss(data);
        await Clients.Others.SendAsync("HintMissed", data);
    }

    /// <summary>
    /// Called when an error occurs in target app
    /// </summary>
    public async Task ReportError(ErrorOccurred data)
    {
        _metricsCollector.RecordError(data);
        await Clients.Others.SendAsync("ErrorOccurred", data);
    }

    /// <summary>
    /// Called for generic performance metrics
    /// </summary>
    public async Task ReportPerformanceMetric(PerformanceMetricEvent data)
    {
        _metricsCollector.RecordMetric(data);
        await Clients.Others.SendAsync("PerformanceMetric", data);
    }

    // ============================================================
    // Swig UI → Target App (Control Commands)
    // ============================================================

    /// <summary>
    /// Trigger a state change in a component
    /// </summary>
    public async Task SendTriggerStateChange(string targetApp, TriggerStateChange command)
    {
        if (TryGetTargetConnection(targetApp, out var connectionId))
        {
            await Clients.Client(connectionId).SendAsync("TriggerStateChange", command);
            _logger.LogInformation($"Sent TriggerStateChange to {targetApp}: {command.ComponentId}.{command.StateKey} = {command.NewValue}");
        }
        else
        {
            _logger.LogWarning($"Target app not found: {targetApp}");
        }
    }

    /// <summary>
    /// Trigger a component re-render
    /// </summary>
    public async Task SendTriggerRerender(string targetApp, TriggerRerender command)
    {
        if (TryGetTargetConnection(targetApp, out var connectionId))
        {
            await Clients.Client(connectionId).SendAsync("TriggerRerender", command);
            _logger.LogInformation($"Sent TriggerRerender to {targetApp}: {command.ComponentId}");
        }
    }

    /// <summary>
    /// Request component tree from target app
    /// </summary>
    public async Task<ComponentTreeNode?> SendGetComponentTree(string targetApp)
    {
        if (TryGetTargetConnection(targetApp, out var connectionId))
        {
            try
            {
                _logger.LogInformation($"Requesting component tree from {targetApp}");

                // Use InvokeAsync for request/response pattern
                var result = await Clients.Client(connectionId).InvokeAsync<ComponentTreeNode>(
                    "GetComponentTree",
                    CancellationToken.None
                );

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to get component tree from {targetApp}");
                return null;
            }
        }

        return null;
    }

    // ============================================================
    // Connection Lifecycle
    // ============================================================

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation($"Client connected: {Context.ConnectionId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Check if this was a target app and remove from registry
        string? disconnectedAppName = null;

        lock (_registryLock)
        {
            var entry = _targetAppConnections.FirstOrDefault(x => x.Value == Context.ConnectionId);
            if (entry.Key != null)
            {
                disconnectedAppName = entry.Key;
                _targetAppConnections.Remove(entry.Key);
                _logger.LogWarning($"❌ Target app disconnected: {entry.Key}");
            }
        }

        // Notify Swig UI clients (outside lock)
        if (disconnectedAppName != null)
        {
            await Clients.Others.SendAsync("TargetAppDisconnected", disconnectedAppName);
        }

        await base.OnDisconnectedAsync(exception);
    }

    // ============================================================
    // Utility Methods
    // ============================================================

    /// <summary>
    /// Get list of connected target apps
    /// </summary>
    public List<string> GetConnectedTargetApps()
    {
        lock (_registryLock)
        {
            return _targetAppConnections.Keys.ToList();
        }
    }

    /// <summary>
    /// Get performance stats (called by Swig UI)
    /// </summary>
    public PerformanceStats GetPerformanceStats()
    {
        return _metricsCollector.GetPerformanceStats();
    }

    private bool TryGetTargetConnection(string targetApp, out string connectionId)
    {
        lock (_registryLock)
        {
            return _targetAppConnections.TryGetValue(targetApp, out connectionId!);
        }
    }
}
