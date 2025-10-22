namespace Minimact.Runtime.Core;

/// <summary>
/// Marks a field as containing markdown content that should be parsed to HTML.
/// Used in conjunction with [State] attribute.
/// </summary>
[AttributeUsage(AttributeTargets.Field | AttributeTargets.Property, AllowMultiple = false)]
public class MarkdownAttribute : Attribute
{
}
