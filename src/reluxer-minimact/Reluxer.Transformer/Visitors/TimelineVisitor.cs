using Reluxer.Attributes;
using Reluxer.Matching;
using Reluxer.Tokens;
using Reluxer.Transformer.Models;
using Reluxer.Visitor;

namespace Reluxer.Transformer.Visitors;

/// <summary>
/// Visitor that extracts timeline hooks from component bodies.
///
/// Matches:
/// - const timeline = useTimeline({ duration: 5000, repeat: true, easing: 'ease-in-out' })
/// - useTimelineState(timeline, 'stateName', setter, interpolate)
/// - timeline.keyframes([...])
///
/// Generates:
/// - [Timeline("Name_Timeline", duration, Repeat = bool, Easing = "string")]
/// - [TimelineKeyframe(time, "stateName", value, Label = "label")]
/// - [TimelineStateBinding("stateName", Interpolate = bool)]
/// </summary>
public class TimelineVisitor : TokenVisitor
{
    private readonly ComponentModel _component;
    private Token[]? _componentBody;
    private string? _timelineVarName;

    public TimelineVisitor(ComponentModel component)
    {
        _component = component;
    }

    public override void OnBegin(IReadOnlyList<Token> tokens)
    {
        // Get the component body from shared context (set by ComponentVisitor)
        _componentBody = Context.Get<Token[]>($"ComponentBody:{_component.Name}");

        if (_componentBody != null && _componentBody.Length > 0)
        {
            // First pass: find useTimeline to get the variable name and config
            Traverse(_componentBody, nameof(VisitUseTimeline));

            // If we found a timeline, continue with other patterns
            if (_component.TimelineConfig != null)
            {
                Traverse(_componentBody,
                    nameof(VisitUseTimelineStateInterpolate),
                    nameof(VisitUseTimelineStateNoInterpolate),
                    nameof(VisitKeyframes));
            }
        }
    }

    /// <summary>
    /// Match: const timeline = useTimeline({ duration: 5000, repeat: true, easing: 'ease-in-out' })
    /// </summary>
    [TokenPattern(@"\k""const"" (\i) ""="" \i""useTimeline"" ""("" (\Bb) "")""", Name = "VisitUseTimeline")]
    public void VisitUseTimeline(TokenMatch match, string varName, Token[] configTokens)
    {
        _timelineVarName = varName;

        // Create timeline config
        var timeline = new TimelineModel
        {
            Name = $"{_component.Name}_Timeline"
        };

        // Parse config object: { duration: 5000, repeat: true, easing: 'ease-in-out' }
        ParseTimelineConfig(configTokens, timeline);

        _component.TimelineConfig = timeline;
        Console.WriteLine($"[TimelineVisitor] Found useTimeline: {varName}, duration={timeline.Duration}, repeat={timeline.Repeat}, easing={timeline.Easing}");
    }

    /// <summary>
    /// Match: useTimelineState(timeline, 'stateName', setter, true) - with interpolate flag
    /// </summary>
    [TokenPattern(@"\i""useTimelineState"" ""("" (\i) "","" (\s) "","" (\i) "","" \k""true"" "")""", Priority = 100, Name = "VisitUseTimelineStateInterpolate")]
    public void VisitUseTimelineStateInterpolate(TokenMatch match, string timelineVar, string stateNameQuoted, string setterName)
    {
        AddTimelineStateBinding(stateNameQuoted, interpolate: true);
    }

    /// <summary>
    /// Match: useTimelineState(timeline, 'stateName', setter) - without interpolate flag
    /// </summary>
    [TokenPattern(@"\i""useTimelineState"" ""("" (\i) "","" (\s) "","" (\i) "")""", Priority = 90, Name = "VisitUseTimelineStateNoInterpolate")]
    public void VisitUseTimelineStateNoInterpolate(TokenMatch match, string timelineVar, string stateNameQuoted, string setterName)
    {
        AddTimelineStateBinding(stateNameQuoted, interpolate: false);
    }

    private void AddTimelineStateBinding(string stateNameQuoted, bool interpolate)
    {
        if (_component.TimelineConfig == null) return;

        var stateName = stateNameQuoted.Trim('\'', '"');

        // Skip if already added
        if (_component.TimelineConfig.StateBindings.Any(sb => sb.StateName == stateName))
            return;

        _component.TimelineConfig.StateBindings.Add(new TimelineStateBinding
        {
            StateName = stateName,
            Interpolate = interpolate
        });

        Console.WriteLine($"[TimelineVisitor] Found useTimelineState: {stateName}, interpolate={interpolate}");
    }

    /// <summary>
    /// Match: timeline.keyframes([...])
    /// We need to find the array and parse each keyframe object.
    /// \Bp captures the balanced parentheses content, which contains the array.
    /// </summary>
    [TokenPattern(@"(\i) ""."" \i""keyframes"" (\Bp)", Name = "VisitKeyframes")]
    [AllowImperative(Reason = "Complex keyframe array parsing requires iteration")]
    public void VisitKeyframes(TokenMatch match, string timelineVar, Token[] parenContent)
    {
        if (_component.TimelineConfig == null) return;
        if (timelineVar != _timelineVarName) return;

        Console.WriteLine($"[TimelineVisitor] Found keyframes call, paren content: {parenContent.Length} tokens");

        // The parenContent includes ( [ ... ] )
        // We need to find the array inside: look for [ and ]
        var arrayStart = -1;
        var arrayEnd = -1;
        var depth = 0;

        for (int i = 0; i < parenContent.Length; i++)
        {
            var t = parenContent[i];
            if (t.Value == "[" && arrayStart == -1)
            {
                arrayStart = i;
                depth = 1;
            }
            else if (t.Value == "[" && arrayStart != -1)
            {
                depth++;
            }
            else if (t.Value == "]")
            {
                depth--;
                if (depth == 0 && arrayStart != -1)
                {
                    arrayEnd = i;
                    break;
                }
            }
        }

        if (arrayStart == -1 || arrayEnd == -1)
        {
            Console.WriteLine($"[TimelineVisitor] Could not find array in keyframes call");
            return;
        }

        // Extract array content (excluding the [ and ])
        var arrayTokens = parenContent.Skip(arrayStart + 1).Take(arrayEnd - arrayStart - 1).ToArray();
        Console.WriteLine($"[TimelineVisitor] Extracted array with {arrayTokens.Length} tokens");

        // Parse keyframe array: [ { time: 0, state: {...}, label: '...' }, ... ]
        ParseKeyframesArray(arrayTokens);
    }

    private void ParseTimelineConfig(Token[] tokens, TimelineModel timeline)
    {
        // Simple parsing of { duration: 5000, repeat: true, easing: 'ease-in-out' }
        for (int i = 0; i < tokens.Length; i++)
        {
            var token = tokens[i];
            if (token.Type != TokenType.Identifier) continue;

            // Look for property: value pattern
            if (i + 2 < tokens.Length && tokens[i + 1].Value == ":")
            {
                var propName = token.Value;
                var valueToken = tokens[i + 2];

                switch (propName)
                {
                    case "duration":
                        if (int.TryParse(valueToken.Value, out var duration))
                            timeline.Duration = duration;
                        break;

                    case "repeat":
                        timeline.Repeat = valueToken.Value == "true";
                        break;

                    case "easing":
                        timeline.Easing = valueToken.Value.Trim('\'', '"');
                        break;
                }
            }
        }
    }

    private void ParseKeyframesArray(Token[] arrayTokens)
    {
        Console.WriteLine($"[TimelineVisitor] ParseKeyframesArray: parsing {arrayTokens.Length} tokens");
        Console.WriteLine($"[TimelineVisitor] First 10 tokens: {string.Join(" ", arrayTokens.Take(10).Select(t => $"[{t.Type}]{t.Value}"))}");

        // Find each object in the array { time: ..., state: {...}, label: '...' }
        var depth = 0;
        var objectStart = -1;
        var objects = new List<Token[]>();

        for (int i = 0; i < arrayTokens.Length; i++)
        {
            var token = arrayTokens[i];

            if (token.Value == "{")
            {
                if (depth == 0)
                    objectStart = i;
                depth++;
            }
            else if (token.Value == "}")
            {
                depth--;
                if (depth == 0 && objectStart >= 0)
                {
                    // Extract object tokens (including braces)
                    var objLength = i - objectStart + 1;
                    var objTokens = arrayTokens.Skip(objectStart).Take(objLength).ToArray();
                    objects.Add(objTokens);
                    objectStart = -1;
                }
            }
        }

        Console.WriteLine($"[TimelineVisitor] Found {objects.Count} keyframe objects");

        // Parse each keyframe object
        foreach (var objTokens in objects)
        {
            ParseKeyframeObject(objTokens);
        }
    }

    private void ParseKeyframeObject(Token[] tokens)
    {
        // Parse: { time: 0, state: { count: 0, color: 'blue', opacity: 1.0 }, label: 'start' }
        Console.WriteLine($"[TimelineVisitor] ParseKeyframeObject: {tokens.Length} tokens");

        int? time = null;
        string? label = null;
        var stateValues = new Dictionary<string, string>();

        var inState = false;
        var stateDepth = 0;

        for (int i = 0; i < tokens.Length; i++)
        {
            var token = tokens[i];

            // Track state object nesting
            if (inState)
            {
                if (token.Value == "{") stateDepth++;
                else if (token.Value == "}") stateDepth--;

                if (stateDepth == 0)
                {
                    inState = false;
                    continue;
                }

                // Inside state object, look for property: value
                var isStateColon = i + 1 < tokens.Length &&
                    (tokens[i + 1].Type == TokenType.Colon || tokens[i + 1].Value == ":");

                if (token.Type == TokenType.Identifier && i + 2 < tokens.Length && isStateColon)
                {
                    var propName = token.Value;
                    var valueToken = tokens[i + 2];
                    stateValues[propName] = valueToken.Value.Trim('\'', '"');
                    Console.WriteLine($"[TimelineVisitor] Found state value: {propName}={valueToken.Value}");
                    i += 2; // Skip past colon and value
                }
                continue;
            }

            // Look for top-level properties
            // Check for colon by type OR value since lexer may tokenize differently
            var isColon = i + 1 < tokens.Length &&
                (tokens[i + 1].Type == TokenType.Colon || tokens[i + 1].Value == ":");

            if (token.Type == TokenType.Identifier && i + 2 < tokens.Length && isColon)
            {
                var propName = token.Value;

                switch (propName)
                {
                    case "time":
                        if (int.TryParse(tokens[i + 2].Value, out var t))
                            time = t;
                        break;

                    case "state":
                        // Start parsing state object - look ahead for the {
                        inState = true;
                        stateDepth = 0;
                        // Skip to the opening brace
                        for (int j = i + 2; j < tokens.Length; j++)
                        {
                            if (tokens[j].Value == "{")
                            {
                                stateDepth = 1;
                                i = j; // Move i to the {
                                break;
                            }
                        }
                        break;

                    case "label":
                        label = tokens[i + 2].Value.Trim('\'', '"');
                        break;
                }
            }
        }

        Console.WriteLine($"[TimelineVisitor] After parsing: time={time}, label={label}, stateValues={stateValues.Count}");

        // Add keyframes for each state value
        if (time.HasValue && _component.TimelineConfig != null)
        {
            foreach (var kvp in stateValues)
            {
                _component.TimelineConfig.Keyframes.Add(new TimelineKeyframe
                {
                    Time = time.Value,
                    StateName = kvp.Key,
                    Value = kvp.Value,
                    Label = label
                });

                Console.WriteLine($"[TimelineVisitor] Added keyframe: time={time}, state={kvp.Key}, value={kvp.Value}, label={label}");
            }
        }
    }

}
