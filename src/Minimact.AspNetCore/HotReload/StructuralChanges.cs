namespace Minimact.AspNetCore.HotReload;

/// <summary>
/// Structural changes detected by Babel transpiler
/// Generated from .structural-changes.json files
/// </summary>
public class StructuralChanges
{
    public string ComponentName { get; set; } = "";
    public DateTime Timestamp { get; set; }
    public string SourceFile { get; set; } = "";
    public List<StructuralChange> Changes { get; set; } = new();
}

/// <summary>
/// Individual structural change (insert or delete)
/// </summary>
public class StructuralChange
{
    public string Type { get; set; } = ""; // "insert" or "delete"
    public string Path { get; set; } = "";
    public VNodeRepresentation? VNode { get; set; } // Only for insertions
}

/// <summary>
/// VNode representation from Babel
/// Simplified VNode structure for hot reload
/// </summary>
public class VNodeRepresentation
{
    public string Type { get; set; } = ""; // "element" or "text"
    public string Tag { get; set; } = "";
    public string Path { get; set; } = "";
    public Dictionary<string, string> Attributes { get; set; } = new();
    public List<VNodeRepresentation> Children { get; set; } = new();
    public string? Value { get; set; } // For text nodes
}
