using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Minimact.Transpiler.CodeGen.Nodes;

/// <summary>
/// Base class for all JSON AST nodes
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(ComponentNode), "Component")]
[JsonDerivedType(typeof(RenderMethodNode), "RenderMethod")]
[JsonDerivedType(typeof(JSXElementNode), "JSXElement")]
[JsonDerivedType(typeof(TextTemplateNode), "TextTemplate")]
[JsonDerivedType(typeof(StaticTextNode), "StaticText")]
[JsonDerivedType(typeof(AttributeTemplateNode), "AttributeTemplate")]
[JsonDerivedType(typeof(LoopTemplateNode), "LoopTemplate")]
[JsonDerivedType(typeof(ConditionalTemplateNode), "ConditionalTemplate")]
public abstract class BaseNode
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("path")]
    public string? Path { get; set; }

    [JsonPropertyName("pathSegments")]
    public List<string>? PathSegments { get; set; }

    /// <summary>
    /// Get depth in tree (number of path segments)
    /// </summary>
    public int GetDepth() => PathSegments?.Count ?? 0;

    /// <summary>
    /// Get parent path (removes last segment)
    /// </summary>
    public string? GetParentPath()
    {
        if (string.IsNullOrEmpty(Path)) return null;
        var lastDot = Path.LastIndexOf('.');
        return lastDot > 0 ? Path.Substring(0, lastDot) : null;
    }

    /// <summary>
    /// Check if this node is a descendant of another path
    /// </summary>
    public bool IsDescendantOf(string ancestorPath)
    {
        return Path?.StartsWith(ancestorPath + ".") ?? false;
    }

    /// <summary>
    /// Accept visitor (to be overridden by derived classes)
    /// </summary>
    public abstract void Accept(INodeVisitor visitor);
}

/// <summary>
/// Root component definition
/// </summary>
public class ComponentNode : BaseNode
{
    [JsonPropertyName("componentName")]
    public string ComponentName { get; set; } = string.Empty;

    [JsonPropertyName("renderMethod")]
    public RenderMethodNode? RenderMethod { get; set; }

    [JsonPropertyName("imports")]
    public Dictionary<string, string> Imports { get; set; } = new();

    public override void Accept(INodeVisitor visitor) => visitor.Visit(this);
}

/// <summary>
/// Render method container
/// </summary>
public class RenderMethodNode : BaseNode
{
    [JsonPropertyName("children")]
    public List<BaseNode> Children { get; set; } = new();

    public override void Accept(INodeVisitor visitor) => visitor.Visit(this);
}

/// <summary>
/// JSX Element (e.g., div, span, button)
/// </summary>
public class JSXElementNode : BaseNode
{
    [JsonPropertyName("tag")]
    public string Tag { get; set; } = string.Empty;

    [JsonPropertyName("isStructural")]
    public bool IsStructural { get; set; }

    [JsonPropertyName("attributes")]
    public List<AttributeTemplateNode> Attributes { get; set; } = new();

    [JsonPropertyName("children")]
    public List<BaseNode> Children { get; set; } = new();

    public override void Accept(INodeVisitor visitor) => visitor.Visit(this);
}

/// <summary>
/// Text template with dynamic bindings
/// Example: "Count: {0}" with bindings: ["count"]
/// </summary>
public class TextTemplateNode : BaseNode
{
    [JsonPropertyName("template")]
    public string Template { get; set; } = string.Empty;

    [JsonPropertyName("bindings")]
    public List<string> Bindings { get; set; } = new();

    [JsonPropertyName("slots")]
    public List<int> Slots { get; set; } = new();

    public override void Accept(INodeVisitor visitor) => visitor.Visit(this);
}

/// <summary>
/// Static text node (no bindings)
/// </summary>
public class StaticTextNode : BaseNode
{
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    public override void Accept(INodeVisitor visitor) => visitor.Visit(this);
}

/// <summary>
/// Attribute template with dynamic bindings
/// Example: className="count-{0}" with bindings: ["count"]
/// </summary>
public class AttributeTemplateNode : BaseNode
{
    [JsonPropertyName("attribute")]
    public string Attribute { get; set; } = string.Empty;

    [JsonPropertyName("template")]
    public string Template { get; set; } = string.Empty;

    [JsonPropertyName("bindings")]
    public List<string> Bindings { get; set; } = new();

    [JsonPropertyName("slots")]
    public List<int> Slots { get; set; } = new();

    [JsonPropertyName("subtype")]
    public string? Subtype { get; set; }

    public override void Accept(INodeVisitor visitor) => visitor.Visit(this);
}

/// <summary>
/// Loop template (Array.map)
/// Example: todos.map((todo, i) => <li>...</li>)
/// </summary>
public class LoopTemplateNode : BaseNode
{
    [JsonPropertyName("binding")]
    public string Binding { get; set; } = string.Empty;

    [JsonPropertyName("itemVar")]
    public string ItemVar { get; set; } = string.Empty;

    [JsonPropertyName("indexVar")]
    public string? IndexVar { get; set; }

    [JsonPropertyName("body")]
    public JSXElementNode? Body { get; set; }

    public override void Accept(INodeVisitor visitor) => visitor.Visit(this);
}

/// <summary>
/// Conditional template (ternary or logical AND)
/// Example: {isAdmin ? <AdminPanel/> : <UserPanel/>}
/// </summary>
public class ConditionalTemplateNode : BaseNode
{
    [JsonPropertyName("condition")]
    public string Condition { get; set; } = string.Empty;

    [JsonPropertyName("operator")]
    public string Operator { get; set; } = string.Empty;

    [JsonPropertyName("consequent")]
    public BaseNode? Consequent { get; set; }

    [JsonPropertyName("alternate")]
    public BaseNode? Alternate { get; set; }

    public override void Accept(INodeVisitor visitor) => visitor.Visit(this);
}
