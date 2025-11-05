using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.SignalR;
using Minimact.AspNetCore.Routing;
using Minimact.AspNetCore.HotReload;
using Minimact.AspNetCore.Services;
using Minimact.AspNetCore.Plugins;
using Minimact.AspNetCore.Middleware;
using Minimact.AspNetCore.Runtime;

namespace Minimact.AspNetCore.Extensions;

/// <summary>
/// Extension methods for configuring Minimact services
/// </summary>
public static class MinimactServiceExtensions
{
    /// <summary>
    /// Add Minimact framework to the service collection
    /// </summary>
    public static IServiceCollection AddMinimact(this IServiceCollection services)
    {
        // Register core services
        services.AddSingleton<ComponentRegistry>();
        services.AddSingleton<RustBridge.Predictor>();
        services.AddSingleton<TemplateLoader>(); // Template loader for attribute template support

        // Register context cache (for useContext hook)
        services.AddSingleton<IContextCache, InMemoryContextCache>();
        services.AddHttpContextAccessor(); // Required for context cache

        // Add session support (required for session-scoped contexts)
        services.AddDistributedMemoryCache();
        services.AddSession(options =>
        {
            options.IdleTimeout = TimeSpan.FromMinutes(30);
            options.Cookie.HttpOnly = true;
            options.Cookie.IsEssential = true;
        });

        // Add SignalR for real-time updates
        // IMPORTANT: Use Newtonsoft.Json because VNodeConverter uses Newtonsoft attributes
        services.AddSignalR()
            .AddNewtonsoftJsonProtocol(options =>
            {
                options.PayloadSerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore;
                options.PayloadSerializerSettings.Converters.Add(new VNodeConverter());
            });

        // Register hot reload services (development only)
        // Register hot reload services as eager singletons
        services.AddSingleton<HotReloadFileWatcher>(sp =>
        {
            var hubContext = sp.GetRequiredService<Microsoft.AspNetCore.SignalR.IHubContext<MinimactHub>>();
            var logger = sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<HotReloadFileWatcher>>();
            var configuration = sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
            var watcher = new HotReload.HotReloadFileWatcher(hubContext, logger, configuration);
            // Force instantiation by returning it
            return watcher;
        });

        services.AddSingleton<TemplateHotReloadManager>(sp =>
        {
            var hubContext = sp.GetRequiredService<Microsoft.AspNetCore.SignalR.IHubContext<MinimactHub>>();
            var registry = sp.GetRequiredService<ComponentRegistry>();
            var logger = sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<TemplateHotReloadManager>>();
            var watchPath = System.IO.Directory.GetCurrentDirectory();
            var manager = new TemplateHotReloadManager(hubContext, registry, logger, watchPath);
            // Force instantiation by returning it
            return manager;
        });

        // Register hosted service to eagerly instantiate hot reload services
        services.AddHostedService<HotReloadInitializationService>();

        // Register memory monitoring background service
        services.AddHostedService<PredictorMemoryMonitor>();

        // Register plugin system
        services.AddSingleton<PluginManager>();

        // Register runtime component loader
        services.AddSingleton(sp =>
        {
            // Check for Pages folder first (for page routing), then Components folder
            var pagesPath = Path.Combine(System.IO.Directory.GetCurrentDirectory(), "Pages");
            var componentsPath = Path.Combine(System.IO.Directory.GetCurrentDirectory(), "Components");

            var pathToUse = Directory.Exists(pagesPath) ? pagesPath : componentsPath;
            return new ComponentLoader(pathToUse);
        });

        // Register runtime component hot reload manager
        services.AddSingleton<RuntimeComponentHotReloadManager>(sp =>
        {
            var hubContext = sp.GetRequiredService<Microsoft.AspNetCore.SignalR.IHubContext<MinimactHub>>();
            var registry = sp.GetRequiredService<ComponentRegistry>();
            var componentLoader = sp.GetRequiredService<ComponentLoader>();
            var logger = sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<RuntimeComponentHotReloadManager>>();

            // Watch same path as ComponentLoader (Pages or Components)
            var pagesPath = Path.Combine(System.IO.Directory.GetCurrentDirectory(), "Pages");
            var componentsPath = Path.Combine(System.IO.Directory.GetCurrentDirectory(), "Components");
            var watchPath = Directory.Exists(pagesPath) ? pagesPath : componentsPath;

            return new RuntimeComponentHotReloadManager(hubContext, registry, componentLoader, logger, watchPath);
        });

        return services;
    }

    /// <summary>
    /// Add Minimact framework with custom configuration
    /// </summary>
    public static IServiceCollection AddMinimact(
        this IServiceCollection services,
        Action<MinimactOptions> configure)
    {
        var options = new MinimactOptions();
        configure(options);

        services.AddSingleton(options);
        services.AddMinimact();

        // Auto-discover plugins if enabled
        if (options.AutoDiscoverPlugins)
        {
            var sp = services.BuildServiceProvider();
            var pluginManager = sp.GetRequiredService<PluginManager>();
            pluginManager.AutoDiscover();
        }

        // Register explicit plugins
        foreach (var plugin in options.ExplicitPlugins)
        {
            var sp = services.BuildServiceProvider();
            var pluginManager = sp.GetRequiredService<PluginManager>();
            pluginManager.Register(plugin);
        }

        return services;
    }

    /// <summary>
    /// Map Minimact SignalR hub, auto-discover pages, and configure middleware
    /// </summary>
    public static IApplicationBuilder UseMinimact(this IApplicationBuilder app, Action<MinimactMiddlewareOptions>? configure = null, string manifestPath = "./Generated/routes.json")
    {
        var middlewareOptions = new MinimactMiddlewareOptions();
        configure?.Invoke(middlewareOptions);

        // Initialize global predictor from DI
        var predictor = app.ApplicationServices.GetRequiredService<RustBridge.Predictor>();
        MinimactComponent.GlobalPredictor = predictor;

        // Set global template loader
        var templateLoader = app.ApplicationServices.GetService<TemplateLoader>();
        MinimactComponent.GlobalTemplateLoader = templateLoader;
        Console.WriteLine("[Minimact] Predictive rendering enabled");

        // Add session middleware (required for session-scoped contexts)
        app.UseSession();

        // Add context cache middleware (cleanup after each request)
        app.UseMiddleware<Middleware.ContextCacheMiddleware>();

        // Add welcome page middleware (if enabled)
        if (middlewareOptions.UseWelcomePage)
        {
            app.UseMiddleware<Middleware.WelcomePageMiddleware>();
        }

        // Add plugin asset serving middleware
        var options = app.ApplicationServices.GetService<MinimactOptions>();
        if (options?.PluginAssets != null)
        {
            app.UsePluginAssets(
                options.PluginAssets.BasePath,
                options.PluginAssets.VersionAssetUrls,
                options.PluginAssets.CacheDuration);
        }
        else
        {
            app.UsePluginAssets(); // Use defaults
        }

        app.UseRouting();
        app.UseEndpoints(endpoints =>
        {
            // Map SignalR hub
            endpoints.MapHub<MinimactHub>("/minimact");

            // Auto-discover and map pages from route manifest
            endpoints.MapMinimactPages(manifestPath);
        });

        return app;
    }
}

/// <summary>
/// Configuration options for Minimact
/// </summary>
public class MinimactOptions
{
    /// <summary>
    /// Enable predictive rendering (default: true)
    /// </summary>
    public bool EnablePrediction { get; set; } = true;

    /// <summary>
    /// Enable automatic state persistence (default: false)
    /// </summary>
    public bool EnableStatePersistence { get; set; } = false;

    /// <summary>
    /// SignalR hub path (default: "/minimact")
    /// </summary>
    public string HubPath { get; set; } = "/minimact";

    /// <summary>
    /// Maximum component instances per connection (default: 100)
    /// </summary>
    public int MaxComponentsPerConnection { get; set; } = 100;

    /// <summary>
    /// Enable debug logging (default: false)
    /// </summary>
    public bool EnableDebugLogging { get; set; } = false;

    /// <summary>
    /// Enable automatic plugin discovery via reflection (default: true)
    /// </summary>
    public bool AutoDiscoverPlugins { get; set; } = true;

    /// <summary>
    /// Explicitly registered plugins (alternative to auto-discovery)
    /// </summary>
    public List<IMinimactPlugin> ExplicitPlugins { get; set; } = new();

    /// <summary>
    /// Plugin asset serving options
    /// </summary>
    public PluginAssetOptions PluginAssets { get; set; } = new();

    /// <summary>
    /// Register a plugin explicitly
    /// </summary>
    public MinimactOptions RegisterPlugin<T>() where T : IMinimactPlugin, new()
    {
        ExplicitPlugins.Add(new T());
        return this;
    }

    /// <summary>
    /// Register a plugin instance explicitly
    /// </summary>
    public MinimactOptions RegisterPlugin(IMinimactPlugin plugin)
    {
        ExplicitPlugins.Add(plugin);
        return this;
    }
}

/// <summary>
/// Configuration options for plugin asset serving
/// </summary>
public class PluginAssetOptions
{
    /// <summary>
    /// Base path for serving plugin assets (default: /plugin-assets)
    /// </summary>
    public string BasePath { get; set; } = "/plugin-assets";

    /// <summary>
    /// Whether to version asset URLs (e.g., /plugin-assets/Clock@1.0.0/clock.css)
    /// </summary>
    public bool VersionAssetUrls { get; set; } = true;

    /// <summary>
    /// Cache duration for plugin assets (in seconds, default: 86400 = 24 hours)
    /// </summary>
    public int CacheDuration { get; set; } = 86400;
}

/// <summary>
/// Configuration options for Minimact middleware
/// </summary>
public class MinimactMiddlewareOptions
{
    /// <summary>
    /// Display a helpful welcome page at the root URL when no route is configured (default: false)
    /// </summary>
    public bool UseWelcomePage { get; set; } = false;
}
