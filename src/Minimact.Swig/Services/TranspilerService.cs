using System.Diagnostics;
using Minimact.Swig.Models;

namespace Minimact.Swig.Services;

/// <summary>
/// Transpiles TSX files to C# using babel-plugin-minimact
/// </summary>
public class TranspilerService
{
    private readonly ILogger<TranspilerService> _logger;
    private readonly string _babelPluginPath;

    public TranspilerService(ILogger<TranspilerService> logger, IWebHostEnvironment env)
    {
        _logger = logger;

        // Assume babel-plugin-minimact is in parent directory of Swig
        _babelPluginPath = Path.Combine(
            env.ContentRootPath,
            "..",
            "..",
            "babel-plugin-minimact"
        );

        _logger.LogInformation($"Babel plugin path: {_babelPluginPath}");
    }

    /// <summary>
    /// Transpile a single TSX file to C#
    /// </summary>
    public async Task<TranspileResult> TranspileFile(string tsxPath)
    {
        _logger.LogInformation($"🔄 Transpiling: {Path.GetFileName(tsxPath)}");

        if (!File.Exists(tsxPath))
        {
            return TranspileResult.CreateFailure($"File not found: {tsxPath}");
        }

        var tempOutputPath = Path.GetTempFileName() + ".cs";

        try
        {
            // Check if babel plugin exists
            if (!Directory.Exists(_babelPluginPath))
            {
                return TranspileResult.CreateFailure($"Babel plugin not found at: {_babelPluginPath}");
            }

            // Run babel-plugin-minimact via Node.js
            var startInfo = new ProcessStartInfo
            {
                FileName = "node",
                Arguments = $"\"{Path.Combine(_babelPluginPath, "cli.js")}\" \"{tsxPath}\" -o \"{tempOutputPath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(startInfo);
            if (process == null)
            {
                return TranspileResult.CreateFailure("Failed to start transpiler process");
            }

            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();

            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                _logger.LogError($"❌ Transpilation failed: {error}");
                return TranspileResult.CreateFailure(error);
            }

            // Read generated C# code
            if (!File.Exists(tempOutputPath))
            {
                return TranspileResult.CreateFailure("Transpiler did not generate output file");
            }

            var csharpCode = await File.ReadAllTextAsync(tempOutputPath);

            _logger.LogInformation($"✅ Transpiled: {Path.GetFileName(tsxPath)}");

            return TranspileResult.CreateSuccess(csharpCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Transpilation error: {tsxPath}");
            return TranspileResult.CreateFailure(ex.Message);
        }
        finally
        {
            // Cleanup temp file
            if (File.Exists(tempOutputPath))
            {
                try { File.Delete(tempOutputPath); } catch { }
            }
        }
    }

    /// <summary>
    /// Transpile all TSX files in a project
    /// </summary>
    public async Task<TranspileProjectResult> TranspileProject(MinimactProject project)
    {
        var results = new List<TranspileFileResult>();

        var tsxFiles = project.Files.Where(f => f.Type == FileType.TSX).ToList();

        _logger.LogInformation($"🔄 Transpiling {tsxFiles.Count} TSX files...");

        foreach (var file in tsxFiles)
        {
            var result = await TranspileFile(file.Path);

            if (result.Success)
            {
                // Write C# file next to TSX file
                var csPath = file.Path
                    .Replace(".tsx", ".cs")
                    .Replace(".jsx", ".cs");

                await File.WriteAllTextAsync(csPath, result.Code!);

                results.Add(new TranspileFileResult
                {
                    FilePath = file.Path,
                    Success = true
                });
            }
            else
            {
                results.Add(new TranspileFileResult
                {
                    FilePath = file.Path,
                    Success = false,
                    Error = result.Error
                });
            }
        }

        var successCount = results.Count(r => r.Success);
        var failCount = results.Count(r => !r.Success);

        if (failCount > 0)
        {
            _logger.LogWarning($"⚠️ Transpilation complete: {successCount} succeeded, {failCount} failed");
        }
        else
        {
            _logger.LogInformation($"✅ Transpilation complete: {successCount}/{tsxFiles.Count} successful");
        }

        return new TranspileProjectResult
        {
            Success = results.All(r => r.Success),
            Files = results
        };
    }
}

// ============================================================
// Result Models
// ============================================================

/// <summary>
/// Result of transpiling a single file
/// </summary>
public class TranspileResult
{
    public bool Success { get; set; }
    public string? Code { get; set; }
    public string? Error { get; set; }

    public static TranspileResult CreateSuccess(string code) =>
        new() { Success = true, Code = code };

    public static TranspileResult CreateFailure(string error) =>
        new() { Success = false, Error = error };
}

/// <summary>
/// Result of transpiling an entire project
/// </summary>
public class TranspileProjectResult
{
    public bool Success { get; set; }
    public List<TranspileFileResult> Files { get; set; } = new();

    public int SuccessCount => Files.Count(f => f.Success);
    public int FailureCount => Files.Count(f => !f.Success);
    public List<TranspileFileResult> Errors => Files.Where(f => !f.Success).ToList();
}

/// <summary>
/// Result for a single file in a project transpilation
/// </summary>
public class TranspileFileResult
{
    public string FilePath { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? Error { get; set; }
}
