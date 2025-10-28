namespace Minimact.Swig.Models;

/// <summary>
/// Represents a node in the component tree hierarchy
/// </summary>
public class ComponentTreeNode
{
    public string ComponentId { get; set; } = string.Empty;
    public string ComponentType { get; set; } = string.Empty;
    public Dictionary<string, object?> State { get; set; } = new();
    public List<ComponentTreeNode> Children { get; set; } = new();
}
