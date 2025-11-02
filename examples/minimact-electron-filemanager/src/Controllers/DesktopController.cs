using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace MinimactElectronFileManager.Controllers;

/// <summary>
/// Desktop API Controller - Bridges C# with Electron APIs
///
/// This controller provides access to desktop features like file dialogs,
/// file system operations, and system information via HTTP endpoints.
/// The Electron main process handles the actual desktop integration.
/// </summary>
[ApiController]
[Route("api/desktop")]
public class DesktopController : ControllerBase
{
    private readonly ILogger<DesktopController> _logger;
    private readonly IWebHostEnvironment _environment;

    public DesktopController(ILogger<DesktopController> logger, IWebHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
    }

    /// <summary>
    /// Get directory contents
    /// </summary>
    [HttpGet("directory")]
    public IActionResult GetDirectory([FromQuery] string? path = null)
    {
        try
        {
            var targetPath = string.IsNullOrEmpty(path)
                ? Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)
                : path;

            if (!Directory.Exists(targetPath))
            {
                return NotFound(new { error = "Directory not found", path = targetPath });
            }

            var dirInfo = new DirectoryInfo(targetPath);

            // Get subdirectories
            var directories = dirInfo.GetDirectories()
                .Where(d => !d.Attributes.HasFlag(FileAttributes.Hidden | FileAttributes.System))
                .Select(d => new
                {
                    name = d.Name,
                    path = d.FullName,
                    type = "directory",
                    size = 0L,
                    extension = (string?)null,
                    modified = d.LastWriteTime,
                    created = d.CreationTime
                })
                .ToList();

            // Get files
            var files = dirInfo.GetFiles()
                .Where(f => !f.Attributes.HasFlag(FileAttributes.Hidden | FileAttributes.System))
                .Select(f => new
                {
                    name = f.Name,
                    path = f.FullName,
                    type = "file",
                    size = f.Length,
                    extension = (string?)f.Extension,
                    modified = f.LastWriteTime,
                    created = f.CreationTime
                })
                .ToList();

            // Combine and sort (directories first, then files)
            var items = directories.Concat(files).ToList();

            return Ok(new
            {
                currentPath = targetPath,
                parentPath = dirInfo.Parent?.FullName,
                items,
                totalFiles = files.Count,
                totalDirectories = directories.Count
            });
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(403, new { error = "Access denied" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading directory: {Path}", path);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get file statistics for the current directory
    /// </summary>
    [HttpGet("file-stats")]
    public IActionResult GetFileStats([FromQuery] string? path = null)
    {
        try
        {
            var targetPath = string.IsNullOrEmpty(path)
                ? Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)
                : path;

            if (!Directory.Exists(targetPath))
            {
                return NotFound(new { error = "Directory not found" });
            }

            var files = Directory.GetFiles(targetPath, "*", SearchOption.TopDirectoryOnly)
                .Select(f => new FileInfo(f))
                .ToList();

            // Group by extension
            var extensionStats = files
                .GroupBy(f => string.IsNullOrEmpty(f.Extension) ? "No Extension" : f.Extension.TrimStart('.').ToUpper())
                .Select(g => new
                {
                    extension = g.Key,
                    count = g.Count(),
                    totalSize = g.Sum(f => f.Length)
                })
                .OrderByDescending(g => g.count)
                .Take(10)
                .ToList();

            return Ok(new
            {
                totalFiles = files.Count,
                totalSize = files.Sum(f => f.Length),
                extensionStats
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting file stats");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Read file content (text files only, max 1MB)
    /// </summary>
    [HttpPost("read-file")]
    public async Task<IActionResult> ReadFile([FromBody] ReadFileRequest request)
    {
        try
        {
            if (!System.IO.File.Exists(request.Path))
            {
                return NotFound(new { error = "File not found" });
            }

            var fileInfo = new FileInfo(request.Path);

            // Limit to 1MB for safety
            if (fileInfo.Length > 1024 * 1024)
            {
                return BadRequest(new { error = "File too large (max 1MB)" });
            }

            var content = await System.IO.File.ReadAllTextAsync(request.Path);

            return Ok(new
            {
                path = request.Path,
                content,
                size = fileInfo.Length,
                modified = fileInfo.LastWriteTime
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading file: {Path}", request.Path);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get drive information
    /// </summary>
    [HttpGet("drives")]
    public IActionResult GetDrives()
    {
        try
        {
            var drives = DriveInfo.GetDrives()
                .Where(d => d.IsReady)
                .Select(d => new
                {
                    name = d.Name,
                    label = d.VolumeLabel,
                    type = d.DriveType.ToString(),
                    totalSize = d.TotalSize,
                    freeSpace = d.AvailableFreeSpace,
                    usedSpace = d.TotalSize - d.AvailableFreeSpace,
                    usedPercent = (int)((double)(d.TotalSize - d.AvailableFreeSpace) / d.TotalSize * 100)
                })
                .ToList();

            return Ok(drives);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting drives");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get system information
    /// </summary>
    [HttpGet("system-info")]
    public IActionResult GetSystemInfo()
    {
        return Ok(new
        {
            machineName = Environment.MachineName,
            userName = Environment.UserName,
            osVersion = Environment.OSVersion.ToString(),
            platform = Environment.OSVersion.Platform.ToString(),
            processorCount = Environment.ProcessorCount,
            systemDirectory = Environment.SystemDirectory,
            currentDirectory = Environment.CurrentDirectory,
            dotnetVersion = Environment.Version.ToString()
        });
    }
}

public class ReadFileRequest
{
    public string Path { get; set; } = string.Empty;
}
