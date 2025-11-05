using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.SignalR;
using Minimact.AspNetCore.Runtime;
using System.Text.Json;

namespace Minimact.AspNetCore.HotReload;

/// <summary>
/// Manages hot reload for runtime-loaded components
/// Watches .json component files, reloads via ComponentLoader, and updates templates
/// </summary>
public class RuntimeComponentHotReloadManager : IDisposable
{
    private readonly IHubContext<MinimactHub> _hubContext;
    private readonly ComponentRegistry _registry;
    private readonly ComponentLoader _componentLoader;
    private readonly ILogger<RuntimeComponentHotReloadManager> _logger;
    private readonly FileSystemWatcher _watcher;

    // Debouncing
    private readonly Dictionary<string, DateTime> _lastChangeTime = new();
    private readonly TimeSpan _debounceDelay = TimeSpan.FromMilliseconds(100);

    private bool _isDisposed;

    public RuntimeComponentHotReloadManager(
        IHubContext<MinimactHub> hubContext,
        ComponentRegistry registry,
        ComponentLoader componentLoader,
        ILogger<RuntimeComponentHotReloadManager> logger,
        string watchPath)
    {
        _hubContext = hubContext;
        _registry = registry;
        _componentLoader = componentLoader;
        _logger = logger;

        // Watch for .json component file changes
        _watcher = new FileSystemWatcher
        {
            Path = watchPath,
            Filter = "*.json",
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName,
            IncludeSubdirectories = true,
            EnableRaisingEvents = true
        };

        _watcher.Changed += OnComponentFileChanged;
        _watcher.Created += OnComponentFileChanged;
        _watcher.Renamed += OnComponentFileRenamed;

        _logger.LogInformation("[Minimact Hot Reload] 📦 Watching {WatchPath} for *.json component changes", watchPath);
    }

    /// <summary>
    /// Handle component JSON file change
    /// </summary>
    private async void OnComponentFileChanged(object sender, FileSystemEventArgs e)
    {
        // Skip .templates.json files (if they exist for legacy reasons)
        if (e.Name?.EndsWith(".templates.json") == true)
        {
            return;
        }

        var componentId = Path.GetFileNameWithoutExtension(e.Name);

        // Debounce rapid changes
        if (_lastChangeTime.TryGetValue(componentId, out var lastChange))
        {
            if (DateTime.UtcNow - lastChange < _debounceDelay)
            {
                return;
            }
        }

        _lastChangeTime[componentId] = DateTime.UtcNow;

        _logger.LogInformation("[Minimact Hot Reload] 🔄 Component changed: {ComponentId}", componentId);

        try
        {
            // Small delay to ensure file is fully written
            await Task.Delay(50);

            // Reload component via ComponentLoader
            _componentLoader.InvalidateCache(componentId);
            var newComponent = _componentLoader.Load(componentId, forceReload: true);

            // Update registry (component already has ComponentId set by loader)
            _registry.RegisterComponent(newComponent);

            // Extract templates from reloaded component
            var templates = newComponent.GetTemplates();

            _logger.LogInformation("[Minimact Hot Reload] ✅ Reloaded {ComponentId} with {Count} templates",
                componentId, templates.Count);

            // Notify all connected clients to reload this component
            await _hubContext.Clients.All.SendAsync("ComponentReloaded", new
            {
                componentId,
                templates,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });

            _logger.LogInformation("[Minimact Hot Reload] 📡 Sent reload notification to clients");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Minimact Hot Reload] ❌ Failed to reload component {ComponentId}", componentId);
        }
    }

    /// <summary>
    /// Handle component file rename
    /// </summary>
    private void OnComponentFileRenamed(object sender, RenamedEventArgs e)
    {
        var oldComponentId = Path.GetFileNameWithoutExtension(e.OldName);
        var newComponentId = Path.GetFileNameWithoutExtension(e.Name);

        _logger.LogInformation("[Minimact Hot Reload] 📝 Component renamed: {OldId} → {NewId}",
            oldComponentId, newComponentId);

        // Invalidate old component
        _componentLoader.InvalidateCache(oldComponentId);
        _registry.UnregisterComponent(oldComponentId);

        // Trigger reload of new component
        OnComponentFileChanged(sender, new FileSystemEventArgs(WatcherChangeTypes.Created, e.FullPath, e.Name));
    }

    public void Dispose()
    {
        if (_isDisposed) return;

        _watcher?.Dispose();
        _isDisposed = true;

        _logger.LogInformation("[Minimact Hot Reload] 🛑 Hot reload manager disposed");
    }
}
