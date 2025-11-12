using Microsoft.EntityFrameworkCore;
using Mactic.Api.Data;
using Mactic.Api.Models.Community;
using Pgvector;
using Pgvector.EntityFrameworkCore;

namespace Mactic.Api.Services;

/// <summary>
/// Semantic search service using pgvector for similarity search
/// </summary>
public class SearchService
{
    private readonly MacticDbContext _db;
    private readonly EmbeddingService _embeddingService;
    private readonly ILogger<SearchService> _logger;

    public SearchService(
        MacticDbContext db,
        EmbeddingService embeddingService,
        ILogger<SearchService> logger)
    {
        _db = db;
        _embeddingService = embeddingService;
        _logger = logger;
    }

    /// <summary>
    /// Search projects using semantic similarity
    /// </summary>
    public async Task<List<ProjectSearchResult>> SearchProjectsAsync(
        string query,
        string? category = null,
        int limit = 20,
        double similarityThreshold = 0.7)
    {
        try
        {
            // Generate embedding for query
            var queryEmbedding = await _embeddingService.GenerateEmbeddingAsync(query);
            if (queryEmbedding == null)
            {
                _logger.LogWarning("Failed to generate query embedding");
                return new List<ProjectSearchResult>();
            }

            // Build base query
            var projectsQuery = _db.Projects
                .Include(p => p.Developer)
                .Where(p => p.IsLive);

            // Filter by category if provided
            if (!string.IsNullOrEmpty(category))
            {
                projectsQuery = projectsQuery.Where(p => p.Category == category);
            }

            // Use pgvector for cosine similarity search
            // Note: <=> is pgvector's cosine distance operator
            // Lower distance = higher similarity
            var queryVector = new Vector(queryEmbedding);

            var results = await projectsQuery
                .Where(p => p.Embedding != null)
                .Select(p => new
                {
                    Project = p,
                    // Calculate cosine distance using pgvector
                    Distance = p.Embedding!.CosineDistance(queryVector)
                })
                .Where(r => (1.0 - r.Distance) >= similarityThreshold) // Convert distance to similarity
                .OrderBy(r => r.Distance) // Lower distance = higher similarity
                .Take(limit)
                .ToListAsync();

            return results.Select(r => new ProjectSearchResult
            {
                Project = r.Project,
                Similarity = 1.0 - r.Distance, // Convert distance back to similarity
                Score = CalculateRankingScore(r.Project, 1.0 - r.Distance)
            })
            .OrderByDescending(r => r.Score)
            .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching projects");
            return new List<ProjectSearchResult>();
        }
    }

    /// <summary>
    /// Calculate ranking score combining similarity, freshness, and engagement
    /// </summary>
    private double CalculateRankingScore(Project project, double similarity)
    {
        // Similarity weight: 60%
        var similarityScore = similarity * 0.6;

        // Freshness weight: 20%
        var daysSinceUpdate = (DateTime.UtcNow - project.LastUpdatedAt).TotalDays;
        var freshnessScore = Math.Exp(-daysSinceUpdate / 30.0) * 0.2; // Exponential decay over 30 days

        // Engagement weight: 20%
        var engagementScore = Math.Log(1 + project.ViewCount + project.CloneCount * 10) / 10.0 * 0.2;

        return similarityScore + freshnessScore + engagementScore;
    }

    /// <summary>
    /// Get trending projects (high engagement in last 7 days)
    /// </summary>
    public async Task<List<Project>> GetTrendingProjectsAsync(int limit = 10)
    {
        var weekAgo = DateTime.UtcNow.AddDays(-7);

        return await _db.Projects
            .Include(p => p.Developer)
            .Where(p => p.IsLive && p.IsTrending)
            .OrderByDescending(p => p.ViewCount + p.CloneCount * 10)
            .Take(limit)
            .ToListAsync();
    }

    /// <summary>
    /// Get recently deployed projects
    /// </summary>
    public async Task<List<Project>> GetRecentProjectsAsync(int limit = 20)
    {
        return await _db.Projects
            .Include(p => p.Developer)
            .Where(p => p.IsLive)
            .OrderByDescending(p => p.LastDeployedAt)
            .Take(limit)
            .ToListAsync();
    }

    /// <summary>
    /// Get featured projects
    /// </summary>
    public async Task<List<Project>> GetFeaturedProjectsAsync()
    {
        return await _db.Projects
            .Include(p => p.Developer)
            .Where(p => p.IsLive && p.IsFeatured)
            .OrderByDescending(p => p.AverageRating)
            .ThenByDescending(p => p.ViewCount)
            .ToListAsync();
    }

    /// <summary>
    /// Get projects by category
    /// </summary>
    public async Task<List<Project>> GetProjectsByCategoryAsync(string category, int limit = 20)
    {
        return await _db.Projects
            .Include(p => p.Developer)
            .Where(p => p.IsLive && p.Category == category)
            .OrderByDescending(p => p.AverageRating)
            .ThenByDescending(p => p.ViewCount)
            .Take(limit)
            .ToListAsync();
    }
}

public class ProjectSearchResult
{
    public required Project Project { get; set; }
    public double Similarity { get; set; }
    public double Score { get; set; }
}
