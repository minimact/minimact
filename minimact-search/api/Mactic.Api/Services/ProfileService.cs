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
                Email = $"{username}@example.com", // TODO: Get real email
                JoinedAt = DateTime.UtcNow,
                Reputation = 0
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
        string name,
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
                Name = name,
                Description = description,
                Category = category ?? "uncategorized",
                Tags = tags,
                DeveloperId = developer.Id,
                CreatedAt = DateTime.UtcNow,
                LastUpdatedAt = DateTime.UtcNow,
                LastDeployedAt = DateTime.UtcNow,
                ViewCount = 0,
                CloneCount = 1,
                ForkCount = 0,
                AverageRating = 0,
                ReviewCount = 0,
                IsLive = true
            };

            _db.Projects.Add(project);

            _logger.LogInformation(
                "Created new project: {Name} by {Username}",
                name,
                developer.Username);
        }
        else
        {
            // Update existing project
            project.Name = name;
            project.Description = description ?? project.Description;
            project.Category = category ?? project.Category;
            project.Tags = tags.Length > 0 ? tags : project.Tags;
            project.LastDeployedAt = DateTime.UtcNow;
            project.LastUpdatedAt = DateTime.UtcNow;

            _logger.LogInformation(
                "Updated project: {Name}",
                name);
        }

        await _db.SaveChangesAsync();

        return project;
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
            .Where(u => projects.Select(p => p.Id).Contains(u.ProjectId))
            .CountAsync();

        // Reputation formula
        var reputation = 0;
        reputation += projects.Count * 10; // 10 points per project
        reputation += projects.Sum(p => p.CloneCount) * 2; // 2 points per clone
        reputation += projects.Sum(p => p.ViewCount) / 10; // 1 point per 10 views
        reputation += reviews.Count * 3; // 3 points per review
        reputation += (int)(reviews.Average(r => (double?)r.Rating) ?? 0 * 20); // 20 points per avg rating point
        reputation += usageCount * 8; // 8 points per usage

        developer.Reputation = reputation;

        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Updated reputation for {Username}: {Reputation}",
            developer.Username,
            reputation);
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
