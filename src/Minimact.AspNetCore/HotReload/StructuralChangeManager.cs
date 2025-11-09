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
    private readonly TemplateHotReloadManager _templateManager;
    private readonly DynamicRoslynCompiler _compiler;
    private readonly FileSystemWatcher _watcher;
    private readonly Dictionary<string, DateTime> _lastChangeTime = new();
    private readonly Dictionary<string, DateTime> _lastProcessedTimestamp = new(); // Track JSON timestamp to prevent duplicate processing
    private readonly TimeSpan _debounceDelay = TimeSpan.FromMilliseconds(50);
    private readonly string _watchPath;
    private bool _isDisposed;

    public StructuralChangeManager(
        IHubContext<MinimactHub> hubContext,
        ComponentRegistry registry,
        ILogger<StructuralChangeManager> logger,
        TemplateHotReloadManager templateManager,
        DynamicRoslynCompiler compiler,
        string watchPath)
    {
        _hubContext = hubContext;
        _registry = registry;
        _logger = logger;
        _templateManager = templateManager;
        _compiler = compiler;
        _watchPath = watchPath;

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

            // Check if we've already processed this exact change (prevent duplicate events)
            var changeKey = $"{changes.ComponentName}:{changes.Timestamp}";
            if (_lastProcessedTimestamp.TryGetValue(changes.ComponentName, out var lastTimestamp) && lastTimestamp == changes.Timestamp)
            {
                _logger.LogDebug("[Minimact Structural] Already processed timestamp {Timestamp} for {Component}, skipping duplicate", changes.Timestamp, changes.ComponentName);
                return;
            }
            _lastProcessedTimestamp[changes.ComponentName] = changes.Timestamp;

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
        _logger.LogInformation("[Minimact Structural] 🔍 ReplaceComponentInstancesAsync called for {ComponentType}", componentTypeName);

        // Get all instances of this component type
        var instances = _registry.GetComponentsByTypeName(componentTypeName).ToList();
        _logger.LogInformation("[Minimact Structural] 🔍 Found {Count} instances", instances.Count);

        if (instances.Count == 0)
        {
            _logger.LogWarning("[Minimact Structural] No instances found for {ComponentType}", componentTypeName);
            return;
        }

        _logger.LogInformation("[Minimact Structural] 🔍 About to find CS file for {ComponentType}", componentTypeName);

        // Find and compile the corresponding C# file
        var csFilePath = FindCsFile(componentTypeName);
        _logger.LogInformation("[Minimact Structural] 🔍 FindCsFile returned: {Path}", csFilePath ?? "NULL");

        if (csFilePath == null)
        {
            _logger.LogError("[Minimact Structural] ❌ Could not find C# file for {ComponentType}", componentTypeName);
            return;
        }

        _logger.LogInformation("[Minimact Structural] 🔍 About to compile {Path}", csFilePath);

        // Compile the C# file using Roslyn
        var newType = _compiler.CompileAndLoadType(csFilePath, componentTypeName);
        _logger.LogInformation("[Minimact Structural] 🔍 Compilation returned type: {TypeName}", newType?.Name ?? "NULL");

        if (newType == null)
        {
            _logger.LogError("[Minimact Structural] ❌ Failed to compile {ComponentType}", componentTypeName);
            return;
        }

        // Register the new type in the registry
        _registry.RegisterComponentType(componentTypeName, newType);

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

                // 6. Copy CurrentVNode from old instance so TriggerRender can reconcile
                // Without this, TriggerRender thinks it's a first render and sends no patches!
                newInstance.CurrentVNode = oldInstance.CurrentVNode;
                newInstance.PreviousState = new Dictionary<string, object>(oldInstance.State);

                // 7. Replace in registry
                _registry.RegisterComponent(newInstance);

                // 8. Trigger full re-render (will reconcile old VNode vs new render)
                // Pass forceRender=true to bypass state change check (structure changed!)
                _logger.LogInformation(
                    "[Minimact Structural] ✅ Re-rendering {ComponentType} [{ComponentId}]",
                    componentTypeName,
                    componentId
                );
                newInstance.TriggerRender(forceRender: true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "[Minimact Structural] Failed to replace instance {ComponentId}",
                    oldInstance.ComponentId
                );
            }
        }

        // After all instances are replaced, process queued template patches
        // These patches were waiting for the structural change to complete
        _logger.LogInformation(
            "[Minimact Structural] ✅ Instance replacement complete. Processing queued patches for {ComponentType}",
            componentTypeName
        );
        await _templateManager.ProcessQueuedPatchesAsync(componentTypeName);
    }

    /// <summary>
    /// Find the C# file for a component
    /// Searches common locations: Pages/, Components/, Generated/
    /// </summary>
    private string? FindCsFile(string componentTypeName)
    {
        var possiblePaths = new[]
        {
            Path.Combine(_watchPath, "Pages", $"{componentTypeName}.cs"),
            Path.Combine(_watchPath, "Components", $"{componentTypeName}.cs"),
            Path.Combine(_watchPath, "Generated", $"{componentTypeName}.cs"),
            Path.Combine(_watchPath, "Generated", "Pages", $"{componentTypeName}.cs"),
            Path.Combine(_watchPath, "Generated", "Components", $"{componentTypeName}.cs")
        };

        foreach (var path in possiblePaths)
        {
            if (File.Exists(path))
            {
                _logger.LogDebug("[Minimact Structural] Found C# file: {Path}", path);
                return path;
            }
        }

        // Try recursive search as fallback
        try
        {
            var files = Directory.GetFiles(_watchPath, $"{componentTypeName}.cs", SearchOption.AllDirectories);
            if (files.Length > 0)
            {
                _logger.LogDebug("[Minimact Structural] Found C# file via search: {Path}", files[0]);
                return files[0];
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Minimact Structural] Error searching for C# file");
        }

        return null;
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
