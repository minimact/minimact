using System.Text.Json;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Minimact.AspNetCore.Services;

/// <summary>
/// Registry for client-side modules in mact_modules/ directory
/// Scans modules at startup and provides metadata for script inclusion
/// </summary>
public class MactModuleRegistry
{
    private readonly Dictionary<string, ModuleMetadata> _modules = new();
    private readonly ILogger<MactModuleRegistry> _logger;
    private readonly string _mactModulesPath;
    private readonly string _contentRootPath;

    public MactModuleRegistry(IHostEnvironment env, ILogger<MactModuleRegistry> logger)
    {
        _logger = logger;
        _contentRootPath = env.ContentRootPath;
        _mactModulesPath = Path.Combine(_contentRootPath, "mact_modules");
    }

    /// <summary>
    /// Scan mact_modules/ directory and load all modules
    /// Called at startup in Program.cs
    /// </summary>
    public void ScanModules()
    {
        if (!Directory.Exists(_mactModulesPath))
        {
            _logger.LogInformation("mact_modules/ directory not found. Run 'swig init' to initialize.");
            return;
        }

        _modules.Clear();

        // Scan all package.json files
        var packageFiles = Directory.GetFiles(_mactModulesPath, "package.json", SearchOption.AllDirectories);

        _logger.LogInformation($"Found {packageFiles.Length} package.json files in mact_modules/");

        foreach (var packageFile in packageFiles)
        {
            try
            {
                var json = File.ReadAllText(packageFile);
                var metadata = JsonSerializer.Deserialize<ModuleMetadata>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (metadata != null && !string.IsNullOrEmpty(metadata.Name))
                {
                    var moduleDir = Path.GetDirectoryName(packageFile)!;
                    metadata.ScriptPath = Path.Combine(moduleDir, metadata.Main);

                    // Verify script file exists
                    if (!File.Exists(metadata.ScriptPath))
                    {
                        _logger.LogWarning($"Module {metadata.Name} package.json references {metadata.Main}, but file not found at {metadata.ScriptPath}");
                        continue;
                    }

                    // Calculate load order based on dependencies
                    metadata.LoadOrder = CalculateLoadOrder(metadata);

                    _modules[metadata.Name] = metadata;
                    _logger.LogInformation($"✓ Loaded module: {metadata.Name}@{metadata.Version} ({metadata.Type})");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to load module from {packageFile}");
            }
        }

        _logger.LogInformation($"Successfully loaded {_modules.Count} modules from mact_modules/");
    }

    /// <summary>
    /// Calculate load order priority based on dependencies
    /// Modules with dependencies load after their dependencies
    /// </summary>
    private int CalculateLoadOrder(ModuleMetadata metadata)
    {
        // Core modules load first (priority 10)
        if (metadata.Name.StartsWith("@minimact/core"))
        {
            return 10;
        }

        // Other @minimact modules load second (priority 20)
        if (metadata.Name.StartsWith("@minimact/"))
        {
            return 20;
        }

        // External libraries load last (priority 100)
        return 100;
    }

    /// <summary>
    /// Get all modules (for default inclusion)
    /// Returns modules ordered by LoadOrder
    /// </summary>
    public IEnumerable<ModuleMetadata> GetAllModules()
    {
        return _modules.Values.OrderBy(m => m.LoadOrder).ThenBy(m => m.Name);
    }

    /// <summary>
    /// Get specific modules by name
    /// </summary>
    public IEnumerable<ModuleMetadata> GetModules(IEnumerable<string> moduleNames)
    {
        return moduleNames
            .Select(name => _modules.TryGetValue(name, out var module) ? module : null)
            .Where(m => m != null)
            .OrderBy(m => m!.LoadOrder)
            .ThenBy(m => m!.Name)!;
    }

    /// <summary>
    /// Exclude specific modules from the full list
    /// </summary>
    public IEnumerable<ModuleMetadata> GetModulesExcluding(IEnumerable<string> excludeNames)
    {
        var excludeSet = new HashSet<string>(excludeNames);
        return _modules.Values
            .Where(m => !excludeSet.Contains(m.Name))
            .OrderBy(m => m.LoadOrder)
            .ThenBy(m => m.Name);
    }

    /// <summary>
    /// Get module by name (returns null if not found)
    /// </summary>
    public ModuleMetadata? GetModule(string name)
    {
        _modules.TryGetValue(name, out var module);
        return module;
    }

    /// <summary>
    /// Check if a module is installed
    /// </summary>
    public bool HasModule(string name)
    {
        return _modules.ContainsKey(name);
    }

    /// <summary>
    /// Get count of installed modules
    /// </summary>
    public int Count => _modules.Count;

    /// <summary>
    /// Convert absolute script path to web-relative path
    /// Example: J:\MyApp\mact_modules\lodash\lodash.min.js → /mact_modules/lodash/lodash.min.js
    /// </summary>
    public string GetWebPath(ModuleMetadata module)
    {
        var relativePath = Path.GetRelativePath(_contentRootPath, module.ScriptPath!)
            .Replace('\\', '/');

        return $"/{relativePath}";
    }
}

/// <summary>
/// Metadata for a mact_module (from package.json)
/// </summary>
public class ModuleMetadata
{
    /// <summary>
    /// Package name (e.g., "lodash", "@minimact/power")
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Semantic version (e.g., "4.17.21", "0.2.0")
    /// </summary>
    public string Version { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable description
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Main script file (relative to package directory)
    /// Example: "lodash.min.js", "power.min.js"
    /// </summary>
    public string Main { get; set; } = string.Empty;

    /// <summary>
    /// Module type: "module" (ESM) or "umd" (global)
    /// </summary>
    public string Type { get; set; } = "umd";

    /// <summary>
    /// Optional CDN fallback URL
    /// </summary>
    public string? Cdn { get; set; }

    /// <summary>
    /// Optional SRI integrity hash
    /// </summary>
    public string? Integrity { get; set; }

    /// <summary>
    /// Global variable name (for UMD modules)
    /// Example: "_" for lodash, "moment" for moment.js
    /// </summary>
    public string? Global { get; set; }

    /// <summary>
    /// Module dependencies (name → version)
    /// Example: { "@minimact/core": ">=0.2.0" }
    /// </summary>
    public Dictionary<string, string>? Dependencies { get; set; }

    /// <summary>
    /// Absolute path to script file (computed at runtime)
    /// Example: J:\MyApp\mact_modules\lodash\lodash.min.js
    /// </summary>
    public string? ScriptPath { get; set; }

    /// <summary>
    /// Load order priority (lower = earlier)
    /// Auto-computed based on dependencies and package type
    /// </summary>
    public int LoadOrder { get; set; } = 100;
}
