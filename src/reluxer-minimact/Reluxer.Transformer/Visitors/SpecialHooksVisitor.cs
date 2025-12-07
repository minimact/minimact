using Reluxer.Attributes;
using Reluxer.Matching;
using Reluxer.Tokens;
using Reluxer.Transformer.Models;
using Reluxer.Visitor;

namespace Reluxer.Transformer.Visitors;

/// <summary>
/// Visitor that extracts special hooks from component bodies:
/// - useServerTask / usePaginatedServerTask
/// - useValidation
/// - usePredictHint
/// - usePub / useSub
/// - useSignalR
/// - useMicroTask / useMacroTask
/// - useTemplate
/// - useProtectedState
/// - useMarkdown / useRazorMarkdown
/// </summary>
public class SpecialHooksVisitor : TokenVisitor
{
    private readonly ComponentModel _component;
    private Token[]? _componentBody;

    public SpecialHooksVisitor(ComponentModel component)
    {
        _component = component;
    }

    public override void OnBegin(IReadOnlyList<Token> tokens)
    {
        _componentBody = Context.Get<Token[]>($"ComponentBody:{_component.Name}");

        Console.WriteLine($"[SpecialHooksVisitor] Processing component: {_component.Name}, body tokens: {_componentBody?.Length ?? 0}");

        if (_componentBody != null && _componentBody.Length > 0)
        {
            Traverse(_componentBody,
                nameof(VisitUseServerTask),
                nameof(VisitUseServerTaskStreaming),
                nameof(VisitUsePaginatedServerTask),
                nameof(VisitUseValidation),
                nameof(VisitUsePredictHint),
                nameof(VisitUsePub),
                nameof(VisitUseSub),
                nameof(VisitUseSignalR),
                nameof(VisitUseMicroTask),
                nameof(VisitUseMacroTask),
                nameof(VisitUseTemplate),
                nameof(VisitUseProtectedState),
                nameof(VisitUseMarkdown),
                nameof(VisitUseRazorMarkdown));
        }
    }

    #region useServerTask

    // Match: const [data, execute, loading] = useServerTask(serverFn, options)
    [TokenPattern(@"\k""const"" ""["" (\i) "","" (\i) "","" (\i) ""]"" ""="" \i""useServerTask"" ""(""", Name = "VisitUseServerTask")]
    public void VisitUseServerTask(TokenMatch match, string dataName, string executeName, string loadingName)
    {
        var serverTask = new ServerTaskModel
        {
            Name = executeName,
            IsStreaming = false
        };

        // Extract the server function body
        var argsTokens = ExtractParenthesized(match.MatchedTokens.Length - 1);
        if (argsTokens.Length > 0)
        {
            var argsStr = TokensToString(argsTokens);
            serverTask.Body = argsStr;
        }

        _component.ServerTasks.Add(serverTask);

        // Also add state fields for data and loading
        _component.StateFields.Add(new StateField
        {
            Name = dataName,
            SetterName = $"set{char.ToUpper(dataName[0])}{dataName[1..]}",
            Type = "dynamic",
            InitialValue = "null",
            HookIndex = _component.NextHookIndex++
        });

        _component.StateFields.Add(new StateField
        {
            Name = loadingName,
            SetterName = $"set{char.ToUpper(loadingName[0])}{loadingName[1..]}",
            Type = "bool",
            InitialValue = "false",
            HookIndex = _component.NextHookIndex++
        });

        SkipBalanced("(", ")");
    }

    // Match: const [data, execute, loading] = useServerTask(serverFn, { streaming: true })
    [TokenPattern(@"\k""const"" ""["" (\i) "","" (\i) "","" (\i) ""]"" ""="" \i""useServerTask"" ""("" .* \i""streaming""", Priority = 110, Name = "VisitUseServerTaskStreaming")]
    public void VisitUseServerTaskStreaming(TokenMatch match, string dataName, string executeName, string loadingName)
    {
        var serverTask = new ServerTaskModel
        {
            Name = executeName,
            IsStreaming = true,
            ReturnType = "IAsyncEnumerable<object>"
        };

        // Extract args
        var argsTokens = ExtractParenthesized(match.MatchedTokens.Length - 1);
        if (argsTokens.Length > 0)
        {
            serverTask.Body = TokensToString(argsTokens);
        }

        _component.ServerTasks.Add(serverTask);

        // Add state fields
        _component.StateFields.Add(new StateField
        {
            Name = dataName,
            SetterName = $"set{char.ToUpper(dataName[0])}{dataName[1..]}",
            Type = "List<dynamic>",
            InitialValue = "new List<dynamic>()",
            HookIndex = _component.NextHookIndex++
        });

        _component.StateFields.Add(new StateField
        {
            Name = loadingName,
            SetterName = $"set{char.ToUpper(loadingName[0])}{loadingName[1..]}",
            Type = "bool",
            InitialValue = "false",
            HookIndex = _component.NextHookIndex++
        });

        SkipBalanced("(", ")");
    }

    // Match: const { data, fetchNextPage, hasMore, loading } = usePaginatedServerTask(...)
    [TokenPattern(@"\k""const"" ""{""  .* ""}""  ""="" \i""usePaginatedServerTask"" ""(""", Name = "VisitUsePaginatedServerTask")]
    public void VisitUsePaginatedServerTask(TokenMatch match)
    {
        var serverTask = new ServerTaskModel
        {
            Name = "fetchNextPage",
            ReturnType = "Task<PaginatedResult<object>>"
        };

        _component.ServerTasks.Add(serverTask);

        // Add pagination state fields
        _component.StateFields.Add(new StateField
        {
            Name = "data",
            Type = "List<dynamic>",
            InitialValue = "new List<dynamic>()",
            HookIndex = _component.NextHookIndex++
        });

        _component.StateFields.Add(new StateField
        {
            Name = "hasMore",
            Type = "bool",
            InitialValue = "true",
            HookIndex = _component.NextHookIndex++
        });

        _component.StateFields.Add(new StateField
        {
            Name = "loading",
            Type = "bool",
            InitialValue = "false",
            HookIndex = _component.NextHookIndex++
        });

        SkipBalanced("(", ")");
    }

    #endregion

    #region useValidation

    // Match: const [isValid, errors, validate] = useValidation(fieldKey, rules)
    [TokenPattern(@"\k""const"" ""["" (\i) "","" (\i) "","" (\i) ""]"" ""="" \i""useValidation"" ""("" (\s)", Name = "VisitUseValidation")]
    public void VisitUseValidation(TokenMatch match, string isValidName, string errorsName, string validateName, string fieldKeyString)
    {
        var fieldKey = fieldKeyString.Trim('"', '\'');

        var validation = new ValidationModel
        {
            Name = validateName,
            FieldKey = fieldKey
        };

        // Extract rules from remaining arguments
        var argsTokens = ExtractParenthesized(match.MatchedTokens.Length - 1);
        if (argsTokens.Length > 0)
        {
            var argsStr = TokensToString(argsTokens);
            ParseValidationRules(validation, argsStr);
        }

        _component.Validations.Add(validation);

        // Add state fields
        _component.StateFields.Add(new StateField
        {
            Name = isValidName,
            Type = "bool",
            InitialValue = "true",
            HookIndex = _component.NextHookIndex++
        });

        _component.StateFields.Add(new StateField
        {
            Name = errorsName,
            Type = "List<string>",
            InitialValue = "new List<string>()",
            HookIndex = _component.NextHookIndex++
        });

        SkipBalanced("(", ")");
    }

    private void ParseValidationRules(ValidationModel validation, string rulesStr)
    {
        if (rulesStr.Contains("required")) validation.Required = true;

        var minLengthMatch = System.Text.RegularExpressions.Regex.Match(rulesStr, @"minLength:\s*(\d+)");
        if (minLengthMatch.Success) validation.MinLength = int.Parse(minLengthMatch.Groups[1].Value);

        var maxLengthMatch = System.Text.RegularExpressions.Regex.Match(rulesStr, @"maxLength:\s*(\d+)");
        if (maxLengthMatch.Success) validation.MaxLength = int.Parse(maxLengthMatch.Groups[1].Value);

        var minMatch = System.Text.RegularExpressions.Regex.Match(rulesStr, @"min:\s*([\d.]+)");
        if (minMatch.Success) validation.Min = double.Parse(minMatch.Groups[1].Value);

        var maxMatch = System.Text.RegularExpressions.Regex.Match(rulesStr, @"max:\s*([\d.]+)");
        if (maxMatch.Success) validation.Max = double.Parse(maxMatch.Groups[1].Value);

        var patternMatch = System.Text.RegularExpressions.Regex.Match(rulesStr, @"pattern:\s*/([^/]+)/");
        if (patternMatch.Success) validation.Pattern = patternMatch.Groups[1].Value;

        var messageMatch = System.Text.RegularExpressions.Regex.Match(rulesStr, @"message:\s*['""]([^'""]+)['""]");
        if (messageMatch.Success) validation.Message = messageMatch.Groups[1].Value;
    }

    #endregion

    #region usePredictHint

    // Match: const hintId = usePredictHint(predictedState)
    [TokenPattern(@"\k""const"" (\i) ""="" \i""usePredictHint"" ""(""", Name = "VisitUsePredictHint")]
    public void VisitUsePredictHint(TokenMatch match, string hintIdName)
    {
        var predictHint = new PredictHintModel
        {
            HintId = $"_hintId_{_component.PredictHints.Count}"
        };

        // Extract predicted state object
        var argsTokens = ExtractParenthesized(match.MatchedTokens.Length - 1);
        if (argsTokens.Length > 0)
        {
            // Parse predicted state values
            var argsStr = TokensToString(argsTokens);
            // TODO: Parse { key: value } pairs into PredictedState dictionary
        }

        _component.PredictHints.Add(predictHint);

        // Add hidden field for hint ID
        _component.LocalVariables.Add(new LocalVariable
        {
            Name = hintIdName,
            Expression = $"\"{predictHint.HintId}\"",
            IsConst = true
        });

        SkipBalanced("(", ")");
    }

    #endregion

    #region usePub / useSub

    // Match: const publish = usePub('channelName')
    [TokenPattern(@"\k""const"" (\i) ""="" \i""usePub"" ""("" (\s)", Name = "VisitUsePub")]
    public void VisitUsePub(TokenMatch match, string publishName, string channelString)
    {
        var channel = channelString.Trim('"', '\'');

        _component.Publishers.Add(new PublisherModel
        {
            Name = publishName,
            Channel = channel
        });

        SkipBalanced("(", ")");
    }

    // Match: useSub('channelName', handler)
    [TokenPattern(@"\i""useSub"" ""("" (\s) "","" (\i)", Name = "VisitUseSub")]
    public void VisitUseSub(TokenMatch match, string channelString, string handlerName)
    {
        var channel = channelString.Trim('"', '\'');

        _component.Subscribers.Add(new SubscriberModel
        {
            Channel = channel,
            Handler = handlerName
        });

        SkipBalanced("(", ")");
    }

    #endregion

    #region useSignalR

    // Match: const { connection, invoke, on } = useSignalR('/hubPath', options)
    [TokenPattern(@"\k""const"" ""{""  .* ""}""  ""="" \i""useSignalR"" ""("" (\s)", Name = "VisitUseSignalR")]
    public void VisitUseSignalR(TokenMatch match, string hubUrlString)
    {
        var hubUrl = hubUrlString.Trim('"', '\'');

        var hub = new SignalRHubModel
        {
            Name = $"hub_{_component.SignalRHubs.Count}",
            HubUrl = hubUrl
        };

        // Extract options for handlers
        var argsTokens = ExtractParenthesized(match.MatchedTokens.Length - 1);
        if (argsTokens.Length > 0)
        {
            var argsStr = TokensToString(argsTokens);
            ParseSignalROptions(hub, argsStr);
        }

        _component.SignalRHubs.Add(hub);

        // Add connection state field
        _component.StateFields.Add(new StateField
        {
            Name = $"_signalRConnected_{_component.SignalRHubs.Count - 1}",
            Type = "bool",
            InitialValue = "false",
            HookIndex = _component.NextHookIndex++
        });

        SkipBalanced("(", ")");
    }

    private void ParseSignalROptions(SignalRHubModel hub, string optionsStr)
    {
        var onConnectedMatch = System.Text.RegularExpressions.Regex.Match(optionsStr, @"onConnected:\s*(\w+)");
        if (onConnectedMatch.Success) hub.OnConnected = onConnectedMatch.Groups[1].Value;

        var onDisconnectedMatch = System.Text.RegularExpressions.Regex.Match(optionsStr, @"onDisconnected:\s*(\w+)");
        if (onDisconnectedMatch.Success) hub.OnDisconnected = onDisconnectedMatch.Groups[1].Value;

        var onReconnectingMatch = System.Text.RegularExpressions.Regex.Match(optionsStr, @"onReconnecting:\s*(\w+)");
        if (onReconnectingMatch.Success) hub.OnReconnecting = onReconnectingMatch.Groups[1].Value;
    }

    #endregion

    #region useMicroTask / useMacroTask

    // Match: const scheduleMicro = useMicroTask(callback)
    [TokenPattern(@"\k""const"" (\i) ""="" \i""useMicroTask"" ""("" (\i)", Name = "VisitUseMicroTask")]
    public void VisitUseMicroTask(TokenMatch match, string scheduleName, string callbackName)
    {
        _component.MicroTasks.Add(new MicroTaskModel
        {
            Name = scheduleName,
            Callback = callbackName
        });

        // Add scheduled flag
        _component.StateFields.Add(new StateField
        {
            Name = $"_microTaskScheduled_{_component.MicroTasks.Count - 1}",
            Type = "bool",
            InitialValue = "false",
            HookIndex = _component.NextHookIndex++
        });

        SkipBalanced("(", ")");
    }

    // Match: const scheduleMacro = useMacroTask(callback, delayMs)
    [TokenPattern(@"\k""const"" (\i) ""="" \i""useMacroTask"" ""("" (\i) "","" (\n)", Name = "VisitUseMacroTask")]
    public void VisitUseMacroTask(TokenMatch match, string scheduleName, string callbackName, string delayStr)
    {
        int.TryParse(delayStr, out var delay);

        _component.MacroTasks.Add(new MacroTaskModel
        {
            Name = scheduleName,
            Callback = callbackName,
            DelayMs = delay
        });

        // Add scheduled flag and delay tracking
        _component.StateFields.Add(new StateField
        {
            Name = $"_macroTaskScheduled_{_component.MacroTasks.Count - 1}",
            Type = "bool",
            InitialValue = "false",
            HookIndex = _component.NextHookIndex++
        });

        SkipBalanced("(", ")");
    }

    #endregion

    #region useTemplate

    // Match: useTemplate(LayoutComponent, { props })
    [TokenPattern(@"\i""useTemplate"" ""("" (\i)", Name = "VisitUseTemplate")]
    public void VisitUseTemplate(TokenMatch match, string layoutName)
    {
        _component.TemplateLayout = new TemplateLayoutModel
        {
            LayoutName = layoutName
        };

        // Change base class to layout component
        _component.BaseClass = layoutName;
        // Change render method to RenderContent (called by layout)
        _component.RenderMethodName = "RenderContent";

        // Extract props if present
        var argsTokens = ExtractParenthesized(match.MatchedTokens.Length - 1);
        if (argsTokens.Length > 0)
        {
            // TODO: Parse props object
        }

        SkipBalanced("(", ")");
    }

    #endregion

    #region useProtectedState

    // Match: const [state, setState] = useProtectedState(initialValue)
    [TokenPattern(@"\k""const"" ""["" (\i) "","" (\i) ""]"" ""="" \i""useProtectedState"" ""(""", Name = "VisitUseProtectedState")]
    public void VisitUseProtectedState(TokenMatch match, string stateName, string setterName)
    {
        var protectedState = new ProtectedStateModel
        {
            Name = stateName,
            SetterName = setterName
        };

        // Extract initial value
        var initTokens = ExtractParenthesized(match.MatchedTokens.Length - 1);
        if (initTokens.Length > 0)
        {
            protectedState.InitialValue = TokensToString(initTokens);
            protectedState.Type = InferType(initTokens);
        }

        _component.ProtectedStates.Add(protectedState);

        // Also add as regular state field but mark as protected
        // (The C# generator will add [ProtectedState] attribute)
        _component.StateFields.Add(new StateField
        {
            Name = stateName,
            SetterName = setterName,
            Type = protectedState.Type,
            InitialValue = protectedState.InitialValue,
            HookIndex = _component.NextHookIndex++
        });

        SkipBalanced("(", ")");
    }

    #endregion

    #region useMarkdown

    // Match: const html = useMarkdown(markdownContent, options)
    [TokenPattern(@"\k""const"" (\i) ""="" \i""useMarkdown"" ""(""", Name = "VisitUseMarkdown")]
    public void VisitUseMarkdown(TokenMatch match, string htmlName)
    {
        var markdown = new MarkdownModel
        {
            Name = htmlName
        };

        // Extract content
        var argsTokens = ExtractParenthesized(match.MatchedTokens.Length - 1);
        if (argsTokens.Length > 0)
        {
            markdown.Content = TokensToString(argsTokens);
        }

        _component.MarkdownFields.Add(markdown);

        SkipBalanced("(", ")");
    }

    // Match: const html = useRazorMarkdown(markdownContent)
    [TokenPattern(@"\k""const"" (\i) ""="" \i""useRazorMarkdown"" ""(""", Name = "VisitUseRazorMarkdown")]
    public void VisitUseRazorMarkdown(TokenMatch match, string htmlName)
    {
        var markdown = new MarkdownModel
        {
            Name = htmlName,
            Sanitize = false // Razor markdown is trusted
        };

        var argsTokens = ExtractParenthesized(match.MatchedTokens.Length - 1);
        if (argsTokens.Length > 0)
        {
            markdown.Content = TokensToString(argsTokens);
        }

        _component.MarkdownFields.Add(markdown);

        SkipBalanced("(", ")");
    }

    #endregion

    #region Helper Methods

    private string TokensToString(Token[] tokens)
    {
        return string.Join("", tokens.Select(t => t.Value));
    }

    private string InferType(Token[] tokens)
    {
        if (tokens.Length == 0) return "object";

        var firstToken = tokens.FirstOrDefault(t => t.Type != TokenType.Whitespace);
        if (firstToken == null) return "object";

        return firstToken.Type switch
        {
            TokenType.Number => firstToken.Value.Contains('.') ? "double" : "int",
            TokenType.String => "string",
            TokenType.Keyword when firstToken.Value is "true" or "false" => "bool",
            _ => "object"
        };
    }

    #endregion
}
