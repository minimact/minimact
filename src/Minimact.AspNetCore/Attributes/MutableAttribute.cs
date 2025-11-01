namespace Minimact.AspNetCore.Attributes;

/// <summary>
/// Marks a ViewModel property as mutable from the client.
///
/// Properties marked with [Mutable] can be updated by client-side code
/// via state management hooks. The server will validate mutability
/// before applying updates.
///
/// Use this for UI state, form inputs, and user preferences.
/// DO NOT use for security-sensitive data (roles, permissions, pricing).
/// </summary>
/// <example>
/// public class ProductViewModel
/// {
///     // Immutable - server authority
///     public bool IsAdminRole { get; set; }
///     public decimal FactoryPrice { get; set; }
///
///     // Mutable - client can modify
///     [Mutable]
///     public int InitialQuantity { get; set; }
///
///     [Mutable]
///     public string InitialSelectedColor { get; set; }
/// }
/// </example>
[AttributeUsage(AttributeTargets.Property, AllowMultiple = false, Inherited = true)]
public class MutableAttribute : Attribute
{
    /// <summary>
    /// Optional description of why this property is mutable
    /// </summary>
    public string? Reason { get; set; }

    public MutableAttribute()
    {
    }

    public MutableAttribute(string reason)
    {
        Reason = reason;
    }
}
