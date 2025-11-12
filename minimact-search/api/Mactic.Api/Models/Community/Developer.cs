namespace Mactic.Api.Models.Community;

/// <summary>
/// Developer profile - auto-generated from deployments and activity
/// </summary>
public class Developer
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? Bio { get; set; }
    public string? Location { get; set; }
    public string? Website { get; set; }
    public string? GitHubUrl { get; set; }
    public string? TwitterHandle { get; set; }

    // Reputation & Stats
    public int Reputation { get; set; }
    public DateTime JoinedAt { get; set; }
    public DateTime LastActiveAt { get; set; }

    // Preferences
    public bool IsOpenToCollaboration { get; set; }
    public bool IsOpenToConsulting { get; set; }
    public string[]? Skills { get; set; }

    // Privacy
    public bool ShowLocationPublicly { get; set; } = true;
    public bool ShowEmailPublicly { get; set; } = false;

    // Navigation properties
    public ICollection<Project> Projects { get; set; } = new List<Project>();
    public ICollection<Review> ReviewsGiven { get; set; } = new List<Review>();
    public ICollection<Review> ReviewsReceived { get; set; } = new List<Review>();
    public ICollection<DeveloperConnection> Connections { get; set; } = new List<DeveloperConnection>();
    public ICollection<Badge> Badges { get; set; } = new List<Badge>();
}
