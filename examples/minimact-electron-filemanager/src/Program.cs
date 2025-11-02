using Minimact.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Add Minimact services
builder.Services.AddMinimact();
builder.Services.AddControllers();

// Configure Kestrel for Electron
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5000);
});

var app = builder.Build();

// Configure middleware
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseStaticFiles();
app.UseRouting();

// Use Minimact middleware
app.UseMinimact();

app.MapControllers();

Console.WriteLine("Minimact Electron File Manager");
Console.WriteLine($"Environment: {app.Environment.EnvironmentName}");
Console.WriteLine($"Running in Electron: {Environment.GetEnvironmentVariable("ELECTRON_MODE") == "true"}");

app.Run();
