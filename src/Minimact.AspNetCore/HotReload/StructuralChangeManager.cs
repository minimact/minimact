using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.DynamicState;
using Minimact.AspNetCore.SignalR;
using System.Text.Json;

namespace Minimact.AspNetCore.HotReload;

/// <summary>
/// Watches .structural-changes.json files and triggers full instance replacement
/// Simpler than field-based detection - relies on Babel's structural change detection
/// Key principle: It doesn't matter WHAT changed, just that structure changed
/// </summary>
public class StructuralChangeManager : IDisposable
{
    private readonly IHubContext<MinimactHub> _hubContext;
    private readonly ComponentRegistry _registry;
    private readonly ILogger<StructuralChangeManager> _logger;
    private readonly FileSystemWatcher _watcher;
    private readonly Dictionary<string, DateTime> _lastChangeTime = new();
    private readonly TimeSpan _debounceDelay = TimeSpan.FromMilliseconds(50);
    private bool _isDisposed;

    public StructuralChangeManager(
        IHubContext<MinimactHub> hubContext,
        ComponentRegistry registry,
        ILogger<StructuralChangeManager> logger,
        string watchPath)
    {
        _hubContext = hubContext;
        _registry = registry;
        _logger = logger;

        _watcher = new FileSystemWatcher
        {
            Path = watchPath,
            Filter = "*.structural-changes.json",
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName,
            IncludeSubdirectories = true,
            EnableRaisingEvents = true
        };

        _watcher.Changed += OnStructuralChangesFileChanged;
        _watcher.Created += OnStructuralChangesFileChanged;

        _logger.LogInformation("[Minimact Structural] 🔧 Watching {WatchPath} for *.structural-changes.json", watchPath);
    }

    /// <summary>
    /// Handle structural changes file event
    /// </summary>
    private async void OnStructuralChangesFileChanged(object sender, FileSystemEventArgs e)
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

            _logger.LogInformation("[Minimact Structural] 📝 Structural changes file detected: {FileName}", e.Name);

            // Read structural changes
            var json = await ReadFileWithRetryAsync(e.FullPath);
            var changes = JsonSerializer.Deserialize<StructuralChanges>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (changes == null || changes.Changes.Count == 0)
            {
                _logger.LogDebug("[Minimact Structural] No changes in file, skipping");
                return;
            }

            _logger.LogInformation(
                "[Minimact Structural] 🔄 Detected {Count} structural change(s) in {Component}",
                changes.Changes.Count,
                changes.ComponentName
            );

            // Trigger full instance replacement
            await ReplaceComponentInstancesAsync(changes.ComponentName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Minimact Structural] Error processing structural changes");
        }
    }

    /// <summary>
    /// Replace all instances of a component type
    /// Core principle: if (changes.Count > 0) → replace instance (that's it!)
    /// </summary>
    private async Task ReplaceComponentInstancesAsync(string componentTypeName)
    {
        // Get all instances of this component type
        var instances = _registry.GetComponentsByTypeName(componentTypeName).ToList();

        if (instances.Count == 0)
        {
            _logger.LogWarning("[Minimact Structural] No instances found for {ComponentType}", componentTypeName);
            return;
        }

        // Get the new type (should already be registered by transpilation pipeline)
        var newType = _registry.ResolveComponentType(componentTypeName);
        if (newType == null)
        {
            _logger.LogWarning("[Minimact Structural] Type not found in registry: {ComponentType}", componentTypeName);
            return;
        }

        _logger.LogInformation(
            "[Minimact Structural] 🔁 Replacing {Count} instance(s) of {ComponentType}",
            instances.Count,
            componentTypeName
        );

        foreach (var oldInstance in instances)
        {
            try
            {
                // 1. Snapshot old instance
                var stateSnapshot = new Dictionary<string, object>(oldInstance.State);
                var componentId = oldInstance.ComponentId;
                var connectionId = oldInstance.ConnectionId;
                var patchSender = oldInstance.PatchSender;

                // 2. Create new instance from new type
                var newInstance = (MinimactComponent)Activator.CreateInstance(newType)!;

                // 3. Restore identity and infrastructure
                newInstance.ComponentId = componentId; // Keep same ID!
                newInstance.ConnectionId = connectionId;
                newInstance.PatchSender = patchSender;

                // 4. Migrate compatible state (best-effort)
                foreach (var (key, value) in stateSnapshot)
                {
                    try
                    {
                        newInstance.State[key] = value;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[Minimact Structural] Failed to migrate state key '{Key}'", key);
                    }
                }

                // 5. Sync state to [State] fields
                StateManager.SyncStateToMembers(newInstance);

                // 6. Replace in registry
                _registry.RegisterComponent(newInstance);

                // 7. Trigger full re-render
                _logger.LogInformation(
                    "[Minimact Structural] ✅ Re-rendering {ComponentType} [{ComponentId}]",
                    componentTypeName,
                    componentId
                );
                newInstance.TriggerRender();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "[Minimact Structural] Failed to replace instance {ComponentId}",
                    oldInstance.ComponentId
                );
            }
        }
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
        _logger.LogInformation("[Minimact Structural] Structural change manager disposed");
    }
}
