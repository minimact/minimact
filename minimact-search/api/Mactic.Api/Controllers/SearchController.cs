using Microsoft.AspNetCore.Mvc;
using Mactic.Api.Services;
using Mactic.Api.Models.Community;

namespace Mactic.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SearchController : ControllerBase
{
    private readonly SearchService _searchService;
    private readonly ILogger<SearchController> _logger;

    public SearchController(SearchService searchService, ILogger<SearchController> logger)
    {
        _searchService = searchService;
        _logger = logger;
    }

    /// <summary>
    /// Semantic search for projects
    /// </summary>
    /// <param name="query">Search query</param>
    /// <param name="category">Optional category filter</param>
    /// <param name="limit">Max results (default 20)</param>
    /// <returns>List of matching projects with similarity scores</returns>
    [HttpGet]
    public async Task<ActionResult<SearchResponse>> Search(
        [FromQuery] string query,
        [FromQuery] string? category = null,
        [FromQuery] int limit = 20)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest(new { error = "Query parameter is required" });
            }

            if (limit < 1 || limit > 100)
            {
                return BadRequest(new { error = "Limit must be between 1 and 100" });
            }

            var startTime = DateTime.UtcNow;

            var results = await _searchService.SearchProjectsAsync(query, category, limit);

            var duration = (DateTime.UtcNow - startTime).TotalMilliseconds;

            _logger.LogInformation(
                "Search completed: query='{Query}' category={Category} results={Count} duration={Duration}ms",
                query, category ?? "all", results.Count, duration
            );

            return Ok(new SearchResponse
            {
                Query = query,
                Category = category,
                Results = results.Select(r => new SearchResultDto
                {
                    Id = r.Project.Id,
                    Name = r.Project.Name,
                    Description = r.Project.Description,
                    Url = r.Project.Url,
                    Category = r.Project.Category,
                    Tags = r.Project.Tags,

                    // Developer info
                    Developer = new DeveloperSummaryDto
                    {
                        Id = r.Project.Developer.Id,
                        Username = r.Project.Developer.Username,
                        DisplayName = r.Project.Developer.DisplayName,
                        Reputation = r.Project.Developer.Reputation
                    },

                    // Stats
                    ViewCount = r.Project.ViewCount,
                    CloneCount = r.Project.CloneCount,
                    AverageRating = r.Project.AverageRating,
                    ReviewCount = r.Project.ReviewCount,

                    // Timestamps
                    CreatedAt = r.Project.CreatedAt,
                    LastUpdatedAt = r.Project.LastUpdatedAt,
                    LastDeployedAt = r.Project.LastDeployedAt,

                    // Search relevance
                    Similarity = r.Similarity,
                    Score = r.Score,

                    // Flags
                    IsTrending = r.Project.IsTrending,
                    IsFeatured = r.Project.IsFeatured
                }).ToList(),
                TotalResults = results.Count,
                DurationMs = duration
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing search request");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Get trending projects
    /// </summary>
    [HttpGet("trending")]
    public async Task<ActionResult<List<ProjectDto>>> GetTrending([FromQuery] int limit = 10)
    {
        try
        {
            var projects = await _searchService.GetTrendingProjectsAsync(limit);

            return Ok(projects.Select(p => MapToProjectDto(p)).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting trending projects");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Get recently deployed projects
    /// </summary>
    [HttpGet("recent")]
    public async Task<ActionResult<List<ProjectDto>>> GetRecent([FromQuery] int limit = 20)
    {
        try
        {
            var projects = await _searchService.GetRecentProjectsAsync(limit);

            return Ok(projects.Select(p => MapToProjectDto(p)).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recent projects");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Get featured projects
    /// </summary>
    [HttpGet("featured")]
    public async Task<ActionResult<List<ProjectDto>>> GetFeatured()
    {
        try
        {
            var projects = await _searchService.GetFeaturedProjectsAsync();

            return Ok(projects.Select(p => MapToProjectDto(p)).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting featured projects");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Get projects by category
    /// </summary>
    [HttpGet("category/{category}")]
    public async Task<ActionResult<List<ProjectDto>>> GetByCategory(
        string category,
        [FromQuery] int limit = 20)
    {
        try
        {
            var projects = await _searchService.GetProjectsByCategoryAsync(category, limit);

            return Ok(projects.Select(p => MapToProjectDto(p)).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting projects by category");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    private ProjectDto MapToProjectDto(Project project)
    {
        return new ProjectDto
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

            CreatedAt = project.CreatedAt,
            LastUpdatedAt = project.LastUpdatedAt,
            LastDeployedAt = project.LastDeployedAt,

            IsTrending = project.IsTrending,
            IsFeatured = project.IsFeatured
        };
    }
}

// DTOs
public class SearchResponse
{
    public required string Query { get; set; }
    public string? Category { get; set; }
    public required List<SearchResultDto> Results { get; set; }
    public int TotalResults { get; set; }
    public double DurationMs { get; set; }
}

public class SearchResultDto
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public required string Url { get; set; }
    public required string Category { get; set; }
    public string[] Tags { get; set; } = Array.Empty<string>();

    public required DeveloperSummaryDto Developer { get; set; }

    public int ViewCount { get; set; }
    public int CloneCount { get; set; }
    public double AverageRating { get; set; }
    public int ReviewCount { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime LastUpdatedAt { get; set; }
    public DateTime LastDeployedAt { get; set; }

    public double Similarity { get; set; }
    public double Score { get; set; }

    public bool IsTrending { get; set; }
    public bool IsFeatured { get; set; }
}

public class ProjectDto
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

    public DateTime CreatedAt { get; set; }
    public DateTime LastUpdatedAt { get; set; }
    public DateTime LastDeployedAt { get; set; }

    public bool IsTrending { get; set; }
    public bool IsFeatured { get; set; }
}

public class DeveloperSummaryDto
{
    public Guid Id { get; set; }
    public required string Username { get; set; }
    public string? DisplayName { get; set; }
    public int Reputation { get; set; }
}
