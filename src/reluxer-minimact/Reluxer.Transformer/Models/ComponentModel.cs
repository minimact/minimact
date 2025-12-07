using Reluxer.Tokens;

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

    /// <summary>
    /// Effect hooks (useEffect) for hooks.json output.
    /// </summary>
    public List<EffectHook> EffectHooks { get; } = new();

    /// <summary>
    /// Ref hooks (useRef) for hooks.json output.
    /// </summary>
    public List<RefHook> RefHooks { get; } = new();

    /// <summary>
    /// Counter for assigning hook indices in order of appearance.
    /// </summary>
    public int NextHookIndex { get; set; } = 0;

    /// <summary>
    /// Element key mappings for .tsx.keys persistence.
    /// Key: "tagName:line:column", Value: hex key
    /// </summary>
    public Dictionary<string, string> ElementKeys { get; } = new();

    /// <summary>
    /// Loop templates extracted from .map() expressions.
    /// Used for [LoopTemplate] C# attribute generation.
    /// </summary>
    public List<LoopTemplateInfo> LoopTemplates { get; } = new();

    #region Special Hooks Lists

    /// <summary>
    /// Server task hooks (useServerTask).
    /// </summary>
    public List<ServerTaskModel> ServerTasks { get; } = new();

    /// <summary>
    /// Validation hooks (useValidation).
    /// </summary>
    public List<ValidationModel> Validations { get; } = new();

    /// <summary>
    /// Predict hint hooks (usePredictHint).
    /// </summary>
    public List<PredictHintModel> PredictHints { get; } = new();

    /// <summary>
    /// Publisher hooks (usePub).
    /// </summary>
    public List<PublisherModel> Publishers { get; } = new();

    /// <summary>
    /// Subscriber hooks (useSub).
    /// </summary>
    public List<SubscriberModel> Subscribers { get; } = new();

    /// <summary>
    /// SignalR hub hooks (useSignalR).
    /// </summary>
    public List<SignalRHubModel> SignalRHubs { get; } = new();

    /// <summary>
    /// Micro task hooks (useMicroTask).
    /// </summary>
    public List<MicroTaskModel> MicroTasks { get; } = new();

    /// <summary>
    /// Macro task hooks (useMacroTask).
    /// </summary>
    public List<MacroTaskModel> MacroTasks { get; } = new();

    /// <summary>
    /// Protected state hooks (useProtectedState).
    /// </summary>
    public List<ProtectedStateModel> ProtectedStates { get; } = new();

    /// <summary>
    /// Markdown hooks (useMarkdown, useRazorMarkdown).
    /// </summary>
    public List<MarkdownModel> MarkdownFields { get; } = new();

    /// <summary>
    /// Template layout hook (useTemplate).
    /// </summary>
    public TemplateLayoutModel? TemplateLayout { get; set; }

    /// <summary>
    /// Base class override (from useTemplate).
    /// </summary>
    public string BaseClass { get; set; } = "MinimactComponent";

    /// <summary>
    /// Render method name override (from useTemplate).
    /// </summary>
    public string RenderMethodName { get; set; } = "Render";

    #endregion
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
/// Generates [Timeline] attribute on component.
/// </summary>
public class TimelineModel
{
    /// <summary>
    /// Timeline name (e.g., "AnimatedCounter_Timeline")
    /// </summary>
    public string Name { get; set; } = "";

    /// <summary>
    /// Duration in milliseconds
    /// </summary>
    public int Duration { get; set; }

    /// <summary>
    /// Whether timeline repeats
    /// </summary>
    public bool Repeat { get; set; }

    /// <summary>
    /// Easing function (e.g., "ease-in-out")
    /// </summary>
    public string? Easing { get; set; }

    /// <summary>
    /// Keyframes for this timeline.
    /// Each keyframe can have multiple state values.
    /// </summary>
    public List<TimelineKeyframe> Keyframes { get; } = new();

    /// <summary>
    /// State bindings for this timeline.
    /// </summary>
    public List<TimelineStateBinding> StateBindings { get; } = new();
}

/// <summary>
/// A keyframe in a timeline.
/// Generates [TimelineKeyframe(time, "stateName", value, Label = "label")] attribute.
/// </summary>
public class TimelineKeyframe
{
    /// <summary>
    /// Time in milliseconds
    /// </summary>
    public int Time { get; set; }

    /// <summary>
    /// State name being set
    /// </summary>
    public string StateName { get; set; } = "";

    /// <summary>
    /// Value at this keyframe (as string representation)
    /// </summary>
    public string Value { get; set; } = "";

    /// <summary>
    /// Optional label for this keyframe
    /// </summary>
    public string? Label { get; set; }
}

/// <summary>
/// A state binding for a timeline.
/// Generates [TimelineStateBinding("stateName", Interpolate = bool)] attribute.
/// </summary>
public class TimelineStateBinding
{
    /// <summary>
    /// State name being bound
    /// </summary>
    public string StateName { get; set; } = "";

    /// <summary>
    /// Whether to interpolate values (true for numbers, false for strings)
    /// </summary>
    public bool Interpolate { get; set; }
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

    /// <summary>
    /// Index of this hook in the component's hook order.
    /// Used for hooks.json output.
    /// </summary>
    public int HookIndex { get; set; }

    /// <summary>
    /// Token-based initial value (replaces string InitialValue).
    /// </summary>
    public Token[]? InitialValueTokens { get; set; }
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

    /// <summary>
    /// Index of this hook in the component's hook order.
    /// </summary>
    public int HookIndex { get; set; }
}

/// <summary>
/// Represents a useEffect hook.
/// </summary>
public class EffectHook
{
    /// <summary>
    /// Index of this hook in the component's hook order.
    /// </summary>
    public int Index { get; set; }

    /// <summary>
    /// Dependency array variable names.
    /// Empty list means "run every render", null would mean "run once".
    /// </summary>
    public List<string> Dependencies { get; } = new();

    /// <summary>
    /// Whether the effect has a cleanup function (returns a function).
    /// </summary>
    public bool HasCleanup { get; set; }
}

/// <summary>
/// Represents a useRef hook.
/// </summary>
public class RefHook
{
    /// <summary>
    /// Variable name for the ref.
    /// </summary>
    public string Name { get; set; } = "";

    /// <summary>
    /// Index of this hook in the component's hook order.
    /// </summary>
    public int Index { get; set; }

    /// <summary>
    /// Initial value passed to useRef.
    /// </summary>
    public string? InitialValue { get; set; }
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

    /// <summary>
    /// Token-based body (replaces string Body).
    /// </summary>
    public Token[]? BodyTokens { get; set; }
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

    /// <summary>
    /// If true, the handler uses the event parameter (e.g., e.target.value, e.preventDefault())
    /// and needs to have 'dynamic e' in its signature.
    /// </summary>
    public bool NeedsEventParameter { get; set; }

    /// <summary>
    /// Token-based body (replaces string Body).
    /// Generator should use this instead of parsing Body string.
    /// </summary>
    public Token[]? BodyTokens { get; set; }

    /// <summary>
    /// Token-based original expression (replaces string OriginalExpression).
    /// </summary>
    public Token[]? OriginalExpressionTokens { get; set; }
}

/// <summary>
/// Represents a local variable in the component.
/// </summary>
public class LocalVariable
{
    public string Name { get; set; } = "";
    public string Expression { get; set; } = "";
    public bool IsConst { get; set; }

    /// <summary>
    /// Token-based expression (replaces string Expression).
    /// Generator should use this instead of parsing Expression string.
    /// </summary>
    public Token[]? ExpressionTokens { get; set; }
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

    /// <summary>
    /// Token-based binding expression (replaces string Binding).
    /// </summary>
    public Token[]? BindingTokens { get; set; }
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

    /// <summary>
    /// Token-based condition expression (replaces string Condition).
    /// </summary>
    public Token[]? ConditionTokens { get; set; }
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

    /// <summary>
    /// Token-based array expression (replaces string ArrayExpression).
    /// </summary>
    public Token[]? ArrayExpressionTokens { get; set; }
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

    /// <summary>
    /// Token-based binding expression (replaces string Binding).
    /// </summary>
    public Token[]? BindingTokens { get; set; }
}

#region Loop Template Models

/// <summary>
/// Represents a loop template extracted from .map() expressions.
/// Used for [LoopTemplate] C# attribute generation.
/// </summary>
public class LoopTemplateInfo
{
    /// <summary>
    /// State key that triggers this template (usually the array name).
    /// </summary>
    public string StateKey { get; set; } = "";

    /// <summary>
    /// The array expression being mapped over.
    /// </summary>
    public string ArrayBinding { get; set; } = "";

    /// <summary>
    /// The item variable name in the .map() callback.
    /// </summary>
    public string ItemVar { get; set; } = "";

    /// <summary>
    /// The index variable name in the .map() callback (optional).
    /// </summary>
    public string? IndexVar { get; set; }

    /// <summary>
    /// The key binding expression for React keys.
    /// </summary>
    public string? KeyBinding { get; set; }

    /// <summary>
    /// The item template (the JSX element inside .map()).
    /// </summary>
    public LoopItemTemplate? ItemTemplate { get; set; }
}

/// <summary>
/// Represents an item template within a loop.
/// </summary>
public class LoopItemTemplate
{
    public string Type { get; set; } = "Element";
    public string Tag { get; set; } = "";
    public Dictionary<string, LoopPropTemplate>? PropsTemplates { get; set; }
    public List<LoopItemTemplate>? ChildrenTemplates { get; set; }

    // For text nodes
    public string? Template { get; set; }
    public List<string>? Bindings { get; set; }
    public List<int>? Slots { get; set; }
}

/// <summary>
/// Represents a prop template within a loop item.
/// </summary>
public class LoopPropTemplate
{
    public string Template { get; set; } = "";
    public List<string> Bindings { get; } = new();
    public List<int> Slots { get; } = new();
    public string Type { get; set; } = "static";
    public Dictionary<string, string>? ConditionalTemplates { get; set; }
    public int? ConditionalBindingIndex { get; set; }
}

#endregion

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

#region Special Hook Models

/// <summary>
/// Represents a useServerTask hook.
/// Generates [ServerTask] attribute with async method.
/// </summary>
public class ServerTaskModel
{
    public string Name { get; set; } = "";
    public bool IsStreaming { get; set; }
    public List<ParameterInfo> Parameters { get; } = new();
    public string ReturnType { get; set; } = "Task<object>";
    public string Body { get; set; } = "";
    public string Runtime { get; set; } = "auto";
    public bool Parallel { get; set; }
    public int EstimatedChunks { get; set; } = 10;
}

/// <summary>
/// Represents a useValidation hook.
/// Generates [Validation] attribute with field validation rules.
/// </summary>
public class ValidationModel
{
    public string Name { get; set; } = "";
    public string FieldKey { get; set; } = "";
    public bool Required { get; set; }
    public int? MinLength { get; set; }
    public int? MaxLength { get; set; }
    public double? Min { get; set; }
    public double? Max { get; set; }
    public string? Pattern { get; set; }
    public string? CustomValidator { get; set; }
    public string? AsyncValidator { get; set; }
    public string Message { get; set; } = "Validation failed";
}

/// <summary>
/// Represents a usePredictHint hook.
/// Used for predictive rendering optimization.
/// </summary>
public class PredictHintModel
{
    public string HintId { get; set; } = "";
    public Dictionary<string, object> PredictedState { get; } = new();
}

/// <summary>
/// Represents a usePub hook (publisher).
/// </summary>
public class PublisherModel
{
    public string Name { get; set; } = "";
    public string Channel { get; set; } = "";
}

/// <summary>
/// Represents a useSub hook (subscriber).
/// </summary>
public class SubscriberModel
{
    public string Channel { get; set; } = "";
    public string Handler { get; set; } = "";
}

/// <summary>
/// Represents a useSignalR hook.
/// </summary>
public class SignalRHubModel
{
    public string Name { get; set; } = "";
    public string HubUrl { get; set; } = "";
    public string? OnConnected { get; set; }
    public string? OnDisconnected { get; set; }
    public string? OnReconnecting { get; set; }
    public List<SignalRHandlerInfo> Handlers { get; } = new();
    public string? ReconnectPolicy { get; set; }
}

/// <summary>
/// Represents a SignalR event handler.
/// </summary>
public class SignalRHandlerInfo
{
    public string MethodName { get; set; } = "";
    public string Handler { get; set; } = "";
    public List<ParameterInfo> Parameters { get; } = new();
}

/// <summary>
/// Represents a useMicroTask hook.
/// </summary>
public class MicroTaskModel
{
    public string Name { get; set; } = "";
    public string Callback { get; set; } = "";
}

/// <summary>
/// Represents a useMacroTask hook.
/// </summary>
public class MacroTaskModel
{
    public string Name { get; set; } = "";
    public string Callback { get; set; } = "";
    public int DelayMs { get; set; }
}

/// <summary>
/// Represents a useTemplate hook for layout inheritance.
/// </summary>
public class TemplateLayoutModel
{
    public string LayoutName { get; set; } = "";
    public Dictionary<string, object> Props { get; } = new();
}

/// <summary>
/// Represents a useProtectedState hook.
/// State that cannot be lifted to parent components.
/// </summary>
public class ProtectedStateModel
{
    public string Name { get; set; } = "";
    public string SetterName { get; set; } = "";
    public string Type { get; set; } = "object";
    public string? InitialValue { get; set; }
}

/// <summary>
/// Represents a useMarkdown hook.
/// </summary>
public class MarkdownModel
{
    public string Name { get; set; } = "";
    public string Content { get; set; } = "";
    public bool Sanitize { get; set; } = true;
    public List<string>? AllowedTags { get; set; }
}

/// <summary>
/// Common parameter info for methods.
/// </summary>
public class ParameterInfo
{
    public string Name { get; set; } = "";
    public string Type { get; set; } = "dynamic";
    public string? DefaultValue { get; set; }
}

#endregion
