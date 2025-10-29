using Microsoft.AspNetCore.Mvc;
using Minimact.Swig.Services;

namespace Minimact.Swig.Controllers;

public class InspectorController : Controller
{
    private readonly ILogger<InspectorController> _logger;
    private readonly MetricsCollector _metricsCollector;

    public InspectorController(ILogger<InspectorController> logger, MetricsCollector metricsCollector)
    {
        _logger = logger;
        _metricsCollector = metricsCollector;
    }

    [HttpGet]
    public IActionResult Index(string? projectPath)
    {
        ViewBag.ProjectPath = projectPath;
        return View();
    }

    [HttpGet]
    public IActionResult GetMetrics()
    {
        var metrics = _metricsCollector.GetPerformanceStats();
        return Json(metrics);
    }
}
