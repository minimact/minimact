namespace Mactic.Api.Models.Community;

/// <summary>
/// Review/Rating for a project
/// </summary>
public class Review
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid ReviewerId { get; set; }
    public Developer Reviewer { get; set; } = null!;

    public int Rating { get; set; } // 1-5 stars
    public string? Comment { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Helpfulness (voted by community)
    public int HelpfulCount { get; set; }
}
