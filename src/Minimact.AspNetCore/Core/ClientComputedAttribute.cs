using System;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Marks a property as client-computed (calculated using external libraries on client-side).
/// These values are computed in the browser and synced to the server via SignalR.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field)]
public class ClientComputedAttribute : Attribute
{
    /// <summary>
    /// The key used to store and retrieve the computed value from ClientState
    /// </summary>
    public string Key { get; }

    public ClientComputedAttribute(string key)
    {
        Key = key;
    }
}
