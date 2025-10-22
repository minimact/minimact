using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Minimact.Runtime.Core;
using Minimact.Runtime.SignalR;

namespace Minimact.Runtime.Extensions;

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
    /// Map Minimact SignalR hub and configure middleware
    /// </summary>
    public static IApplicationBuilder UseMinimact(this IApplicationBuilder app)
    {
        // Map SignalR hub
        app.UseRouting();
        app.UseEndpoints(endpoints =>
        {
            endpoints.MapHub<MinimactHub>("/minimact");
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
