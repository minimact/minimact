using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Minimact.Swig.Models;
using Minimact.Swig.Services;

namespace Minimact.Swig.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
    private readonly ProjectManager _projectManager;

    public HomeController(ILogger<HomeController> logger, ProjectManager projectManager)
    {
        _logger = logger;
        _projectManager = projectManager;
    }

    public async Task<IActionResult> Index()
    {
        var recentProjects = await _projectManager.GetRecentProjects();
        return View(recentProjects);
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
