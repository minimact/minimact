using Reluxer.Attributes;
using Reluxer.Matching;
using Reluxer.Tokens;
using Reluxer.Transformer.Models;
using Reluxer.Visitor;

namespace Reluxer.Transformer.Visitors;

/// <summary>
/// Visitor that extracts useState hooks from component bodies.
/// Matches: const [name, setName] = useState(initialValue);
/// </summary>
public class StateVisitor : TokenVisitor
{
    private readonly ComponentModel _component;
    private Token[]? _componentBody;

    public StateVisitor(ComponentModel component)
    {
        _component = component;
    }

    public override void OnBegin(IReadOnlyList<Token> tokens)
    {
        // Get the component body from shared context (set by ComponentVisitor)
        _componentBody = Context.Get<Token[]>($"ComponentBody:{_component.Name}");

        Console.WriteLine($"[StateVisitor] Processing component: {_component.Name}, body tokens: {_componentBody?.Length ?? 0}");

        if (_componentBody != null && _componentBody.Length > 0)
        {
            // Debug: Show first tokens with more detail
            var firstTokens = string.Join(" ", _componentBody.Take(15).Select(t => $"[{t.Type}]'{t.Value}'"));
            Console.WriteLine($"[StateVisitor] First tokens: {firstTokens}");

            // Traverse just the component body
            Traverse(_componentBody,
                nameof(VisitUseState),
                nameof(VisitUseStateGeneric),
                nameof(VisitUseMvcStateImmutable),
                nameof(VisitUseMvcStateMutable),
                nameof(VisitUseMvcViewModel),
                nameof(VisitHelperFunction),
                nameof(VisitHelperFunctionNoParams),
                nameof(VisitLiftedState),
                nameof(VisitLocalVariable));
        }
    }

    // Match: const [name, setName] = useState(value)
    [TokenPattern(@"\k""const"" ""["" (\i) "","" (\i) ""]"" ""="" \i""useState"" ""(""", Name = "VisitUseState")]
    public void VisitUseState(TokenMatch match, string stateName, string setterName)
    {
        // Skip if already added (prevent duplicates)
        if (_component.StateFields.Any(sf => sf.Name == stateName))
            return;

        var stateField = new StateField
        {
            Name = stateName,
            SetterName = setterName,
            HookIndex = _component.NextHookIndex++
        };

        // Extract initial value from parentheses
        var initValueTokens = ExtractParenthesized(match.MatchedTokens.Length - 1);
        if (initValueTokens.Length > 0)
        {
            stateField.InitialValue = TokensToString(initValueTokens);
            stateField.Type = InferType(initValueTokens);
        }
        else
        {
            stateField.InitialValue = "null";
            stateField.Type = "object";
        }

        _component.StateFields.Add(stateField);

        // Skip past the useState call
        SkipBalanced("(", ")");
    }

    // Match: const [name, setName] = useState<Type>(value) - TypeScript generic syntax
    // Handles: useState<Todo[]>([...]), useState<string>(""), useState<number>(0)
    [TokenPattern(@"\k""const"" ""["" (\i) "","" (\i) ""]"" ""="" \i""useState"" \go", Priority = 110, Name = "VisitUseStateGeneric",
        Debug = "const [todos, setTodos] = useState<Todo[]>([])")]
    public void VisitUseStateGeneric(TokenMatch match, string stateName, string setterName)
    {
        // Skip if already added (prevent duplicates)
        if (_component.StateFields.Any(sf => sf.Name == stateName))
            return;

        var stateField = new StateField
        {
            Name = stateName,
            SetterName = setterName,
            HookIndex = _component.NextHookIndex++
        };

        // Skip past the generic type parameters (between < and >)
        SkipBalanced("<", ">");

        // Now extract initial value from parentheses
        var initValueTokens = ExtractParenthesized(0);
        if (initValueTokens.Length > 0)
        {
            var initValue = TokensToString(initValueTokens);
            stateField.InitialValue = initValue;

            // Check if it's an array initializer with objects
            if (initValue.TrimStart().StartsWith("["))
            {
                stateField.Type = "List<dynamic>";
                stateField.InitialValue = ConvertArrayInitializer(initValue);
            }
            else
            {
                stateField.Type = InferType(initValueTokens);
            }
        }
        else
        {
            stateField.InitialValue = "null";
            stateField.Type = "object";
        }

        _component.StateFields.Add(stateField);

        // Skip past the useState call
        SkipBalanced("(", ")");
    }

    /// <summary>
    /// Converts a JS array initializer with object literals to C# List initializer.
    /// e.g., [{ id: 1, text: 'hello' }, { id: 2, text: 'world' }]
    /// -> new List<object> { new { id = 1, text = "hello" }, new { id = 2, text = "world" } }
    /// </summary>
    private string ConvertArrayInitializer(string jsArray)
    {
        var trimmed = jsArray.Trim();
        if (!trimmed.StartsWith("[") || !trimmed.EndsWith("]"))
            return $"new List<object> {{ {trimmed} }}";

        var inner = trimmed[1..^1].Trim();
        if (string.IsNullOrWhiteSpace(inner))
            return "new List<object>()";

        // Parse individual object literals using functional approach
        var objects = SplitAtDepthZero(inner, ',')
            .Select(obj => obj.Trim())
            .Where(obj => !string.IsNullOrWhiteSpace(obj))
            .Select(ConvertObjectLiteral)
            .ToList();

        return $"new List<object> {{ {string.Join(", ", objects)} }}";
    }

    /// <summary>
    /// Converts a JS object literal to C# anonymous type.
    /// e.g., { id: 1, text: 'hello', done: false }
    /// -> new { id = 1, text = "hello", done = false }
    /// </summary>
    private string ConvertObjectLiteral(string jsObject)
    {
        var trimmed = jsObject.Trim();
        if (!trimmed.StartsWith("{") || !trimmed.EndsWith("}"))
            return trimmed; // Not an object literal

        var inner = trimmed[1..^1].Trim();
        if (string.IsNullOrWhiteSpace(inner))
            return "new { }";

        // Parse key: value pairs using functional approach
        var props = SplitAtDepthZero(inner, ',')
            .Select(prop => prop.Trim())
            .Where(prop => !string.IsNullOrWhiteSpace(prop))
            .Select(ConvertProperty)
            .ToList();

        return $"new {{ {string.Join(", ", props)} }}";
    }

    /// <summary>
    /// Converts a single JS property to C# property.
    /// e.g., "id: 1" -> "id = 1"
    ///       "text: 'hello'" -> "text = \"hello\""
    /// </summary>
    private string ConvertProperty(string prop)
    {
        var colonIdx = prop.IndexOf(':');
        if (colonIdx < 0)
            return prop; // Shorthand property like { foo } - keep as is

        var key = prop[..colonIdx].Trim();
        var value = prop[(colonIdx + 1)..].Trim();

        // Convert value: single quotes to double quotes
        value = ConvertJsValue(value);

        return $"{key} = {value}";
    }

    /// <summary>
    /// Converts JS values to C# values.
    /// </summary>
    private string ConvertJsValue(string value)
    {
        // Single quoted string -> double quoted
        if (value.StartsWith("'") && value.EndsWith("'"))
            return "\"" + value[1..^1] + "\"";

        // Handle nested object literals
        if (value.TrimStart().StartsWith("{"))
            return ConvertObjectLiteral(value);

        // Handle nested arrays
        if (value.TrimStart().StartsWith("["))
            return ConvertArrayInitializer(value);

        return value;
    }

    /// <summary>
    /// Splits a string at a delimiter, but only when bracket depth is zero.
    /// Uses functional Aggregate pattern instead of imperative for loop.
    /// </summary>
    private IEnumerable<string> SplitAtDepthZero(string input, char delimiter)
    {
        // Use Aggregate to track state: (currentSegment, depth, results)
        var result = input.Aggregate(
            (segment: "", depth: 0, results: new List<string>()),
            (acc, c) =>
            {
                var newDepth = c switch
                {
                    '{' or '[' or '(' => acc.depth + 1,
                    '}' or ']' or ')' => acc.depth - 1,
                    _ => acc.depth
                };

                if (c == delimiter && acc.depth == 0)
                {
                    // Split point: add current segment to results, start new segment
                    acc.results.Add(acc.segment);
                    return ("", newDepth, acc.results);
                }
                else
                {
                    // Continue building current segment
                    return (acc.segment + c, newDepth, acc.results);
                }
            });

        // Don't forget the last segment
        if (!string.IsNullOrEmpty(result.segment))
            result.results.Add(result.segment);

        return result.results;
    }

    // Match: const [name] = useMvcState<Type>('key') - immutable
    // Use \go and \gc for generic type angle brackets, \o for operator =
    [TokenPattern(@"\k""const"" ""["" (\i) ""]"" \o""="" \i""useMvcState"" \go (\tn) \gc ""("" (\s)", Name = "VisitUseMvcStateImmutable")]
    public void VisitUseMvcStateImmutable(TokenMatch match, string localName, string typeName, string viewModelKey)
    {
        var cleanKey = viewModelKey.Trim('\'', '"');

        // Skip if already added (prevent duplicates)
        if (_component.MvcStateFields.Any(f => f.LocalName == localName))
            return;

        _component.MvcStateFields.Add(new MvcStateField
        {
            LocalName = localName,
            ViewModelKey = cleanKey,
            Type = MapTsTypeToCSharp(typeName),
            SetterName = "", // No setter for immutable
            HookIndex = _component.NextHookIndex++
        });
    }

    // Match: const [name, setName] = useMvcState<Type>('key'...) - mutable
    [TokenPattern(@"\k""const"" ""["" (\i) "","" (\i) ""]"" \o""="" \i""useMvcState"" \go (\tn) \gc ""("" (\s)", Name = "VisitUseMvcStateMutable")]
    public void VisitUseMvcStateMutable(TokenMatch match, string localName, string setterName, string typeName, string viewModelKey)
    {
        var cleanKey = viewModelKey.Trim('\'', '"');

        // Skip if already added (prevent duplicates)
        if (_component.MvcStateFields.Any(f => f.LocalName == localName))
            return;

        _component.MvcStateFields.Add(new MvcStateField
        {
            LocalName = localName,
            ViewModelKey = cleanKey,
            Type = MapTsTypeToCSharp(typeName),
            SetterName = setterName,
            HookIndex = _component.NextHookIndex++
        });
    }

    // Match: const viewModel = useMvcViewModel<Type>()
    [TokenPattern(@"\k""const"" (\i) \o""="" \i""useMvcViewModel"" \go", Name = "VisitUseMvcViewModel")]
    public void VisitUseMvcViewModel(TokenMatch match, string varName)
    {
        _component.HasMvcViewModel = true;
    }

    // Match: const name = (params) => { body } - helper function with parameters
    // Use \fa (Arrow type) since tokenizer outputs => as Arrow when params present
    [TokenPattern(@"\k""const"" (\i) \o""="" (\Bp) \fa (\Bb)", Name = "VisitHelperFunction")]
    public void VisitHelperFunction(TokenMatch match, string funcName, Token[] paramsTokens, Token[] bodyTokens)
    {
        AddHelperFunction(funcName, paramsTokens, bodyTokens);
    }

    // Match: const name = () => { body } - helper function without parameters
    // Use \fa (Arrow type) - tokenizer now consistently outputs => as Arrow
    [TokenPattern(@"\k""const"" (\i) \o""="" \p""("" \p"")"" \fa (\Bb)", Priority = 90, Name = "VisitHelperFunctionNoParams")]
    public void VisitHelperFunctionNoParams(TokenMatch match, string funcName, Token[] bodyTokens)
    {
        AddHelperFunction(funcName, Array.Empty<Token>(), bodyTokens);
    }

    private void AddHelperFunction(string funcName, Token[] paramsTokens, Token[] bodyTokens)
    {
        // Only capture helper functions (lowercase start)
        if (char.IsUpper(funcName[0])) return;

        // Skip handlers (they're handled by HandlerVisitor)
        if (funcName.StartsWith("handle", StringComparison.OrdinalIgnoreCase) ||
            funcName.EndsWith("Handler", StringComparison.OrdinalIgnoreCase) ||
            funcName.StartsWith("on", StringComparison.OrdinalIgnoreCase))
            return;

        // Skip if already added (prevent duplicates)
        if (_component.HelperFunctions.Any(h => h.Name == funcName))
            return;

        var helper = new HelperFunction
        {
            Name = funcName,
            Body = TokensToString(bodyTokens)
        };

        // Extract parameter names using pattern matching
        // \i matches identifiers; we filter out type annotations
        var typeAnnotations = new HashSet<string> { "number", "string", "boolean" };
        var identMatcher = new PatternMatcher(@"(\i)", skipWhitespace: true);
        var matches = PatternMatcher.MatchAll(paramsTokens, 0, (identMatcher, TokenMatchType.Unknown, "ident"));
        foreach (var match in matches)
        {
            var paramName = match.Match.Captures[0].AsIdentifier();
            if (paramName != null && !typeAnnotations.Contains(paramName))
                helper.Parameters.Add(paramName);
        }

        _component.HelperFunctions.Add(helper);
    }

    // Match: const varName = state["Component.key"] for lifted state reads
    // Higher priority (150) because it's more specific than general local variable pattern
    [TokenPattern(@"\k""const"" (\i) ""="" \i""state"" ""["" (\s)", Priority = 150, Name = "VisitLiftedState")]
    public void VisitLiftedState(TokenMatch match, string varName, string stateKeyString)
    {
        Console.WriteLine($"[StateVisitor] VisitLiftedState matched: varName={varName}, stateKey={stateKeyString}");

        var stateKey = stateKeyString.Trim('"', '\'');

        // Skip if already added (prevent duplicates)
        if (_component.LiftedStateReads.Any(lsr => lsr.LocalName == varName))
            return;

        _component.LiftedStateReads.Add(new LiftedStateRead
        {
            LocalName = varName,
            StateKey = stateKey
        });
    }

    // Match: const varName = expression; (simple local variable)
    // Low priority so other const patterns match first
    // Uses .*? to match any tokens until semicolon
    [TokenPattern(@"\k""const"" (\i) ""="" (.*?) "";""", Priority = 10, Name = "VisitLocalVariable")]
    public void VisitLocalVariable(TokenMatch match, string varName, Token[] exprTokens)
    {
        // Skip helper functions (already handled)
        if (_component.HelperFunctions.Any(h => h.Name == varName))
            return;

        // Skip if it looks like a function (has arrow)
        var expr = TokensToString(exprTokens);
        if (expr.Contains("=>"))
            return;

        // Skip state-related and hooks (already handled)
        if (expr.Contains("useState") || expr.Contains("useMvcState") || expr.Contains("useMvcViewModel") || expr.Contains("useServerTask"))
            return;

        // Skip lifted state reads (already handled by VisitLiftedState)
        // Pattern: state["Component.key"]
        if (expr.StartsWith("state["))
            return;

        // Skip variables that appear to be inside function bodies (JS-specific patterns)
        // These typically come from inside useServerTask bodies or event handlers
        if (expr.Contains(".body") || expr.Contains("getReader") || expr.Contains(".read()"))
            return;

        // Skip await expressions - these are inside async functions, not top-level
        if (expr.StartsWith("await") || expr.Contains(" await "))
            return;

        // Skip if already added (prevent duplicates)
        if (_component.LocalVariables.Any(lv => lv.Name == varName))
            return;

        _component.LocalVariables.Add(new LocalVariable
        {
            Name = varName,
            Expression = expr,
            IsConst = true
        });
    }

    private string MapTsTypeToCSharp(string tsType)
    {
        return tsType switch
        {
            "string" => "string",
            "number" => "double",
            "boolean" => "bool",
            _ => "object"
        };
    }

    private string TokensToString(Token[] tokens)
    {
        return string.Join("", tokens.Select(t => t.Value));
    }

    private string InferType(Token[] tokens)
    {
        if (tokens.Length == 0) return "object";

        // Use pattern matching for type inference
        // \n matches number literals
        var numberMatcher = new PatternMatcher(@"(\n)", skipWhitespace: true);
        if (numberMatcher.TryMatch(tokens, 0, out var numMatch) && numMatch != null)
        {
            var numToken = numMatch.GetCapturedToken(0);
            return numToken?.Value.Contains('.') == true ? "double" : "int";
        }

        // \s matches string literals
        var stringMatcher = new PatternMatcher(@"(\s)", skipWhitespace: true);
        if (stringMatcher.TryMatch(tokens, 0, out _))
        {
            return "string";
        }

        // \k"true" and \k"false" for booleans
        var trueMatcher = new PatternMatcher(@"\k""true""", skipWhitespace: true);
        var falseMatcher = new PatternMatcher(@"\k""false""", skipWhitespace: true);
        if (trueMatcher.TryMatch(tokens, 0, out _) || falseMatcher.TryMatch(tokens, 0, out _))
        {
            return "bool";
        }

        // "[" for array literal
        var arrayMatcher = new PatternMatcher(@"""[""", skipWhitespace: true);
        if (arrayMatcher.TryMatch(tokens, 0, out _))
        {
            return "List<object>";
        }

        // "{" for object literal
        var objectMatcher = new PatternMatcher(@"""{""", skipWhitespace: true);
        if (objectMatcher.TryMatch(tokens, 0, out _))
        {
            return "Dictionary<string, object>";
        }

        return "object";
    }
}
