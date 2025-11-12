using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Minimact.AspNetCore.Core;

namespace Minimact.AspNetCore.SPA;

/// <summary>
/// Registry of all shell components (layouts) in the application
/// Scans assemblies at startup to discover shells and provides
/// shell instantiation for SPA navigation
/// </summary>
public class ShellRegistry
{
    private readonly Dictionary<string, Type> _shells = new();
    private readonly ILogger<ShellRegistry> _logger;

    public ShellRegistry(ILogger<ShellRegistry> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Register a shell component manually
    /// </summary>
    /// <param name="name">Shell name (e.g., "Admin", "Public", "Checkout")</param>
    /// <param name="shellType">Type that inherits from MinimactShellComponent</param>
    public void RegisterShell(string name, Type shellType)
    {
        if (!typeof(MinimactShellComponent).IsAssignableFrom(shellType))
        {
            throw new ArgumentException(
                $"Shell '{name}' must inherit from MinimactShellComponent. " +
                $"Got: {shellType.FullName}"
            );
        }

        if (_shells.ContainsKey(name))
        {
            _logger.LogWarning($"Shell '{name}' is already registered. Replacing with {shellType.Name}.");
        }

        _shells[name] = shellType;
        _logger.LogInformation($"✓ Registered shell: {name} ({shellType.Name})");
    }

    /// <summary>
    /// Get shell component type by name
    /// </summary>
    /// <param name="name">Shell name (e.g., "Admin")</param>
    /// <returns>Shell type or null if not found</returns>
    public Type? GetShellType(string? name)
    {
        if (string.IsNullOrEmpty(name))
        {
            // Try to return default shell (if exists)
            if (_shells.TryGetValue("Default", out var defaultShell))
            {
                return defaultShell;
            }

            // No shell specified and no default shell
            return null;
        }

        return _shells.TryGetValue(name, out var shellType) ? shellType : null;
    }

    /// <summary>
    /// Create shell instance with ViewModel
    /// </summary>
    /// <param name="name">Shell name</param>
    /// <param name="viewModel">ViewModel containing shell data and page data</param>
    /// <param name="services">Service provider for dependency injection</param>
    /// <returns>Shell instance or null if shell not found</returns>
    public MinimactShellComponent? CreateShell(
        string? name,
        object viewModel,
        IServiceProvider services)
    {
        var shellType = GetShellType(name);

        if (shellType == null)
        {
            if (!string.IsNullOrEmpty(name))
            {
                _logger.LogWarning($"Shell '{name}' not found in registry. Available shells: {string.Join(", ", _shells.Keys)}");
            }
            return null;
        }

        try
        {
            // Create instance using DI
            var shell = (MinimactShellComponent)ActivatorUtilities.CreateInstance(services, shellType);

            // Set ViewModel (MVC Bridge pattern)
            // Extract mutability metadata from ViewModel
            var mutability = ExtractMutability(viewModel);
            shell.SetMvcViewModel(viewModel, mutability);

            _logger.LogDebug($"Created shell instance: {name} ({shellType.Name})");

            return shell;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to create shell '{name}' ({shellType.Name})");
            throw;
        }
    }

    /// <summary>
    /// Auto-discover shells in assembly
    /// Called at startup in Program.cs
    /// Scans for all types inheriting from MinimactShellComponent
    /// </summary>
    /// <param name="assembly">Assembly to scan</param>
    public void ScanAssembly(Assembly assembly)
    {
        _logger.LogInformation($"Scanning assembly for shells: {assembly.GetName().Name}");

        var shellTypes = assembly.GetTypes()
            .Where(t =>
                typeof(MinimactShellComponent).IsAssignableFrom(t) &&
                !t.IsAbstract &&
                t != typeof(MinimactShellComponent))
            .ToList();

        foreach (var type in shellTypes)
        {
            // Extract shell name from type name
            // Convention: "AdminShell" → "Admin", "PublicShell" → "Public"
            var name = type.Name;

            if (name.EndsWith("Shell", StringComparison.OrdinalIgnoreCase))
            {
                name = name.Substring(0, name.Length - 5); // Remove "Shell" suffix
            }

            RegisterShell(name, type);
        }

        _logger.LogInformation($"✓ Discovered {shellTypes.Count} shell(s) in {assembly.GetName().Name}");

        if (shellTypes.Count == 0)
        {
            _logger.LogInformation("  No shells found. Pages will render without a shell layout.");
        }
    }

    /// <summary>
    /// Get all registered shell names
    /// </summary>
    /// <returns>List of shell names</returns>
    public IEnumerable<string> GetAllShellNames()
    {
        return _shells.Keys;
    }

    /// <summary>
    /// Check if a shell is registered
    /// </summary>
    /// <param name="name">Shell name</param>
    /// <returns>True if registered</returns>
    public bool IsShellRegistered(string name)
    {
        return _shells.ContainsKey(name);
    }

    /// <summary>
    /// Get count of registered shells
    /// </summary>
    public int Count => _shells.Count;

    /// <summary>
    /// Clear all registered shells
    /// Used for testing
    /// </summary>
    public void Clear()
    {
        _shells.Clear();
        _logger.LogInformation("Cleared all registered shells");
    }

    /// <summary>
    /// Extract mutability metadata from ViewModel
    /// Checks for [Mutable] attributes on properties
    /// </summary>
    private Dictionary<string, bool> ExtractMutability(object viewModel)
    {
        var mutability = new Dictionary<string, bool>();
        var type = viewModel.GetType();

        foreach (var property in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            // Check for [Mutable] attribute
            var mutableAttr = property.GetCustomAttribute<Minimact.AspNetCore.Attributes.MutableAttribute>();
            mutability[property.Name] = mutableAttr != null;
        }

        return mutability;
    }
}
