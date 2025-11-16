using Minimact.AspNetCore.Core;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;

namespace Minimact.AspNetCore.Timeline;

/// <summary>
/// Server-side registry for managing pre-computed timelines.
/// Timelines are registered at startup and stored in memory for fast access.
/// </summary>
public class TimelineRegistry
{
    private readonly ConcurrentDictionary<string, TimelinePatchData> _timelines = new();
    private readonly TimelinePredictor _predictor;

    public TimelineRegistry(TimelinePredictor predictor)
    {
        _predictor = predictor;
        Console.WriteLine("[TimelineRegistry] Initialized");
    }

    /// <summary>
    /// Register a timeline and pre-compute all patches
    /// </summary>
    /// <param name="timeline">The timeline definition</param>
    /// <param name="component">The component to render for patch computation</param>
    public void RegisterTimeline<TState>(
        MinimactTimeline<TState> timeline,
        MinimactComponent component
    ) where TState : class, new()
    {
        Console.WriteLine($"[TimelineRegistry] Registering timeline: {timeline.Name}");

        var startTime = DateTime.UtcNow;

        // Export timeline with pre-computed patches
        var patchData = _predictor.ExportTimeline(timeline, component);

        // Store in registry
        _timelines[timeline.TimelineId] = patchData;

        var elapsed = (DateTime.UtcNow - startTime).TotalMilliseconds;

        Console.WriteLine($"[TimelineRegistry] Registered timeline: {timeline.Name}");
        Console.WriteLine($"  - ID: {timeline.TimelineId}");
        Console.WriteLine($"  - Duration: {timeline.Duration}ms");
        Console.WriteLine($"  - Keyframes: {patchData.KeyframeCount}");
        Console.WriteLine($"  - Total patches: {patchData.TotalPatchCount}");
        Console.WriteLine($"  - Registration time: {elapsed:F2}ms");
    }

    /// <summary>
    /// Register multiple timelines at once
    /// </summary>
    public void RegisterTimelines(params (MinimactTimeline<object> timeline, MinimactComponent component)[] timelines)
    {
        foreach (var (timeline, component) in timelines)
        {
            RegisterTimeline(timeline, component);
        }
    }

    /// <summary>
    /// Get timeline patch data by ID
    /// </summary>
    public TimelinePatchData? GetTimeline(string timelineId)
    {
        _timelines.TryGetValue(timelineId, out var timeline);

        if (timeline == null)
        {
            Console.WriteLine($"[TimelineRegistry] Timeline not found: {timelineId}");
        }

        return timeline;
    }

    /// <summary>
    /// Get timeline patch data by name
    /// </summary>
    public TimelinePatchData? GetTimelineByName(string name)
    {
        var timeline = _timelines.Values.FirstOrDefault(t => t.Name == name);

        if (timeline == null)
        {
            Console.WriteLine($"[TimelineRegistry] Timeline not found by name: {name}");
        }

        return timeline;
    }

    /// <summary>
    /// Check if timeline exists
    /// </summary>
    public bool HasTimeline(string timelineId)
    {
        return _timelines.ContainsKey(timelineId);
    }

    /// <summary>
    /// Unregister timeline
    /// </summary>
    public bool UnregisterTimeline(string timelineId)
    {
        var removed = _timelines.TryRemove(timelineId, out var timeline);

        if (removed && timeline != null)
        {
            Console.WriteLine($"[TimelineRegistry] Unregistered timeline: {timeline.Name} ({timelineId})");
        }

        return removed;
    }

    /// <summary>
    /// Get all registered timelines
    /// </summary>
    public IEnumerable<TimelinePatchData> GetAllTimelines()
    {
        return _timelines.Values;
    }

    /// <summary>
    /// Get timeline IDs
    /// </summary>
    public IEnumerable<string> GetTimelineIds()
    {
        return _timelines.Keys;
    }

    /// <summary>
    /// Clear all timelines
    /// </summary>
    public void Clear()
    {
        var count = _timelines.Count;
        _timelines.Clear();
        Console.WriteLine($"[TimelineRegistry] Cleared {count} timelines");
    }

    /// <summary>
    /// Get registry statistics
    /// </summary>
    public TimelineRegistryStats GetStats()
    {
        var timelines = _timelines.Values.ToList();

        return new TimelineRegistryStats
        {
            TotalTimelines = timelines.Count,
            TotalKeyframes = timelines.Sum(t => t.KeyframeCount),
            TotalPatches = timelines.Sum(t => t.TotalPatchCount),
            TotalDuration = timelines.Sum(t => t.Duration),
            AveragePatchesPerTimeline = timelines.Count > 0
                ? timelines.Average(t => t.TotalPatchCount)
                : 0,
            TimelineNames = timelines.Select(t => t.Name).ToList()
        };
    }

    /// <summary>
    /// Get patch data at specific time for a timeline
    /// </summary>
    public List<Patch>? GetPatchesAtTime(string timelineId, int time)
    {
        var timeline = GetTimeline(timelineId);
        if (timeline == null) return null;

        timeline.Patches.TryGetValue(time, out var patches);
        return patches;
    }

    /// <summary>
    /// Get all patch times for a timeline (for client scheduling)
    /// </summary>
    public List<int>? GetPatchTimes(string timelineId)
    {
        var timeline = GetTimeline(timelineId);
        return timeline?.Patches.Keys.OrderBy(t => t).ToList();
    }
}

/// <summary>
/// Statistics about the timeline registry
/// </summary>
public class TimelineRegistryStats
{
    public int TotalTimelines { get; set; }
    public int TotalKeyframes { get; set; }
    public int TotalPatches { get; set; }
    public int TotalDuration { get; set; }
    public double AveragePatchesPerTimeline { get; set; }
    public List<string> TimelineNames { get; set; } = new();

    public override string ToString()
    {
        return $"TimelineRegistry Stats: {TotalTimelines} timelines, " +
               $"{TotalKeyframes} keyframes, {TotalPatches} total patches, " +
               $"{AveragePatchesPerTimeline:F1} avg patches/timeline";
    }
}
