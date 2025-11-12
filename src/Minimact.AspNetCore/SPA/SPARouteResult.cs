namespace Minimact.AspNetCore.SPA;

/// <summary>
/// Result of routing a URL to a controller action
/// Contains all information needed to render a page
/// </summary>
public class SPARouteResult
{
    /// <summary>
    /// Whether routing succeeded
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if routing failed
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// The ViewModel returned by the controller
    /// </summary>
    public object? ViewModel { get; set; }

    /// <summary>
    /// Name of the page component to render
    /// Extracted from controller result or convention
    /// </summary>
    public string? PageName { get; set; }

    /// <summary>
    /// Shell name (from ViewModel.__Shell)
    /// </summary>
    public string? ShellName { get; set; }

    /// <summary>
    /// The matched URL (normalized)
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Create a successful route result
    /// </summary>
    public static SPARouteResult CreateSuccess(object viewModel, string pageName, string? shellName, string url)
    {
        return new SPARouteResult
        {
            Success = true,
            ViewModel = viewModel,
            PageName = pageName,
            ShellName = shellName,
            Url = url
        };
    }

    /// <summary>
    /// Create a failed route result
    /// </summary>
    public static SPARouteResult CreateError(string error, string url)
    {
        return new SPARouteResult
        {
            Success = false,
            Error = error,
            Url = url
        };
    }
}
