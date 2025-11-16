namespace Minimact.AspNetCore.Core;

/// <summary>
/// Marks a class as a Minimact custom hook (child component with syntactic sugar)
/// Hooks are specialized components that participate in the Lifted State Pattern
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = false)]
public class HookAttribute : Attribute
{
    /// <summary>
    /// Optional hook name override (defaults to class name)
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Whether this hook should be pre-rendered on the server (default: true)
    /// </summary>
    public bool PreRender { get; set; } = true;
}
