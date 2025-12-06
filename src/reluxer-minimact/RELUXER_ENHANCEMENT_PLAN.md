# Reluxer Enhancement Plan

This document outlines the comprehensive plan to enhance Reluxer to achieve full parity with—and exceed—the Babel plugin's capabilities.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Phase 1: Core Fixes (P0)](#phase-1-core-fixes-p0)
3. [Phase 2: Expression Enhancement (P1)](#phase-2-expression-enhancement-p1)
4. [Phase 3: Special Hooks (P2)](#phase-3-special-hooks-p2)
5. [Phase 4: Advanced Features (P3)](#phase-4-advanced-features-p3)
6. [Phase 5: Exceeding Babel (P4)](#phase-5-exceeding-babel-p4)
7. [Implementation Details](#implementation-details)
8. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

### Current Reluxer Pipeline

```
TSX Source
    │
    ▼
┌─────────────┐
│  TsxLexer   │  Token stream with state machine
└─────────────┘
    │
    ▼
┌─────────────────────┐
│  TsxTransformer     │  9-phase visitor pipeline
│  ├── ComponentVisitor
│  ├── PropsVisitor
│  ├── CustomHookVisitor
│  ├── StateVisitor
│  ├── EffectVisitor
│  ├── RefVisitor
│  ├── TimelineVisitor
│  ├── HandlerVisitor
│  └── JsxVisitor
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Generators         │
│  ├── CSharpGenerator
│  ├── TemplateGenerator
│  ├── HooksGenerator
│  ├── StructuralChangesGenerator
│  └── KeysGenerator
└─────────────────────┘
    │
    ▼
Output Files (.cs, .templates.json, .hooks.json, etc.)
```

### Reluxer's Unique Advantages

1. **Pattern-Based Visitors** - Declarative `[TokenPattern]` attributes
2. **Balanced Bracket Matchers** - `\Bp`, `\Bb`, `\Bk`, `\Bj` for perfect nesting
3. **Named Captures** - `(?<name>\i)` with backreferences `\k<name>`
4. **Token Manipulation** - `InsertAfter`, `Replace`, `Remove` for source transforms
5. **Scoped Traversal** - `[From]` attribute restricts visitor scope
6. **Dependency Injection** - `[Inject]` passes values between visitors
7. **No AST Overhead** - Direct token manipulation, no tree construction

---

## Phase 1: Core Fixes (P0)

**Timeline**: Immediate priority
**Impact**: Fixes broken basic functionality

### 1.1 Chained Array Methods

**Problem**: Reluxer outputs raw JS instead of parsing `.filter().map()` chains.

**Current Output** (WRONG):
```csharp
new VText($"{(todos.filter(todo=>!todo.done).map(todo=>(<li>{todo.text}</li>)))}", "1.2.2.1")
```

**Expected Output**:
```csharp
((IEnumerable<dynamic>)todos.Where(todo => !todo.done).ToList())
    .Select(todo => new VElement("li", "1.2.2.1.1", new Dictionary<string, string>(),
        new VNode[] { new VText($"{(todo.text)}", "1.2.2.1.1.1") }))
    .ToArray()
```

**Implementation**:

```csharp
// In JsxVisitor.cs - enhance TryParseMapCall

[TokenPattern(@"(?<array>\i)(?<chain>(\.\k""filter""\Bp|\.\k""sort""\Bp|\.\k""slice""\Bp)*)\.\k""map""\((?<callback>\Bp)\)")]
public void VisitChainedMapCall(Token[] tokens, Match match)
{
    var arrayName = match.Groups["array"].Value;
    var chain = match.Groups["chain"].Value;
    var callback = match.Groups["callback"].Value;

    // Parse chain operations
    var operations = ParseChainOperations(chain);

    // Build LINQ chain
    var linqChain = new StringBuilder($"((IEnumerable<dynamic>){arrayName})");

    foreach (var op in operations)
    {
        switch (op.Method)
        {
            case "filter":
                linqChain.Append($".Where({ConvertArrowToLambda(op.Args)})");
                break;
            case "sort":
                linqChain.Append($".OrderBy({ConvertSortToOrderBy(op.Args)})");
                break;
            case "slice":
                var (skip, take) = ParseSliceArgs(op.Args);
                if (skip > 0) linqChain.Append($".Skip({skip})");
                if (take != null) linqChain.Append($".Take({take})");
                break;
        }
    }

    // Parse map callback and generate VNode
    var (itemVar, jsxBody) = ParseMapCallback(callback);
    var vnode = GenerateVNodeFromJsx(jsxBody, itemVar);

    linqChain.Append($".Select({itemVar} => {vnode}).ToArray()");

    // Create VListModel
    CurrentElement.Children.Add(new VListModel
    {
        ArrayExpression = linqChain.ToString(),
        ItemName = itemVar,
        // ...
    });
}
```

**New Pattern Macros**:
```csharp
// Add to PatternMatcher.cs
// \Bchain - matches chained method calls: .method().method().method()
AddMacro(@"\Bchain", @"(?:\.\w+\([^)]*\))*");
```

### 1.2 Complex Array State Initializers

**Problem**: `useState<Todo[]>([{...}, {...}])` with object literals not extracted.

**Current**: Missing `todos` and `products` state fields.

**Implementation**:

```csharp
// In StateVisitor.cs - enhance array detection

[TokenPattern(@"\k""useState""\s*<(?<type>[^>]+)>\s*\(\s*\[(?<items>[\s\S]*?)\]\s*\)")]
public void VisitTypedArrayState(Token[] tokens, Match match)
{
    var itemType = match.Groups["type"].Value; // "Todo[]" or "Todo"
    var items = match.Groups["items"].Value;

    // Parse object literals in array
    var parsedItems = ParseObjectLiterals(items);

    // Generate C# initializer
    var csharpInit = GenerateListInitializer(parsedItems);

    AddStateField(new StateField
    {
        Name = _currentStateVar,
        Type = $"List<dynamic>",
        InitialValue = csharpInit,
        // ...
    });
}

private string GenerateListInitializer(List<ObjectLiteral> items)
{
    var sb = new StringBuilder("new List<object> { ");
    foreach (var item in items)
    {
        sb.Append("new { ");
        sb.Append(string.Join(", ", item.Properties.Select(p => $"{p.Key} = {ConvertValue(p.Value)}")));
        sb.Append(" }, ");
    }
    sb.Append("}");
    return sb.ToString();
}
```

### 1.3 Event Handler Parameter Detection

**Problem**: Handlers reference `e` but don't include it in signature.

**Implementation**:

```csharp
// In HandlerVisitor.cs

[TokenPattern(@"(?<handler>Handle\d+|handle\w+)\s*=\s*\((?<params>[^)]*)\)\s*=>\s*(?<body>\Bb)")]
public void VisitArrowHandler(Token[] tokens, Match match)
{
    var body = match.Groups["body"].Value;
    var explicitParams = match.Groups["params"].Value;

    // Detect implicit event parameter usage
    var needsEventParam = DetectEventUsage(body);

    var handler = new EventHandler
    {
        Name = match.Groups["handler"].Value,
        Parameters = ParseParameters(explicitParams),
        Body = body,
        NeedsEventParameter = needsEventParam
    };

    // Add 'e' parameter if needed
    if (needsEventParam && !handler.Parameters.Contains("e"))
    {
        handler.Parameters.Insert(0, new Parameter { Name = "e", Type = "dynamic" });
    }
}

private bool DetectEventUsage(string body)
{
    // Detect: e.target, e.target.value, e.preventDefault(), e.stopPropagation()
    return Regex.IsMatch(body, @"\be\s*\.\s*(target|preventDefault|stopPropagation|currentTarget)");
}
```

### 1.4 Object Literal Conversion

**Problem**: `{ key: value }` output as-is instead of C# dictionary.

**Implementation**:

```csharp
// In CSharpGenerator.cs - add ConvertObjectLiteral

private string ConvertObjectLiteral(string jsObject)
{
    // Parse: { key1: value1, key2: value2 }
    var props = ParseJsObjectProperties(jsObject);

    // Determine if it should be anonymous type or dictionary
    if (IsSimpleObject(props))
    {
        // Anonymous type: new { key1 = value1, key2 = value2 }
        return $"new {{ {string.Join(", ", props.Select(p => $"{p.Key} = {ConvertValue(p.Value)}"))} }}";
    }
    else
    {
        // Dictionary: new Dictionary<string, object> { ["key1"] = value1 }
        return $"new Dictionary<string, object> {{ {string.Join(", ", props.Select(p => $"[\"{p.Key}\"] = {ConvertValue(p.Value)}"))} }}";
    }
}
```

---

## Phase 2: Expression Enhancement (P1)

**Timeline**: After P0 fixes
**Impact**: Improves expression handling quality

### 2.1 JS → C# Method Conversion

Create a comprehensive method mapping system:

```csharp
// New file: Reluxer.Transformer/JsToCSharpConverter.cs

public static class JsToCSharpConverter
{
    private static readonly Dictionary<string, Func<string, string[], string>> MethodConverters = new()
    {
        // Array methods
        ["filter"] = (obj, args) => $"{obj}.Where({args[0]})",
        ["map"] = (obj, args) => $"{obj}.Select({args[0]})",
        ["forEach"] = (obj, args) => $"{obj}.ToList().ForEach({args[0]})",
        ["find"] = (obj, args) => $"{obj}.FirstOrDefault({args[0]})",
        ["findIndex"] = (obj, args) => $"{obj}.ToList().FindIndex(x => {args[0]}(x))",
        ["some"] = (obj, args) => $"{obj}.Any({args[0]})",
        ["every"] = (obj, args) => $"{obj}.All({args[0]})",
        ["includes"] = (obj, args) => $"{obj}.Contains({args[0]})",
        ["indexOf"] = (obj, args) => $"{obj}.ToList().IndexOf({args[0]})",
        ["reduce"] = (obj, args) => $"{obj}.Aggregate({args[1]}, {args[0]})",
        ["slice"] = (obj, args) => ConvertSlice(obj, args),
        ["splice"] = (obj, args) => ConvertSplice(obj, args),
        ["sort"] = (obj, args) => args.Length > 0 ? ConvertSort(obj, args[0]) : $"{obj}.OrderBy(x => x)",
        ["reverse"] = (obj, args) => $"{obj}.Reverse()",
        ["concat"] = (obj, args) => $"{obj}.Concat({args[0]})",
        ["join"] = (obj, args) => $"string.Join({args[0]}, {obj})",
        ["flat"] = (obj, args) => $"{obj}.SelectMany(x => x)",
        ["flatMap"] = (obj, args) => $"{obj}.SelectMany({args[0]})",

        // String methods
        ["toLowerCase"] = (obj, args) => $"{obj}.ToLower()",
        ["toUpperCase"] = (obj, args) => $"{obj}.ToUpper()",
        ["trim"] = (obj, args) => $"{obj}.Trim()",
        ["trimStart"] = (obj, args) => $"{obj}.TrimStart()",
        ["trimEnd"] = (obj, args) => $"{obj}.TrimEnd()",
        ["split"] = (obj, args) => $"{obj}.Split({args[0]})",
        ["substring"] = (obj, args) => ConvertSubstring(obj, args),
        ["substr"] = (obj, args) => ConvertSubstr(obj, args),
        ["replace"] = (obj, args) => $"{obj}.Replace({args[0]}, {args[1]})",
        ["replaceAll"] = (obj, args) => $"Regex.Replace({obj}, {args[0]}, {args[1]})",
        ["startsWith"] = (obj, args) => $"{obj}.StartsWith({args[0]})",
        ["endsWith"] = (obj, args) => $"{obj}.EndsWith({args[0]})",
        ["includes"] = (obj, args) => $"{obj}.Contains({args[0]})",
        ["padStart"] = (obj, args) => $"{obj}.PadLeft({args[0]}, {args[1]?[0] ?? ' '})",
        ["padEnd"] = (obj, args) => $"{obj}.PadRight({args[0]}, {args[1]?[0] ?? ' '})",
        ["repeat"] = (obj, args) => $"string.Concat(Enumerable.Repeat({obj}, {args[0]}))",
        ["charAt"] = (obj, args) => $"{obj}[{args[0]}]",
        ["charCodeAt"] = (obj, args) => $"(int){obj}[{args[0]}]",

        // Number methods
        ["toFixed"] = (obj, args) => $"{obj}.ToString(\"F{args[0]}\")",
        ["toPrecision"] = (obj, args) => $"{obj}.ToString(\"G{args[0]}\")",
        ["toExponential"] = (obj, args) => $"{obj}.ToString(\"E{args[0]}\")",
        ["toLocaleString"] = (obj, args) => $"{obj}.ToString(\"N0\")",
        ["toString"] = (obj, args) => args.Length > 0 ? $"Convert.ToString({obj}, {args[0]})" : $"{obj}.ToString()",

        // Object methods
        ["hasOwnProperty"] = (obj, args) => $"((IDictionary<string, object>){obj}).ContainsKey({args[0]})",
        ["keys"] = (obj, args) => $"((IDictionary<string, object>){obj}).Keys",
        ["values"] = (obj, args) => $"((IDictionary<string, object>){obj}).Values",
        ["entries"] = (obj, args) => $"((IDictionary<string, object>){obj}).Select(kv => new {{ kv.Key, kv.Value }})",

        // JSON methods
        ["JSON.stringify"] = (obj, args) => $"JsonSerializer.Serialize({args[0]})",
        ["JSON.parse"] = (obj, args) => $"JsonSerializer.Deserialize<dynamic>({args[0]})",

        // Math methods (static)
        ["Math.abs"] = (obj, args) => $"Math.Abs({args[0]})",
        ["Math.ceil"] = (obj, args) => $"(int)Math.Ceiling({args[0]})",
        ["Math.floor"] = (obj, args) => $"(int)Math.Floor({args[0]})",
        ["Math.round"] = (obj, args) => $"(int)Math.Round({args[0]})",
        ["Math.max"] = (obj, args) => $"Math.Max({string.Join(", ", args)})",
        ["Math.min"] = (obj, args) => $"Math.Min({string.Join(", ", args)})",
        ["Math.pow"] = (obj, args) => $"Math.Pow({args[0]}, {args[1]})",
        ["Math.sqrt"] = (obj, args) => $"Math.Sqrt({args[0]})",
        ["Math.random"] = (obj, args) => "new Random().NextDouble()",
        ["Math.sign"] = (obj, args) => $"Math.Sign({args[0]})",
        ["Math.trunc"] = (obj, args) => $"(int){args[0]}",

        // Date methods
        ["Date.now"] = (obj, args) => "DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()",
        ["getTime"] = (obj, args) => $"((DateTimeOffset){obj}).ToUnixTimeMilliseconds()",
        ["toISOString"] = (obj, args) => $"{obj}.ToString(\"O\")",
        ["toLocaleDateString"] = (obj, args) => $"{obj}.ToLocalTime().ToString(\"d\")",
        ["toLocaleTimeString"] = (obj, args) => $"{obj}.ToLocalTime().ToString(\"t\")",

        // Promise/async (special handling)
        ["then"] = (obj, args) => $"await {obj}; {args[0]}",
        ["catch"] = (obj, args) => $"try {{ await {obj}; }} catch {{ {args[0]} }}",
        ["finally"] = (obj, args) => $"try {{ await {obj}; }} finally {{ {args[0]} }}",

        // Console
        ["console.log"] = (obj, args) => $"Console.WriteLine({string.Join(", ", args)})",
        ["console.error"] = (obj, args) => $"Console.Error.WriteLine({string.Join(", ", args)})",
        ["console.warn"] = (obj, args) => $"Console.WriteLine(\"[WARN] \" + {string.Join(", ", args)})",
    };

    private static string ConvertSlice(string obj, string[] args)
    {
        if (args.Length == 0) return obj;
        if (args.Length == 1) return $"{obj}.Skip({args[0]})";
        return $"{obj}.Skip({args[0]}).Take({args[1]} - {args[0]})";
    }

    private static string ConvertSort(string obj, string compareFn)
    {
        // Convert JS comparator (a, b) => a - b to C# OrderBy
        // Simple ascending: (a, b) => a - b
        // Simple descending: (a, b) => b - a
        // Property: (a, b) => a.prop - b.prop

        var match = Regex.Match(compareFn, @"\((\w+),\s*(\w+)\)\s*=>\s*(\w+)\.?(\w*)?\s*-\s*(\w+)\.?(\w*)?");
        if (match.Success)
        {
            var a = match.Groups[1].Value;
            var b = match.Groups[2].Value;
            var firstVar = match.Groups[3].Value;
            var firstProp = match.Groups[4].Value;
            var secondVar = match.Groups[5].Value;
            var secondProp = match.Groups[6].Value;

            var selector = string.IsNullOrEmpty(firstProp) ? "x" : $"x.{firstProp}";
            var isDescending = firstVar == b;

            return isDescending ? $"{obj}.OrderByDescending(x => {selector})" : $"{obj}.OrderBy(x => {selector})";
        }

        // Complex comparator - use dynamic
        return $"{obj}.OrderBy(x => x)";
    }
}
```

### 2.2 Logical Expression Handling

**Problem**: `showCompleted || !todo.done` generates invalid `??` in C#.

```csharp
// In ExpressionConverter.cs

public string ConvertLogicalExpression(string expr)
{
    // Don't use ?? for boolean expressions
    // JS: condition1 || condition2 (boolean OR)
    // C#: condition1 || condition2 (same!)

    // Only use ?? for nullish coalescing
    // JS: value ?? defaultValue
    // C#: value ?? defaultValue

    // Detect: is this a boolean OR or nullish coalescing?
    var left = GetLeftOperand(expr, "||");
    var right = GetRightOperand(expr, "||");

    if (IsBooleanExpression(left) || IsBooleanExpression(right))
    {
        // Keep as || for boolean
        return expr;
    }
    else
    {
        // Convert to ?? only for potential null values
        return expr.Replace("||", "??");
    }
}

private bool IsBooleanExpression(string expr)
{
    // Starts with ! (negation)
    if (expr.TrimStart().StartsWith("!")) return true;

    // Contains comparison operators
    if (Regex.IsMatch(expr, @"[<>=!]=?")) return true;

    // Is a known boolean variable
    if (_booleanVariables.Contains(expr.Trim())) return true;

    // Contains && or ||
    if (expr.Contains("&&") || expr.Contains("||")) return true;

    return false;
}
```

---

## Phase 3: Special Hooks (P2)

**Timeline**: After expression fixes
**Impact**: Adds missing Minimact-specific functionality

### 3.1 useServerTask

Create new visitor: `ServerTaskVisitor.cs`

```csharp
[TokenPattern(@"\k""useServerTask""\s*\(\s*(?<fn>async\s+function\s*\*?\s*\((?<params>[^)]*)\)(?:\s*:\s*(?<returnType>[^{]+))?\s*(?<body>\Bb))(?:\s*,\s*(?<options>\Bj))?\s*\)")]
public void VisitServerTask(Token[] tokens, Match match)
{
    var isStreaming = match.Groups["fn"].Value.Contains("function*");
    var parameters = ParseParameters(match.Groups["params"].Value);
    var returnType = match.Groups["returnType"].Value;
    var body = match.Groups["body"].Value;
    var options = ParseOptions(match.Groups["options"].Value);

    var serverTask = new ServerTaskModel
    {
        Name = $"ServerTask_{_serverTaskIndex++}",
        IsStreaming = isStreaming,
        Parameters = parameters,
        ReturnType = ConvertReturnType(returnType, isStreaming),
        Body = ConvertAsyncBody(body),
        Runtime = options.GetValueOrDefault("runtime", "auto"),
        Parallel = options.GetValueOrDefault("parallel", false),
        EstimatedChunks = options.GetValueOrDefault("estimatedChunks", 10)
    };

    _component.ServerTasks.Add(serverTask);
}
```

**Generated C#**:
```csharp
[ServerTask("serverTask_0")]
private async Task<List<SearchResult>> ServerTask_0(string searchQuery, IProgress<double> progress, CancellationToken cancellationToken)
{
    var response = await _httpClient.GetStringAsync($"/api/products?q={searchQuery}");
    return JsonSerializer.Deserialize<List<SearchResult>>(response);
}

[ServerTask("serverTask_1", Streaming = true)]
private async IAsyncEnumerable<string> ServerTask_1(string prompt, [EnumeratorCancellation] CancellationToken cancellationToken = default)
{
    await foreach (var chunk in StreamFromApi("/api/ai/stream", prompt, cancellationToken))
    {
        yield return chunk;
    }
}
```

### 3.2 useValidation

Create new visitor: `ValidationVisitor.cs`

```csharp
[TokenPattern(@"(?<varName>\i)\s*=\s*\k""useValidation""\s*\(\s*(?<field>\i)\s*,\s*(?<rules>\Bj)\s*\)")]
public void VisitValidation(Token[] tokens, Match match)
{
    var varName = match.Groups["varName"].Value;
    var field = match.Groups["field"].Value;
    var rules = ParseValidationRules(match.Groups["rules"].Value);

    var validation = new ValidationModel
    {
        Name = varName,
        FieldKey = field,
        Required = rules.GetValueOrDefault("required", false),
        MinLength = rules.GetValueOrDefault("minLength"),
        MaxLength = rules.GetValueOrDefault("maxLength"),
        Min = rules.GetValueOrDefault("min"),
        Max = rules.GetValueOrDefault("max"),
        Pattern = rules.GetValueOrDefault("pattern"),
        CustomValidator = rules.GetValueOrDefault("custom"),
        AsyncValidator = rules.GetValueOrDefault("asyncValidator"),
        Message = rules.GetValueOrDefault("message", "Validation failed")
    };

    _component.Validations.Add(validation);
}
```

**Generated C#**:
```csharp
[Validation]
private ValidationField emailValidation = new ValidationField
{
    FieldKey = "email",
    Required = true,
    Pattern = @"^[^\s@]+@[^\s@]+\.[^\s@]+$",
    Message = "Please enter a valid email address"
};
```

### 3.3 usePredictHint

Create new visitor: `PredictHintVisitor.cs`

```csharp
[TokenPattern(@"\k""usePredictHint""\s*\(\s*['""](?<hintId>[^'""]+)['""]\s*,\s*(?<state>\Bj)\s*\)")]
public void VisitPredictHint(Token[] tokens, Match match)
{
    var hintId = match.Groups["hintId"].Value;
    var state = ParseStateObject(match.Groups["state"].Value);

    var hint = new PredictHintModel
    {
        HintId = hintId,
        PredictedState = state
    };

    _component.PredictHints.Add(hint);
}
```

**Generated C#**:
```csharp
// Predict hint: "tab-overview"
[PredictHint("tab-overview", activeTab = "overview")]
private static readonly PredictHint _hint_0 = new("tab-overview", new { activeTab = "overview" });
```

### 3.4 usePub / useSub

Create new visitor: `PubSubVisitor.cs`

```csharp
[TokenPattern(@"(?<varName>\i)\s*=\s*\k""usePub""\s*(?:<[^>]+>)?\s*\(\s*['""](?<channel>[^'""]+)['""]\s*\)")]
public void VisitUsePub(Token[] tokens, Match match)
{
    var varName = match.Groups["varName"].Value;
    var channel = match.Groups["channel"].Value;

    _component.Publishers.Add(new PublisherModel
    {
        Name = varName,
        Channel = channel
    });
}

[TokenPattern(@"\k""useSub""\s*(?:<[^>]+>)?\s*\(\s*['""](?<channel>[^'""]+)['""]\s*,\s*(?<handler>\Bp)\s*\)")]
public void VisitUseSub(Token[] tokens, Match match)
{
    var channel = match.Groups["channel"].Value;
    var handler = match.Groups["handler"].Value;

    _component.Subscribers.Add(new SubscriberModel
    {
        Channel = channel,
        Handler = ConvertHandler(handler)
    });
}
```

**Generated C#**:
```csharp
// usePub: publishMessage
[Publisher("chat:messages")]
private Action<ChatMessage> publishMessage => msg => Publish("chat:messages", msg);

// useSub: chat:messages
[Subscriber("chat:messages")]
private void OnChatMessage(ChatMessage message)
{
    messages = messages.Append(message).ToList();
    SetState(nameof(messages), messages);
}
```

### 3.5 useSignalR

Create new visitor: `SignalRVisitor.cs`

```csharp
[TokenPattern(@"(?<varName>\i)\s*=\s*\k""useSignalR""\s*\(\s*['""](?<hubUrl>[^'""]+)['""]\s*,\s*(?<config>\Bj)\s*\)")]
public void VisitSignalR(Token[] tokens, Match match)
{
    var varName = match.Groups["varName"].Value;
    var hubUrl = match.Groups["hubUrl"].Value;
    var config = ParseSignalRConfig(match.Groups["config"].Value);

    _component.SignalRHubs.Add(new SignalRHubModel
    {
        Name = varName,
        HubUrl = hubUrl,
        OnConnected = config.OnConnected,
        OnDisconnected = config.OnDisconnected,
        OnReconnecting = config.OnReconnecting,
        Handlers = config.Handlers,
        ReconnectPolicy = config.ReconnectPolicy
    });
}
```

**Generated C#**:
```csharp
// useSignalR: chatHub
[SignalRHub("/hubs/chat")]
private HubConnection chatHub;
private bool chatHub_connected = false;
private string chatHub_connectionId = null;

[SignalRHandler("chatHub", "ReceiveMessage")]
private void OnReceiveMessage(string user, string text, string timestamp)
{
    messages = messages.Append(new Message { User = user, Text = text, Timestamp = timestamp }).ToList();
    SetState(nameof(messages), messages);
}

protected override async Task OnInitializedAsync()
{
    chatHub = new HubConnectionBuilder()
        .WithUrl(NavigationManager.ToAbsoluteUri("/hubs/chat"))
        .WithAutomaticReconnect(new[] { TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(10) })
        .Build();

    chatHub.On<string, string, string>("ReceiveMessage", OnReceiveMessage);

    await chatHub.StartAsync();
    chatHub_connected = true;
    chatHub_connectionId = chatHub.ConnectionId;
}
```

### 3.6 useMicroTask / useMacroTask

Create new visitor: `TaskSchedulingVisitor.cs`

```csharp
[TokenPattern(@"(?<varName>\i)\s*=\s*\k""useMicroTask""\s*\(\s*(?<callback>\Bp)\s*\)")]
public void VisitMicroTask(Token[] tokens, Match match)
{
    var varName = match.Groups["varName"].Value;
    var callback = match.Groups["callback"].Value;

    _component.MicroTasks.Add(new MicroTaskModel
    {
        Name = varName,
        Callback = ConvertCallback(callback)
    });
}

[TokenPattern(@"(?<varName>\i)\s*=\s*\k""useMacroTask""\s*\(\s*(?<callback>\Bp)(?:\s*,\s*(?<delay>\d+))?\s*\)")]
public void VisitMacroTask(Token[] tokens, Match match)
{
    var varName = match.Groups["varName"].Value;
    var callback = match.Groups["callback"].Value;
    var delay = int.Parse(match.Groups["delay"].Value ?? "0");

    _component.MacroTasks.Add(new MacroTaskModel
    {
        Name = varName,
        Callback = ConvertCallback(callback),
        DelayMs = delay
    });
}
```

**Generated C#**:
```csharp
// useMicroTask 0
private Action scheduleMicro => () => Task.Run(() =>
{
    log = log.Append($"Microtask executed at {DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}").ToList();
    SetState(nameof(log), log);
});

// useMacroTask 1 (delay: 500ms)
private Action scheduleDelayed => () => Task.Delay(500).ContinueWith(_ =>
{
    log = log.Append($"Delayed macrotask (500ms) at {DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}").ToList();
    SetState(nameof(log), log);
});
```

### 3.7 useTemplate

Create new visitor: `TemplateVisitor.cs`

```csharp
[TokenPattern(@"\k""useTemplate""\s*\(\s*['""](?<templateName>\w+)['""]\s*,\s*(?<props>\Bj)\s*\)")]
public void VisitTemplate(Token[] tokens, Match match)
{
    var templateName = match.Groups["templateName"].Value;
    var props = ParseProps(match.Groups["props"].Value);

    _component.Template = new TemplateModel
    {
        LayoutName = templateName,
        Props = props
    };

    // Change base class
    _component.BaseClass = templateName;

    // Change Render to RenderContent
    _component.RenderMethodName = "RenderContent";
}
```

**Generated C#**:
```csharp
[Component]
public partial class TestUseTemplate : MainLayout  // ← Changed base class
{
    public override string Title => "Dashboard";
    public override bool ShowSidebar => true;
    public override string Theme => "light";

    [State]
    private string pageTitle = "Dashboard";

    protected override VNode RenderContent()  // ← Changed method name
    {
        // ... component content ...
    }
}
```

---

## Phase 4: Advanced Features (P3)

### 4.1 useProtectedState (Fix)

Both Babel and Reluxer currently just emit `[State]`. Need proper `[ProtectedState]`:

```csharp
[TokenPattern(@"(?<stateVar>\i)\s*,\s*(?<setter>set\w+)\s*\]\s*=\s*\k""useProtectedState""\s*(?:<(?<type>[^>]+)>)?\s*\(\s*(?<init>[^)]+)\s*\)")]
public void VisitProtectedState(Token[] tokens, Match match)
{
    // Similar to useState but with [ProtectedState] attribute
    _component.StateFields.Add(new StateField
    {
        Name = match.Groups["stateVar"].Value,
        SetterName = match.Groups["setter"].Value,
        Type = match.Groups["type"].Value ?? InferType(match.Groups["init"].Value),
        InitialValue = match.Groups["init"].Value,
        IsProtected = true  // ← Key difference
    });
}
```

**Generated C#**:
```csharp
[ProtectedState]  // Parent cannot access via state lifting
private int internalCounter = 0;
```

### 4.2 useMarkdown / useRazorMarkdown (Fix)

```csharp
[TokenPattern(@"(?<varName>\i)\s*=\s*\k""useMarkdown""\s*\(\s*(?<content>`[\s\S]*?`|['""][^'""]*['""])\s*(?:,\s*(?<options>\Bj))?\s*\)")]
public void VisitMarkdown(Token[] tokens, Match match)
{
    var varName = match.Groups["varName"].Value;
    var content = match.Groups["content"].Value;
    var options = ParseOptions(match.Groups["options"].Value);

    _component.MarkdownFields.Add(new MarkdownModel
    {
        Name = varName,
        Content = content,
        Sanitize = options.GetValueOrDefault("sanitize", true),
        AllowedTags = options.GetValueOrDefault("allowedTags")
    });
}
```

**Generated C#**:
```csharp
[Markdown(Sanitize = true)]
private string introContent = @"
# Welcome to Our App
This is **bold** and *italic*.
";

// Computed property for rendered HTML
private string introContentHtml => MarkdownRenderer.Render(introContent);
```

---

## Phase 5: Exceeding Babel (P4)

Features that Reluxer can do better than Babel:

### 5.1 Roslyn Integration

Since Reluxer runs in .NET, we can use Roslyn for:

```csharp
// Real-time compilation validation
public class RoslynValidator
{
    public ValidationResult ValidateGeneratedCode(string csharpCode)
    {
        var syntaxTree = CSharpSyntaxTree.ParseText(csharpCode);
        var compilation = CSharpCompilation.Create("Validation")
            .AddReferences(MetadataReference.CreateFromFile(typeof(object).Assembly.Location))
            .AddSyntaxTrees(syntaxTree);

        var diagnostics = compilation.GetDiagnostics();
        return new ValidationResult
        {
            IsValid = !diagnostics.Any(d => d.Severity == DiagnosticSeverity.Error),
            Errors = diagnostics.Where(d => d.Severity == DiagnosticSeverity.Error).ToList(),
            Warnings = diagnostics.Where(d => d.Severity == DiagnosticSeverity.Warning).ToList()
        };
    }
}
```

### 5.2 Type Inference from Roslyn Analyzers

Use Roslyn to infer types from usage:

```csharp
// Analyze: items.filter(x => x.price > 100)
// Infer: items is IEnumerable<T> where T has 'price' property of numeric type

public class TypeInferenceAnalyzer : DiagnosticAnalyzer
{
    public override void Initialize(AnalysisContext context)
    {
        context.RegisterSyntaxNodeAction(AnalyzeInvocation, SyntaxKind.InvocationExpression);
    }

    private void AnalyzeInvocation(SyntaxNodeAnalysisContext context)
    {
        // Extract type information from LINQ operations
        // Feed back to Reluxer for better type generation
    }
}
```

### 5.3 Incremental Transpilation

Only re-transpile changed portions:

```csharp
public class IncrementalTranspiler
{
    private readonly Dictionary<string, TranspilationCache> _cache = new();

    public TranspilationResult Transpile(string filePath, string source)
    {
        var hash = ComputeHash(source);

        if (_cache.TryGetValue(filePath, out var cached) && cached.Hash == hash)
        {
            return cached.Result;
        }

        // Detect what changed
        var diff = ComputeDiff(cached?.Source, source);

        if (diff.IsMinor)
        {
            // Incremental update
            var result = IncrementalUpdate(cached.Result, diff);
            _cache[filePath] = new TranspilationCache { Hash = hash, Source = source, Result = result };
            return result;
        }
        else
        {
            // Full re-transpile
            var result = FullTranspile(source);
            _cache[filePath] = new TranspilationCache { Hash = hash, Source = source, Result = result };
            return result;
        }
    }
}
```

### 5.4 Advanced Pattern Macros

Extend the pattern language beyond Babel's capabilities:

```csharp
// New macros for complex patterns
AddMacro(@"\Bjsx", /* Match balanced JSX element */);
AddMacro(@"\Btemplate", /* Match template literal with expressions */);
AddMacro(@"\Bdestructure", /* Match destructuring pattern */);
AddMacro(@"\Bspread", /* Match spread operator usage */);
AddMacro(@"\Boptchain", /* Match optional chaining ?. */);
AddMacro(@"\Bnullcoal", /* Match nullish coalescing ?? */);

// Example usage
[TokenPattern(@"const\s+\Bdestructure\s*=\s*(?<source>\i)")]
public void VisitDestructuring(Token[] tokens, Match match) { }
```

### 5.5 Source Maps

Generate source maps for debugging:

```csharp
public class SourceMapGenerator
{
    public SourceMap Generate(string tsxSource, string csharpOutput, List<Mapping> mappings)
    {
        return new SourceMap
        {
            Version = 3,
            File = "Component.cs",
            SourceRoot = "",
            Sources = new[] { "Component.tsx" },
            Names = Array.Empty<string>(),
            Mappings = EncodeMappings(mappings)
        };
    }
}
```

### 5.6 IDE Integration

Provide LSP support for real-time feedback:

```csharp
public class ReluxerLanguageServer : ILanguageServer
{
    public async Task<Hover> GetHover(TextDocumentPositionParams position)
    {
        // Show C# equivalent on hover over TSX
        var tsxCode = GetCodeAtPosition(position);
        var csharpEquivalent = TranspileSnippet(tsxCode);

        return new Hover
        {
            Contents = new MarkedString { Language = "csharp", Value = csharpEquivalent }
        };
    }

    public async Task<List<Diagnostic>> GetDiagnostics(string filePath)
    {
        // Real-time transpilation errors
        var result = Transpile(filePath);
        return result.Errors.Select(e => new Diagnostic
        {
            Range = e.Range,
            Message = e.Message,
            Severity = DiagnosticSeverity.Error
        }).ToList();
    }
}
```

### 5.7 Hot Reload Optimization

Generate minimal patches for hot reload:

```csharp
public class HotReloadOptimizer
{
    public HotReloadPatch ComputePatch(TranspilationResult oldResult, TranspilationResult newResult)
    {
        var patch = new HotReloadPatch();

        // Compare templates
        var templateDiff = DiffTemplates(oldResult.Templates, newResult.Templates);
        if (templateDiff.OnlyTextChanges)
        {
            // Can apply as template patch (0.1ms)
            patch.Type = PatchType.TemplateOnly;
            patch.TemplatePatches = templateDiff.Patches;
        }
        else if (templateDiff.OnlyStructuralAdditions)
        {
            // Can apply as structural addition (1-5ms)
            patch.Type = PatchType.StructuralAdd;
            patch.StructuralChanges = templateDiff.Additions;
        }
        else
        {
            // Full re-render required
            patch.Type = PatchType.FullRerender;
        }

        return patch;
    }
}
```

---

## Implementation Details

### File Structure

```
Reluxer.Transformer/
├── Visitors/
│   ├── ComponentVisitor.cs
│   ├── PropsVisitor.cs
│   ├── CustomHookVisitor.cs
│   ├── StateVisitor.cs          # Enhanced for arrays
│   ├── EffectVisitor.cs
│   ├── RefVisitor.cs
│   ├── TimelineVisitor.cs
│   ├── HandlerVisitor.cs        # Enhanced for event params
│   ├── JsxVisitor.cs            # Enhanced for chained methods
│   ├── ServerTaskVisitor.cs     # NEW
│   ├── ValidationVisitor.cs     # NEW
│   ├── PredictHintVisitor.cs    # NEW
│   ├── PubSubVisitor.cs         # NEW
│   ├── SignalRVisitor.cs        # NEW
│   ├── TaskSchedulingVisitor.cs # NEW
│   └── TemplateLayoutVisitor.cs # NEW
├── Models/
│   ├── ComponentModel.cs        # Extended with new properties
│   ├── ServerTaskModel.cs       # NEW
│   ├── ValidationModel.cs       # NEW
│   ├── PredictHintModel.cs      # NEW
│   ├── PublisherModel.cs        # NEW
│   ├── SubscriberModel.cs       # NEW
│   ├── SignalRHubModel.cs       # NEW
│   ├── MicroTaskModel.cs        # NEW
│   ├── MacroTaskModel.cs        # NEW
│   └── TemplateModel.cs         # NEW
├── Converters/
│   ├── JsToCSharpConverter.cs   # NEW - comprehensive method mapping
│   ├── ExpressionConverter.cs   # Enhanced
│   └── TypeConverter.cs         # Enhanced
├── Generators/
│   ├── CSharpGenerator.cs       # Extended for new attributes
│   ├── TemplateGenerator.cs
│   ├── HooksGenerator.cs
│   ├── StructuralChangesGenerator.cs
│   └── KeysGenerator.cs
└── Validation/
    ├── RoslynValidator.cs       # NEW
    └── TypeInferenceAnalyzer.cs # NEW
```

### Model Extensions

```csharp
// ComponentModel.cs - extend with new fields

public class ComponentModel
{
    // Existing
    public string Name { get; set; }
    public List<PropModel> Props { get; set; }
    public List<StateField> StateFields { get; set; }
    public List<EffectModel> Effects { get; set; }
    public List<RefModel> Refs { get; set; }
    public List<EventHandler> EventHandlers { get; set; }
    public VNodeModel RenderTree { get; set; }

    // NEW - Special hooks
    public List<ServerTaskModel> ServerTasks { get; set; } = new();
    public List<ValidationModel> Validations { get; set; } = new();
    public List<PredictHintModel> PredictHints { get; set; } = new();
    public List<PublisherModel> Publishers { get; set; } = new();
    public List<SubscriberModel> Subscribers { get; set; } = new();
    public List<SignalRHubModel> SignalRHubs { get; set; } = new();
    public List<MicroTaskModel> MicroTasks { get; set; } = new();
    public List<MacroTaskModel> MacroTasks { get; set; } = new();
    public List<MarkdownModel> MarkdownFields { get; set; } = new();
    public TemplateModel Template { get; set; }

    // Template inheritance
    public string BaseClass { get; set; } = "MinimactComponent";
    public string RenderMethodName { get; set; } = "Render";
}
```

---

## Testing Strategy

### 1. Parity Tests

Run each fixture through both Babel and Reluxer, compare outputs:

```bash
node test-single.js fixtures/parity/TestUseServerTask.tsx
```

### 2. Compilation Tests

Verify generated C# compiles:

```bash
dotnet build test-output-lexer/TestUseServerTask/
```

### 3. Snapshot Tests

Compare against known-good outputs:

```csharp
[Fact]
public void UseServerTask_GeneratesCorrectOutput()
{
    var result = Transpile("fixtures/parity/TestUseServerTask.tsx");
    await Verify(result.CSharpCode);
}
```

### 4. Integration Tests

Test in actual Minimact runtime:

```csharp
[Fact]
public async Task ServerTask_ExecutesCorrectly()
{
    var component = LoadComponent("TestUseServerTask");
    var result = await component.InvokeServerTask("ServerTask_0", "test query");
    Assert.NotNull(result);
}
```

---

## Milestones

| Phase | Features | Est. Complexity | Priority |
|-------|----------|-----------------|----------|
| P0 | Chained arrays, array state, event params, object literals | Medium | Immediate |
| P1 | JS→C# converter, logical expressions | Medium | High |
| P2 | All special hooks (7 visitors) | High | Medium |
| P3 | Protected state, markdown fixes | Low | Lower |
| P4 | Roslyn integration, incremental, LSP | Very High | Future |

---

## Conclusion

This enhancement plan will bring Reluxer to full parity with Babel and then exceed it with:

1. **Better type inference** via Roslyn
2. **Real-time validation** during transpilation
3. **Incremental transpilation** for faster hot reload
4. **IDE integration** with LSP support
5. **Source maps** for debugging

The pattern-based architecture of Reluxer makes it well-suited for these enhancements - each new hook is just a new visitor with a `[TokenPattern]` attribute.
