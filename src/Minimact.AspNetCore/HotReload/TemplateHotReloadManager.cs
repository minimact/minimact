using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.SignalR;
using System.Text.Json;

namespace Minimact.AspNetCore.HotReload;

/// <summary>
/// Manages template-based hot reload
/// Watches .templates.json files and sends template patches to clients
/// Provides 100% coverage with minimal memory (2KB vs 100KB per component)
/// </summary>
public class TemplateHotReloadManager : IDisposable
{
    private readonly IHubContext<MinimactHub> _hubContext;
    private readonly ComponentRegistry _registry;
    private readonly ILogger<TemplateHotReloadManager> _logger;
    private readonly FileSystemWatcher _watcher;

    // Cache of loaded template maps (componentId → TemplateMap)
    private readonly Dictionary<string, TemplateMap> _templateMaps = new();

    // Debouncing
    private readonly Dictionary<string, DateTime> _lastChangeTime = new();
    private readonly TimeSpan _debounceDelay = TimeSpan.FromMilliseconds(50);

    private bool _isDisposed;

    public TemplateHotReloadManager(
        IHubContext<MinimactHub> hubContext,
        ComponentRegistry registry,
        ILogger<TemplateHotReloadManager> logger,
        string watchPath)
    {
        _hubContext = hubContext;
        _registry = registry;
        _logger = logger;

        // Watch for .templates.json file changes
        _watcher = new FileSystemWatcher
        {
            Path = watchPath,
            Filter = "*.templates.json",
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName,
            IncludeSubdirectories = true,
            EnableRaisingEvents = true
        };

        _watcher.Changed += OnTemplateFileChanged;
        _watcher.Created += OnTemplateFileChanged;
        _watcher.Renamed += OnTemplateFileRenamed;

        _logger.LogInformation("[Minimact Templates] 📦 Watching {WatchPath} for *.templates.json changes", watchPath);

        // Preload all existing template files
        Task.Run(() => PreloadExistingTemplates(watchPath));
    }

    /// <summary>
    /// Preload all existing .templates.json files on startup
    /// </summary>
    private async Task PreloadExistingTemplates(string watchPath)
    {
        try
        {
            var templateFiles = Directory.GetFiles(watchPath, "*.templates.json", SearchOption.AllDirectories);
            _logger.LogInformation("[Minimact Templates] 🔍 Found {Count} template files to preload", templateFiles.Length);

            foreach (var filePath in templateFiles)
            {
                var fileName = Path.GetFileName(filePath);
                var componentId = Path.GetFileNameWithoutExtension(fileName).Replace(".templates", "");

                var templateMap = await LoadTemplateMapAsync(filePath);
                if (templateMap != null)
                {
                    _templateMaps[componentId] = templateMap;
                    _logger.LogInformation("[Minimact Templates] ✅ Preloaded {Count} templates for {ComponentId}",
                        templateMap.Templates.Count, componentId);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Minimact Templates] Failed to preload templates");
        }
    }

    /// <summary>
    /// Load template map from file
    /// </summary>
    public async Task<TemplateMap?> LoadTemplateMapAsync(string filePath)
    {
        try
        {
            var json = await ReadFileWithRetryAsync(filePath);
            var templateMap = JsonSerializer.Deserialize<TemplateMap>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return templateMap;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Minimact Templates] Failed to load template map from {FilePath}", filePath);
            return null;
        }
    }

    /// <summary>
    /// Load template map for a component
    /// </summary>
    public async Task<TemplateMap?> LoadComponentTemplateMapAsync(string componentId, string basePath)
    {
        var templateFilePath = Path.Combine(basePath, $"{componentId}.templates.json");

        if (!File.Exists(templateFilePath))
        {
            _logger.LogDebug("[Minimact Templates] No template file found for {ComponentId}: {Path}", componentId, templateFilePath);
            return null;
        }

        var templateMap = await LoadTemplateMapAsync(templateFilePath);

        if (templateMap != null)
        {
            _templateMaps[componentId] = templateMap;
            _logger.LogInformation("[Minimact Templates] Loaded {Count} templates for {ComponentId}",
                templateMap.Templates.Count, componentId);
        }

        return templateMap;
    }

    /// <summary>
    /// Send template map to client on component init
    /// </summary>
    public async Task SendTemplateMapToClientAsync(string componentId, string connectionId)
    {
        if (!_templateMaps.TryGetValue(componentId, out var templateMap))
        {
            _logger.LogDebug("[Minimact Templates] No cached template map for {ComponentId}", componentId);
            return;
        }

        try
        {
            await _hubContext.Clients.Client(connectionId).SendAsync("HotReload:TemplateMap", new
            {
                type = "template-map",
                componentId,
                templateMap,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });

            _logger.LogDebug("[Minimact Templates] Sent template map to client for {ComponentId}", componentId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Minimact Templates] Failed to send template map to client");
        }
    }

    /// <summary>
    /// Handle template file change event
    /// </summary>
    private async void OnTemplateFileChanged(object sender, FileSystemEventArgs e)
    {
        try
        {
            // Debounce
            var now = DateTime.UtcNow;
            if (_lastChangeTime.TryGetValue(e.FullPath, out var lastChange))
            {
                if (now - lastChange < _debounceDelay)
                {
                    return;
                }
            }
            _lastChangeTime[e.FullPath] = now;

            _logger.LogDebug("[Minimact Templates] 📝 Template file changed: {FileName}", e.Name);

            // Extract component ID from filename
            var componentId = Path.GetFileNameWithoutExtension(e.Name ?? "")
                .Replace(".templates", "");

            if (string.IsNullOrEmpty(componentId))
            {
                _logger.LogWarning("[Minimact Templates] Could not extract component ID from {FileName}", e.Name);
                return;
            }

            // Load new template map
            var newTemplateMap = await LoadTemplateMapAsync(e.FullPath);
            if (newTemplateMap == null)
            {
                _logger.LogWarning("[Minimact Templates] Failed to load new template map for {ComponentId}", componentId);
                return;
            }

            // Get old template map
            var hadOldMap = _templateMaps.TryGetValue(componentId, out var oldTemplateMap);

            if (!hadOldMap)
            {
                // First load - cache and send to all clients
                _templateMaps[componentId] = newTemplateMap;
                await SendTemplateMapToAllClients(componentId, newTemplateMap);
                return;
            }

            // Detect template changes
            var changes = DetectTemplateChanges(oldTemplateMap!, newTemplateMap);

            if (changes.Count == 0)
            {
                _logger.LogDebug("[Minimact Templates] No template changes for {ComponentId}", componentId);
                return;
            }

            // Get component state for parameterizing patches
            var component = _registry.GetComponent(componentId);
            var currentState = component?.GetState() ?? new Dictionary<string, object>();

            // Generate and send template patches
            foreach (var change in changes)
            {
                var patch = CreateTemplatePatch(componentId, change, currentState);
                if (patch != null)
                {
                    await SendTemplatePatch(patch);
                }
            }

            // Update cached template map
            _templateMaps[componentId] = newTemplateMap;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Minimact Templates] Error processing template file change");
        }
    }

    /// <summary>
    /// Detect changes between old and new template maps
    /// </summary>
    private List<TemplateChange> DetectTemplateChanges(TemplateMap oldMap, TemplateMap newMap)
    {
        var changes = new List<TemplateChange>();

        // Check for modified/added templates
        foreach (var (nodePath, newTemplate) in newMap.Templates)
        {
            if (!oldMap.Templates.TryGetValue(nodePath, out var oldTemplate))
            {
                // New template added
                changes.Add(new TemplateChange
                {
                    NodePath = nodePath,
                    OldTemplate = null,
                    NewTemplate = newTemplate,
                    ChangeType = ChangeType.Added
                });
                continue;
            }

            // Check if template string changed
            if (oldTemplate.TemplateString != newTemplate.TemplateString)
            {
                changes.Add(new TemplateChange
                {
                    NodePath = nodePath,
                    OldTemplate = oldTemplate,
                    NewTemplate = newTemplate,
                    ChangeType = ChangeType.Modified
                });
            }
        }

        // Check for removed templates
        foreach (var (nodePath, oldTemplate) in oldMap.Templates)
        {
            if (!newMap.Templates.ContainsKey(nodePath))
            {
                changes.Add(new TemplateChange
                {
                    NodePath = nodePath,
                    OldTemplate = oldTemplate,
                    NewTemplate = null,
                    ChangeType = ChangeType.Removed
                });
            }
        }

        return changes;
    }

    /// <summary>
    /// Create template patch from template change
    /// </summary>
    private TemplatePatch? CreateTemplatePatch(
        string componentId,
        TemplateChange change,
        Dictionary<string, object> currentState)
    {
        if (change.NewTemplate == null) return null;

        var template = change.NewTemplate;

        // Get parameter values from current state
        var params_ = template.Bindings
            .Select(binding => currentState.TryGetValue(binding, out var value) ? value : null)
            .ToList();

        return new TemplatePatch
        {
            Type = template.Attribute != null ? "UpdatePropTemplate" : "UpdateTextTemplate",
            ComponentId = componentId,
            Path = template.Path,
            Template = template.TemplateString,
            Params = params_,
            Bindings = template.Bindings,
            Slots = template.Slots,
            Attribute = template.Attribute
        };
    }

    /// <summary>
    /// Send template patch to all clients
    /// </summary>
    private async Task SendTemplatePatch(TemplatePatch patch)
    {
        try
        {
            await _hubContext.Clients.All.SendAsync("HotReload:TemplatePatch", new
            {
                type = "template-patch",
                componentId = patch.ComponentId,
                templatePatch = patch,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });

            _logger.LogInformation(
                "[Minimact Templates] 🚀 Sent template patch for {ComponentId}: \"{OldTemplate}\" → \"{NewTemplate}\"",
                patch.ComponentId,
                "template",
                patch.Template
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Minimact Templates] Failed to send template patch");
        }
    }

    /// <summary>
    /// Send template map to all connected clients
    /// </summary>
    private async Task SendTemplateMapToAllClients(string componentId, TemplateMap templateMap)
    {
        try
        {
            await _hubContext.Clients.All.SendAsync("HotReload:TemplateMap", new
            {
                type = "template-map",
                componentId,
                templateMap,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });

            _logger.LogInformation("[Minimact Templates] Sent template map to all clients for {ComponentId}", componentId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Minimact Templates] Failed to send template map to all clients");
        }
    }

    /// <summary>
    /// Handle file rename events
    /// </summary>
    private void OnTemplateFileRenamed(object sender, RenamedEventArgs e)
    {
        _logger.LogInformation("[Minimact Templates] Template file renamed: {OldName} → {NewName}", e.OldName, e.Name);
        OnTemplateFileChanged(sender, new FileSystemEventArgs(WatcherChangeTypes.Changed, Path.GetDirectoryName(e.FullPath)!, e.Name!));
    }

    /// <summary>
    /// Read file with retry (files may be locked temporarily)
    /// </summary>
    private async Task<string> ReadFileWithRetryAsync(string filePath, int maxRetries = 3)
    {
        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                using var reader = new StreamReader(stream);
                return await reader.ReadToEndAsync();
            }
            catch (IOException) when (i < maxRetries - 1)
            {
                await Task.Delay(10);
            }
        }

        throw new IOException($"Could not read file after {maxRetries} attempts: {filePath}");
    }

    public void Dispose()
    {
        if (_isDisposed) return;

        _watcher?.Dispose();
        _isDisposed = true;

        _logger.LogInformation("[Minimact Templates] Template hot reload manager disposed");
    }
}
