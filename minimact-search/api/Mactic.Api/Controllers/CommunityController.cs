using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mactic.Api.Data;
using Mactic.Api.Models.Community;

namespace Mactic.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommunityController : ControllerBase
{
    private readonly MacticDbContext _db;
    private readonly ILogger<CommunityController> _logger;

    public CommunityController(MacticDbContext db, ILogger<CommunityController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Get developer profile by username
    /// </summary>
    [HttpGet("developers/{username}")]
    public async Task<ActionResult<DeveloperProfileDto>> GetDeveloper(string username)
    {
        try
        {
            var developer = await _db.Developers
                .Include(d => d.Projects)
                .Include(d => d.Badges)
                .FirstOrDefaultAsync(d => d.Username == username);

            if (developer == null)
            {
                return NotFound(new { error = "Developer not found" });
            }

            // Get connection counts
            var followerCount = await _db.DeveloperConnections
                .CountAsync(c => c.FollowingId == developer.Id);

            var followingCount = await _db.DeveloperConnections
                .CountAsync(c => c.FollowerId == developer.Id);

            // Get total usage count across all projects
            var totalUsageCount = await _db.ProjectUsages
                .Where(u => u.Project.DeveloperId == developer.Id && u.IsActivelyUsing)
                .CountAsync();

            return Ok(new DeveloperProfileDto
            {
                Id = developer.Id,
                Username = developer.Username,
                Email = developer.ShowEmailPublicly ? developer.Email : null,
                DisplayName = developer.DisplayName,
                Bio = developer.Bio,
                Location = developer.ShowLocationPublicly ? developer.Location : null,
                Website = developer.Website,
                GitHubUrl = developer.GitHubUrl,
                TwitterHandle = developer.TwitterHandle,

                Reputation = developer.Reputation,
                JoinedAt = developer.JoinedAt,
                LastActiveAt = developer.LastActiveAt,

                IsOpenToCollaboration = developer.IsOpenToCollaboration,
                IsOpenToConsulting = developer.IsOpenToConsulting,
                Skills = developer.Skills,

                FollowerCount = followerCount,
                FollowingCount = followingCount,
                TotalUsageCount = totalUsageCount,

                Projects = developer.Projects.Select(p => new ProjectSummaryDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    Url = p.Url,
                    Category = p.Category,
                    Tags = p.Tags,
                    ViewCount = p.ViewCount,
                    CloneCount = p.CloneCount,
                    AverageRating = p.AverageRating,
                    LastDeployedAt = p.LastDeployedAt,
                    IsTrending = p.IsTrending
                }).OrderByDescending(p => p.LastDeployedAt).ToList(),

                Badges = developer.Badges.Select(b => new BadgeDto
                {
                    Id = b.Id,
                    Name = b.Name,
                    Description = b.Description,
                    IconUrl = b.IconUrl
                }).ToList()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting developer profile");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Get project details
    /// </summary>
    [HttpGet("projects/{id}")]
    public async Task<ActionResult<ProjectDetailDto>> GetProject(Guid id)
    {
        try
        {
            var project = await _db.Projects
                .Include(p => p.Developer)
                .Include(p => p.Reviews)
                    .ThenInclude(r => r.Reviewer)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
            {
                return NotFound(new { error = "Project not found" });
            }

            // Get usage count
            var usageCount = await _db.ProjectUsages
                .CountAsync(u => u.ProjectId == id && u.IsActivelyUsing);

            // Get dependency count
            var dependencyCount = await _db.ProjectDependencies
                .CountAsync(d => d.DependencyProjectId == id);

            return Ok(new ProjectDetailDto
            {
                Id = project.Id,
                Name = project.Name,
                Description = project.Description,
                Url = project.Url,
                GitHubUrl = project.GitHubUrl,
                DocsUrl = project.DocsUrl,
                Category = project.Category,
                Tags = project.Tags,

                Developer = new DeveloperSummaryDto
                {
                    Id = project.Developer.Id,
                    Username = project.Developer.Username,
                    DisplayName = project.Developer.DisplayName,
                    Reputation = project.Developer.Reputation
                },

                ViewCount = project.ViewCount,
                CloneCount = project.CloneCount,
                ForkCount = project.ForkCount,
                AverageRating = project.AverageRating,
                ReviewCount = project.ReviewCount,
                UsageCount = usageCount,
                DependencyCount = dependencyCount,

                CreatedAt = project.CreatedAt,
                LastUpdatedAt = project.LastUpdatedAt,
                LastDeployedAt = project.LastDeployedAt,

                IsTrending = project.IsTrending,
                IsFeatured = project.IsFeatured,

                Reviews = project.Reviews
                    .OrderByDescending(r => r.CreatedAt)
                    .Take(10)
                    .Select(r => new ReviewDto
                    {
                        Id = r.Id,
                        Rating = r.Rating,
                        Comment = r.Comment,
                        CreatedAt = r.CreatedAt,
                        Reviewer = new DeveloperSummaryDto
                        {
                            Id = r.Reviewer.Id,
                            Username = r.Reviewer.Username,
                            DisplayName = r.Reviewer.DisplayName,
                            Reputation = r.Reviewer.Reputation
                        }
                    }).ToList()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting project details");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Get who's using this project
    /// </summary>
    [HttpGet("projects/{id}/usage")]
    public async Task<ActionResult<List<ProjectUsageDto>>> GetProjectUsage(Guid id)
    {
        try
        {
            var usages = await _db.ProjectUsages
                .Include(u => u.Developer)
                .Include(u => u.Project)
                .Where(u => u.ProjectId == id && u.IsActivelyUsing)
                .OrderByDescending(u => u.LastUsedAt)
                .Take(50)
                .ToListAsync();

            return Ok(usages.Select(u => new ProjectUsageDto
            {
                Developer = new DeveloperSummaryDto
                {
                    Id = u.Developer.Id,
                    Username = u.Developer.Username,
                    DisplayName = u.Developer.DisplayName,
                    Reputation = u.Developer.Reputation
                },
                FirstUsedAt = u.FirstUsedAt,
                LastUsedAt = u.LastUsedAt
            }).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting project usage");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Get recent activity feed
    /// </summary>
    [HttpGet("activity")]
    public async Task<ActionResult<List<ActivityEventDto>>> GetActivity([FromQuery] int limit = 50)
    {
        try
        {
            var events = await _db.ActivityEvents
                .Include(e => e.Developer)
                .Include(e => e.Project)
                    .ThenInclude(p => p!.Developer)
                .OrderByDescending(e => e.CreatedAt)
                .Take(limit)
                .ToListAsync();

            return Ok(events.Select(e => new ActivityEventDto
            {
                Id = e.Id,
                EventType = e.EventType,
                EventData = e.EventData,
                CreatedAt = e.CreatedAt,

                Developer = e.Developer != null ? new DeveloperSummaryDto
                {
                    Id = e.Developer.Id,
                    Username = e.Developer.Username,
                    DisplayName = e.Developer.DisplayName,
                    Reputation = e.Developer.Reputation
                } : null,

                Project = e.Project != null ? new ProjectSummaryDto
                {
                    Id = e.Project.Id,
                    Name = e.Project.Name,
                    Description = e.Project.Description,
                    Url = e.Project.Url,
                    Category = e.Project.Category,
                    Tags = e.Project.Tags,
                    ViewCount = e.Project.ViewCount,
                    CloneCount = e.Project.CloneCount,
                    AverageRating = e.Project.AverageRating,
                    LastDeployedAt = e.Project.LastDeployedAt,
                    IsTrending = e.Project.IsTrending
                } : null
            }).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting activity feed");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Get community stats
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult<CommunityStatsDto>> GetStats()
    {
        try
        {
            var totalDevelopers = await _db.Developers.CountAsync();
            var totalProjects = await _db.Projects.CountAsync();
            var liveProjects = await _db.Projects.CountAsync(p => p.IsLive);
            var totalReviews = await _db.Reviews.CountAsync();

            // Last 7 days stats
            var weekAgo = DateTime.UtcNow.AddDays(-7);
            var newDevelopersThisWeek = await _db.Developers.CountAsync(d => d.JoinedAt >= weekAgo);
            var newProjectsThisWeek = await _db.Projects.CountAsync(p => p.CreatedAt >= weekAgo);
            var deploymentsThisWeek = await _db.Projects.CountAsync(p => p.LastDeployedAt >= weekAgo);

            return Ok(new CommunityStatsDto
            {
                TotalDevelopers = totalDevelopers,
                TotalProjects = totalProjects,
                LiveProjects = liveProjects,
                TotalReviews = totalReviews,

                NewDevelopersThisWeek = newDevelopersThisWeek,
                NewProjectsThisWeek = newProjectsThisWeek,
                DeploymentsThisWeek = deploymentsThisWeek
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting community stats");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}

// DTOs
public class DeveloperProfileDto
{
    public Guid Id { get; set; }
    public required string Username { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string? Bio { get; set; }
    public string? Location { get; set; }
    public string? Website { get; set; }
    public string? GitHubUrl { get; set; }
    public string? TwitterHandle { get; set; }

    public int Reputation { get; set; }
    public DateTime JoinedAt { get; set; }
    public DateTime LastActiveAt { get; set; }

    public bool IsOpenToCollaboration { get; set; }
    public bool IsOpenToConsulting { get; set; }
    public string[]? Skills { get; set; }

    public int FollowerCount { get; set; }
    public int FollowingCount { get; set; }
    public int TotalUsageCount { get; set; }

    public required List<ProjectSummaryDto> Projects { get; set; }
    public required List<BadgeDto> Badges { get; set; }
}

public class ProjectSummaryDto
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public required string Url { get; set; }
    public required string Category { get; set; }
    public string[] Tags { get; set; } = Array.Empty<string>();
    public int ViewCount { get; set; }
    public int CloneCount { get; set; }
    public double AverageRating { get; set; }
    public DateTime LastDeployedAt { get; set; }
    public bool IsTrending { get; set; }
}

public class ProjectDetailDto
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public required string Url { get; set; }
    public string? GitHubUrl { get; set; }
    public string? DocsUrl { get; set; }
    public required string Category { get; set; }
    public string[] Tags { get; set; } = Array.Empty<string>();

    public required DeveloperSummaryDto Developer { get; set; }

    public int ViewCount { get; set; }
    public int CloneCount { get; set; }
    public int ForkCount { get; set; }
    public double AverageRating { get; set; }
    public int ReviewCount { get; set; }
    public int UsageCount { get; set; }
    public int DependencyCount { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime LastUpdatedAt { get; set; }
    public DateTime LastDeployedAt { get; set; }

    public bool IsTrending { get; set; }
    public bool IsFeatured { get; set; }

    public required List<ReviewDto> Reviews { get; set; }
}

public class ReviewDto
{
    public Guid Id { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
    public required DeveloperSummaryDto Reviewer { get; set; }
}

public class BadgeDto
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Description { get; set; }
    public required string IconUrl { get; set; }
}

public class ProjectUsageDto
{
    public required DeveloperSummaryDto Developer { get; set; }
    public DateTime FirstUsedAt { get; set; }
    public DateTime LastUsedAt { get; set; }
}

public class ActivityEventDto
{
    public Guid Id { get; set; }
    public required string EventType { get; set; }
    public string? EventData { get; set; }
    public DateTime CreatedAt { get; set; }
    public DeveloperSummaryDto? Developer { get; set; }
    public ProjectSummaryDto? Project { get; set; }
}

public class CommunityStatsDto
{
    public int TotalDevelopers { get; set; }
    public int TotalProjects { get; set; }
    public int LiveProjects { get; set; }
    public int TotalReviews { get; set; }

    public int NewDevelopersThisWeek { get; set; }
    public int NewProjectsThisWeek { get; set; }
    public int DeploymentsThisWeek { get; set; }
}
