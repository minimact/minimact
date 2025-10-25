# MockClient Design - Complete Browser Simulation

## Overview

MockClient simulates the **entire client-side Minimact runtime** in C#, including:
- useState hook state management
- useEffect lifecycle
- useRef references
- useDomElementState (Minimact Punch)
- HintQueue with predict hints
- DOMPatcher applying patches
- SignalR communication
- Event handling

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        MockClient                             │
│                                                                │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │  Component   │  │  HintQueue  │  │   DOMPatcher     │    │
│  │   Contexts   │  │             │  │                  │    │
│  │              │  │ • Predict   │  │ • Apply Patches  │    │
│  │ • State Map  │  │ • Match     │  │ • Update DOM     │    │
│  │ • Effects    │  │ • Cache     │  │ • Notify         │    │
│  │ • Refs       │  └─────────────┘  └──────────────────┘    │
│  │ • DomStates  │                                             │
│  └──────────────┘                                             │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────────────────────────────────────┐            │
│  │            MockDOM (Virtual DOM)             │            │
│  │                                              │            │
│  │  • Elements tree                             │            │
│  │  • Bounding boxes (for Punch)                │            │
│  │  • Event listeners                           │            │
│  └──────────────────────────────────────────────┘            │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────────────────────────────────────┐            │
│  │       SignalRClientManager                    │            │
│  │                                              │            │
│  │  • Send: InvokeMethod, UpdateState           │            │
│  │  • Receive: ApplyPatches, QueueHint          │            │
│  └──────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────┘
```

---

## Core Classes

### 1. ComponentContext (Client-Side State)

Mirrors the browser's ComponentContext **exactly**.

```csharp
/// <summary>
/// Component execution context - EXACT mirror of browser ComponentContext
/// </summary>
public class ComponentContext
{
    public string ComponentId { get; set; }
    public MockElement Element { get; set; }

    // Hook state storage
    public Dictionary<string, object> State { get; set; } = new();
    public List<Effect> Effects { get; set; } = new();
    public Dictionary<string, Ref> Refs { get; set; } = new();
    public Dictionary<string, DomElementState> DomElementStates { get; set; } = new();

    // Minimact runtime references
    public HintQueue HintQueue { get; set; }
    public DOMPatcher DOMPatcher { get; set; }
    public SignalRClientManager SignalR { get; set; }
}

/// <summary>
/// Effect hook data
/// </summary>
public class Effect
{
    public Action Callback { get; set; }
    public object[] Dependencies { get; set; }
    public Action Cleanup { get; set; }
    public bool HasRun { get; set; }
}

/// <summary>
/// Ref hook data
/// </summary>
public class Ref
{
    public object Current { get; set; }
}

/// <summary>
/// DOM element state (Minimact Punch)
/// </summary>
public class DomElementState
{
    public string Selector { get; set; }
    public bool IsIntersecting { get; set; }
    public double IntersectionRatio { get; set; }
    public int ChildrenCount { get; set; }
    public int GrandChildrenCount { get; set; }
    public Dictionary<string, string> Attributes { get; set; } = new();
    public List<string> ClassList { get; set; } = new();
    public bool Exists { get; set; }
    public int Count { get; set; }

    public Action<DomElementState> OnChange { get; set; }
}
```

### 2. useState Simulation

```csharp
/// <summary>
/// Simulate useState hook behavior
/// </summary>
public class UseStateSimulator
{
    private ComponentContext context;
    private int stateIndex = 0;

    public UseStateSimulator(ComponentContext context)
    {
        this.context = context;
    }

    public (T value, Action<T> setValue) UseState<T>(T initialValue)
    {
        var stateKey = $"state_{stateIndex++}";

        // Initialize state if first render
        if (!context.State.ContainsKey(stateKey))
        {
            context.State[stateKey] = initialValue;
        }

        var currentValue = (T)context.State[stateKey];

        // Create setState function
        Action<T> setValue = (newValue) =>
        {
            var actualValue = newValue;

            // Build state changes object
            var stateChanges = new Dictionary<string, object>
            {
                [stateKey] = actualValue
            };

            // Check hint queue FIRST (instant feedback)
            var hint = context.HintQueue.MatchHint(context.ComponentId, stateChanges);

            if (hint != null)
            {
                // 🟢 CACHE HIT! Apply patches immediately
                Console.WriteLine($"[MockClient] 🟢 CACHE HIT! Applying {hint.Patches.Count} patches instantly");
                context.DOMPatcher.ApplyPatches(context.Element, hint.Patches);
            }
            else
            {
                // 🔴 CACHE MISS
                Console.WriteLine($"[MockClient] 🔴 CACHE MISS - waiting for server");
            }

            // Update local state
            context.State[stateKey] = actualValue;

            // Sync to server (keep server state in sync!)
            _ = context.SignalR.UpdateComponentStateAsync(
                context.ComponentId,
                stateKey,
                actualValue
            );
        };

        return (currentValue, setValue);
    }
}
```

### 3. useEffect Simulation

```csharp
/// <summary>
/// Simulate useEffect hook behavior
/// </summary>
public class UseEffectSimulator
{
    private ComponentContext context;
    private int effectIndex = 0;

    public UseEffectSimulator(ComponentContext context)
    {
        this.context = context;
    }

    public void UseEffect(Action callback, object[] dependencies = null)
    {
        if (effectIndex >= context.Effects.Count)
        {
            // First time - add new effect
            context.Effects.Add(new Effect
            {
                Callback = callback,
                Dependencies = dependencies,
                HasRun = false
            });
        }

        var effect = context.Effects[effectIndex++];

        // Check if dependencies changed
        bool shouldRun = !effect.HasRun || dependencies == null || DependenciesChanged(effect.Dependencies, dependencies);

        if (shouldRun)
        {
            // Run cleanup from previous effect
            effect.Cleanup?.Invoke();

            // Run new effect
            var cleanup = callback.Invoke();
            if (cleanup is Action cleanupAction)
            {
                effect.Cleanup = cleanupAction;
            }

            effect.Dependencies = dependencies;
            effect.HasRun = true;
        }
    }

    private bool DependenciesChanged(object[] oldDeps, object[] newDeps)
    {
        if (oldDeps == null || newDeps == null) return true;
        if (oldDeps.Length != newDeps.Length) return true;

        for (int i = 0; i < oldDeps.Length; i++)
        {
            if (!Equals(oldDeps[i], newDeps[i]))
                return true;
        }

        return false;
    }
}
```

### 4. useRef Simulation

```csharp
/// <summary>
/// Simulate useRef hook behavior
/// </summary>
public class UseRefSimulator
{
    private ComponentContext context;
    private int refIndex = 0;

    public UseRefSimulator(ComponentContext context)
    {
        this.context = context;
    }

    public Ref UseRef<T>(T initialValue)
    {
        var refKey = $"ref_{refIndex++}";

        if (!context.Refs.ContainsKey(refKey))
        {
            context.Refs[refKey] = new Ref { Current = initialValue };
        }

        return context.Refs[refKey];
    }
}
```

### 5. useDomElementState Simulation (Minimact Punch)

```csharp
/// <summary>
/// Simulate useDomElementState hook behavior
/// </summary>
public class UseDomElementStateSimulator
{
    private ComponentContext context;
    private int domStateIndex = 0;

    public UseDomElementStateSimulator(ComponentContext context)
    {
        this.context = context;
    }

    public DomElementState UseDomElementState(string selector = null)
    {
        var stateKey = $"domElementState_{domStateIndex++}";

        if (!context.DomElementStates.ContainsKey(stateKey))
        {
            var domState = new DomElementState
            {
                Selector = selector
            };

            // Set up change callback
            domState.OnChange = (snapshot) =>
            {
                // Build state changes object
                var stateChanges = new Dictionary<string, object>
                {
                    [stateKey] = new
                    {
                        isIntersecting = snapshot.IsIntersecting,
                        intersectionRatio = snapshot.IntersectionRatio,
                        childrenCount = snapshot.ChildrenCount,
                        grandChildrenCount = snapshot.GrandChildrenCount,
                        attributes = snapshot.Attributes,
                        classList = snapshot.ClassList,
                        exists = snapshot.Exists,
                        count = snapshot.Count
                    }
                };

                // Check hint queue
                var hint = context.HintQueue.MatchHint(context.ComponentId, stateChanges);

                if (hint != null)
                {
                    // 🟢 CACHE HIT!
                    Console.WriteLine($"[MockClient] 🟢 DOM State change - applying {hint.Patches.Count} patches");
                    context.DOMPatcher.ApplyPatches(context.Element, hint.Patches);
                }
                else
                {
                    // 🔴 CACHE MISS
                    Console.WriteLine($"[MockClient] 🔴 DOM State change - no prediction");
                }

                // Sync to server
                _ = context.SignalR.UpdateDomElementStateAsync(
                    context.ComponentId,
                    stateKey,
                    snapshot
                );
            };

            context.DomElementStates[stateKey] = domState;
        }

        return context.DomElementStates[stateKey];
    }
}
```

### 6. HintQueue (Prediction Cache)

```csharp
/// <summary>
/// Hint queue for predictive rendering - EXACT mirror of browser HintQueue
/// </summary>
public class HintQueue
{
    private Dictionary<string, List<QueuedHint>> hints = new();

    public void QueueHint(string componentId, string hintId, List<DOMPatch> patches, double confidence = 1.0)
    {
        if (!hints.ContainsKey(componentId))
        {
            hints[componentId] = new List<QueuedHint>();
        }

        hints[componentId].Add(new QueuedHint
        {
            HintId = hintId,
            Patches = patches,
            Confidence = confidence,
            QueuedAt = DateTime.UtcNow
        });

        Console.WriteLine($"[HintQueue] Queued hint '{hintId}' for {componentId} ({patches.Count} patches, {confidence:P} confidence)");
    }

    public QueuedHint MatchHint(string componentId, Dictionary<string, object> stateChanges)
    {
        if (!hints.ContainsKey(componentId))
            return null;

        // Try to match hint based on state changes
        // For now, simple matching - could be more sophisticated
        var componentHints = hints[componentId];

        // Find best match (highest confidence)
        var bestMatch = componentHints
            .OrderByDescending(h => h.Confidence)
            .FirstOrDefault();

        if (bestMatch != null)
        {
            Console.WriteLine($"[HintQueue] ✓ Matched hint '{bestMatch.HintId}' (confidence: {bestMatch.Confidence:P})");
        }

        return bestMatch;
    }

    public void ClearHints(string componentId)
    {
        if (hints.ContainsKey(componentId))
        {
            hints[componentId].Clear();
        }
    }
}

public class QueuedHint
{
    public string HintId { get; set; }
    public List<DOMPatch> Patches { get; set; }
    public double Confidence { get; set; }
    public DateTime QueuedAt { get; set; }
}
```

### 7. DOMPatcher (Patch Application)

```csharp
/// <summary>
/// DOM patcher - applies patches to MockDOM
/// </summary>
public class DOMPatcher
{
    private MockDOM dom;

    public DOMPatcher(MockDOM dom)
    {
        this.dom = dom;
    }

    public void ApplyPatches(MockElement rootElement, List<DOMPatch> patches)
    {
        Console.WriteLine($"[DOMPatcher] Applying {patches.Count} patches");

        foreach (var patch in patches)
        {
            ApplyPatch(patch);
        }
    }

    private void ApplyPatch(DOMPatch patch)
    {
        switch (patch.Type)
        {
            case PatchType.SetAttribute:
                var element = dom.GetElementByPath(patch.Path);
                if (element != null)
                {
                    element.Attributes[patch.Key] = patch.Value?.ToString();
                    Console.WriteLine($"  • Set {patch.Key}=\"{patch.Value}\" on {element.Id}");
                }
                break;

            case PatchType.SetText:
                var textElement = dom.GetElementByPath(patch.Path);
                if (textElement != null)
                {
                    textElement.TextContent = patch.Value?.ToString();
                    Console.WriteLine($"  • Set text \"{patch.Value}\" on {textElement.Id}");
                }
                break;

            case PatchType.InsertChild:
                var parent = dom.GetElementByPath(patch.Path);
                if (parent != null)
                {
                    var newChild = CreateElementFromPatch(patch);
                    parent.Children.Insert(patch.Index, newChild);
                    newChild.Parent = parent;
                    Console.WriteLine($"  • Inserted {newChild.TagName} into {parent.Id}");
                }
                break;

            case PatchType.RemoveChild:
                var removeParent = dom.GetElementByPath(patch.Path);
                if (removeParent != null && patch.Index < removeParent.Children.Count)
                {
                    var removed = removeParent.Children[patch.Index];
                    removeParent.Children.RemoveAt(patch.Index);
                    Console.WriteLine($"  • Removed {removed.TagName} from {removeParent.Id}");
                }
                break;

            case PatchType.ReplaceChild:
                var replaceParent = dom.GetElementByPath(patch.Path);
                if (replaceParent != null && patch.Index < replaceParent.Children.Count)
                {
                    var newElement = CreateElementFromPatch(patch);
                    replaceParent.Children[patch.Index] = newElement;
                    newElement.Parent = replaceParent;
                    Console.WriteLine($"  • Replaced child at index {patch.Index} in {replaceParent.Id}");
                }
                break;
        }
    }

    private MockElement CreateElementFromPatch(DOMPatch patch)
    {
        // Create element from patch data
        return new MockElement
        {
            Id = patch.ElementId,
            TagName = patch.TagName,
            Attributes = patch.Attributes ?? new Dictionary<string, string>(),
            Children = new List<MockElement>()
        };
    }
}

public class DOMPatch
{
    public PatchType Type { get; set; }
    public string[] Path { get; set; }  // Path to element in DOM tree
    public string Key { get; set; }     // For SetAttribute
    public object Value { get; set; }   // For SetAttribute, SetText
    public int Index { get; set; }      // For InsertChild, RemoveChild, ReplaceChild

    // For creating new elements
    public string ElementId { get; set; }
    public string TagName { get; set; }
    public Dictionary<string, string> Attributes { get; set; }
}

public enum PatchType
{
    SetAttribute,
    SetText,
    InsertChild,
    RemoveChild,
    ReplaceChild
}
```

### 8. SignalRClientManager (with State Sync)

```csharp
/// <summary>
/// SignalR client manager - handles bidirectional communication
/// </summary>
public class SignalRClientManager
{
    private HubConnection connection;
    private Dictionary<string, ComponentContext> components = new();

    public async Task ConnectAsync(string hubUrl)
    {
        connection = new HubConnectionBuilder()
            .WithUrl(hubUrl)
            .WithAutomaticReconnect()
            .Build();

        // Register server -> client handlers
        connection.On<string, List<DOMPatch>>("ApplyPatches", OnApplyPatches);
        connection.On<string, string, List<DOMPatch>, double>("QueueHint", OnQueueHint);

        await connection.StartAsync();
        Console.WriteLine($"[SignalR] Connected to {hubUrl}");
    }

    public async Task DisconnectAsync()
    {
        await connection.StopAsync();
        Console.WriteLine("[SignalR] Disconnected");
    }

    // Client -> Server: Invoke component method
    public async Task InvokeMethodAsync(string componentId, string methodName, params object[] args)
    {
        Console.WriteLine($"[SignalR] → InvokeMethod({componentId}, {methodName})");
        await connection.InvokeAsync("InvokeComponentMethod", componentId, methodName, args);
    }

    // Client -> Server: Update component state (from useState)
    public async Task UpdateComponentStateAsync(string componentId, string stateKey, object value)
    {
        Console.WriteLine($"[SignalR] → UpdateComponentState({componentId}, {stateKey}, {value})");
        await connection.InvokeAsync("UpdateComponentState", componentId, stateKey, value);
    }

    // Client -> Server: Update DOM element state (from useDomElementState)
    public async Task UpdateDomElementStateAsync(string componentId, string stateKey, DomElementState snapshot)
    {
        Console.WriteLine($"[SignalR] → UpdateDomElementState({componentId}, {stateKey})");
        await connection.InvokeAsync("UpdateDomElementState", componentId, stateKey, new
        {
            isIntersecting = snapshot.IsIntersecting,
            intersectionRatio = snapshot.IntersectionRatio,
            childrenCount = snapshot.ChildrenCount,
            grandChildrenCount = snapshot.GrandChildrenCount,
            attributes = snapshot.Attributes,
            classList = snapshot.ClassList,
            exists = snapshot.Exists,
            count = snapshot.Count
        });
    }

    // Client -> Server: Request predict hint
    public async Task RequestPredictAsync(string componentId, Dictionary<string, object> stateChanges)
    {
        Console.WriteLine($"[SignalR] → RequestPredict({componentId})");
        await connection.InvokeAsync("RequestPredict", componentId, stateChanges);
    }

    // Server -> Client: Apply patches
    private void OnApplyPatches(string componentId, List<DOMPatch> patches)
    {
        Console.WriteLine($"[SignalR] ← ApplyPatches({componentId}, {patches.Count} patches)");

        if (components.TryGetValue(componentId, out var context))
        {
            context.DOMPatcher.ApplyPatches(context.Element, patches);
        }
    }

    // Server -> Client: Queue hint for predictive rendering
    private void OnQueueHint(string componentId, string hintId, List<DOMPatch> patches, double confidence)
    {
        Console.WriteLine($"[SignalR] ← QueueHint({componentId}, {hintId}, {patches.Count} patches, {confidence:P})");

        if (components.TryGetValue(componentId, out var context))
        {
            context.HintQueue.QueueHint(componentId, hintId, patches, confidence);
        }
    }

    public void RegisterComponent(string componentId, ComponentContext context)
    {
        components[componentId] = context;
    }
}
```

---

## Complete MockClient

```csharp
/// <summary>
/// MockClient - Complete browser Minimact runtime simulation
/// </summary>
public class MockClient
{
    private MockDOM dom;
    private SignalRClientManager signalR;
    private Dictionary<string, ComponentContext> components = new();

    public MockClient()
    {
        dom = new MockDOM();
        signalR = new SignalRClientManager();
    }

    public async Task ConnectAsync(string hubUrl)
    {
        await signalR.ConnectAsync(hubUrl);
    }

    public async Task DisconnectAsync()
    {
        await signalR.DisconnectAsync();
    }

    /// <summary>
    /// Initialize a component (simulates component mount)
    /// </summary>
    public ComponentContext InitializeComponent(string componentId, string elementId)
    {
        var element = dom.GetElementById(elementId);
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
            dom.AddRootElement(element);
        }

        var context = new ComponentContext
        {
            ComponentId = componentId,
            Element = element,
            HintQueue = new HintQueue(),
            DOMPatcher = new DOMPatcher(dom),
            SignalR = signalR
        };

        components[componentId] = context;
        signalR.RegisterComponent(componentId, context);

        Console.WriteLine($"[MockClient] Initialized component {componentId}");
        return context;
    }

    /// <summary>
    /// Simulate user click event
    /// </summary>
    public async Task SimulateClickAsync(string elementId)
    {
        var element = dom.GetElementById(elementId);
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
        await signalR.InvokeMethodAsync(componentId, "HandleClick", elementId);
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
    /// </summary>
    public void SimulateScroll(int deltaY)
    {
        Console.WriteLine($"[MockClient] Scroll (Δy={deltaY})");

        // Update element positions
        foreach (var element in dom.GetAllElements())
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
        var viewportRect = new Rect { Top = 0, Left = 0, Right = 1920, Bottom = 1080 };

        foreach (var (componentId, context) in components)
        {
            foreach (var (stateKey, domState) in context.DomElementStates)
            {
                var element = string.IsNullOrEmpty(domState.Selector)
                    ? context.Element
                    : dom.QuerySelector(domState.Selector);

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

    private string FindComponentId(MockElement element)
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

    public MockDOM DOM => dom;
    public Dictionary<string, ComponentContext> Components => components;
}
```

---

## Usage Example

```csharp
// Initialize MockClient
var client = new MockClient();
await client.ConnectAsync("http://localhost:5000/minimact");

// Initialize a component
var context = client.InitializeComponent("CounterComponent", "counter-root");

// Simulate useState hook in component
var useStateSim = new UseStateSimulator(context);
var (count, setCount) = useStateSim.UseState(0);

Console.WriteLine($"Initial count: {count}"); // 0

// Simulate button click that calls setCount
setCount(1);
// This will:
// 1. Check HintQueue for prediction
// 2. Apply cached patches if found (instant!)
// 3. Update local state
// 4. Sync to server via SignalR

// Wait for server response
await Task.Delay(100);

// Component should now show updated count in DOM
var counterValue = client.DOM.GetElementById("counter-value");
Console.WriteLine($"Counter value: {counterValue.TextContent}"); // "1"
```

---

## Next Steps

Want me to start implementing these classes in the actual Minimact.CommandCenter project?
