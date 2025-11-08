using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Minimact.AspNetCore.HotReload;

namespace Minimact.AspNetCore.Services;

/// <summary>
/// Hosted service that eagerly instantiates hot reload services on startup
/// This ensures FileSystemWatchers are active immediately
/// </summary>
public class HotReloadInitializationService : IHostedService
{
    private readonly HotReloadFileWatcher _fileWatcher;
    private readonly TemplateHotReloadManager _templateManager;
    private readonly StructuralChangeManager _structuralManager;
    private readonly ILogger<HotReloadInitializationService> _logger;

    public HotReloadInitializationService(
        HotReloadFileWatcher fileWatcher,
        TemplateHotReloadManager templateManager,
        StructuralChangeManager structuralManager,
        ILogger<HotReloadInitializationService> logger)
    {
        _fileWatcher = fileWatcher;
        _templateManager = templateManager;
        _structuralManager = structuralManager;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("[Minimact] Hot reload services initialized and watching for changes");
        _logger.LogInformation("[Minimact] ✅ Structural change instance replacement enabled");
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
