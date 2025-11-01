using Minimact.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Add Minimact services
builder.Services.AddMinimact();
builder.Services.AddMinimactMvcBridge(); // ✅ Enable MVC Bridge

// Add MVC
builder.Services.AddControllersWithViews();

var app = builder.Build();

// Configure middleware
app.UseStaticFiles();
app.UseRouting();

app.UseEndpoints(endpoints =>
{
    // MVC routes
    endpoints.MapControllerRoute(
        name: "default",
        pattern: "{controller=Home}/{action=Index}/{id?}");

    // SignalR hub
    endpoints.MapHub<Minimact.AspNetCore.SignalR.MinimactHub>("/minimact");
});

Console.WriteLine("🎉 MVC Bridge Examples running!");
Console.WriteLine("📍 Counter:  http://localhost:5000/Examples/Counter");
Console.WriteLine("📍 TodoList: http://localhost:5000/Examples/TodoList");
Console.WriteLine("📍 Home:     http://localhost:5000");

app.Run();
