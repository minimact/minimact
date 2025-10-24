using Minimact.Playground.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Use camelCase for JSON serialization to match JavaScript conventions
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add SignalR for real-time communication
builder.Services.AddSignalR();

// Register playground services
builder.Services.AddSingleton<CompilationService>();
builder.Services.AddSingleton<SessionManager>();
builder.Services.AddSingleton<PlaygroundService>();

// Register Minimact core services
builder.Services.AddSingleton<Minimact.AspNetCore.Core.ComponentRegistry>();

// Configure CORS for local development and minimact.com
builder.Services.AddCors(options =>
{
    options.AddPolicy("PlaygroundCORS", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:3000",      // React dev server (legacy)
                "http://localhost:5173",      // Vite dev server
                "http://localhost:5000",      // Local ASP.NET
                "https://minimact.com",       // Production
                "https://www.minimact.com"    // Production www
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// Configure logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("PlaygroundCORS");

// Serve static files from wwwroot
app.UseStaticFiles();

app.UseAuthorization();
app.MapControllers();

// Map SignalR hub
app.MapHub<Minimact.AspNetCore.SignalR.MinimactHub>("/minimact");

// Health check endpoint
app.MapGet("/health", () => new
{
    status = "ok",
    timestamp = DateTime.UtcNow,
    environment = app.Environment.EnvironmentName
}).WithName("Health").WithOpenApi();

// Background task: Clean up expired sessions every 5 minutes
_ = Task.Run(async () =>
{
    var sessionManager = app.Services.GetRequiredService<SessionManager>();
    var logger = app.Services.GetRequiredService<ILogger<Program>>();

    while (true)
    {
        try
        {
            await Task.Delay(TimeSpan.FromMinutes(5));
            var cleaned = sessionManager.CleanupExpiredSessions();
            if (cleaned > 0)
            {
                logger.LogInformation("Cleaned up {Count} expired sessions", cleaned);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in session cleanup task");
        }
    }
});

app.Run();
