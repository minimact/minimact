using System.Collections.Generic;
using System.Text.Json.Serialization;
using Minimact.Transpiler.CodeGen.Visitors;

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
[JsonDerivedType(typeof(StaticAttributeNode), "StaticAttribute")]
[JsonDerivedType(typeof(DynamicAttributeNode), "DynamicAttribute")]
[JsonDerivedType(typeof(EventHandlerAttributeNode), "EventHandlerAttribute")]
[JsonDerivedType(typeof(LoopTemplateNode), "LoopTemplate")]
[JsonDerivedType(typeof(ConditionalTemplateNode), "ConditionalTemplate")]
[JsonDerivedType(typeof(ComplexTemplateNode), "ComplexTemplate")]
[JsonDerivedType(typeof(ExpressionNode), "Expression")]
[JsonDerivedType(typeof(BinaryExpressionNode), "BinaryExpression")]
[JsonDerivedType(typeof(UnaryExpressionNode), "UnaryExpression")]
[JsonDerivedType(typeof(CallExpressionNode), "CallExpression")]
[JsonDerivedType(typeof(MemberExpressionNode), "MemberExpression")]
[JsonDerivedType(typeof(ConditionalExpressionNode), "ConditionalExpression")]
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

    [JsonPropertyName("hooks")]
    public HooksMetadata? Hooks { get; set; }

    [JsonPropertyName("eventHandlers")]
    public List<EventHandlerMetadata> EventHandlers { get; set; } = new();

    public override void Accept(INodeVisitor visitor) => visitor.Visit(this);
}

/// <summary>
/// Hook metadata (useState, useMvcState, etc.)
/// </summary>
public class HooksMetadata
{
    [JsonPropertyName("useState")]
    public List<UseStateInfo> UseState { get; set; } = new();

    [JsonPropertyName("useMvcState")]
    public List<UseMvcStateInfo> UseMvcState { get; set; } = new();

    [JsonPropertyName("useMvcViewModel")]
    public UseMvcViewModelInfo? UseMvcViewModel { get; set; }

    [JsonPropertyName("useEffect")]
    public List<UseEffectInfo> UseEffect { get; set; } = new();

    [JsonPropertyName("useRef")]
    public List<UseRefInfo> UseRef { get; set; } = new();
}

public class UseStateInfo
{
    [JsonPropertyName("stateVar")]
    public string StateVar { get; set; } = string.Empty;

    [JsonPropertyName("setter")]
    public string? Setter { get; set; }

    [JsonPropertyName("initialValue")]
    public string InitialValue { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "dynamic";
}

public class UseMvcStateInfo
{
    [JsonPropertyName("stateVar")]
    public string? StateVar { get; set; }

    [JsonPropertyName("setter")]
    public string? Setter { get; set; }

    [JsonPropertyName("propertyName")]
    public string PropertyName { get; set; } = string.Empty;

    [JsonPropertyName("mvcKey")]
    public string MvcKey { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "dynamic";

    [JsonPropertyName("readOnly")]
    public bool ReadOnly { get; set; }
}

public class UseMvcViewModelInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

public class UseEffectInfo
{
    [JsonPropertyName("hasCallback")]
    public bool HasCallback { get; set; }

    [JsonPropertyName("hasDependencies")]
    public bool HasDependencies { get; set; }
}

public class UseRefInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("initialValue")]
    public string InitialValue { get; set; } = string.Empty;
}

/// <summary>
/// Event handler metadata
/// </summary>
public class EventHandlerMetadata
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("body")]
    public object? Body { get; set; } // AST node (dynamic)

    [JsonPropertyName("params")]
    public List<object>? Params { get; set; }

    [JsonPropertyName("capturedParams")]
    public List<string> CapturedParams { get; set; } = new();

    [JsonPropertyName("isAsync")]
    public bool IsAsync { get; set; }
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
    public List<BaseNode> Attributes { get; set; } = new();

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
    public List<BindingNode> Bindings { get; set; } = new();

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
    public List<BindingNode> Bindings { get; set; } = new();

    [JsonPropertyName("slots")]
    public List<int> Slots { get; set; } = new();

    [JsonPropertyName("subtype")]
    public string? Subtype { get; set; }

    public override void Accept(INodeVisitor visitor) => visitor.Visit(this);
}

/// <summary>
/// Static attribute node (fixed value, no bindings)
/// Example: <button style="color: red"> → name="style", value="color: red"
/// </summary>
public class StaticAttributeNode : BaseNode
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;

    public override void Accept(INodeVisitor visitor) => visitor.Visit(this);
}

/// <summary>
/// Dynamic attribute node (has bindings or expressions)
/// Example: <div className={isActive ? 'active' : ''}>
/// </summary>
public class DynamicAttributeNode : BaseNode
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public string? Value { get; set; }

    [JsonPropertyName("expressionType")]
    public string? ExpressionType { get; set; }

    [JsonPropertyName("binding")]
    public string? Binding { get; set; }

    [JsonPropertyName("bindings")]
    public List<BindingNode>? Bindings { get; set; }

    [JsonPropertyName("template")]
    public string? Template { get; set; }

    [JsonPropertyName("subtype")]
    public string? Subtype { get; set; }

    [JsonPropertyName("styleObject")]
    public StyleObjectInfo? StyleObject { get; set; }

    [JsonPropertyName("children")]
    public List<BaseNode>? Children { get; set; }

    public override void Accept(INodeVisitor visitor) => visitor.Visit(this);
}

/// <summary>
/// Style object information for style attributes
/// </summary>
public class StyleObjectInfo
{
    [JsonPropertyName("css")]
    public string? Css { get; set; }

    [JsonPropertyName("bindings")]
    public List<string>? Bindings { get; set; }

    [JsonPropertyName("slots")]
    public List<int>? Slots { get; set; }

    [JsonPropertyName("properties")]
    public List<StyleProperty>? Properties { get; set; }

    [JsonPropertyName("hasBindings")]
    public bool? HasBindings { get; set; }

    [JsonPropertyName("isStatic")]
    public bool? IsStatic { get; set; }
}

/// <summary>
/// Individual style property
/// </summary>
public class StyleProperty
{
    [JsonPropertyName("key")]
    public string? Key { get; set; }

    [JsonPropertyName("cssKey")]
    public string? CssKey { get; set; }

    [JsonPropertyName("value")]
    public string? Value { get; set; }

    [JsonPropertyName("css")]
    public string? Css { get; set; }

    [JsonPropertyName("isDynamic")]
    public bool? IsDynamic { get; set; }
}

/// <summary>
/// Event handler attribute node
/// Example: <button onClick={handleClick}>
/// </summary>
public class EventHandlerAttributeNode : BaseNode
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("handlerName")]
    public string? HandlerName { get; set; }

    [JsonPropertyName("handlerBody")]
    public object? HandlerBody { get; set; }

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

    // For template generation
    [JsonPropertyName("template")]
    public string? Template { get; set; }

    [JsonPropertyName("bindings")]
    public List<BindingNode>? Bindings { get; set; }

    [JsonPropertyName("conditionalTemplates")]
    public Dictionary<string, string>? ConditionalTemplates { get; set; }

    public override void Accept(INodeVisitor visitor) => visitor.Visit(this);
}

/// <summary>
/// Complex expression template (needs C# evaluation)
/// Example: {count * 2 + 1} → template: "{0} * 2 + 1", bindings: ["count"]
/// Example: {Math.floor(price * 1.2)} → template: "Math.floor({0} * 1.2)", bindings: ["price"]
/// </summary>
public class ComplexTemplateNode : BaseNode
{
    [JsonPropertyName("template")]
    public string Template { get; set; } = string.Empty;

    [JsonPropertyName("bindings")]
    public List<BindingNode> Bindings { get; set; } = new();

    [JsonPropertyName("expressionTree")]
    public ExpressionTreeNode? ExpressionTree { get; set; }

    public override void Accept(INodeVisitor visitor) => visitor.Visit(this);
}

/// <summary>
/// Expression node (extends ComplexTemplateNode)
/// Used when babel outputs "type": "Expression"
/// Can represent complex expressions, conditionals, loops, or other expression types
/// </summary>
public class ExpressionNode : ComplexTemplateNode
{
    // Additional properties for conditional expressions (LogicalExpression)
    [JsonPropertyName("expressionType")]
    public string? ExpressionType { get; set; }

    [JsonPropertyName("operator")]
    public string? Operator { get; set; }

    [JsonPropertyName("condition")]
    public string? Condition { get; set; }

    [JsonPropertyName("branches")]
    public List<BaseNode>? Branches { get; set; }

    [JsonPropertyName("isSimple")]
    public bool? IsSimple { get; set; }

    [JsonPropertyName("isStructural")]
    public bool? IsStructural { get; set; }

    [JsonPropertyName("isConditional")]
    public bool? IsConditional { get; set; }

    // Additional property for loop expressions (CallExpression with .map())
    [JsonPropertyName("loopTemplate")]
    public LoopTemplateInfo? LoopTemplate { get; set; }

    // Transform properties (e.g., .toFixed(2))
    [JsonPropertyName("binding")]
    public string? Binding { get; set; }  // Singular binding for transforms

    [JsonPropertyName("transform")]
    public string? Transform { get; set; }

    [JsonPropertyName("transformArgs")]
    public List<object>? TransformArgs { get; set; }

    [JsonPropertyName("isTransform")]
    public bool? IsTransform { get; set; }

    // Conditional properties (e.g., {isExpanded ? 'Hide' : 'Show'})
    [JsonPropertyName("conditionalTemplates")]
    public Dictionary<string, string>? ConditionalTemplates { get; set; }
}

/// <summary>
/// Loop template info from .map() call expression
/// </summary>
public class LoopTemplateInfo
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("arrayBinding")]
    public string ArrayBinding { get; set; } = string.Empty;

    [JsonPropertyName("itemVar")]
    public string ItemVar { get; set; } = string.Empty;

    [JsonPropertyName("indexVar")]
    public string? IndexVar { get; set; }

    [JsonPropertyName("keyBinding")]
    public string? KeyBinding { get; set; }

    [JsonPropertyName("body")]
    public JSXElementNode? Body { get; set; }
}

/// <summary>
/// Binary expression node (extends ComplexTemplateNode)
/// Used when babel outputs "type": "BinaryExpression"
/// </summary>
public class BinaryExpressionNode : ComplexTemplateNode { }

/// <summary>
/// Unary expression node (extends ComplexTemplateNode)
/// Used when babel outputs "type": "UnaryExpression"
/// </summary>
public class UnaryExpressionNode : ComplexTemplateNode { }

/// <summary>
/// Call expression node (extends ComplexTemplateNode)
/// Used when babel outputs "type": "CallExpression"
/// </summary>
public class CallExpressionNode : ComplexTemplateNode { }

/// <summary>
/// Member expression node (extends ComplexTemplateNode)
/// Used when babel outputs "type": "MemberExpression"
/// </summary>
public class MemberExpressionNode : ComplexTemplateNode { }

/// <summary>
/// Conditional expression node (extends ComplexTemplateNode)
/// Used when babel outputs "type": "ConditionalExpression"
/// </summary>
public class ConditionalExpressionNode : ComplexTemplateNode { }

/// <summary>
/// Binding reference (variable or property reference in template)
/// Example: { "type": "Identifier", "path": "count" }
/// </summary>
public class BindingNode
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("path")]
    public string Path { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string? Name { get; set; }
}

/// <summary>
/// Expression tree node for C# evaluation
/// Represents the AST of a complex expression
/// </summary>
public class ExpressionTreeNode
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("operator")]
    public string? Operator { get; set; }

    [JsonPropertyName("left")]
    public ExpressionTreeNode? Left { get; set; }

    [JsonPropertyName("right")]
    public ExpressionTreeNode? Right { get; set; }

    [JsonPropertyName("argument")]
    public ExpressionTreeNode? Argument { get; set; }

    [JsonPropertyName("test")]
    public ExpressionTreeNode? Test { get; set; }

    [JsonPropertyName("consequent")]
    public ExpressionTreeNode? Consequent { get; set; }

    [JsonPropertyName("alternate")]
    public ExpressionTreeNode? Alternate { get; set; }

    [JsonPropertyName("callee")]
    public string? Callee { get; set; }

    [JsonPropertyName("arguments")]
    public List<ExpressionTreeNode>? Arguments { get; set; }

    [JsonPropertyName("object")]
    public ExpressionTreeNode? Object { get; set; }

    [JsonPropertyName("property")]
    public ExpressionTreeNode? Property { get; set; }

    [JsonPropertyName("computed")]
    public bool? Computed { get; set; }

    [JsonPropertyName("elements")]
    public List<ExpressionTreeNode>? Elements { get; set; }

    [JsonPropertyName("properties")]
    public List<PropertyNode>? Properties { get; set; }

    [JsonPropertyName("slot")]
    public int? Slot { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("value")]
    public object? Value { get; set; }

    [JsonPropertyName("raw")]
    public string? Raw { get; set; }

    [JsonPropertyName("prefix")]
    public bool? Prefix { get; set; }
}

/// <summary>
/// Property node for object expressions
/// </summary>
public class PropertyNode
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public ExpressionTreeNode? Value { get; set; }
}
