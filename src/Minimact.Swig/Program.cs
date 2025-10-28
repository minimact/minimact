using Minimact.Swig.Hubs;
using Minimact.Swig.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

// Add SignalR
builder.Services.AddSignalR();

// Add Minimact.Swig services
builder.Services.AddSingleton<MetricsCollector>();
builder.Services.AddSingleton<ProjectManager>();
builder.Services.AddSingleton<TranspilerService>();
builder.Services.AddSingleton<AutoTranspileService>();
builder.Services.AddSingleton<ProcessController>();

// Add CORS for local development (Swig UI may run on different port)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();

// Enable CORS
app.UseCors("AllowAll");

app.UseRouting();

app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();

// Map SignalR hub
app.MapHub<SwigHub>("/hubs/swig");

Console.WriteLine("================================================================================");
Console.WriteLine("🎯 Minimact Swig - Developer Tools Platform");
Console.WriteLine("================================================================================");
Console.WriteLine($"Dashboard: http://localhost:5001");
Console.WriteLine($"SignalR Hub: http://localhost:5001/hubs/swig");
Console.WriteLine("================================================================================");

app.Run();
