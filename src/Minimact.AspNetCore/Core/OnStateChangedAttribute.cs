namespace Minimact.AspNetCore.Core;

/// <summary>
/// Marks a method to be called when a specific state variable changes
/// Used with useEffect() hook in JSX/TSX
/// </summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
public class OnStateChangedAttribute : Attribute
{
    /// <summary>
    /// The name of the state field that this method watches
    /// </summary>
    public string StateKey { get; }

    public OnStateChangedAttribute(string stateKey)
    {
        StateKey = stateKey;
    }
}
