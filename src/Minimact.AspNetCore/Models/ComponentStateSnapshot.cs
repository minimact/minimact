namespace Minimact.AspNetCore.Models;

/// <summary>
/// Snapshot of a component's complete state for DevTools inspection
/// </summary>
public class ComponentStateSnapshot
{
    public string ComponentId { get; set; } = string.Empty;
    public string ComponentName { get; set; } = string.Empty;
    public Dictionary<string, object?> State { get; set; } = new();
    public Dictionary<string, object?> Refs { get; set; } = new();
    public Dictionary<string, DomElementStateSnapshot> DomElementStates { get; set; } = new();
    public Dictionary<string, object?> QueryResults { get; set; } = new();
    public Dictionary<string, ComputedStateInfo> ComputedStates { get; set; } = new();
    public List<EffectInfo> Effects { get; set; } = new();
    public List<LoopTemplateInfo> Templates { get; set; } = new();
    public long Timestamp { get; set; }
}

/// <summary>
/// DOM element state snapshot from useDomElementState hook
/// </summary>
public class DomElementStateSnapshot
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
}

/// <summary>
/// Computed state information from useComputed hook
/// </summary>
public class ComputedStateInfo
{
    public string Key { get; set; } = string.Empty;
    public object? Value { get; set; }
    public List<string> Dependencies { get; set; } = new();
    public long? LastComputedTimestamp { get; set; }
}

/// <summary>
/// Effect information for DevTools
/// </summary>
public class EffectInfo
{
    public int Index { get; set; }
    public List<object?>? Deps { get; set; }
    public bool HasCleanup { get; set; }
}

/// <summary>
/// Loop template information from [LoopTemplate] attribute
/// </summary>
public class LoopTemplateInfo
{
    public string StateKey { get; set; } = string.Empty;
    public string ArrayBinding { get; set; } = string.Empty;
    public string ItemVar { get; set; } = string.Empty;
    public string? IndexVar { get; set; }
    public string? KeyBinding { get; set; }
    public object? ItemTemplate { get; set; }
}

/// <summary>
/// Component tree node for hierarchical view
/// </summary>
public class ComponentTreeNode
{
    public string ComponentId { get; set; } = string.Empty;
    public string ComponentName { get; set; } = string.Empty;
    public List<ComponentTreeNode> Children { get; set; } = new();
}

/// <summary>
/// Simple component info for flat list
/// </summary>
public class ComponentInfo
{
    public string ComponentId { get; set; } = string.Empty;
    public string ComponentName { get; set; } = string.Empty;
}
