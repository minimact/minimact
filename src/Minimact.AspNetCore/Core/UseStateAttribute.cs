namespace Minimact.AspNetCore.Core;

/// <summary>
/// Marks a field or property as component state (React-style naming)
/// Alias for [State] attribute to match React's useState convention
/// Changes to [UseState] fields automatically trigger re-renders
/// </summary>
[AttributeUsage(AttributeTargets.Field | AttributeTargets.Property, AllowMultiple = false)]
public class UseStateAttribute : StateAttribute
{
    public UseStateAttribute() : base()
    {
    }

    public UseStateAttribute(object initialValue) : base()
    {
        // Store initial value if needed
        // The base StateAttribute doesn't have a constructor for this,
        // but we can keep the signature for consistency with React
    }

    public UseStateAttribute(string key) : base(key)
    {
    }
}
