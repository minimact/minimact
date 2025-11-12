namespace Minimact.AspNetCore.SPA;

/// <summary>
/// Base class for Minimact ViewModels with SPA metadata
/// Controllers pass ViewModels to pages, including shell information
/// </summary>
public class MinimactViewModel
{
    /// <summary>
    /// Name of the shell component to use (e.g., "Admin", "Public")
    /// null = use default shell or no shell
    /// </summary>
    public string? __Shell { get; set; }

    /// <summary>
    /// Additional shell-specific data
    /// Can include user info, permissions, layout settings, etc.
    /// </summary>
    public object? __ShellData { get; set; }

    /// <summary>
    /// Page title (for document.title and SEO)
    /// </summary>
    public string? __PageTitle { get; set; }

    /// <summary>
    /// Page name (typically auto-set by renderer)
    /// </summary>
    public string? __PageName { get; set; }
}
