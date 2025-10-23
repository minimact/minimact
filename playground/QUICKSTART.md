# Minimact Playground - Quick Start

## Project Structure

```
playground/
├── backend/                 # ASP.NET Core API
│   ├── Controllers/
│   ├── Services/
│   ├── Models/
│   ├── Program.cs
│   └── Minimact.Playground.csproj
│
└── frontend/                # React + Vite + TypeScript UI
    ├── src/
    ├── public/
    ├── vite.config.ts
    └── package.json
```

## Backend Status ✅

**COMPLETE**

The .NET backend is fully implemented with:
- ✅ All API endpoints defined and working
- ✅ Roslyn C# compilation
- ✅ Session management
- ✅ Metrics tracking
- ✅ Error handling
- ✅ CORS configured

### Run Backend

```bash
cd playground/backend
dotnet build
dotnet run

# Swagger UI: https://localhost:5001/swagger
```

## Frontend Status 🚧

**NEXT TO BUILD**

We need to create the React + Vite + TypeScript frontend with:

### Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── Editor.tsx              # Monaco editor
│   │   ├── Preview.tsx             # HTML preview
│   │   ├── PredictionOverlay.tsx   # Green/red visualization
│   │   ├── MetricsDashboard.tsx    # Stats display
│   │   ├── HintBuilder.tsx         # Hint UI
│   │   └── Layout.tsx              # Main layout
│   │
│   ├── hooks/
│   │   ├── usePlayground.ts        # API calls
│   │   ├── usePredictionTracker.ts # Track hits/misses
│   │   └── useMetrics.ts           # Aggregate stats
│   │
│   ├── services/
│   │   └── playground.api.ts       # HTTP client
│   │
│   ├── types/
│   │   └── playground.ts           # TypeScript interfaces
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Development Workflow

### Terminal 1: Backend
```bash
cd playground/backend
dotnet watch run
# Listens on http://localhost:5000 and https://localhost:5001
```

### Terminal 2: Frontend
```bash
cd playground/frontend
npm install
npm run dev
# Starts Vite dev server on http://localhost:3000
```

### Open Browser
Go to `http://localhost:3000` and you'll see the playground!

## Integration Points

### Frontend → Backend Communication

```typescript
// src/services/playground.api.ts
export const playgroundApi = {
  compile: async (code: string) => {
    const response = await fetch('http://localhost:5000/api/playground/compile', {
      method: 'POST',
      body: JSON.stringify({ csharpCode: code, predictHints: [] })
    });
    return response.json();
  },

  interact: async (sessionId: string, stateChanges: object) => {
    const response = await fetch('http://localhost:5000/api/playground/interact', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        eventType: 'click',
        stateChanges
      })
    });
    return response.json();
  },

  metrics: async (sessionId: string) => {
    const response = await fetch(
      `http://localhost:5000/api/playground/metrics/${sessionId}`
    );
    return response.json();
  }
};
```

## Key Data Flows

### 1. Compile Flow
```
User enters C# code
    ↓
Clicks "Run Full Demo"
    ↓
POST /api/playground/compile
    ↓
Backend: Roslyn compiles → instantiates → renders
    ↓
Response: { sessionId, html, predictions, compilationTimeMs }
    ↓
Frontend: Display HTML + show compilation time badge
```

### 2. Interact Flow
```
User clicks element in preview
    ↓
Frontend: Capture click, compute state change
    ↓
POST /api/playground/interact
    ↓
Backend: Apply state → check cache → return patches + timing
    ↓
Response: { cacheHit, latency, patches, html }
    ↓
Frontend:
  - If hit: Show 🟢 green overlay with latency
  - If miss: Show 🔴 red overlay with latency
  - Update metrics
  - Render new HTML via patches
```

### 3. Metrics Flow
```
Every interaction
    ↓
Backend: Record (eventType, cacheHit, latencyMs)
    ↓
Frontend: Every 500ms, fetch metrics
    ↓
GET /api/playground/metrics/{sessionId}
    ↓
Response: { hitRate, avgLatencies, recentInteractions }
    ↓
Frontend: Update dashboard with stats
```

## Visual Mockup

```
┌─────────────────────────────────────────────────────────┐
│ Minimact Playground                                     │
├──────────────────┬──────────────────────────────────────┤
│  CODE EDITOR     │ LIVE PREVIEW + METRICS              │
│                  │                                      │
│  function        │ ┌──────────────────────────────┐    │
│  Counter()...    │ │ <div>                        │    │
│                  │ │   <p>Count: 0</p>            │    │
│ [Run Full Demo]  │ │   <button>+1</button>        │    │
│                  │ │ </div>                       │    │
│                  │ └──────────────────────────────┘    │
│                  │                                      │
│                  │ Metrics:                            │
│                  │ • Cache Hit Rate: 85% (17/20)      │
│                  │ • Avg Latency (Cached): 2.3ms      │
│                  │ • Avg Latency (Computed): 16.8ms   │
│                  │ • Savings: 14.5ms per interaction  │
│                  │                                      │
│                  │ Recent: ✅ ✅ ❌ ✅ ✅             │
└──────────────────┴──────────────────────────────────────┘
```

## Common Tasks

### Add a New API Call
1. Define in `src/services/playground.api.ts`
2. Create hook in `src/hooks/usePlayground.ts`
3. Use hook in component

### Add a New Component
1. Create in `src/components/`
2. Export from `src/components/index.ts`
3. Import in `App.tsx` or parent

### Test an API Endpoint
```bash
# Using curl
curl -X POST http://localhost:5000/api/playground/compile \
  -H "Content-Type: application/json" \
  -d '{"csharpCode":"public class Test : MinimactComponent { ... }"}'

# Using Swagger UI
# Go to https://localhost:5001/swagger
```

## Troubleshooting

### CORS Error in Browser Console
Make sure backend is running and CORS is configured in `Program.cs`

### Backend Won't Compile
Check that you have .NET 8.0 SDK:
```bash
dotnet --version  # Should be 8.x.x
```

### Frontend Won't Start
```bash
cd playground/frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Next Steps

1. ✅ Backend complete - ready to use
2. 🚧 Frontend - create Vite project structure
3. 🔧 Build UI components one by one
4. 🧪 Test backend API integration
5. 🔌 Integrate Rust predictor/reconciler
6. 🚀 Deploy to minimact.com

---

**Current Status**: Backend ready for integration! Frontend coming next. 🎯
