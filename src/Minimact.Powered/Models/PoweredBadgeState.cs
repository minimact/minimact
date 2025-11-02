namespace Minimact.Powered.Models;

/// <summary>
/// State for the "Powered by Minimact" badge
/// </summary>
public class PoweredBadgeState
{
    /// <summary>
    /// Badge position on screen
    /// </summary>
    public BadgePosition Position { get; set; } = BadgePosition.BottomRight;

    /// <summary>
    /// Whether badge is expanded (showing full text)
    /// </summary>
    public bool Expanded { get; set; } = false;

    /// <summary>
    /// Theme: "dark" or "light"
    /// </summary>
    public string Theme { get; set; } = "dark";

    /// <summary>
    /// Animation duration in milliseconds
    /// </summary>
    public int AnimationDuration { get; set; } = 300;

    /// <summary>
    /// Custom link URL (default: https://minimact.dev)
    /// </summary>
    public string? LinkUrl { get; set; }

    /// <summary>
    /// Whether to open link in new tab
    /// </summary>
    public bool OpenInNewTab { get; set; } = true;
}

/// <summary>
/// Badge position on screen
/// </summary>
public enum BadgePosition
{
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight
}
