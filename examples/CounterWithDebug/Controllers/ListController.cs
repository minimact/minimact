using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;
using CounterWithDebug.Pages;

namespace CounterWithDebug.Controllers;

[ApiController]
public class ListController : Controller
{
    private readonly MinimactPageRenderer _renderer;

    public ListController(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    [HttpGet("/list")]
    public async Task<IActionResult> Index()
    {
        // Empty ViewModel
        var viewModel = new { };

        return await _renderer.RenderPage<ListPage>(
            viewModel,
            "List Page - Minimact SPA Demo",
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
