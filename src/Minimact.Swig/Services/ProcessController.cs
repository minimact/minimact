using System.Diagnostics;

namespace Minimact.Swig.Services;

/// <summary>
/// Controls the target Minimact app process (build, run, stop)
/// </summary>
public class ProcessController
{
    private readonly ILogger<ProcessController> _logger;
    private Process? _currentProcess;
    private readonly object _lock = new();

    public bool IsRunning { get; private set; }
    public int? ProcessId => _currentProcess?.Id;

    public ProcessController(ILogger<ProcessController> logger)
    {
        _logger = logger;
    }

    // ============================================================
    // Build
    // ============================================================

    /// <summary>
    /// Build the project using dotnet build
    /// </summary>
    public async Task<BuildResult> Build(string projectPath)
    {
        _logger.LogInformation($"🔨 Building project: {projectPath}");

        var startInfo = new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = $"build \"{projectPath}\"",
            WorkingDirectory = projectPath,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = Process.Start(startInfo);
        if (process == null)
        {
            return new BuildResult
            {
                Success = false,
                Error = "Failed to start build process"
            };
        }

        var output = await process.StandardOutput.ReadToEndAsync();
        var error = await process.StandardError.ReadToEndAsync();

        await process.WaitForExitAsync();

        if (process.ExitCode != 0)
        {
            _logger.LogError($"❌ Build failed:\n{error}");
            return new BuildResult
            {
                Success = false,
                Error = error,
                Output = output
            };
        }

        _logger.LogInformation($"✅ Build succeeded");
        return new BuildResult
        {
            Success = true,
            Output = output
        };
    }

    // ============================================================
    // Run / Stop
    // ============================================================

    /// <summary>
    /// Start the app using dotnet run
    /// </summary>
    public async Task<bool> StartApp(string projectPath, int port)
    {
        lock (_lock)
        {
            if (IsRunning)
            {
                _logger.LogWarning("⚠️ App is already running");
                return false;
            }
        }

        _logger.LogInformation($"▶️ Starting app on port {port}...");

        var startInfo = new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = $"run --project \"{projectPath}\" --urls http://localhost:{port}",
            WorkingDirectory = projectPath,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        try
        {
            _currentProcess = Process.Start(startInfo);

            if (_currentProcess == null)
            {
                _logger.LogError("❌ Failed to start app process");
                return false;
            }

            // Stream output to logger
            _currentProcess.OutputDataReceived += (sender, args) =>
            {
                if (!string.IsNullOrEmpty(args.Data))
                    _logger.LogInformation($"[App] {args.Data}");
            };

            _currentProcess.ErrorDataReceived += (sender, args) =>
            {
                if (!string.IsNullOrEmpty(args.Data))
                    _logger.LogError($"[App Error] {args.Data}");
            };

            _currentProcess.BeginOutputReadLine();
            _currentProcess.BeginErrorReadLine();

            IsRunning = true;
            _logger.LogInformation($"✅ App started (PID: {_currentProcess.Id}) on http://localhost:{port}");

            // Monitor process exit
            _ = Task.Run(async () =>
            {
                await _currentProcess.WaitForExitAsync();
                lock (_lock)
                {
                    IsRunning = false;
                }
                _logger.LogWarning($"⚠️ App process exited (exit code: {_currentProcess.ExitCode})");
            });

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to start app");
            return false;
        }
    }

    /// <summary>
    /// Stop the running app
    /// </summary>
    public void StopApp()
    {
        lock (_lock)
        {
            if (_currentProcess != null && !_currentProcess.HasExited)
            {
                _logger.LogInformation($"■ Stopping app (PID: {_currentProcess.Id})...");

                try
                {
                    _currentProcess.Kill(entireProcessTree: true);
                    _currentProcess.Dispose();
                    _currentProcess = null;
                    IsRunning = false;

                    _logger.LogInformation("✅ App stopped");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ Failed to stop app");
                }
            }
            else
            {
                _logger.LogWarning("⚠️ No app is running");
            }
        }
    }

    /// <summary>
    /// Restart the app
    /// </summary>
    public async Task<bool> RestartApp(string projectPath, int port)
    {
        _logger.LogInformation("↻ Restarting app...");

        StopApp();

        // Wait a moment for the process to fully stop
        await Task.Delay(1000);

        return await StartApp(projectPath, port);
    }

    /// <summary>
    /// Trigger hot reload (for future implementation)
    /// </summary>
    public async Task TriggerHotReload()
    {
        // TODO: Implement proper hot reload mechanism
        // For now, just log
        _logger.LogInformation("🔥 Hot reload triggered (not yet implemented)");
        await Task.CompletedTask;
    }

    /// <summary>
    /// Get app status
    /// </summary>
    public AppStatus GetStatus()
    {
        return new AppStatus
        {
            IsRunning = IsRunning,
            ProcessId = ProcessId
        };
    }
}

// ============================================================
// Result Models
// ============================================================

/// <summary>
/// Result of a build operation
/// </summary>
public class BuildResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public string? Output { get; set; }
}

/// <summary>
/// Current status of the target app
/// </summary>
public class AppStatus
{
    public bool IsRunning { get; set; }
    public int? ProcessId { get; set; }
}
