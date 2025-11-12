using Mactic.Api.Models;
using System.Diagnostics;

namespace Mactic.Api.Services;

/// <summary>
/// Processes change events from tracker
/// For MVP: Logs events and tracks stats
/// Future: Will integrate with embeddings, vector DB, SignalR broadcast
/// </summary>
public class EventProcessor : IEventProcessor
{
    private readonly ILogger<EventProcessor> _logger;
    private static int _documentsIndexed = 0;
    private static int _eventsProcessedToday = 0;
    private static List<double> _latencies = new();
    private static readonly object _statsLock = new();

    public EventProcessor(ILogger<EventProcessor> logger)
    {
        _logger = logger;
    }

    public async Task ProcessEventAsync(ChangeEvent changeEvent, string eventId)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            _logger.LogInformation(
                "🔄 Processing event {EventId}: {Url}",
                eventId,
                changeEvent.Url
            );

            // TODO: Phase 2 - Generate embeddings
            // var embedding = await _embeddingService.GenerateEmbedding(changeEvent.Content);

            // TODO: Phase 3 - Store in vector database
            // await _vectorSearch.UpsertDocument(document);

            // TODO: Phase 4 - Broadcast via SignalR
            // await _searchHub.Clients.All.SendAsync("DocumentUpdated", result);

            // For now: Just log and simulate processing
            await Task.Delay(100); // Simulate some processing time

            stopwatch.Stop();
            var latency = stopwatch.Elapsed.TotalSeconds;

            // Update stats
            lock (_statsLock)
            {
                _documentsIndexed++;
                _eventsProcessedToday++;
                _latencies.Add(latency);

                // Keep only last 1000 latencies for avg calculation
                if (_latencies.Count > 1000)
                {
                    _latencies.RemoveAt(0);
                }
            }

            _logger.LogInformation(
                "✅ Event processed {EventId}: {Url} | {Latency}s | Total indexed: {Count}",
                eventId,
                changeEvent.Url,
                latency.ToString("F2"),
                _documentsIndexed
            );

            // Log interesting details
            _logger.LogInformation(
                "📊 Details: Category={Category} | Tags=[{Tags}] | Importance={Importance} | ContentLength={Length}",
                changeEvent.Category,
                string.Join(", ", changeEvent.Tags),
                changeEvent.Importance,
                changeEvent.Content.Length
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "❌ Failed to process event {EventId}: {Url}",
                eventId,
                changeEvent.Url
            );
            throw;
        }
    }

    public Task<EventStats> GetStatsAsync()
    {
        lock (_statsLock)
        {
            var avgLatency = _latencies.Count > 0
                ? _latencies.Average()
                : 0;

            // Calculate carbon saved
            // Assumption: Traditional crawler uses ~0.5kg CO2 per 1000 pages
            // Event-driven uses ~0.005kg (99% reduction)
            // Savings = documents * (0.5 - 0.005) / 1000
            var carbonSaved = _documentsIndexed * 0.000495;

            var stats = new EventStats
            {
                DocumentsIndexed = _documentsIndexed,
                CarbonSavedKg = carbonSaved,
                AvgLatencySeconds = avgLatency,
                EventsProcessedToday = _eventsProcessedToday,
                EventsQueuedNow = 0 // Will be real queue size in production
            };

            return Task.FromResult(stats);
        }
    }
}
