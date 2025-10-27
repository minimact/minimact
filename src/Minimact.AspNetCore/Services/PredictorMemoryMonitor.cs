using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Minimact.AspNetCore.Core;

namespace Minimact.AspNetCore.Services;

/// <summary>
/// Background service that monitors Rust predictor memory usage
/// Logs warnings when approaching memory limits configured in PredictorConfig
/// </summary>
public class PredictorMemoryMonitor : BackgroundService
{
    private readonly ILogger<PredictorMemoryMonitor> _logger;
    private readonly RustBridge.Predictor _predictor;
    private const long DEFAULT_MAX_MEMORY_BYTES = 100 * 1024 * 1024; // 100 MB (matches Rust default)
    private const double WARNING_THRESHOLD = 0.8; // Warn at 80%
    private const double CRITICAL_THRESHOLD = 0.9; // Critical at 90%
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);

    public PredictorMemoryMonitor(ILogger<PredictorMemoryMonitor> logger, RustBridge.Predictor predictor)
    {
        _logger = logger;
        _predictor = predictor;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "[Predictor Monitor] Starting memory monitoring. Check interval: {Interval}, Warning threshold: {WarningPercent}%, Critical threshold: {CriticalPercent}%",
            _checkInterval,
            WARNING_THRESHOLD * 100,
            CRITICAL_THRESHOLD * 100
        );

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await MonitorMemoryUsageAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Predictor Monitor] Error monitoring predictor memory");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("[Predictor Monitor] Stopped");
    }

    private async Task MonitorMemoryUsageAsync()
    {
        PredictorStats stats;

        try
        {
            stats = _predictor.GetStats();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Predictor Monitor] Failed to get predictor stats");
            return;
        }

        var memoryBytes = stats.EstimatedMemoryBytes;
        var maxMemoryBytes = DEFAULT_MAX_MEMORY_BYTES;
        var usagePercent = (double)memoryBytes / maxMemoryBytes;

        // Log detailed stats periodically
        _logger.LogDebug(
            "[Predictor Monitor] Stats: Memory={MemoryMB:F2}MB/{MaxMemoryMB}MB ({Percent:F1}%), Patterns={Patterns}, Hit Rate={HitRate:F1}%",
            memoryBytes / (1024.0 * 1024.0),
            maxMemoryBytes / (1024 * 1024),
            usagePercent * 100,
            stats.TotalPatterns,
            stats.HitRate * 100
        );

        // Warning threshold (80%)
        if (usagePercent >= WARNING_THRESHOLD && usagePercent < CRITICAL_THRESHOLD)
        {
            _logger.LogWarning(
                "[Predictor Monitor] ⚠️ Memory usage at {Percent:F1}% ({MemoryMB:F2}MB / {MaxMemoryMB}MB). " +
                "Approaching limit. Patterns: {Patterns}, Hit Rate: {HitRate:F1}%",
                usagePercent * 100,
                memoryBytes / (1024.0 * 1024.0),
                maxMemoryBytes / (1024 * 1024),
                stats.TotalPatterns,
                stats.HitRate * 100
            );
        }
        // Critical threshold (90%)
        else if (usagePercent >= CRITICAL_THRESHOLD)
        {
            _logger.LogError(
                "[Predictor Monitor] 🔴 CRITICAL: Memory usage at {Percent:F1}% ({MemoryMB:F2}MB / {MaxMemoryMB}MB)! " +
                "Predictor may start evicting patterns. Patterns: {Patterns}, Hit Rate: {HitRate:F1}%",
                usagePercent * 100,
                memoryBytes / (1024.0 * 1024.0),
                maxMemoryBytes / (1024 * 1024),
                stats.TotalPatterns,
                stats.HitRate * 100
            );
        }

        // Also log if predictor stats show poor performance
        if (stats.TotalPredictions > 100 && stats.HitRate < 0.5)
        {
            _logger.LogWarning(
                "[Predictor Monitor] ⚠️ Low hit rate: {HitRate:F1}% ({Correct}/{Total} predictions). " +
                "Consider reviewing prediction patterns.",
                stats.HitRate * 100,
                stats.CorrectPredictions,
                stats.TotalPredictions
            );
        }

        await Task.CompletedTask;
    }
}
