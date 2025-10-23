namespace Minimact.AspNetCore.Core;

/// <summary>
/// Marks a class as a Minimact component
/// Required for component registration and lifecycle management
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = false)]
public class ComponentAttribute : Attribute
{
    /// <summary>
    /// Optional component name override (defaults to class name)
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Whether this component should be pre-rendered on the server
    /// </summary>
    public bool PreRender { get; set; } = true;

    /// <summary>
    /// Whether this component maintains client-side state
    /// </summary>
    public bool HasClientState { get; set; } = false;
}
