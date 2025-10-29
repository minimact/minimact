using Microsoft.AspNetCore.Mvc;
using Minimact.Swig.Models;
using Minimact.Swig.Services;
using System.Diagnostics;

namespace Minimact.Swig.Controllers;

public class ProjectController : Controller
{
    private readonly ILogger<ProjectController> _logger;
    private readonly ProjectManager _projectManager;
    private readonly TranspilerService _transpiler;
    private readonly AutoTranspileService _autoTranspile;
    private readonly ProcessController _processController;

    public ProjectController(
        ILogger<ProjectController> logger,
        ProjectManager projectManager,
        TranspilerService transpiler,
        AutoTranspileService autoTranspile,
        ProcessController processController)
    {
        _logger = logger;
        _projectManager = projectManager;
        _transpiler = transpiler;
        _autoTranspile = autoTranspile;
        _processController = processController;
    }

    [HttpGet]
    public IActionResult Create()
    {
        return View();
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateProjectViewModel model)
    {
        if (!ModelState.IsValid)
        {
            return View(model);
        }

        try
        {
            var fullPath = Path.Combine(model.TargetDirectory, model.ProjectName);
            var project = await _projectManager.CreateProject(fullPath, model.Template ?? "Counter");

            _logger.LogInformation($"✅ Created project: {model.ProjectName} at {fullPath}");

            return RedirectToAction("Dashboard", new { projectPath = project.Path });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Failed to create project: {model.ProjectName}");
            ModelState.AddModelError("", $"Failed to create project: {ex.Message}");
            return View(model);
        }
    }

    [HttpGet]
    public async Task<IActionResult> Dashboard(string projectPath)
    {
        if (string.IsNullOrEmpty(projectPath))
        {
            return RedirectToAction("Index", "Home");
        }

        try
        {
            var project = await _projectManager.LoadProject(projectPath);

            // Enable auto-transpilation for this project
            _autoTranspile.EnableAutoTranspile(project);

            // Create view model with additional state
            var viewModel = new ProjectDashboardViewModel
            {
                Project = project,
                IsRunning = _processController.IsRunning,
                Port = project.Port
            };

            return View(viewModel);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Failed to load project: {projectPath}");
            TempData["Error"] = $"Failed to load project: {ex.Message}";
            return RedirectToAction("Index", "Home");
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreatePage(string projectPath, string pageName, string route)
    {
        if (string.IsNullOrEmpty(projectPath) || string.IsNullOrEmpty(pageName))
        {
            return BadRequest("Project path and page name are required");
        }

        try
        {
            // TODO: Implement PageGenerator service
            // For now, just return success
            _logger.LogInformation($"Creating page: {pageName} at route: {route}");

            return RedirectToAction("Dashboard", new { projectPath });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Failed to create page: {pageName}");
            return BadRequest($"Failed to create page: {ex.Message}");
        }
    }

    [HttpPost]
    public IActionResult OpenInEditor(string filePath, string editor = "code")
    {
        if (string.IsNullOrEmpty(filePath) || !System.IO.File.Exists(filePath))
        {
            return BadRequest("File not found");
        }

        try
        {
            // Launch editor
            var startInfo = new ProcessStartInfo
            {
                FileName = editor,
                Arguments = $"\"{filePath}\"",
                UseShellExecute = true
            };

            Process.Start(startInfo);

            _logger.LogInformation($"✅ Opened {filePath} in {editor}");
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Failed to open file in editor");
            return BadRequest($"Failed to open file: {ex.Message}");
        }
    }

    [HttpPost]
    public async Task<IActionResult> Build(string projectPath)
    {
        if (string.IsNullOrEmpty(projectPath))
        {
            return BadRequest("Project path is required");
        }

        try
        {
            var result = await _processController.Build(projectPath);
            return Json(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Build failed");
            return Json(new { success = false, error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Run(string projectPath, int port = 5000)
    {
        if (string.IsNullOrEmpty(projectPath))
        {
            return BadRequest("Project path is required");
        }

        try
        {
            var success = await _processController.StartApp(projectPath, port);
            return Json(new { success, isRunning = _processController.IsRunning, port });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Failed to start app");
            return Json(new { success = false, error = ex.Message });
        }
    }

    [HttpPost]
    public IActionResult Stop()
    {
        try
        {
            _processController.StopApp();
            return Json(new { success = true, isRunning = false });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Failed to stop app");
            return Json(new { success = false, error = ex.Message });
        }
    }

    [HttpPost]
    public IActionResult OpenBrowser(string url)
    {
        if (string.IsNullOrEmpty(url))
        {
            return BadRequest("URL is required");
        }

        try
        {
            var startInfo = new ProcessStartInfo(url)
            {
                UseShellExecute = true
            };

            Process.Start(startInfo);

            _logger.LogInformation($"✅ Opened browser: {url}");
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Failed to open browser");
            return BadRequest($"Failed to open browser: {ex.Message}");
        }
    }

    [HttpPost]
    public async Task<IActionResult> Transpile(string projectPath)
    {
        if (string.IsNullOrEmpty(projectPath))
        {
            return BadRequest("Project path is required");
        }

        try
        {
            var project = await _projectManager.LoadProject(projectPath);
            var result = await _transpiler.TranspileProject(project);
            return Json(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Transpilation failed");
            return Json(new { success = false, error = ex.Message });
        }
    }
}
