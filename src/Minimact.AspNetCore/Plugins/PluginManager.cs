using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Minimact.AspNetCore.Plugins;

/// <summary>
/// Manages plugin discovery, registration, and rendering
/// </summary>
public class PluginManager
{
    private readonly Dictionary<string, IMinimactPlugin> _plugins = new();
    private readonly Dictionary<string, Dictionary<string, IMinimactPlugin>> _versionedPlugins = new();
    private readonly IServiceProvider _services;
    private readonly ILogger<PluginManager> _logger;

    public PluginManager(IServiceProvider services, ILogger<PluginManager> logger)
    {
        _services = services;
        _logger = logger;
    }

    /// <summary>
    /// Auto-discover plugins via reflection across all loaded assemblies
    /// </summary>
    public void AutoDiscover()
    {
        _logger.LogInformation("[PluginManager] Auto-discovering Minimact plugins...");

        var assemblies = AppDomain.CurrentDomain.GetAssemblies();
        var pluginTypes = assemblies
            .SelectMany(a =>
            {
                try
                {
                    return a.GetTypes();
                }
                catch (ReflectionTypeLoadException)
                {
                    // Skip assemblies that can't be loaded
                    return Array.Empty<Type>();
                }
            })
            .Where(t => !t.IsAbstract && !t.IsInterface)
            .Where(t => typeof(IMinimactPlugin).IsAssignableFrom(t))
            .Where(t => t.GetCustomAttribute<MinimactPluginAttribute>() != null);

        foreach (var type in pluginTypes)
        {
            try
            {
                var plugin = (IMinimactPlugin)ActivatorUtilities.CreateInstance(_services, type);
                Register(plugin);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[PluginManager] Failed to instantiate plugin: {TypeName}", type.Name);
            }
        }

        _logger.LogInformation("[PluginManager] Discovered {Count} plugin(s)", _plugins.Count);
    }

    /// <summary>
    /// Register a plugin instance
    /// </summary>
    public void Register(IMinimactPlugin plugin)
    {
        if (_plugins.ContainsKey(plugin.Name))
        {
            _logger.LogWarning("[PluginManager] Plugin '{Name}' already registered. Overwriting with v{Version}",
                plugin.Name, plugin.Version);
        }

        try
        {
            plugin.Initialize(_services);
            _plugins[plugin.Name] = plugin;

            // Also track by version for multi-version support
            if (!_versionedPlugins.ContainsKey(plugin.Name))
            {
                _versionedPlugins[plugin.Name] = new Dictionary<string, IMinimactPlugin>();
            }
            _versionedPlugins[plugin.Name][plugin.Version] = plugin;

            _logger.LogInformation("[PluginManager] ✅ Registered plugin: {Name} v{Version}",
                plugin.Name, plugin.Version);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PluginManager] Failed to initialize plugin: {Name}", plugin.Name);
            throw;
        }
    }

    /// <summary>
    /// Get a plugin by name (latest version)
    /// </summary>
    public IMinimactPlugin? GetPlugin(string name)
    {
        return _plugins.GetValueOrDefault(name);
    }

    /// <summary>
    /// Get a specific version of a plugin
    /// </summary>
    public IMinimactPlugin? GetPlugin(string name, string version)
    {
        if (_versionedPlugins.TryGetValue(name, out var versions))
        {
            return versions.GetValueOrDefault(version);
        }
        return null;
    }

    /// <summary>
    /// Get the latest compatible version of a plugin
    /// </summary>
    public IMinimactPlugin? GetLatestCompatibleVersion(string name, string minVersion)
    {
        if (!_versionedPlugins.TryGetValue(name, out var versions))
        {
            return null;
        }

        // Get all versions >= minVersion, sorted descending
        var compatibleVersions = versions
            .Where(kvp => IsVersionCompatible(kvp.Key, minVersion))
            .OrderByDescending(kvp => kvp.Key)
            .Select(kvp => kvp.Value)
            .ToList();

        return compatibleVersions.FirstOrDefault();
    }

    /// <summary>
    /// Render a plugin with state
    /// </summary>
    public Core.VNode? RenderPlugin(string name, object state)
    {
        var plugin = GetPlugin(name);
        if (plugin == null)
        {
            _logger.LogError("[PluginManager] Plugin '{Name}' not found", name);
            return null;
        }

        if (!plugin.ValidateState(state))
        {
            _logger.LogError("[PluginManager] Invalid state for plugin '{Name}'", name);
            return null;
        }

        try
        {
            return plugin.Render(state);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PluginManager] Error rendering plugin '{Name}'", name);
            return null;
        }
    }

    /// <summary>
    /// Get all registered plugins
    /// </summary>
    public IReadOnlyDictionary<string, IMinimactPlugin> GetAllPlugins()
    {
        return _plugins;
    }

    /// <summary>
    /// Get all versions of a plugin
    /// </summary>
    public IReadOnlyDictionary<string, IMinimactPlugin>? GetPluginVersions(string name)
    {
        return _versionedPlugins.GetValueOrDefault(name);
    }

    /// <summary>
    /// Check if a plugin is registered
    /// </summary>
    public bool IsPluginRegistered(string name)
    {
        return _plugins.ContainsKey(name);
    }

    /// <summary>
    /// Unregister a plugin
    /// </summary>
    public bool Unregister(string name)
    {
        if (_plugins.Remove(name))
        {
            _versionedPlugins.Remove(name);
            _logger.LogInformation("[PluginManager] Unregistered plugin: {Name}", name);
            return true;
        }
        return false;
    }

    /// <summary>
    /// Simple semver compatibility check (major version must match)
    /// </summary>
    private bool IsVersionCompatible(string version, string minVersion)
    {
        var versionParts = version.Split('.').Select(int.Parse).ToArray();
        var minVersionParts = minVersion.Split('.').Select(int.Parse).ToArray();

        if (versionParts.Length < 1 || minVersionParts.Length < 1)
        {
            return false;
        }

        // Major version must match
        if (versionParts[0] != minVersionParts[0])
        {
            return false;
        }

        // Version must be >= minVersion
        for (int i = 0; i < Math.Min(versionParts.Length, minVersionParts.Length); i++)
        {
            if (versionParts[i] < minVersionParts[i])
            {
                return false;
            }
            if (versionParts[i] > minVersionParts[i])
            {
                return true;
            }
        }

        return true;
    }
}
