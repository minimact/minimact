using Mactic.Api.Models;

namespace Mactic.Api.Services;

public interface IEventProcessor
{
    Task ProcessEventAsync(ChangeEvent changeEvent, string eventId);
    Task<EventStats> GetStatsAsync();
}

public record EventStats
{
    public int DocumentsIndexed { get; init; }
    public double CarbonSavedKg { get; init; }
    public double AvgLatencySeconds { get; init; }
    public int EventsProcessedToday { get; init; }
    public int EventsQueuedNow { get; init; }
}
