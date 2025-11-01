using Microsoft.Extensions.DependencyInjection;
using Minimact.AspNetCore.Rendering;

namespace Minimact.AspNetCore.Extensions;

/// <summary>
/// Extension methods for configuring MVC Bridge services.
///
/// Enables seamless integration between ASP.NET MVC controllers and Minimact components.
/// </summary>
public static class MvcBridgeExtensions
{
    /// <summary>
    /// Add MVC Bridge services to enable ViewModel → Minimact integration.
    ///
    /// This allows MVC controllers to pass ViewModels to Minimact components
    /// using the MinimactPageRenderer service.
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <returns>The service collection for chaining</returns>
    /// <example>
    /// // In Program.cs:
    /// builder.Services.AddMinimact();
    /// builder.Services.AddMinimactMvcBridge();
    /// builder.Services.AddControllersWithViews(); // Optional - for MVC controllers
    /// </example>
    public static IServiceCollection AddMinimactMvcBridge(this IServiceCollection services)
    {
        // Register page renderer service
        services.AddSingleton<MinimactPageRenderer>();

        return services;
    }
}
