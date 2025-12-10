using Minimact;
using Minimact.Timeline;
using System.Collections.Generic;

[Component]
[Timeline(Duration = 1000, Easing = "easeInOut")]
[Keyframe(0, "opacity", "0")]
[Keyframe(0, "scale", "0.5")]
[Keyframe(0, "x", "-100")]
[Keyframe(500, "opacity", "1")]
[Keyframe(500, "scale", "1.2")]
[Keyframe(500, "x", "0")]
[Keyframe(1000, "opacity", "1")]
[Keyframe(1000, "scale", "1")]
[Keyframe(1000, "x", "0")]
public partial class TimelineAnalyzerExample : MinimactComponent
{
    [State]
    private double opacity = 0;

    [State]
    private double scale = 0.5;

    [State]
    private double x = -100;

    [TimelineComplete]
    private void OnTimelineComplete()
    {
        Console.WriteLine("Animation done");
    }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>
        {
            ["style"] = $"opacity: {opacity}; transform: scale({scale}) translateX({x}px)"
        }, "Animated content");
    }
}

// Timeline analysis:
// {
//   duration: 1000,
//   easing: "easeInOut",
//   keyframes: [
//     { at: 0, properties: { opacity: 0, scale: 0.5, x: -100 } },
//     { at: 500, properties: { opacity: 1, scale: 1.2, x: 0 } },
//     { at: 1000, properties: { opacity: 1, scale: 1, x: 0 } }
//   ],
//   stateBindings: Set { "opacity", "scale", "x" },
//   hasOnComplete: true
// }
