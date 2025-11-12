using Minimact.AspNetCore.Core;

namespace Minimact.AspNetCore.SPA;

/// <summary>
/// Response returned from NavigateTo SignalR hub method
/// Contains patches and metadata for client-side navigation
/// </summary>
public class NavigationResponse
{
    /// <summary>
    /// Whether navigation succeeded
    /// </summary>
    public bool Success { get; set; } = true;

    /// <summary>
    /// Error message if navigation failed
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Name of the shell component (e.g., "Admin", "Public")
    /// </summary>
    public string? ShellName { get; set; }

    /// <summary>
    /// Whether the shell changed during this navigation
    /// true = full shell+page swap, false = page-only swap
    /// </summary>
    public bool ShellChanged { get; set; }

    /// <summary>
    /// DOM patches to apply (from Rust reconciler)
    /// </summary>
    public List<Patch> Patches { get; set; } = new();

    /// <summary>
    /// Page ViewModel data (for updating MVC state on client)
    /// Serialized as JSON
    /// </summary>
    public object? PageData { get; set; }

    /// <summary>
    /// Final URL for history.pushState()
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Page title (for document.title)
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Name of the page component that was rendered
    /// </summary>
    public string? PageName { get; set; }

    /// <summary>
    /// Create a successful navigation response
    /// </summary>
    public static NavigationResponse CreateSuccess(
        string? shellName,
        bool shellChanged,
        List<Patch> patches,
        object? pageData,
        string url,
        string? pageName = null,
        string? title = null)
    {
        return new NavigationResponse
        {
            Success = true,
            ShellName = shellName,
            ShellChanged = shellChanged,
            Patches = patches,
            PageData = pageData,
            Url = url,
            PageName = pageName,
            Title = title
        };
    }

    /// <summary>
    /// Create a failed navigation response
    /// </summary>
    public static NavigationResponse CreateError(string error)
    {
        return new NavigationResponse
        {
            Success = false,
            Error = error,
            Patches = new List<Patch>()
        };
    }
}
