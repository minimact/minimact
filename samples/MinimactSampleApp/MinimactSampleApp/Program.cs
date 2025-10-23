using Minimact.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Add Minimact services
builder.Services.AddMinimact();

var app = builder.Build();

// Serve static files (for minimact.js)
app.UseStaticFiles();

// Auto-discover pages and configure routing (reads Generated/routes.json)
app.UseMinimact();

app.Run();
