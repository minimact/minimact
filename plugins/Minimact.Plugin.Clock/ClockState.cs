namespace Minimact.Plugin.Clock;

/// <summary>
/// State contract for the Clock plugin
/// </summary>
public class ClockState
{
    /// <summary>
    /// Hour (0-23)
    /// </summary>
    public int Hours { get; set; }

    /// <summary>
    /// Minute (0-59)
    /// </summary>
    public int Minutes { get; set; }

    /// <summary>
    /// Second (0-59)
    /// </summary>
    public int Seconds { get; set; }

    /// <summary>
    /// Formatted date string (e.g., "October 29, 2025")
    /// </summary>
    public string Date { get; set; } = string.Empty;

    /// <summary>
    /// Theme: "light" or "dark"
    /// </summary>
    public string Theme { get; set; } = "light";

    /// <summary>
    /// Timezone (e.g., "UTC", "America/New_York")
    /// </summary>
    public string Timezone { get; set; } = "UTC";

    /// <summary>
    /// Whether to show the timezone indicator
    /// </summary>
    public bool ShowTimezone { get; set; } = false;

    /// <summary>
    /// Whether to show seconds
    /// </summary>
    public bool ShowSeconds { get; set; } = true;

    /// <summary>
    /// Whether to use 24-hour format (false = 12-hour with AM/PM)
    /// </summary>
    public bool Use24Hour { get; set; } = true;
}
