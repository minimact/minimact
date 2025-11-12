namespace Mactic.Api.Models.Community;

/// <summary>
/// Tracks which developer is using which project
/// Powers "Who's using this?" and developer connections
/// </summary>
public class ProjectUsage
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid DeveloperId { get; set; }
    public Developer Developer { get; set; } = null!;

    public DateTime FirstUsedAt { get; set; }
    public DateTime LastUsedAt { get; set; }

    public bool IsActivelyUsing { get; set; } = true;
}
