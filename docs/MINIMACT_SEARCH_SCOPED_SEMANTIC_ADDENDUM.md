# Minimact Search: Scoped Semantic Search Addendum

**Status:** Enhancement to Core Implementation Plan
**Date:** 2025-01-12
**Priority:** High - Fundamental to product differentiation

---

## Executive Summary

This addendum introduces **category-scoped semantic search** to Minimact Search, solving one of traditional search's most painful problems: **keyword ambiguity and irrelevant results**.

### The Problem

Traditional keyword-based search fails when terms have multiple meanings across domains:

```
Query: "new frameworks"

Google Results (broken):
❌ Framework for agricultural policy (government)
❌ Legal framework for contracts (law)
❌ Framework agreements (construction)
❌ Picture frame works (crafts)
✅ Web frameworks (buried on page 3-4)
```

### The Solution

**Category-scoped + embedding-based search** that understands:
1. **What domain you're searching** (technology, science, business, etc.)
2. **What you mean semantically** (not just keyword matching)
3. **What's fresh** (hours/days, not weeks)
4. **What's trustworthy** (publisher reputation)

```
Query: "new frameworks" in category:technology

Minimact Search Results (perfect):
✅ Svelte 5 Runes Release (updated 10s ago)
✅ Qwik 1.5 Performance Update (updated 2m ago)
✅ Fresh 2.0 with Islands (updated 1h ago)
✅ HTMX 2.0 Beta Announcement (updated 3h ago)

Zero noise. Pure signal. 🎯
```

---

## Core Innovation: The Three Pillars

### 1. Category Declaration (Publisher-Side)
Publishers declare their content category when initializing the tracker:

```typescript
// Example: Tech blog
MinimactSearch.init({
  apiKey: 'your-api-key',
  category: 'technology',           // Primary category
  tags: ['web-dev', 'frameworks'],  // Optional tags for finer granularity
  trustLevel: 'verified',           // Trust tier (future)
  watchZones: [
    { selector: 'article', importance: 'high' }
  ]
});
```

**Category Taxonomy (MVP):**
- `technology` (web dev, programming, DevOps, etc.)
- `science` (research, papers, discoveries)
- `business` (markets, companies, strategy)
- `health` (medicine, fitness, wellness)
- `finance` (investing, crypto, economics)
- `education` (courses, tutorials, learning)
- `entertainment` (media, gaming, culture)
- `news` (current events, journalism)

**Future:** Hierarchical ontology with subdomains (e.g., `technology.web-dev.frameworks`)

---

### 2. Semantic Understanding (Embedding-Based)
Instead of matching keywords, we match **semantic meaning**:

```typescript
// Traditional keyword search (broken)
"frameworks" → matches ANY text containing "frameworks"
Result: noise from 47 different domains

// Minimact semantic search (intelligent)
"frameworks" → embedding: [0.234, -0.891, 0.445, ...]
Matches semantically similar content:
  - "libraries"
  - "tools"
  - "platforms"
  - "architectures"

Within category:technology scope only
Result: 100% relevant web framework content
```

**Semantic Query Examples:**
- `"frameworks like Svelte but faster"` → understands comparison intent
- `"libraries that replaced Redux"` → understands evolution/replacement
- `"alternatives to Laravel built in Go"` → understands cross-language alternatives

---

### 3. Scoped Routing (Query-Side)
Users can scope their searches by category, tags, freshness, and trust:

```typescript
interface ScopedSearchQuery {
  query: string;

  // Scope filters
  category?: string | string[];        // Single or multiple categories
  tags?: string[];                     // Fine-grained topic filters

  // Freshness filters
  freshness?: 'all' | '1h' | '24h' | '7d' | '30d';
  minFreshnessScore?: number;          // 0.0 - 1.0

  // Trust filters
  minTrustScore?: number;              // 0.0 - 1.0 (future)

  // Semantic options
  semanticThreshold?: number;          // Minimum similarity (0.0 - 1.0)

  // Pagination
  limit?: number;
  offset?: number;
}
```

**Example Queries:**

```typescript
// Developer searching for new frameworks
{
  query: "new web frameworks",
  category: "technology",
  tags: ["web-dev", "javascript"],
  freshness: "7d",
  semanticThreshold: 0.6
}

// Researcher looking for recent studies
{
  query: "machine learning interpretability",
  category: "science",
  tags: ["ai", "research"],
  freshness: "30d",
  minTrustScore: 0.8
}

// Cross-category philosophical search
{
  query: "AI ethics frameworks",
  category: ["technology", "science", "philosophy"],
  freshness: "all"
}
```

---

## Technical Implementation

### Database Schema Updates

```sql
-- Enhanced documents table with category scoping
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,

    -- ✨ NEW: Category scoping
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',

    -- ✨ NEW: Ontology path (future)
    ontology_path TEXT,  -- e.g., "technology.web-dev.frameworks"

    -- Semantic search
    embedding vector(1536),  -- OpenAI ada-002 dimensions

    -- Trust & quality (future)
    trust_score FLOAT DEFAULT 0.5,
    quality_score FLOAT DEFAULT 0.5,
    authority_score FLOAT DEFAULT 0.5,

    -- Freshness & importance
    importance TEXT DEFAULT 'medium',
    last_updated TIMESTAMPTZ NOT NULL,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    freshness_score FLOAT DEFAULT 1.0,

    -- Metadata
    source_domain TEXT,
    publisher_id TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_count INT DEFAULT 0
);

-- ✨ CRITICAL: Category + vector similarity index
CREATE INDEX idx_documents_category_embedding
  ON documents (category, (embedding <=> '[0,0,0,...]'::vector));

-- Tag search (GIN index for array containment)
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);

-- Category + freshness composite index
CREATE INDEX idx_documents_category_freshness
  ON documents(category, freshness_score DESC, indexed_at DESC);

-- Ontology path prefix search (future)
CREATE INDEX idx_documents_ontology_path
  ON documents(ontology_path text_pattern_ops);

-- URL index for updates
CREATE INDEX idx_documents_url ON documents(url);
```

---

### Tracker.js Updates

```typescript
// minimact-search/tracker/src/tracker.ts

export interface TrackerConfig {
  apiKey: string;
  apiEndpoint?: string;

  // ✨ NEW: Category declaration
  category: string;                    // Required: primary category
  tags?: string[];                     // Optional: fine-grained tags
  ontologyPath?: string;               // Optional: hierarchical path (future)

  // ✨ NEW: Trust/quality hints
  trustLevel?: 'unverified' | 'verified' | 'authoritative';

  // Existing fields
  watchZones: WatchZone[];
  notifyOn?: NotifyOptions;
  semanticThreshold?: number;
  aiEvaluation?: boolean;
}

export class MinimactSearchTracker {
  private config: TrackerConfig;
  private contentHashes: Map<string, string> = new Map();
  private semanticEmbeddings: Map<string, number[]> = new Map();

  constructor(config: TrackerConfig) {
    // Validate category
    if (!config.category) {
      throw new Error('[Minimact Search] Category is required');
    }

    this.config = config;
  }

  private async notifyChange(zone: WatchZone, element: Element) {
    const event = {
      url: window.location.href,
      selector: zone.selector,
      importance: zone.importance,
      content: element.textContent,
      title: document.title,
      description: this.getMetaDescription(),
      timestamp: new Date().toISOString(),

      // ✨ NEW: Category metadata
      category: this.config.category,
      tags: this.config.tags || [],
      ontologyPath: this.config.ontologyPath,
      trustLevel: this.config.trustLevel || 'unverified',

      // ✨ NEW: Source metadata
      domain: window.location.hostname,
      language: document.documentElement.lang || 'en'
    };

    console.log('[Minimact Search] Change detected:', event);

    await fetch(this.config.apiEndpoint || 'https://search.minimact.com/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey
      },
      body: JSON.stringify(event)
    });
  }
}
```

**Usage Example:**

```html
<!-- Tech blog -->
<script src="https://search.minimact.com/tracker.js"></script>
<script>
  const tracker = new MinimactSearchTracker({
    apiKey: 'your-api-key',
    category: 'technology',
    tags: ['web-dev', 'javascript', 'frameworks'],
    trustLevel: 'verified',
    watchZones: [
      { selector: 'article', importance: 'high' },
      { selector: '.blog-content', importance: 'high' }
    ]
  });
  tracker.init();
</script>
```

---

### API Controller Updates

```csharp
// minimact-search/api/Models/ChangeEvent.cs

public record ChangeEvent
{
    // Existing fields
    public string Url { get; init; } = string.Empty;
    public string Selector { get; init; } = string.Empty;
    public string Importance { get; init; } = "medium";
    public string Content { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public DateTime Timestamp { get; init; }

    // ✨ NEW: Category scoping
    public string Category { get; init; } = string.Empty;
    public string[] Tags { get; init; } = Array.Empty<string>();
    public string? OntologyPath { get; init; }

    // ✨ NEW: Trust/quality
    public string TrustLevel { get; init; } = "unverified";

    // ✨ NEW: Source metadata
    public string Domain { get; init; } = string.Empty;
    public string Language { get; init; } = "en";
}
```

```csharp
// minimact-search/api/Controllers/EventController.cs

[HttpPost]
public async Task<IActionResult> ReceiveEvent([FromBody] ChangeEvent changeEvent)
{
    // Validate API key
    var apiKey = Request.Headers["X-API-Key"].FirstOrDefault();
    if (string.IsNullOrEmpty(apiKey) || !await ValidateApiKey(apiKey))
    {
        return Unauthorized("Invalid API key");
    }

    // ✨ NEW: Validate category
    if (string.IsNullOrEmpty(changeEvent.Category))
    {
        return BadRequest("Category is required");
    }

    if (!IsValidCategory(changeEvent.Category))
    {
        return BadRequest($"Invalid category: {changeEvent.Category}");
    }

    _logger.LogInformation(
        "Change event received: {Url} - Category: {Category} - Tags: {Tags}",
        changeEvent.Url,
        changeEvent.Category,
        string.Join(", ", changeEvent.Tags)
    );

    // Process event asynchronously
    await _eventProcessor.ProcessEvent(changeEvent);

    return Ok(new {
        success = true,
        message = "Event received and queued for processing",
        category = changeEvent.Category
    });
}

private bool IsValidCategory(string category)
{
    var validCategories = new[]
    {
        "technology", "science", "business", "health",
        "finance", "education", "entertainment", "news"
    };
    return validCategories.Contains(category.ToLower());
}
```

---

### Scoped Vector Search Service

```csharp
// minimact-search/api/Services/ScopedVectorSearch.cs

using Npgsql;

namespace MinimactSearch.Api.Services;

public interface IScopedVectorSearch
{
    Task<SearchResult[]> Search(ScopedSearchQuery query);
    Task UpsertDocument(SearchDocument document);
}

public class ScopedVectorSearch : IScopedVectorSearch
{
    private readonly string _connectionString;
    private readonly IEmbeddingService _embeddingService;
    private readonly ILogger<ScopedVectorSearch> _logger;

    public ScopedVectorSearch(
        IConfiguration configuration,
        IEmbeddingService embeddingService,
        ILogger<ScopedVectorSearch> logger)
    {
        _connectionString = configuration.GetConnectionString("Postgres")
            ?? throw new ArgumentException("Postgres connection string not configured");
        _embeddingService = embeddingService;
        _logger = logger;
    }

    public async Task<SearchResult[]> Search(ScopedSearchQuery query)
    {
        var startTime = DateTime.UtcNow;

        // Generate embedding for query
        var queryEmbedding = await _embeddingService.GenerateEmbedding(query.Query);

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        // Build dynamic WHERE clause based on filters
        var whereConditions = new List<string>();
        var parameters = new List<NpgsqlParameter>();

        // ✨ Category filter (CRITICAL for scoped search)
        if (query.Category != null && query.Category.Length > 0)
        {
            if (query.Category.Length == 1)
            {
                whereConditions.Add("category = @category");
                parameters.Add(new NpgsqlParameter("category", query.Category[0]));
            }
            else
            {
                whereConditions.Add("category = ANY(@categories)");
                parameters.Add(new NpgsqlParameter("categories", query.Category));
            }
        }

        // ✨ Tag filter (optional fine-grained filtering)
        if (query.Tags != null && query.Tags.Length > 0)
        {
            whereConditions.Add("tags && @tags");
            parameters.Add(new NpgsqlParameter("tags", query.Tags));
        }

        // ✨ Freshness filter
        if (!string.IsNullOrEmpty(query.Freshness))
        {
            var cutoff = GetFreshnessCutoff(query.Freshness);
            whereConditions.Add("last_updated >= @cutoff");
            parameters.Add(new NpgsqlParameter("cutoff", cutoff));
        }

        // ✨ Freshness score filter
        if (query.MinFreshnessScore.HasValue)
        {
            whereConditions.Add("freshness_score >= @minFreshness");
            parameters.Add(new NpgsqlParameter("minFreshness", query.MinFreshnessScore.Value));
        }

        // ✨ Trust score filter (future)
        if (query.MinTrustScore.HasValue)
        {
            whereConditions.Add("trust_score >= @minTrust");
            parameters.Add(new NpgsqlParameter("minTrust", query.MinTrustScore.Value));
        }

        // ✨ Semantic similarity threshold
        var semanticThreshold = query.SemanticThreshold ?? 0.5;
        whereConditions.Add("1 - (embedding <=> @queryEmbedding) > @semanticThreshold");

        var whereClause = whereConditions.Count > 0
            ? "WHERE " + string.Join(" AND ", whereConditions)
            : "";

        var sql = $@"
            SELECT
                url, title, description, content,
                category, tags,
                importance, trust_score, quality_score,
                last_updated, indexed_at, freshness_score,
                1 - (embedding <=> @queryEmbedding) AS similarity
            FROM documents
            {whereClause}
            ORDER BY
                -- ✨ Hybrid ranking: freshness + relevance + trust
                (freshness_score * 0.4 +
                 (1 - (embedding <=> @queryEmbedding)) * 0.4 +
                 trust_score * 0.2) DESC,
                indexed_at DESC
            LIMIT @limit
            OFFSET @offset
        ";

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.Add(new NpgsqlParameter("queryEmbedding", queryEmbedding));
        cmd.Parameters.Add(new NpgsqlParameter("semanticThreshold", semanticThreshold));
        cmd.Parameters.Add(new NpgsqlParameter("limit", query.Limit ?? 10));
        cmd.Parameters.Add(new NpgsqlParameter("offset", query.Offset ?? 0));

        foreach (var param in parameters)
        {
            cmd.Parameters.Add(param);
        }

        var results = new List<SearchResult>();

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            results.Add(new SearchResult
            {
                Url = reader.GetString(0),
                Title = reader.GetString(1),
                Description = reader.IsDBNull(2) ? null : reader.GetString(2),
                Content = reader.GetString(3),
                Category = reader.GetString(4),
                Tags = (string[])reader.GetValue(5),
                Importance = reader.GetString(6),
                TrustScore = reader.GetFloat(7),
                QualityScore = reader.GetFloat(8),
                LastUpdated = reader.GetDateTime(9),
                IndexedAt = reader.GetDateTime(10),
                FreshnessScore = reader.GetFloat(11),
                Similarity = reader.GetFloat(12)
            });
        }

        var duration = (DateTime.UtcNow - startTime).TotalMilliseconds;
        _logger.LogInformation(
            "Scoped search completed in {Duration}ms: query='{Query}', category={Category}, results={Count}",
            duration,
            query.Query,
            query.Category != null ? string.Join(",", query.Category) : "all",
            results.Count
        );

        return results.ToArray();
    }

    public async Task UpsertDocument(SearchDocument document)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        var sql = @"
            INSERT INTO documents (
                url, title, description, content,
                category, tags, ontology_path,
                embedding, importance,
                trust_score, quality_score,
                last_updated, indexed_at,
                freshness_score, source_domain
            )
            VALUES (
                @url, @title, @description, @content,
                @category, @tags, @ontologyPath,
                @embedding, @importance,
                @trustScore, @qualityScore,
                @lastUpdated, @indexedAt,
                @freshnessScore, @sourceDomain
            )
            ON CONFLICT (url) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                content = EXCLUDED.content,
                category = EXCLUDED.category,
                tags = EXCLUDED.tags,
                ontology_path = EXCLUDED.ontology_path,
                embedding = EXCLUDED.embedding,
                importance = EXCLUDED.importance,
                trust_score = EXCLUDED.trust_score,
                quality_score = EXCLUDED.quality_score,
                last_updated = EXCLUDED.last_updated,
                indexed_at = EXCLUDED.indexed_at,
                freshness_score = 1.0,
                updated_count = documents.updated_count + 1
        ";

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("url", document.Url);
        cmd.Parameters.AddWithValue("title", document.Title);
        cmd.Parameters.AddWithValue("description", document.Description ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("content", document.Content);
        cmd.Parameters.AddWithValue("category", document.Category);
        cmd.Parameters.AddWithValue("tags", document.Tags);
        cmd.Parameters.AddWithValue("ontologyPath", document.OntologyPath ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("embedding", document.Embedding);
        cmd.Parameters.AddWithValue("importance", document.Importance);
        cmd.Parameters.AddWithValue("trustScore", document.TrustScore);
        cmd.Parameters.AddWithValue("qualityScore", document.QualityScore);
        cmd.Parameters.AddWithValue("lastUpdated", document.LastUpdated);
        cmd.Parameters.AddWithValue("indexedAt", document.IndexedAt);
        cmd.Parameters.AddWithValue("freshnessScore", 1.0f);
        cmd.Parameters.AddWithValue("sourceDomain", document.SourceDomain);

        await cmd.ExecuteNonQueryAsync();

        _logger.LogInformation(
            "Document upserted: {Url} - Category: {Category}",
            document.Url,
            document.Category
        );
    }

    private DateTime GetFreshnessCutoff(string freshness)
    {
        return freshness switch
        {
            "1h" => DateTime.UtcNow.AddHours(-1),
            "24h" => DateTime.UtcNow.AddHours(-24),
            "7d" => DateTime.UtcNow.AddDays(-7),
            "30d" => DateTime.UtcNow.AddDays(-30),
            _ => DateTime.MinValue
        };
    }
}

public record ScopedSearchQuery
{
    public string Query { get; init; } = string.Empty;

    // Scope filters
    public string[]? Category { get; init; }
    public string[]? Tags { get; init; }

    // Freshness filters
    public string? Freshness { get; init; }
    public float? MinFreshnessScore { get; init; }

    // Quality filters
    public float? MinTrustScore { get; init; }
    public float? MinQualityScore { get; init; }

    // Semantic options
    public float? SemanticThreshold { get; init; }

    // Pagination
    public int? Limit { get; init; }
    public int? Offset { get; init; }
}

public record SearchDocument
{
    public string Url { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string Content { get; init; } = string.Empty;

    // Category scoping
    public string Category { get; init; } = string.Empty;
    public string[] Tags { get; init; } = Array.Empty<string>();
    public string? OntologyPath { get; init; }

    // Semantic
    public float[] Embedding { get; init; } = Array.Empty<float>();

    // Quality/trust
    public string Importance { get; init; } = "medium";
    public float TrustScore { get; init; } = 0.5f;
    public float QualityScore { get; init; } = 0.5f;

    // Temporal
    public DateTime LastUpdated { get; init; }
    public DateTime IndexedAt { get; init; }

    // Metadata
    public string SourceDomain { get; init; } = string.Empty;
}

public record SearchResult : SearchDocument
{
    public float FreshnessScore { get; init; }
    public float Similarity { get; init; }
}
```

---

### Search API Endpoint

```csharp
// minimact-search/api/Controllers/SearchController.cs

using Microsoft.AspNetCore.Mvc;

namespace MinimactSearch.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SearchController : ControllerBase
{
    private readonly IScopedVectorSearch _scopedSearch;
    private readonly ILogger<SearchController> _logger;

    public SearchController(
        IScopedVectorSearch scopedSearch,
        ILogger<SearchController> logger)
    {
        _scopedSearch = scopedSearch;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] string q,
        [FromQuery] string? category = null,
        [FromQuery] string? tags = null,
        [FromQuery] string? freshness = null,
        [FromQuery] float? minTrust = null,
        [FromQuery] float? semanticThreshold = null,
        [FromQuery] int limit = 10,
        [FromQuery] int offset = 0)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return BadRequest("Query parameter 'q' is required");
        }

        var query = new ScopedSearchQuery
        {
            Query = q,
            Category = category?.Split(','),
            Tags = tags?.Split(','),
            Freshness = freshness,
            MinTrustScore = minTrust,
            SemanticThreshold = semanticThreshold,
            Limit = Math.Min(limit, 100), // Max 100 results
            Offset = offset
        };

        _logger.LogInformation(
            "Search request: query='{Query}', category={Category}, tags={Tags}",
            q,
            category ?? "all",
            tags ?? "none"
        );

        var results = await _scopedSearch.Search(query);

        return Ok(new
        {
            query = q,
            filters = new
            {
                category = query.Category,
                tags = query.Tags,
                freshness = query.Freshness
            },
            results = results.Select(r => new
            {
                url = r.Url,
                title = r.Title,
                description = r.Description,
                category = r.Category,
                tags = r.Tags,
                similarity = r.Similarity,
                freshnessScore = r.FreshnessScore,
                trustScore = r.TrustScore,
                lastUpdated = r.LastUpdated,
                indexedAt = r.IndexedAt
            }),
            meta = new
            {
                count = results.Length,
                limit = query.Limit,
                offset = query.Offset
            }
        });
    }
}
```

---

### UI Updates

```tsx
// minimact-search/search-ui/src/components/SearchInterface.tsx

import { useState } from 'react';
import { SearchBox } from './SearchBox';
import { CategoryFilter } from './CategoryFilter';
import { AdvancedFilters } from './AdvancedFilters';
import { ResultsList } from './ResultsList';
import { CarbonCounter } from './CarbonCounter';
import { useSearchResults } from '../hooks/useSearchResults';

export function SearchInterface() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [freshness, setFreshness] = useState<string>('all');

  const { results, isLoading, search } = useSearchResults();

  const handleSearch = () => {
    search({
      query,
      category: category ? [category] : undefined,
      tags: tags.length > 0 ? tags : undefined,
      freshness: freshness !== 'all' ? freshness : undefined
    });
  };

  return (
    <div className="search-interface">
      <header className="search-header">
        <h1>🌵 Minimact Search</h1>
        <p className="tagline">Event-driven, category-scoped, semantic search</p>
      </header>

      <div className="search-controls">
        <CategoryFilter
          value={category}
          onChange={setCategory}
        />

        <SearchBox
          query={query}
          onChange={setQuery}
          onSearch={handleSearch}
          isLoading={isLoading}
          placeholder={
            category
              ? `Search in ${category}...`
              : "Search the event-driven web..."
          }
        />
      </div>

      <AdvancedFilters
        tags={tags}
        onTagsChange={setTags}
        freshness={freshness}
        onFreshnessChange={setFreshness}
      />

      <ResultsList
        results={results}
        query={query}
        category={category}
      />

      <CarbonCounter />
    </div>
  );
}
```

```tsx
// minimact-search/search-ui/src/components/CategoryFilter.tsx

interface CategoryFilterProps {
  value: string;
  onChange: (category: string) => void;
}

const CATEGORIES = [
  { value: '', label: 'All Categories', icon: '🌐' },
  { value: 'technology', label: 'Technology', icon: '💻' },
  { value: 'science', label: 'Science', icon: '🔬' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'health', label: 'Health', icon: '🏥' },
  { value: 'finance', label: 'Finance', icon: '💰' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { value: 'news', label: 'News', icon: '📰' }
];

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div className="category-filter">
      <label>Category:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="category-select"
      >
        {CATEGORIES.map(cat => (
          <option key={cat.value} value={cat.value}>
            {cat.icon} {cat.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

```tsx
// minimact-search/search-ui/src/components/AdvancedFilters.tsx

interface AdvancedFiltersProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  freshness: string;
  onFreshnessChange: (freshness: string) => void;
}

export function AdvancedFilters({
  tags,
  onTagsChange,
  freshness,
  onFreshnessChange
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details className="advanced-filters" open={isOpen} onToggle={(e) => setIsOpen(e.currentTarget.open)}>
      <summary>⚙️ Advanced Filters</summary>

      <div className="filters-content">
        <div className="filter-group">
          <label>
            Freshness:
            <select
              value={freshness}
              onChange={(e) => onFreshnessChange(e.target.value)}
            >
              <option value="all">All time</option>
              <option value="1h">Last hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </label>
        </div>

        <div className="filter-group">
          <label>
            Tags (comma-separated):
            <input
              type="text"
              placeholder="e.g., web-dev, frameworks, javascript"
              value={tags.join(', ')}
              onChange={(e) => {
                const tagList = e.target.value
                  .split(',')
                  .map(t => t.trim())
                  .filter(t => t.length > 0);
                onTagsChange(tagList);
              }}
            />
          </label>
        </div>
      </div>
    </details>
  );
}
```

```tsx
// minimact-search/search-ui/src/components/ResultsList.tsx (updated)

interface ResultsListProps {
  results: SearchResult[];
  query: string;
  category?: string;
}

export function ResultsList({ results, query, category }: ResultsListProps) {
  if (results.length === 0) {
    return (
      <div className="no-results">
        <p>No results found for "{query}"
          {category && <span> in <strong>{category}</strong></span>}
        </p>
        <p className="hint">
          Try adjusting your category or filters, or check back soon as
          new content is indexed in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="results-list">
      <div className="results-header">
        <span>
          {results.length} results found
          {category && <span> in <strong>{category}</strong></span>}
        </span>
      </div>
      {results.map((result) => (
        <div key={result.url} className="result-item">
          <div className="result-header">
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="result-title">
              {result.title}
            </a>
            <LiveIndicator
              lastUpdated={new Date(result.lastUpdated)}
              freshnessScore={result.freshnessScore}
            />
          </div>

          <div className="result-url">{result.url}</div>

          {result.description && (
            <p className="result-description">{result.description}</p>
          )}

          <div className="result-meta">
            <span className="category" title="Category">
              📁 {result.category}
            </span>
            {result.tags.length > 0 && (
              <span className="tags" title="Tags">
                🏷️ {result.tags.join(', ')}
              </span>
            )}
            <span className="similarity" title="Semantic Relevance">
              🎯 {(result.similarity * 100).toFixed(0)}%
            </span>
            <span className="freshness" title="Freshness Score">
              ⚡ {(result.freshnessScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Real-World Examples

### Example 1: Developer Searching for New Frameworks

**Query:**
```
"new web frameworks"
Category: technology
Tags: [web-dev, javascript]
Freshness: 7d
```

**Results:**
```
✅ Svelte 5 Runes: A New Era of Reactivity (updated 2h ago)
   🎯 Relevance: 94% | ⚡ Freshness: 98% | 📁 technology

✅ Qwik 1.5: Resumability Meets Performance (updated 5h ago)
   🎯 Relevance: 91% | ⚡ Freshness: 95% | 📁 technology

✅ Fresh 2.0: Islands Architecture Simplified (updated 1d ago)
   🎯 Relevance: 88% | ⚡ Freshness: 87% | 📁 technology

✅ HTMX 2.0 Beta: Hypermedia in 2025 (updated 3d ago)
   🎯 Relevance: 85% | ⚡ Freshness: 72% | 📁 technology
```

**What Google Would Return:**
```
❌ "Framework for Sustainable Agriculture" (government site)
❌ "Legal Framework for Web Contracts" (law firm)
❌ "Framework Agreements in Construction" (industry site)
❌ 3-year-old blog post about Angular (page 3)
```

---

### Example 2: Natural Language Semantic Query

**Query:**
```
"frameworks like Svelte but faster"
Category: technology
Semantic threshold: 0.6
```

**Semantic Understanding:**
- Understands "like Svelte" = similar reactive UI library
- Understands "but faster" = performance optimization focus
- Matches semantically similar content even without exact keywords

**Results:**
```
✅ Solid.js: Fine-Grained Reactivity Without Virtual DOM
   🎯 Relevance: 92% | Semantic match: "reactive", "performance", "no-vdom"

✅ Qwik: Resumability for Instant Interactivity
   🎯 Relevance: 89% | Semantic match: "fast", "zero-hydration", "instant"

✅ Million.js: Virtual DOM Replacement Block Algorithm
   🎯 Relevance: 87% | Semantic match: "faster", "optimization", "react-like"

✅ Preact: 3KB React Alternative
   🎯 Relevance: 84% | Semantic match: "lightweight", "fast", "react-compatible"
```

**Note:** None of these results contain the exact phrase "like Svelte but faster", yet the semantic search understands the intent perfectly.

---

### Example 3: Cross-Category Research

**Query:**
```
"AI ethics frameworks"
Category: [technology, science, philosophy]
Freshness: 30d
Min trust score: 0.7
```

**Results span multiple domains:**
```
✅ IEEE Standards for AI Ethics Implementation (science, updated 5d ago)
✅ EU AI Act: Regulatory Framework Analysis (technology, updated 7d ago)
✅ Kantian Ethics Applied to Machine Learning (philosophy, updated 12d ago)
✅ Corporate AI Governance Best Practices (business, updated 18d ago)
```

---

### Example 4: Price Drop Discovery (E-commerce)

**Query:**
```
"gaming laptops under $1000"
Category: technology
Tags: [hardware, gaming, deals]
Freshness: 24h
```

**Real-time price tracking:**
```
✅ ASUS ROG Strix G16 - Now $999 (was $1299) [updated 10min ago]
✅ Lenovo Legion 5 Pro - Sale $949 [updated 1h ago]
✅ MSI Katana 15 - $899 Limited Time [updated 3h ago]
```

**Instant indexing means:** Price drops appear in search results within seconds, not days.

---

## Why This Destroys Traditional Search

| Problem | Google (Keyword-Based) | Minimact (Scoped Semantic) |
|---------|------------------------|----------------------------|
| **Ambiguous keywords** | ❌ Returns all domains with keyword | ✅ Scoped to declared category |
| **Semantic intent** | ❌ Literal keyword matching only | ✅ Understands meaning via embeddings |
| **Freshness** | ❌ 3-7 days stale | ✅ 10-30 seconds fresh |
| **SEO spam** | ❌ Top results often spam/ads | ✅ No crawling = no SEO gaming |
| **Niche content** | ❌ Buried on page 10+ | ✅ Semantic similarity surfaces it |
| **Cross-domain pollution** | ❌ "frameworks" matches everything | ✅ Category filter prevents |
| **Natural language** | ❌ Struggles with nuanced queries | ✅ Embeddings handle complexity |
| **Price tracking** | ❌ Outdated prices | ✅ Real-time price updates |

---

## Future Enhancements (Phase 2+)

### 1. Hierarchical Ontology
Instead of flat categories, support hierarchical paths:

```typescript
MinimactSearch.init({
  ontology: {
    domain: 'technology',
    subdomain: 'web-development',
    topics: ['frameworks', 'performance', 'dx']
  }
});

// Query at any level
search("performance optimization", {
  ontologyPath: "technology.web-development.*"
});
```

**Benefits:**
- More precise scoping
- Discover related subdomains
- Build knowledge graph automatically

---

### 2. Multi-Modal Search
Extend beyond text to images, code, videos:

```typescript
search("component library examples", {
  category: "technology",
  modalities: ["text", "code", "images"]
});

// Results include:
// - Documentation (text)
// - GitHub repos (code)
// - UI screenshots (images)
```

---

### 3. Trust Scoring & Verification
Implement publisher reputation system:

```typescript
// Publishers earn trust over time
trustLevel: 'authoritative'  // 0.9+ score
trustLevel: 'verified'       // 0.7-0.9 score
trustLevel: 'unverified'     // 0.5-0.7 score

// Users can filter
search("medical advice", {
  category: "health",
  minTrustScore: 0.8  // Only authoritative sources
});
```

---

### 4. Personalization (Privacy-First)
Client-side preference learning without tracking:

```typescript
// Stored locally in browser
const preferences = {
  favoriteCategories: ['technology', 'science'],
  favoriteTags: ['web-dev', 'rust', 'ai'],
  readingHistory: [], // Local only, never sent to server
};

// Boost results matching preferences
search("new languages", {
  category: "technology",
  personalizedBoost: true  // Uses local preferences
});
```

---

### 5. Collaborative Filtering
"Users who searched X also found Y useful":

```typescript
// Anonymous aggregate patterns
search("Svelte tutorial", {
  category: "technology",
  recommendations: true
});

// Results include:
// ✅ Direct matches
// ✅ "Others also viewed: Solid.js tutorial"
// ✅ "Related searches: Svelte vs React"
```

---

### 6. Semantic Search Suggestions
As-you-type semantic completions:

```
User types: "framew"

Suggestions:
- "frameworks like Svelte but faster"
- "framework comparison 2025"
- "framework performance benchmarks"
- "new frontend frameworks"

(Suggestions based on semantic similarity, not just prefix matching)
```

---

## Success Metrics

### MVP Success (Week 1)
- ✅ Category filtering works (zero cross-domain pollution)
- ✅ Semantic search returns relevant results (>80% user satisfaction)
- ✅ Results update in <15 seconds from content change
- ✅ Developer feedback: "This is what search should be"

### Phase 2 Success (Month 3)
- ✅ 8 categories fully populated with >1000 sites each
- ✅ Semantic relevance beats keyword matching in 90%+ of queries
- ✅ Users prefer scoped search over traditional search (A/B test)
- ✅ Paying customers from multiple verticals

### Long-Term Success (Year 1)
- ✅ Category-scoped search becomes the expected UX
- ✅ Publishers actively declare ontology paths for better discovery
- ✅ "Search pollution" becomes a solved problem
- ✅ Minimact Search = default for technical content discovery

---

## Implementation Timeline

### Week 1: MVP Core
- ✅ Database schema with category fields
- ✅ Tracker.js category declaration
- ✅ Scoped vector search implementation
- ✅ UI with category dropdown
- ✅ Demo: Technology category with 10 test sites

### Week 2-3: Refinement
- ✅ Add all 8 categories
- ✅ Optimize vector search queries
- ✅ Add advanced filters (tags, freshness)
- ✅ Polish UI/UX

### Week 4: Beta Launch
- ✅ Invite 100 publishers across categories
- ✅ Gather feedback on category taxonomy
- ✅ Iterate on relevance ranking
- ✅ Measure search quality vs Google

---

## Conclusion

**Scoped Semantic Search is not just a feature—it's a fundamental reimagining of how search should work.**

By combining:
1. **Category scoping** (publisher-declared intent)
2. **Semantic embeddings** (AI-powered meaning understanding)
3. **Real-time events** (instant freshness)

We create a search engine that:
- 🎯 **Understands what you mean**, not just what you typed
- 🔍 **Searches where it matters**, not the entire noisy web
- ⚡ **Shows what's fresh**, not what's stale
- 🌱 **Uses 99% less energy**, not billions in infrastructure

**This is the future of search.**

**Traditional keyword-based crawling is over.**

**Category-scoped, semantic, event-driven search starts now.** 🚀

---

**Status:** Ready to implement
**Priority:** Critical for product differentiation
**Timeline:** Week 1 MVP includes scoped search

🌵🔍⚡💚
