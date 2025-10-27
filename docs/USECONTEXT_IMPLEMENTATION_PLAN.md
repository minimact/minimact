# useContext Implementation Plan

## Overview

Implement `useContext` as a **server-side cache system** with support for multiple scopes including URL pattern-based scoping. This reimagines React's context API as a Redis-like in-memory cache that enables shared state across components with flexible lifetime management.

---

## Goals

1. ✅ **Server-side shared state** - Components share data via cache, not component tree
2. ✅ **Multiple scope types** - Request, Session, Application, and URL-based scoping
3. ✅ **URL pattern matching** - Context scoped to URL globs (e.g., `/dashboard/*`, `/checkout/**`)
4. ✅ **Automatic cleanup** - Context cleared based on scope rules and expiry
5. ✅ **Redis-ready architecture** - Easy to swap in-memory cache for Redis later
6. ✅ **Type-safe** - Full TypeScript and C# type safety

---

## API Design

### Basic Usage

```tsx
import { createContext, useContext } from 'minimact';

// Create context with scope
const UserContext = createContext<User>('current-user', {
  scope: 'session',
  expiry: 3600000 // 1 hour
});

// Write to context
function LoginForm() {
  const [_, setUser] = useContext(UserContext);

  const handleLogin = async (credentials) => {
    const user = await authenticate(credentials);
    setUser(user); // Stored in session-scoped cache
  };

  return <form onSubmit={handleLogin}>...</form>;
}

// Read from context (different component, no parent-child relationship needed)
function UserProfile() {
  const [user] = useContext(UserContext);

  if (!user) return <Login />;
  return <div>Welcome, {user.name}</div>;
}
```

### URL-Scoped Context

```tsx
// Context only exists while on /dashboard/*
const DashboardFilters = createContext<Filters>('dashboard-filters', {
  scope: 'url',
  urlPattern: '/dashboard/*',
  expiry: 3600000
});

function FilterPanel() {
  const [filters, setFilters] = useContext(DashboardFilters);

  return (
    <input
      value={filters?.search}
      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
    />
  );
}

// Works on /dashboard/analytics, /dashboard/reports, etc.
// Automatically cleared when navigating to /home, /settings, etc.
```

### API Signature

```typescript
// Create context
function createContext<T>(
  key: string,
  options?: ContextOptions
): Context<T>

// Use context
function useContext<T>(
  context: Context<T>
): [T | undefined, (value: T) => void, () => void]

// Types
interface ContextOptions {
  scope?: 'request' | 'session' | 'application' | 'url';
  urlPattern?: string;     // Required when scope='url'
  expiry?: number;         // Cache expiry in ms
  defaultValue?: T;        // Default value if not set
}

interface Context<T> {
  key: string;
  options: ContextOptions;
}
```

---

## Implementation Steps

### Phase 1: Client-Side Implementation

#### 1.1 Context Creation

**File:** `src/client-runtime/src/useContext.ts`

```typescript
export interface ContextOptions {
  scope?: 'request' | 'session' | 'application' | 'url';
  urlPattern?: string;
  expiry?: number;
  defaultValue?: any;
}

export interface Context<T> {
  key: string;
  options: ContextOptions;
}

/**
 * Create a context with specified scope and options
 */
export function createContext<T>(
  key: string,
  options: ContextOptions = {}
): Context<T> {
  // Validate URL pattern if scope is 'url'
  if (options.scope === 'url' && !options.urlPattern) {
    throw new Error(`Context '${key}' with scope 'url' requires urlPattern`);
  }

  return {
    key,
    options: {
      scope: options.scope || 'request',
      urlPattern: options.urlPattern,
      expiry: options.expiry,
      defaultValue: options.defaultValue
    }
  };
}
```

#### 1.2 useContext Hook

```typescript
import { useState } from './hooks';
import { SignalRManager } from './signalr-manager';

let currentContext: ComponentContext | null = null;

export function setContextHookContext(context: ComponentContext): void {
  currentContext = context;
}

/**
 * Use a context - returns [value, setValue, clearValue]
 */
export function useContext<T>(
  context: Context<T>
): [T | undefined, (value: T) => void, () => void] {
  if (!currentContext) {
    throw new Error('useContext must be called within a component render');
  }

  const ctx = currentContext;
  const stateKey = `context_${context.key}`;

  // Get current value from component state
  const [value, setValue] = useState<T | undefined>(
    context.options.defaultValue
  );

  // Setter - updates local state and syncs to server
  const setContextValue = (newValue: T) => {
    // Update local state immediately
    setValue(newValue);

    // Sync to server cache
    ctx.signalR.invoke('UpdateContext', {
      key: context.key,
      value: newValue,
      scope: context.options.scope,
      urlPattern: context.options.urlPattern,
      expiry: context.options.expiry
    }).catch(err => {
      console.error(`[Minimact] Failed to update context '${context.key}':`, err);
    });
  };

  // Clear - removes value from cache
  const clearContextValue = () => {
    setValue(undefined);

    ctx.signalR.invoke('ClearContext', {
      key: context.key,
      scope: context.options.scope,
      urlPattern: context.options.urlPattern
    }).catch(err => {
      console.error(`[Minimact] Failed to clear context '${context.key}':`, err);
    });
  };

  return [value, setContextValue, clearContextValue];
}
```

#### 1.3 Export from index.ts

**File:** `src/client-runtime/src/index.ts`

```typescript
export { createContext, useContext } from './useContext';
export type { Context, ContextOptions } from './useContext';
```

---

### Phase 2: Server-Side Implementation

#### 2.1 Context Scope Enum

**File:** `src/Minimact.AspNetCore/Core/ContextScope.cs`

```csharp
namespace Minimact.AspNetCore.Core;

/// <summary>
/// Defines the lifetime scope of a context
/// </summary>
public enum ContextScope
{
    /// <summary>
    /// Cleared after the current request completes
    /// </summary>
    Request,

    /// <summary>
    /// Persists for the duration of the user's session
    /// </summary>
    Session,

    /// <summary>
    /// Global, shared across all users and requests
    /// </summary>
    Application,

    /// <summary>
    /// Scoped to a URL pattern (e.g., /dashboard/*)
    /// </summary>
    Url
}
```

#### 2.2 URL Pattern Matcher

**File:** `src/Minimact.AspNetCore/Core/UrlPatternMatcher.cs`

```csharp
using System.Text.RegularExpressions;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Matches URLs against glob patterns
/// </summary>
public static class UrlPatternMatcher
{
    /// <summary>
    /// Check if a URL matches a glob pattern
    /// </summary>
    /// <param name="pattern">Glob pattern (e.g., /dashboard/*, /api/**)</param>
    /// <param name="url">URL to test</param>
    /// <returns>True if URL matches pattern</returns>
    public static bool Matches(string pattern, string url)
    {
        var regex = GlobToRegex(pattern);
        return Regex.IsMatch(url, regex, RegexOptions.IgnoreCase);
    }

    /// <summary>
    /// Convert glob pattern to regular expression
    /// </summary>
    private static string GlobToRegex(string pattern)
    {
        // Escape special regex characters
        var escaped = Regex.Escape(pattern);

        // Replace escaped glob patterns
        var regex = escaped
            .Replace(@"\*\*", ".*")           // ** = match any characters
            .Replace(@"\*", "[^/]+")          // * = match any characters except /
            .Replace(@"\:([a-zA-Z]+)", "[^/]+"); // :param = match segment

        return $"^{regex}$";
    }

    /// <summary>
    /// Extract parameters from URL based on pattern
    /// </summary>
    /// <param name="pattern">Pattern with :param placeholders</param>
    /// <param name="url">Actual URL</param>
    /// <returns>Dictionary of parameter names to values</returns>
    public static Dictionary<string, string> ExtractParams(string pattern, string url)
    {
        var result = new Dictionary<string, string>();

        // Find all :param patterns
        var paramRegex = new Regex(@":([a-zA-Z]+)");
        var matches = paramRegex.Matches(pattern);

        if (matches.Count == 0)
            return result;

        // Build regex to capture param values
        var capturePattern = pattern;
        foreach (Match match in matches)
        {
            var paramName = match.Groups[1].Value;
            capturePattern = capturePattern.Replace($":{paramName}", $"(?<{paramName}>[^/]+)");
        }

        var captureRegex = new Regex($"^{capturePattern}$");
        var urlMatch = captureRegex.Match(url);

        if (urlMatch.Success)
        {
            foreach (Match match in matches)
            {
                var paramName = match.Groups[1].Value;
                result[paramName] = urlMatch.Groups[paramName].Value;
            }
        }

        return result;
    }
}
```

#### 2.3 Context Cache Entry

**File:** `src/Minimact.AspNetCore/Core/ContextCacheEntry.cs`

```csharp
namespace Minimact.AspNetCore.Core;

/// <summary>
/// Represents a cached context value with metadata
/// </summary>
public class ContextCacheEntry
{
    /// <summary>
    /// The cached value
    /// </summary>
    public object Value { get; set; } = null!;

    /// <summary>
    /// When the cache entry expires (null = never)
    /// </summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>
    /// The scope of this cache entry
    /// </summary>
    public ContextScope Scope { get; set; }

    /// <summary>
    /// URL pattern (for URL-scoped contexts)
    /// </summary>
    public string? UrlPattern { get; set; }

    /// <summary>
    /// Check if this entry has expired
    /// </summary>
    public bool IsExpired => ExpiresAt.HasValue && DateTime.UtcNow > ExpiresAt.Value;
}
```

#### 2.4 Context Cache Interface

**File:** `src/Minimact.AspNetCore/Core/IContextCache.cs`

```csharp
namespace Minimact.AspNetCore.Core;

/// <summary>
/// Interface for context caching (in-memory or Redis)
/// </summary>
public interface IContextCache
{
    /// <summary>
    /// Get a context value
    /// </summary>
    T? Get<T>(string key, ContextScope scope, string? urlPattern = null);

    /// <summary>
    /// Set a context value
    /// </summary>
    void Set<T>(string key, T value, ContextScope scope, string? urlPattern = null, int? expiryMs = null);

    /// <summary>
    /// Clear a context value
    /// </summary>
    void Clear(string key, ContextScope scope, string? urlPattern = null);

    /// <summary>
    /// Clear all expired entries
    /// </summary>
    void ClearExpired();

    /// <summary>
    /// Clear all request-scoped entries
    /// </summary>
    void ClearRequestScope();

    /// <summary>
    /// Clear all entries for a session
    /// </summary>
    void ClearSession(string sessionId);
}
```

#### 2.5 In-Memory Context Cache

**File:** `src/Minimact.AspNetCore/Core/InMemoryContextCache.cs`

```csharp
using System.Collections.Concurrent;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// In-memory implementation of context cache
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
                _requestCache[key] = entry;
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
                    throw new ArgumentException("URL pattern required for URL-scoped context");

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
                _requestCache.Remove(key);
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
        _requestCache.Clear();
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

    // Helper methods
    private ContextCacheEntry? GetRequestEntry(string key)
    {
        return _requestCache.TryGetValue(key, out var entry) ? entry : null;
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

        // Find entry with matching URL pattern
        var matchingKey = _urlCache.Keys
            .FirstOrDefault(k =>
                k.Item1 == sessionId &&
                k.Item3 == key &&
                UrlPatternMatcher.Matches(k.Item2, currentUrl));

        if (matchingKey == default)
            return null;

        return _urlCache.TryGetValue(matchingKey, out var entry) ? entry : null;
    }

    private string GetSessionId()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext == null)
            throw new InvalidOperationException("No HTTP context available");

        // Ensure session is started
        if (string.IsNullOrEmpty(httpContext.Session.Id))
            httpContext.Session.SetString("_init", "1");

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
```

#### 2.6 SignalR Hub Methods

**File:** `src/Minimact.AspNetCore/SignalR/MinimactHub.cs`

Add these methods:

```csharp
public class UpdateContextRequest
{
    public string Key { get; set; } = null!;
    public object Value { get; set; } = null!;
    public string Scope { get; set; } = "request";
    public string? UrlPattern { get; set; }
    public int? Expiry { get; set; }
}

public class ClearContextRequest
{
    public string Key { get; set; } = null!;
    public string Scope { get; set; } = "request";
    public string? UrlPattern { get; set; }
}

/// <summary>
/// Update a context value from the client
/// </summary>
public async Task UpdateContext(UpdateContextRequest request)
{
    try
    {
        // Parse scope
        var scope = Enum.Parse<ContextScope>(request.Scope, ignoreCase: true);

        // Update cache
        _contextCache.Set(
            request.Key,
            request.Value,
            scope,
            request.UrlPattern,
            request.Expiry
        );

        // Find all components using this context and trigger re-render
        var components = _registry.GetComponentsUsingContext(request.Key);

        foreach (var componentId in components)
        {
            var component = _registry.GetComponent(componentId);
            if (component != null)
            {
                component.TriggerRender();
            }
        }
    }
    catch (Exception ex)
    {
        await Clients.Caller.SendAsync("Error", $"Error updating context: {ex.Message}");
    }
}

/// <summary>
/// Clear a context value from the client
/// </summary>
public async Task ClearContext(ClearContextRequest request)
{
    try
    {
        var scope = Enum.Parse<ContextScope>(request.Scope, ignoreCase: true);

        _contextCache.Clear(request.Key, scope, request.UrlPattern);

        // Re-render components using this context
        var components = _registry.GetComponentsUsingContext(request.Key);

        foreach (var componentId in components)
        {
            var component = _registry.GetComponent(componentId);
            if (component != null)
            {
                component.TriggerRender();
            }
        }
    }
    catch (Exception ex)
    {
        await Clients.Caller.SendAsync("Error", $"Error clearing context: {ex.Message}");
    }
}
```

#### 2.7 Component Context Access

**File:** `src/Minimact.AspNetCore/Core/MinimactComponent.cs`

Add these methods:

```csharp
/// <summary>
/// Get a context value
/// </summary>
protected T? GetContext<T>(string key, ContextScope scope = ContextScope.Request, string? urlPattern = null)
{
    return _contextCache.Get<T>(key, scope, urlPattern);
}

/// <summary>
/// Set a context value
/// </summary>
protected void SetContext<T>(string key, T value, ContextScope scope = ContextScope.Request, string? urlPattern = null, int? expiryMs = null)
{
    _contextCache.Set(key, value, scope, urlPattern, expiryMs);
}

/// <summary>
/// Clear a context value
/// </summary>
protected void ClearContext(string key, ContextScope scope = ContextScope.Request, string? urlPattern = null)
{
    _contextCache.Clear(key, scope, urlPattern);
}
```

#### 2.8 Component Registry Tracking

**File:** `src/Minimact.AspNetCore/Core/ComponentRegistry.cs`

Add tracking for which components use which contexts:

```csharp
private readonly ConcurrentDictionary<string, HashSet<string>> _contextUsage = new();

public void RegisterContextUsage(string componentId, string contextKey)
{
    _contextUsage.AddOrUpdate(
        contextKey,
        new HashSet<string> { componentId },
        (_, existing) => { existing.Add(componentId); return existing; }
    );
}

public IEnumerable<string> GetComponentsUsingContext(string contextKey)
{
    return _contextUsage.TryGetValue(contextKey, out var components)
        ? components
        : Enumerable.Empty<string>();
}
```

#### 2.9 Service Registration

**File:** `src/Minimact.AspNetCore/Extensions/ServiceCollectionExtensions.cs`

```csharp
public static IServiceCollection AddMinimact(this IServiceCollection services)
{
    // ... existing registrations

    // Register context cache
    services.AddSingleton<IContextCache, InMemoryContextCache>();

    // Add session support (required for session-scoped contexts)
    services.AddDistributedMemoryCache();
    services.AddSession(options =>
    {
        options.IdleTimeout = TimeSpan.FromMinutes(30);
        options.Cookie.HttpOnly = true;
        options.Cookie.IsEssential = true;
    });

    return services;
}
```

#### 2.10 Request Pipeline Middleware

**File:** `src/Minimact.AspNetCore/Middleware/ContextCacheMiddleware.cs`

```csharp
namespace Minimact.AspNetCore.Middleware;

/// <summary>
/// Middleware to clean up request-scoped contexts after each request
/// </summary>
public class ContextCacheMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IContextCache _cache;

    public ContextCacheMiddleware(RequestDelegate next, IContextCache cache)
    {
        _next = next;
        _cache = cache;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        finally
        {
            // Clear request-scoped contexts
            _cache.ClearRequestScope();

            // Periodically clear expired entries (every 100 requests)
            if (Random.Shared.Next(100) == 0)
            {
                _cache.ClearExpired();
            }
        }
    }
}

public static class ContextCacheMiddlewareExtensions
{
    public static IApplicationBuilder UseContextCache(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<ContextCacheMiddleware>();
    }
}
```

Add to Program.cs:
```csharp
app.UseSession();
app.UseContextCache();
```

---

### Phase 3: Testing

#### 3.1 Unit Tests

**File:** `tests/Minimact.AspNetCore.Tests/ContextCacheTests.cs`

```csharp
using Xunit;
using Minimact.AspNetCore.Core;

public class ContextCacheTests
{
    [Fact]
    public void RequestScope_ClearsAfterRequest()
    {
        var cache = new InMemoryContextCache(MockHttpContextAccessor());

        cache.Set("test", "value", ContextScope.Request);
        Assert.Equal("value", cache.Get<string>("test", ContextScope.Request));

        cache.ClearRequestScope();
        Assert.Null(cache.Get<string>("test", ContextScope.Request));
    }

    [Fact]
    public void SessionScope_PersistsAcrossRequests()
    {
        var cache = new InMemoryContextCache(MockHttpContextAccessor());

        cache.Set("user", "Alice", ContextScope.Session);
        cache.ClearRequestScope(); // Simulate request end

        Assert.Equal("Alice", cache.Get<string>("user", ContextScope.Session));
    }

    [Fact]
    public void Expiry_ClearsAfterTimeout()
    {
        var cache = new InMemoryContextCache(MockHttpContextAccessor());

        cache.Set("temp", "value", ContextScope.Session, expiryMs: 100);
        Assert.Equal("value", cache.Get<string>("temp", ContextScope.Session));

        Thread.Sleep(150);
        Assert.Null(cache.Get<string>("temp", ContextScope.Session));
    }

    [Fact]
    public void UrlPattern_MatchesGlobs()
    {
        Assert.True(UrlPatternMatcher.Matches("/dashboard/*", "/dashboard/analytics"));
        Assert.True(UrlPatternMatcher.Matches("/dashboard/**", "/dashboard/reports/sales"));
        Assert.False(UrlPatternMatcher.Matches("/dashboard/*", "/settings"));
    }

    [Fact]
    public void UrlPattern_ExtractsParams()
    {
        var params = UrlPatternMatcher.ExtractParams(
            "/products/:category/:id",
            "/products/electronics/123"
        );

        Assert.Equal("electronics", params["category"]);
        Assert.Equal("123", params["id"]);
    }
}
```

#### 3.2 Integration Tests

**File:** `tests/Integration/ContextIntegrationTests.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { createContext, useContext } from '../src/useContext';

describe('useContext', () => {
  it('should create context with default options', () => {
    const ctx = createContext<string>('test');
    expect(ctx.key).toBe('test');
    expect(ctx.options.scope).toBe('request');
  });

  it('should require urlPattern for URL scope', () => {
    expect(() => {
      createContext('test', { scope: 'url' });
    }).toThrow();
  });

  it('should sync value to server', async () => {
    const ctx = createContext<number>('counter', { scope: 'session' });
    const [value, setValue] = useContext(ctx);

    setValue(42);

    // Verify SignalR call was made
    expect(mockSignalR.invoke).toHaveBeenCalledWith('UpdateContext', {
      key: 'counter',
      value: 42,
      scope: 'session',
      urlPattern: undefined,
      expiry: undefined
    });
  });
});
```

---

### Phase 4: Documentation

#### 4.1 API Reference

**File:** `docs-mvp/v1.0/api/hooks.md`

Add section:

```markdown
### useContext

Server-side shared state with flexible scoping (request, session, application, or URL-based).

**Signature:**
```tsx
function createContext<T>(
  key: string,
  options?: ContextOptions
): Context<T>

function useContext<T>(
  context: Context<T>
): [T | undefined, (value: T) => void, () => void]

interface ContextOptions {
  scope?: 'request' | 'session' | 'application' | 'url';
  urlPattern?: string;
  expiry?: number;
  defaultValue?: T;
}
```

**Returns:** `[value, setValue, clearValue]`

**Example - Session Scope:**
```tsx
const UserContext = createContext<User>('current-user', {
  scope: 'session',
  expiry: 3600000 // 1 hour
});

function LoginForm() {
  const [_, setUser] = useContext(UserContext);

  const handleLogin = async (creds) => {
    const user = await api.login(creds);
    setUser(user);
  };

  return <form onSubmit={handleLogin}>...</form>;
}

function UserProfile() {
  const [user] = useContext(UserContext);
  return <div>Welcome, {user?.name}</div>;
}
```

**Example - URL Scope:**
```tsx
const DashboardFilters = createContext<Filters>('filters', {
  scope: 'url',
  urlPattern: '/dashboard/*',
  expiry: 3600000
});

function FilterPanel() {
  const [filters, setFilters] = useContext(DashboardFilters);

  return (
    <input
      value={filters?.search}
      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
    />
  );
}

// Works on /dashboard/analytics, /dashboard/reports
// Cleared when navigating to /settings
```

**Example - Multi-Step Form:**
```tsx
const CheckoutWizard = createContext('checkout', {
  scope: 'url',
  urlPattern: '/checkout/*',
  expiry: 600000 // 10 minutes
});

// Step 1: /checkout/shipping
function ShippingStep() {
  const [data, setData] = useContext(CheckoutWizard);
  return <form onSubmit={() => setData({ ...data, shipping: '...' })}>...</form>;
}

// Step 2: /checkout/payment (data persists!)
function PaymentStep() {
  const [data] = useContext(CheckoutWizard);
  return <div>Shipping to: {data?.shipping}</div>;
}
```

**Server-Side Access:**
```csharp
public class UserProfile : MinimactComponent
{
    protected override VNode Render()
    {
        var user = GetContext<User>("current-user", ContextScope.Session);

        if (user == null)
            return new VElement("div", null, new VText("Please log in"));

        return new VElement("div", null, new VText($"Welcome, {user.Name}"));
    }
}
```

**Scope Comparison:**

| Scope | Lifetime | Cleared When | Best For |
|-------|----------|--------------|----------|
| request | Single request | Response sent | Temporary calculations |
| session | User session | Session expires | User preferences, auth |
| url | While on URL | Navigate away | Page filters, wizards |
| application | App lifetime | Server restart | Feature flags, config |

**When to Use:**
- Session management (user, cart, preferences)
- Multi-step forms (wizards)
- Page-specific filters and state
- Feature flags and configuration
- Shared data between unrelated components
```

#### 4.2 Examples

**File:** `docs-mvp/v1.0/examples/use-context.md`

Create comprehensive examples for each scope type.

---

### Phase 5: Advanced Features (Optional)

#### 5.1 Redis Backend

**File:** `src/Minimact.AspNetCore/Core/RedisContextCache.cs`

```csharp
using StackExchange.Redis;
using System.Text.Json;

public class RedisContextCache : IContextCache
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public RedisContextCache(
        IConnectionMultiplexer redis,
        IHttpContextAccessor httpContextAccessor)
    {
        _redis = redis;
        _httpContextAccessor = httpContextAccessor;
    }

    public T? Get<T>(string key, ContextScope scope, string? urlPattern = null)
    {
        var db = _redis.GetDatabase();
        var redisKey = BuildRedisKey(key, scope, urlPattern);
        var value = db.StringGet(redisKey);

        return value.HasValue
            ? JsonSerializer.Deserialize<T>(value.ToString())
            : default;
    }

    public void Set<T>(string key, T value, ContextScope scope, string? urlPattern = null, int? expiryMs = null)
    {
        var db = _redis.GetDatabase();
        var redisKey = BuildRedisKey(key, scope, urlPattern);
        var json = JsonSerializer.Serialize(value);

        if (expiryMs.HasValue)
        {
            db.StringSet(redisKey, json, TimeSpan.FromMilliseconds(expiryMs.Value));
        }
        else
        {
            db.StringSet(redisKey, json);
        }
    }

    private string BuildRedisKey(string key, ContextScope scope, string? urlPattern)
    {
        return scope switch
        {
            ContextScope.Request => $"minimact:context:request:{GetRequestId()}:{key}",
            ContextScope.Session => $"minimact:context:session:{GetSessionId()}:{key}",
            ContextScope.Application => $"minimact:context:app:{key}",
            ContextScope.Url => $"minimact:context:url:{GetSessionId()}:{urlPattern}:{key}",
            _ => throw new ArgumentException($"Unknown scope: {scope}")
        };
    }

    // ... helper methods
}
```

#### 5.2 Context Invalidation Events

```typescript
// Client-side hook to listen for context changes
export function useContextSubscribe<T>(
  context: Context<T>,
  callback: (value: T) => void
): void {
  useEffect(() => {
    const handler = (data: any) => {
      if (data.key === context.key) {
        callback(data.value);
      }
    };

    currentContext.signalR.on('ContextUpdated', handler);

    return () => {
      currentContext.signalR.off('ContextUpdated', handler);
    };
  }, [context.key]);
}
```

---

## Implementation Checklist

### Client-Side
- [ ] Create `useContext.ts` with `createContext` and `useContext`
- [ ] Add context options interface
- [ ] Implement setValue and clearValue
- [ ] Add SignalR sync calls
- [ ] Export from index.ts
- [ ] Write unit tests

### Server-Side
- [ ] Create `ContextScope` enum
- [ ] Implement `UrlPatternMatcher` with glob support
- [ ] Create `ContextCacheEntry` class
- [ ] Define `IContextCache` interface
- [ ] Implement `InMemoryContextCache`
- [ ] Add `UpdateContext` and `ClearContext` to MinimactHub
- [ ] Add context methods to MinimactComponent
- [ ] Create `ContextCacheMiddleware`
- [ ] Register services in DI
- [ ] Write integration tests

### Documentation
- [ ] Add API reference to hooks.md
- [ ] Create examples document
- [ ] Document scope types and use cases
- [ ] Create migration guide
- [ ] Add troubleshooting section

### Testing
- [ ] Unit tests for UrlPatternMatcher
- [ ] Unit tests for context cache (all scopes)
- [ ] Integration tests for client-server sync
- [ ] Test expiry logic
- [ ] Test URL pattern matching edge cases
- [ ] Performance tests for large cache

### Examples
- [ ] Session-scoped user auth example
- [ ] URL-scoped dashboard filters example
- [ ] Multi-step form wizard example
- [ ] Shopping cart example
- [ ] Feature flags example

### Optional (Phase 2)
- [ ] Redis backend implementation
- [ ] Context invalidation events
- [ ] Context middleware hooks
- [ ] Admin UI for cache inspection
- [ ] Metrics and monitoring

---

## Timeline Estimate

**Phase 1 (Client Hook):** 3-4 hours
- Context creation and hook
- SignalR integration

**Phase 2 (Server Core):** 6-8 hours
- Scope enum and cache entry
- In-memory cache implementation
- URL pattern matcher

**Phase 3 (SignalR Integration):** 2-3 hours
- Hub methods
- Component methods
- Registry tracking

**Phase 4 (Middleware & DI):** 2-3 hours
- Middleware for cleanup
- Service registration
- Request pipeline integration

**Phase 5 (Testing):** 4-5 hours
- Unit tests
- Integration tests
- Edge case testing

**Phase 6 (Documentation):** 3-4 hours
- API reference
- Examples
- Migration guide

**Total Estimate:** 20-27 hours

---

## Success Criteria

1. ✅ Context can be created with all scope types
2. ✅ Values sync between client and server
3. ✅ Request-scoped contexts cleared after request
4. ✅ Session-scoped contexts persist across requests
5. ✅ URL-scoped contexts match patterns correctly
6. ✅ URL-scoped contexts cleared on navigation
7. ✅ Expiry works for all scope types
8. ✅ Components re-render when context changes
9. ✅ All tests pass
10. ✅ Documentation is comprehensive

---

## Use Cases Summary

1. **User Session** (session scope)
2. **Shopping Cart** (session scope)
3. **Dashboard Filters** (url scope: `/dashboard/*`)
4. **Multi-Step Forms** (url scope: `/checkout/*`)
5. **Feature Flags** (application scope)
6. **Admin Tools** (url scope: `/admin/**`)
7. **Locale Settings** (url scope: `/:locale/**`)
8. **Category State** (url scope: `/products/:category`)

---

## Future Enhancements

1. **Context Namespaces** - Group related contexts
2. **Context Persistence** - Save to database
3. **Context History** - Undo/redo support
4. **Context Sync Across Tabs** - BroadcastChannel API
5. **Context Validation** - Schema validation before save
6. **Context Compression** - Compress large values
7. **Context Encryption** - Encrypt sensitive data
8. **Context Analytics** - Track usage patterns

---

**Ready to implement!** 🚀

This gives Minimact a powerful, flexible state management system that goes beyond traditional React context.
