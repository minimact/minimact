namespace Minimact.AspNetCore.Core;

/// <summary>
/// Marks a property as a component prop (passed from parent)
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field, AllowMultiple = false)]
public class PropAttribute : Attribute
{
}
