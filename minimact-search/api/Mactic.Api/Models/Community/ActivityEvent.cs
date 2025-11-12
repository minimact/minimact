namespace Mactic.Api.Models.Community;

/// <summary>
/// Activity feed event - tracks all actions in the community
/// Powers the real-time "Community Pulse" dashboard
/// </summary>
public class ActivityEvent
{
    public Guid Id { get; set; }

    public Guid? DeveloperId { get; set; }
    public Developer? Developer { get; set; }

    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }

    // Event type: deployment, review, connection, badge_earned, etc.
    public string EventType { get; set; } = string.Empty;

    // Event data (JSON)
    public string? EventData { get; set; }

    public DateTime CreatedAt { get; set; }

    // For trending calculation
    public int EngagementScore { get; set; } // views, clicks, reactions
}
