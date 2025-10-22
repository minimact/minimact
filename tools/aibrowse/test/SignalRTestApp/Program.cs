using SignalRTestApp;

var builder = WebApplication.CreateBuilder(args);

// Add SignalR
builder.Services.AddSignalR();

// Add CORS for development
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors();

// Serve static files
app.UseStaticFiles();

// Map SignalR hub
app.MapHub<MinimactHub>("/minimact");

// Serve the test page
app.MapGet("/", () => Results.Redirect("/index.html"));

Console.WriteLine("SignalR Test App running on http://localhost:5000");
Console.WriteLine("SignalR Hub available at /minimact");

app.Run();
