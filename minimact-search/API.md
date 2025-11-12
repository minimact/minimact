# Mactic Community Platform API

**Version:** 0.1.0
**Base URL:** `http://localhost:5000`
**Status:** ✅ Ready for Testing

---

## 🔍 Search API

### 1. Semantic Search

**Endpoint:** `GET /api/search`

**Description:** Search projects using semantic vector similarity with smart ranking.

**Query Parameters:**
- `query` (required): Search query text
- `category` (optional): Filter by category
- `limit` (optional): Max results (1-100, default 20)

**Example:**
```http
GET /api/search?query=authentication%20library&category=technology&limit=10
```

**Response:**
```json
{
  "query": "authentication library",
  "category": "technology",
  "results": [
    {
      "id": "guid",
      "name": "minimact-auth",
      "description": "OAuth2 + JWT authentication for Minimact",
      "url": "https://example.com",
      "category": "technology",
      "tags": ["auth", "oauth", "jwt"],
      "developer": {
        "id": "guid",
        "username": "sarah_codes",
        "displayName": "Sarah Codes",
        "reputation": 2847
      },
      "viewCount": 1247,
      "cloneCount": 234,
      "averageRating": 4.9,
      "reviewCount": 89,
      "createdAt": "2024-06-01T00:00:00Z",
      "lastUpdatedAt": "2025-01-12T10:30:00Z",
      "lastDeployedAt": "2025-01-12T10:30:00Z",
      "similarity": 0.92,
      "score": 0.87,
      "isTrending": true,
      "isFeatured": false
    }
  ],
  "totalResults": 5,
  "durationMs": 234.5
}
```

---

### 2. Get Trending Projects

**Endpoint:** `GET /api/search/trending`

**Description:** Get projects with high engagement in the last 7 days.

**Query Parameters:**
- `limit` (optional): Max results (default 10)

**Example:**
```http
GET /api/search/trending?limit=5
```

---

### 3. Get Recent Projects

**Endpoint:** `GET /api/search/recent`

**Description:** Get recently deployed projects.

**Query Parameters:**
- `limit` (optional): Max results (default 20)

**Example:**
```http
GET /api/search/recent?limit=10
```

---

### 4. Get Featured Projects

**Endpoint:** `GET /api/search/featured`

**Description:** Get community-featured projects.

**Example:**
```http
GET /api/search/featured
```

---

### 5. Get Projects by Category

**Endpoint:** `GET /api/search/category/{category}`

**Description:** Get projects in a specific category.

**Path Parameters:**
- `category`: Category name (e.g., "technology", "health", "education")

**Query Parameters:**
- `limit` (optional): Max results (default 20)

**Example:**
```http
GET /api/search/category/technology?limit=15
```

---

## 👥 Community API

### 6. Get Developer Profile

**Endpoint:** `GET /api/community/developers/{username}`

**Description:** Get complete developer profile with projects and badges.

**Path Parameters:**
- `username`: Developer username

**Example:**
```http
GET /api/community/developers/sarah_codes
```

**Response:**
```json
{
  "id": "guid",
  "username": "sarah_codes",
  "email": "sarah@example.com",
  "displayName": "Sarah Codes",
  "bio": "Full-stack developer, OSS enthusiast",
  "location": "San Francisco, CA",
  "website": "https://sarahcodes.dev",
  "githubUrl": "https://github.com/sarah",
  "twitterHandle": "@sarah_codes",
  "reputation": 2847,
  "joinedAt": "2024-06-01T00:00:00Z",
  "lastActiveAt": "2025-01-12T10:30:00Z",
  "isOpenToCollaboration": true,
  "isOpenToConsulting": true,
  "skills": ["C#", "TypeScript", "React", "PostgreSQL"],
  "followerCount": 892,
  "followingCount": 23,
  "totalUsageCount": 1247,
  "projects": [
    {
      "id": "guid",
      "name": "minimact-auth",
      "description": "Authentication library",
      "url": "https://example.com",
      "category": "technology",
      "tags": ["auth", "oauth"],
      "viewCount": 1247,
      "cloneCount": 234,
      "averageRating": 4.9,
      "lastDeployedAt": "2025-01-12T10:30:00Z",
      "isTrending": true
    }
  ],
  "badges": [
    {
      "id": "guid",
      "name": "Early Adopter",
      "description": "First 100 developers",
      "iconUrl": "https://badges.mactic.com/early-adopter.svg"
    }
  ]
}
```

---

### 7. Get Project Details

**Endpoint:** `GET /api/community/projects/{id}`

**Description:** Get complete project details with reviews.

**Path Parameters:**
- `id`: Project GUID

**Example:**
```http
GET /api/community/projects/123e4567-e89b-12d3-a456-426614174000
```

**Response:**
```json
{
  "id": "guid",
  "name": "minimact-auth",
  "description": "OAuth2 + JWT authentication for Minimact",
  "url": "https://auth.example.com",
  "githubUrl": "https://github.com/sarah/minimact-auth",
  "docsUrl": "https://docs.minimact-auth.com",
  "category": "technology",
  "tags": ["auth", "oauth", "jwt"],
  "developer": {
    "id": "guid",
    "username": "sarah_codes",
    "displayName": "Sarah Codes",
    "reputation": 2847
  },
  "viewCount": 1247,
  "cloneCount": 234,
  "forkCount": 89,
  "averageRating": 4.9,
  "reviewCount": 89,
  "usageCount": 1247,
  "dependencyCount": 23,
  "createdAt": "2024-06-01T00:00:00Z",
  "lastUpdatedAt": "2025-01-12T10:30:00Z",
  "lastDeployedAt": "2025-01-12T10:30:00Z",
  "isTrending": true,
  "isFeatured": false,
  "reviews": [
    {
      "id": "guid",
      "rating": 5,
      "comment": "Best auth library for Minimact!",
      "createdAt": "2025-01-10T14:20:00Z",
      "reviewer": {
        "id": "guid",
        "username": "john_dev",
        "displayName": "John Dev",
        "reputation": 1234
      }
    }
  ]
}
```

---

### 8. Get Project Usage ("Who's Using This?")

**Endpoint:** `GET /api/community/projects/{id}/usage`

**Description:** Get list of developers using this project.

**Path Parameters:**
- `id`: Project GUID

**Example:**
```http
GET /api/community/projects/123e4567-e89b-12d3-a456-426614174000/usage
```

**Response:**
```json
[
  {
    "developer": {
      "id": "guid",
      "username": "john_dev",
      "displayName": "John Dev",
      "reputation": 1234
    },
    "firstUsedAt": "2024-08-15T00:00:00Z",
    "lastUsedAt": "2025-01-12T08:00:00Z"
  }
]
```

---

### 9. Get Activity Feed

**Endpoint:** `GET /api/community/activity`

**Description:** Get real-time community activity feed.

**Query Parameters:**
- `limit` (optional): Max results (default 50)

**Example:**
```http
GET /api/community/activity?limit=20
```

**Response:**
```json
[
  {
    "id": "guid",
    "eventType": "deployment",
    "eventData": "{\"version\":\"2.0.1\",\"changes\":\"Added OAuth refresh tokens\"}",
    "createdAt": "2025-01-12T10:30:00Z",
    "developer": {
      "id": "guid",
      "username": "sarah_codes",
      "displayName": "Sarah Codes",
      "reputation": 2847
    },
    "project": {
      "id": "guid",
      "name": "minimact-auth",
      "description": "Authentication library",
      "url": "https://example.com",
      "category": "technology",
      "tags": ["auth"],
      "viewCount": 1247,
      "cloneCount": 234,
      "averageRating": 4.9,
      "lastDeployedAt": "2025-01-12T10:30:00Z",
      "isTrending": true
    }
  }
]
```

---

### 10. Get Community Stats

**Endpoint:** `GET /api/community/stats`

**Description:** Get overall community statistics.

**Example:**
```http
GET /api/community/stats
```

**Response:**
```json
{
  "totalDevelopers": 892,
  "totalProjects": 1247,
  "liveProjects": 987,
  "totalReviews": 3456,
  "newDevelopersThisWeek": 89,
  "newProjectsThisWeek": 234,
  "deploymentsThisWeek": 567
}
```

---

## 📡 Event Ingestion API (Existing)

### 11. Ingest Change Event

**Endpoint:** `POST /api/events`

**Description:** Receive change notifications from websites.

**Request Body:**
```json
{
  "url": "https://example.com",
  "title": "My Awesome App",
  "description": "An amazing Minimact application",
  "category": "technology",
  "tags": ["web", "minimact", "demo"],
  "content": "Latest content snapshot...",
  "metadata": {
    "author": "john_doe",
    "timestamp": "2025-01-12T10:30:00Z"
  }
}
```

**Response:**
```json
{
  "status": "received",
  "eventId": "evt_123abc",
  "timestamp": "2025-01-12T10:30:15Z",
  "message": "Event queued for processing"
}
```

---

### 12. Health Check

**Endpoint:** `GET /api/events/health`

**Description:** Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-12T10:30:00Z"
}
```

---

### 13. Event Stats

**Endpoint:** `GET /api/events/stats`

**Description:** Get event ingestion statistics.

**Response:**
```json
{
  "totalEventsReceived": 12345,
  "eventsToday": 234,
  "eventsThisHour": 12,
  "averageProcessingTime": 234.5
}
```

---

## 🚀 Quick Start

### 1. Setup Database

```bash
# Create PostgreSQL database with pgvector
createdb mactic

# Enable pgvector extension
psql mactic -c "CREATE EXTENSION vector;"

# Apply migrations
cd J:\projects\minimact\minimact-search\api\Mactic.Api
dotnet ef database update
```

### 2. Configure API

Edit `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=mactic;Username=postgres;Password=yourpassword"
  },
  "OpenAI": {
    "ApiKey": "sk-your-openai-api-key"
  }
}
```

### 3. Run API

```bash
cd J:\projects\minimact\minimact-search\api\Mactic.Api
dotnet run
```

**API will be available at:** `http://localhost:5000`

---

## 🔧 Development Tools

### Test Semantic Search

```bash
# Search for projects
curl "http://localhost:5000/api/search?query=authentication"

# Get trending
curl "http://localhost:5000/api/search/trending"

# Get developer profile
curl "http://localhost:5000/api/community/developers/sarah_codes"
```

---

## 📊 Features

- ✅ **Semantic Vector Search** - pgvector + OpenAI embeddings
- ✅ **Smart Ranking** - Combines similarity, freshness, engagement
- ✅ **Developer Profiles** - Auto-generated from activity
- ✅ **Project Details** - Complete metadata with reviews
- ✅ **"Who's Using This?"** - Dependency graph tracking
- ✅ **Real-Time Activity Feed** - Live community pulse
- ✅ **Community Stats** - Growth metrics and trends
- ✅ **Event Ingestion** - Change notification system

---

## 🎯 What's Next

1. **Profile Auto-Generation Service** - Create/update profiles from events
2. **SignalR Hub** - Real-time WebSocket updates
3. **React Search UI** - Beautiful search interface
4. **Badge System** - Auto-award achievements
5. **Trending Algorithm** - Time-decay ranking

---

## 🌵 Let's Build the Future!

**Stop crawling. Start running.** 🚀
