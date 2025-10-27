using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Minimact.AspNetCore.Core;

namespace Minimact.AspNetCore.Middleware;

/// <summary>
/// Middleware to manage context cache cleanup
/// - Clears request-scoped contexts after each request
/// - Periodically clears expired entries
/// - Clears non-matching URL-scoped contexts on navigation
/// </summary>
public class ContextCacheMiddleware
{
    private readonly RequestDelegate _next;
    private static int _requestCounter = 0;

    public ContextCacheMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IContextCache cache)
    {
        try
        {
            // Execute the rest of the pipeline
            await _next(context);
        }
        finally
        {
            // Clear request-scoped contexts
            cache.ClearRequestScope();

            // Periodically clear expired entries (every 100 requests)
            var counter = Interlocked.Increment(ref _requestCounter);
            if (counter % 100 == 0)
            {
                cache.ClearExpired();
            }

            // Clear non-matching URL-scoped contexts if session exists
            if (context.Session.IsAvailable)
            {
                var sessionId = context.Session.Id;
                var currentUrl = context.Request.Path.Value ?? "/";

                cache.ClearNonMatchingUrlScopes(sessionId, currentUrl);
            }
        }
    }
}

/// <summary>
/// Extension methods for ContextCacheMiddleware
/// </summary>
public static class ContextCacheMiddlewareExtensions
{
    /// <summary>
    /// Add context cache middleware to the pipeline
    /// Must be called AFTER UseSession() and BEFORE UseEndpoints()
    /// </summary>
    public static IApplicationBuilder UseContextCache(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<ContextCacheMiddleware>();
    }
}
