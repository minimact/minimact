using Minimact.AspNetCore.Extensions;
using Minimact.AspNetCore.SignalR;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMinimact(options =>
{
    options.EnableClientDebugMode = true;  // 🔥 Enable client debug breakpoints!
});
builder.Services.AddMinimactSPA();      // ✨ Enable SPA support (includes page renderer)

builder.Services.AddControllersWithViews();
builder.Services.AddSignalR();

var app = builder.Build();

app.UseStaticFiles();

// Serve mact_modules for @minimact/spa
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(app.Environment.ContentRootPath, "mact_modules")),
    RequestPath = "/mact_modules"
});

app.UseMinimact();  // Auto-discovers shells and pages
app.MapControllers();
app.MapHub<MinimactHub>("/minimact");

Console.WriteLine("🔥 Debug Mode Active!");
Console.WriteLine("Set breakpoint: MinimactHub.cs line 27 (DebugMessage method)");
Console.WriteLine("Navigate to: http://localhost:5000");

app.Run();
