namespace Minimact.AspNetCore.Core;

/// <summary>
/// Marks a field as a reference to a DOM element
/// Used with useRef() hook in JSX/TSX
/// </summary>
[AttributeUsage(AttributeTargets.Field | AttributeTargets.Property, AllowMultiple = false)]
public class RefAttribute : Attribute
{
}

/// <summary>
/// Represents a reference to a DOM element
/// </summary>
public class ElementRef
{
    /// <summary>
    /// The current DOM element (null until mounted)
    /// </summary>
    public object? Current { get; set; }
}
