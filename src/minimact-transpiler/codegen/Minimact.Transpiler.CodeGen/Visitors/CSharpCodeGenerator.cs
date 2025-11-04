using System.Text;
using Minimact.Transpiler.CodeGen.Nodes;

namespace Minimact.Transpiler.CodeGen.Visitors;

/// <summary>
/// Visitor that generates C# code with template attributes
/// </summary>
public class CSharpCodeGenerator : INodeVisitor
{
    private readonly StringBuilder _output = new();
    private int _indentLevel = 0;

    public string GetOutput() => _output.ToString();

    private void WriteLine(string line = "")
    {
        if (string.IsNullOrEmpty(line))
        {
            _output.AppendLine();
        }
        else
        {
            _output.AppendLine(new string(' ', _indentLevel * 4) + line);
        }
    }

    private void Indent() => _indentLevel++;
    private void Dedent() => _indentLevel--;

    public void Visit(ComponentNode node)
    {
        WriteLine("using Minimact.AspNetCore.Core;");
        WriteLine("using Minimact.AspNetCore.Attributes;");
        WriteLine();
        WriteLine($"namespace Generated;");
        WriteLine();

        // Generate template attributes from render method
        if (node.RenderMethod != null)
        {
            node.RenderMethod.Accept(this);
        }

        WriteLine($"public class {node.ComponentName} : MinimactComponent");
        WriteLine("{");
        Indent();

        WriteLine("protected override VNode Render()");
        WriteLine("{");
        Indent();
        WriteLine("// TODO: Render implementation will be generated");
        WriteLine("return new VNode();");
        Dedent();
        WriteLine("}");

        Dedent();
        WriteLine("}");
    }

    public void Visit(RenderMethodNode node)
    {
        // Traverse all children to generate template attributes
        foreach (var child in node.Children)
        {
            child.Accept(this);
        }
    }

    public void Visit(JSXElementNode node)
    {
        // Generate template attributes for this element's attributes
        foreach (var attr in node.Attributes)
        {
            attr.Accept(this);
        }

        // Recursively visit children
        foreach (var child in node.Children)
        {
            child.Accept(this);
        }
    }

    public void Visit(TextTemplateNode node)
    {
        if (node.Bindings.Count == 0)
        {
            return; // Static text, no template needed
        }

        var pathArray = FormatPathArray(node.PathSegments);
        var bindingsArray = FormatStringArray(node.Bindings);

        WriteLine($"[TextTemplate(Path = new[] {{ {pathArray} }}, Template = \"{EscapeString(node.Template)}\", Bindings = new[] {{ {bindingsArray} }})]");
    }

    public void Visit(StaticTextNode node)
    {
        // Static text doesn't need a template attribute
    }

    public void Visit(AttributeTemplateNode node)
    {
        if (node.Bindings.Count == 0)
        {
            return; // Static attribute, no template needed
        }

        var pathArray = FormatPathArray(node.PathSegments);
        var bindingsArray = FormatStringArray(node.Bindings);

        WriteLine($"[AttributeTemplate(Path = new[] {{ {pathArray} }}, Attribute = \"{node.Attribute}\", Template = \"{EscapeString(node.Template)}\", Bindings = new[] {{ {bindingsArray} }})]");
    }

    public void Visit(LoopTemplateNode node)
    {
        var pathArray = FormatPathArray(node.PathSegments);
        var indexVar = string.IsNullOrEmpty(node.IndexVar) ? "null" : $"\"{node.IndexVar}\"";

        WriteLine($"[LoopTemplate(Path = new[] {{ {pathArray} }}, Binding = \"{node.Binding}\", ItemVar = \"{node.ItemVar}\", IndexVar = {indexVar})]");

        // Visit loop body
        if (node.Body != null)
        {
            node.Body.Accept(this);
        }
    }

    public void Visit(ConditionalTemplateNode node)
    {
        var pathArray = FormatPathArray(node.PathSegments);

        WriteLine($"[ConditionalTemplate(Path = new[] {{ {pathArray} }}, Condition = \"{node.Condition}\", Operator = \"{node.Operator}\")]");

        // Visit branches
        if (node.Consequent != null)
        {
            node.Consequent.Accept(this);
        }

        if (node.Alternate != null)
        {
            node.Alternate.Accept(this);
        }
    }

    /// <summary>
    /// Format path segments array for C#
    /// Example: ["10000000", "20000000"] → "\"10000000\", \"20000000\""
    /// </summary>
    private string FormatPathArray(List<string>? segments)
    {
        if (segments == null || segments.Count == 0)
        {
            return string.Empty;
        }

        return string.Join(", ", segments.Select(s => $"\"{s}\""));
    }

    /// <summary>
    /// Format string array for C#
    /// Example: ["count", "user.name"] → "\"count\", \"user.name\""
    /// </summary>
    private string FormatStringArray(List<string> items)
    {
        return string.Join(", ", items.Select(s => $"\"{EscapeString(s)}\""));
    }

    /// <summary>
    /// Escape special characters in strings
    /// </summary>
    private string EscapeString(string input)
    {
        return input
            .Replace("\\", "\\\\")
            .Replace("\"", "\\\"")
            .Replace("\n", "\\n")
            .Replace("\r", "\\r")
            .Replace("\t", "\\t");
    }
}
