using System.Reflection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Minimact.AspNetCore.Core;

namespace Minimact.AspNetCore.SPA;

/// <summary>
/// Registry of all page components (route components) in the application
/// Similar to ShellRegistry but for pages
/// </summary>
public class PageRegistry
{
    private readonly Dictionary<string, Type> _pages = new();
    private readonly ILogger<PageRegistry>? _logger;
    private readonly IServiceProvider _serviceProvider;

    public PageRegistry(IServiceProvider serviceProvider, ILogger<PageRegistry>? logger = null)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    /// <summary>
    /// Register a page component
    /// </summary>
    public void RegisterPage(string name, Type pageType)
    {
        if (!typeof(MinimactComponent).IsAssignableFrom(pageType))
        {
            throw new ArgumentException($"Page {name} must inherit from MinimactComponent");
        }

        _pages[name] = pageType;
        _logger?.LogInformation($"Registered page: {name} ({pageType.Name})");
    }

    /// <summary>
    /// Get page component type by name
    /// </summary>
    public Type? GetPageType(string name)
    {
        return _pages.TryGetValue(name, out var pageType) ? pageType : null;
    }

    /// <summary>
    /// Create page instance with ViewModel
    /// </summary>
    public MinimactComponent? CreatePage(string name, object viewModel)
    {
        var pageType = GetPageType(name);
        if (pageType == null) return null;

        var page = (MinimactComponent)ActivatorUtilities.CreateInstance(_serviceProvider, pageType);

        // Set ViewModel on the page component
        if (viewModel != null)
        {
            var setViewModelMethod = pageType.GetMethod("SetViewModel", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
            setViewModelMethod?.Invoke(page, new[] { viewModel });
        }

        return page;
    }

    /// <summary>
    /// Auto-discover pages in assembly
    /// Called at startup
    /// </summary>
    public void ScanAssembly(Assembly assembly)
    {
        var pageTypes = assembly.GetTypes()
            .Where(t => typeof(MinimactComponent).IsAssignableFrom(t)
                && !t.IsAbstract
                && t.Name.EndsWith("Page"));

        foreach (var type in pageTypes)
        {
            var name = type.Name; // Keep full name like "ProductDetailsPage"
            RegisterPage(name, type);
        }

        _logger?.LogInformation($"Discovered {_pages.Count} pages in {assembly.GetName().Name}");
    }

    /// <summary>
    /// Get all registered page names
    /// </summary>
    public IEnumerable<string> GetAllPageNames()
    {
        return _pages.Keys;
    }

    /// <summary>
    /// Check if a page is registered
    /// </summary>
    public bool HasPage(string name)
    {
        return _pages.ContainsKey(name);
    }
}
