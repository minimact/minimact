namespace Minimact.CommandCenter.Models;

/// <summary>
/// DOM patch operations - mirrors Minimact patch types
/// </summary>
public class DOMPatch
{
    public PatchType Type { get; set; }
    public string[] Path { get; set; } = Array.Empty<string>();  // Path to element in DOM tree
    public string? Key { get; set; }     // For SetAttribute
    public object? Value { get; set; }   // For SetAttribute, SetText
    public int Index { get; set; }      // For InsertChild, RemoveChild, ReplaceChild

    // For creating new elements
    public string? ElementId { get; set; }
    public string? TagName { get; set; }
    public Dictionary<string, string>? Attributes { get; set; }
}

public enum PatchType
{
    SetAttribute,
    SetText,
    InsertChild,
    RemoveChild,
    ReplaceChild
}
