using Minimact;
using Minimact.Timeline;
using System.Collections.Generic;

[Component]
[Timeline(Duration = 2000, Easing = "cubicBezier(0.4, 0, 0.2, 1)", Loop = true)]
[Keyframe(0, "progress", "0")]
[Keyframe(0, "opacity", "0")]
[Keyframe(0, "rotation", "0")]
[Keyframe(500, "opacity", "1")]
[Keyframe(1000, "progress", "50")]
[Keyframe(1000, "rotation", "180")]
[Keyframe(1500, "opacity", "0.5")]
[Keyframe(2000, "progress", "100")]
[Keyframe(2000, "opacity", "1")]
[Keyframe(2000, "rotation", "360")]
public partial class TimelineGeneratorExample : MinimactComponent
{
    [State]
    [TimelineBound]
    private double progress = 0;

    [State]
    [TimelineBound]
    private double opacity = 0;

    [State]
    [TimelineBound]
    private double rotation = 0;

    [TimelineUpdate]
    private void OnTimelineUpdate(double t)
    {
        Console.WriteLine($"Time: {t}");
    }

    [TimelineComplete]
    private void OnTimelineComplete()
    {
        Console.WriteLine("Loop complete");
    }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>
        {
            ["style"] = $"opacity: {opacity}; transform: rotate({rotation}deg); --progress: {progress}%"
        }, new VText($"Animation: {progress}%", "1.1"));
    }
}

// timelineGenerator.cjs generates:
// 1. [Timeline] attribute with duration, easing, loop
// 2. [Keyframe(time, property, value)] for each keyframe entry
// 3. [TimelineBound] on state variables controlled by timeline
// 4. [TimelineUpdate] method for onUpdate callback
// 5. [TimelineComplete] method for onComplete callback
// 6. Timeline metadata JSON for client-side interpolation
