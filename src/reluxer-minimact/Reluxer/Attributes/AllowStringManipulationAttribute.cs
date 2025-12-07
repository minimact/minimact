namespace Reluxer.Attributes;

/// <summary>
/// Marks a generator method as intentionally using string manipulation.
///
/// This attribute suppresses REL010-REL013 diagnostics for methods that
/// legitimately need to do string processing (e.g., escaping output strings,
/// formatting indentation, etc.).
///
/// This should be used sparingly. If you find yourself using this frequently,
/// consider refactoring to store tokens in ComponentModel instead.
/// </summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public sealed class AllowStringManipulationAttribute : Attribute
{
    /// <summary>
    /// Optional reason for allowing string manipulation.
    /// </summary>
    public string? Reason { get; set; }

    public AllowStringManipulationAttribute() { }

    public AllowStringManipulationAttribute(string reason)
    {
        Reason = reason;
    }
}
