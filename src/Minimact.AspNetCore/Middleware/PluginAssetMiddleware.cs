using System.Reflection;
using Minimact.AspNetCore.Plugins;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Minimact.AspNetCore.Middleware;

/// <summary>
/// Serves embedded plugin assets (CSS, JS, images, fonts) from plugin assemblies
/// </summary>
public class PluginAssetMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<PluginAssetMiddleware> _logger;
    private readonly string _basePath;
    private readonly bool _versionAssetUrls;
    private readonly int _cacheDuration;

    private static readonly Dictionary<string, string> ContentTypes = new()
    {
        { ".css", "text/css" },
        { ".js", "application/javascript" },
        { ".json", "application/json" },
        { ".png", "image/png" },
        { ".jpg", "image/jpeg" },
        { ".jpeg", "image/jpeg" },
        { ".gif", "image/gif" },
        { ".svg", "image/svg+xml" },
        { ".ico", "image/x-icon" },
        { ".woff", "font/woff" },
        { ".woff2", "font/woff2" },
        { ".ttf", "font/ttf" },
        { ".eot", "application/vnd.ms-fontobject" }
    };

    public PluginAssetMiddleware(
        RequestDelegate next,
        ILogger<PluginAssetMiddleware> logger,
        string basePath = "/plugin-assets",
        bool versionAssetUrls = true,
        int cacheDuration = 86400)
    {
        _next = next;
        _logger = logger;
        _basePath = basePath.TrimEnd('/');
        _versionAssetUrls = versionAssetUrls;
        _cacheDuration = cacheDuration;
    }

    public async Task InvokeAsync(HttpContext context, PluginManager pluginManager)
    {
        var path = context.Request.Path.Value;

        if (path == null || !path.StartsWith(_basePath, StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        // Parse path: /plugin-assets/{PluginName}[@{Version}]/{AssetPath}
        var relativePath = path.Substring(_basePath.Length).TrimStart('/');
        var segments = relativePath.Split('/', 2);

        if (segments.Length < 2)
        {
            context.Response.StatusCode = 404;
            return;
        }

        var pluginIdentifier = segments[0];
        var assetPath = segments[1];

        // Extract plugin name and version
        string pluginName;
        string? version = null;

        if (_versionAssetUrls && pluginIdentifier.Contains('@'))
        {
            var parts = pluginIdentifier.Split('@');
            pluginName = parts[0];
            version = parts.Length > 1 ? parts[1] : null;
        }
        else
        {
            pluginName = pluginIdentifier;
        }

        // Get plugin
        var plugin = version != null
            ? pluginManager.GetPlugin(pluginName, version)
            : pluginManager.GetPlugin(pluginName);

        if (plugin == null)
        {
            _logger.LogWarning("[PluginAssetMiddleware] Plugin not found: {PluginName}", pluginName);
            context.Response.StatusCode = 404;
            return;
        }

        // Serve embedded resource
        await ServeEmbeddedResource(context, plugin, assetPath);
    }

    private async Task ServeEmbeddedResource(HttpContext context, IMinimactPlugin plugin, string assetPath)
    {
        var assembly = plugin.GetType().Assembly;
        var resourceName = FindEmbeddedResource(assembly, assetPath);

        if (resourceName == null)
        {
            _logger.LogWarning("[PluginAssetMiddleware] Asset not found: {AssetPath} in plugin {PluginName}",
                assetPath, plugin.Name);
            context.Response.StatusCode = 404;
            return;
        }

        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream == null)
        {
            context.Response.StatusCode = 404;
            return;
        }

        // Set content type
        var extension = Path.GetExtension(assetPath).ToLowerInvariant();
        if (ContentTypes.TryGetValue(extension, out var contentType))
        {
            context.Response.ContentType = contentType;
        }
        else
        {
            context.Response.ContentType = "application/octet-stream";
        }

        // Set cache headers
        context.Response.Headers["Cache-Control"] = $"public, max-age={_cacheDuration}";
        context.Response.Headers["ETag"] = $"\"{plugin.Name}-{plugin.Version}-{assetPath.GetHashCode()}\"";

        // Serve content
        await stream.CopyToAsync(context.Response.Body);

        _logger.LogDebug("[PluginAssetMiddleware] Served asset: {AssetPath} from plugin {PluginName} v{Version}",
            assetPath, plugin.Name, plugin.Version);
    }

    private string? FindEmbeddedResource(Assembly assembly, string assetPath)
    {
        var resourceNames = assembly.GetManifestResourceNames();

        // Normalize asset path (replace / with .)
        var normalizedPath = assetPath.Replace('/', '.').Replace('\\', '.');

        // Try to find exact match
        var exactMatch = resourceNames.FirstOrDefault(r => r.EndsWith(normalizedPath, StringComparison.OrdinalIgnoreCase));
        if (exactMatch != null)
        {
            return exactMatch;
        }

        // Try to find partial match (e.g., assets.clock-widget.css)
        var partialMatch = resourceNames.FirstOrDefault(r => r.Contains(normalizedPath, StringComparison.OrdinalIgnoreCase));
        if (partialMatch != null)
        {
            return partialMatch;
        }

        // Try alternative matching (assets folder convention)
        var assetsPath = $"assets.{normalizedPath}";
        var assetsMatch = resourceNames.FirstOrDefault(r => r.EndsWith(assetsPath, StringComparison.OrdinalIgnoreCase));
        return assetsMatch;
    }
}

/// <summary>
/// Extension methods for adding PluginAssetMiddleware to the pipeline
/// </summary>
public static class PluginAssetMiddlewareExtensions
{
    public static IApplicationBuilder UsePluginAssets(
        this IApplicationBuilder builder,
        string basePath = "/plugin-assets",
        bool versionAssetUrls = true,
        int cacheDuration = 86400)
    {
        return builder.UseMiddleware<PluginAssetMiddleware>(basePath, versionAssetUrls, cacheDuration);
    }
}
