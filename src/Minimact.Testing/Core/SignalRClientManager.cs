using Microsoft.AspNetCore.SignalR.Client;
using Minimact.AspNetCore.Abstractions;
using Minimact.Testing.Models;

namespace Minimact.Testing.Core;

/// <summary>
/// SignalR client manager - handles bidirectional communication with MinimactHub
/// Connects to real ASP.NET Core server for integration testing
/// </summary>
public class SignalRClientManager
{
    private HubConnection? _connection;
    private readonly Dictionary<string, ComponentContext> _components = new();

    public HubConnectionState ConnectionState =>
        _connection?.State ?? HubConnectionState.Disconnected;

    /// <summary>
    /// Connect to MinimactHub
    /// </summary>
    public async Task ConnectAsync(string hubUrl)
    {
        _connection = new HubConnectionBuilder()
            .WithUrl(hubUrl)
            .WithAutomaticReconnect()
            .Build();

        // Register server -> client handlers
        _connection.On<string, List<DOMPatch>>("ApplyPatches", OnApplyPatches);
        _connection.On<string, string, List<DOMPatch>, double>("QueueHint", OnQueueHint);

        await _connection.StartAsync();
        Console.WriteLine($"[SignalR] Connected to {hubUrl}");
    }

    /// <summary>
    /// Disconnect from MinimactHub
    /// </summary>
    public async Task DisconnectAsync()
    {
        if (_connection != null)
        {
            await _connection.StopAsync();
            Console.WriteLine("[SignalR] Disconnected");
        }
    }

    /// <summary>
    /// Wait for connection to be ready
    /// IMPORTANT: Always call this after ConnectAsync() before invoking methods!
    /// </summary>
    public async Task WaitForConnectionAsync(TimeSpan? timeout = null)
    {
        var maxWait = timeout ?? TimeSpan.FromSeconds(5);
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        while (ConnectionState != HubConnectionState.Connected)
        {
            if (stopwatch.Elapsed > maxWait)
                throw new TimeoutException("SignalR connection timeout");

            await Task.Delay(50);
        }
    }

    // ========================================
    // Client -> Server Methods
    // ========================================

    /// <summary>
    /// Invoke a component method on the server (e.g., button click handler)
    /// </summary>
    public async Task InvokeMethodAsync(string componentId, string methodName, params object[] args)
    {
        if (_connection == null)
            throw new InvalidOperationException("Not connected to SignalR hub");

        Console.WriteLine($"[SignalR] → InvokeMethod({componentId}, {methodName})");
        await _connection.InvokeAsync("InvokeComponentMethod", componentId, methodName, args);
    }

    /// <summary>
    /// Update component state on server (from useState hook)
    /// Keeps server state in sync with client to prevent stale data
    /// </summary>
    public async Task UpdateComponentStateAsync(string componentId, string stateKey, object value)
    {
        if (_connection == null)
            throw new InvalidOperationException("Not connected to SignalR hub");

        Console.WriteLine($"[SignalR] → UpdateComponentState({componentId}, {stateKey}, {value})");
        await _connection.InvokeAsync("UpdateComponentState", componentId, stateKey, value);
    }

    /// <summary>
    /// Update DOM element state on server (from useDomElementState hook)
    /// Keeps server aware of DOM changes for accurate rendering
    /// </summary>
    public async Task UpdateDomElementStateAsync(string componentId, string stateKey, DomElementStateSnapshot snapshot)
    {
        if (_connection == null)
            throw new InvalidOperationException("Not connected to SignalR hub");

        Console.WriteLine($"[SignalR] → UpdateDomElementState({componentId}, {stateKey})");
        await _connection.InvokeAsync("UpdateDomElementState", componentId, stateKey, snapshot);
    }

    /// <summary>
    /// Request a predict hint from server
    /// </summary>
    public async Task RequestPredictAsync(string componentId, Dictionary<string, object> stateChanges)
    {
        if (_connection == null)
            throw new InvalidOperationException("Not connected to SignalR hub");

        Console.WriteLine($"[SignalR] → RequestPredict({componentId})");
        await _connection.InvokeAsync("RequestPredict", componentId, stateChanges);
    }

    // ========================================
    // Server -> Client Handlers
    // ========================================

    /// <summary>
    /// Server sends patches to apply to DOM
    /// </summary>
    private void OnApplyPatches(string componentId, List<DOMPatch> patches)
    {
        Console.WriteLine($"[SignalR] ← ApplyPatches({componentId}, {patches.Count} patches)");

        if (_components.TryGetValue(componentId, out var context))
        {
            context.DOMPatcher.ApplyPatches(context.Element, patches);
        }
    }

    /// <summary>
    /// Server sends predict hint for instant feedback
    /// </summary>
    private void OnQueueHint(string componentId, string hintId, List<DOMPatch> patches, double confidence)
    {
        Console.WriteLine($"[SignalR] ← QueueHint({componentId}, {hintId}, {patches.Count} patches, {confidence:P})");

        if (_components.TryGetValue(componentId, out var context))
        {
            context.HintQueue.QueueHint(componentId, hintId, patches, confidence);
        }
    }

    /// <summary>
    /// Register a component context for receiving server messages
    /// </summary>
    public void RegisterComponent(string componentId, ComponentContext context)
    {
        _components[componentId] = context;
    }

    /// <summary>
    /// Unregister a component
    /// </summary>
    public void UnregisterComponent(string componentId)
    {
        _components.Remove(componentId);
    }
}
