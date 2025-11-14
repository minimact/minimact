using System;
using System.Collections.Generic;
using System.Linq;

namespace Minimact.AspNetCore.Timeline;

/// <summary>
/// Represents a keyframe in a timeline with state snapshot at specific time
/// </summary>
public class TimelineKeyframe<TState>
{
    /// <summary>
    /// Time in milliseconds from timeline start
    /// </summary>
    public int Time { get; set; }

    /// <summary>
    /// State snapshot at this keyframe
    /// </summary>
    public TState State { get; set; } = default!;

    /// <summary>
    /// Optional label for this keyframe (for seeking)
    /// </summary>
    public string? Label { get; set; }

    /// <summary>
    /// Easing function for interpolation to this keyframe
    /// </summary>
    public string? Easing { get; set; }
}

/// <summary>
/// Base class for server-side timeline definitions.
/// Timelines define state changes over time, enabling server-driven animations,
/// presentations, tutorials, and choreographed grain networks.
/// </summary>
/// <typeparam name="TState">The state type for this timeline</typeparam>
public abstract class MinimactTimeline<TState> where TState : class, new()
{
    /// <summary>
    /// Unique identifier for this timeline
    /// </summary>
    public string TimelineId { get; set; }

    /// <summary>
    /// Human-readable name for this timeline
    /// </summary>
    public string Name { get; set; }

    /// <summary>
    /// Total duration in milliseconds
    /// </summary>
    public int Duration { get; set; }

    /// <summary>
    /// Whether the timeline should repeat/loop
    /// </summary>
    public bool Repeat { get; set; }

    /// <summary>
    /// Number of times to repeat (Infinity = -1)
    /// </summary>
    public int RepeatCount { get; set; } = -1;

    /// <summary>
    /// Global easing function for the timeline
    /// </summary>
    public string Easing { get; set; } = "linear";

    /// <summary>
    /// Keyframes defining state changes over time
    /// </summary>
    public List<TimelineKeyframe<TState>> Keyframes { get; set; } = new();

    /// <summary>
    /// Metadata for this timeline
    /// </summary>
    public Dictionary<string, object>? Metadata { get; set; }

    /// <summary>
    /// Creates a new timeline
    /// </summary>
    /// <param name="name">Timeline name</param>
    /// <param name="duration">Total duration in milliseconds</param>
    /// <param name="repeat">Whether to loop the timeline</param>
    protected MinimactTimeline(string name, int duration, bool repeat = false)
    {
        TimelineId = Guid.NewGuid().ToString();
        Name = name;
        Duration = duration;
        Repeat = repeat;

        // Call derived class to define keyframes
        DefineKeyframes();

        Console.WriteLine($"[MinimactTimeline] Created timeline: {name}");
        Console.WriteLine($"  - ID: {TimelineId}");
        Console.WriteLine($"  - Duration: {duration}ms");
        Console.WriteLine($"  - Repeat: {repeat}");
    }

    /// <summary>
    /// Override this method to define keyframes for the timeline.
    /// Use the Keyframe() method to add keyframes.
    /// </summary>
    protected abstract void DefineKeyframes();

    /// <summary>
    /// Add a keyframe at specific time with state snapshot
    /// </summary>
    /// <param name="time">Time in milliseconds</param>
    /// <param name="state">State snapshot</param>
    /// <param name="label">Optional label for seeking</param>
    /// <param name="easing">Optional easing function</param>
    protected void Keyframe(int time, TState state, string? label = null, string? easing = null)
    {
        if (time < 0 || time > Duration)
        {
            throw new ArgumentException($"Keyframe time {time}ms is outside timeline duration (0-{Duration}ms)");
        }

        Keyframes.Add(new TimelineKeyframe<TState>
        {
            Time = time,
            State = state,
            Label = label,
            Easing = easing
        });

        // Sort keyframes by time
        Keyframes = Keyframes.OrderBy(kf => kf.Time).ToList();

        Console.WriteLine($"[MinimactTimeline] Added keyframe at {time}ms" + (label != null ? $" (label: {label})" : ""));
    }

    /// <summary>
    /// Add multiple keyframes at once
    /// </summary>
    protected void Keyframes(params TimelineKeyframe<TState>[] keyframes)
    {
        foreach (var kf in keyframes)
        {
            Keyframe(kf.Time, kf.State, kf.Label, kf.Easing);
        }
    }

    /// <summary>
    /// Get keyframe at specific time (exact match)
    /// </summary>
    public TimelineKeyframe<TState>? GetKeyframeAtTime(int time)
    {
        return Keyframes.FirstOrDefault(kf => kf.Time == time);
    }

    /// <summary>
    /// Get keyframe by label
    /// </summary>
    public TimelineKeyframe<TState>? GetKeyframeByLabel(string label)
    {
        return Keyframes.FirstOrDefault(kf => kf.Label == label);
    }

    /// <summary>
    /// Get keyframes surrounding a specific time (for interpolation)
    /// </summary>
    public (TimelineKeyframe<TState>? prev, TimelineKeyframe<TState>? next) GetSurroundingKeyframes(int time)
    {
        TimelineKeyframe<TState>? prev = null;
        TimelineKeyframe<TState>? next = null;

        foreach (var kf in Keyframes)
        {
            if (kf.Time <= time)
            {
                prev = kf;
            }
            else if (kf.Time > time && next == null)
            {
                next = kf;
                break;
            }
        }

        return (prev, next);
    }

    /// <summary>
    /// Validate timeline definition
    /// </summary>
    public void Validate()
    {
        if (Keyframes.Count == 0)
        {
            throw new InvalidOperationException($"Timeline '{Name}' has no keyframes defined");
        }

        if (Duration <= 0)
        {
            throw new InvalidOperationException($"Timeline '{Name}' has invalid duration: {Duration}ms");
        }

        // Check for duplicate times
        var duplicateTimes = Keyframes
            .GroupBy(kf => kf.Time)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        if (duplicateTimes.Any())
        {
            throw new InvalidOperationException(
                $"Timeline '{Name}' has duplicate keyframes at times: {string.Join(", ", duplicateTimes)}ms"
            );
        }

        Console.WriteLine($"[MinimactTimeline] Validated timeline: {Name} ({Keyframes.Count} keyframes)");
    }

    /// <summary>
    /// Get timeline summary for debugging
    /// </summary>
    public override string ToString()
    {
        return $"Timeline '{Name}' (ID: {TimelineId}, Duration: {Duration}ms, Keyframes: {Keyframes.Count}, Repeat: {Repeat})";
    }
}
