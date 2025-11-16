using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;
using CounterWithDebug.Pages;

namespace CounterWithDebug.Controllers;

[ApiController]
public class HomeController : Controller
{
    private readonly MinimactPageRenderer _renderer;

    public HomeController(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    [HttpGet("/")]
    public async Task<IActionResult> Index()
    {
        // Empty ViewModel (or add any data the page needs)
        var viewModel = new { };

        return await _renderer.RenderPage<CounterPage>(
            viewModel,
            "Minimact Counter - Debug Mode Demo",
            new MinimactPageRenderOptions
            {
                UseSPA = true,  // Enable SPA mode
                ShellName = "Default",
                EnableDebugLogging = true,
                EnableClientDebugMode = true,
                EnableCacheBusting = true
            });
    }
}
