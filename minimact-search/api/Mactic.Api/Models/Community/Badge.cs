namespace Mactic.Api.Models.Community;

/// <summary>
/// Achievement badges for developers
/// Examples: Early Adopter, Prolific Builder, Green Contributor, etc.
/// </summary>
public class Badge
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string IconUrl { get; set; } = string.Empty;

    // Requirements (for auto-awarding)
    public string? RequirementType { get; set; } // projects_count, users_count, etc.
    public int? RequirementThreshold { get; set; }

    // Many-to-many with developers
    public ICollection<DeveloperBadge> DeveloperBadges { get; set; } = new List<DeveloperBadge>();
}

/// <summary>
/// Junction table for developer badges
/// </summary>
public class DeveloperBadge
{
    public Guid DeveloperId { get; set; }
    public Developer Developer { get; set; } = null!;

    public Guid BadgeId { get; set; }
    public Badge Badge { get; set; } = null!;

    public DateTime AwardedAt { get; set; }
}
