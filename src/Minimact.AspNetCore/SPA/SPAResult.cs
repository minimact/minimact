namespace Minimact.AspNetCore.SPA;

/// <summary>
/// Wrapper for SPA controller results
/// Provides explicit control over page name and ViewModel
/// </summary>
/// <typeparam name="T">ViewModel type (should inherit from MinimactViewModel)</typeparam>
public record SPAResult<T>(T ViewModel, string? PageName = null) where T : MinimactViewModel
{
    /// <summary>
    /// Create SPA result with ViewModel only (page name inferred from action)
    /// </summary>
    public static SPAResult<T> From(T viewModel) => new(viewModel);

    /// <summary>
    /// Create SPA result with explicit page name
    /// </summary>
    public static SPAResult<T> With(T viewModel, string pageName) => new(viewModel, pageName);
}
