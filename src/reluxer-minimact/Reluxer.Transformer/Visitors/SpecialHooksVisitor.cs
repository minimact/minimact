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

        if (_componentBody != null && _componentBody.Length > 0)
        {
            Traverse(_componentBody,
                nameof(VisitUseServerTaskInlineStreaming),
                nameof(VisitUseServerTaskInline),
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

    // Match: const fnName = useServerTask(async function* (params): AsyncGenerator<T> { body }, options)
    // Streaming version - uses function* (generator) - pattern captures params in balanced parens
    [TokenPattern(@"\k""const"" (\i) ""="" \i""useServerTask"" ""("" \k""async"" \k""function"" ""*"" (\Bp)", Priority = 120, Name = "VisitUseServerTaskInlineStreaming")]
    public void VisitUseServerTaskInlineStreaming(TokenMatch match, string fnName, Token[] paramsTokens)
    {
        var serverTask = new ServerTaskModel
        {
            Name = fnName,
            IsStreaming = true
        };

        // Parse parameters
        if (paramsTokens.Length > 0)
        {
            ParseParametersFromTokens(serverTask, paramsTokens);
        }

        // Extract return type: look for ): AsyncGenerator<Type>
        ParseReturnTypeFromMatchedTokens(serverTask, match.MatchedTokens, isStreaming: true);

        // Extract the function body { ... }
        var bodyTokens = ExtractFunctionBody(0);
        Console.WriteLine($"[SpecialHooksVisitor] Extracted body for {fnName}: {bodyTokens.Length} tokens");

        // Store tokens - generator will convert to C#
        if (bodyTokens.Length > 0)
        {
            serverTask.BodyTokens = bodyTokens;
        }

        _component.ServerTasks.Add(serverTask);
        Console.WriteLine($"[SpecialHooksVisitor] Added streaming ServerTask: {fnName}, ReturnType: {serverTask.ReturnType}, Params: {serverTask.Parameters.Count}");

        SkipBalanced("(", ")");
    }

    // Match: const fnName = useServerTask(async function (params): Promise<T> { body }, options)
    // Regular async version - pattern captures params in balanced parens
    [TokenPattern(@"\k""const"" (\i) ""="" \i""useServerTask"" ""("" \k""async"" \k""function"" (\Bp)", Priority = 100, Name = "VisitUseServerTaskInline")]
    public void VisitUseServerTaskInline(TokenMatch match, string fnName, Token[] paramsTokens)
    {
        var serverTask = new ServerTaskModel
        {
            Name = fnName,
            IsStreaming = false
        };

        // Parse parameters
        if (paramsTokens.Length > 0)
        {
            ParseParametersFromTokens(serverTask, paramsTokens);
        }

        // Extract return type: look for ): Promise<Type> or ): Type
        // The matched tokens include everything, so we can search for the return type annotation
        ParseReturnTypeFromMatchedTokens(serverTask, match.MatchedTokens, isStreaming: false);

        // Extract the function body { ... }
        var bodyTokens = ExtractFunctionBody(0);
        Console.WriteLine($"[SpecialHooksVisitor] Extracted body for {fnName}: {bodyTokens.Length} tokens");

        // Store tokens - generator will convert to C#
        if (bodyTokens.Length > 0)
        {
            serverTask.BodyTokens = bodyTokens;
        }

        _component.ServerTasks.Add(serverTask);
        Console.WriteLine($"[SpecialHooksVisitor] Added ServerTask: {fnName}, ReturnType: {serverTask.ReturnType}, Params: {serverTask.Parameters.Count}");

        SkipBalanced("(", ")");
    }

    /// <summary>
    /// Parses parameters from token array like (searchQuery: string, options?: Options)
    /// Uses pattern matching to extract name: type pairs.
    /// </summary>
    private void ParseParametersFromTokens(ServerTaskModel serverTask, Token[] paramTokens)
    {
        // Pattern: identifier : typename optionally followed by [] for arrays
        // Use \tn for TypeName and \cl for Colon token types
        // Try array pattern first (higher priority)
        var arrayParamMatcher = new PatternMatcher(@"(\i) \cl (\tn) ""[]""", skipWhitespace: true);
        var simpleParamMatcher = new PatternMatcher(@"(\i) \cl (\tn)", skipWhitespace: true);

        // First try array params
        var arrayMatches = arrayParamMatcher.FindAll(paramTokens);
        var matchedNames = new HashSet<string>();

        arrayMatches.ToList().ForEach(match =>
        {
            var nameTokens = match.GetCapturedTokens(0);
            var typeTokens = match.GetCapturedTokens(1);

            if (nameTokens != null && nameTokens.Length > 0)
            {
                var name = nameTokens[0].Value.TrimEnd('?');
                matchedNames.Add(name);
                var jsType = typeTokens != null && typeTokens.Length > 0
                    ? typeTokens[0].Value + "[]"
                    : "dynamic";

                Console.WriteLine($"[ParseParametersFromTokens] Array Match: name={name}, type={jsType}");
                serverTask.Parameters.Add(new ParameterInfo
                {
                    Name = name,
                    Type = ConvertJsTypeToCSharp(jsType)
                });
            }
        });

        // Then simple params (skip already matched)
        var simpleMatches = simpleParamMatcher.FindAll(paramTokens);
        simpleMatches.ToList().ForEach(match =>
        {
            var nameTokens = match.GetCapturedTokens(0);
            var typeTokens = match.GetCapturedTokens(1);

            if (nameTokens != null && nameTokens.Length > 0)
            {
                var name = nameTokens[0].Value.TrimEnd('?');
                if (matchedNames.Contains(name)) return; // Skip already matched

                var jsType = typeTokens != null && typeTokens.Length > 0
                    ? typeTokens[0].Value
                    : "dynamic";

                Console.WriteLine($"[ParseParametersFromTokens] Simple Match: name={name}, type={jsType}");
                serverTask.Parameters.Add(new ParameterInfo
                {
                    Name = name,
                    Type = ConvertJsTypeToCSharp(jsType)
                });
            }
        });
    }

    /// <summary>
    /// Parses return type from tokens using pattern matching.
    /// Looks for ): Promise<T> or ): AsyncGenerator<T>
    /// </summary>
    private void ParseReturnTypeFromTokens(ServerTaskModel serverTask, Token[] tokens, bool isStreaming)
    {
        // Default return type
        serverTask.ReturnType = isStreaming ? "IAsyncEnumerable<object>" : "Task<object>";

        // Pattern: ) : Promise < Type > or ) : AsyncGenerator < Type >
        var returnMatcher = new PatternMatcher(@""":"" (\i) ""<"" (\i) "">""");

        if (returnMatcher.TryMatch(tokens, 0, out var match) && match != null)
        {
            var wrapperTokens = match.GetCapturedTokens(0);
            var typeTokens = match.GetCapturedTokens(1);

            var wrapperType = wrapperTokens?[0].Value ?? "";
            var innerType = typeTokens?[0].Value ?? "object";
            innerType = ConvertJsTypeToCSharp(innerType);

            if (isStreaming || wrapperType == "AsyncGenerator")
            {
                serverTask.ReturnType = $"IAsyncEnumerable<{innerType}>";
                serverTask.IsStreaming = true;
            }
            else
            {
                serverTask.ReturnType = $"Task<{innerType}>";
            }
        }
    }

    /// <summary>
    /// Parses return type from matched tokens - looks for the return type annotation
    /// after the parameter list: ): Promise<T> or ): AsyncGenerator<T>
    /// </summary>
    private void ParseReturnTypeFromMatchedTokens(ServerTaskModel serverTask, Token[] matchedTokens, bool isStreaming)
    {
        // Default return type
        serverTask.ReturnType = isStreaming ? "IAsyncEnumerable<object>" : "Task<object>";

        // Look for pattern: ) : TypeName < InnerType > (after closing paren of params)
        // We need to find ) : ... < ... > pattern
        var returnMatcher = new PatternMatcher(@""":"" (\i) ""<"" (\i) "">""");
        var matches = returnMatcher.FindAll(matchedTokens);

        if (matches.Any())
        {
            var match = matches.Last(); // Take the last one (return type annotation)
            var wrapperTokens = match.GetCapturedTokens(0);
            var typeTokens = match.GetCapturedTokens(1);

            var wrapperType = wrapperTokens?[0].Value ?? "";
            var innerType = typeTokens?[0].Value ?? "object";
            innerType = ConvertJsTypeToCSharp(innerType);

            Console.WriteLine($"[SpecialHooksVisitor] Found return type: {wrapperType}<{innerType}>");

            if (isStreaming || wrapperType == "AsyncGenerator")
            {
                serverTask.ReturnType = $"IAsyncEnumerable<{innerType}>";
                serverTask.IsStreaming = true;
            }
            else
            {
                serverTask.ReturnType = $"Task<{innerType}>";
            }
        }
    }

    /// <summary>
    /// Parses return type by examining the component body tokens.
    /// </summary>
    private void ParseReturnTypeFromContext(ServerTaskModel serverTask, bool isStreaming)
    {
        // Default return type
        serverTask.ReturnType = isStreaming ? "IAsyncEnumerable<object>" : "Task<object>";

        if (_componentBody != null)
        {
            ParseReturnTypeFromTokens(serverTask, _componentBody, isStreaming);
        }
    }

    /// <summary>
    /// Converts JS/TS types to C# types.
    /// </summary>
    private string ConvertJsTypeToCSharp(string jsType)
    {
        jsType = jsType.Trim();

        // Handle array types
        if (jsType.EndsWith("[]"))
        {
            var elementType = ConvertJsTypeToCSharp(jsType[..^2]);
            return $"List<{elementType}>";
        }

        // Handle generic types like SearchResult[]
        return jsType switch
        {
            "string" => "string",
            "number" => "double",
            "boolean" or "bool" => "bool",
            "void" => "void",
            "any" => "dynamic",
            "object" => "object",
            "undefined" or "null" => "object",
            _ => jsType // Keep custom types as-is (e.g., User, SearchResult)
        };
    }


    /// <summary>
    /// Parses server task options like { runtime: 'rust', parallel: true, streaming: true }
    /// Uses pattern matching to find option values.
    /// </summary>
    private void ParseServerTaskOptions(ServerTaskModel serverTask, Token[] optionsTokens)
    {
        // Pattern: streaming : true
        var streamingMatcher = new PatternMatcher(@"\i""streaming"" "":"" \k""true""");
        if (streamingMatcher.TryMatch(optionsTokens, 0, out _))
        {
            serverTask.IsStreaming = true;
        }

        // Pattern: parallel : true
        var parallelMatcher = new PatternMatcher(@"\i""parallel"" "":"" \k""true""");
        if (parallelMatcher.TryMatch(optionsTokens, 0, out _))
        {
            serverTask.Parallel = true;
        }

        // Pattern: runtime : 'value' or runtime : "value"
        var runtimeMatcher = new PatternMatcher(@"\i""runtime"" "":"" (\s)");
        if (runtimeMatcher.TryMatch(optionsTokens, 0, out var runtimeMatch) && runtimeMatch != null)
        {
            var runtimeTokens = runtimeMatch.GetCapturedTokens(0);
            if (runtimeTokens != null && runtimeTokens.Length > 0)
            {
                serverTask.Runtime = runtimeTokens[0].Value.Trim('"', '\'');
            }
        }

        // Pattern: estimatedChunks : number
        var chunksMatcher = new PatternMatcher(@"\i""estimatedChunks"" "":"" (\n)");
        if (chunksMatcher.TryMatch(optionsTokens, 0, out var chunksMatch) && chunksMatch != null)
        {
            var chunksTokens = chunksMatch.GetCapturedTokens(0);
            if (chunksTokens != null && chunksTokens.Length > 0 && int.TryParse(chunksTokens[0].Value, out var chunks))
            {
                serverTask.EstimatedChunks = chunks;
            }
        }
    }

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
            serverTask.BodyTokens = argsTokens;
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
            serverTask.BodyTokens = argsTokens;
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

    // Match: const validationObj = useValidation(fieldValue, { rules })
    // Object-returning form: returns { isValid, hasError, message, validate, isValidating }
    [TokenPattern(@"\k""const"" (\i) ""="" \i""useValidation"" ""("" (\i) "",""", Name = "VisitUseValidationObject")]
    public void VisitUseValidationObject(TokenMatch match, string validationObjName, string fieldName)
    {
        var validation = new ValidationModel
        {
            Name = validationObjName,
            FieldKey = fieldName
        };

        // Extract rules from second argument (after the comma)
        // Pattern: useValidation(email, { required: true, pattern: /.../ })
        var argsTokens = ExtractParenthesized(match.MatchedTokens.Length - 1);
        if (argsTokens.Length > 0)
        {
            ParseValidationRulesFromTokens(validation, argsTokens);
        }

        _component.Validations.Add(validation);

        // The validation object provides: isValid, hasError, message, validate, isValidating
        // Add as a local variable that creates this object
        _component.LocalVariables.Add(new LocalVariable
        {
            Name = validationObjName,
            Expression = $"new {{ isValid = true, hasError = false, message = \"{validation.Message ?? ""}\", isValidating = false }}",
            IsConst = true
        });

        SkipBalanced("(", ")");
    }

    /// <summary>
    /// Parse validation rules directly from tokens using pattern matching.
    /// Matches patterns like: required: true, minLength: 8, pattern: /.../, message: "..."
    /// </summary>
    private void ParseValidationRulesFromTokens(ValidationModel validation, Token[] tokens)
    {
        // required: true
        var requiredMatcher = new PatternMatcher(@"\i""required"" "":"" \k""true""", skipWhitespace: true);
        if (requiredMatcher.TryMatch(tokens, 0, out _))
        {
            validation.Required = true;
        }

        // minLength: number
        var minLenMatcher = new PatternMatcher(@"\i""minLength"" "":"" (\n)", skipWhitespace: true);
        if (minLenMatcher.TryMatch(tokens, 0, out var minLenMatch) && minLenMatch != null)
        {
            if (int.TryParse(minLenMatch.Captures[0].Tokens[0].Value, out var minLen))
                validation.MinLength = minLen;
        }

        // maxLength: number
        var maxLenMatcher = new PatternMatcher(@"\i""maxLength"" "":"" (\n)", skipWhitespace: true);
        if (maxLenMatcher.TryMatch(tokens, 0, out var maxLenMatch) && maxLenMatch != null)
        {
            if (int.TryParse(maxLenMatch.Captures[0].Tokens[0].Value, out var maxLen))
                validation.MaxLength = maxLen;
        }

        // min: number
        var minMatcher = new PatternMatcher(@"\i""min"" "":"" (\n)", skipWhitespace: true);
        if (minMatcher.TryMatch(tokens, 0, out var minMatch) && minMatch != null)
        {
            if (double.TryParse(minMatch.Captures[0].Tokens[0].Value, out var min))
                validation.Min = min;
        }

        // max: number
        var maxMatcher = new PatternMatcher(@"\i""max"" "":"" (\n)", skipWhitespace: true);
        if (maxMatcher.TryMatch(tokens, 0, out var maxMatch) && maxMatch != null)
        {
            if (double.TryParse(maxMatch.Captures[0].Tokens[0].Value, out var max))
                validation.Max = max;
        }

        // pattern: /regex/ - match Regex token type
        var patternMatcher = new PatternMatcher(@"\i""pattern"" "":"" (\r)", skipWhitespace: true);
        if (patternMatcher.TryMatch(tokens, 0, out var patternMatch) && patternMatch != null)
        {
            var regexToken = patternMatch.Captures[0].Tokens[0].Value;
            // Remove leading/trailing slashes from regex literal
            if (regexToken.StartsWith("/") && regexToken.EndsWith("/"))
                validation.Pattern = regexToken.Substring(1, regexToken.Length - 2);
            else
                validation.Pattern = regexToken;
        }

        // message: "string" or message: 'string'
        var msgMatcher = new PatternMatcher(@"\i""message"" "":"" (\s)", skipWhitespace: true);
        if (msgMatcher.TryMatch(tokens, 0, out var msgMatch) && msgMatch != null)
        {
            var msgToken = msgMatch.Captures[0].Tokens[0].Value;
            // Remove quotes
            if ((msgToken.StartsWith("\"") && msgToken.EndsWith("\"")) ||
                (msgToken.StartsWith("'") && msgToken.EndsWith("'")))
                validation.Message = msgToken.Substring(1, msgToken.Length - 2);
            else
                validation.Message = msgToken;
        }
    }

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
            ParseValidationRulesFromTokens(validation, argsTokens);
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
            // TODO: Parse { key: value } pairs from argsTokens into PredictedState dictionary
            // using PatternMatcher patterns for key-value pairs
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
            ParseSignalROptionsFromTokens(hub, argsTokens);
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

    private void ParseSignalROptionsFromTokens(SignalRHubModel hub, Token[] tokens)
    {
        var onConnectedMatcher = new PatternMatcher(@"\i""onConnected"" "":"" (\i)", skipWhitespace: true);
        if (onConnectedMatcher.TryMatch(tokens, 0, out var connMatch) && connMatch != null)
            hub.OnConnected = connMatch.Captures[0].Tokens[0].Value;

        var onDisconnectedMatcher = new PatternMatcher(@"\i""onDisconnected"" "":"" (\i)", skipWhitespace: true);
        if (onDisconnectedMatcher.TryMatch(tokens, 0, out var discMatch) && discMatch != null)
            hub.OnDisconnected = discMatch.Captures[0].Tokens[0].Value;

        var onReconnectingMatcher = new PatternMatcher(@"\i""onReconnecting"" "":"" (\i)", skipWhitespace: true);
        if (onReconnectingMatcher.TryMatch(tokens, 0, out var reconMatch) && reconMatch != null)
            hub.OnReconnecting = reconMatch.Captures[0].Tokens[0].Value;
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
            protectedState.InitialValueTokens = initTokens;
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
            InitialValueTokens = initTokens.Length > 0 ? initTokens : null,
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
            markdown.ContentTokens = argsTokens;
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
            markdown.ContentTokens = argsTokens;
        }

        _component.MarkdownFields.Add(markdown);

        SkipBalanced("(", ")");
    }

    #endregion

    #region Helper Methods

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
