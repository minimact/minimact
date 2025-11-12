namespace Mactic.Api.Models;

/// <summary>
/// Change event received from client tracker
/// </summary>
public record ChangeEvent
{
    // Content
    public string Url { get; init; } = string.Empty;
    public string Selector { get; init; } = string.Empty;
    public string Importance { get; init; } = "medium";
    public string Content { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public DateTime Timestamp { get; init; }

    // Category scoping (CRITICAL for Mactic)
    public string Category { get; init; } = string.Empty;
    public string[] Tags { get; init; } = Array.Empty<string>();
    public string? OntologyPath { get; init; }

    // Trust/quality
    public string TrustLevel { get; init; } = "unverified";

    // Source metadata
    public string Domain { get; init; } = string.Empty;
    public string Language { get; init; } = "en";

    // Change metadata
    public string ChangeType { get; init; } = "content";
    public string? OldHash { get; init; }
    public string NewHash { get; init; } = string.Empty;
}

/// <summary>
/// Response sent back to client after event processing
/// </summary>
public record ChangeEventResponse
{
    public bool Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public string? EventId { get; init; }
    public DateTime ProcessedAt { get; init; }
    public double ProcessingTimeMs { get; init; }
}
