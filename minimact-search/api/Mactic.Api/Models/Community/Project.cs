using Pgvector;

namespace Mactic.Api.Models.Community;

/// <summary>
/// Project/Application - a living, deployed Minimact app
/// </summary>
public class Project
{
    public Guid Id { get; set; }
    public Guid DeveloperId { get; set; }
    public Developer Developer { get; set; } = null!;

    // Basic Info
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? GitHubUrl { get; set; }
    public string? DocsUrl { get; set; }

    // Categorization
    public string Category { get; set; } = string.Empty; // technology, health, education, etc.
    public string[] Tags { get; set; } = Array.Empty<string>();

    // Content & Search
    public string? ContentSnapshot { get; set; } // Latest content
    public Vector? Embedding { get; set; } // Vector embedding for semantic search (1536 dimensions)
    public string? SemanticallyRelatedTopics { get; set; } // AI-extracted topics

    // Timestamps
    public DateTime CreatedAt { get; set; }
    public DateTime LastUpdatedAt { get; set; }
    public DateTime LastDeployedAt { get; set; }

    // Stats (auto-calculated)
    public int ViewCount { get; set; }
    public int CloneCount { get; set; }
    public int ForkCount { get; set; }
    public double AverageRating { get; set; }
    public int ReviewCount { get; set; }

    // Status
    public bool IsLive { get; set; } = true;
    public bool IsFeatured { get; set; }
    public bool IsTrending { get; set; }

    // Navigation properties
    public ICollection<ProjectDependency> Dependencies { get; set; } = new List<ProjectDependency>();
    public ICollection<ProjectDependency> DependentProjects { get; set; } = new List<ProjectDependency>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<ProjectUsage> Usages { get; set; } = new List<ProjectUsage>();
}
