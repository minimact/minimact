using System.Text;
using Reluxer.Extensions;
using Reluxer.Lexer;
using Reluxer.Matching;
using Reluxer.Tokens;
using Reluxer.Transformer.Models;
using Reluxer.Transformer.Visitors;

namespace Reluxer.Transformer;

/// <summary>
/// Generates C# code from parsed component models.
///
/// IMPORTANT: This generator should NOT do string manipulation for JS→C# conversion.
/// All conversions should happen via JsToCSharpVisitor on token arrays.
/// The analyzer (REL010/REL011) enforces this.
/// </summary>
public class CSharpGenerator
{
    private readonly TransformOptions _options;
    private readonly StringBuilder _sb = new();
    private int _indentLevel;
    private ComponentModel? _component;

    /// <summary>
    /// Converts JavaScript tokens to C# string using JsToCSharpVisitor.
    /// This is the ONLY way to convert JS→C# in the generator.
    /// </summary>
    private static string ToCSharp(Token[]? tokens)
    {
        if (tokens == null || tokens.Length == 0)
            return "";
#pragma warning disable REL014 // Final output conversion in generator
        return JsToCSharpVisitor.TransformToString(tokens);
#pragma warning restore REL014
    }

    /// <summary>
    /// Converts JavaScript tokens to C# string, with a fallback string if tokens are null.
    /// Prefer using token fields; this is for migration from legacy string fields.
    /// </summary>
    private static string ToCSharp(Token[]? tokens, string? fallback)
    {
#pragma warning disable REL014 // Final output conversion in generator
        if (tokens != null && tokens.Length > 0)
            return JsToCSharpVisitor.TransformToString(tokens);
#pragma warning restore REL014
        if (string.IsNullOrEmpty(fallback))
            return "";
        // Legacy fallback: tokenize the string then transform
        return ToCSharpFromString(fallback);
    }

    /// <summary>
    /// Converts a JavaScript string to C# by tokenizing first.
    /// This is a MIGRATION helper - prefer storing tokens in ComponentModel.
    /// </summary>
    [Obsolete("Prefer using token fields in ComponentModel. This exists for legacy code migration.")]
    private static string ToCSharpFromString(string jsExpr)
    {
        if (string.IsNullOrEmpty(jsExpr))
            return "";
        var lexer = new TsxLexer(jsExpr);
        var tokens = lexer.Tokenize().ToArray().LuxSignificant();
#pragma warning disable REL014 // Final output conversion in generator
        return JsToCSharpVisitor.TransformToString(tokens);
#pragma warning restore REL014
    }

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
            WriteUsings(components);
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

    private void WriteUsings(List<ComponentModel> components)
    {
        // Match proper Minimact output order
        WriteLine("using Minimact.AspNetCore.Core;");
        WriteLine("using Minimact.AspNetCore.Extensions;");
        WriteLine("using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;");
        WriteLine("using System.Collections.Generic;");
        WriteLine("using System.Linq;");
        WriteLine("using System.Threading.Tasks;");

        // Add HttpClient using if any component has ServerTasks
        if (components.Any(c => c.ServerTasks.Count > 0))
        {
            WriteLine("using System.Net.Http;");
        }
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

        // Note: ServerTask attributes are written on the methods, not on the class.
        // See GenerateServerTaskMethod for the actual attribute generation.

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
            // Prefer token-based initial value, fall back to string
            var initialValue = state.InitialValueTokens != null && state.InitialValueTokens.Length > 0
                ? ConvertInitialValueFromTokens(state.InitialValueTokens, state.Type)
                : ConvertInitialValue(state.InitialValue, state.Type);
            WriteLine($"private {csharpType} {state.Name} = {initialValue};");
            WriteLine();
        }

        // HttpClient for ServerTask methods
        if (component.ServerTasks.Count > 0)
        {
            WriteLine("private readonly HttpClient _httpClient;");
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

        // Server task methods
        foreach (var serverTask in component.ServerTasks)
        {
            WriteLine();
            GenerateServerTaskMethod(serverTask);
        }

        // GetClientHandlers() - returns JS handlers for client-side execution
        if (component.EventHandlers.Count > 0)
        {
            WriteLine();
            GenerateGetClientHandlers(component);
        }

        // State setters (for useState fields)
        var statesWithSetters = component.StateFields.Where(s => !string.IsNullOrEmpty(s.SetterName)).ToList();
        if (statesWithSetters.Count > 0)
        {
            WriteLine();
            WriteLine("// State setters");
            foreach (var state in statesWithSetters)
            {
                var csharpType = ConvertTypeToCSharp(state.Type);
                WriteLine($"private void {state.SetterName}({csharpType} value)");
                WriteLine("{");
                _indentLevel++;
                WriteLine($"{state.Name} = value;");
                WriteLine($"SetState(nameof({state.Name}), value);");
                _indentLevel--;
                WriteLine("}");
                WriteLine();
            }
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
    #pragma warning disable REL011 // Class name manipulation, not JS→C# conversion
    private void GenerateHookClass(ComponentModel hook)
    {
        // Convert useCounter -> UseCounterHook
        var className = char.ToUpper(hook.Name[0]) + hook.Name.Substring(1) + "Hook";
    #pragma warning restore REL011

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

        #pragma warning disable REL011 // Splitting for multi-line output formatting
        var body = ConvertHookMethodBody(helper.Body, hook);
        foreach (var line in body.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            WriteLine(line.Trim());
        }
        #pragma warning restore REL011

        _indentLevel--;
        WriteLine("}");
        WriteLine();
    }

    /// <summary>
    /// Converts a hook method body using token-based transformation.
    /// </summary>
    private string ConvertHookMethodBody(string body, ComponentModel hook)
    {
        if (string.IsNullOrWhiteSpace(body)) return "";

        var result = body.Trim();

        // Remove outer braces if present
        if (result.StartsWith("{") && result.EndsWith("}"))
            result = result[1..^1].Trim();

        // Apply token-based JS→C# conversion
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
        WriteLine(body);

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

    /// <summary>
    /// Converts a helper function body using token-based transformation.
    /// </summary>
    private string ConvertHelperBody(string body)
    {
        if (string.IsNullOrWhiteSpace(body)) return "";

        var result = body.Trim();

        // Remove outer braces if present
        if (result.StartsWith("{") && result.EndsWith("}"))
            result = result[1..^1].Trim();

        // Apply token-based JS→C# conversion
        // This handles: const/let→var, alert→Console.WriteLine, etc.
        result = ConvertExpression(result);

        // Ensure statements end with semicolons
        if (!string.IsNullOrEmpty(result) && !result.EndsWith(";") && !result.EndsWith("}"))
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
            // Prefer token-based fields, fall back to string fields for backwards compatibility
            var originalExpr = ToCSharp(handler.OriginalExpressionTokens, handler.OriginalExpression);
            var body = ToCSharp(handler.BodyTokens, handler.Body);
            var jsBody = FormatJsHandler(!string.IsNullOrEmpty(originalExpr) ? originalExpr : body);
            var comma = i < component.EventHandlers.Count - 1 ? "," : "";
            WriteLine($"[\"{handler.GeneratedName}\"] = @\"{jsBody}\"{comma}");
        }

        _indentLevel--;
        WriteLine("};");

        _indentLevel--;
        WriteLine("}");
    }

    /// <summary>
    /// Formats a JS handler for output in GetClientHandlers.
    /// This is OUTPUT formatting, not JS→C# conversion.
    /// The JS is preserved as-is for client-side execution.
    /// </summary>
    #pragma warning disable REL010, REL011 // Output formatting, not JS→C# conversion
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
    #pragma warning restore REL010, REL011

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
            // Multiple expressions with text parts
            if (text.BindingTokensList != null && text.TextParts != null)
            {
                // Build interpolated string from parts and converted expressions
                var sb = new System.Text.StringBuilder();
                for (int i = 0; i < text.TextParts.Count; i++)
                {
                    var part = text.TextParts[i];
                    // Check if this part is a placeholder like "{0}", "{1}", etc.
#pragma warning disable REL011 // Parsing placeholder format from visitor-provided template
                    if (part.StartsWith("{") && part.EndsWith("}") &&
                        int.TryParse(part.Substring(1, part.Length - 2), out var idx) &&
                        idx >= 0 && idx < text.BindingTokensList.Count)
#pragma warning restore REL011
                    {
                        var converted = ToCSharp(text.BindingTokensList[idx]);
                        sb.Append($"{{({converted})}}");
                    }
                    else
                    {
                        sb.Append(EscapeString(part));
                    }
                }
                Write($"new VText($\"{sb}\", \"{text.HexPath}\")");
            }
            // Single expression with tokens
            else if (text.BindingTokens != null && text.BindingTokens.Length > 0)
            {
                var convertedBinding = ToCSharp(text.BindingTokens);
                Write($"new VText($\"{{({convertedBinding})}}\", \"{text.HexPath}\")");
            }
            // Legacy: already converted binding string
            else if (!string.IsNullOrEmpty(text.Binding))
            {
                var binding = text.Binding;
                if (binding.Contains("{(") && binding.Contains(")}"))
                {
                    // Already in interpolated format
                    Write($"new VText($\"{binding}\", \"{text.HexPath}\")");
                }
                else
                {
                    var convertedBinding = ConvertExpression(binding);
                    Write($"new VText($\"{{({convertedBinding})}}\", \"{text.HexPath}\")");
                }
            }
            else
            {
                // Fallback empty
                Write($"new VText(\"\", \"{text.HexPath}\")");
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

        // Build the base expression with optional cast
        var baseExpr = needsCast ? $"((IEnumerable<dynamic>){arrayExpr})" : arrayExpr;

        // Apply chained methods (filter, sort, slice, etc.) as LINQ operations
        if (list.ChainedMethods != null && list.ChainedMethods.Count > 0)
        {
            foreach (var method in list.ChainedMethods)
            {
                baseExpr = ConvertArrayMethodToLinq(baseExpr, method.MethodName, method.ArgumentTokens);
            }
        }

        // Generate: baseExpr.Select(item => ...).ToArray()
        Write($"{baseExpr}.Select({list.ItemName} => ");

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

    /// <summary>
    /// Converts a JS array method call to its LINQ equivalent.
    /// Works directly on tokens.
    /// </summary>
    private string ConvertArrayMethodToLinq(string expr, string method, Token[] argsTokens)
    {
        return method switch
        {
            "filter" => $"{expr}.Where({ToCSharp(argsTokens)})",
            "sort" => ConvertSortToLinq(expr, argsTokens),
            "slice" => ConvertSliceToLinq(expr, argsTokens),
            "reverse" => $"{expr}.Reverse()",
            "concat" => $"{expr}.Concat({ToCSharp(argsTokens)})",
            "flat" => $"{expr}.SelectMany(x => x)",
            "flatMap" => $"{expr}.SelectMany({ToCSharp(argsTokens)})",
            "find" => $"{expr}.FirstOrDefault({ToCSharp(argsTokens)})",
            "findIndex" => $"{expr}.ToList().FindIndex(x => ({ToCSharp(argsTokens)})(x))",
            "some" => $"{expr}.Any({ToCSharp(argsTokens)})",
            "every" => $"{expr}.All({ToCSharp(argsTokens)})",
            "includes" => $"{expr}.Contains({ToCSharp(argsTokens)})",
            _ => $"{expr}.{method}({ToCSharp(argsTokens)})" // Fallback
        };
    }

    /// <summary>
    /// Converts JS .sort() to LINQ OrderBy/OrderByDescending.
    /// Parses comparator pattern from tokens: (a, b) => a.prop - b.prop
    /// Also handles complex block body comparators: (a, b) => { ... return xxx[a.prop] - xxx[b.prop]; }
    /// </summary>
    private string ConvertSortToLinq(string expr, Token[] argsTokens)
    {
        if (argsTokens.Length == 0)
        {
            return $"{expr}.OrderBy(x => x)";
        }

        // Pattern: (a, b) => body  OR  (a, b) => { block }
        var arrowMatcher = new PatternMatcher(@"(\Bp) ""=>"" (.*)", skipWhitespace: true);
        if (!arrowMatcher.TryMatch(argsTokens, 0, out var arrowMatch) || arrowMatch == null)
            return $"{expr}.OrderBy(x => x)";

        var paramTokens = arrowMatch.Captures[0].Tokens;
        var bodyTokens = arrowMatch.Captures[1].Tokens;

        // Extract param identifiers: (a, b) using LuxMatchAll
        var paramMatches = paramTokens.LuxMatchAll(@"\i").ToArray();
        if (paramMatches.Length < 2)
            return $"{expr}.OrderBy(x => x)";

        // When matching \i without parentheses, the identifier is in MatchedTokens, not Captures
        var aTokens = paramMatches[0].MatchedTokens;
        var bTokens = paramMatches[1].MatchedTokens;
        if (aTokens.Length == 0 || bTokens.Length == 0)
            return $"{expr}.OrderBy(x => x)";

        var a = aTokens[0].Value;
        var b = bTokens[0].Value;

        // Try to extract property from pattern: a.prop - b.prop or xxx[a.prop] - xxx[b.prop]
        var (prop, firstVar) = ExtractSortProperty(bodyTokens, a, b);

        if (prop != null)
        {
            var selector = $"x.{prop}";
            var isDescending = firstVar == b;

            return isDescending
                ? $"{expr}.OrderByDescending(x => {selector})"
                : $"{expr}.OrderBy(x => {selector})";
        }

        return $"{expr}.OrderBy(x => x)";
    }

    /// <summary>
    /// Extracts the sort property from tokens like "a.prop - b.prop" or "xxx[a.prop] - xxx[b.prop]".
    /// Returns (property, variable) where variable is either a or b.
    /// </summary>
    private (string? prop, string? var) ExtractSortProperty(Token[] tokens, string a, string b)
    {
        // Pattern 1: xxx[var.prop] - look for bracket access with member expression inside
        foreach (var bracketMatch in tokens.LuxMatchAll(@"(\Bk)"))
        {
            var innerTokens = bracketMatch.Captures[0].Tokens;
            // Look for var.prop inside brackets
            var memberMatcher = new PatternMatcher(@"(\i) ""."" (\i)", skipWhitespace: true);
            if (memberMatcher.TryMatch(innerTokens, 0, out var memberMatch) && memberMatch != null)
            {
                var varName = memberMatch.Captures[0].AsIdentifier();
                var propName = memberMatch.Captures[1].AsIdentifier();
                if (varName == a || varName == b)
                    return (propName, varName);
            }
        }

        // Pattern 2: simple var.prop
        foreach (var simpleMatch in tokens.LuxMatchAll(@"(\i) ""."" (\i)"))
        {
            var varName = simpleMatch.Captures[0].AsIdentifier();
            var propName = simpleMatch.Captures[1].AsIdentifier();
            if (varName == a || varName == b)
                return (propName, varName);
        }

        return (null, null);
    }

    /// <summary>
    /// Converts JS .slice() to LINQ Skip/Take.
    /// Parses args from tokens to find start and end values.
    /// </summary>
    private string ConvertSliceToLinq(string expr, Token[] argsTokens)
    {
        string start = "0";
        string end = "";

        // Pattern: start, end  OR  just start
        var twoArgMatcher = new PatternMatcher(@"(.*?) "","" (.*)", skipWhitespace: true);
        if (twoArgMatcher.TryMatch(argsTokens, 0, out var twoArgMatch) && twoArgMatch != null)
        {
            var startTokens = twoArgMatch.Captures[0].Tokens;
            var endTokens = twoArgMatch.Captures[1].Tokens;

            start = startTokens.Length == 1 && startTokens[0].Type == TokenType.Number
                ? startTokens[0].Value
                : ToCSharp(startTokens);
            end = endTokens.Length == 1 && endTokens[0].Type == TokenType.Number
                ? endTokens[0].Value
                : ToCSharp(endTokens);
        }
        else if (argsTokens.Length > 0)
        {
            // One arg: start only - match any number
            var numMatcher = new PatternMatcher(@"(\n)", skipWhitespace: true);
            if (numMatcher.TryMatch(argsTokens, 0, out var numMatch) && numMatch != null)
            {
                start = numMatch.Captures[0].Tokens[0].Value;
            }
            else
            {
                start = ToCSharp(argsTokens);
            }
        }

        if (string.IsNullOrEmpty(end))
        {
            return int.TryParse(start, out var startNum) && startNum == 0
                ? expr
                : $"{expr}.Skip({start})";
        }

        if (int.TryParse(start, out var s) && int.TryParse(end, out var e))
        {
            var count = e - s;
            return s == 0 ? $"{expr}.Take({count})" : $"{expr}.Skip({s}).Take({count})";
        }

        return $"{expr}.Skip({start}).Take({end} - {start})";
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

        #pragma warning disable REL011 // Splitting for multi-line output formatting
        // Prefer BodyTokens if available, fall back to Body string
        var body = handler.BodyTokens != null && handler.BodyTokens.Length > 0
            ? ConvertHandlerBodyFromTokens(handler.BodyTokens)
            : ConvertHandlerBody(handler.Body);
        if (!string.IsNullOrWhiteSpace(body))
        {
            foreach (var line in body.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                WriteLine(line.Trim());
            }
        }
        #pragma warning restore REL011

        _indentLevel--;
        WriteLine("}");
    }

    /// <summary>
    /// Generates a [ServerTask] method for useServerTask hooks.
    /// </summary>
    private void GenerateServerTaskMethod(ServerTaskModel serverTask)
    {
        // Write the attribute
        var attrSb = new StringBuilder();
        attrSb.Append($"[ServerTask(\"{serverTask.Name}\"");
        if (serverTask.IsStreaming)
        {
            attrSb.Append(", Streaming = true");
        }
        if (!string.IsNullOrEmpty(serverTask.Runtime) && serverTask.Runtime != "auto")
        {
            attrSb.Append($", Runtime = \"{serverTask.Runtime}\"");
        }
        if (serverTask.Parallel)
        {
            attrSb.Append(", Parallel = true");
        }
        attrSb.Append(")]");
        WriteLine(attrSb.ToString());

        // Build parameter list
        var parameters = new List<string>();

        // Add user-defined parameters
        foreach (var param in serverTask.Parameters)
        {
            var csharpType = ConvertTypeToCSharp(param.Type);
            parameters.Add($"{csharpType} {param.Name}");
        }

        // Add standard server task parameters
        if (serverTask.IsStreaming)
        {
            parameters.Add("[System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default");
        }
        else
        {
            parameters.Add("IProgress<double> progress = null");
            parameters.Add("CancellationToken cancellationToken = default");
        }

        var paramList = string.Join(", ", parameters);

        // Write method signature
        var returnType = serverTask.ReturnType ?? "Task<object>";
        var methodName = serverTask.Name;

        if (serverTask.IsStreaming)
        {
            WriteLine($"private async {returnType} {methodName}({paramList})");
        }
        else
        {
            WriteLine($"private async {returnType} {methodName}({paramList})");
        }

        WriteLine("{");
        _indentLevel++;

        // Write method body
        // Prefer token-based body, fall back to string for backwards compatibility
        var bodyStr = serverTask.BodyTokens != null
            ? ConvertServerTaskBody(serverTask.BodyTokens, serverTask.IsStreaming)
            : serverTask.Body;

        if (!string.IsNullOrWhiteSpace(bodyStr))
        {
            var body = bodyStr;

            // Clean up the body - remove outer braces if present
            body = body.Trim();
            if (body.StartsWith("{") && body.EndsWith("}"))
            {
                body = body[1..^1].Trim();
            }

            // Split into lines and write each
            #pragma warning disable REL011 // Splitting for multi-line output formatting
            foreach (var line in body.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                var trimmedLine = line.Trim();
                if (!string.IsNullOrWhiteSpace(trimmedLine))
                {
                    WriteLine(trimmedLine);
                }
            }
            #pragma warning restore REL011
        }
        else
        {
            // Empty body - just return default
            if (serverTask.IsStreaming)
            {
                WriteLine("yield break;");
            }
            else
            {
                WriteLine("return default;");
            }
        }

        _indentLevel--;
        WriteLine("}");
    }

    /// <summary>
    /// Converts server task body tokens to C# string.
    /// Handles streaming-specific transformations using token inspection.
    /// </summary>
    private string ConvertServerTaskBody(Token[] bodyTokens, bool isStreaming)
    {
        // Check for JS streaming patterns using token inspection
        var hasGetReader = bodyTokens.Any(t => t.Type == TokenType.Identifier && t.Value == "getReader");
        var hasReaderRead = bodyTokens.Any(t => t.Type == TokenType.Identifier && t.Value == "read");

        if (isStreaming && (hasGetReader || hasReaderRead))
        {
            // Extract URL from fetch pattern using token matching
            var url = ExtractFetchUrlFromTokens(bodyTokens) ?? "\"/api/stream\"";

            // Generate proper C# streaming code
            return $@"var response = await _httpClient.GetStreamAsync({url}, cancellationToken);
        using var reader = new System.IO.StreamReader(response);
        while (!reader.EndOfStream)
        {{
            if (cancellationToken.IsCancellationRequested) yield break;
            var line = await reader.ReadLineAsync();
            if (line != null) yield return line;
        }}";
        }

        // For streaming bodies, transform yield to yield return on tokens
        var tokensToConvert = isStreaming ? TransformYieldToYieldReturn(bodyTokens) : bodyTokens;

        // Transform tokens to C#
        return ToCSharp(tokensToConvert);
    }

    /// <summary>
    /// Extracts the URL from a fetch() call in tokens.
    /// </summary>
    private string? ExtractFetchUrlFromTokens(Token[] tokens)
    {
        // Look for pattern: fetch ( url or PostAsync ( url
        for (int i = 0; i < tokens.Length - 2; i++)
        {
            if (tokens[i].Type == TokenType.Identifier &&
                (tokens[i].Value == "fetch" || tokens[i].Value == "PostAsync") &&
                tokens[i + 1].Value == "(")
            {
                // Next token after ( should be the URL (string or identifier)
                var urlToken = tokens[i + 2];
                if (urlToken.Type == TokenType.String)
                {
                    return urlToken.Value;
                }
                if (urlToken.Type == TokenType.TemplateString)
                {
                    return "$" + urlToken.Value;
                }
            }
        }
        return null;
    }

    /// <summary>
    /// Transforms JS yield to C# yield return by inserting "return" token after each "yield" keyword.
    /// </summary>
    private Token[] TransformYieldToYieldReturn(Token[] tokens)
    {
        var result = new List<Token>();
        for (int i = 0; i < tokens.Length; i++)
        {
            result.Add(tokens[i]);

            // If this is a yield keyword, insert "return" after it
            if (tokens[i].Type == TokenType.Keyword && tokens[i].Value == "yield")
            {
                // Check if next non-whitespace token is already "return"
                var nextNonWs = tokens.Skip(i + 1).FirstOrDefault(t => t.Type != TokenType.Whitespace);
                if (nextNonWs == null || nextNonWs.Value != "return")
                {
                    result.Add(Token.Keyword("return"));
                }
            }
        }
        return result.ToArray();
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
            "List<dynamic>" => "List<dynamic>",
            "IEnumerable<dynamic>" => "IEnumerable<dynamic>",
            "Dictionary<string, object>" => "Dictionary<string, object>",
            _ when tsType.StartsWith("List<") => tsType, // Preserve List<T> types
            _ when tsType.StartsWith("IEnumerable<") => tsType, // Preserve IEnumerable<T> types
            _ => "object"
        };
    }

    /// <summary>
    /// Converts a state field's initial value to C#.
    /// Uses token-based conversion via ConvertExpression.
    /// </summary>
    private string ConvertInitialValue(string? value, string type)
    {
        if (string.IsNullOrEmpty(value)) return "null";

        // Simple types pass through without conversion
        if (value == "true" || value == "false") return value;
        if (value == "null") return "null";
        if (int.TryParse(value, out _) || double.TryParse(value, out _)) return value;

        // Use token-based conversion for everything else
        return ConvertExpression(value);
    }

    /// <summary>
    /// Converts initial value tokens to C# string.
    /// Uses JsToCSharpVisitor for transformation.
    /// </summary>
    private string ConvertInitialValueFromTokens(Token[] tokens, string type)
    {
        if (tokens == null || tokens.Length == 0) return "null";

        // Transform JS tokens to C# tokens
        var transformed = JsToCSharpVisitor.Transform(tokens);

        // Output tokens as string
        return OutputTokens(transformed);
    }

    /// <summary>
    /// Converts a JavaScript expression to C# using token-based transformation.
    /// All JS→C# conversion is handled by JsToCSharpVisitor.
    /// </summary>
    private string ConvertExpression(string expr)
    {
        if (string.IsNullOrWhiteSpace(expr)) return "null";

        #pragma warning disable CS0618 // Suppress obsolete warning - this is the migration path
        return ToCSharpFromString(expr);
        #pragma warning restore CS0618
    }

    // ========================================================================
    // ALL STRING MANIPULATION METHODS DELETED!
    // JS→C# conversion now handled by JsToCSharpVisitor using token patterns.
    // See: Visitors/JsToCSharpVisitor.cs
    // ========================================================================

    /// <summary>
    /// Converts a condition expression to C# using token-based transformation.
    /// </summary>
    private string ConvertCondition(string condition)
    {
        if (string.IsNullOrWhiteSpace(condition)) return "true";
        return ConvertExpression(condition);
    }

    /// <summary>
    /// Converts an event handler body to C# using token-based transformation.
    /// Handles setter calls (setXxx -> SetState) via JsToCSharpVisitor.
    /// </summary>
    private string ConvertHandlerBody(string body)
    {
        if (string.IsNullOrWhiteSpace(body)) return "";

        var result = body.Trim();

        // Strip outer braces if present
        if (result.StartsWith("{") && result.EndsWith("}"))
            result = result[1..^1].Trim();

        // Apply token-based conversion
        result = ConvertExpression(result);

        // Ensure statements end with semicolons
        if (!string.IsNullOrEmpty(result) && !result.EndsWith(";") && !result.EndsWith("}"))
            result += ";";

        return result;
    }

    /// <summary>
    /// Converts an event handler body from tokens to C#.
    /// Uses token-based transformation via JsToCSharpVisitor for:
    /// - Setter calls (setXxx -> SetState)
    /// - JS→C# syntax conversions (===, filter, etc.)
    /// </summary>
    private string ConvertHandlerBodyFromTokens(Token[] bodyTokens)
    {
        if (bodyTokens == null || bodyTokens.Length == 0) return "";

        // Transform JS tokens to C# tokens
        var transformed = JsToCSharpVisitor.Transform(bodyTokens);

        // Check last significant token to see if we need a semicolon
        var significant = transformed.LuxTrimWhitespace();
        if (significant.Length > 0)
        {
            var lastToken = significant[significant.Length - 1];
            // Add semicolon if not already ending with ; or }
            if (lastToken.Value != ";" && lastToken.Value != "}")
            {
                transformed = transformed.Concat(new[] { Token.Punctuation(";") }).ToArray();
            }
        }

        // Output tokens with proper spacing
        return OutputTokens(transformed);
    }

    /// <summary>
    /// Outputs tokens as a string with proper spacing.
    /// This is the final output step - tokens have already been transformed.
    /// </summary>
    private static string OutputTokens(Token[] tokens)
    {
        if (tokens.Length == 0) return "";

        var sb = new System.Text.StringBuilder();
        Token? prev = null;

        foreach (var token in tokens)
        {
            if (prev != null && NeedsSpaceBetween(prev, token))
            {
                sb.Append(' ');
            }
            sb.Append(token.Value);
            prev = token;
        }

        return sb.ToString();
    }

    /// <summary>
    /// Determines if a space is needed between two tokens for output.
    /// </summary>
    private static bool NeedsSpaceBetween(Token prev, Token next)
    {
        // Keywords need space before identifiers
        if (prev.Type == TokenType.Keyword &&
            (next.Type == TokenType.Identifier || next.Type == TokenType.Keyword))
            return true;

        // After identifier/keyword, before another identifier/keyword
        if ((prev.Type == TokenType.Identifier || prev.Type == TokenType.Keyword) &&
            (next.Type == TokenType.Identifier || next.Type == TokenType.Keyword))
            return true;

        // After comma
        if (prev.Value == ",")
            return true;

        // Around operators (but not . or parens)
        if (prev.Type == TokenType.Operator && prev.Value != "." &&
            (next.Type == TokenType.Identifier || next.Type == TokenType.Number))
            return true;

        if (next.Type == TokenType.Operator && next.Value != "." &&
            (prev.Type == TokenType.Identifier || prev.Type == TokenType.Number ||
             prev.Value == ")" || prev.Value == "]"))
            return true;

        return false;
    }

    private bool HasTextContent(VElementModel element)
    {
        return element.Children.Any(c => c is VTextModel);
    }

    /// <summary>
    /// Escapes a C# string literal. This is NOT JS→C# conversion,
    /// just proper C# string escaping for output.
    /// </summary>
    #pragma warning disable REL011 // String escaping is legitimate here
    private string EscapeString(string s)
    {
        return s.Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\n", "\\n")
                .Replace("\r", "\\r")
                .Replace("\t", "\\t");
    }
    #pragma warning restore REL011

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
    #pragma warning disable REL011 // Escaping quotes for verbatim string output
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
    #pragma warning restore REL011

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
    /// This is output formatting, not JS→C# conversion.
    /// </summary>
    #pragma warning disable REL011 // JSON string escaping for output
    private string EscapeJsonString(string s)
    {
        return s.Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\n", "\\n")
                .Replace("\r", "\\r")
                .Replace("\t", "\\t");
    }
    #pragma warning restore REL011

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
