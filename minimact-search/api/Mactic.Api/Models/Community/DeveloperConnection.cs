namespace Mactic.Api.Models.Community;

/// <summary>
/// Connection between two developers (follow relationship)
/// </summary>
public class DeveloperConnection
{
    public Guid Id { get; set; }

    public Guid FollowerId { get; set; }
    public Developer Follower { get; set; } = null!;

    public Guid FollowingId { get; set; }
    public Developer Following { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
}
