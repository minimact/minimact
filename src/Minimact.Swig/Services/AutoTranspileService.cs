using Minimact.Swig.Models;

namespace Minimact.Swig.Services;

/// <summary>
/// Automatically transpiles TSX files when they change
/// </summary>
public class AutoTranspileService
{
    private readonly ProjectManager _projectManager;
    private readonly TranspilerService _transpiler;
    private readonly ILogger<AutoTranspileService> _logger;
    private MinimactProject? _currentProject;

    public AutoTranspileService(
        ProjectManager projectManager,
        TranspilerService transpiler,
        ILogger<AutoTranspileService> logger)
    {
        _projectManager = projectManager;
        _transpiler = transpiler;
        _logger = logger;
    }

    /// <summary>
    /// Enable auto-transpile for a project
    /// </summary>
    public void EnableAutoTranspile(MinimactProject project)
    {
        _currentProject = project;

        _projectManager.WatchForChanges(project, async (filePath) =>
        {
            // Only transpile TSX/JSX files
            if (filePath.EndsWith(".tsx") || filePath.EndsWith(".jsx"))
            {
                _logger.LogInformation($"📝 TSX file changed, auto-transpiling: {Path.GetFileName(filePath)}");

                var result = await _transpiler.TranspileFile(filePath);

                if (result.Success)
                {
                    var csPath = filePath
                        .Replace(".tsx", ".cs")
                        .Replace(".jsx", ".cs");

                    await File.WriteAllTextAsync(csPath, result.Code!);

                    _logger.LogInformation($"✅ Auto-transpiled: {Path.GetFileName(filePath)} → {Path.GetFileName(csPath)}");

                    // TODO: Trigger hot reload if app is running
                }
                else
                {
                    _logger.LogError($"❌ Auto-transpilation failed: {result.Error}");
                }
            }
        });

        _logger.LogInformation($"🎯 Auto-transpile enabled for: {project.Name}");
    }

    /// <summary>
    /// Disable auto-transpile
    /// </summary>
    public void DisableAutoTranspile()
    {
        _projectManager.StopWatching();
        _currentProject = null;
        _logger.LogInformation("⏸️ Auto-transpile disabled");
    }

    public bool IsEnabled => _currentProject != null;
}
