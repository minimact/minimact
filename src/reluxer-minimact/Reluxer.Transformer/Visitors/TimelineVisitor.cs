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
        // Use pattern matching for property: value pairs
        // Pattern: identifier ":" followed by value (number, keyword, or string)
        var propMatcher = new PatternMatcher(@"(\i) "":"" (\Bc)", skipWhitespace: true);
        var matches = PatternMatcher.MatchAll(tokens, 0, (propMatcher, TokenMatchType.Unknown, "prop"));

        foreach (var match in matches)
        {
            if (match.Match.Captures.Length < 2) continue;

            var propName = match.Match.Captures[0].AsIdentifier();
            var valueTokens = match.Match.Captures[1].Tokens;
            var valueToken = valueTokens.FirstOrDefault(t => t.Type != TokenType.Whitespace);

            if (propName == null || valueToken == null) continue;

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

    private void ParseKeyframesArray(Token[] arrayTokens)
    {
        // Use \Bb to find each balanced brace object in the array
        var objectMatcher = new PatternMatcher(@"(\Bb)", skipWhitespace: true);
        var matches = PatternMatcher.MatchAll(arrayTokens, 0, (objectMatcher, TokenMatchType.Unknown, "obj"));

        Console.WriteLine($"[TimelineVisitor] Found keyframe objects");

        // Parse each keyframe object directly from matches
        foreach (var match in matches)
        {
            if (match.Match.Captures.Length > 0)
            {
                ParseKeyframeObject(match.Match.Captures[0].Tokens);
            }
        }
    }

    private void ParseKeyframeObject(Token[] tokens)
    {
        // Parse: { time: 0, state: { count: 0, color: 'blue', opacity: 1.0 }, label: 'start' }
        Console.WriteLine($"[TimelineVisitor] ParseKeyframeObject: {tokens.Length} tokens");

        int? time = null;
        string? label = null;
        var stateValues = new Dictionary<string, string>();

        // Pattern for time: number
        var timeMatcher = new PatternMatcher(@"\i""time"" "":"" (\n)", skipWhitespace: true);
        if (timeMatcher.TryMatch(tokens, 0, out var timeMatch) && timeMatch != null)
        {
            var timeToken = timeMatch.GetCapturedToken(0);
            if (timeToken != null && int.TryParse(timeToken.Value, out var t))
                time = t;
        }

        // Pattern for label: string
        var labelMatcher = new PatternMatcher(@"\i""label"" "":"" (\s)", skipWhitespace: true);
        if (labelMatcher.TryMatch(tokens, 0, out var labelMatch) && labelMatch != null)
        {
            var labelToken = labelMatch.GetCapturedToken(0);
            if (labelToken != null)
                label = labelToken.Value.Trim('\'', '"');
        }

        // Pattern for state: { ... } - use balanced braces
        var stateMatcher = new PatternMatcher(@"\i""state"" "":"" (\Bb)", skipWhitespace: true);
        if (stateMatcher.TryMatch(tokens, 0, out var stateMatch) && stateMatch != null)
        {
            var stateTokens = stateMatch.Captures[0].Tokens;

            // Parse key: value pairs inside state object
            var kvMatcher = new PatternMatcher(@"(\i) "":"" (\Bc)", skipWhitespace: true);
            var kvMatches = PatternMatcher.MatchAll(stateTokens, 0, (kvMatcher, TokenMatchType.Unknown, "kv"));

            foreach (var kvMatch in kvMatches)
            {
                if (kvMatch.Match.Captures.Length >= 2)
                {
                    var propName = kvMatch.Match.Captures[0].AsIdentifier();
                    var valueTokens = kvMatch.Match.Captures[1].Tokens;
                    var valueToken = valueTokens.FirstOrDefault(t => t.Type != TokenType.Whitespace);

                    if (propName != null && valueToken != null)
                    {
                        stateValues[propName] = valueToken.Value.Trim('\'', '"');
                        Console.WriteLine($"[TimelineVisitor] Found state value: {propName}={valueToken.Value}");
                    }
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
