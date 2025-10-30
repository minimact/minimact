namespace Minimact.AspNetCore.Plugins;

/// <summary>
/// Plugin assets (CSS, JS, images, fonts)
/// </summary>
public class PluginAssets
{
    /// <summary>
    /// CSS files (embedded or CDN URLs)
    /// </summary>
    public List<string> CssFiles { get; set; } = new();

    /// <summary>
    /// JavaScript files (for complex client interactions)
    /// </summary>
    public List<string> JsFiles { get; set; } = new();

    /// <summary>
    /// Images/icons (embedded or CDN URLs)
    /// Key = identifier, Value = URL
    /// </summary>
    public Dictionary<string, string> Images { get; set; } = new();

    /// <summary>
    /// Fonts
    /// </summary>
    public List<string> Fonts { get; set; } = new();

    /// <summary>
    /// Whether assets are embedded resources or external URLs
    /// </summary>
    public AssetSource Source { get; set; } = AssetSource.Embedded;
}

/// <summary>
/// Source of plugin assets
/// </summary>
public enum AssetSource
{
    /// <summary>
    /// Assets embedded in assembly as resources
    /// </summary>
    Embedded,

    /// <summary>
    /// External CDN URLs
    /// </summary>
    Cdn,

    /// <summary>
    /// Combination of embedded and CDN
    /// </summary>
    Mixed
}
