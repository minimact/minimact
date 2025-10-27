using System.Collections.Concurrent;
using Microsoft.AspNetCore.Http;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// In-memory implementation of context cache
/// Thread-safe and ready for production use
/// Can be swapped with Redis implementation later
/// </summary>
public class InMemoryContextCache : IContextCache
{
    // Request-scoped: cleared after each request
    private readonly Dictionary<string, ContextCacheEntry> _requestCache = new();

    // Session-scoped: keyed by (sessionId, key)
    private readonly ConcurrentDictionary<(string, string), ContextCacheEntry> _sessionCache = new();

    // Application-scoped: global, thread-safe
    private readonly ConcurrentDictionary<string, ContextCacheEntry> _appCache = new();

    // URL-scoped: keyed by (sessionId, urlPattern, key)
    private readonly ConcurrentDictionary<(string, string, string), ContextCacheEntry> _urlCache = new();

    private readonly IHttpContextAccessor _httpContextAccessor;

    public InMemoryContextCache(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public T? Get<T>(string key, ContextScope scope, string? urlPattern = null)
    {
        ContextCacheEntry? entry = scope switch
        {
            ContextScope.Request => GetRequestEntry(key),
            ContextScope.Session => GetSessionEntry(key),
            ContextScope.Application => GetAppEntry(key),
            ContextScope.Url => GetUrlEntry(key, urlPattern),
            _ => null
        };

        if (entry == null || entry.IsExpired)
        {
            if (entry?.IsExpired == true)
            {
                // Remove expired entry
                Clear(key, scope, urlPattern);
            }
            return default;
        }

        // Update last accessed time
        entry.Touch();

        return (T?)entry.Value;
    }

    public void Set<T>(string key, T value, ContextScope scope, string? urlPattern = null, int? expiryMs = null)
    {
        var entry = new ContextCacheEntry
        {
            Value = value!,
            Scope = scope,
            UrlPattern = urlPattern,
            ExpiresAt = expiryMs.HasValue
                ? DateTime.UtcNow.AddMilliseconds(expiryMs.Value)
                : null
        };

        switch (scope)
        {
            case ContextScope.Request:
                lock (_requestCache)
                {
                    _requestCache[key] = entry;
                }
                break;

            case ContextScope.Session:
                var sessionId = GetSessionId();
                _sessionCache[(sessionId, key)] = entry;
                break;

            case ContextScope.Application:
                _appCache[key] = entry;
                break;

            case ContextScope.Url:
                if (string.IsNullOrEmpty(urlPattern))
                    throw new ArgumentException("URL pattern required for URL-scoped context", nameof(urlPattern));

                var sid = GetSessionId();
                _urlCache[(sid, urlPattern, key)] = entry;
                break;
        }
    }

    public void Clear(string key, ContextScope scope, string? urlPattern = null)
    {
        switch (scope)
        {
            case ContextScope.Request:
                lock (_requestCache)
                {
                    _requestCache.Remove(key);
                }
                break;

            case ContextScope.Session:
                var sessionId = GetSessionId();
                _sessionCache.TryRemove((sessionId, key), out _);
                break;

            case ContextScope.Application:
                _appCache.TryRemove(key, out _);
                break;

            case ContextScope.Url:
                if (!string.IsNullOrEmpty(urlPattern))
                {
                    var sid = GetSessionId();
                    _urlCache.TryRemove((sid, urlPattern, key), out _);
                }
                break;
        }
    }

    public void ClearExpired()
    {
        // Session cache
        var expiredSession = _sessionCache
            .Where(kvp => kvp.Value.IsExpired)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in expiredSession)
            _sessionCache.TryRemove(key, out _);

        // App cache
        var expiredApp = _appCache
            .Where(kvp => kvp.Value.IsExpired)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in expiredApp)
            _appCache.TryRemove(key, out _);

        // URL cache
        var expiredUrl = _urlCache
            .Where(kvp => kvp.Value.IsExpired)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in expiredUrl)
            _urlCache.TryRemove(key, out _);
    }

    public void ClearRequestScope()
    {
        lock (_requestCache)
        {
            _requestCache.Clear();
        }
    }

    public void ClearSession(string sessionId)
    {
        // Clear session cache
        var sessionKeys = _sessionCache.Keys
            .Where(k => k.Item1 == sessionId)
            .ToList();

        foreach (var key in sessionKeys)
            _sessionCache.TryRemove(key, out _);

        // Clear URL cache for this session
        var urlKeys = _urlCache.Keys
            .Where(k => k.Item1 == sessionId)
            .ToList();

        foreach (var key in urlKeys)
            _urlCache.TryRemove(key, out _);
    }

    public void ClearNonMatchingUrlScopes(string sessionId, string currentUrl)
    {
        // Find all URL-scoped entries for this session that don't match current URL
        var keysToRemove = _urlCache.Keys
            .Where(k =>
                k.Item1 == sessionId &&
                !UrlPatternMatcher.Matches(k.Item2, currentUrl))
            .ToList();

        foreach (var key in keysToRemove)
            _urlCache.TryRemove(key, out _);
    }

    // Helper methods
    private ContextCacheEntry? GetRequestEntry(string key)
    {
        lock (_requestCache)
        {
            return _requestCache.TryGetValue(key, out var entry) ? entry : null;
        }
    }

    private ContextCacheEntry? GetSessionEntry(string key)
    {
        var sessionId = GetSessionId();
        return _sessionCache.TryGetValue((sessionId, key), out var entry) ? entry : null;
    }

    private ContextCacheEntry? GetAppEntry(string key)
    {
        return _appCache.TryGetValue(key, out var entry) ? entry : null;
    }

    private ContextCacheEntry? GetUrlEntry(string key, string? urlPattern)
    {
        if (string.IsNullOrEmpty(urlPattern))
            return null;

        var sessionId = GetSessionId();
        var currentUrl = GetCurrentUrl();

        // Check if URL pattern matches current URL
        if (!UrlPatternMatcher.Matches(urlPattern, currentUrl))
            return null;

        // Find entry with matching URL pattern
        return _urlCache.TryGetValue((sessionId, urlPattern, key), out var entry) ? entry : null;
    }

    private string GetSessionId()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext == null)
            throw new InvalidOperationException("No HTTP context available");

        // Ensure session is started
        if (string.IsNullOrEmpty(httpContext.Session.Id))
        {
            // Access Session.IsAvailable to trigger session start
            _ = httpContext.Session.IsAvailable;
            httpContext.Session.SetString("_minimact_init", "1");
        }

        return httpContext.Session.Id;
    }

    private string GetCurrentUrl()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext == null)
            throw new InvalidOperationException("No HTTP context available");

        return httpContext.Request.Path.Value ?? "/";
    }
}
