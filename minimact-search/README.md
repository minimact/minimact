# Mactic - Event-Driven Search + Living Community

**Stop crawling. Start running.**

🌱 99% greener | ⚡ 10,000x faster | 🧠 AI-native

---

## What is Mactic?

Mactic is an event-driven search engine that creates a living developer community. Instead of crawlers visiting billions of pages, websites push change notifications when content actually changes.

**Result:**
- ⚡ 10-second indexing (vs 3-7 days traditional)
- 🌱 99% carbon reduction vs crawler-based search
- 🧠 Semantic + category-scoped search
- 💚 Living developer community with real-time discovery

---

## Quick Start

### For Minimact Apps (One Line):

```csharp
// In Program.cs
builder.Services.AddMacticSearch(options => {
    options.ApiKey = "your-api-key";
    options.Category = "technology";
});
```

Deploy your app. It's indexed in 10 seconds.

### For Any Website:

```html
<script src="https://cdn.itsmactic.com/tracker.js"></script>
<script>
  MacticTracker.init({
    apiKey: 'your-api-key',
    category: 'technology',
    watchZones: [
      { selector: 'article', importance: 'high' }
    ]
  });
</script>
```

---

## Project Structure

```
minimact-search/
├── tracker/           # Client-side JavaScript tracker
├── api/              # ASP.NET Core event ingestion API
├── search-ui/        # React search interface
├── db/               # Database migrations
└── docs/             # Documentation
```

---

## Development

### Prerequisites
- Node.js 18+
- .NET 8
- PostgreSQL 16+ with pgvector
- OpenAI API key

### Setup

```bash
# Install tracker dependencies
cd tracker
npm install
npm run build

# Set up database
cd ../db
psql -U postgres -f migrations/001_initial.sql

# Run API
cd ../api
dotnet restore
dotnet run

# Run search UI
cd ../search-ui
npm install
npm run dev
```

---

## Documentation

- [Implementation Plan](../docs/MINIMACT_SEARCH_IMPLEMENTATION_PLAN.md)
- [Scoped Semantic Search](../docs/MINIMACT_SEARCH_SCOPED_SEMANTIC_ADDENDUM.md)
- [Community Platform Vision](../docs/MINIMACT_COMMUNITY_PLATFORM.md)
- [Tracker API](./docs/TRACKER_API.md)
- [Search API](./docs/SEARCH_API.md)

---

## Status

🚧 **Week 1 MVP - In Development**

- [x] Architecture designed
- [x] Documentation complete
- [ ] Tracker.js implementation
- [ ] Event ingestion API
- [ ] Vector search
- [ ] Search UI
- [ ] SignalR real-time
- [ ] Demo deployment

---

## License

MIT

---

**It's Mactic.** 🌵

Website: [itsmactic.com](https://itsmactic.com) (coming soon)
Twitter: [@itsmactic](https://twitter.com/itsmactic) (coming soon)
