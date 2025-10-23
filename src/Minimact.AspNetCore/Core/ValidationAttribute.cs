namespace Minimact.AspNetCore.Core;

/// <summary>
/// Marks a field as a validation field
/// </summary>
[AttributeUsage(AttributeTargets.Field | AttributeTargets.Property, AllowMultiple = false)]
public class ValidationAttribute : Attribute
{
}
