using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Minimact.AspNetCore.Core;
using System.Text.Json;

namespace Minimact.AspNetCore.Routing;

/// <summary>
/// Extension methods for Minimact page-based routing
/// </summary>
public static class MinimactRouting
{
    /// <summary>
    /// Map all pages from the route manifest
    /// </summary>
    public static IEndpointRouteBuilder MapMinimactPages(this IEndpointRouteBuilder endpoints, string manifestPath = "./Generated/routes.json")
    {
        if (!File.Exists(manifestPath))
        {
            Console.WriteLine($"⚠️  Warning: Route manifest not found at {manifestPath}");
            Console.WriteLine($"   Run 'minimact transpile' to generate pages.");
            return endpoints;
        }

        var manifestJson = File.ReadAllText(manifestPath);
        var routes = JsonSerializer.Deserialize<List<RouteEntry>>(manifestJson) ?? new List<RouteEntry>();

        Console.WriteLine($"📄 Loading {routes.Count} page(s) from route manifest...");

        foreach (var routeEntry in routes)
        {
            // Extract component name from path (e.g., "Generated/pages/Index.cs" → "Index")
            var componentName = Path.GetFileNameWithoutExtension(routeEntry.ComponentPath);
            routeEntry.ComponentName = componentName;

            // Register the route
            endpoints.MapGet(routeEntry.Route, async (HttpContext context) =>
            {
                var registry = context.RequestServices.GetRequiredService<ComponentRegistry>();

                // Instantiate the component (via reflection for now, could be optimized)
                var component = CreateComponentInstance(componentName, context.RequestServices);

                if (component == null)
                {
                    return Results.NotFound($"Component '{componentName}' not found");
                }

                // Register component
                registry.RegisterComponent(component);

                // Initialize and render
                var vnode = await component.InitializeAndRenderAsync();
                var html = vnode.ToHtml();

                // Generate complete HTML page with Minimact client
                var pageHtml = GeneratePageHtml(component, html, componentName);

                return Results.Content(pageHtml, "text/html");
            });

            Console.WriteLine($"  ✅ {routeEntry.Route} → {componentName}");
        }

        return endpoints;
    }

    /// <summary>
    /// Create component instance by name (reflection-based for now)
    /// </summary>
    private static MinimactComponent? CreateComponentInstance(string componentName, IServiceProvider services)
    {
        // Try to find the component type in all loaded assemblies
        var assemblies = AppDomain.CurrentDomain.GetAssemblies();

        foreach (var assembly in assemblies)
        {
            // Look for component in Minimact.Components namespace
            var type = assembly.GetType($"Minimact.Components.{componentName}");

            if (type != null && typeof(MinimactComponent).IsAssignableFrom(type))
            {
                // Try to create instance with dependency injection
                try
                {
                    return (MinimactComponent?)ActivatorUtilities.CreateInstance(services, type);
                }
                catch
                {
                    // Fallback to parameterless constructor
                    return (MinimactComponent?)Activator.CreateInstance(type);
                }
            }
        }

        return null;
    }

    /// <summary>
    /// Generate complete HTML page with Minimact client library
    /// </summary>
    private static string GeneratePageHtml(MinimactComponent component, string componentHtml, string componentName)
    {
        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{componentName} - Minimact</title>
    <script src=""https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/8.0.0/signalr.min.js""></script>
    <style>
        body {{
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 0 20px;
        }}
        button {{
            padding: 8px 16px;
            margin: 4px;
            cursor: pointer;
            border: 1px solid #ccc;
            border-radius: 4px;
            background: white;
        }}
        button:hover {{
            background: #f0f0f0;
        }}
        .counter {{
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }}
    </style>
</head>
<body>
    <div id=""minimact-root"" data-minimact-component=""{component.ComponentId}"">
        {componentHtml}
    </div>

    <script>
        // Minimact Client Runtime
        const connection = new signalR.HubConnectionBuilder()
            .withUrl('/minimact')
            .build();

        connection.on('UpdateComponent', (componentId, html) => {{
            console.log('📦 Received update for:', componentId);
            const element = document.querySelector(`[data-minimact-component=""${{componentId}}""]`);
            if (element) {{
                element.innerHTML = html;
            }}
        }});

        connection.start()
            .then(() => {{
                console.log('✅ Connected to Minimact hub');
                connection.invoke('RegisterComponent', '{component.ComponentId}');
            }})
            .catch(err => console.error('❌ Connection error:', err));

        // Handle all click events
        document.addEventListener('click', (e) => {{
            if (e.target.tagName === 'BUTTON') {{
                const componentEl = e.target.closest('[data-minimact-component]');
                if (!componentEl) return;

                const componentId = componentEl.getAttribute('data-minimact-component');
                const methodName = e.target.getAttribute('onclick');

                if (methodName) {{
                    console.log('🖱️  Click:', methodName);
                    connection.invoke('InvokeComponentMethod', componentId, methodName, '{{}}');
                }}
            }}
        }});
    </script>
</body>
</html>";
    }
}
