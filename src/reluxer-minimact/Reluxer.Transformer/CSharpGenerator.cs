using System.Text;
using Reluxer.Transformer.Models;

namespace Reluxer.Transformer;

/// <summary>
/// Generates C# code from parsed component models.
/// </summary>
public class CSharpGenerator
{
    private readonly TransformOptions _options;
    private readonly StringBuilder _sb = new();
    private int _indentLevel;
    private ComponentModel? _component;

    public CSharpGenerator(TransformOptions options)
    {
        _options = options;
    }

    public string Generate(List<ComponentModel> components)
    {
        _sb.Clear();
        _indentLevel = 0;

        if (_options.IncludeUsings)
        {
            WriteUsings();
            WriteLine();
        }

        // Use file-scoped namespace (C# 10+)
        WriteLine($"namespace {_options.Namespace};");
        WriteLine();

        for (int i = 0; i < components.Count; i++)
        {
            GenerateComponent(components[i]);
            if (i < components.Count - 1)
                WriteLine();
        }

        return _sb.ToString();
    }

    private void WriteUsings()
    {
        // Match proper Minimact output order
        WriteLine("using Minimact.AspNetCore.Core;");
        WriteLine("using Minimact.AspNetCore.Extensions;");
        WriteLine("using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;");
        WriteLine("using System.Collections.Generic;");
        WriteLine("using System.Linq;");
        WriteLine("using System.Threading.Tasks;");
    }

    private void GenerateComponent(ComponentModel component)
    {
        _component = component;

        // Hook classes get special treatment
        if (component.IsHook)
        {
            GenerateHookClass(component);
            return;
        }

        // Loop template attributes (before [Component])
        if (component.LoopTemplates.Count > 0)
        {
            WriteLoopTemplateAttributes(component.LoopTemplates);
        }

        // Timeline attributes (before [Component])
        if (component.TimelineConfig != null)
        {
            WriteTimelineAttributes(component.TimelineConfig);
        }

        // Server task attributes (before [Component])
        foreach (var serverTask in component.ServerTasks)
        {
            WriteServerTaskAttribute(serverTask);
        }

        // Validation attributes (before [Component])
        foreach (var validation in component.Validations)
        {
            WriteValidationAttribute(validation);
        }

        // Predict hint attributes (before [Component])
        foreach (var hint in component.PredictHints)
        {
            WriteLine($"[PredictHint(\"{hint.HintId}\")]");
        }

        // Pub/Sub channel attributes (before [Component])
        foreach (var pub in component.Publishers)
        {
            WriteLine($"[Publisher(\"{pub.Channel}\")]");
        }
        foreach (var sub in component.Subscribers)
        {
            WriteLine($"[Subscriber(\"{sub.Channel}\", nameof({sub.Handler}))]");
        }

        // SignalR hub attributes (before [Component])
        foreach (var hub in component.SignalRHubs)
        {
            WriteLine($"[SignalRHub(\"{hub.HubUrl}\")]");
        }

        // Micro/Macro task attributes (before [Component])
        foreach (var micro in component.MicroTasks)
        {
            WriteLine($"[MicroTask(nameof({micro.Callback}))]");
        }
        foreach (var macro in component.MacroTasks)
        {
            WriteLine($"[MacroTask(nameof({macro.Callback}), {macro.DelayMs})]");
        }

        // Protected state attributes
        foreach (var ps in component.ProtectedStates)
        {
            WriteLine($"[ProtectedState(\"{ps.Name}\")]");
        }

        // Markdown attributes
        foreach (var md in component.MarkdownFields)
        {
            var sanitize = md.Sanitize ? "true" : "false";
            WriteLine($"[Markdown(\"{md.Name}\", Sanitize = {sanitize})]");
        }

        WriteLine("[Component]");
        var partial = _options.GeneratePartialClasses ? "partial " : "";
        WriteLine($"public {partial}class {component.Name} : {component.BaseClass}");
        WriteLine("{");
        _indentLevel++;

        // Props (component parameters)
        foreach (var prop in component.Props)
        {
            WriteLine("[Prop]");
            // Use the inferred type if available, otherwise default to dynamic
            var csharpType = prop.Type ?? "dynamic";
            if (prop.DefaultValue != null)
            {
                var defaultVal = ConvertInitialValue(prop.DefaultValue, prop.Type);
                WriteLine($"public {csharpType} {prop.Name} {{ get; set; }} = {defaultVal};");
            }
            else
            {
                WriteLine($"public {csharpType} {prop.Name} {{ get; set; }}");
            }
            WriteLine();
        }

        // State fields (regular useState)
        foreach (var state in component.StateFields)
        {
            WriteLine("[State]");
            var csharpType = ConvertTypeToCSharp(state.Type);
            var initialValue = ConvertInitialValue(state.InitialValue, state.Type);
            WriteLine($"private {csharpType} {state.Name} = {initialValue};");
            WriteLine();
        }

        // MVC State properties (useMvcState)
        foreach (var mvcState in component.MvcStateFields)
        {
            WriteLine($"// MVC State property: {mvcState.ViewModelKey}");
            WriteLine($"private {mvcState.Type} {mvcState.LocalName} => GetState<{mvcState.Type}>(\"{mvcState.ViewModelKey}\");");
            WriteLine();
        }

        // Client-computed properties (lifted state reads, external libraries)
        if (component.LiftedStateReads.Count > 0)
        {
            WriteLine("// Client-computed properties (external libraries)");
            foreach (var liftedState in component.LiftedStateReads)
            {
                WriteLine($"[ClientComputed(\"{liftedState.LocalName}\")]");
                WriteLine($"private dynamic {liftedState.LocalName} => GetClientState<dynamic>(\"{liftedState.LocalName}\", default);");
                WriteLine();
            }
        }

        // viewModel field (useMvcViewModel)
        if (component.HasMvcViewModel)
        {
            WriteLine("// useMvcViewModel - read-only access to entire ViewModel");
            WriteLine("private dynamic viewModel = null;");
            WriteLine();
        }

        // Render method (may be RenderContent() for templated components)
        WriteLine($"protected override VNode {component.RenderMethodName}()");
        WriteLine("{");
        _indentLevel++;

        WriteLine("StateManager.SyncMembersToState(this);");
        WriteLine();

        // MVC State local variables
        if (component.MvcStateFields.Count > 0)
        {
            WriteLine("// MVC State - read from State dictionary");
            foreach (var mvcState in component.MvcStateFields)
            {
                WriteLine($"var {mvcState.LocalName} = GetState<{mvcState.Type}>(\"{mvcState.ViewModelKey}\");");
            }
            WriteLine();
        }

        // Local variables
        foreach (var local in component.LocalVariables)
        {
            var keyword = local.IsConst ? "var" : "var";
            WriteLine($"{keyword} {local.Name} = {ConvertExpression(local.Expression)};");
        }

        if (component.LocalVariables.Count > 0)
            WriteLine();

        // Render tree
        if (component.RenderTree != null)
        {
            WriteIndent();
            Write("return ");
            GenerateVNode(component.RenderTree, isReturn: true);
            _sb.AppendLine(";");
        }
        else
        {
            WriteLine("return new VNull(\"1\");");
        }

        _indentLevel--;
        WriteLine("}");

        // Helper functions (handleQuantityChange, handleAddToCart, etc.)
        foreach (var helper in component.HelperFunctions)
        {
            WriteLine();
            GenerateHelperFunction(helper);
        }

        // Event handlers
        foreach (var handler in component.EventHandlers)
        {
            WriteLine();
            GenerateEventHandler(handler);
        }

        // GetClientHandlers() - returns JS handlers for client-side execution
        if (component.EventHandlers.Count > 0)
        {
            WriteLine();
            GenerateGetClientHandlers(component);
        }

        // MVC State setter methods
        var mutableMvcStates = component.MvcStateFields.Where(m => !string.IsNullOrEmpty(m.SetterName)).ToList();
        foreach (var mvcState in mutableMvcStates)
        {
            WriteLine();
            GenerateMvcStateSetter(mvcState);
        }

        _indentLevel--;
        WriteLine("}");
    }

    /// <summary>
    /// Generates a [Hook] class from a custom hook function (useXxx).
    /// Hook classes have:
    /// - [Hook] attribute instead of [Component]
    /// - _config.* properties for hook parameters
    /// - State fields for internal state
    /// - State setters for state mutation
    /// - Hook methods (increment, decrement, etc.)
    /// - Optional UI rendering via "ui" variable
    /// </summary>
    private void GenerateHookClass(ComponentModel hook)
    {
        // Convert useCounter -> UseCounterHook
        var className = char.ToUpper(hook.Name[0]) + hook.Name.Substring(1) + "Hook";

        WriteLine("// ============================================================");
        WriteLine($"// HOOK CLASS - Generated from {hook.Name}");
        WriteLine("// ============================================================");
        WriteLine("[Hook]");
        var partial = _options.GeneratePartialClasses ? "partial " : "";
        WriteLine($"public {partial}class {className} : MinimactComponent");
        WriteLine("{");
        _indentLevel++;

        // Configuration properties (from hook parameters)
        if (hook.HookConfig?.Parameters.Count > 0)
        {
            WriteLine("// Configuration (from hook arguments)");
            foreach (var param in hook.HookConfig.Parameters)
            {
                var safeName = EscapeCSharpKeyword(param.Name);
                WriteLine($"private dynamic {safeName} => GetState<dynamic>(\"_config.{param.Name}\");");
            }
            WriteLine();
        }

        // Hook state fields
        if (hook.StateFields.Count > 0)
        {
            WriteLine("// Hook state");
            foreach (var state in hook.StateFields)
            {
                WriteLine("[State]");
                var initialValue = state.InitialValue ?? "null";
                // Check if initial value references a config parameter
                if (hook.HookConfig?.Parameters.Any(p => p.Name == initialValue) == true)
                {
                    WriteLine($"private dynamic {state.Name} = {initialValue};");
                }
                else
                {
                    var csharpType = ConvertTypeToCSharp(state.Type);
                    var convertedInitial = ConvertInitialValue(state.InitialValue, state.Type);
                    WriteLine($"private {csharpType} {state.Name} = {convertedInitial};");
                }
            }
            WriteLine();
        }

        // State setters
        if (hook.StateFields.Count > 0)
        {
            WriteLine("// State setters");
            foreach (var state in hook.StateFields)
            {
                WriteLine($"private void {state.SetterName}(dynamic value)");
                WriteLine("{");
                _indentLevel++;
                WriteLine($"SetState(nameof({state.Name}), value);");
                _indentLevel--;
                WriteLine("}");
                WriteLine();
            }
        }

        // Hook methods (increment, decrement, reset, etc.)
        if (hook.HelperFunctions.Count > 0)
        {
            WriteLine("// Hook methods");
            foreach (var helper in hook.HelperFunctions)
            {
                GenerateHookMethod(helper, hook);
            }
        }

        // Render method (for "ui" variable)
        if (hook.RenderTree != null)
        {
            WriteLine("// Hook UI rendering");
            WriteLine("protected override VNode Render()");
            WriteLine("{");
            _indentLevel++;

            WriteLine("StateManager.SyncMembersToState(this);");
            WriteLine();

            WriteIndent();
            Write("return ");
            GenerateVNode(hook.RenderTree, isReturn: true);
            _sb.AppendLine(";");

            _indentLevel--;
            WriteLine("}");
        }

        _indentLevel--;
        WriteLine("}");
    }

    /// <summary>
    /// Generates a hook method (like increment, decrement, reset).
    /// These are simpler than component event handlers.
    /// </summary>
    private void GenerateHookMethod(HelperFunction helper, ComponentModel hook)
    {
        var paramList = helper.Parameters.Count > 0
            ? string.Join(", ", helper.Parameters.Select(p => $"dynamic {p}"))
            : "";

        WriteLine($"private void {helper.Name}({paramList})");
        WriteLine("{");
        _indentLevel++;

        var body = ConvertHookMethodBody(helper.Body, hook);
        foreach (var line in body.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            WriteLine(line.Trim());
        }

        _indentLevel--;
        WriteLine("}");
        WriteLine();
    }

    /// <summary>
    /// Converts a hook method body, handling setter calls.
    /// </summary>
    private string ConvertHookMethodBody(string body, ComponentModel hook)
    {
        if (string.IsNullOrWhiteSpace(body)) return "";

        var result = body.Trim();

        // Remove outer braces if present
        if (result.StartsWith("{") && result.EndsWith("}"))
            result = result[1..^1].Trim();

        // Convert setXxx(value) to setXxx((value)) - wrap in parentheses
        // This handles expressions like setCount(count + 1)
        foreach (var state in hook.StateFields)
        {
            var pattern = new System.Text.RegularExpressions.Regex(
                $@"{state.SetterName}\s*\(\s*([^)]+)\s*\)");
            result = pattern.Replace(result, match =>
            {
                var value = match.Groups[1].Value.Trim();
                return $"{state.SetterName}(({value}))";
            });
        }

        // Apply general expression conversion
        result = ConvertExpression(result);

        // Ensure statements end with semicolons
        if (!string.IsNullOrEmpty(result) && !result.EndsWith(";") && !result.EndsWith("}"))
        {
            result += ";";
        }

        return result;
    }

    private void GenerateHelperFunction(HelperFunction helper)
    {
        var paramList = helper.Parameters.Count > 0
            ? string.Join(", ", helper.Parameters.Select(p => $"dynamic {p}"))
            : "";

        WriteLine($"public void {helper.Name}({paramList})");
        WriteLine("{");
        _indentLevel++;

        var body = ConvertHelperBody(helper.Body);
        foreach (var line in body.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            WriteLine(line.Trim());
        }

        _indentLevel--;
        WriteLine("}");
    }

    private void GenerateMvcStateSetter(MvcStateField mvcState)
    {
        WriteLine($"private void {mvcState.SetterName}({mvcState.Type} value)");
        WriteLine("{");
        _indentLevel++;
        WriteLine($"SetState(\"{mvcState.ViewModelKey}\", value);");
        _indentLevel--;
        WriteLine("}");
    }

    private string ConvertHelperBody(string body)
    {
        if (string.IsNullOrWhiteSpace(body)) return "";

        var result = body.Trim();

        // Remove outer braces if present
        if (result.StartsWith("{") && result.EndsWith("}"))
            result = result[1..^1].Trim();

        // Convert alert() to Console.WriteLine()
        result = result.Replace("alert(", "Console.WriteLine(");

        // Apply ConvertExpression transformations
        result = ConvertExpression(result);

        // Convert const/let to var (C# doesn't have const for local variables in this context)
        result = System.Text.RegularExpressions.Regex.Replace(result, @"^const\s*", "var ");
        result = System.Text.RegularExpressions.Regex.Replace(result, @";const\s*", "; var ");
        result = System.Text.RegularExpressions.Regex.Replace(result, @"^let\s*", "var ");
        result = System.Text.RegularExpressions.Regex.Replace(result, @";let\s*", "; var ");

        // Fix spacing: add space after keywords when followed by identifier
        result = System.Text.RegularExpressions.Regex.Replace(result, @"const([a-zA-Z])", "var $1");
        result = System.Text.RegularExpressions.Regex.Replace(result, @"let([a-zA-Z])", "var $1");
        result = System.Text.RegularExpressions.Regex.Replace(result, @"return([a-zA-Z])", "return $1");

        // Fix spacing: add space around = (but not == or ===)
        result = System.Text.RegularExpressions.Regex.Replace(
            result,
            @"(?<![=!<>])=(?![=])",
            " = ");

        // Fix spacing: add space after commas
        result = System.Text.RegularExpressions.Regex.Replace(
            result,
            @",(?!\s)",
            ", ");

        // Fix spacing: add space around + - * / operators (but not ++)
        result = System.Text.RegularExpressions.Regex.Replace(
            result,
            @"(?<!\+)\+(?!\+)(?!\s)",
            " + ");
        result = System.Text.RegularExpressions.Regex.Replace(
            result,
            @"(?<![- ])-(?!-)(?!\s)(?!\d)",
            " - ");
        result = System.Text.RegularExpressions.Regex.Replace(
            result,
            @"\*(?!\s)",
            " * ");
        result = System.Text.RegularExpressions.Regex.Replace(
            result,
            @"(?<!\s)/(?!\s)",
            " / ");

        // Clean up multiple spaces
        result = System.Text.RegularExpressions.Regex.Replace(result, @"\s+", " ");

        // NOTE: Don't convert setXxx(value) calls here because MVC state setter methods
        // (like setQuantity, setColor) are generated separately. Let them call through
        // to the setter methods instead of converting directly to SetState.

        // Ensure statements end with semicolons
        var lines = result.Split(';').Where(l => !string.IsNullOrWhiteSpace(l)).ToList();
        result = string.Join(";\n", lines.Select(l => l.Trim()));
        if (!string.IsNullOrEmpty(result) && !result.EndsWith(";"))
            result += ";";

        return result;
    }

    private void GenerateGetClientHandlers(ComponentModel component)
    {
        WriteLine("/// <summary>");
        WriteLine("/// Returns JavaScript event handlers for client-side execution");
        WriteLine("/// These execute in the browser with bound hook context");
        WriteLine("/// </summary>");
        WriteLine("protected override Dictionary<string, string> GetClientHandlers()");
        WriteLine("{");
        _indentLevel++;

        WriteLine("return new Dictionary<string, string>");
        WriteLine("{");
        _indentLevel++;

        for (int i = 0; i < component.EventHandlers.Count; i++)
        {
            var handler = component.EventHandlers[i];
            var jsBody = FormatJsHandler(handler.OriginalExpression ?? handler.Body);
            var comma = i < component.EventHandlers.Count - 1 ? "," : "";
            WriteLine($"[\"{handler.GeneratedName}\"] = @\"{jsBody}\"{comma}");
        }

        _indentLevel--;
        WriteLine("};");

        _indentLevel--;
        WriteLine("}");
    }

    private string FormatJsHandler(string originalExpr)
    {
        if (string.IsNullOrWhiteSpace(originalExpr))
            return "function () {}";

        // Escape quotes for verbatim string
        var escaped = originalExpr.Replace("\"", "\"\"");

        // Format as function with newlines
        if (escaped.Contains("=>"))
        {
            // Arrow function: () => setCount(count + 1)
            var parts = escaped.Split("=>", 2);
            if (parts.Length == 2)
            {
                var body = parts[1].Trim();
                // Normalize spacing in the body
                body = System.Text.RegularExpressions.Regex.Replace(body, @"(\w+)\s*([+\-*/])\s*(\d+)", "$1 $2 $3");
                // Wrap in function syntax
                return $"function () {{\\n  {body};\\n}}";
            }
        }

        return $"function () {{\\n  {escaped};\\n}}";
    }

    private void GenerateVNode(VNodeModel node, bool isReturn = false)
    {
        switch (node)
        {
            case VElementModel element:
                GenerateVElement(element, isRoot: isReturn);
                break;

            case VTextModel text:
                GenerateVText(text);
                break;

            case VNullModel:
                Write($"new VNull(\"{node.HexPath}\")");
                break;

            case VConditionalModel conditional:
                GenerateConditional(conditional);
                break;

            case VComponentWrapperModel wrapper:
                GenerateComponentWrapper(wrapper);
                break;

            case VListModel list:
                GenerateList(list);
                break;
        }
    }

    private void GenerateVElement(VElementModel element, bool isRoot = false)
    {
        var tag = element.TagName;
        var path = element.HexPath;

        // Generate attributes dictionary
        var attrs = GenerateAttributesDictionary(element.Attributes);

        // Check if any children are lists - if so, we need special handling
        var hasListChild = element.Children.Any(c => c is VListModel);

        if (element.Children.Count == 0 && !HasTextContent(element))
        {
            // Self-closing or empty element
            Write($"new VElement(\"{tag}\", \"{path}\", {attrs})");
        }
        else if (element.Children.Count == 1 && element.Children[0] is VTextModel textChild)
        {
            // Single text child - inline if static OR if mixed text+expression
            if (textChild.IsDynamic)
            {
                var binding = textChild.Binding ?? "";
                // Only inline if it's merged text+expression (contains both static text AND interpolation)
                // e.g., "Count: {(count)}" should be inlined
                // but "{(count)}" alone should become VText child
                bool isMixedContent = binding.Contains("{(") && binding.Contains(")}") &&
                    !binding.StartsWith("{("); // Has text before the expression

                if (isMixedContent)
                {
                    Write($"new VElement(\"{tag}\", \"{path}\", {attrs}, $\"{binding}\")");
                }
                else
                {
                    // Pure expression - generate VNode array with VText child
                    Write($"new VElement(\"{tag}\", \"{path}\", {attrs}, new VNode[]");
                    _sb.AppendLine();
                    WriteIndent();
                    _sb.AppendLine("{");
                    _indentLevel++;
                    WriteIndent();
                    GenerateVText(textChild);
                    _sb.AppendLine();
                    _indentLevel--;
                    WriteIndent();
                    Write("})");
                }
            }
            else
            {
                // Static text - always inline
                var escapedText = EscapeString(textChild.Text);
                Write($"new VElement(\"{tag}\", \"{path}\", {attrs}, \"{escapedText}\")");
            }
        }
        else if (hasListChild)
        {
            // Use MinimactHelpers.createElement for elements containing list children
            // (Select().ToArray() results need varargs handling)
            // For createElement, use null for empty attributes (Babel convention)
            var createElementAttrs = element.Attributes.Count == 0 ? "null" : attrs;
            Write($"MinimactHelpers.createElement(\"{tag}\", {createElementAttrs}, ");

            for (int i = 0; i < element.Children.Count; i++)
            {
                GenerateVNode(element.Children[i]);
                if (i < element.Children.Count - 1)
                    Write(", ");
            }

            Write(")");
        }
        else
        {
            // Multiple children - use VNode[] array syntax (same for root and non-root)
            Write($"new VElement(\"{tag}\", \"{path}\", {attrs}, new VNode[]");
            _sb.AppendLine();
            WriteIndent();
            _sb.AppendLine("{");
            _indentLevel++;

            for (int i = 0; i < element.Children.Count; i++)
            {
                WriteIndent();
                GenerateVNode(element.Children[i]);
                if (i < element.Children.Count - 1)
                    _sb.AppendLine(",");
                else
                    _sb.AppendLine();
            }

            _indentLevel--;
            WriteIndent();
            Write("})");
        }
    }

    private void GenerateVText(VTextModel text)
    {
        if (text.IsDynamic)
        {
            var binding = text.Binding ?? "";

            // Check if binding already contains interpolation format (merged text + expressions)
            // e.g., "Count: {(count)}" from merged children
            if (binding.Contains("{(") && binding.Contains(")}"))
            {
                // Already in interpolated format, just wrap in $"..."
                Write($"new VText($\"{binding}\", \"{text.HexPath}\")");
            }
            else
            {
                // Simple binding, convert and wrap
                var convertedBinding = ConvertExpression(binding);
                Write($"new VText($\"{{({convertedBinding})}}\", \"{text.HexPath}\")");
            }
        }
        else
        {
            var escapedText = EscapeString(text.Text);
            Write($"new VText(\"{escapedText}\", \"{text.HexPath}\")");
        }
    }

    private void GenerateConditional(VConditionalModel conditional)
    {
        var condition = ConvertCondition(conditional.Condition);

        if (conditional.IsSimpleAnd)
        {
            // {x && <elem>} -> (condition) ? elem : VNull
            Write($"({condition}) ? ");
            if (conditional.TrueNode != null)
                GenerateVNode(conditional.TrueNode);
            else
                Write($"new VNull(\"{conditional.HexPath}\")");
            Write($" : new VNull(\"{conditional.HexPath}\")");
        }
        else
        {
            // Ternary: condition ? a : b
            Write($"({condition}) ? ");
            if (conditional.TrueNode != null)
                GenerateVNode(conditional.TrueNode);
            else
                Write($"new VNull(\"{conditional.HexPath}.1\")");
            Write(" : ");
            if (conditional.FalseNode != null)
                GenerateVNode(conditional.FalseNode);
            else
                Write($"new VNull(\"{conditional.HexPath}.2\")");
        }
    }

    private void GenerateComponentWrapper(VComponentWrapperModel wrapper)
    {
        WriteLine($"new VComponentWrapper");
        WriteIndent();
        WriteLine("{");
        _indentLevel++;
        WriteIndent();
        WriteLine($"ComponentName = \"{wrapper.ComponentName}\",");
        WriteIndent();
        WriteLine($"ComponentType = \"{wrapper.ComponentType}\",");
        WriteIndent();
        WriteLine($"HexPath = \"{wrapper.HexPath}\",");
        WriteIndent();
        Write("InitialState = new Dictionary<string, object> { ");

        var stateItems = wrapper.InitialState.ToList();
        for (int i = 0; i < stateItems.Count; i++)
        {
            var kv = stateItems[i];
            var convertedValue = ConvertInitialValue(kv.Value, "object");
            Write($"[\"{kv.Key}\"] = {convertedValue}");
            if (i < stateItems.Count - 1) Write(", ");
        }

        // Use Write + manual newline to avoid WriteIndent() being called by WriteLine()
        _sb.AppendLine(" },");

        // Add blank line before ParentComponent
        _sb.AppendLine();
        WriteIndent();
        _sb.AppendLine("ParentComponent = this");
        _indentLevel--;
        WriteIndent();
        Write("}");
    }

    private void GenerateList(VListModel list)
    {
        var arrayExpr = ConvertExpression(list.ArrayExpression);

        // Check if the array expression is a List<dynamic> prop (no cast needed)
        var matchingProp = _component?.Props.FirstOrDefault(p => p.Name == list.ArrayExpression);
        var needsCast = matchingProp?.Type != "List<dynamic>";

        // Generate: arrayExpr.Select(item => ...).ToArray()
        // Only cast to IEnumerable<dynamic> if needed to avoid dynamic dispatch issues
        if (needsCast)
        {
            Write($"((IEnumerable<dynamic>){arrayExpr}).Select({list.ItemName} => ");
        }
        else
        {
            Write($"{arrayExpr}.Select({list.ItemName} => ");
        }

        if (list.ItemTemplate != null)
        {
            GenerateVNode(list.ItemTemplate);
        }
        else
        {
            Write($"new VNull(\"{list.HexPath}\")");
        }

        Write(").ToArray()");
    }

    private void GenerateEventHandler(Models.EventHandler handler)
    {
        // Build parameter list
        var parameters = new List<string>();

        // Add event parameter if handler uses e.target.value, e.preventDefault(), etc.
        if (handler.NeedsEventParameter)
        {
            parameters.Add("dynamic e");
        }

        // Add loop item parameter if handler is inside a loop
        if (handler.LoopItemName != null)
        {
            parameters.Add($"dynamic {handler.LoopItemName}");
        }

        var paramList = string.Join(", ", parameters);
        WriteLine($"public void {handler.GeneratedName}({paramList})");
        WriteLine("{");
        _indentLevel++;

        var body = ConvertHandlerBody(handler.Body);
        if (!string.IsNullOrWhiteSpace(body))
        {
            foreach (var line in body.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                WriteLine(line.Trim());
            }
        }

        _indentLevel--;
        WriteLine("}");
    }

    private string GenerateAttributesDictionary(Dictionary<string, AttributeValue> attributes)
    {
        if (attributes.Count == 0)
            return "new Dictionary<string, string>()";

        var items = new List<string>();
        foreach (var attr in attributes)
        {
            string value;
            if (attr.Value.IsEventHandler)
            {
                value = $"\"{attr.Value.EventHandlerRef}\"";
            }
            else if (attr.Value.IsDynamic)
            {
                // Dynamic attribute - use interpolation
                value = $"$\"{{({ConvertExpression(attr.Value.Binding ?? "")})}}\"";
            }
            else
            {
                value = $"\"{EscapeString(attr.Value.RawValue)}\"";
            }
            items.Add($"[\"{attr.Key}\"] = {value}");
        }

        return $"new Dictionary<string, string> {{ {string.Join(", ", items)} }}";
    }

    #region Conversion Helpers

    private string ConvertTypeToCSharp(string tsType)
    {
        return tsType switch
        {
            "number" or "int" => "int",
            "double" or "float" => "double",
            "string" => "string",
            "boolean" or "bool" => "bool",
            "List<object>" => "List<object>",
            "Dictionary<string, object>" => "Dictionary<string, object>",
            _ => "object"
        };
    }

    private string ConvertInitialValue(string? value, string type)
    {
        if (string.IsNullOrEmpty(value)) return "null";

        // Boolean
        if (value == "true" || value == "false") return value;

        // Number
        if (int.TryParse(value, out _) || double.TryParse(value, out _)) return value;

        // String
        if (value.StartsWith("\"") || value.StartsWith("'"))
            return value.Replace("'", "\"");

        // Array
        if (value.StartsWith("["))
            return $"new List<object> {{ {value.Trim('[', ']')} }}";

        // Object
        if (value.StartsWith("{"))
            return ConvertObjectLiteral(value);

        return value;
    }

    private string ConvertObjectLiteral(string obj)
    {
        var trimmed = obj.Trim();
        if (!trimmed.StartsWith("{") || !trimmed.EndsWith("}"))
            return obj; // Not an object literal

        var inner = trimmed[1..^1].Trim();
        if (string.IsNullOrWhiteSpace(inner))
            return "new Dictionary<string, object>()";

        // Parse key: value pairs
        var props = new List<(string key, string value)>();
        int depth = 0;
        int start = 0;

        for (int i = 0; i < inner.Length; i++)
        {
            var c = inner[i];
            if (c == '{' || c == '[' || c == '(') depth++;
            else if (c == '}' || c == ']' || c == ')') depth--;
            else if (c == ',' && depth == 0)
            {
                var prop = inner[start..i].Trim();
                if (!string.IsNullOrWhiteSpace(prop))
                {
                    var (key, value) = ParseObjectProperty(prop);
                    if (key != null)
                        props.Add((key, value));
                }
                start = i + 1;
            }
        }

        // Don't forget the last property
        var lastProp = inner[start..].Trim();
        if (!string.IsNullOrWhiteSpace(lastProp))
        {
            var (key, value) = ParseObjectProperty(lastProp);
            if (key != null)
                props.Add((key, value));
        }

        if (props.Count == 0)
            return "new Dictionary<string, object>()";

        // Determine if all keys are valid C# identifiers (use anonymous type)
        // or if we need dictionary syntax
        var allValidIdentifiers = props.All(p => System.Text.RegularExpressions.Regex.IsMatch(p.key, @"^[a-zA-Z_][a-zA-Z0-9_]*$"));

        if (allValidIdentifiers)
        {
            // Use anonymous type: new { key1 = value1, key2 = value2 }
            var propStrings = props.Select(p => $"{p.key} = {ConvertJsValueToCSharp(p.value)}");
            return $"new {{ {string.Join(", ", propStrings)} }}";
        }
        else
        {
            // Use dictionary: new Dictionary<string, object> { ["key1"] = value1 }
            var propStrings = props.Select(p => $"[\"{p.key}\"] = {ConvertJsValueToCSharp(p.value)}");
            return $"new Dictionary<string, object> {{ {string.Join(", ", propStrings)} }}";
        }
    }

    private (string? key, string value) ParseObjectProperty(string prop)
    {
        var colonIdx = prop.IndexOf(':');
        if (colonIdx < 0)
        {
            // Shorthand property: { foo } means { foo: foo }
            var identifier = prop.Trim();
            return (identifier, identifier);
        }

        var key = prop[..colonIdx].Trim();
        var value = prop[(colonIdx + 1)..].Trim();

        // Remove quotes from key if present (e.g., "key": value or 'key': value)
        if ((key.StartsWith("\"") && key.EndsWith("\"")) || (key.StartsWith("'") && key.EndsWith("'")))
            key = key[1..^1];

        return (key, value);
    }

    private string ConvertJsValueToCSharp(string value)
    {
        var trimmed = value.Trim();

        // Single quoted string -> double quoted
        if (trimmed.StartsWith("'") && trimmed.EndsWith("'"))
            return "\"" + trimmed[1..^1] + "\"";

        // Nested object literal
        if (trimmed.StartsWith("{") && trimmed.EndsWith("}"))
            return ConvertObjectLiteral(trimmed);

        // Array literal
        if (trimmed.StartsWith("[") && trimmed.EndsWith("]"))
            return ConvertArrayLiteral(trimmed);

        // Boolean, number, null - pass through
        return trimmed;
    }

    private string ConvertArrayLiteral(string arr)
    {
        var trimmed = arr.Trim();
        if (!trimmed.StartsWith("[") || !trimmed.EndsWith("]"))
            return arr;

        var inner = trimmed[1..^1].Trim();
        if (string.IsNullOrWhiteSpace(inner))
            return "new List<object>()";

        // Parse array elements
        var elements = new List<string>();
        int depth = 0;
        int start = 0;

        for (int i = 0; i < inner.Length; i++)
        {
            var c = inner[i];
            if (c == '{' || c == '[' || c == '(') depth++;
            else if (c == '}' || c == ']' || c == ')') depth--;
            else if (c == ',' && depth == 0)
            {
                var elem = inner[start..i].Trim();
                if (!string.IsNullOrWhiteSpace(elem))
                    elements.Add(ConvertJsValueToCSharp(elem));
                start = i + 1;
            }
        }

        // Don't forget the last element
        var lastElem = inner[start..].Trim();
        if (!string.IsNullOrWhiteSpace(lastElem))
            elements.Add(ConvertJsValueToCSharp(lastElem));

        return $"new List<object> {{ {string.Join(", ", elements)} }}";
    }

    private string ConvertExpression(string expr)
    {
        if (string.IsNullOrWhiteSpace(expr)) return "null";

        // Convert template literals: `text ${var}` -> $"text {var}"
        // First handle complete template literals
        if (expr.StartsWith("`") && expr.EndsWith("`"))
        {
            var inner = expr[1..^1];
            inner = inner.Replace("${", "{");
            return $"$\"{inner}\"";
        }

        // Handle embedded template literals: something(`template ${var}`) -> something($"template {var}")
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"`([^`]*)`",
            match =>
            {
                var inner = match.Groups[1].Value;
                inner = inner.Replace("${", "{");
                return $"$\"{inner}\"";
            });

        // Convert state access: state["Key"] -> State["Key"]
        expr = expr.Replace("state[", "State[");

        // Convert JS method calls to C# equivalents
        // toFixed(n) -> ToString("Fn")
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"\.toFixed\((\d+)\)",
            ".ToString(\"F$1\")");

        // toLocaleString() -> ToString("N0")
        expr = expr.Replace(".toLocaleString()", ".ToString(\"N0\")");

        // Math methods
        expr = expr.Replace("Math.max", "Math.Max");
        expr = expr.Replace("Math.min", "Math.Min");
        expr = expr.Replace("Math.round", "Math.Round");
        expr = expr.Replace("Math.floor", "(int)Math.Floor");
        expr = expr.Replace("Math.ceil", "(int)Math.Ceiling");
        expr = expr.Replace("Math.abs", "Math.Abs");
        expr = expr.Replace("Math.sqrt", "Math.Sqrt");
        expr = expr.Replace("Math.pow", "Math.Pow");

        // console.log -> Console.WriteLine
        expr = expr.Replace("console.log", "Console.WriteLine");

        // Convert JS array/string methods to C# LINQ equivalents
        expr = ConvertJsArrayMethodsToCSharp(expr);

        // Convert JS single-quoted strings to C# double-quoted strings
        // 'text' -> "text"
        // But be careful not to convert char literals or strings inside template literals
        expr = ConvertSingleQuotedStrings(expr);

        return expr;
    }

    /// <summary>
    /// Converts JS array/string methods to their C# LINQ equivalents.
    /// </summary>
    private string ConvertJsArrayMethodsToCSharp(string expr)
    {
        // parseInt(x) -> int.Parse(x.ToString())
        // Handle nested parentheses in the argument
        expr = ConvertParseInt(expr);

        // parseFloat(x) -> double.Parse(x.ToString())
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"parseFloat\(([^)]+)\)",
            "double.Parse($1.ToString())");

        // String(x) -> x.ToString()
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"String\(([^)]+)\)",
            "$1.ToString()");

        // Number(x) -> Convert.ToDouble(x)
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"Number\(([^)]+)\)",
            "Convert.ToDouble($1)");

        // Boolean(x) -> Convert.ToBoolean(x)
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"Boolean\(([^)]+)\)",
            "Convert.ToBoolean($1)");

        // .length -> .Count (for arrays/lists)
        // But be careful not to replace string.Length (which is valid in C#)
        // We'll replace .length when followed by non-identifier chars
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"\.length\b(?!\()",
            ".Count");

        // .push(x) -> .Add(x)
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"\.push\(([^)]*)\)",
            ".Add($1)");

        // .pop() -> .RemoveAt(list.Count - 1) - simplified, won't return value
        expr = expr.Replace(".pop()", ".RemoveAt(Count - 1)");

        // .shift() - not directly translatable, comment for now
        // .unshift(x) - not directly translatable

        // .indexOf(x) -> .IndexOf(x)
        expr = expr.Replace(".indexOf(", ".IndexOf(");

        // .includes(x) -> .Contains(x)
        expr = expr.Replace(".includes(", ".Contains(");

        // .join(sep) -> string.Join(sep, array)
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"(\w+)\.join\(([^)]*)\)",
            "string.Join($2, $1)");

        // .split(sep) -> .Split(sep) (mostly compatible)
        // JS: "a,b".split(",") -> ["a", "b"]
        // C#: "a,b".Split(',') -> ["a", "b"] (needs char, but string works with newer C#)

        // .trim() -> .Trim()
        expr = expr.Replace(".trim()", ".Trim()");

        // .trimStart() / .trimLeft() -> .TrimStart()
        expr = expr.Replace(".trimStart()", ".TrimStart()");
        expr = expr.Replace(".trimLeft()", ".TrimStart()");

        // .trimEnd() / .trimRight() -> .TrimEnd()
        expr = expr.Replace(".trimEnd()", ".TrimEnd()");
        expr = expr.Replace(".trimRight()", ".TrimEnd()");

        // .toLowerCase() -> .ToLower()
        expr = expr.Replace(".toLowerCase()", ".ToLower()");

        // .toUpperCase() -> .ToUpper()
        expr = expr.Replace(".toUpperCase()", ".ToUpper()");

        // .charAt(i) -> [i] (simplified)
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"\.charAt\((\d+)\)",
            "[$1]");

        // .substring(start, end) -> .Substring(start, end - start)
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"\.substring\((\d+),\s*(\d+)\)",
            match =>
            {
                var start = int.Parse(match.Groups[1].Value);
                var end = int.Parse(match.Groups[2].Value);
                return $".Substring({start}, {end - start})";
            });

        // .substr(start, length) -> .Substring(start, length)
        expr = expr.Replace(".substr(", ".Substring(");

        // .startsWith(x) -> .StartsWith(x)
        expr = expr.Replace(".startsWith(", ".StartsWith(");

        // .endsWith(x) -> .EndsWith(x)
        expr = expr.Replace(".endsWith(", ".EndsWith(");

        // .replace(pattern, replacement) -> .Replace(pattern, replacement)
        // Note: JS replace only replaces first occurrence; C# replaces all
        // But in most cases this is acceptable
        expr = expr.Replace(".replace(", ".Replace(");

        // .replaceAll(pattern, replacement) -> .Replace(pattern, replacement)
        expr = expr.Replace(".replaceAll(", ".Replace(");

        // .padStart(len, char) -> .PadLeft(len, char)
        expr = expr.Replace(".padStart(", ".PadLeft(");

        // .padEnd(len, char) -> .PadRight(len, char)
        expr = expr.Replace(".padEnd(", ".PadRight(");

        // .repeat(n) -> string.Concat(Enumerable.Repeat(str, n)) - too complex, skip for now

        // .filter(x => expr) -> .Where(x => expr)
        expr = expr.Replace(".filter(", ".Where(");

        // Convert === to == and !== to != (must come before == replacement if any)
        expr = expr.Replace("===", "==");
        expr = expr.Replace("!==", "!=");

        // Convert || to logical OR when not null-coalescing
        // Note: We keep || as is since C# supports it for boolean expressions
        // The issue is when || is used for default values - but we'll handle that separately

        // Convert JS object literals { key: value } to C# dictionary
        // Simple pattern: { identifier: value, ... }
        expr = ConvertObjectLiterals(expr);

        // Convert .slice() when not already handled by JsxVisitor
        // .slice(start) -> .Skip(start).ToList()
        // .slice(start, end) -> .Skip(start).Take(end - start).ToList()
        expr = ConvertSliceMethod(expr);

        // Convert .sort() when not already handled by JsxVisitor
        expr = ConvertSortMethod(expr);

        return expr;
    }

    /// <summary>
    /// Converts parseInt calls to int.Parse, handling nested parentheses.
    /// parseInt(x) -> int.Parse(x.ToString())
    /// parseInt(x, radix) -> Convert.ToInt32(x.ToString(), radix)
    /// parseInt(x) || default -> (int.TryParse(x?.ToString(), out var _v) ? _v : default)
    /// </summary>
    private string ConvertParseInt(string expr)
    {
        var result = new System.Text.StringBuilder();
        int i = 0;
        int tempVarCounter = 0;

        while (i < expr.Length)
        {
            // Look for "parseInt("
            if (i + 9 <= expr.Length && expr.Substring(i, 9) == "parseInt(")
            {
                // Find the matching closing paren
                int start = i + 9;
                int depth = 1;
                int j = start;

                while (j < expr.Length && depth > 0)
                {
                    if (expr[j] == '(') depth++;
                    else if (expr[j] == ')') depth--;
                    j++;
                }

                if (depth == 0)
                {
                    // Extract the argument(s)
                    var args = expr.Substring(start, j - start - 1);

                    // Check if followed by || defaultValue pattern
                    var afterParen = expr.Substring(j).TrimStart();
                    if (afterParen.StartsWith("||"))
                    {
                        // Find the default value (until end of expression, semicolon, comma, or closing paren)
                        var defaultStart = j + expr.Substring(j).IndexOf("||") + 2;
                        var defaultEnd = defaultStart;
                        int parenDepth = 0;

                        while (defaultEnd < expr.Length)
                        {
                            var c = expr[defaultEnd];
                            if (c == '(') parenDepth++;
                            else if (c == ')') { if (parenDepth == 0) break; parenDepth--; }
                            else if ((c == ';' || c == ',') && parenDepth == 0) break;
                            defaultEnd++;
                        }

                        var defaultValue = expr.Substring(defaultStart, defaultEnd - defaultStart).Trim();
                        var tempVar = $"_parseIntResult{tempVarCounter++}";

                        // Use TryParse pattern: (int.TryParse(x?.ToString(), out var v) ? v : default)
                        result.Append($"(int.TryParse({args}?.ToString(), out var {tempVar}) ? {tempVar} : {defaultValue})");
                        i = defaultEnd;
                        continue;
                    }
                    else
                    {
                        // No default value pattern - use simple int.Parse
                        // Check for radix (second argument)
                        var commaIndex = FindTopLevelComma(args);
                        if (commaIndex >= 0)
                        {
                            var value = args.Substring(0, commaIndex).Trim();
                            var radix = args.Substring(commaIndex + 1).Trim();
                            result.Append($"Convert.ToInt32({value}.ToString(), {radix})");
                        }
                        else
                        {
                            result.Append($"int.Parse({args}.ToString())");
                        }
                        i = j;
                        continue;
                    }
                }
            }
            result.Append(expr[i]);
            i++;
        }

        return result.ToString();
    }

    /// <summary>
    /// Finds the index of a comma at the top level (not inside parentheses).
    /// </summary>
    private int FindTopLevelComma(string s)
    {
        int depth = 0;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] == '(') depth++;
            else if (s[i] == ')') depth--;
            else if (s[i] == ',' && depth == 0) return i;
        }
        return -1;
    }

    /// <summary>
    /// Converts JS object literals to C# dictionaries or anonymous objects.
    /// { key: value } -> new Dictionary<string, object> { ["key"] = value }
    /// </summary>
    private string ConvertObjectLiterals(string expr)
    {
        // Match standalone object literals: { key: value, key2: value2 }
        // But NOT JSON-like objects within new { } (anonymous types)
        // Pattern: starts with {, contains key: value pairs, ends with }
        var objectLiteralPattern = new System.Text.RegularExpressions.Regex(
            @"(?<!\bnew\s*)(?<!\[)\{(\s*(\w+)\s*:\s*([^,}]+)\s*(?:,\s*(\w+)\s*:\s*([^,}]+)\s*)*)\}(?!\])");

        return objectLiteralPattern.Replace(expr, match =>
        {
            var content = match.Groups[1].Value;

            // Parse key-value pairs
            var pairs = new List<(string key, string value)>();
            var pairPattern = new System.Text.RegularExpressions.Regex(@"(\w+)\s*:\s*([^,}]+)");
            foreach (System.Text.RegularExpressions.Match pairMatch in pairPattern.Matches(content))
            {
                pairs.Add((pairMatch.Groups[1].Value.Trim(), pairMatch.Groups[2].Value.Trim()));
            }

            if (pairs.Count == 0)
                return match.Value;

            // Determine value type - if all numbers, use int; otherwise use object
            var valueType = "object";
            if (pairs.All(p => int.TryParse(p.value, out _)))
                valueType = "int";
            else if (pairs.All(p => double.TryParse(p.value, out _)))
                valueType = "double";
            else if (pairs.All(p => p.value.StartsWith("\"") || p.value.StartsWith("'")))
                valueType = "string";

            var dictEntries = pairs.Select(p => $"[\"{p.key}\"] = {p.value}");
            return $"new Dictionary<string, {valueType}> {{ {string.Join(", ", dictEntries)} }}";
        });
    }

    /// <summary>
    /// Converts JS .slice() calls to C# LINQ Skip/Take.
    /// </summary>
    private string ConvertSliceMethod(string expr)
    {
        // .slice(start, end) -> .Skip(start).Take(end - start)
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"\.slice\((\d+),\s*(\d+)\)",
            match =>
            {
                var start = int.Parse(match.Groups[1].Value);
                var end = int.Parse(match.Groups[2].Value);
                var take = end - start;
                if (start == 0)
                    return $".Take({take})";
                return $".Skip({start}).Take({take})";
            });

        // .slice(start) with variable -> .Skip(start)
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"\.slice\((\w+)\)(?!\.)",
            ".Skip($1).ToList()");

        // .slice(start, end) with variables
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"\.slice\((\w+),\s*(\w+)\)",
            ".Skip($1).Take($2 - $1)");

        return expr;
    }

    /// <summary>
    /// Converts JS .sort() calls to C# LINQ OrderBy.
    /// </summary>
    private string ConvertSortMethod(string expr)
    {
        // Simple .sort() without comparator -> .OrderBy(x => x)
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"\.sort\(\s*\)",
            ".OrderBy(x => x).ToList()");

        // .sort((a, b) => a - b) -> .OrderBy(x => x)
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"\.sort\(\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*=>\s*\1\s*-\s*\2\s*\)",
            ".OrderBy(x => x).ToList()");

        // .sort((a, b) => b - a) -> .OrderByDescending(x => x)
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"\.sort\(\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*=>\s*\2\s*-\s*\1\s*\)",
            ".OrderByDescending(x => x).ToList()");

        // .sort((a, b) => a.prop - b.prop) -> .OrderBy(x => x.prop)
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"\.sort\(\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*=>\s*\1\.(\w+)\s*-\s*\2\.\3\s*\)",
            ".OrderBy(x => x.$3).ToList()");

        // .sort((a, b) => b.prop - a.prop) -> .OrderByDescending(x => x.prop)
        expr = System.Text.RegularExpressions.Regex.Replace(
            expr,
            @"\.sort\(\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*=>\s*\2\.(\w+)\s*-\s*\1\.\3\s*\)",
            ".OrderByDescending(x => x.$3).ToList()");

        return expr;
    }

    private string ConvertSingleQuotedStrings(string expr)
    {
        // Convert JS single-quoted strings to C# double-quoted strings
        // 'hello' -> "hello"
        // 'completed' -> "completed"
        // '' -> ""
        // But skip if already inside a double-quoted string

        var result = new System.Text.StringBuilder();
        bool inDoubleQuote = false;
        bool inSingleQuote = false;
        bool escape = false;

        for (int i = 0; i < expr.Length; i++)
        {
            char c = expr[i];

            if (escape)
            {
                result.Append(c);
                escape = false;
                continue;
            }

            if (c == '\\')
            {
                result.Append(c);
                escape = true;
                continue;
            }

            if (c == '"' && !inSingleQuote)
            {
                inDoubleQuote = !inDoubleQuote;
                result.Append(c);
            }
            else if (c == '\'' && !inDoubleQuote)
            {
                // Convert single quote to double quote
                result.Append('"');
                inSingleQuote = !inSingleQuote;
            }
            else
            {
                result.Append(c);
            }
        }

        return result.ToString();
    }

    private string ConvertCondition(string condition)
    {
        // Wrap simple identifiers in MObject for truthiness check
        var trimmed = condition.Trim();

        // Check if it's a simple identifier (no operators, no parens, no negation)
        if (!trimmed.Contains(" ") &&
            !trimmed.Contains("(") &&
            !trimmed.Contains(".") &&
            !trimmed.Contains("!") &&
            !trimmed.Contains("&") &&
            !trimmed.Contains("|"))
        {
            return $"new MObject({trimmed})";
        }

        // For complex conditions with && or ||, wrap each part in parentheses
        // myState1 && !myState2 -> (myState1) && (!myState2)
        if (trimmed.Contains("&&") || trimmed.Contains("||"))
        {
            // Already has operators - format properly
            var result = trimmed;
            // Add parentheses around sub-expressions for safety
            result = System.Text.RegularExpressions.Regex.Replace(result, @"(\w+)\s*&&", "($1) &&");
            result = System.Text.RegularExpressions.Regex.Replace(result, @"&&\s*(!?\w+)", "&& ($1)");
            return result;
        }

        // Handle negation: !x -> !x (keep as is)
        return condition;
    }

    private string ConvertHandlerBody(string body)
    {
        if (string.IsNullOrWhiteSpace(body)) return "";

        // Convert setState calls
        // setCount(count + 1) -> SetState(nameof(count), count + 1);
        var result = body.Trim();

        // Strip arrow function syntax: () => expr  or  (params) => expr
        var arrowMatch = System.Text.RegularExpressions.Regex.Match(result, @"^\s*\([^)]*\)\s*=>\s*(.+)$");
        if (arrowMatch.Success)
        {
            result = arrowMatch.Groups[1].Value.Trim();
        }
        // Also handle: param => expr (single param without parens)
        else
        {
            var singleParamArrow = System.Text.RegularExpressions.Regex.Match(result, @"^\s*\w+\s*=>\s*(.+)$");
            if (singleParamArrow.Success)
            {
                result = singleParamArrow.Groups[1].Value.Trim();
            }
        }

        // Convert setTimeout(() => callback, delay) to Task.Delay(delay).ContinueWith(_ => { callback; })
        var setTimeoutPattern = new System.Text.RegularExpressions.Regex(
            @"setTimeout\s*\(\s*\(\s*\)\s*=>\s*([^,]+),\s*(\d+)\s*\)");
        result = setTimeoutPattern.Replace(result, match =>
        {
            var callback = match.Groups[1].Value.Trim();
            var delay = match.Groups[2].Value;
            // Convert the callback (e.g., setIsLoading(false) -> SetState(nameof(isLoading), false))
            var convertedCallback = ConvertSetterCall(callback);
            return $"Task.Delay({delay}).ContinueWith(_ => {{ {convertedCallback}; }})";
        });

        // First, convert global setState("Component.key", value) to SetState("Component.key", value)
        // This is used for lifted state writes
        result = result.Replace("setState(", "SetState(");

        // Convert setXxx(value) -> SetState(nameof(xxx), value)
        // Use manual scanning to handle nested parentheses correctly
        result = ConvertAllSetterCalls(result);

        // Ensure statements end with semicolons
        if (!string.IsNullOrEmpty(result) && !result.EndsWith(";") && !result.EndsWith("}"))
        {
            result += ";";
        }

        return result;
    }

    /// <summary>
    /// Scans for all setXxx(...) calls and converts them to SetState(nameof(xxx), value).
    /// Handles nested parentheses correctly.
    /// </summary>
    private string ConvertAllSetterCalls(string input)
    {
        var result = new System.Text.StringBuilder();
        int i = 0;

        while (i < input.Length)
        {
            // Look for "set" followed by uppercase letter
            if (i + 4 < input.Length &&
                input.Substring(i, 3) == "set" &&
                char.IsUpper(input[i + 3]) &&
                (i == 0 || !char.IsLetter(input[i - 1]))) // Make sure it's not part of a larger word
            {
                // Find the end of the identifier
                int identEnd = i + 4;
                while (identEnd < input.Length && char.IsLetterOrDigit(input[identEnd]))
                    identEnd++;

                // Check for opening paren
                if (identEnd < input.Length && input[identEnd] == '(')
                {
                    var fieldNamePascal = input.Substring(i + 3, identEnd - i - 3);
                    var fieldName = char.ToLower(fieldNamePascal[0]) + fieldNamePascal[1..];

                    // Find matching closing paren
                    int start = identEnd + 1;
                    int depth = 1;
                    int j = start;

                    while (j < input.Length && depth > 0)
                    {
                        if (input[j] == '(') depth++;
                        else if (input[j] == ')') depth--;
                        j++;
                    }

                    if (depth == 0)
                    {
                        var value = input.Substring(start, j - start - 1).Trim();
                        // Normalize spacing around operators
                        value = System.Text.RegularExpressions.Regex.Replace(value, @"(\w+)\s*([+\-*/])\s*(\d+)", "$1 $2 $3");
                        // Apply expression conversions (parseInt, etc.)
                        value = ConvertExpression(value);
                        result.Append($"SetState(nameof({fieldName}), {value})");
                        i = j;
                        continue;
                    }
                }
            }
            result.Append(input[i]);
            i++;
        }

        return result.ToString();
    }

    private string ConvertSetterCall(string call)
    {
        // Legacy method for backwards compatibility (e.g., setTimeout callback conversion)
        return ConvertAllSetterCalls(call);
    }

    private bool HasTextContent(VElementModel element)
    {
        return element.Children.Any(c => c is VTextModel);
    }

    private string EscapeString(string s)
    {
        return s.Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\n", "\\n")
                .Replace("\r", "\\r")
                .Replace("\t", "\\t");
    }

    /// <summary>
    /// Generates an interpolated string for dynamic text content.
    /// Example: VTextModel with Binding="Count: {(count)}" -> $"Count:{(count)}"
    /// </summary>
    private string GenerateInterpolatedString(VTextModel text)
    {
        if (!text.IsDynamic || string.IsNullOrEmpty(text.Binding))
        {
            return $"\"{EscapeString(text.Text)}\"";
        }

        // The binding already contains the interpolated format like "Count: {(count)}"
        // We just need to wrap it in $"..."
        var content = text.Binding;

        // Escape any quotes that aren't part of interpolation braces
        // But preserve {(...)} patterns
        return $"$\"{content}\"";
    }

    /// <summary>
    /// C# reserved keywords that need to be escaped with @ prefix.
    /// </summary>
    private static readonly HashSet<string> CSharpKeywords = new()
    {
        "abstract", "as", "base", "bool", "break", "byte", "case", "catch", "char", "checked",
        "class", "const", "continue", "decimal", "default", "delegate", "do", "double", "else",
        "enum", "event", "explicit", "extern", "false", "finally", "fixed", "float", "for",
        "foreach", "goto", "if", "implicit", "in", "int", "interface", "internal", "is", "lock",
        "long", "namespace", "new", "null", "object", "operator", "out", "override", "params",
        "private", "protected", "public", "readonly", "ref", "return", "sbyte", "sealed", "short",
        "sizeof", "stackalloc", "static", "string", "struct", "switch", "this", "throw", "true",
        "try", "typeof", "uint", "ulong", "unchecked", "unsafe", "ushort", "using", "virtual",
        "void", "volatile", "while"
    };

    /// <summary>
    /// Escapes a C# keyword by prefixing with @.
    /// </summary>
    private string EscapeCSharpKeyword(string name)
    {
        return CSharpKeywords.Contains(name) ? $"@{name}" : name;
    }

    #endregion

    #region Loop Template Attributes

    /// <summary>
    /// Writes [LoopTemplate] attributes for .map() patterns.
    /// Format: [LoopTemplate("stateKey", @"{ json }")]
    /// </summary>
    private void WriteLoopTemplateAttributes(List<LoopTemplateInfo> loopTemplates)
    {
        foreach (var loop in loopTemplates)
        {
            var templateJson = SerializeLoopTemplate(loop);
            // Escape quotes for C# verbatim string
            var escapedJson = templateJson.Replace("\"", "\"\"");
            WriteLine($"[LoopTemplate(\"{loop.StateKey}\", @\"{escapedJson}\")]");
        }
    }

    /// <summary>
    /// Serializes a loop template to JSON format matching Babel output.
    /// </summary>
    private string SerializeLoopTemplate(LoopTemplateInfo loop)
    {
        var sb = new StringBuilder();
        sb.Append("{");
        sb.Append($"\"stateKey\":\"{loop.StateKey}\",");
        sb.Append($"\"arrayBinding\":\"{loop.ArrayBinding}\",");
        sb.Append($"\"itemVar\":\"{loop.ItemVar}\",");
        sb.Append($"\"indexVar\":{(loop.IndexVar != null ? $"\"{loop.IndexVar}\"" : "null")},");
        sb.Append($"\"keyBinding\":{(loop.KeyBinding != null ? $"\"{loop.KeyBinding}\"" : "null")},");
        sb.Append("\"itemTemplate\":");
        SerializeLoopItemTemplate(sb, loop.ItemTemplate);
        sb.Append("}");
        return sb.ToString();
    }

    /// <summary>
    /// Serializes a loop item template recursively.
    /// </summary>
    private void SerializeLoopItemTemplate(StringBuilder sb, LoopItemTemplate? template)
    {
        if (template == null)
        {
            sb.Append("null");
            return;
        }

        sb.Append("{");
        sb.Append($"\"type\":\"{template.Type}\",");

        if (template.Type == "Text")
        {
            sb.Append($"\"template\":\"{EscapeJsonString(template.Template ?? "")}\",");
            sb.Append("\"bindings\":[");
            if (template.Bindings != null)
            {
                sb.Append(string.Join(",", template.Bindings.Select(b => $"\"{b}\"")));
            }
            sb.Append("],");
            sb.Append("\"slots\":[");
            if (template.Slots != null)
            {
                sb.Append(string.Join(",", template.Slots));
            }
            sb.Append("]");
        }
        else // Element
        {
            sb.Append($"\"tag\":\"{template.Tag}\",");

            // Props templates
            sb.Append("\"propsTemplates\":");
            if (template.PropsTemplates != null && template.PropsTemplates.Count > 0)
            {
                sb.Append("{");
                var first = true;
                foreach (var prop in template.PropsTemplates)
                {
                    if (!first) sb.Append(",");
                    first = false;
                    sb.Append($"\"{prop.Key}\":");
                    SerializeLoopPropTemplate(sb, prop.Value);
                }
                sb.Append("}");
            }
            else
            {
                sb.Append("null");
            }

            // Children templates
            sb.Append(",\"childrenTemplates\":");
            if (template.ChildrenTemplates != null && template.ChildrenTemplates.Count > 0)
            {
                sb.Append("[");
                for (int i = 0; i < template.ChildrenTemplates.Count; i++)
                {
                    if (i > 0) sb.Append(",");
                    SerializeLoopItemTemplate(sb, template.ChildrenTemplates[i]);
                }
                sb.Append("]");
            }
            else
            {
                sb.Append("null");
            }
        }

        sb.Append("}");
    }

    /// <summary>
    /// Serializes a loop prop template.
    /// </summary>
    private void SerializeLoopPropTemplate(StringBuilder sb, LoopPropTemplate prop)
    {
        sb.Append("{");
        sb.Append($"\"template\":\"{EscapeJsonString(prop.Template)}\",");
        sb.Append("\"bindings\":[");
        sb.Append(string.Join(",", prop.Bindings.Select(b => $"\"{b}\"")));
        sb.Append("],");
        sb.Append("\"slots\":[");
        sb.Append(string.Join(",", prop.Slots));
        sb.Append("],");
        sb.Append($"\"type\":\"{prop.Type}\"");

        if (prop.ConditionalTemplates != null)
        {
            sb.Append(",\"conditionalTemplates\":{");
            sb.Append($"\"true\":\"{EscapeJsonString(prop.ConditionalTemplates.GetValueOrDefault("true", ""))}\",");
            sb.Append($"\"false\":\"{EscapeJsonString(prop.ConditionalTemplates.GetValueOrDefault("false", ""))}\"");
            sb.Append("}");
            sb.Append($",\"conditionalBindingIndex\":{prop.ConditionalBindingIndex ?? 0}");
        }

        sb.Append("}");
    }

    /// <summary>
    /// Escapes a string for JSON output.
    /// </summary>
    private string EscapeJsonString(string s)
    {
        return s.Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\n", "\\n")
                .Replace("\r", "\\r")
                .Replace("\t", "\\t");
    }

    #endregion

    #region Timeline Attributes

    /// <summary>
    /// Writes timeline-related attributes before the [Component] attribute.
    /// Generates:
    /// - [Timeline("Name", duration, Repeat = bool, Easing = "string")]
    /// - [TimelineKeyframe(time, "stateName", value, Label = "label")]
    /// - [TimelineStateBinding("stateName", Interpolate = bool)]
    /// </summary>
    private void WriteTimelineAttributes(TimelineModel timeline)
    {
        // [Timeline] attribute
        var repeatPart = timeline.Repeat ? ", Repeat = true" : "";
        var easingPart = !string.IsNullOrEmpty(timeline.Easing) ? $", Easing = \"{timeline.Easing}\"" : "";
        WriteLine($"[Timeline(\"{timeline.Name}\", {timeline.Duration}{repeatPart}{easingPart})]");

        // [TimelineKeyframe] attributes - one per state per keyframe
        foreach (var keyframe in timeline.Keyframes)
        {
            var labelPart = !string.IsNullOrEmpty(keyframe.Label) ? $", Label = \"{keyframe.Label}\"" : "";

            // Format value based on type
            string formattedValue;
            if (int.TryParse(keyframe.Value, out var intVal))
            {
                formattedValue = intVal.ToString();
            }
            else if (double.TryParse(keyframe.Value, out var doubleVal))
            {
                formattedValue = doubleVal.ToString(System.Globalization.CultureInfo.InvariantCulture);
            }
            else
            {
                formattedValue = $"\"{keyframe.Value}\"";
            }

            WriteLine($"[TimelineKeyframe({keyframe.Time}, \"{keyframe.StateName}\", {formattedValue}{labelPart})]");
        }

        // [TimelineStateBinding] attributes
        foreach (var binding in timeline.StateBindings)
        {
            var interpolatePart = binding.Interpolate ? ", Interpolate = true" : "";
            WriteLine($"[TimelineStateBinding(\"{binding.StateName}\"{interpolatePart})]");
        }
    }

    #endregion

    #region Special Hook Attributes

    /// <summary>
    /// Writes [ServerTask] attribute for useServerTask hooks.
    /// </summary>
    private void WriteServerTaskAttribute(ServerTaskModel serverTask)
    {
        var sb = new StringBuilder();
        sb.Append($"[ServerTask(\"{serverTask.Name}\"");

        if (serverTask.IsStreaming)
        {
            sb.Append(", Streaming = true");
            sb.Append($", EstimatedChunks = {serverTask.EstimatedChunks}");
        }

        if (!string.IsNullOrEmpty(serverTask.Runtime) && serverTask.Runtime != "auto")
        {
            sb.Append($", Runtime = \"{serverTask.Runtime}\"");
        }

        if (serverTask.Parallel)
        {
            sb.Append(", Parallel = true");
        }

        sb.Append(")]");
        WriteLine(sb.ToString());
    }

    /// <summary>
    /// Writes [Validation] attribute for useValidation hooks.
    /// </summary>
    private void WriteValidationAttribute(ValidationModel validation)
    {
        var sb = new StringBuilder();
        sb.Append($"[Validation(\"{validation.FieldKey}\"");

        if (validation.Required)
        {
            sb.Append(", Required = true");
        }

        if (validation.MinLength.HasValue)
        {
            sb.Append($", MinLength = {validation.MinLength}");
        }

        if (validation.MaxLength.HasValue)
        {
            sb.Append($", MaxLength = {validation.MaxLength}");
        }

        if (validation.Min.HasValue)
        {
            sb.Append($", Min = {validation.Min}");
        }

        if (validation.Max.HasValue)
        {
            sb.Append($", Max = {validation.Max}");
        }

        if (!string.IsNullOrEmpty(validation.Pattern))
        {
            sb.Append($", Pattern = @\"{validation.Pattern}\"");
        }

        if (!string.IsNullOrEmpty(validation.Message) && validation.Message != "Validation failed")
        {
            sb.Append($", Message = \"{validation.Message}\"");
        }

        sb.Append(")]");
        WriteLine(sb.ToString());
    }

    #endregion

    #region Output Helpers

    private void Write(string text)
    {
        _sb.Append(text);
    }

    private void WriteLine(string text = "")
    {
        if (!string.IsNullOrEmpty(text))
        {
            WriteIndent();
            _sb.AppendLine(text);
        }
        else
        {
            _sb.AppendLine();
        }
    }

    private void WriteIndent()
    {
        for (int i = 0; i < _indentLevel; i++)
            _sb.Append(_options.IndentString);
    }

    #endregion
}
