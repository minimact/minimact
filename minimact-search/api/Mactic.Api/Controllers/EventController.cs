using Microsoft.AspNetCore.Mvc;
using Mactic.Api.Models;
using Mactic.Api.Services;
using System.Diagnostics;

namespace Mactic.Api.Controllers;

/// <summary>
/// Event ingestion endpoint for Mactic tracker
/// Receives change notifications from websites
/// </summary>
[ApiController]
[Route("api/[controller]s")]
public class EventController : ControllerBase
{
    private readonly IEventProcessor _eventProcessor;
    private readonly ILogger<EventController> _logger;

    public EventController(
        IEventProcessor eventProcessor,
        ILogger<EventController> logger)
    {
        _eventProcessor = eventProcessor;
        _logger = logger;
    }

    /// <summary>
    /// Receive a change event from a website
    /// POST /api/events
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> ReceiveEvent([FromBody] ChangeEvent changeEvent)
    {
        var stopwatch = Stopwatch.StartNew();

        // Validate API key
        var apiKey = Request.Headers["X-API-Key"].FirstOrDefault();
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("Event rejected: Missing API key from {Url}", changeEvent.Url);
            return Unauthorized(new ChangeEventResponse
            {
                Success = false,
                Message = "API key is required",
                ProcessedAt = DateTime.UtcNow,
                ProcessingTimeMs = stopwatch.Elapsed.TotalMilliseconds
            });
        }

        // Validate API key (for now, just check it starts with demo- or is valid format)
        if (!await ValidateApiKey(apiKey))
        {
            _logger.LogWarning(
                "Event rejected: Invalid API key {ApiKey} from {Url}",
                apiKey,
                changeEvent.Url
            );
            return Unauthorized(new ChangeEventResponse
            {
                Success = false,
                Message = "Invalid API key",
                ProcessedAt = DateTime.UtcNow,
                ProcessingTimeMs = stopwatch.Elapsed.TotalMilliseconds
            });
        }

        // Validate event
        var validationResult = ValidateEvent(changeEvent);
        if (!validationResult.IsValid)
        {
            _logger.LogWarning(
                "Event rejected: Validation failed for {Url} - {Reason}",
                changeEvent.Url,
                validationResult.Error
            );
            return BadRequest(new ChangeEventResponse
            {
                Success = false,
                Message = validationResult.Error!,
                ProcessedAt = DateTime.UtcNow,
                ProcessingTimeMs = stopwatch.Elapsed.TotalMilliseconds
            });
        }

        _logger.LogInformation(
            "📦 Event received: {Url} | Category: {Category} | Tags: {Tags} | Importance: {Importance}",
            changeEvent.Url,
            changeEvent.Category,
            string.Join(", ", changeEvent.Tags),
            changeEvent.Importance
        );

        // Process event asynchronously
        var eventId = Guid.NewGuid().ToString();
        _ = _eventProcessor.ProcessEventAsync(changeEvent, eventId); // Fire and forget

        stopwatch.Stop();

        _logger.LogInformation(
            "✅ Event queued: {EventId} | {Url} | {ProcessingTimeMs}ms",
            eventId,
            changeEvent.Url,
            stopwatch.Elapsed.TotalMilliseconds
        );

        return Ok(new ChangeEventResponse
        {
            Success = true,
            Message = "Event received and queued for processing",
            EventId = eventId,
            ProcessedAt = DateTime.UtcNow,
            ProcessingTimeMs = stopwatch.Elapsed.TotalMilliseconds
        });
    }

    /// <summary>
    /// Health check endpoint
    /// GET /api/events/health
    /// </summary>
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new
        {
            status = "healthy",
            service = "mactic-event-ingestion",
            timestamp = DateTime.UtcNow,
            version = "0.1.0"
        });
    }

    /// <summary>
    /// Get API stats
    /// GET /api/events/stats
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> Stats()
    {
        var stats = await _eventProcessor.GetStatsAsync();
        return Ok(stats);
    }

    private async Task<bool> ValidateApiKey(string apiKey)
    {
        // For MVP: Allow demo keys and validate format
        // TODO: Check against database of registered API keys
        if (apiKey.StartsWith("demo-key-", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // TODO: Real validation against database
        // For now, accept any key that looks valid (alphanumeric, length > 10)
        return apiKey.Length > 10 && apiKey.All(c => char.IsLetterOrDigit(c) || c == '-');
    }

    private (bool IsValid, string? Error) ValidateEvent(ChangeEvent changeEvent)
    {
        // Required fields
        if (string.IsNullOrWhiteSpace(changeEvent.Url))
        {
            return (false, "URL is required");
        }

        if (string.IsNullOrWhiteSpace(changeEvent.Category))
        {
            return (false, "Category is required");
        }

        if (string.IsNullOrWhiteSpace(changeEvent.Content))
        {
            return (false, "Content is required");
        }

        // Validate category
        var validCategories = new[]
        {
            "technology", "science", "business", "health",
            "finance", "education", "entertainment", "news"
        };

        if (!validCategories.Contains(changeEvent.Category.ToLower()))
        {
            return (false, $"Invalid category: {changeEvent.Category}. Valid categories: {string.Join(", ", validCategories)}");
        }

        // Validate URL format
        if (!Uri.TryCreate(changeEvent.Url, UriKind.Absolute, out var uri))
        {
            return (false, "Invalid URL format");
        }

        // Content length limits
        if (changeEvent.Content.Length > 100_000) // 100KB text limit
        {
            return (false, "Content too large (max 100KB)");
        }

        return (true, null);
    }
}
