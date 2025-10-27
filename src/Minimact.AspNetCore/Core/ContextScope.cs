namespace Minimact.AspNetCore.Core;

/// <summary>
/// Defines the lifetime scope of a context
/// </summary>
public enum ContextScope
{
    /// <summary>
    /// Cleared after the current request completes
    /// Best for: Temporary calculations, request-specific data
    /// </summary>
    Request,

    /// <summary>
    /// Persists for the duration of the user's session
    /// Best for: User preferences, authentication state, shopping cart
    /// </summary>
    Session,

    /// <summary>
    /// Global, shared across all users and requests
    /// Best for: Feature flags, application configuration
    /// </summary>
    Application,

    /// <summary>
    /// Scoped to a URL pattern (e.g., /dashboard/*, /checkout/**)
    /// Best for: Page-specific filters, multi-step forms, wizards
    /// </summary>
    Url
}
