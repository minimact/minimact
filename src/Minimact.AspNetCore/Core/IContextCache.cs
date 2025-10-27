namespace Minimact.AspNetCore.Core;

/// <summary>
/// Interface for context caching (in-memory or Redis)
/// Provides server-side state management with flexible scoping
/// </summary>
public interface IContextCache
{
    /// <summary>
    /// Get a context value
    /// </summary>
    /// <typeparam name="T">Type of the cached value</typeparam>
    /// <param name="key">Context key</param>
    /// <param name="scope">Scope of the context (Request, Session, Application, URL)</param>
    /// <param name="urlPattern">URL pattern (required for URL scope)</param>
    /// <returns>Cached value or default if not found/expired</returns>
    T? Get<T>(string key, ContextScope scope, string? urlPattern = null);

    /// <summary>
    /// Set a context value
    /// </summary>
    /// <typeparam name="T">Type of the value to cache</typeparam>
    /// <param name="key">Context key</param>
    /// <param name="value">Value to cache</param>
    /// <param name="scope">Scope of the context</param>
    /// <param name="urlPattern">URL pattern (required for URL scope)</param>
    /// <param name="expiryMs">Expiry time in milliseconds (null = no expiry)</param>
    void Set<T>(string key, T value, ContextScope scope, string? urlPattern = null, int? expiryMs = null);

    /// <summary>
    /// Clear a specific context value
    /// </summary>
    /// <param name="key">Context key to clear</param>
    /// <param name="scope">Scope of the context</param>
    /// <param name="urlPattern">URL pattern (required for URL scope)</param>
    void Clear(string key, ContextScope scope, string? urlPattern = null);

    /// <summary>
    /// Clear all expired entries across all scopes
    /// Called periodically by middleware
    /// </summary>
    void ClearExpired();

    /// <summary>
    /// Clear all request-scoped entries
    /// Called at the end of each HTTP request
    /// </summary>
    void ClearRequestScope();

    /// <summary>
    /// Clear all entries for a specific session
    /// Called when a session expires
    /// </summary>
    /// <param name="sessionId">Session ID to clear</param>
    void ClearSession(string sessionId);

    /// <summary>
    /// Clear all URL-scoped entries that don't match the current URL
    /// Called when navigating to a different URL pattern
    /// </summary>
    /// <param name="sessionId">Session ID</param>
    /// <param name="currentUrl">Current URL path</param>
    void ClearNonMatchingUrlScopes(string sessionId, string currentUrl);
}
