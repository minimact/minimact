namespace Minimact.AspNetCore.Core;

/// <summary>
/// Marks a field as containing markdown with Razor-style syntax.
/// The field must be initialized in OnInitialized() using C# string interpolation,
/// then the result is parsed as markdown to HTML.
///
/// Supports:
/// - Variable references: @variableName
/// - Property access: @variable.Property
/// - Inline expressions: @(expression)
/// - Conditionals: @if (condition) { ... } else { ... }
/// - Loops: @foreach (var item in items) { ... }
/// - For loops: @for (var i = 0; i < count; i++) { ... }
/// - Switch expressions: @switch (value) { case ...: ... }
///
/// Used in conjunction with [State] attribute.
/// </summary>
[AttributeUsage(AttributeTargets.Field | AttributeTargets.Property, AllowMultiple = false)]
public class RazorMarkdownAttribute : Attribute
{
}
