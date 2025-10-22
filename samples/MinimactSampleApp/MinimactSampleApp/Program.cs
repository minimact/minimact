using Minimact.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Add Minimact services
builder.Services.AddMinimact();

var app = builder.Build();

// Auto-discover pages and configure routing (reads Generated/routes.json)
app.UseMinimact();

app.Run();
