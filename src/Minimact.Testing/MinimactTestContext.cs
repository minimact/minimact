using Minimact.AspNetCore.Core;
using Minimact.Testing.Core;
using Minimact.Testing.Fluent;

namespace Minimact.Testing;

/// <summary>
/// Test context for Minimact components
/// Entry point for all tests - wraps MockDOM and provides fluent API
///
/// Example:
/// <code>
/// using var ctx = new MinimactTestContext();
/// var test = await ctx.RenderAsync&lt;Counter&gt;();
/// await test.ClickAsync("button");
/// test.AssertText("button", "Count: 1");
/// </code>
/// </summary>
public class MinimactTestContext : IDisposable
{
    private readonly MockDOM _dom;
    private readonly bool _enableDebugLogging;

    public MinimactTestContext(MinimactTestOptions? options = null)
    {
        options ??= new MinimactTestOptions();
        _enableDebugLogging = options.EnableDebugLogging;
        _dom = new MockDOM();
    }

    /// <summary>
    /// Render a Minimact component for testing
    /// Returns a fluent test interface for interactions and assertions
    /// </summary>
    public ComponentTest<T> Render<T>() where T : MinimactComponent, new()
    {
        var component = new T();
        var componentId = Guid.NewGuid().ToString();

        // Initialize component
        component.OnInitializedAsync().GetAwaiter().GetResult();

        // Render component to VNode
        var vnode = component.RenderComponent();

        // Convert VNode to MockElement (initial render only)
        var rootElement = VNodeRenderer.InitialRender(vnode);
        rootElement.Id = componentId;
        rootElement.Attributes["data-minimact-component"] = componentId;

        _dom.AddRootElement(rootElement);

        // Create component context (mirrors browser ComponentContext)
        var context = new ComponentContext
        {
            ComponentId = componentId,
            Element = rootElement,
            State = new Dictionary<string, object>(),
            Effects = new List<Effect>(),
            Refs = new Dictionary<string, Ref>(),
            DomElementStates = new Dictionary<string, DomElementState>()
        };

        return new ComponentTest<T>(component, rootElement, context, _dom, _enableDebugLogging, vnode);
    }

    /// <summary>
    /// Get DOM for advanced scenarios
    /// </summary>
    public MockDOM DOM => _dom;

    public void Dispose()
    {
        _dom.Clear();
    }
}

/// <summary>
/// Options for test context
/// </summary>
public class MinimactTestOptions
{
    /// <summary>
    /// Enable debug logging to console
    /// </summary>
    public bool EnableDebugLogging { get; set; } = false;

    /// <summary>
    /// Enable template extraction and caching
    /// </summary>
    public bool EnableTemplateExtraction { get; set; } = true;
}
