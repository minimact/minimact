# Minimact Playground Backend

ASP.NET Core 8.0 web API for the Minimact Playground - allows users to compile and run TSX components with real-time prediction visualization.

## Quick Start

### Prerequisites
- .NET 8.0 SDK or later
- Visual Studio 2022 or VS Code

### Build
```bash
cd playground/backend
dotnet build
```

### Run
```bash
dotnet run
```

Server will start on `https://localhost:5001` and `http://localhost:5000`

### Development
```bash
dotnet watch run
# Auto-recompiles on file changes
```

## API Endpoints

### POST /api/playground/compile

Compile C# code and prepare a component for interaction.

**Request:**
```json
{
  "csharpCode": "public class Counter : MinimactComponent { ... }",
  "predictHints": []
}
```

**Response:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "html": "<div>...</div>",
  "vnode": { ... },
  "predictions": [ ... ],
  "compilationTimeMs": 234
}
```

### POST /api/playground/interact

Handle user interaction and return patches with cache hit/miss info.

**Request:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "click",
  "elementId": "button-1",
  "stateChanges": { "count": 1 }
}
```

**Response:**
```json
{
  "elapsedMs": 3,
  "cacheHit": true,
  "latency": "3ms 🟢 CACHED",
  "actualPatches": [ ... ],
  "predictedPatches": [ ... ],
  "predictionConfidence": 0.95,
  "html": "<div>...</div>"
}
```

### GET /api/playground/metrics/{sessionId}

Get aggregated metrics for a session.

**Response:**
```json
{
  "totalInteractions": 15,
  "cacheHits": 13,
  "hitRate": 86.67,
  "avgPredictedLatency": 2.3,
  "avgComputedLatency": 16.8,
  "recentInteractions": [ ... ]
}
```

### GET /api/playground/health

Health check endpoint.

## Project Structure

```
playground/backend/
├── Controllers/
│   └── PlaygroundController.cs      # API endpoints
├── Services/
│   ├── CompilationService.cs        # C# compilation via Roslyn
│   ├── PlaygroundService.cs         # Core playground logic
│   └── PlaygroundSession.cs         # Session management
├── Models/
│   ├── Requests.cs                  # Request DTOs
│   └── Responses.cs                 # Response DTOs
├── Program.cs                       # DI and middleware setup
├── appsettings.json                 # Configuration
├── appsettings.Development.json     # Dev configuration
├── Minimact.Playground.csproj       # Project file
└── README.md                        # This file
```

## Key Features

### 1. Real-time C# Compilation
Uses Roslyn to compile C# code at runtime and instantiate components dynamically.

### 2. Prediction Tracking
Tracks cache hits/misses and measures latency differences:
- 🟢 **Cache Hit**: Predicted patches (2-3ms)
- 🔴 **Cache Miss**: Recomputed patches (15-20ms)

### 3. Session Management
Maintains component instances and state across multiple interactions with automatic cleanup of expired sessions (30-minute timeout).

### 4. Metrics Aggregation
Collects interaction metrics and calculates:
- Cache hit rate
- Average latencies (predicted vs computed)
- Time savings per interaction
- Interaction history

## Dependencies

- **Microsoft.AspNetCore.OpenApi** - OpenAPI support
- **Swashbuckle.AspNetCore** - Swagger UI
- **Microsoft.CodeAnalysis.CSharp** - Roslyn C# compiler
- **Newtonsoft.Json** - JSON serialization
- **Minimact.AspNetCore** - Component framework (project reference)

## Configuration

Settings in `appsettings.json`:

```json
{
  "Playground": {
    "SessionTimeoutMinutes": 30,    // Session expiration time
    "MaxSessions": 1000,             // Max concurrent sessions
    "CompilationTimeoutSeconds": 30  // Compilation timeout
  }
}
```

## Development Notes

### TODOs
- [ ] Integrate actual VNode to HTML rendering
- [ ] Integrate Rust predictor for caching
- [ ] Integrate Rust reconciler for patch computation
- [ ] Add support for usePredictHint directives
- [ ] Add performance profiling

### Testing
```bash
# Run tests (when added)
dotnet test
```

### CORS
Configured to accept requests from:
- `http://localhost:3000` - Vite dev server
- `http://localhost:5000` - Local ASP.NET
- `https://minimact.com` - Production

Add more origins in `Program.cs` as needed.

## Deployment

### Docker
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 as builder
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=builder /app .
EXPOSE 80
CMD ["dotnet", "Minimact.Playground.dll"]
```

### Azure App Service
```bash
dotnet publish -c Release -o ./publish
# Deploy publish folder to Azure
```

## Troubleshooting

### Compilation Fails
Check that your C# code:
- Inherits from `MinimactComponent`
- Implements `Render()` method
- Has valid C# syntax

### Session Not Found
Sessions expire after 30 minutes of inactivity. Recompile to start a new session.

### CORS Errors
Add your origin to the CORS policy in `Program.cs` under `WithOrigins()`.

## Contributing

See main [CONTRIBUTING.md](../../CONTRIBUTING.md)

## License

MIT - See [LICENSE](../../LICENSE)
