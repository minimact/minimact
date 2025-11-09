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

    // Queue for patches waiting for structural changes
    private readonly Dictionary<string, List<TemplatePatch>> _queuedPatches = new();

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

            // Post-process: Extract attribute names and inflate compact hex paths
            if (templateMap != null)
            {
                // Rebuild the template dictionary with inflated keys
                var inflatedTemplates = new Dictionary<string, Template>();

                foreach (var (nodePath, template) in templateMap.Templates)
                {
                    // Check if node path contains attribute marker (@)
                    var atIndex = nodePath.LastIndexOf("@");
                    if (atIndex >= 0 && (template.Type == "attribute-static" || template.Type == "attribute-dynamic"))
                    {
                        // Extract attribute name after @ (e.g., "@style" -> "style")
                        template.Attribute = nodePath.Substring(atIndex + 1);
                    }

                    // Inflate compact hex paths (e.g., ["1", "2"] -> ["10000000", "20000000"])
                    // This ensures the client receives full 8-digit hex paths for matching
                    string inflatedKey = nodePath;

                    if (template.Path != null && template.Path.Count > 0)
                    {
                        // Check if paths are already inflated (8 characters or more)
                        bool alreadyInflated = template.Path.All(segment => segment.Length >= 8);

                        if (!alreadyInflated)
                        {
                            var inflatedPath = new List<string>(template.Path.Count);
                            foreach (var segment in template.Path)
                            {
                                // Parse compact hex (e.g., "1" = 0x1)
                                if (uint.TryParse(segment, System.Globalization.NumberStyles.HexNumber, null, out uint value))
                                {
                                    // Multiply by HEX_GAP to get aligned value (0x1 -> 0x10000000)
                                    uint inflated = value * HEX_GAP;
                                    // Format as 8-digit hex
                                    inflatedPath.Add(inflated.ToString("x8"));
                                }
                                else
                                {
                                    // If parse fails, keep original segment (shouldn't happen, but handle gracefully)
                                    inflatedPath.Add(segment);
                                }
                            }
                            template.Path = inflatedPath;

                            // Also inflate the dictionary key (e.g., "1.2" -> "10000000.20000000")
                            inflatedKey = string.Join(".", inflatedPath);
                        }
                    }

                    inflatedTemplates[inflatedKey] = template;
                }

                templateMap.Templates = inflatedTemplates;
            }

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
        // Get component instance to find its type name
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            _logger.LogDebug("[Minimact Templates] Component {ComponentId} not found in registry", componentId);
            return;
        }

        // Template maps are keyed by component type name (from filename)
        var componentTypeName = component.GetType().Name;
        if (!_templateMaps.TryGetValue(componentTypeName, out var templateMap))
        {
            _logger.LogDebug("[Minimact Templates] No cached template map for component type {ComponentType}", componentTypeName);
            return;
        }

        // Augment template map with null path entries (using component GUID for VNode lookup)
        var augmentedTemplateMap = AugmentTemplateMapWithNullPaths(componentId, templateMap);

        try
        {
            await _hubContext.Clients.Client(connectionId).SendAsync("HotReload:TemplateMap", new
            {
                type = "template-map",
                componentId = componentTypeName, // Send type name, not instance ID
                templateMap = augmentedTemplateMap,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });

            _logger.LogDebug("[Minimact Templates] Sent template map to client for {ComponentType}", componentTypeName);
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
            var componentTypeName = component?.GetType().Name ?? componentId;

            // Generate and send template patches
            foreach (var change in changes)
            {
                var patch = CreateTemplatePatch(componentId, change, currentState);
                if (patch != null)
                {
                    await SendTemplatePatchAsync(componentTypeName, patch);
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

        // Build hex path from template path
        // Note: Client-side null path tracking handles null-skipping during DOM navigation,
        // so server no longer needs to adjust paths for null children
        var hexPath = InflateHexPath(template.Path);

        // Append attribute suffix if this is an attribute template
        if (template.Attribute != null)
        {
            hexPath = $"{hexPath}.@{template.Attribute}";
        }

        // Get parameter values from current state
        var params_ = template.Bindings
            .Select(binding => currentState.TryGetValue(binding, out var value) ? value : null)
            .ToList();

        // Map template type to patch type
        var patchType = template.Type switch
        {
            "static" => "UpdateTextTemplate",
            "dynamic" => "UpdateTextTemplate",
            "attribute-static" => "UpdateAttributeStatic",
            "attribute-dynamic" => "UpdatePropTemplate",
            "attribute" => "UpdatePropTemplate", // Legacy support
            "loop" => "UpdateListTemplate",
            _ => template.Attribute != null ? "UpdatePropTemplate" : "UpdateTextTemplate"
        };

        var patch = new TemplatePatch
        {
            Type = patchType,
            ComponentId = componentId,
            Path = hexPath,  // VNode hex path (client handles null-skipping)
            Template = template.TemplateString,
            Params = params_,
            Bindings = template.Bindings,
            Slots = template.Slots,
            Attribute = template.Attribute,
            LoopTemplate = template.LoopTemplate
        };

        // For UpdateAttributeStatic, populate attrName and value fields (client expects these)
        if (patchType == "UpdateAttributeStatic" && template.Attribute != null)
        {
            patch.AttrName = template.Attribute;
            patch.Value = template.TemplateString; // Static value (no params to substitute)
        }

        return patch;
    }

    /// <summary>
    /// Create patch with unadjusted path (fallback when CurrentVNode not available)
    /// </summary>
    private TemplatePatch CreatePatchWithUnadjustedPath(
        Template template,
        string componentId,
        Dictionary<string, object> currentState)
    {
        var params_ = template.Bindings
            .Select(binding => currentState.TryGetValue(binding, out var value) ? value : null)
            .ToList();

        var patchType = template.Type switch
        {
            "static" => "UpdateTextTemplate",
            "dynamic" => "UpdateTextTemplate",
            "attribute-static" => "UpdateAttributeStatic",
            "attribute-dynamic" => "UpdatePropTemplate",
            "attribute" => "UpdatePropTemplate",
            "loop" => "UpdateListTemplate",
            _ => template.Attribute != null ? "UpdatePropTemplate" : "UpdateTextTemplate"
        };

        // Build path with attribute suffix if present
        var fallbackPath = InflateHexPath(template.Path);
        if (template.Attribute != null)
        {
            fallbackPath = $"{fallbackPath}.@{template.Attribute}";
        }

        var patch = new TemplatePatch
        {
            Type = patchType,
            ComponentId = componentId,
            Path = fallbackPath, // Unadjusted VNode path with attribute suffix
            Template = template.TemplateString,
            Params = params_,
            Bindings = template.Bindings,
            Slots = template.Slots,
            Attribute = template.Attribute,
            LoopTemplate = template.LoopTemplate
        };

        if (patchType == "UpdateAttributeStatic" && template.Attribute != null)
        {
            patch.AttrName = template.Attribute;
            patch.Value = template.TemplateString;
        }

        return patch;
    }

    /// <summary>
    /// Send template patch to clients (or queue if path doesn't exist yet)
    /// </summary>
    private async Task SendTemplatePatchAsync(string componentTypeName, TemplatePatch patch)
    {
        // Check if hex path exists in any component instance
        var instances = _registry.GetComponentsByTypeName(componentTypeName);

        _logger.LogInformation(
            "[Minimact Templates] 🔍 Checking path existence. Component: {ComponentType}, Instances: {Count}, Path: {Path}",
            componentTypeName,
            instances.Count(),
            patch.Path
        );

        bool pathExists = false;

        foreach (var instance in instances)
        {
            _logger.LogInformation("[Minimact Templates] 🔍 Checking instance {InstanceId}", instance.ComponentId);

            if (DoesPathExist(instance, patch.Path))
            {
                pathExists = true;
                break;
            }
        }

        if (!pathExists)
        {
            // Path doesn't exist - queue patch for after structural change
            _logger.LogInformation(
                "[Minimact Templates] ⏸️  Path not found, queuing patch for {ComponentType}: {Path}",
                componentTypeName,
                patch.Path
            );

            if (!_queuedPatches.ContainsKey(componentTypeName))
            {
                _queuedPatches[componentTypeName] = new List<TemplatePatch>();
            }
            _queuedPatches[componentTypeName].Add(patch);
            return;
        }

        // Path exists - send immediately
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

    /// <summary>
    /// Augment template map with null path entries from current VNode tree
    /// </summary>
    private TemplateMap AugmentTemplateMapWithNullPaths(string componentId, TemplateMap templateMap)
    {
        var component = _registry.GetComponent(componentId);
        if (component?.CurrentVNode == null)
        {
            return templateMap; // No VNode available, return original
        }

        // Extract null paths from VNode tree
        var nullPaths = ExtractNullPaths(component.CurrentVNode);

        if (nullPaths.Count == 0)
        {
            return templateMap; // No null paths, return original
        }

        // Create augmented template map with null path entries
        var augmentedTemplates = new Dictionary<string, Template>(templateMap.Templates);

        foreach (var nullPath in nullPaths)
        {
            // Add empty template with .null suffix to the key
            // Client expects "10000000.20000000.null" format for null path detection
            augmentedTemplates[$"{nullPath}.null"] = new Template
            {
                TemplateString = "",
                Bindings = new List<string>(),
                Slots = new List<int>(),
                Path = new List<string>(), // Empty path for null nodes
                Type = "null"
            };
        }

        _logger.LogDebug("[Minimact Templates] Added {Count} null path entries for {ComponentId}",
            nullPaths.Count, componentId);

        return new TemplateMap
        {
            Component = templateMap.Component,
            Version = templateMap.Version,
            GeneratedAt = templateMap.GeneratedAt,
            Templates = augmentedTemplates
        };
    }

    /// <summary>
    /// Extract null paths from VNode tree (recursive)
    /// </summary>
    // Use centralized ExtractNullPaths from PatchPathAdjuster
    private List<string> ExtractNullPaths(VNode rootVNode)
    {
        return PatchPathAdjuster.ExtractNullPaths(rootVNode);
    }

    /// <summary>
    /// Inflate compact hex path array to full format for Rust compatibility
    /// Converts ["1", "2", "3"] to "10000000.20000000.30000000"
    /// This allows Babel to emit compact paths while maintaining compatibility with Rust reconciler
    /// </summary>
    private const uint HEX_GAP = 0x10000000;

    private static string InflateHexPath(List<string> compactPathSegments)
    {
        if (compactPathSegments == null || compactPathSegments.Count == 0)
            return string.Empty;

        var inflatedSegments = new List<string>(compactPathSegments.Count);

        foreach (var segment in compactPathSegments)
        {
            // Check if already inflated (8+ characters)
            if (segment.Length >= 8)
            {
                inflatedSegments.Add(segment);
                continue;
            }

            // Parse compact hex (e.g., "1" = 0x1)
            if (uint.TryParse(segment, System.Globalization.NumberStyles.HexNumber, null, out uint value))
            {
                // Multiply by HEX_GAP to get aligned value (0x1 -> 0x10000000)
                uint inflated = value * HEX_GAP;
                // Format as 8-digit hex
                inflatedSegments.Add(inflated.ToString("x8"));
            }
            else
            {
                // If parse fails, keep original segment (shouldn't happen, but handle gracefully)
                inflatedSegments.Add(segment);
            }
        }

        return string.Join(".", inflatedSegments);
    }

    /// <summary>
    /// Check if a hex path exists in a component's VNode tree
    /// </summary>
    private bool DoesPathExist(MinimactComponent component, string hexPath)
    {
        // Component's CurrentVNode contains the rendered tree
        if (component.CurrentVNode == null)
        {
            _logger.LogInformation("[Path Check] CurrentVNode is null for path: {HexPath}", hexPath);
            return false;
        }

        // Inflate the path first (10000000.30000000 → 1.3)
        // Template paths are deflated, but VNode paths are inflated
        var pathSegments = hexPath.Split('.').ToList();
        var inflatedPath = InflateHexPath(pathSegments);

        // Strip attribute suffix if present (e.g., "1.3.2.@value" → "1.3.2")
        var pathWithoutAttr = inflatedPath;
        if (inflatedPath.Contains(".@"))
        {
            pathWithoutAttr = inflatedPath.Substring(0, inflatedPath.IndexOf(".@"));
        }

        _logger.LogInformation(
            "[Path Check] Looking for path. Deflated: {Deflated}, Inflated: {Inflated}, Without Attr: {WithoutAttr}",
            hexPath,
            inflatedPath,
            pathWithoutAttr
        );

        // Recursively search for a VNode with this path
        var found = FindVNodeByPath(component.CurrentVNode, pathWithoutAttr);

        _logger.LogInformation("[Path Check] Path {Path} found: {Found}", pathWithoutAttr, found);

        return found;
    }

    /// <summary>
    /// Recursively search for a VNode with a specific path
    /// </summary>
    private bool FindVNodeByPath(VNode node, string targetPath)
    {
        if (node == null) return false;

        // Debug: Log this node's path
        _logger.LogInformation("[Path Check] Checking node path: {NodePath} vs target: {TargetPath}", node.Path ?? "(null)", targetPath);

        // Check if this node's path matches
        if (node.Path == targetPath) return true;

        // Recursively search children
        if (node is VElement element && element.Children != null)
        {
            foreach (var child in element.Children)
            {
                if (FindVNodeByPath(child, targetPath))
                {
                    return true;
                }
            }
        }

        return false;
    }

    /// <summary>
    /// Process queued patches for a component after structural change completes
    /// Called by StructuralChangeManager after instance replacement
    /// </summary>
    public async Task ProcessQueuedPatchesAsync(string componentTypeName)
    {
        if (!_queuedPatches.TryGetValue(componentTypeName, out var patches) || patches.Count == 0)
        {
            return;
        }

        _logger.LogInformation(
            "[Minimact Templates] 📤 Processing {Count} queued patch(es) for {ComponentType}",
            patches.Count,
            componentTypeName
        );

        // Create a copy to avoid collection modified exception
        // (SendTemplatePatchAsync might re-queue patches if paths still don't exist)
        var patchesToProcess = patches.ToList();

        // Clear the queue before processing
        _queuedPatches.Remove(componentTypeName);

        // Process patches (might re-queue some if paths still don't exist)
        foreach (var patch in patchesToProcess)
        {
            try
            {
                await SendTemplatePatchAsync(componentTypeName, patch);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Minimact Templates] Failed to process queued patch for {ComponentType}", componentTypeName);
            }
        }
    }

    public void Dispose()
    {
        if (_isDisposed) return;

        _watcher?.Dispose();
        _isDisposed = true;

        _logger.LogInformation("[Minimact Templates] Template hot reload manager disposed");
    }
}
