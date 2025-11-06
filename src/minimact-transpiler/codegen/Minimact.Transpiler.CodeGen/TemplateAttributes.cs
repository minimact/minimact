using System;

namespace Minimact.Transpiler.CodeGen;

/// <summary>
/// Attribute for marking complex template metadata on components
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = true)]
public class ComplexTemplateAttribute : Attribute
{
    public string[] Path { get; set; } = Array.Empty<string>();
    public string Template { get; set; } = string.Empty;
    public string[] Bindings { get; set; } = Array.Empty<string>();
}
