using Microsoft.AspNetCore.SignalR.Client;
using Minimact.CommandCenter.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// Real Minimact client using ClearScript V8 + AngleSharp DOM
/// This simulates a real browser environment for testing
/// JavaScript client runtime calls MockHub which uses real ComponentEngine!
/// </summary>
public class RealClient : IDisposable
{
    private readonly RealDOM _dom;
    private readonly JSRuntime _jsRuntime;
    private readonly HubConnection _signalRConnection;
    private readonly RealHub _hub;
    private readonly Dictionary<string, RealComponentContext> _components = new();

    public RealDOM DOM => _dom;
    public JSRuntime JSRuntime => _jsRuntime;
    public HubConnection SignalR => _signalRConnection;
    public RealHub Hub => _hub;

    public string ConnectionState => "Connected"; // Always connected to RealHub

    public RealClient()
    {
        _dom = new RealDOM();
        _jsRuntime = new JSRuntime(_dom);

        // Create RealHub with real ComponentEngine
        _hub = new RealHub(this);

        // Expose hub to JavaScript so client runtime can call hub methods
        _jsRuntime.ExposeHubConnection(_hub);

        // Create SignalR connection (not connected yet)
        _signalRConnection = new HubConnectionBuilder()
            .WithUrl("http://localhost:5000/minimact")
            .WithAutomaticReconnect()
            .Build();

        // Setup SignalR event handlers
        SetupSignalRHandlers();

        // Load Minimact client runtime
        _jsRuntime.LoadMinimactRuntime();
    }

    /// <summary>
    /// Setup SignalR message handlers
    /// </summary>
    private void SetupSignalRHandlers()
    {
        // Handle incoming patches from server
        _signalRConnection.On<string, string>("ApplyPatches", (componentId, patchesJson) =>
        {
            Console.WriteLine($"[RealClient] Received patches for component: {componentId}");
            _jsRuntime.ApplyPatches(componentId, patchesJson);
        });

        // Handle prediction hints from server
        _signalRConnection.On<string, string, string, double>("QueueHint", (componentId, hintId, patchesJson, confidence) =>
        {
            Console.WriteLine($"[RealClient] Received hint for component: {componentId}, hintId: {hintId}, confidence: {confidence}");
            _jsRuntime.QueueHint(componentId, hintId, patchesJson, confidence);
        });

        // Handle component initialization
        _signalRConnection.On<string, string>("InitializeComponent", (componentId, initialHtml) =>
        {
            Console.WriteLine($"[RealClient] Initializing component: {componentId}");
            // This would typically set the initial HTML
            var element = _dom.GetElementById(componentId);
            if (element != null)
            {
                _dom.SetInnerHTML(element, initialHtml);
            }
        });
    }

    /// <summary>
    /// Connect to SignalR hub
    /// </summary>
    public async Task ConnectAsync(string? hubUrl = null)
    {
        if (_signalRConnection.State == HubConnectionState.Connected)
        {
            Console.WriteLine("[RealClient] Already connected to SignalR hub");
            return;
        }

        try
        {
            await _signalRConnection.StartAsync();
            Console.WriteLine($"[RealClient] Connected to SignalR hub: {_signalRConnection.State}");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[RealClient] Failed to connect to SignalR hub: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Disconnect from SignalR hub
    /// </summary>
    public async Task DisconnectAsync()
    {
        if (_signalRConnection.State != HubConnectionState.Connected)
        {
            return;
        }

        try
        {
            await _signalRConnection.StopAsync();
            Console.WriteLine("[RealClient] Disconnected from SignalR hub");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[RealClient] Error disconnecting from SignalR hub: {ex.Message}");
        }
    }

    /// <summary>
    /// Initialize a component
    /// </summary>
    public RealComponentContext InitializeComponent(string componentId, string rootElementId)
    {
        Console.WriteLine($"[RealClient] Initializing component: {componentId} at root: {rootElementId}");

        // Create root element if it doesn't exist
        var rootElement = _dom.GetElementById(rootElementId);
        if (rootElement == null)
        {
            // Create the root element in the body
            _dom.BodyHtml = $"<div id=\"{rootElementId}\"></div>";
            rootElement = _dom.GetElementById(rootElementId);
        }

        if (rootElement == null)
        {
            throw new InvalidOperationException($"Failed to create root element: {rootElementId}");
        }

        // Initialize Minimact client for this component
        _jsRuntime.InitializeMinimactClient(componentId, rootElementId);

        // Create component context
        var context = new RealComponentContext
        {
            ComponentId = componentId,
            RootElementId = rootElementId,
            Element = rootElement,
            JSRuntime = _jsRuntime,
            DOM = _dom,
            SignalR = _signalRConnection
        };

        _components[componentId] = context;

        return context;
    }

    /// <summary>
    /// Get component context by ID
    /// </summary>
    public RealComponentContext? GetComponent(string componentId)
    {
        return _components.TryGetValue(componentId, out var context) ? context : null;
    }

    /// <summary>
    /// Simulate a user click on an element
    /// </summary>
    public void SimulateClick(string elementId)
    {
        Console.WriteLine($"[RealClient] Simulating click on element: {elementId}");
        _jsRuntime.SimulateClick(elementId);
    }

    /// <summary>
    /// Simulate user input on an element
    /// </summary>
    public void SimulateInput(string elementId, string value)
    {
        Console.WriteLine($"[RealClient] Simulating input on element: {elementId}, value: {value}");
        _jsRuntime.SimulateInput(elementId, value);
    }

    /// <summary>
    /// Get the current HTML of the entire document
    /// </summary>
    public string GetHTML()
    {
        return _dom.ToHTML();
    }

    /// <summary>
    /// Get the current body HTML
    /// </summary>
    public string GetBodyHTML()
    {
        return _dom.BodyHtml;
    }

    /// <summary>
    /// Execute arbitrary JavaScript code
    /// </summary>
    public object? ExecuteJS(string code)
    {
        return _jsRuntime.Execute(code);
    }

    /// <summary>
    /// Dispose resources
    /// </summary>
    public void Dispose()
    {
        Task.Run(async () => await DisconnectAsync()).Wait();
        _jsRuntime?.Dispose();
    }
}

/// <summary>
/// Extended component context for Real runtime
/// </summary>
public class RealComponentContext
{
    public required string ComponentId { get; init; }
    public required string RootElementId { get; init; }
    public required object Element { get; init; } // IElement from AngleSharp
    public required JSRuntime JSRuntime { get; init; }
    public required RealDOM DOM { get; init; }
    public required HubConnection SignalR { get; init; }

    public Dictionary<string, object> State { get; } = new();

    /// <summary>
    /// Get the HintQueue from the JavaScript runtime
    /// </summary>
    public HintQueueBridge HintQueue => new HintQueueBridge(JSRuntime, ComponentId);

    /// <summary>
    /// Get the DOMPatcher from the JavaScript runtime
    /// </summary>
    public DOMPatcherBridge DOMPatcher => new DOMPatcherBridge(JSRuntime);
}

/// <summary>
/// Bridge to HintQueue in JavaScript
/// </summary>
public class HintQueueBridge
{
    private readonly JSRuntime _jsRuntime;
    private readonly string _componentId;

    public HintQueueBridge(JSRuntime jsRuntime, string componentId)
    {
        _jsRuntime = jsRuntime;
        _componentId = componentId;
    }

    public void QueueHint(string componentId, string hintId, List<DOMPatch> patches, double confidence)
    {
        var patchesJson = System.Text.Json.JsonSerializer.Serialize(patches);
        _jsRuntime.QueueHint(componentId, hintId, patchesJson, confidence);
    }

    public object? MatchHint(string componentId, Dictionary<string, object> stateChanges)
    {
        var stateJson = System.Text.Json.JsonSerializer.Serialize(stateChanges);
        return _jsRuntime.Execute($@"
            (function() {{
                if (typeof Minimact !== 'undefined' && Minimact.matchHint) {{
                    var state = JSON.parse({System.Text.Json.JsonSerializer.Serialize(stateJson)});
                    return Minimact.matchHint('{componentId}', state);
                }}
                return null;
            }})()
        ");
    }
}

/// <summary>
/// Bridge to DOMPatcher in JavaScript
/// </summary>
public class DOMPatcherBridge
{
    private readonly JSRuntime _jsRuntime;

    public DOMPatcherBridge(JSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    public void ApplyPatches(object element, List<DOMPatch> patches)
    {
        var patchesJson = System.Text.Json.JsonSerializer.Serialize(patches);
        _jsRuntime.Execute($@"
            (function() {{
                if (typeof Minimact !== 'undefined' && Minimact.applyPatches) {{
                    var patches = JSON.parse({System.Text.Json.JsonSerializer.Serialize(patchesJson)});
                    Minimact.applyPatches(null, patches);
                }}
            }})()
        ");
    }
}
