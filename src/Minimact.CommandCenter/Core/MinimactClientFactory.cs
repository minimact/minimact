using System;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// Factory for creating Minimact clients
/// Supports both Mock and Real implementations
/// </summary>
public static class MinimactClientFactory
{
    public enum ClientType
    {
        /// <summary>
        /// Mock client - lightweight, no JavaScript engine
        /// </summary>
        Mock,

        /// <summary>
        /// Real client - uses ClearScript V8 + AngleSharp + real client runtime
        /// </summary>
        Real
    }

    /// <summary>
    /// Create a Minimact client based on type
    /// </summary>
    public static IMinimactClient Create(ClientType type = ClientType.Real)
    {
        return type switch
        {
            ClientType.Mock => new MockClientAdapter(),
            ClientType.Real => new RealClientAdapter(),
            _ => throw new ArgumentException($"Unknown client type: {type}")
        };
    }

    /// <summary>
    /// Create client based on environment variable or default to Real
    /// </summary>
    public static IMinimactClient CreateDefault()
    {
        var clientTypeEnv = Environment.GetEnvironmentVariable("MINIMACT_CLIENT_TYPE");

        if (Enum.TryParse<ClientType>(clientTypeEnv, true, out var type))
        {
            Console.WriteLine($"[MinimactClientFactory] Creating {type} client (from environment)");
            return Create(type);
        }

        Console.WriteLine("[MinimactClientFactory] Creating Real client (default)");
        return Create(ClientType.Real);
    }
}

/// <summary>
/// Adapter for MockClient to implement IMinimactClient
/// </summary>
internal class MockClientAdapter : IMinimactClient
{
    private readonly MockClient _client = new();

    public string ConnectionState => _client.SignalR.ConnectionState.ToString();
    public object DOM => _client.DOM;

    public Task ConnectAsync(string hubUrl) => _client.ConnectAsync(hubUrl);
    public Task DisconnectAsync() => _client.DisconnectAsync();

    public IComponentContext InitializeComponent(string componentId, string elementId)
    {
        var context = _client.InitializeComponent(componentId, elementId);
        return new MockComponentContextAdapter(context);
    }

    public IComponentContext? GetComponent(string componentId)
    {
        var context = _client.GetComponent(componentId);
        return context != null ? new MockComponentContextAdapter(context) : null;
    }

    public void Dispose()
    {
        Task.Run(async () => await _client.DisconnectAsync()).Wait();
    }
}

/// <summary>
/// Adapter for RealClient to implement IMinimactClient
/// </summary>
internal class RealClientAdapter : IMinimactClient
{
    private readonly RealClient _client = new();

    public string ConnectionState => _client.ConnectionState;
    public object DOM => _client.DOM;

    public Task ConnectAsync(string hubUrl) => _client.ConnectAsync(hubUrl);
    public Task DisconnectAsync() => _client.DisconnectAsync();

    public IComponentContext InitializeComponent(string componentId, string elementId)
    {
        var context = _client.InitializeComponent(componentId, elementId);
        return new RealComponentContextAdapter(context);
    }

    public IComponentContext? GetComponent(string componentId)
    {
        var context = _client.GetComponent(componentId);
        return context != null ? new RealComponentContextAdapter(context) : null;
    }

    public void Dispose()
    {
        _client.Dispose();
    }
}

/// <summary>
/// Adapter for MockClient's ComponentContext
/// </summary>
internal class MockComponentContextAdapter : IComponentContext
{
    private readonly Core.ComponentContext _context;

    public MockComponentContextAdapter(Core.ComponentContext context)
    {
        _context = context;
    }

    public string ComponentId => _context.ComponentId;
    public object Element => _context.Element;
    public Dictionary<string, object> State => _context.State;

    public Core.ComponentContext UnderlyingContext => _context;
}

/// <summary>
/// Adapter for RealClient's ComponentContext
/// </summary>
internal class RealComponentContextAdapter : IComponentContext
{
    private readonly RealComponentContext _context;

    public RealComponentContextAdapter(RealComponentContext context)
    {
        _context = context;
    }

    public string ComponentId => _context.ComponentId;
    public object Element => _context.Element;
    public Dictionary<string, object> State => _context.State;

    public RealComponentContext UnderlyingContext => _context;
}
