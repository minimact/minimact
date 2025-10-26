using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Minimact.AspNetCore.SignalR;

namespace Minimact.AspNetCore.HotReload;

/// <summary>
/// Watches .cshtml component files for changes and triggers hot reload
/// Sends file changes to connected clients for instant preview
/// </summary>
public class HotReloadFileWatcher : IDisposable
{
    private readonly FileSystemWatcher _watcher;
    private readonly IHubContext<MinimactHub> _hubContext;
    private readonly ILogger<HotReloadFileWatcher> _logger;
    private readonly Dictionary<string, DateTime> _lastChangeTime = new();
    private readonly TimeSpan _debounceDelay = TimeSpan.FromMilliseconds(50);
    private bool _isDisposed;

    public HotReloadFileWatcher(
        IHubContext<MinimactHub> hubContext,
        ILogger<HotReloadFileWatcher> logger,
        IConfiguration configuration)
    {
        _hubContext = hubContext;
        _logger = logger;

        // Check if hot reload is enabled
        var enabled = configuration.GetValue<bool>("Minimact:HotReload:Enabled", true);
        if (!enabled)
        {
            _logger.LogInformation("[Minimact HMR] Hot reload disabled");
            return;
        }

        // Get watch path from configuration or use current directory
        var watchPath = configuration.GetValue<string>("Minimact:HotReload:WatchPath")
                        ?? Directory.GetCurrentDirectory();

        _watcher = new FileSystemWatcher
        {
            Path = watchPath,
            Filter = "*.cshtml",
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName,
            IncludeSubdirectories = true,
            EnableRaisingEvents = true
        };

        _watcher.Changed += OnFileChanged;
        _watcher.Created += OnFileChanged;
        _watcher.Renamed += OnFileRenamed;

        _logger.LogInformation("[Minimact HMR] 🔥 Watching {WatchPath} for *.cshtml changes", watchPath);
    }

    /// <summary>
    /// Handle file change events
    /// </summary>
    private async void OnFileChanged(object sender, FileSystemEventArgs e)
    {
        try
        {
            // Debounce (editors trigger multiple events)
            var now = DateTime.UtcNow;
            if (_lastChangeTime.TryGetValue(e.FullPath, out var lastChange))
            {
                if (now - lastChange < _debounceDelay)
                {
                    return; // Ignore duplicate event
                }
            }
            _lastChangeTime[e.FullPath] = now;

            _logger.LogDebug("[Minimact HMR] 📝 File changed: {FileName}", e.Name);

            // Extract component ID from file path
            var componentId = ExtractComponentId(e.FullPath);
            if (componentId == null)
            {
                _logger.LogWarning("[Minimact HMR] ⚠️ Could not extract component ID from {FileName}", e.Name);
                return;
            }

            // Read new file content
            var code = await ReadFileWithRetry(e.FullPath);

            // Send to ALL connected clients for hot reload
            await _hubContext.Clients.All.SendAsync("HotReload:FileChange", new
            {
                type = "file-change",
                componentId,
                filePath = e.Name,
                code,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });

            _logger.LogInformation("[Minimact HMR] ✅ Sent file change to clients: {ComponentId}", componentId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Minimact HMR] ❌ Error processing file change");
            await SendError(ex.Message);
        }
    }

    /// <summary>
    /// Handle file rename events
    /// </summary>
    private async void OnFileRenamed(object sender, RenamedEventArgs e)
    {
        _logger.LogInformation("[Minimact HMR] 📝 File renamed: {OldName} → {NewName}", e.OldName, e.Name);

        // Treat rename as a change to the new file
        OnFileChanged(sender, new FileSystemEventArgs(WatcherChangeTypes.Changed, Path.GetDirectoryName(e.FullPath)!, e.Name!));
    }

    /// <summary>
    /// Extract component ID from file path
    /// Example: "Components/Counter.cshtml" → "Counter"
    /// Example: "Pages/Index.cshtml" → "Index"
    /// </summary>
    private string? ExtractComponentId(string filePath)
    {
        try
        {
            var fileName = Path.GetFileNameWithoutExtension(filePath);

            // Remove common prefixes/suffixes
            fileName = fileName
                .Replace("Component", "")
                .Replace("Page", "")
                .Trim();

            return string.IsNullOrEmpty(fileName) ? null : fileName;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Read file with retry (files may be locked temporarily by editor)
    /// </summary>
    private async Task<string> ReadFileWithRetry(string filePath, int maxRetries = 3)
    {
        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                // Use FileShare.ReadWrite to allow reading while file is being written
                using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                using var reader = new StreamReader(stream);
                return await reader.ReadToEndAsync();
            }
            catch (IOException) when (i < maxRetries - 1)
            {
                // Wait and retry
                await Task.Delay(10);
            }
        }

        throw new IOException($"Could not read file after {maxRetries} attempts: {filePath}");
    }

    /// <summary>
    /// Send error message to all clients
    /// </summary>
    private async Task SendError(string error)
    {
        try
        {
            await _hubContext.Clients.All.SendAsync("HotReload:Error", new
            {
                type = "error",
                error,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Minimact HMR] Failed to send error to clients");
        }
    }

    public void Dispose()
    {
        if (_isDisposed) return;

        _watcher?.Dispose();
        _isDisposed = true;

        _logger.LogInformation("[Minimact HMR] File watcher disposed");
    }
}
