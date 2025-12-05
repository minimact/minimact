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
        // Hook classes get special treatment
        if (component.IsHook)
        {
            GenerateHookClass(component);
            return;
        }

        // Timeline attributes (before [Component])
        if (component.TimelineConfig != null)
        {
            WriteTimelineAttributes(component.TimelineConfig);
        }

        WriteLine("[Component]");
        var partial = _options.GeneratePartialClasses ? "partial " : "";
        WriteLine($"public {partial}class {component.Name} : MinimactComponent");
        WriteLine("{");
        _indentLevel++;

        // Props (component parameters)
        foreach (var prop in component.Props)
        {
            WriteLine("[Prop]");
            // Use dynamic for JS props (they could be functions, arrays, objects, etc.)
            var csharpType = "dynamic";
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

        // viewModel field (useMvcViewModel)
        if (component.HasMvcViewModel)
        {
            WriteLine("// useMvcViewModel - read-only access to entire ViewModel");
            WriteLine("private dynamic viewModel = null;");
            WriteLine();
        }

        // Render method
        WriteLine("protected override VNode Render()");
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

        // Lifted state reads (from child components)
        if (component.LiftedStateReads.Count > 0)
        {
            foreach (var liftedState in component.LiftedStateReads)
            {
                WriteLine($"var {liftedState.LocalName} = GetState<dynamic>(\"{liftedState.StateKey}\");");
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
        else if (element.Children.Count == 1 && element.Children[0] is VTextModel textChild && !textChild.IsDynamic)
        {
            // Single static text child - inline it
            var escapedText = EscapeString(textChild.Text);
            Write($"new VElement(\"{tag}\", \"{path}\", {attrs}, \"{escapedText}\")");
        }
        else if (hasListChild)
        {
            // Use MinimactHelpers.createElement for elements containing list children
            // (Select().ToArray() results need varargs handling)
            Write($"MinimactHelpers.createElement(\"{tag}\", {attrs}, ");

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
            var binding = ConvertExpression(text.Binding ?? "");
            Write($"new VText($\"{{({binding})}}\", \"{text.HexPath}\")");
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
            Write($"[\"{kv.Key}\"] = {ConvertInitialValue(kv.Value, "object")}");
            if (i < stateItems.Count - 1) Write(", ");
        }

        WriteLine(" }");
        _indentLevel--;
        WriteIndent();
        Write("}");
    }

    private void GenerateList(VListModel list)
    {
        var arrayExpr = ConvertExpression(list.ArrayExpression);

        // Generate: ((IEnumerable<dynamic>)arrayExpr).Select(item => ...).ToArray()
        // Cast to IEnumerable<dynamic> to avoid dynamic dispatch issues with lambda
        Write($"((IEnumerable<dynamic>){arrayExpr}).Select({list.ItemName} => ");

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
        // Add loop item parameter if handler is inside a loop
        var paramList = handler.LoopItemName != null ? $"dynamic {handler.LoopItemName}" : "";
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
        // Simple conversion - in real implementation, parse properly
        return $"new Dictionary<string, object> {{ /* {obj} */ }}";
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

        // Convert JS single-quoted strings to C# double-quoted strings
        // 'text' -> "text"
        // But be careful not to convert char literals or strings inside template literals
        expr = ConvertSingleQuotedStrings(expr);

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

        // Simple pattern: setXxx(value) -> SetState(nameof(xxx), value)
        // Exclude "SetState" (already converted above) by requiring lowercase start after "set"
        var setterPattern = new System.Text.RegularExpressions.Regex(
            @"(?<!Set)set([A-Z]\w*)\(([^)]+)\)");

        result = setterPattern.Replace(result, match => ConvertSetterCall(match.Value));

        // Ensure statements end with semicolons
        if (!string.IsNullOrEmpty(result) && !result.EndsWith(";") && !result.EndsWith("}"))
        {
            result += ";";
        }

        return result;
    }

    private string ConvertSetterCall(string call)
    {
        // Convert setXxx(value) to SetState(nameof(xxx), value)
        var setterMatch = System.Text.RegularExpressions.Regex.Match(call, @"set([A-Z]\w*)\(([^)]+)\)");
        if (setterMatch.Success)
        {
            var fieldName = char.ToLower(setterMatch.Groups[1].Value[0]) + setterMatch.Groups[1].Value[1..];
            var value = setterMatch.Groups[2].Value.Trim();
            // Normalize spacing around operators
            value = System.Text.RegularExpressions.Regex.Replace(value, @"(\w+)\s*([+\-*/])\s*(\d+)", "$1 $2 $3");
            return $"SetState(nameof({fieldName}), {value})";
        }
        return call;
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
