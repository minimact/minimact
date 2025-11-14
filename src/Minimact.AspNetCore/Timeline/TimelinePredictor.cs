using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Reconciliation;
using System;
using System.Collections.Generic;
using System.Reflection;

namespace Minimact.AspNetCore.Timeline;

/// <summary>
/// Pre-computes DOM patches for entire timeline at build/initialization time.
/// This enables server-driven animations with zero runtime rendering overhead.
/// </summary>
public class TimelinePredictor
{
    private readonly RustBridge _reconciler;

    public TimelinePredictor(RustBridge reconciler)
    {
        _reconciler = reconciler;
    }

    /// <summary>
    /// Pre-compute all patches for timeline by rendering component at each keyframe
    /// and reconciling the differences.
    /// </summary>
    /// <param name="timeline">The timeline definition</param>
    /// <param name="component">The component to render</param>
    /// <returns>Dictionary mapping time (ms) to patches</returns>
    public Dictionary<int, List<Patch>> PrecomputeTimeline<TState>(
        MinimactTimeline<TState> timeline,
        MinimactComponent component
    ) where TState : class, new()
    {
        var patchesByTime = new Dictionary<int, List<Patch>>();
        VNode? previousVNode = null;

        Console.WriteLine($"[TimelinePredictor] Pre-computing patches for timeline: {timeline.Name}");
        Console.WriteLine($"  - Keyframes: {timeline.Keyframes.Count}");

        var startTime = DateTime.UtcNow;

        foreach (var keyframe in timeline.Keyframes)
        {
            Console.WriteLine($"[TimelinePredictor] Processing keyframe at {keyframe.Time}ms...");

            // Update component state to match keyframe state
            ApplyStateToComponent(component, keyframe.State);

            // Render component with this state
            var currentVNode = component.Render();

            // Compute patches from previous keyframe
            if (previousVNode != null)
            {
                var patches = _reconciler.Reconcile(previousVNode, currentVNode);
                patchesByTime[keyframe.Time] = patches;

                Console.WriteLine($"  - Generated {patches.Count} patches");
            }
            else
            {
                // First keyframe - no patches needed (initial render)
                patchesByTime[keyframe.Time] = new List<Patch>();
                Console.WriteLine($"  - First keyframe (no patches)");
            }

            previousVNode = currentVNode;
        }

        var elapsed = (DateTime.UtcNow - startTime).TotalMilliseconds;
        var totalPatches = patchesByTime.Values.Sum(p => p.Count);

        Console.WriteLine($"[TimelinePredictor] Pre-computation complete!");
        Console.WriteLine($"  - Total patches: {totalPatches}");
        Console.WriteLine($"  - Time taken: {elapsed:F2}ms");

        return patchesByTime;
    }

    /// <summary>
    /// Apply state object to component using reflection
    /// </summary>
    private void ApplyStateToComponent<TState>(MinimactComponent component, TState state) where TState : class
    {
        var stateType = typeof(TState);
        var componentType = component.GetType();

        // Get all properties from state object
        var stateProperties = stateType.GetProperties(BindingFlags.Public | BindingFlags.Instance);

        foreach (var stateProp in stateProperties)
        {
            var value = stateProp.GetValue(state);
            if (value == null) continue;

            // Try to find matching field in component (case-insensitive)
            var componentField = componentType.GetFields(BindingFlags.NonPublic | BindingFlags.Instance)
                .FirstOrDefault(f => f.Name.Equals(stateProp.Name, StringComparison.OrdinalIgnoreCase));

            if (componentField != null)
            {
                // Set field value
                componentField.SetValue(component, value);
                continue;
            }

            // Try to find matching property
            var componentProp = componentType.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .FirstOrDefault(p => p.Name.Equals(stateProp.Name, StringComparison.OrdinalIgnoreCase));

            if (componentProp != null && componentProp.CanWrite)
            {
                componentProp.SetValue(component, value);
                continue;
            }

            // Fallback: Use State dictionary
            component.SetState(stateProp.Name, value);
        }
    }

    /// <summary>
    /// Export timeline with pre-computed patches for client delivery
    /// </summary>
    public TimelinePatchData ExportTimeline<TState>(
        MinimactTimeline<TState> timeline,
        MinimactComponent component
    ) where TState : class, new()
    {
        // Validate timeline before export
        timeline.Validate();

        // Pre-compute patches
        var patches = PrecomputeTimeline(timeline, component);

        return new TimelinePatchData
        {
            TimelineId = timeline.TimelineId,
            Name = timeline.Name,
            Duration = timeline.Duration,
            Repeat = timeline.Repeat,
            RepeatCount = timeline.RepeatCount,
            Easing = timeline.Easing,
            Patches = patches,
            KeyframeCount = timeline.Keyframes.Count,
            TotalPatchCount = patches.Values.Sum(p => p.Count)
        };
    }
}

/// <summary>
/// Timeline patch data for client delivery via SignalR
/// </summary>
public class TimelinePatchData
{
    /// <summary>
    /// Timeline identifier
    /// </summary>
    public string TimelineId { get; set; } = string.Empty;

    /// <summary>
    /// Timeline name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Total duration in milliseconds
    /// </summary>
    public int Duration { get; set; }

    /// <summary>
    /// Whether to repeat the timeline
    /// </summary>
    public bool Repeat { get; set; }

    /// <summary>
    /// Number of times to repeat (-1 = infinite)
    /// </summary>
    public int RepeatCount { get; set; }

    /// <summary>
    /// Global easing function
    /// </summary>
    public string Easing { get; set; } = "linear";

    /// <summary>
    /// Patches indexed by time (milliseconds)
    /// </summary>
    public Dictionary<int, List<Patch>> Patches { get; set; } = new();

    /// <summary>
    /// Number of keyframes in timeline
    /// </summary>
    public int KeyframeCount { get; set; }

    /// <summary>
    /// Total number of patches across all keyframes
    /// </summary>
    public int TotalPatchCount { get; set; }

    /// <summary>
    /// When this timeline was exported
    /// </summary>
    public DateTime ExportedAt { get; set; } = DateTime.UtcNow;
}
