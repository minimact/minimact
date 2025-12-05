namespace Reluxer.Transformer.Models;

/// <summary>
/// Represents a parsed TSX/JSX component ready for C# transformation.
/// </summary>
public class ComponentModel
{
    public string Name { get; set; } = "";
    public bool IsDefault { get; set; }
    public bool IsExported { get; set; }
    public bool IsHook { get; set; }
    public List<StateField> StateFields { get; } = new();
    public List<MvcStateField> MvcStateFields { get; } = new();
    public List<PropField> Props { get; } = new();
    public List<EventHandler> EventHandlers { get; } = new();
    public List<LocalVariable> LocalVariables { get; } = new();
    public List<HelperFunction> HelperFunctions { get; } = new();
    public List<LiftedStateRead> LiftedStateReads { get; } = new();
    public bool HasMvcViewModel { get; set; }
    public HookConfigModel? HookConfig { get; set; }
    public TimelineModel? TimelineConfig { get; set; }
    public VNodeModel? RenderTree { get; set; }

    /// <summary>
    /// Templates extracted for JSON output (used by TemplateGenerator).
    /// Key is the path identifier (e.g., "1.2.1" or "1.@className").
    /// </summary>
    public Dictionary<string, TemplateInfo> Templates { get; } = new();

    /// <summary>
    /// Conditional element entries for JSON output.
    /// Key is the conditional node's HexPath.
    /// </summary>
    public Dictionary<string, ConditionalElementInfo> ConditionalElements { get; } = new();
}

/// <summary>
/// Configuration for hook parameters (_config.* pattern).
/// </summary>
public class HookConfigModel
{
    public List<HookParameter> Parameters { get; } = new();
}

/// <summary>
/// A hook parameter definition.
/// </summary>
public class HookParameter
{
    public string Name { get; set; } = "";
    public int Index { get; set; }
    public string? DefaultValue { get; set; }
}

/// <summary>
/// Timeline configuration for animations.
/// </summary>
public class TimelineModel
{
    public string Name { get; set; } = "";
    public int Duration { get; set; }
    public string Easing { get; set; } = "easeInOut";
    public List<TimelineKeyframe> Keyframes { get; } = new();
    public List<TimelineStateBinding> StateBindings { get; } = new();
}

/// <summary>
/// A keyframe in a timeline.
/// </summary>
public class TimelineKeyframe
{
    public int At { get; set; }
    public string Property { get; set; } = "";
    public string Value { get; set; } = "";
}

/// <summary>
/// A state binding for a timeline.
/// </summary>
public class TimelineStateBinding
{
    public string StateName { get; set; } = "";
    public string Property { get; set; } = "";
}

/// <summary>
/// Represents a useState hook transformed into a state field.
/// </summary>
public class StateField
{
    public string Name { get; set; } = "";
    public string SetterName { get; set; } = "";
    public string Type { get; set; } = "object";
    public string? InitialValue { get; set; }
}

/// <summary>
/// Represents a useMvcState field (MVC ViewModel binding).
/// </summary>
public class MvcStateField
{
    public string LocalName { get; set; } = "";          // e.g., "isAdmin"
    public string ViewModelKey { get; set; } = "";       // e.g., "isAdminRole"
    public string Type { get; set; } = "object";         // e.g., "bool"
    public string SetterName { get; set; } = "";         // e.g., "setIsExpanded"
}

/// <summary>
/// Represents a helper function in the component.
/// </summary>
public class HelperFunction
{
    public string Name { get; set; } = "";
    public string Body { get; set; } = "";
    public List<string> Parameters { get; } = new();
    public string ReturnType { get; set; } = "void";
}

/// <summary>
/// Represents a component prop.
/// </summary>
public class PropField
{
    public string Name { get; set; } = "";
    public string Type { get; set; } = "object";
    public string? DefaultValue { get; set; }
    public bool IsRequired { get; set; }
}

/// <summary>
/// Represents an event handler extracted from JSX.
/// </summary>
public class EventHandler
{
    public string GeneratedName { get; set; } = "";
    public string OriginalExpression { get; set; } = "";
    public string Body { get; set; } = "";
    public bool IsArrowFunction { get; set; }

    /// <summary>
    /// If handler is inside a loop, this is the loop item variable name (e.g., "todo")
    /// </summary>
    public string? LoopItemName { get; set; }
}

/// <summary>
/// Represents a local variable in the component.
/// </summary>
public class LocalVariable
{
    public string Name { get; set; } = "";
    public string Expression { get; set; } = "";
    public bool IsConst { get; set; }
}

/// <summary>
/// Represents a lifted state read from a child component.
/// Example: const counterValue = state["Counter.count"]
/// Generates: [ClientComputed("counterValue")] private dynamic counterValue => GetClientState...
/// </summary>
public class LiftedStateRead
{
    public string LocalName { get; set; } = "";      // e.g., "counterValue"
    public string StateKey { get; set; } = "";        // e.g., "Counter.count"
}

/// <summary>
/// Represents a virtual DOM node in the render tree.
/// </summary>
public abstract class VNodeModel
{
    public string HexPath { get; set; } = "";
    public VNodeModel? Parent { get; set; }
}

/// <summary>
/// Represents a VElement (HTML element).
/// </summary>
public class VElementModel : VNodeModel
{
    public string TagName { get; set; } = "";
    public Dictionary<string, AttributeValue> Attributes { get; } = new();
    public List<VNodeModel> Children { get; } = new();
    public bool IsSelfClosing { get; set; }
}

/// <summary>
/// Represents a VText node.
/// </summary>
public class VTextModel : VNodeModel
{
    public string Text { get; set; } = "";
    public bool IsDynamic { get; set; }
    public string? Binding { get; set; }
}

/// <summary>
/// Represents a VNull node (placeholder for conditional rendering).
/// </summary>
public class VNullModel : VNodeModel
{
}

/// <summary>
/// Represents a conditional node (ternary or && expression).
/// </summary>
public class VConditionalModel : VNodeModel
{
    public string Condition { get; set; } = "";
    public VNodeModel? TrueNode { get; set; }
    public VNodeModel? FalseNode { get; set; }
    public bool IsSimpleAnd { get; set; }  // For {x && <div>} style
}

/// <summary>
/// Represents a VComponentWrapper for nested components.
/// </summary>
public class VComponentWrapperModel : VNodeModel
{
    public string ComponentName { get; set; } = "";
    public string ComponentType { get; set; } = "";
    public Dictionary<string, string> InitialState { get; } = new();
}

/// <summary>
/// Represents a list rendering node (.map()).
/// </summary>
public class VListModel : VNodeModel
{
    public string ArrayExpression { get; set; } = "";
    public string ItemName { get; set; } = "";
    public string? IndexName { get; set; }
    public VNodeModel? ItemTemplate { get; set; }
}

/// <summary>
/// Represents an attribute value (can be static or dynamic).
/// </summary>
public class AttributeValue
{
    public string RawValue { get; set; } = "";
    public bool IsDynamic { get; set; }
    public string? Binding { get; set; }
    public bool IsEventHandler { get; set; }
    public string? EventHandlerRef { get; set; }
}

#region Template Models

/// <summary>
/// Template type classification for predictive patches.
/// </summary>
public enum TemplateType
{
    Static,
    Dynamic,
    Conditional,
    Transform,
    Nullable,
    AttributeStatic,
    AttributeDynamic
}

/// <summary>
/// Represents a template entry for the JSON output.
/// </summary>
public class TemplateInfo
{
    public string Template { get; set; } = "";
    public List<string> Bindings { get; } = new();
    public List<int> Slots { get; } = new();
    public List<string> Path { get; } = new();
    public TemplateType Type { get; set; } = TemplateType.Static;

    /// <summary>
    /// For conditional templates (ternary): maps "true"/"false" to template strings.
    /// </summary>
    public Dictionary<string, string>? ConditionalTemplates { get; set; }

    /// <summary>
    /// For transform templates (e.g., .toFixed(2)).
    /// </summary>
    public TransformInfo? Transform { get; set; }

    /// <summary>
    /// For nullable templates (optional chaining).
    /// </summary>
    public bool Nullable { get; set; }
}

/// <summary>
/// Represents a method transformation (e.g., toFixed, toUpperCase).
/// </summary>
public class TransformInfo
{
    public string Method { get; set; } = "";
    public List<object> Args { get; } = new();
}

/// <summary>
/// Represents a conditional element entry for the JSON output.
/// </summary>
public class ConditionalElementInfo
{
    public string Type { get; set; } = "conditional-element";
    public string ConditionExpression { get; set; } = "";
    public List<string> ConditionBindings { get; } = new();
    public bool Evaluable { get; set; } = true;
    public string Operator { get; set; } = "&&"; // "&&" or "?"
    public ConditionalBranches Branches { get; set; } = new();
}

/// <summary>
/// Represents the true/false branches of a conditional element.
/// </summary>
public class ConditionalBranches
{
    public ElementBranchInfo? TrueBranch { get; set; }
    public ElementBranchInfo? FalseBranch { get; set; }
}

/// <summary>
/// Represents an element within a conditional branch.
/// </summary>
public class ElementBranchInfo
{
    public string Type { get; set; } = "element";
    public string Tag { get; set; } = "";
    public string HexPath { get; set; } = "";
    public Dictionary<string, string> Attributes { get; } = new();
    public List<ElementBranchInfo> Children { get; } = new();

    // For text nodes
    public string? Value { get; set; }
    public string? Binding { get; set; }
}

#endregion
