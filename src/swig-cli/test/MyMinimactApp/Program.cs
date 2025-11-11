using Minimact.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Add Minimact services
builder.Services.AddMinimact();
builder.Services.AddMinimactMvcBridge(); // Enable MVC Bridge

// Add MVC services
builder.Services.AddControllersWithViews();

// Add SignalR (required for Minimact real-time communication)
builder.Services.AddSignalR();

var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();

app.MapControllers();
app.MapHub<Minimact.AspNetCore.SignalR.MinimactHub>("/minimact");

app.Run();
