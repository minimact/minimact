using Minimact.CommandCenter.Models;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// MockClient - Complete browser Minimact runtime simulation
///
/// Simulates the entire client-side stack:
/// - Virtual DOM (MockDOM)
/// - Component state management (ComponentContext)
/// - Predictive rendering (HintQueue)
/// - Patch application (DOMPatcher)
/// - Server communication (SignalR)
///
/// This is the "Power Rangers Command Center" - it orchestrates everything!
/// </summary>
public class MockClient
{
    private readonly MockDOM _dom;
    private readonly SignalRClientManager _signalR;
    private readonly Dictionary<string, ComponentContext> _components = new();

    public MockClient()
    {
        _dom = new MockDOM();
        _signalR = new SignalRClientManager();
    }

    // ========================================
    // Connection Management
    // ========================================

    /// <summary>
    /// Connect to MinimactHub
    /// </summary>
    public async Task ConnectAsync(string hubUrl)
    {
        await _signalR.ConnectAsync(hubUrl);
        await _signalR.WaitForConnectionAsync();
    }

    /// <summary>
    /// Disconnect from MinimactHub
    /// </summary>
    public async Task DisconnectAsync()
    {
        await _signalR.DisconnectAsync();
    }

    // ========================================
    // Component Management
    // ========================================

    /// <summary>
    /// Initialize a component (simulates component mount)
    ///
    /// This creates the ComponentContext - the EXACT mirror of browser context
    /// </summary>
    public ComponentContext InitializeComponent(string componentId, string elementId)
    {
        var element = _dom.GetElementById(elementId);
        if (element == null)
        {
            // Create root element if doesn't exist
            element = new MockElement
            {
                Id = elementId,
                TagName = "div",
                Attributes = new Dictionary<string, string>
                {
                    ["data-component-id"] = componentId
                }
            };
            _dom.AddRootElement(element);
        }

        var context = new ComponentContext
        {
            ComponentId = componentId,
            Element = element,
            HintQueue = new HintQueue(),
            DOMPatcher = new DOMPatcher(_dom),
            SignalR = _signalR
        };

        _components[componentId] = context;
        _signalR.RegisterComponent(componentId, context);

        Console.WriteLine($"[MockClient] Initialized component {componentId}");
        return context;
    }

    /// <summary>
    /// Get component context by ID
    /// </summary>
    public ComponentContext? GetComponent(string componentId)
    {
        return _components.TryGetValue(componentId, out var context) ? context : null;
    }

    // ========================================
    // User Interaction Simulation
    // ========================================

    /// <summary>
    /// Simulate user click event
    /// </summary>
    public async Task SimulateClickAsync(string elementId)
    {
        var element = _dom.GetElementById(elementId);
        if (element == null)
        {
            throw new InvalidOperationException($"Element {elementId} not found");
        }

        var componentId = FindComponentId(element);
        if (componentId == null)
        {
            throw new InvalidOperationException($"No component found for element {elementId}");
        }

        Console.WriteLine($"[MockClient] Click on {elementId} → {componentId}");

        // Invoke click handler on server
        await _signalR.InvokeMethodAsync(componentId, "HandleClick", elementId);
    }

    /// <summary>
    /// Simulate mouse move event (for Minimact Punch)
    /// </summary>
    public void SimulateMouseMove(int x, int y)
    {
        // Trigger mouse trajectory tracking in worker
        Console.WriteLine($"[MockClient] Mouse move ({x}, {y})");
        // Worker will handle this
    }

    /// <summary>
    /// Simulate scroll event (for Minimact Punch)
    /// Updates element positions and triggers intersection checks
    /// </summary>
    public void SimulateScroll(int deltaY)
    {
        Console.WriteLine($"[MockClient] Scroll (Δy={deltaY})");

        // Update element positions
        foreach (var element in _dom.GetAllElements())
        {
            if (element.BoundingBox != null)
            {
                element.BoundingBox.Top -= deltaY;
                element.BoundingBox.Bottom -= deltaY;
            }
        }

        // Check intersection changes
        CheckIntersectionChanges();
    }

    /// <summary>
    /// Check for intersection observer changes (Minimact Punch)
    /// </summary>
    private void CheckIntersectionChanges()
    {
        // Viewport rect (simulated browser viewport)
        var viewportRect = new Rect { Top = 0, Left = 0, Right = 1920, Bottom = 1080 };

        foreach (var (componentId, context) in _components)
        {
            foreach (var (stateKey, domState) in context.DomElementStates)
            {
                var element = string.IsNullOrEmpty(domState.Selector)
                    ? context.Element
                    : _dom.QuerySelector(domState.Selector);

                if (element?.BoundingBox == null) continue;

                bool wasIntersecting = domState.IsIntersecting;
                bool isNowIntersecting = viewportRect.Intersects(element.BoundingBox);

                if (wasIntersecting != isNowIntersecting)
                {
                    domState.IsIntersecting = isNowIntersecting;
                    domState.IntersectionRatio = CalculateIntersectionRatio(viewportRect, element.BoundingBox);

                    Console.WriteLine($"[MockClient] Intersection change: {element.Id} → {isNowIntersecting}");

                    // Trigger onChange callback
                    domState.OnChange?.Invoke(domState);
                }
            }
        }
    }

    private double CalculateIntersectionRatio(Rect viewport, Rect element)
    {
        var intersection = viewport.Intersect(element);
        if (intersection == null) return 0;

        var elementArea = element.Width * element.Height;
        if (elementArea == 0) return 0;

        var intersectionArea = intersection.Width * intersection.Height;
        return intersectionArea / elementArea;
    }

    private string? FindComponentId(MockElement element)
    {
        var current = element;
        while (current != null)
        {
            if (current.Attributes.TryGetValue("data-component-id", out var id))
                return id;
            current = current.Parent;
        }
        return null;
    }

    // ========================================
    // Callbacks (from MockHub)
    // ========================================

    /// <summary>
    /// Apply patches from MockHub (in-memory callback)
    /// This is called by MockHub instead of receiving via SignalR
    /// </summary>
    public void OnApplyPatches(string componentId, List<Minimact.AspNetCore.Core.Patch> patches)
    {
        Console.WriteLine($"[MockClient] ← Received {patches.Count} patches for {componentId}");

        if (_components.TryGetValue(componentId, out var context))
        {
            // Convert Rust Bridge patches to CommandCenter patches
            var mockPatches = patches.Select(p => new Models.DOMPatch
            {
                Type = ConvertPatchType(p.Type),
                Path = p.Path?.Select(i => i.ToString()).ToArray() ?? Array.Empty<string>(),
                Key = null, // TODO: Extract from Props
                Value = p.Content,
                Index = p.Path?.LastOrDefault() ?? 0
            }).ToList();

            context.DOMPatcher.ApplyPatches(context.Element, mockPatches);
        }
    }

    /// <summary>
    /// Queue hint from MockHub (in-memory callback)
    /// This is called by MockHub instead of receiving via SignalR
    /// </summary>
    public void OnQueueHint(string componentId, string hintId, List<Minimact.AspNetCore.Core.Patch> patches, double confidence)
    {
        Console.WriteLine($"[MockClient] ← Received hint '{hintId}' for {componentId}");

        if (_components.TryGetValue(componentId, out var context))
        {
            // Convert Rust Bridge patches to CommandCenter patches
            var mockPatches = patches.Select(p => new Models.DOMPatch
            {
                Type = ConvertPatchType(p.Type),
                Path = p.Path?.Select(i => i.ToString()).ToArray() ?? Array.Empty<string>(),
                Key = null, // TODO: Extract from Props
                Value = p.Content,
                Index = p.Path?.LastOrDefault() ?? 0
            }).ToList();

            context.HintQueue.QueueHint(componentId, hintId, mockPatches, confidence);
        }
    }

    private Models.PatchType ConvertPatchType(string type)
    {
        return type switch
        {
            "SetAttribute" => Models.PatchType.SetAttribute,
            "SetText" => Models.PatchType.SetText,
            "InsertChild" => Models.PatchType.InsertChild,
            "RemoveChild" => Models.PatchType.RemoveChild,
            "ReplaceChild" => Models.PatchType.ReplaceChild,
            _ => Models.PatchType.SetAttribute
        };
    }

    // ========================================
    // Properties
    // ========================================

    public MockDOM DOM => _dom;
    public Dictionary<string, ComponentContext> Components => _components;
    public SignalRClientManager SignalR => _signalR;
}
