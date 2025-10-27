namespace Minimact.AspNetCore.Core;

/// <summary>
/// Represents a cached context value with metadata
/// Used internally by IContextCache implementations
/// </summary>
public class ContextCacheEntry
{
    /// <summary>
    /// The cached value (can be any type)
    /// </summary>
    public object Value { get; set; } = null!;

    /// <summary>
    /// When the cache entry expires (null = never expires)
    /// </summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>
    /// The scope of this cache entry
    /// </summary>
    public ContextScope Scope { get; set; }

    /// <summary>
    /// URL pattern (for URL-scoped contexts)
    /// Example: "/dashboard/*", "/checkout/**"
    /// </summary>
    public string? UrlPattern { get; set; }

    /// <summary>
    /// Check if this entry has expired
    /// </summary>
    public bool IsExpired => ExpiresAt.HasValue && DateTime.UtcNow > ExpiresAt.Value;

    /// <summary>
    /// When this entry was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When this entry was last accessed
    /// </summary>
    public DateTime LastAccessedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Update the last accessed time
    /// </summary>
    public void Touch()
    {
        LastAccessedAt = DateTime.UtcNow;
    }
}
