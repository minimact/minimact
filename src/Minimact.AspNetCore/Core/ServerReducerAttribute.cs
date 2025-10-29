namespace Minimact.AspNetCore.Core;

/// <summary>
/// Marks a method as a server reducer function for useServerReducer hook
/// The reducer function takes the current state and an action, and returns the new state
/// </summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public class ServerReducerAttribute : Attribute
{
    /// <summary>
    /// Unique identifier for this reducer (auto-generated based on hook call order if not specified)
    /// </summary>
    public string ReducerId { get; }

    public ServerReducerAttribute(string reducerId)
    {
        ReducerId = reducerId;
    }
}
