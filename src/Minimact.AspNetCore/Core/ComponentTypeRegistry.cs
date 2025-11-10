using System.Reflection;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Registry for resolving component types by name
/// Used by VComponentWrapper to instantiate child components
/// Supports both manual registration and automatic assembly scanning
/// </summary>
public static class ComponentTypeRegistry
{
    private static readonly Dictionary<string, Type> _types = new();
    private static bool _autoScanPerformed = false;
    private static readonly object _lock = new object();

    /// <summary>
    /// Register a component type manually
    /// </summary>
    /// <typeparam name="T">Component type to register</typeparam>
    public static void RegisterComponent<T>() where T : MinimactComponent
    {
        var name = typeof(T).Name;
        lock (_lock)
        {
            _types[name] = typeof(T);
        }
        Console.WriteLine($"[Component Registry] Registered {name}");
    }

    /// <summary>
    /// Register a component type manually by name
    /// </summary>
    /// <param name="name">Component name</param>
    /// <param name="type">Component type</param>
    public static void RegisterComponent(string name, Type type)
    {
        if (!typeof(MinimactComponent).IsAssignableFrom(type))
        {
            throw new ArgumentException(
                $"Type {type.Name} does not inherit from MinimactComponent",
                nameof(type)
            );
        }

        lock (_lock)
        {
            _types[name] = type;
        }
        Console.WriteLine($"[Component Registry] Registered {name} → {type.FullName}");
    }

    /// <summary>
    /// Get component type by name
    /// Performs auto-scan if not found in registry
    /// </summary>
    /// <param name="name">Component name</param>
    /// <returns>Component type or null if not found</returns>
    public static Type? GetType(string name)
    {
        // Check explicit registrations first
        lock (_lock)
        {
            if (_types.TryGetValue(name, out var type))
            {
                return type;
            }
        }

        // Perform auto-scan once if not already done
        if (!_autoScanPerformed)
        {
            AutoScanAssemblies();

            // Try again after scan
            lock (_lock)
            {
                if (_types.TryGetValue(name, out var type))
                {
                    return type;
                }
            }
        }

        Console.WriteLine($"[Component Registry] Warning: Component '{name}' not found");
        return null;
    }

    /// <summary>
    /// Scan all loaded assemblies for MinimactComponent types
    /// Called automatically on first GetType miss
    /// </summary>
    public static void AutoScanAssemblies()
    {
        lock (_lock)
        {
            if (_autoScanPerformed)
            {
                return; // Already scanned
            }

            Console.WriteLine("[Component Registry] Auto-scanning assemblies...");

            var assemblies = AppDomain.CurrentDomain.GetAssemblies();
            var count = 0;

            foreach (var assembly in assemblies)
            {
                // Skip system assemblies for performance
                var assemblyName = assembly.GetName().Name ?? "";
                if (assemblyName.StartsWith("System") ||
                    assemblyName.StartsWith("Microsoft") ||
                    assemblyName.StartsWith("netstandard") ||
                    assemblyName.StartsWith("mscorlib"))
                {
                    continue;
                }

                try
                {
                    var types = assembly.GetTypes()
                        .Where(t => t.IsClass &&
                                    !t.IsAbstract &&
                                    typeof(MinimactComponent).IsAssignableFrom(t));

                    foreach (var type in types)
                    {
                        // Use simple name (without namespace)
                        var name = type.Name;

                        // Skip if already registered
                        if (!_types.ContainsKey(name))
                        {
                            _types[name] = type;
                            count++;
                        }
                    }
                }
                catch (ReflectionTypeLoadException ex)
                {
                    // Some assemblies may throw this - log and continue
                    Console.WriteLine(
                        $"[Component Registry] Warning: Failed to scan {assemblyName}: " +
                        $"{ex.Message}"
                    );

                    // Try to load what we can
                    foreach (var type in ex.Types)
                    {
                        if (type != null &&
                            type.IsClass &&
                            !type.IsAbstract &&
                            typeof(MinimactComponent).IsAssignableFrom(type))
                        {
                            var name = type.Name;
                            if (!_types.ContainsKey(name))
                            {
                                _types[name] = type;
                                count++;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    // Log and continue
                    Console.WriteLine(
                        $"[Component Registry] Warning: Failed to scan {assemblyName}: " +
                        $"{ex.Message}"
                    );
                }
            }

            _autoScanPerformed = true;

            Console.WriteLine(
                $"[Component Registry] Auto-scan complete: {count} components registered"
            );

            // Debug: Print all registered components
            if (count > 0)
            {
                Console.WriteLine("[Component Registry] Registered components:");
                foreach (var kvp in _types.OrderBy(k => k.Key))
                {
                    Console.WriteLine($"  - {kvp.Key} → {kvp.Value.FullName}");
                }
            }
        }
    }

    /// <summary>
    /// Get all registered component types
    /// Triggers auto-scan if not already performed
    /// </summary>
    /// <returns>Dictionary of component name → type</returns>
    public static IReadOnlyDictionary<string, Type> GetAllTypes()
    {
        if (!_autoScanPerformed)
        {
            AutoScanAssemblies();
        }

        lock (_lock)
        {
            return new Dictionary<string, Type>(_types);
        }
    }

    /// <summary>
    /// Clear all registered types (for testing)
    /// </summary>
    public static void Clear()
    {
        lock (_lock)
        {
            _types.Clear();
            _autoScanPerformed = false;
        }
        Console.WriteLine("[Component Registry] Cleared all registrations");
    }

    /// <summary>
    /// Check if a component is registered
    /// </summary>
    /// <param name="name">Component name</param>
    /// <returns>True if registered</returns>
    public static bool IsRegistered(string name)
    {
        lock (_lock)
        {
            return _types.ContainsKey(name);
        }
    }
}
