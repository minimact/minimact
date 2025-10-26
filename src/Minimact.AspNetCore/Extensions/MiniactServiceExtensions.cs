using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.SignalR;
using Minimact.AspNetCore.Routing;
using Minimact.AspNetCore.HotReload;

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

        // Add SignalR for real-time updates
        services.AddSignalR();

        // Register hot reload services (development only)
        services.AddSingleton<HotReloadFileWatcher>();
        services.AddSingleton(sp =>
        {
            var hubContext = sp.GetRequiredService<Microsoft.AspNetCore.SignalR.IHubContext<MinimactHub>>();
            var registry = sp.GetRequiredService<ComponentRegistry>();
            var logger = sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<TemplateHotReloadManager>>();
            var watchPath = System.IO.Directory.GetCurrentDirectory();
            return new TemplateHotReloadManager(hubContext, registry, logger, watchPath);
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

        return services;
    }

    /// <summary>
    /// Map Minimact SignalR hub, auto-discover pages, and configure middleware
    /// </summary>
    public static IApplicationBuilder UseMinimact(this IApplicationBuilder app, string manifestPath = "./Generated/routes.json")
    {
        // Initialize global predictor from DI
        var predictor = app.ApplicationServices.GetRequiredService<RustBridge.Predictor>();
        MinimactComponent.GlobalPredictor = predictor;
        Console.WriteLine("[Minimact] Predictive rendering enabled");

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
}
