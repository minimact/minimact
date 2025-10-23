namespace Minimact.AspNetCore.Core;

/// <summary>
/// Marks a field or property as component state
/// Changes to [State] fields automatically trigger re-renders
/// </summary>
[AttributeUsage(AttributeTargets.Field | AttributeTargets.Property, AllowMultiple = false)]
public class StateAttribute : Attribute
{
    /// <summary>
    /// Optional custom key for state serialization
    /// If not specified, uses the member name
    /// </summary>
    public string? Key { get; set; }

    /// <summary>
    /// Whether to persist this state across component re-creations
    /// </summary>
    public bool Persist { get; set; } = false;

    public StateAttribute()
    {
    }

    public StateAttribute(string key)
    {
        Key = key;
    }
}
