using Minimact.AspNetCore.Plugins;
using Minimact.AspNetCore.Core;

namespace Minimact.Plugin.Clock;

/// <summary>
/// A customizable clock widget plugin for Minimact
/// Displays current time with theme support and configurable format
/// </summary>
[MinimactPlugin("Clock")]
public class ClockPlugin : MinimactPlugin<ClockState>
{
    public override string Name => "Clock";
    public override string Version => "1.0.0";
    public override string Description => "A customizable clock widget with real-time updates";
    public override string Author => "Minimact Team";

    protected override VNode RenderTyped(ClockState state)
    {
        // Format time based on settings
        var timeString = FormatTime(state);
        var dateString = state.Date;
        var themeClass = $"clock-widget {state.Theme}";

        // Build children list
        var children = new List<VNode>
        {
            // Time display
            new VElement("div", new Dictionary<string, string>
            {
                ["className"] = "clock-time"
            }, timeString),

            // Date display
            new VElement("div", new Dictionary<string, string>
            {
                ["className"] = "clock-date"
            }, dateString)
        };

        // Add timezone if enabled
        if (state.ShowTimezone)
        {
            children.Add(new VElement("div", new Dictionary<string, string>
            {
                ["className"] = "clock-timezone"
            }, state.Timezone));
        }

        // Build the clock widget VNode
        return new VElement("div", new Dictionary<string, string>
        {
            ["className"] = themeClass
        }, children.ToArray());
    }

    private string FormatTime(ClockState state)
    {
        int displayHours = state.Hours;
        string period = "";

        // Convert to 12-hour format if needed
        if (!state.Use24Hour)
        {
            period = state.Hours >= 12 ? " PM" : " AM";
            displayHours = state.Hours % 12;
            if (displayHours == 0) displayHours = 12;
        }

        // Build time string
        if (state.ShowSeconds)
        {
            return $"{displayHours:D2}:{state.Minutes:D2}:{state.Seconds:D2}{period}";
        }
        else
        {
            return $"{displayHours:D2}:{state.Minutes:D2}{period}";
        }
    }

    public override PluginAssets GetAssets()
    {
        return new PluginAssets
        {
            CssFiles = new List<string>
            {
                "/plugin-assets/Clock@1.0.0/clock-widget.css"
            },
            Source = AssetSource.Embedded
        };
    }

    public override void Initialize(IServiceProvider services)
    {
        // No special initialization needed
        Console.WriteLine("[Clock Plugin] Initialized v1.0.0");
    }
}
