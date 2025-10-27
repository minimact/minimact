using Microsoft.AspNetCore.SignalR.Client;
using Minimact.CommandCenter.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// Unified client that works with both Mock and Real implementations
/// Provides a consistent API regardless of which backend is used
/// </summary>
public class UnifiedMinimactClient : IDisposable
{
    private readonly MockClient? _mockClient;
    private readonly RealClient? _realClient;
    private readonly bool _isReal;

    private UnifiedMinimactClient(MockClient mockClient)
    {
        _mockClient = mockClient;
        _isReal = false;
    }

    private UnifiedMinimactClient(RealClient realClient)
    {
        _realClient = realClient;
        _isReal = true;
    }

    /// <summary>
    /// Create a Mock client
    /// </summary>
    public static UnifiedMinimactClient CreateMock()
    {
        return new UnifiedMinimactClient(new MockClient());
    }

    /// <summary>
    /// Create a Real client (ClearScript V8 + AngleSharp)
    /// </summary>
    public static UnifiedMinimactClient CreateReal()
    {
        return new UnifiedMinimactClient(new RealClient());
    }

    /// <summary>
    /// Create based on ClientType enum
    /// </summary>
    public static UnifiedMinimactClient Create(MinimactClientFactory.ClientType type)
    {
        return type == MinimactClientFactory.ClientType.Real
            ? CreateReal()
            : CreateMock();
    }

    // ========================================
    // Common API
    // ========================================

    public async Task ConnectAsync(string hubUrl)
    {
        if (_isReal)
            await _realClient!.ConnectAsync(hubUrl);
        else
            await _mockClient!.ConnectAsync(hubUrl);
    }

    public async Task DisconnectAsync()
    {
        if (_isReal)
            await _realClient!.DisconnectAsync();
        else
            await _mockClient!.DisconnectAsync();
    }

    public string ConnectionState
    {
        get
        {
            if (_isReal)
                return _realClient!.ConnectionState;
            else
                return _mockClient!.SignalR.ConnectionState.ToString();
        }
    }

    public UnifiedComponentContext InitializeComponent(string componentId, string elementId)
    {
        if (_isReal)
        {
            var context = _realClient!.InitializeComponent(componentId, elementId);
            return new UnifiedComponentContext(context);
        }
        else
        {
            var context = _mockClient!.InitializeComponent(componentId, elementId);
            return new UnifiedComponentContext(context);
        }
    }

    public UnifiedComponentContext? GetComponent(string componentId)
    {
        if (_isReal)
        {
            var context = _realClient!.GetComponent(componentId);
            return context != null ? new UnifiedComponentContext(context) : null;
        }
        else
        {
            var context = _mockClient!.GetComponent(componentId);
            return context != null ? new UnifiedComponentContext(context) : null;
        }
    }

    // ========================================
    // DOM Access (unified interface)
    // ========================================

    public object? GetElementById(string id)
    {
        if (_isReal)
            return _realClient!.DOM.GetElementById(id);
        else
            return _mockClient!.DOM.GetElementById(id);
    }

    public string GetHTML()
    {
        if (_isReal)
            return _realClient!.GetHTML();
        else
            return _mockClient!.DOM.ToHTML();
    }

    // ========================================
    // Backend-specific access
    // ========================================

    public bool IsRealClient => _isReal;
    public bool IsMockClient => !_isReal;

    public MockClient? AsMockClient => _mockClient;
    public RealClient? AsRealClient => _realClient;

    /// <summary>
    /// Get the underlying MockClient (throws if Real client)
    /// </summary>
    public MockClient MockClient
    {
        get
        {
            if (_mockClient != null)
                return _mockClient;
            throw new InvalidOperationException("MockClient only works with Mock mode.");
        }
    }

    /// <summary>
    /// Get the underlying RealClient (throws if Mock client)
    /// </summary>
    public RealClient RealClient
    {
        get
        {
            if (_realClient != null)
                return _realClient;
            throw new InvalidOperationException("RealClient only works with Real mode.");
        }
    }

    public MockDOM? DOM_Mock => _mockClient?.DOM;
    public RealDOM? DOM_Real => _realClient?.DOM;
    public SignalRClientManager? SignalR_Mock => _mockClient?.SignalR;

    /// <summary>
    /// Get DOM - only works with MockClient
    /// For unified access, use GetElementById() or GetHTML() instead
    /// </summary>
    public MockDOM DOM
    {
        get
        {
            if (_mockClient != null)
                return _mockClient.DOM;
            throw new InvalidOperationException("DOM property only works with MockClient. Use GetElementById() or GetHTML() for unified access, or DOM_Real for RealClient.");
        }
    }

    public void Dispose()
    {
        _realClient?.Dispose();
        Task.Run(async () => await (_mockClient?.DisconnectAsync() ?? Task.CompletedTask)).Wait();
    }
}

/// <summary>
/// Unified component context that works with both Mock and Real
/// </summary>
public class UnifiedComponentContext
{
    private readonly ComponentContext? _mockContext;
    private readonly RealComponentContext? _realContext;
    private readonly bool _isReal;

    internal UnifiedComponentContext(ComponentContext mockContext)
    {
        _mockContext = mockContext;
        _isReal = false;
    }

    internal UnifiedComponentContext(RealComponentContext realContext)
    {
        _realContext = realContext;
        _isReal = true;
    }

    // ========================================
    // Common properties
    // ========================================

    public string ComponentId =>
        _isReal ? _realContext!.ComponentId : _mockContext!.ComponentId;

    public object Element =>
        _isReal ? _realContext!.Element : _mockContext!.Element;

    public Dictionary<string, object> State =>
        _isReal ? _realContext!.State : _mockContext!.State;

    // ========================================
    // Unified HintQueue access
    // ========================================

    public void QueueHint(string componentId, string hintId, List<DOMPatch> patches, double confidence)
    {
        if (_isReal)
            _realContext!.HintQueue.QueueHint(componentId, hintId, patches, confidence);
        else
            _mockContext!.HintQueue.QueueHint(componentId, hintId, patches, confidence);
    }

    public object? MatchHint(string componentId, Dictionary<string, object> stateChanges)
    {
        if (_isReal)
            return _realContext!.HintQueue.MatchHint(componentId, stateChanges);
        else
            return _mockContext!.HintQueue.MatchHint(componentId, stateChanges);
    }

    // ========================================
    // Unified DOMPatcher access
    // ========================================

    public void ApplyPatches(List<DOMPatch> patches)
    {
        if (_isReal)
            _realContext!.DOMPatcher.ApplyPatches(_realContext.Element, patches);
        else
            _mockContext!.DOMPatcher.ApplyPatches((MockElement)_mockContext.Element, patches);
    }

    // ========================================
    // Backend-specific access
    // ========================================

    public bool IsReal => _isReal;
    public bool IsMock => !_isReal;

    public ComponentContext? AsMockContext => _mockContext;
    public RealComponentContext? AsRealContext => _realContext;

    /// <summary>
    /// Get the underlying ComponentContext (throws if Real client)
    /// </summary>
    public ComponentContext MockContext
    {
        get
        {
            if (_mockContext != null)
                return _mockContext;
            throw new InvalidOperationException("MockContext only works with MockClient.");
        }
    }

    public RealComponentContext? RealContext => _realContext;

    public HintQueue? HintQueue_Mock => _mockContext?.HintQueue;
    public HintQueueBridge? HintQueue_Real => _realContext?.HintQueue;

    public DOMPatcher? DOMPatcher_Mock => _mockContext?.DOMPatcher;
    public DOMPatcherBridge? DOMPatcher_Real => _realContext?.DOMPatcher;

    /// <summary>
    /// Get HintQueue - only works with MockClient
    /// For unified access, use QueueHint() and MatchHint() methods instead
    /// </summary>
    public HintQueue HintQueue
    {
        get
        {
            if (_mockContext != null)
                return _mockContext.HintQueue;
            throw new InvalidOperationException("HintQueue property only works with MockClient. Use QueueHint()/MatchHint() for unified access.");
        }
    }

    /// <summary>
    /// Get DOMPatcher - only works with MockClient
    /// For unified access, use ApplyPatches() method instead
    /// </summary>
    public DOMPatcher DOMPatcher
    {
        get
        {
            if (_mockContext != null)
                return _mockContext.DOMPatcher;
            throw new InvalidOperationException("DOMPatcher property only works with MockClient. Use ApplyPatches() for unified access.");
        }
    }
}
