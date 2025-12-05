namespace Reluxer.Attributes;

/// <summary>
/// Marks a [TokenPattern] method as allowed to use imperative constructs.
///
/// By default, the Reluxer.Analyzers enforce that [TokenPattern] methods
/// are purely declarative (no loops, no direct token indexing, etc.).
/// This attribute opts out of those restrictions.
///
/// Use sparingly during migration or for edge cases where declarative
/// patterns cannot express the required logic.
///
/// Example:
/// <code>
/// [TokenPattern(@"\k""function"" (\i)")]
/// [AllowImperative(Reason = "Complex nested parsing not expressible in patterns")]
/// public void VisitFunction(string name)
/// {
///     // Imperative code allowed here
///     for (int i = 0; i &lt; tokens.Count; i++) { ... }
/// }
/// </code>
/// </summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public class AllowImperativeAttribute : Attribute
{
    /// <summary>
    /// Optional reason explaining why imperative code is needed.
    /// Useful for future refactoring efforts.
    /// </summary>
    public string? Reason { get; set; }

    /// <summary>
    /// If true, this is a temporary escape during migration.
    /// Analyzers may report info diagnostics for temporary escapes.
    /// </summary>
    public bool Temporary { get; set; } = false;

    /// <summary>
    /// Optional ticket/issue reference for tracking the migration.
    /// </summary>
    public string? TrackingIssue { get; set; }

    public AllowImperativeAttribute() { }

    public AllowImperativeAttribute(string reason)
    {
        Reason = reason;
    }
}
