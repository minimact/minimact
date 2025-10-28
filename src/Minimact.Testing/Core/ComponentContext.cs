namespace Minimact.Testing.Core;

/// <summary>
/// Component execution context - EXACT mirror of browser ComponentContext
/// CRITICAL: Must be byte-for-byte identical to TypeScript version!
///
/// This is NOT similar - it's IDENTICAL. Any divergence breaks test validity.
/// </summary>
public class ComponentContext
{
    public string ComponentId { get; set; } = string.Empty;
    public MockElement Element { get; set; } = null!;

    // Hook state storage (mirrors browser exactly)
    public Dictionary<string, object> State { get; set; } = new();
    public List<Effect> Effects { get; set; } = new();
    public Dictionary<string, Ref> Refs { get; set; } = new();
    public Dictionary<string, DomElementState> DomElementStates { get; set; } = new();

    // Minimact runtime references
    public HintQueue HintQueue { get; set; } = null!;
    public DOMPatcher DOMPatcher { get; set; } = null!;
    public SignalRClientManager SignalR { get; set; } = null!;
    public PlaygroundBridge? PlaygroundBridge { get; set; }
}

/// <summary>
/// Effect hook data (from useEffect)
/// </summary>
public class Effect
{
    public Action Callback { get; set; } = null!;
    public object[]? Dependencies { get; set; }
    public Action? Cleanup { get; set; }
    public bool HasRun { get; set; }
}

/// <summary>
/// Ref hook data (from useRef)
/// </summary>
public class Ref
{
    public object? Current { get; set; }
}

/// <summary>
/// DOM element state (from useDomElementState - Minimact Punch)
/// </summary>
public class DomElementState
{
    public string? Selector { get; set; }
    public bool IsIntersecting { get; set; }
    public double IntersectionRatio { get; set; }
    public int ChildrenCount { get; set; }
    public int GrandChildrenCount { get; set; }
    public Dictionary<string, string> Attributes { get; set; } = new();
    public List<string> ClassList { get; set; } = new();
    public bool Exists { get; set; }
    public int Count { get; set; }

    public Action<DomElementState>? OnChange { get; set; }
}

/// <summary>
/// Playground bridge for metrics/debugging (optional)
/// </summary>
public class PlaygroundBridge
{
    public void CacheHit(CacheHitData data)
    {
        Console.WriteLine($"[Playground] 🟢 Cache Hit: {data.HintId} ({data.Latency:F2}ms, {data.PatchCount} patches)");
    }

    public void CacheMiss(CacheMissData data)
    {
        Console.WriteLine($"[Playground] 🔴 Cache Miss: {data.MethodName} ({data.Latency:F2}ms)");
    }
}

public class CacheHitData
{
    public string ComponentId { get; set; } = string.Empty;
    public string HintId { get; set; } = string.Empty;
    public double Latency { get; set; }
    public double Confidence { get; set; }
    public int PatchCount { get; set; }
}

public class CacheMissData
{
    public string ComponentId { get; set; } = string.Empty;
    public string MethodName { get; set; } = string.Empty;
    public double Latency { get; set; }
    public int PatchCount { get; set; }
}
