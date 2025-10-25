namespace Minimact.AspNetCore.DynamicState;

/// <summary>
/// Represents a dynamic value binding
/// Functions return VALUES (not JSX), server evaluates and renders
/// </summary>
public class DynamicBinding
{
    /// <summary>
    /// Unique identifier for this binding
    /// </summary>
    public string BindingId { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// CSS selector for target element(s)
    /// </summary>
    public string Selector { get; set; } = "";

    /// <summary>
    /// Function that returns value based on state
    /// NOT JSX - just a value (string, number, boolean)
    /// </summary>
    public Func<object, object> Function { get; set; } = _ => "";

    /// <summary>
    /// Auto-tracked dependencies (e.g., ["user.isPremium", "product.price"])
    /// In real implementation, Babel transpiler extracts these
    /// </summary>
    public List<string> Dependencies { get; set; } = new();

    /// <summary>
    /// Last computed value (for memoization)
    /// </summary>
    public object? CurrentValue { get; set; }

    /// <summary>
    /// Binding type (value, attr, class, style, show, order)
    /// </summary>
    public DynamicBindingType Type { get; set; } = DynamicBindingType.Value;

    /// <summary>
    /// Additional metadata (e.g., attribute name for attr bindings)
    /// </summary>
    public Dictionary<string, string> Metadata { get; set; } = new();
}

/// <summary>
/// Type of dynamic binding
/// </summary>
public enum DynamicBindingType
{
    /// <summary>Text content binding</summary>
    Value,

    /// <summary>Attribute binding</summary>
    Attribute,

    /// <summary>Class binding</summary>
    Class,

    /// <summary>Style binding</summary>
    Style,

    /// <summary>Visibility binding</summary>
    Show,

    /// <summary>Element order binding (DOM Choreography)</summary>
    Order
}
