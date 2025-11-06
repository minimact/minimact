using System.Text;
using Minimact.Transpiler.CodeGen.Nodes;
using Minimact.Transpiler.CodeGen.Generators;
using Minimact.Transpiler.CodeGen.Converters;

namespace Minimact.Transpiler.CodeGen.Visitors;

/// <summary>
/// Visitor that generates C# code with template attributes
/// </summary>
public class CSharpCodeGenerator : INodeVisitor
{
    private readonly StringBuilder _output = new();
    private int _indentLevel = 0;
    private readonly VNodeTreeGenerator _vnodeGenerator;
    private readonly EventHandlerBodyGenerator _handlerGenerator;
    private readonly ExpressionConverter _expressionConverter;

    private ComponentNode? _currentComponent;

    public CSharpCodeGenerator()
    {
        _expressionConverter = new ExpressionConverter();
        _vnodeGenerator = new VNodeTreeGenerator(_expressionConverter);
        _handlerGenerator = new EventHandlerBodyGenerator(_expressionConverter);
    }

    public string GetOutput() => _output.ToString();

    /// <summary>
    /// Get the generated code (alias for GetOutput for compatibility)
    /// </summary>
    public string GetGeneratedCode() => GetOutput();

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
        // Generate using statements
        WriteLine("using System;");
        WriteLine("using Minimact.AspNetCore.Core;");
        WriteLine("using Minimact.AspNetCore.Extensions;");
        WriteLine("using Minimact.Transpiler.CodeGen;");
        WriteLine("using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;");
        WriteLine("using System.Collections.Generic;");
        WriteLine("using System.Linq;");
        WriteLine("using System.Threading.Tasks;");
        WriteLine();
        WriteLine("namespace Minimact.Components;");
        WriteLine();

        // Generate template attributes from render method
        if (node.RenderMethod != null)
        {
            node.RenderMethod.Accept(this);
        }

        // Component class declaration
        WriteLine("[Component]");

        // Use base class if specified, otherwise inherit directly from MinimactComponent
        var baseClass = !string.IsNullOrEmpty(node.BaseClass) ? node.BaseClass : "MinimactComponent";
        WriteLine($"public partial class {node.ComponentName} : {baseClass}");
        WriteLine("{");
        Indent();

        // Generate useState fields
        if (node.Hooks?.UseState != null)
        {
            foreach (var state in node.Hooks.UseState)
            {
                WriteLine("[State]");
                WriteLine($"private {state.Type} {state.StateVar} = {state.InitialValue};");
                WriteLine();
            }
        }

        // Generate useMvcState properties (read-only)
        if (node.Hooks?.UseMvcState != null)
        {
            foreach (var mvcState in node.Hooks.UseMvcState)
            {
                if (mvcState.StateVar != null)
                {
                    WriteLine($"// MVC State property: {mvcState.PropertyName}");
                    WriteLine($"private {mvcState.Type} {mvcState.StateVar} => GetState<{mvcState.Type}>(\"{mvcState.MvcKey}\");");
                    WriteLine();
                }
            }
        }

        // Generate useMvcViewModel field
        if (node.Hooks?.UseMvcViewModel != null)
        {
            WriteLine("// useMvcViewModel - read-only access to entire ViewModel");
            WriteLine($"private dynamic {node.Hooks.UseMvcViewModel.Name} = null;");
            WriteLine();
        }

        // Generate Render() method
        WriteLine("protected override VNode Render()");
        WriteLine("{");
        Indent();
        WriteLine("StateManager.SyncMembersToState(this);");
        WriteLine();

        // Generate local variable declarations for MVC state (for Render method scope)
        if (node.Hooks?.UseMvcState != null)
        {
            foreach (var mvcState in node.Hooks.UseMvcState)
            {
                if (mvcState.StateVar != null)
                {
                    WriteLine($"var {mvcState.StateVar} = GetState<{mvcState.Type}>(\"{mvcState.MvcKey}\");");
                }
            }
            WriteLine();
        }

        // Generate VNode tree using VNodeTreeGenerator
        if (node.RenderMethod != null)
        {
            var vnodeCode = _vnodeGenerator.Generate(node.RenderMethod);
            WriteLine($"return {vnodeCode};");
        }
        else
        {
            WriteLine("return new VNode();");
        }
        Dedent();
        WriteLine("}");
        WriteLine();

        // Generate event handler methods
        if (node.EventHandlers != null && node.EventHandlers.Count > 0)
        {
            foreach (var handler in node.EventHandlers)
            {
                GenerateEventHandler(handler);
            }
        }

        // Generate setter methods for useMvcState (mutable ones)
        if (node.Hooks?.UseMvcState != null)
        {
            foreach (var mvcState in node.Hooks.UseMvcState)
            {
                if (!mvcState.ReadOnly && mvcState.Setter != null && mvcState.StateVar != null)
                {
                    WriteLine($"private void {mvcState.Setter}({mvcState.Type} value)");
                    WriteLine("{");
                    Indent();
                    WriteLine($"SetState(\"{mvcState.MvcKey}\", value);");
                    Dedent();
                    WriteLine("}");
                    WriteLine();
                }
            }
        }

        // Generate GetTemplates() method for runtime template access
        GenerateGetTemplatesMethod(node);

        Dedent();
        WriteLine("}");
    }

    /// <summary>
    /// Generate an event handler method
    /// </summary>
    private void GenerateEventHandler(EventHandlerMetadata handler)
    {
        // Use EventHandlerBodyGenerator to generate the complete method
        var handlerCode = _handlerGenerator.GenerateEventHandlerMethod(handler, _indentLevel);

        // The generator returns the complete method with its own indentation
        // We need to write it line by line with proper indentation
        var lines = handlerCode.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        foreach (var line in lines)
        {
            // Remove the generator's indentation and use our own
            var trimmedLine = line.TrimStart();
            if (!string.IsNullOrWhiteSpace(trimmedLine))
            {
                _output.AppendLine(new string(' ', _indentLevel * 4) + trimmedLine);
            }
        }
        WriteLine();
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
        var bindingsArray = FormatBindingsArray(node.Bindings);

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
        var bindingsArray = FormatBindingsArray(node.Bindings);

        WriteLine($"[AttributeTemplate(Path = new[] {{ {pathArray} }}, Attribute = \"{node.Attribute}\", Template = \"{EscapeString(node.Template)}\", Bindings = new[] {{ {bindingsArray} }})]");
    }

    public void Visit(StaticAttributeNode node)
    {
        // Static attributes don't need template attributes in C# (no bindings)
    }

    public void Visit(DynamicAttributeNode node)
    {
        // Dynamic attributes may generate templates, but they're handled by VNodeTreeGenerator
        // Visit children for complex expressions
        if (node.Children != null)
        {
            foreach (var child in node.Children)
            {
                child.Accept(this);
            }
        }
    }

    public void Visit(EventHandlerAttributeNode node)
    {
        // Event handlers are processed separately in VNodeTreeGenerator
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

    public void Visit(ComplexTemplateNode node)
    {
        if (node.Bindings.Count == 0)
        {
            return; // No bindings, no template needed
        }

        var pathArray = FormatPathArray(node.PathSegments);
        var bindingsArray = FormatBindingsArray(node.Bindings);

        // For now, emit ComplexTemplate attribute with template and bindings
        // Expression tree will be evaluated at runtime by C#
        WriteLine($"[ComplexTemplate(Path = new[] {{ {pathArray} }}, Template = \"{EscapeString(node.Template)}\", Bindings = new[] {{ {bindingsArray} }})]");
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
    /// Format bindings array for C#
    /// Example: [{"path": "count"}] → "\"count\""
    /// </summary>
    private string FormatBindingsArray(List<BindingNode> bindings)
    {
        return string.Join(", ", bindings.Select(b => $"\"{EscapeString(b.Path)}\""));
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

    /// <summary>
    /// Generate GetTemplates() method that returns template metadata as C# objects
    /// This allows the Rust predictor to access templates at runtime without I/O
    /// </summary>
    private void GenerateGetTemplatesMethod(ComponentNode node)
    {
        WriteLine("/// <summary>");
        WriteLine("/// Get template metadata for predictive rendering");
        WriteLine("/// </summary>");
        WriteLine("public override Dictionary<string, object> GetTemplates()");
        WriteLine("{");
        Indent();
        WriteLine("return new Dictionary<string, object>");
        WriteLine("{");
        Indent();

        // Use TemplateJsonGenerator to collect templates
        var templateGen = new Minimact.Transpiler.CodeGen.Generators.TemplateJsonGenerator();
        var templateVisitor = new TemplateCollectorVisitor();

        if (node.RenderMethod != null)
        {
            node.RenderMethod.Accept(templateVisitor);
        }

        bool first = true;
        foreach (var kvp in templateVisitor.Templates)
        {
            if (!first) WriteLine(",");
            first = false;

            var path = kvp.Key;
            var template = kvp.Value;

            WriteLine($"[\"{EscapeString(path)}\"] = new");
            WriteLine("{");
            Indent();
            WriteLine($"[\"template\"] = \"{EscapeString(template.Template)}\",");
            WriteLine($"[\"bindings\"] = new List<string> {{ {string.Join(", ", template.Bindings.Select(b => $"\"{EscapeString(b)}\""))} }},");
            WriteLine($"[\"slots\"] = new List<int> {{ {string.Join(", ", template.Slots)} }},");
            WriteLine($"[\"path\"] = new List<string> {{ {string.Join(", ", template.Path.Select(p => $"\"{EscapeString(p)}\""))} }},");
            WriteLine($"[\"type\"] = \"{EscapeString(template.Type)}\"");
            Dedent();
            WriteLine("}");
        }

        if (!first) WriteLine(); // Add newline after last entry

        Dedent();
        WriteLine("};");
        Dedent();
        WriteLine("}");
        WriteLine();
    }
}

/// <summary>
/// Visitor to collect template metadata from component nodes
/// </summary>
internal class TemplateCollectorVisitor : INodeVisitor
{
    public Dictionary<string, TemplateInfo> Templates { get; } = new();

    public void Visit(ComponentNode node)
    {
        if (node.RenderMethod != null)
        {
            node.RenderMethod.Accept(this);
        }
    }

    public void Visit(RenderMethodNode node)
    {
        foreach (var child in node.Children)
        {
            child.Accept(this);
        }
    }

    public void Visit(JSXElementNode node)
    {
        foreach (var attr in node.Attributes)
        {
            attr.Accept(this);
        }
        foreach (var child in node.Children)
        {
            child.Accept(this);
        }
    }

    public void Visit(TextTemplateNode node)
    {
        if (node.Bindings?.Count > 0 && !string.IsNullOrEmpty(node.Path))
        {
            Templates[node.Path] = new TemplateInfo
            {
                Template = node.Template,
                Bindings = node.Bindings.Select(b => b.Path).ToList(),
                Slots = ExtractSlots(node.Template),
                Path = node.PathSegments ?? new List<string>(),
                Type = "dynamic"
            };
        }
    }

    public void Visit(StaticTextNode node)
    {
        if (!string.IsNullOrEmpty(node.Content) && !string.IsNullOrEmpty(node.Path))
        {
            Templates[node.Path] = new TemplateInfo
            {
                Template = node.Content,
                Bindings = new List<string>(),
                Slots = new List<int>(),
                Path = node.PathSegments ?? new List<string>(),
                Type = "static"
            };
        }
    }

    public void Visit(AttributeTemplateNode node)
    {
        if (!string.IsNullOrEmpty(node.Path))
        {
            Templates[node.Path] = new TemplateInfo
            {
                Template = node.Template,
                Bindings = node.Bindings?.Select(b => b.Path).ToList() ?? new List<string>(),
                Slots = ExtractSlots(node.Template),
                Path = node.PathSegments ?? new List<string>(),
                Type = node.Bindings?.Count > 0 ? "attribute-dynamic" : "attribute-static"
            };
        }
    }

    public void Visit(StaticAttributeNode node) { }
    public void Visit(DynamicAttributeNode node) { }
    public void Visit(EventHandlerAttributeNode node) { }
    public void Visit(LoopTemplateNode node)
    {
        if (node.Body != null)
        {
            node.Body.Accept(this);
        }
    }

    public void Visit(ConditionalTemplateNode node)
    {
        if (node.Consequent != null) node.Consequent.Accept(this);
        if (node.Alternate != null) node.Alternate.Accept(this);
    }

    public void Visit(ComplexTemplateNode node)
    {
        if (node.Bindings?.Count > 0 && !string.IsNullOrEmpty(node.Path))
        {
            Templates[node.Path] = new TemplateInfo
            {
                Template = node.Template,
                Bindings = node.Bindings.Select(b => b.Path).ToList(),
                Slots = ExtractSlots(node.Template),
                Path = node.PathSegments ?? new List<string>(),
                Type = "complex"
            };
        }
    }

    private List<int> ExtractSlots(string template)
    {
        var slots = new List<int>();
        for (int i = 0; i < 10; i++)
        {
            var pos = template.IndexOf($"{{{i}}}");
            if (pos >= 0) slots.Add(pos);
        }
        return slots;
    }
}

internal class TemplateInfo
{
    public string Template { get; set; } = "";
    public List<string> Bindings { get; set; } = new();
    public List<int> Slots { get; set; } = new();
    public List<string> Path { get; set; } = new();
    public string Type { get; set; } = "";
}
