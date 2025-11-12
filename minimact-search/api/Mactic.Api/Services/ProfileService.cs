using Microsoft.EntityFrameworkCore;
using Mactic.Api.Data;
using Mactic.Api.Models.Community;

namespace Mactic.Api.Services;

/// <summary>
/// Auto-generates and updates developer profiles from change events
/// This creates the "living profile" experience
/// </summary>
public class ProfileService
{
    private readonly MacticDbContext _db;
    private readonly ILogger<ProfileService> _logger;

    public ProfileService(MacticDbContext db, ILogger<ProfileService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Create or update developer profile when they deploy/update a project
    /// Called automatically by EventController on every change event
    /// </summary>
    public async Task<Developer> EnsureDeveloperProfile(string url, string apiKey)
    {
        // Extract developer identity from URL or API key
        var username = ExtractUsername(url, apiKey);

        // Find or create developer
        var developer = await _db.Developers
            .FirstOrDefaultAsync(d => d.Username == username);

        if (developer == null)
        {
            developer = new Developer
            {
                Id = Guid.NewGuid(),
                Username = username,
                DisplayName = username,
                CreatedAt = DateTime.UtcNow,
                Reputation = 0,
                ProjectCount = 0,
                TotalSearches = 0,
                TotalInstalls = 0
            };

            _db.Developers.Add(developer);
            _logger.LogInformation("Created new developer profile: {Username}", username);
        }

        developer.LastActiveAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return developer;
    }

    /// <summary>
    /// Create or update project when change event received
    /// </summary>
    public async Task<Project> EnsureProject(
        string url,
        string title,
        string? description,
        string? category,
        string[] tags,
        Developer developer)
    {
        // Find or create project
        var project = await _db.Projects
            .FirstOrDefaultAsync(p => p.Url == url);

        if (project == null)
        {
            project = new Project
            {
                Id = Guid.NewGuid(),
                Url = url,
                Title = title,
                Description = description,
                Category = category ?? "uncategorized",
                Tags = tags,
                DeveloperId = developer.Id,
                CreatedAt = DateTime.UtcNow,
                DeployCount = 1,
                ViewCount = 0,
                SearchCount = 0,
                StarCount = 0,
                ForkCount = 0,
                Rating = 0
            };

            _db.Projects.Add(project);
            developer.ProjectCount++;

            _logger.LogInformation(
                "Created new project: {Title} by {Username}",
                title,
                developer.Username);
        }
        else
        {
            // Update existing project
            project.Title = title;
            project.Description = description ?? project.Description;
            project.Category = category ?? project.Category;
            project.Tags = tags.Length > 0 ? tags : project.Tags;
            project.DeployCount++;
            project.LastDeployedAt = DateTime.UtcNow;

            _logger.LogInformation(
                "Updated project: {Title} (deploy #{Count})",
                title,
                project.DeployCount);
        }

        project.LastUpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return project;
    }

    /// <summary>
    /// Record activity in the community feed
    /// </summary>
    public async Task RecordActivity(
        ActivityType type,
        Developer developer,
        Project project,
        string details)
    {
        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            Type = type,
            DeveloperId = developer.Id,
            ProjectId = project.Id,
            Details = details,
            CreatedAt = DateTime.UtcNow
        };

        _db.Activities.Add(activity);
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Recorded activity: {Type} by {Username} on {Project}",
            type,
            developer.Username,
            project.Title);
    }

    /// <summary>
    /// Update developer reputation based on activity
    /// </summary>
    public async Task UpdateReputation(Developer developer)
    {
        // Calculate reputation from various factors
        var projects = await _db.Projects
            .Where(p => p.DeveloperId == developer.Id)
            .ToListAsync();

        var reviews = await _db.Reviews
            .Where(r => projects.Select(p => p.Id).Contains(r.ProjectId))
            .ToListAsync();

        var usageCount = await _db.ProjectUsages
            .Where(u => projects.Select(p => p.Id).Contains(u.UsedProjectId))
            .CountAsync();

        // Reputation formula
        var reputation = 0;
        reputation += projects.Count * 10; // 10 points per project
        reputation += projects.Sum(p => p.DeployCount) * 2; // 2 points per deployment
        reputation += projects.Sum(p => p.StarCount) * 5; // 5 points per star
        reputation += reviews.Count * 3; // 3 points per review
        reputation += (int)(reviews.Average(r => (double?)r.Rating) ?? 0 * 20); // 20 points per avg rating point
        reputation += usageCount * 8; // 8 points per usage

        developer.Reputation = reputation;
        developer.TotalSearches = projects.Sum(p => p.SearchCount);
        developer.TotalInstalls = usageCount;

        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Updated reputation for {Username}: {Reputation}",
            developer.Username,
            reputation);
    }

    /// <summary>
    /// Track when someone uses a project (dependency)
    /// </summary>
    public async Task RecordUsage(Guid userId, Guid usedProjectId, Guid? userProjectId = null)
    {
        // Check if usage already exists
        var existing = await _db.ProjectUsages
            .FirstOrDefaultAsync(u =>
                u.UserId == userId &&
                u.UsedProjectId == usedProjectId &&
                u.UserProjectId == userProjectId);

        if (existing == null)
        {
            var usage = new ProjectUsage
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                UsedProjectId = usedProjectId,
                UserProjectId = userProjectId,
                CreatedAt = DateTime.UtcNow
            };

            _db.ProjectUsages.Add(usage);
            await _db.SaveChangesAsync();

            // Update reputation of the creator
            var project = await _db.Projects
                .Include(p => p.Developer)
                .FirstOrDefaultAsync(p => p.Id == usedProjectId);

            if (project?.Developer != null)
            {
                await UpdateReputation(project.Developer);
            }

            _logger.LogInformation(
                "Recorded usage: User {UserId} using project {ProjectId}",
                userId,
                usedProjectId);
        }
    }

    /// <summary>
    /// Extract username from URL or API key
    /// In production, this would parse subdomain or use API key → user mapping
    /// </summary>
    private string ExtractUsername(string url, string apiKey)
    {
        // Try to extract from subdomain: https://username.minimact.app
        try
        {
            var uri = new Uri(url);
            var host = uri.Host;

            if (host.Contains(".minimact.app"))
            {
                return host.Split('.')[0];
            }
        }
        catch
        {
            // Fall through to API key extraction
        }

        // Otherwise use API key hash as username
        // In production, you'd have a proper user registry
        return $"user_{apiKey.GetHashCode():X8}";
    }
}

/// <summary>
/// Activity types for the community feed
/// </summary>
public enum ActivityType
{
    ProjectCreated,
    ProjectUpdated,
    ProjectDeployed,
    ProjectStarred,
    ProjectForked,
    ReviewPosted,
    DependencyAdded
}
