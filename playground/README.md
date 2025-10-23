# Minimact Playground

Interactive web-based IDE for exploring Minimact's predictive rendering engine. Write TSX components, watch them compile to C#, interact with them in real-time, and see prediction cache hits/misses visualized with green/red overlays.

**Live at**: https://minimact.com/playground

## Vision

Users can:
1. ✍️ **Write TSX** - Familiar React syntax
2. 🏃 **Compile** - See real-time transpilation to C#
3. 🎮 **Interact** - Click buttons, type inputs
4. 📊 **See Predictions** - Green/red cache hit visualization
5. 📈 **Track Performance** - Watch latency improve with usePredictHint

## Key Features

### 🟢 Green = Cache Hit
Prediction was correct. User saw change instantly (2-3ms).

### 🔴 Red = Cache Miss
Prediction was wrong. Had to recompute (15-20ms).

### 💡 usePredictHint
Add hints to improve prediction accuracy. Watch hit rate jump from 60% to 95%.

### 📊 Metrics Dashboard
Real-time stats:
- Cache hit rate
- Average latencies (predicted vs computed)
- Time savings per interaction
- Recent interaction history

## Architecture

```
┌─────────────────────────────────────────┐
│    React + Vite + TypeScript Frontend   │
│                                          │
│  • Monaco Editor (C# code)              │
│  • Live HTML Preview (iframe)           │
│  • Prediction Overlay (green/red)       │
│  • Metrics Dashboard                    │
│  • Hint Builder UI                      │
└──────────────┬──────────────────────────┘
               │ HTTP (REST API)
               ▼
┌──────────────────────────────────────────┐
│   ASP.NET Core 8.0 Backend               │
│                                          │
│  POST /api/playground/compile            │
│  • Roslyn: Compile C# code              │
│  • Instantiate: Create component         │
│  • Render: Initial HTML                 │
│  → Returns: SessionId + HTML             │
│                                          │
│  POST /api/playground/interact           │
│  • Check: Predictor cache                │
│  • Compute: Patches (if miss)            │
│  • Learn: Pattern (if new)               │
│  → Returns: Patches + timing             │
│                                          │
│  GET /api/playground/metrics             │
│  → Returns: Hit rate + latencies         │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴─────────┐
       ▼                 ▼
   [Rust Engine]  [Predictor]
   • Reconciler   • Pattern cache
   • VNode diff   • Learning
```

## Project Structure

### Backend (`/backend`)
- ASP.NET Core 8.0
- Controllers, Services, Models
- Roslyn C# compilation
- Session management
- Metrics tracking

**Status**: ✅ Complete and ready to use

### Frontend (`/frontend`)
- React 18+ with TypeScript
- Vite for blazing fast builds
- Monaco Editor for code editing
- Visualization components
- Metrics dashboard

**Status**: 🚧 In development

## Quick Start

### Prerequisites
- .NET 8.0 SDK
- Node.js 18+
- npm or yarn

### Backend
```bash
cd playground/backend
dotnet build
dotnet watch run
# API at http://localhost:5000, https://localhost:5001
# Swagger UI at https://localhost:5001/swagger
```

### Frontend
```bash
cd playground/frontend
npm install
npm run dev
# Open http://localhost:3000
```

## API Documentation

### POST /api/playground/compile
Compile TSX component to HTML.

**Request:**
```json
{
  "csharpCode": "...",
  "predictHints": []
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "html": "...",
  "vnode": {...},
  "predictions": [...],
  "compilationTimeMs": 234
}
```

### POST /api/playground/interact
Handle user interaction and return patches.

**Request:**
```json
{
  "sessionId": "uuid",
  "eventType": "click",
  "stateChanges": {"count": 1}
}
```

**Response:**
```json
{
  "elapsedMs": 3,
  "cacheHit": true,
  "latency": "3ms 🟢 CACHED",
  "actualPatches": [...],
  "predictionConfidence": 0.95,
  "html": "..."
}
```

### GET /api/playground/metrics/{sessionId}
Get session metrics.

**Response:**
```json
{
  "totalInteractions": 15,
  "cacheHits": 13,
  "hitRate": 86.67,
  "avgPredictedLatency": 2.3,
  "avgComputedLatency": 16.8,
  "recentInteractions": [...]
}
```

## Development

### Add a Feature
1. Backend: Create endpoint + service
2. Frontend: Add component + hook
3. Test: Verify integration
4. Deploy: Ship both together

### Run Tests
```bash
cd playground/backend
dotnet test

cd playground/frontend
npm test
```

### Debug
```bash
# Backend: Visual Studio debugger or VS Code
# Frontend: Browser DevTools
# API: Swagger UI at https://localhost:5001/swagger
```

## File Structure

```
playground/
├── backend/
│   ├── Controllers/
│   │   └── PlaygroundController.cs
│   ├── Services/
│   │   ├── CompilationService.cs
│   │   ├── PlaygroundService.cs
│   │   └── PlaygroundSession.cs
│   ├── Models/
│   │   ├── Requests.cs
│   │   └── Responses.cs
│   ├── Program.cs
│   ├── appsettings.json
│   ├── Minimact.Playground.csproj
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor.tsx
│   │   │   ├── Preview.tsx
│   │   │   ├── PredictionOverlay.tsx
│   │   │   ├── MetricsDashboard.tsx
│   │   │   ├── HintBuilder.tsx
│   │   │   └── Layout.tsx
│   │   ├── hooks/
│   │   │   ├── usePlayground.ts
│   │   │   ├── usePredictionTracker.ts
│   │   │   └── useMetrics.ts
│   │   ├── services/
│   │   │   └── playground.api.ts
│   │   ├── types/
│   │   │   └── playground.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── QUICKSTART.md (development guide)
├── PLAYGROUND_DESIGN.md (detailed design)
├── README.md (this file)
└── BACKEND_COMPLETE.md (backend status)
```

## Performance Targets

- **Compile**: <500ms
- **Interact (hit)**: <10ms end-to-end
- **Interact (miss)**: <50ms end-to-end
- **Prediction accuracy**: >80% after 10 interactions

## Deployment

### Docker
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 as backend-builder
# ... build backend ...

FROM node:18 as frontend-builder
# ... build frontend ...

FROM mcr.microsoft.com/dotnet/aspnet:8.0
# ... serve both ...
```

### Vercel + Azure
- Frontend: Deploy to Vercel (React app)
- Backend: Deploy to Azure App Service (.NET API)

### minimact.com
```
minimact.com/
├── / → Marketing site
├── /docs → Documentation
└── /playground → React SPA + ASP.NET API
```

## TODO

### Backend ✅
- [x] Design API contract
- [x] Create project structure
- [x] Implement compilation
- [x] Implement session management
- [x] Error handling

### Frontend 🚧
- [ ] Setup Vite project
- [ ] Build Monaco editor
- [ ] Build preview component
- [ ] Build prediction overlay
- [ ] Build metrics dashboard
- [ ] Build hint builder
- [ ] Implement API hooks
- [ ] Add error states
- [ ] Add loading states

### Integration 🔌
- [ ] Connect predictor
- [ ] Connect reconciler
- [ ] VNode to HTML rendering
- [ ] Test E2E flow

### Deployment 🚀
- [ ] Docker image
- [ ] CI/CD pipeline
- [ ] Domain setup
- [ ] SSL certificates

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

Contributions welcome! Areas:
- UI/UX improvements
- Performance optimization
- Bug fixes
- Documentation
- Example components

## License

MIT - See [LICENSE](../../LICENSE)

## Support

- **Issues**: [GitHub Issues](https://github.com/minimact/minimact/issues)
- **Discussions**: [GitHub Discussions](https://github.com/minimact/minimact/discussions)
- **Email**: ameritusweb@gmail.com

---

**Built with ❤️ for React developers coming to .NET**

[Get Started](#quick-start) | [View Docs](./QUICKSTART.md) | [Report Bug](https://github.com/minimact/minimact/issues)
