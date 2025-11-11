using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;

namespace MyMinimactApp.Controllers;

[ApiController]
[Route("")]
public class HomeController : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;

    public HomeController(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        return await _renderer.RenderPage<Minimact.Components.CounterPage>(
            pageTitle: "Counter - Minimact"
        );
    }
}
