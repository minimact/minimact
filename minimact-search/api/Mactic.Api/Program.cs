using Mactic.Api.Services;
using Mactic.Api.Data;
using Mactic.Api.Hubs;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddSignalR(); // ✨ Real-time updates!

// Add CORS for local development
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Database=mactic;Username=postgres;Password=postgres";

builder.Services.AddDbContext<MacticDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.UseVector(); // Enable pgvector
    }));

// Register services
builder.Services.AddScoped<IEventProcessor, EventProcessor>(); // Changed to Scoped for DB access
builder.Services.AddHttpClient<EmbeddingService>();
builder.Services.AddScoped<SearchService>();
builder.Services.AddScoped<ProfileService>(); // ✨ Auto-profile generation
builder.Services.AddSingleton<CommunityBroadcaster>(); // ✨ Real-time broadcasting

// Logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

var app = builder.Build();

app.UseCors();
app.UseAuthorization();
app.MapControllers();
app.MapHub<CommunityHub>("/hubs/community"); // ✨ Real-time community hub

// Welcome endpoint
app.MapGet("/", () => new
{
    service = "Mactic Event Ingestion API",
    tagline = "Stop crawling. Start running.",
    version = "0.1.0",
    status = "healthy",
    endpoints = new
    {
        events = "POST /api/events",
        health = "GET /api/events/health",
        stats = "GET /api/events/stats"
    },
    timestamp = DateTime.UtcNow
});

app.Logger.LogInformation("🌵 Mactic API starting...");
app.Logger.LogInformation("📡 Listening on: http://localhost:5000");
app.Logger.LogInformation("🔥 Ready to receive events!");

app.Run("http://localhost:5000");
