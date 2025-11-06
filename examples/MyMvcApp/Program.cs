using Minimact.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Enable detailed logging for SignalR debugging
builder.Logging.AddFilter("Microsoft.AspNetCore.SignalR", LogLevel.Debug);
builder.Logging.AddFilter("Microsoft.AspNetCore.Http.Connections", LogLevel.Debug);
builder.Logging.AddFilter("Microsoft.AspNetCore.Cors", LogLevel.Debug);

// Add CORS for Electron/DevTools
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Add Minimact services
builder.Services.AddMinimact();
builder.Services.AddMinimactMvcBridge(); // Enable MVC Bridge

// Add MVC services
builder.Services.AddControllersWithViews();

// Add SignalR (required for Minimact real-time communication)
builder.Services.AddSignalR();

var app = builder.Build();

app.UseStaticFiles();

// Enable CORS
app.UseCors();

// Enable Minimact with helpful welcome page
app.UseMinimact(options => {
    options.UseWelcomePage = true;
});

app.MapControllers();

app.Run();
