using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Routing;
using System.Text.Json;

namespace Minimact.AspNetCore.Middleware;

/// <summary>
/// Middleware that displays a helpful welcome page at the root URL
/// when no other route is configured
/// </summary>
public class WelcomePageMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ComponentRegistry _registry;

    public WelcomePageMiddleware(RequestDelegate next, ComponentRegistry registry)
    {
        _next = next;
        _registry = registry;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only handle GET requests to root path
        if (context.Request.Method == "GET" && context.Request.Path == "/")
        {
            await WriteWelcomePageAsync(context);
            return;
        }

        await _next(context);
    }

    private async Task WriteWelcomePageAsync(HttpContext context)
    {
        context.Response.ContentType = "text/html; charset=utf-8";

        var componentIds = _registry.GetAllComponentIds().ToList();
        var components = componentIds
            .Select(id => _registry.GetComponent(id))
            .Where(c => c != null)
            .Select(c => new { c!.ComponentId, Type = c.GetType().Name })
            .OrderBy(c => c.Type)
            .ToList();

        // Load routes from manifest
        var routes = new List<RouteEntry>();
        var manifestPath = "./Generated/routes.json";
        if (File.Exists(manifestPath))
        {
            try
            {
                var manifestJson = File.ReadAllText(manifestPath);
                routes = JsonSerializer.Deserialize<List<RouteEntry>>(manifestJson) ?? new List<RouteEntry>();
            }
            catch
            {
                // Ignore errors reading manifest
            }
        }

        // Discover controller routes from endpoint data source
        var endpointDataSource = context.GetEndpoint()?.Metadata.GetMetadata<EndpointDataSource>();
        var controllerRoutes = new List<(string Pattern, string DisplayName)>();

        // Try to get endpoint data source from request services
        var dataSource = context.RequestServices.GetService(typeof(EndpointDataSource)) as EndpointDataSource;
        if (dataSource != null)
        {
            foreach (var endpoint in dataSource.Endpoints)
            {
                if (endpoint is Microsoft.AspNetCore.Routing.RouteEndpoint routeEndpoint)
                {
                    var pattern = routeEndpoint.RoutePattern.RawText ?? "";
                    var displayName = routeEndpoint.DisplayName ?? "";

                    // Filter out SignalR hub and root path
                    if (!string.IsNullOrEmpty(pattern) &&
                        pattern != "/" &&
                        !pattern.Contains("minimact", StringComparison.OrdinalIgnoreCase))
                    {
                        controllerRoutes.Add((pattern, displayName));
                    }
                }
            }
        }

        var html = $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Welcome to Minimact</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }}
        .container {{
            background: white;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 800px;
            width: 100%;
            padding: 3rem;
        }}
        h1 {{
            font-size: 2.5rem;
            color: #667eea;
            margin-bottom: 0.5rem;
        }}
        .subtitle {{
            color: #6b7280;
            font-size: 1.1rem;
            margin-bottom: 2rem;
        }}
        .section {{
            margin-bottom: 2rem;
        }}
        .section h2 {{
            font-size: 1.25rem;
            color: #374151;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #e5e7eb;
        }}
        .info-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1rem;
        }}
        .info-card {{
            background: #f9fafb;
            padding: 1rem;
            border-radius: 0.5rem;
            border-left: 4px solid #667eea;
        }}
        .info-card strong {{
            color: #374151;
            display: block;
            margin-bottom: 0.25rem;
        }}
        .info-card span {{
            color: #6b7280;
            font-size: 0.9rem;
        }}
        .component-list {{
            background: #f9fafb;
            padding: 1rem;
            border-radius: 0.5rem;
            max-height: 200px;
            overflow-y: auto;
        }}
        .component-item {{
            padding: 0.5rem;
            margin-bottom: 0.5rem;
            background: white;
            border-radius: 0.25rem;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.875rem;
            color: #374151;
        }}
        .empty-state {{
            color: #9ca3af;
            font-style: italic;
            padding: 1rem;
        }}
        .quick-start {{
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-top: 2rem;
        }}
        .quick-start h3 {{
            color: #92400e;
            margin-bottom: 0.5rem;
        }}
        .quick-start p {{
            color: #78350f;
            line-height: 1.6;
        }}
        .quick-start code {{
            background: white;
            padding: 0.2rem 0.4rem;
            border-radius: 0.25rem;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.875rem;
        }}
        .links {{
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            margin-top: 1.5rem;
        }}
        .link-button {{
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 0.5rem;
            font-weight: 500;
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        .link-button:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }}
        .link-button.secondary {{
            background: #6b7280;
        }}
    </style>
</head>
<body>
    <div class=""container"">
        <h1>Welcome to Minimact!</h1>
        <p class=""subtitle"">Your server-side React framework is running successfully</p>

        <div class=""section"">
            <h2>System Status</h2>
            <div class=""info-grid"">
                <div class=""info-card"">
                    <strong>Status</strong>
                    <span>🟢 Running</span>
                </div>
                <div class=""info-card"">
                    <strong>Environment</strong>
                    <span>{(context.RequestServices.GetService(typeof(Microsoft.Extensions.Hosting.IHostEnvironment)) as Microsoft.Extensions.Hosting.IHostEnvironment)?.EnvironmentName ?? "Production"}</span>
                </div>
                <div class=""info-card"">
                    <strong>Components</strong>
                    <span>{components.Count} registered</span>
                </div>
                <div class=""info-card"">
                    <strong>SignalR</strong>
                    <span>✓ Connected</span>
                </div>
            </div>
        </div>

        {(routes.Count > 0 || controllerRoutes.Count > 0 ? $@"
        <div class=""section"">
            <h2>📄 Available Routes</h2>
            <div class=""component-list"">
                {string.Join("", routes.OrderBy(r => r.Route).Select(r => $@"<div class=""component-item""><a href=""{r.Route}"" style=""color: #667eea; text-decoration: none; font-weight: 500;"">{r.Route}</a> → {Path.GetFileNameWithoutExtension(r.ComponentPath)}</div>"))}
                {string.Join("", controllerRoutes.OrderBy(r => r.Pattern).Select(r => $@"<div class=""component-item""><span style=""color: #667eea; font-weight: 500;"">{r.Pattern}</span> → {r.DisplayName.Split('.').LastOrDefault()}</div>"))}
            </div>
        </div>
        " : @"
        <div class=""section"">
            <h2>📄 Available Routes</h2>
            <div class=""empty-state"">No routes found. Add controllers or run transpiler to generate pages.</div>
        </div>
        ")}

        {(components.Count > 0 ? $@"
        <div class=""section"">
            <h2>Registered Components</h2>
            <div class=""component-list"">
                {string.Join("", components.Select(c => $@"<div class=""component-item"">📦 {c.Type}</div>"))}
            </div>
        </div>
        " : "")}

        <div class=""quick-start"">
            <h3>⚡ Quick Start</h3>
            <p>
                No root route is configured. To create a home page, add a component or controller for the <code>/</code> path.
                Minimact components are server-side React components with full C# integration.
            </p>
        </div>

        <div class=""links"">
            <a href=""https://github.com/minimact/minimact"" class=""link-button"" target=""_blank"">📚 Documentation</a>
            <a href=""/minimacthub"" class=""link-button secondary"">🔌 SignalR Hub</a>
        </div>
    </div>
</body>
</html>";

        await context.Response.WriteAsync(html);
    }
}
