namespace Mactic.Api.Models.Community;

/// <summary>
/// Tracks which projects use which other projects
/// Creates the dependency graph for "Who's using this?"
/// </summary>
public class ProjectDependency
{
    public Guid Id { get; set; }

    // The project that depends on another
    public Guid DependentProjectId { get; set; }
    public Project DependentProject { get; set; } = null!;

    // The project being depended on
    public Guid DependencyProjectId { get; set; }
    public Project DependencyProject { get; set; } = null!;

    // Metadata
    public DateTime DetectedAt { get; set; }
    public string DependencyType { get; set; } = string.Empty; // npm, nuget, direct, etc.
}
