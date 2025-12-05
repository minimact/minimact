namespace Reluxer.Attributes;

/// <summary>
/// Injects return values from other visitor methods.
/// Use nameof() for compile-time safety.
///
/// Examples:
///   // Get last result from a specific visitor
///   [Inject(nameof(VisitFunction))] FunctionInfo? function
///
///   // Get all results from a specific visitor
///   [Inject(nameof(VisitFunction), All = true)] List&lt;FunctionInfo&gt; functions
///
///   // Get last result of this type from any visitor
///   [Inject] FunctionInfo? lastFunction
/// </summary>
[AttributeUsage(AttributeTargets.Parameter)]
public class InjectAttribute : Attribute
{
    /// <summary>
    /// The name of the visitor method to get results from.
    /// Use nameof() for type safety. If null, gets from any visitor.
    /// </summary>
    public string? VisitorName { get; }

    /// <summary>
    /// If true, injects all results as a List&lt;T&gt;. If false, injects the last result.
    /// </summary>
    public bool All { get; set; }

    /// <summary>
    /// Inject the last result of the parameter type from any visitor.
    /// </summary>
    public InjectAttribute()
    {
        VisitorName = null;
    }

    /// <summary>
    /// Inject result(s) from a specific visitor method.
    /// </summary>
    /// <param name="visitorName">Use nameof(VisitorMethod) for type safety</param>
    public InjectAttribute(string visitorName)
    {
        VisitorName = visitorName;
    }
}
