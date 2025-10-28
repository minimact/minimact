# Minimact.Swig Implementation Plan V2

**The Complete Development Environment for Minimact**

> Not just a debugging tool—the ENTIRE development workflow orchestrator.
> Visual Studio + Swagger + Storybook + Chrome DevTools for Minimact.

---

## Vision Update

After reviewing the full scope in `swig2.txt`, Minimact.Swig is being expanded from a debugging tool to a **complete development environment** that handles:

1. **Project Management** - Create, open, and manage Minimact projects
2. **Auto-Transpilation** - TSX → C# on file save with file watching
3. **Process Control** - Start/stop/restart target apps
4. **Live Inspection** - Real-time component/state/performance monitoring
5. **Component Preview** - Storybook-like isolated component rendering
6. **Testing** - Visual regression testing and state coverage
7. **Production Build** - Bundle analysis and deployment validation

**The 2-Minute Developer Experience:**
```
1. git clone minimact-swig && cd minimact-swig && dotnet run
2. Browser opens → Click "Create new project"
3. Edit TSX in VS Code → Save
4. Swig auto-transpiles → Hot reload → Test instantly
5. Click "Build for Production" → Deploy
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│         Minimact.Swig (localhost:5001)                  │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │         PROJECT MANAGER                        │   │
│  │  - Browse/Create/Clone projects                │   │
│  │  - File tree view                              │   │
│  │  - Recent projects list                        │   │
│  └────────────────────────────────────────────────┘   │
│                    ↓                                    │
│  ┌────────────────────────────────────────────────┐   │
│  │         TRANSPILER SERVICE                     │   │
│  │  - FileSystemWatcher for TSX files             │   │
│  │  - Calls babel-plugin-minimact                 │   │
│  │  - Real-time error reporting                   │   │
│  │  - Side-by-side TSX/C# preview                 │   │
│  └────────────────────────────────────────────────┘   │
│                    ↓                                    │
│  ┌────────────────────────────────────────────────┐   │
│  │         PROCESS CONTROLLER                     │   │
│  │  - dotnet build / dotnet run                   │   │
│  │  - Process lifecycle management                │   │
│  │  - Log streaming                               │   │
│  │  - Hot reload triggering                       │   │
│  └────────────────────────────────────────────────┘   │
│                    ↓                                    │
│  ┌────────────────────────────────────────────────┐   │
│  │         SWIG HUB (SignalR)                     │   │
│  │  - Bidirectional communication                 │   │
│  │  - Telemetry collection                        │   │
│  │  - Control command routing                     │   │
│  └────────────────────────────────────────────────┘   │
│                    ↓                                    │
│  ┌────────────────────────────────────────────────┐   │
│  │         LIVE INSPECTOR                         │   │
│  │  - Component tree view                         │   │
│  │  - State inspector/editor                      │   │
│  │  - SignalR message monitor                     │   │
│  │  - Performance dashboard                       │   │
│  │  - Dependency graph                            │   │
│  └────────────────────────────────────────────────┘   │
│                    ↓                                    │
│  ┌────────────────────────────────────────────────┐   │
│  │         TESTING TOOLS                          │   │
│  │  - Component preview (Storybook-like)          │   │
│  │  - Visual regression testing                   │   │
│  │  - State transition coverage                   │   │
│  └────────────────────────────────────────────────┘   │
│                    ↓                                    │
│  ┌────────────────────────────────────────────────┐   │
│  │         PRODUCTION BUILD ANALYZER              │   │
│  │  - Bundle size analysis                        │   │
│  │  - Infinite loop detection                     │   │
│  │  - Performance validation                      │   │
│  │  - Deployment checklist                        │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         ↓
                SignalR Connection
                         ↓
┌─────────────────────────────────────────────────────────┐
│       Your Minimact App (localhost:5000)                │
│       - Instrumented via Minimact.Swig.Client           │
│       - Broadcasting telemetry in real-time             │
└─────────────────────────────────────────────────────────┘
```

---

## Revised Phase Breakdown

### **Phase 1: Foundation** ✅ (COMPLETED)

**Goal:** Core SignalR hub and instrumentation protocol

**Deliverables:**
- ✅ ASP.NET MVC project structure
- ✅ Instrumentation Protocol models (telemetry & commands)
- ✅ SwigHub (SignalR orchestration)
- ✅ MetricsCollector service
- ✅ Program.cs configured with SignalR and CORS

**Status:** Complete (Week 1)

---

### **Phase 2: Project Management** (NEW)

**Goal:** Enable opening, creating, and managing Minimact projects

#### 2.1 Project Models

```csharp
// Models/MinimactProject.cs
public class MinimactProject
{
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public int Port { get; set; } = 5000;
    public List<ProjectFile> Files { get; set; } = new();
    public DateTime LastOpened { get; set; }
    public string Version { get; set; } = "1.0.0";
}

public class ProjectFile
{
    public string Path { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Extension { get; set; } = string.Empty;
    public FileType Type { get; set; }
    public DateTime LastModified { get; set; }
}

public enum FileType
{
    TSX,
    CSharp,
    Config,
    Other
}

public class RecentProject
{
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public DateTime LastOpened { get; set; }
}
```

#### 2.2 ProjectManager Service

```csharp
// Services/ProjectManager.cs
using System.Text.Json;

namespace Minimact.Swig.Services;

public class ProjectManager
{
    private readonly ILogger<ProjectManager> _logger;
    private readonly string _recentProjectsPath;
    private FileSystemWatcher? _watcher;

    public ProjectManager(ILogger<ProjectManager> logger, IWebHostEnvironment env)
    {
        _logger = logger;
        _recentProjectsPath = Path.Combine(env.ContentRootPath, "Data", "recent-projects.json");
    }

    /// <summary>
    /// Load a Minimact project from disk
    /// </summary>
    public async Task<MinimactProject> LoadProject(string path)
    {
        if (!Directory.Exists(path))
        {
            throw new DirectoryNotFoundException($"Project directory not found: {path}");
        }

        var projectName = Path.GetFileName(path);
        var project = new MinimactProject
        {
            Name = projectName,
            Path = path,
            LastOpened = DateTime.UtcNow
        };

        // Scan for project files
        project.Files = await ScanProjectFiles(path);

        // Try to detect port from launchSettings.json or appsettings.json
        project.Port = await DetectPort(path);

        // Save to recent projects
        await AddToRecentProjects(project);

        _logger.LogInformation($"Loaded project: {projectName} from {path}");

        return project;
    }

    /// <summary>
    /// Create a new Minimact project from a template
    /// </summary>
    public async Task<MinimactProject> CreateProject(string targetPath, string templateName)
    {
        _logger.LogInformation($"Creating project at {targetPath} from template {templateName}");

        // TODO: Copy template files from embedded resources or templates folder
        // For now, just create basic structure
        Directory.CreateDirectory(targetPath);
        Directory.CreateDirectory(Path.Combine(targetPath, "Components"));
        Directory.CreateDirectory(Path.Combine(targetPath, "wwwroot"));

        // Create basic Counter.tsx
        var counterTsx = @"import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Counter</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
    </div>
  );
}";
        await File.WriteAllTextAsync(
            Path.Combine(targetPath, "Components", "Counter.tsx"),
            counterTsx
        );

        // Create .csproj file
        var projectName = Path.GetFileName(targetPath);
        var csproj = $@"<Project Sdk=""Microsoft.NET.Sdk.Web"">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include=""Minimact.AspNetCore"" Version=""1.0.0"" />
  </ItemGroup>
</Project>";
        await File.WriteAllTextAsync(
            Path.Combine(targetPath, $"{projectName}.csproj"),
            csproj
        );

        return await LoadProject(targetPath);
    }

    /// <summary>
    /// Get list of recent projects
    /// </summary>
    public async Task<List<RecentProject>> GetRecentProjects()
    {
        if (!File.Exists(_recentProjectsPath))
        {
            return new List<RecentProject>();
        }

        var json = await File.ReadAllTextAsync(_recentProjectsPath);
        return JsonSerializer.Deserialize<List<RecentProject>>(json) ?? new List<RecentProject>();
    }

    /// <summary>
    /// Watch for file changes in project
    /// </summary>
    public void WatchForChanges(MinimactProject project, Func<string, Task> onFileChanged)
    {
        _watcher?.Dispose();

        _watcher = new FileSystemWatcher(project.Path)
        {
            Filter = "*.*",
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName,
            IncludeSubdirectories = true
        };

        _watcher.Changed += async (sender, e) =>
        {
            if (e.ChangeType == WatcherChangeTypes.Changed)
            {
                // Debounce (editors often trigger multiple events)
                await Task.Delay(200);

                _logger.LogInformation($"File changed: {e.FullPath}");
                await onFileChanged(e.FullPath);
            }
        };

        _watcher.EnableRaisingEvents = true;
        _logger.LogInformation($"Watching for changes in: {project.Path}");
    }

    public void StopWatching()
    {
        _watcher?.Dispose();
        _watcher = null;
    }

    // ============================================================
    // Private Helpers
    // ============================================================

    private async Task<List<ProjectFile>> ScanProjectFiles(string projectPath)
    {
        var files = new List<ProjectFile>();

        var allFiles = Directory.GetFiles(projectPath, "*.*", SearchOption.AllDirectories);

        foreach (var filePath in allFiles)
        {
            var ext = Path.GetExtension(filePath).ToLower();
            var fileName = Path.GetFileName(filePath);

            // Skip bin, obj, node_modules
            if (filePath.Contains("\\bin\\") || filePath.Contains("\\obj\\") ||
                filePath.Contains("\\node_modules\\"))
                continue;

            var fileType = ext switch
            {
                ".tsx" or ".jsx" => FileType.TSX,
                ".cs" => FileType.CSharp,
                ".json" or ".csproj" => FileType.Config,
                _ => FileType.Other
            };

            files.Add(new ProjectFile
            {
                Path = filePath,
                Name = fileName,
                Extension = ext,
                Type = fileType,
                LastModified = File.GetLastWriteTimeUtc(filePath)
            });
        }

        return files;
    }

    private async Task<int> DetectPort(string projectPath)
    {
        // Try launchSettings.json first
        var launchSettingsPath = Path.Combine(projectPath, "Properties", "launchSettings.json");
        if (File.Exists(launchSettingsPath))
        {
            var json = await File.ReadAllTextAsync(launchSettingsPath);
            // Simple regex to find port (e.g., "applicationUrl": "http://localhost:5000")
            var match = System.Text.RegularExpressions.Regex.Match(json, @"localhost:(\d+)");
            if (match.Success && int.TryParse(match.Groups[1].Value, out var port))
            {
                return port;
            }
        }

        // Default
        return 5000;
    }

    private async Task AddToRecentProjects(MinimactProject project)
    {
        var recent = await GetRecentProjects();

        // Remove if already exists
        recent.RemoveAll(p => p.Path == project.Path);

        // Add to top
        recent.Insert(0, new RecentProject
        {
            Name = project.Name,
            Path = project.Path,
            LastOpened = project.LastOpened
        });

        // Keep only last 10
        if (recent.Count > 10)
        {
            recent = recent.Take(10).ToList();
        }

        // Save
        var directory = Path.GetDirectoryName(_recentProjectsPath);
        if (!Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory!);
        }

        var json = JsonSerializer.Serialize(recent, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(_recentProjectsPath, json);
    }
}
```

**Deliverables:**
- ✅ MinimactProject models
- ✅ ProjectManager service
- ✅ FileSystemWatcher integration
- ✅ Recent projects persistence

**Timeline:** Week 2 (3-4 days)

---

### **Phase 3: Auto-Transpilation**

**Goal:** Automatic TSX → C# transpilation on file save

#### 3.1 TranspilerService

```csharp
// Services/TranspilerService.cs
using System.Diagnostics;

namespace Minimact.Swig.Services;

public class TranspilerService
{
    private readonly ILogger<TranspilerService> _logger;
    private readonly string _babelPluginPath;

    public TranspilerService(ILogger<TranspilerService> logger, IWebHostEnvironment env)
    {
        _logger = logger;

        // Assume babel-plugin-minimact is in parent directory
        _babelPluginPath = Path.Combine(
            env.ContentRootPath,
            "..",
            "babel-plugin-minimact"
        );
    }

    /// <summary>
    /// Transpile a TSX file to C#
    /// </summary>
    public async Task<TranspileResult> TranspileFile(string tsxPath)
    {
        _logger.LogInformation($"Transpiling: {tsxPath}");

        var tempOutputPath = Path.GetTempFileName() + ".cs";

        try
        {
            // Run babel-plugin-minimact via Node.js
            var startInfo = new ProcessStartInfo
            {
                FileName = "node",
                Arguments = $"\"{_babelPluginPath}/cli.js\" \"{tsxPath}\" -o \"{tempOutputPath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(startInfo);
            if (process == null)
            {
                return TranspileResult.Failure("Failed to start transpiler process");
            }

            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();

            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                _logger.LogError($"Transpilation failed: {error}");
                return TranspileResult.Failure(error);
            }

            // Read generated C# code
            var csharpCode = await File.ReadAllTextAsync(tempOutputPath);

            _logger.LogInformation($"Transpilation successful: {tsxPath}");

            return TranspileResult.Success(csharpCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Transpilation error: {tsxPath}");
            return TranspileResult.Failure(ex.Message);
        }
        finally
        {
            // Cleanup
            if (File.Exists(tempOutputPath))
            {
                File.Delete(tempOutputPath);
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

        _logger.LogInformation($"Transpiling {tsxFiles.Count} TSX files...");

        foreach (var file in tsxFiles)
        {
            var result = await TranspileFile(file.Path);

            if (result.Success)
            {
                // Write C# file next to TSX file
                var csPath = file.Path.Replace(".tsx", ".cs").Replace(".jsx", ".cs");
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
        _logger.LogInformation($"Transpilation complete: {successCount}/{tsxFiles.Count} successful");

        return new TranspileProjectResult
        {
            Success = results.All(r => r.Success),
            Files = results
        };
    }
}

// Models
public class TranspileResult
{
    public bool Success { get; set; }
    public string? Code { get; set; }
    public string? Error { get; set; }

    public static TranspileResult Success(string code) =>
        new() { Success = true, Code = code };

    public static TranspileResult Failure(string error) =>
        new() { Success = false, Error = error };
}

public class TranspileProjectResult
{
    public bool Success { get; set; }
    public List<TranspileFileResult> Files { get; set; } = new();
}

public class TranspileFileResult
{
    public string FilePath { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? Error { get; set; }
}
```

#### 3.2 Integration with FileSystemWatcher

```csharp
// Services/AutoTranspileService.cs
namespace Minimact.Swig.Services;

public class AutoTranspileService
{
    private readonly ProjectManager _projectManager;
    private readonly TranspilerService _transpiler;
    private readonly ILogger<AutoTranspileService> _logger;

    public AutoTranspileService(
        ProjectManager projectManager,
        TranspilerService transpiler,
        ILogger<AutoTranspileService> logger)
    {
        _projectManager = projectManager;
        _transpiler = transpiler;
        _logger = logger;
    }

    public void EnableAutoTranspile(MinimactProject project)
    {
        _projectManager.WatchForChanges(project, async (filePath) =>
        {
            if (filePath.EndsWith(".tsx") || filePath.EndsWith(".jsx"))
            {
                _logger.LogInformation($"TSX file changed, auto-transpiling: {filePath}");

                var result = await _transpiler.TranspileFile(filePath);

                if (result.Success)
                {
                    var csPath = filePath.Replace(".tsx", ".cs").Replace(".jsx", ".cs");
                    await File.WriteAllTextAsync(csPath, result.Code!);

                    _logger.LogInformation($"✅ Auto-transpiled: {Path.GetFileName(filePath)}");

                    // TODO: Trigger hot reload if app is running
                }
                else
                {
                    _logger.LogError($"❌ Transpilation failed: {result.Error}");
                }
            }
        });
    }
}
```

**Deliverables:**
- ✅ TranspilerService (calls babel-plugin-minimact)
- ✅ Auto-transpile on TSX file save
- ✅ Error reporting
- ✅ Side-by-side TSX/C# preview (API endpoint)

**Timeline:** Week 2 (3-4 days)

---

### **Phase 4: Process Control**

**Goal:** Start, stop, restart, and manage target Minimact apps

#### 4.1 ProcessController

```csharp
// Services/ProcessController.cs
using System.Diagnostics;

namespace Minimact.Swig.Services;

public class ProcessController
{
    private readonly ILogger<ProcessController> _logger;
    private Process? _currentProcess;
    private readonly object _lock = new();

    public bool IsRunning { get; private set; }

    public ProcessController(ILogger<ProcessController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Build the project
    /// </summary>
    public async Task<BuildResult> Build(string projectPath)
    {
        _logger.LogInformation($"Building project: {projectPath}");

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
            return new BuildResult { Success = false, Error = "Failed to start build process" };
        }

        var output = await process.StandardOutput.ReadToEndAsync();
        var error = await process.StandardError.ReadToEndAsync();

        await process.WaitForExitAsync();

        if (process.ExitCode != 0)
        {
            _logger.LogError($"Build failed: {error}");
            return new BuildResult
            {
                Success = false,
                Error = error,
                Output = output
            };
        }

        _logger.LogInformation("Build succeeded");
        return new BuildResult { Success = true, Output = output };
    }

    /// <summary>
    /// Start the app
    /// </summary>
    public async Task<bool> StartApp(string projectPath, int port)
    {
        lock (_lock)
        {
            if (IsRunning)
            {
                _logger.LogWarning("App is already running");
                return false;
            }
        }

        _logger.LogInformation($"Starting app on port {port}...");

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

        _currentProcess = Process.Start(startInfo);

        if (_currentProcess == null)
        {
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
        _logger.LogInformation($"✅ App started on http://localhost:{port}");

        // Monitor process exit
        _ = Task.Run(async () =>
        {
            await _currentProcess.WaitForExitAsync();
            IsRunning = false;
            _logger.LogWarning("App process exited");
        });

        return true;
    }

    /// <summary>
    /// Stop the app
    /// </summary>
    public void StopApp()
    {
        lock (_lock)
        {
            if (_currentProcess != null && !_currentProcess.HasExited)
            {
                _logger.LogInformation("Stopping app...");
                _currentProcess.Kill(entireProcessTree: true);
                _currentProcess.Dispose();
                _currentProcess = null;
                IsRunning = false;
                _logger.LogInformation("✅ App stopped");
            }
        }
    }

    /// <summary>
    /// Restart the app
    /// </summary>
    public async Task<bool> RestartApp(string projectPath, int port)
    {
        StopApp();
        await Task.Delay(1000);
        return await StartApp(projectPath, port);
    }

    /// <summary>
    /// Trigger hot reload (sends SIGHUP or uses dotnet watch mechanism)
    /// </summary>
    public async Task TriggerHotReload()
    {
        // For now, just log
        // TODO: Implement proper hot reload mechanism
        _logger.LogInformation("Hot reload triggered");
    }
}

public class BuildResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public string? Output { get; set; }
}
```

**Deliverables:**
- ✅ ProcessController service
- ✅ dotnet build integration
- ✅ dotnet run with process management
- ✅ Log streaming
- ✅ Hot reload trigger (basic)

**Timeline:** Week 3 (2-3 days)

---

### **Phase 5: Web UI (React Frontend)**

**Goal:** Build the actual Swig dashboard UI

#### 5.1 Setup React + TypeScript + Vite

```bash
cd src/Minimact.Swig/wwwroot
npm create vite@latest swig-ui -- --template react-ts
cd swig-ui
npm install
npm install @microsoft/signalr
npm install lucide-react recharts
```

#### 5.2 Main App Structure

```tsx
// wwwroot/swig-ui/src/App.tsx
import { useState, useEffect } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { ProjectManager } from './pages/ProjectManager';
import { Inspector } from './pages/Inspector';
import { Transpiler } from './pages/Transpiler';
import { Performance } from './pages/Performance';

export function App() {
  const [connection, setConnection] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'project' | 'inspector' | 'transpiler' | 'performance'>('project');
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [targetAppConnected, setTargetAppConnected] = useState(false);

  useEffect(() => {
    // Connect to SwigHub
    const newConnection = new HubConnectionBuilder()
      .withUrl('http://localhost:5001/hubs/swig')
      .withAutomaticReconnect()
      .build();

    newConnection.on('TargetAppConnected', (appInfo) => {
      console.log('Target app connected:', appInfo);
      setTargetAppConnected(true);
    });

    newConnection.on('TargetAppDisconnected', (appName) => {
      console.log('Target app disconnected:', appName);
      setTargetAppConnected(false);
    });

    newConnection.start()
      .then(() => {
        console.log('Connected to Swig');
        setConnection(newConnection);
      })
      .catch(err => console.error('Connection failed:', err));

    return () => {
      newConnection.stop();
    };
  }, []);

  return (
    <div className="swig-app">
      <header className="swig-header">
        <h1>🌵 Minimact Swig</h1>
        <nav>
          <button onClick={() => setCurrentView('project')}>Project</button>
          <button onClick={() => setCurrentView('inspector')} disabled={!targetAppConnected}>
            Inspector {targetAppConnected && '✅'}
          </button>
          <button onClick={() => setCurrentView('transpiler')}>Transpiler</button>
          <button onClick={() => setCurrentView('performance')} disabled={!targetAppConnected}>
            Performance
          </button>
        </nav>
      </header>

      <main className="swig-main">
        {currentView === 'project' && (
          <ProjectManager onProjectLoaded={setCurrentProject} />
        )}
        {currentView === 'inspector' && connection && (
          <Inspector connection={connection} />
        )}
        {currentView === 'transpiler' && (
          <Transpiler project={currentProject} />
        )}
        {currentView === 'performance' && connection && (
          <Performance connection={connection} />
        )}
      </main>
    </div>
  );
}
```

#### 5.3 Project Manager Page

```tsx
// wwwroot/swig-ui/src/pages/ProjectManager.tsx
import { useState, useEffect } from 'react';
import { Folder, Plus, Download } from 'lucide-react';

export function ProjectManager({ onProjectLoaded }: { onProjectLoaded: (project: any) => void }) {
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Load recent projects
    fetch('http://localhost:5001/api/project/recent')
      .then(res => res.json())
      .then(data => setRecentProjects(data));
  }, []);

  const openProject = async () => {
    // TODO: Implement folder picker (requires native file API or server-side dialog)
    const path = prompt('Enter project path:');
    if (!path) return;

    const response = await fetch('http://localhost:5001/api/project/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });

    const project = await response.json();
    onProjectLoaded(project);
  };

  const createProject = async () => {
    const name = prompt('Project name:');
    if (!name) return;

    const path = prompt('Target directory:');
    if (!path) return;

    const response = await fetch('http://localhost:5001/api/project/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `${path}\\${name}`, template: 'Counter' })
    });

    const project = await response.json();
    onProjectLoaded(project);
  };

  return (
    <div className="project-manager">
      <div className="actions">
        <button onClick={openProject}>
          <Folder size={20} />
          Open Project
        </button>
        <button onClick={createProject}>
          <Plus size={20} />
          Create Project
        </button>
      </div>

      {recentProjects.length > 0 && (
        <div className="recent-projects">
          <h3>Recent Projects</h3>
          {recentProjects.map((project, i) => (
            <div key={i} className="recent-project" onClick={() => openProject()}>
              <span className="name">{project.name}</span>
              <span className="path">{project.path}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Deliverables:**
- ✅ React + TypeScript + Vite setup
- ✅ Main App with navigation
- ✅ Project Manager page
- ✅ Inspector page (reuse Phase 3 components from V1)
- ✅ Transpiler page
- ✅ Performance page (reuse Phase 3 components from V1)

**Timeline:** Week 3-4 (5-6 days)

---

### **Phase 6: API Controllers**

**Goal:** REST API endpoints for project management and transpilation

```csharp
// Controllers/ProjectController.cs
using Microsoft.AspNetCore.Mvc;
using Minimact.Swig.Services;

namespace Minimact.Swig.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectController : ControllerBase
{
    private readonly ProjectManager _projectManager;
    private readonly TranspilerService _transpiler;
    private readonly ProcessController _processController;

    public ProjectController(
        ProjectManager projectManager,
        TranspilerService transpiler,
        ProcessController processController)
    {
        _projectManager = projectManager;
        _transpiler = transpiler;
        _processController = processController;
    }

    [HttpGet("recent")]
    public async Task<IActionResult> GetRecentProjects()
    {
        var recent = await _projectManager.GetRecentProjects();
        return Ok(recent);
    }

    [HttpPost("open")]
    public async Task<IActionResult> OpenProject([FromBody] OpenProjectRequest request)
    {
        try
        {
            var project = await _projectManager.LoadProject(request.Path);
            return Ok(project);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("create")]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectRequest request)
    {
        try
        {
            var project = await _projectManager.CreateProject(request.Path, request.Template);
            return Ok(project);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("transpile")]
    public async Task<IActionResult> TranspileProject([FromBody] TranspileRequest request)
    {
        try
        {
            var project = await _projectManager.LoadProject(request.ProjectPath);
            var result = await _transpiler.TranspileProject(project);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("build")]
    public async Task<IActionResult> BuildProject([FromBody] BuildRequest request)
    {
        var result = await _processController.Build(request.ProjectPath);
        return Ok(result);
    }

    [HttpPost("run")]
    public async Task<IActionResult> RunProject([FromBody] RunRequest request)
    {
        var success = await _processController.StartApp(request.ProjectPath, request.Port);
        return Ok(new { success, isRunning = _processController.IsRunning });
    }

    [HttpPost("stop")]
    public IActionResult StopProject()
    {
        _processController.StopApp();
        return Ok(new { success = true });
    }
}

public record OpenProjectRequest(string Path);
public record CreateProjectRequest(string Path, string Template);
public record TranspileRequest(string ProjectPath);
public record BuildRequest(string ProjectPath);
public record RunRequest(string ProjectPath, int Port = 5000);
```

**Deliverables:**
- ✅ ProjectController with all endpoints
- ✅ Request/response models
- ✅ Error handling

**Timeline:** Week 4 (1-2 days)

---

### **Phase 7: Advanced Features** (FUTURE)

These features can be added after MVP:

1. **Component Preview** (Storybook-like)
2. **Visual Regression Testing**
3. **Production Build Analyzer**
4. **Deployment Tools**
5. **Dependency Graph Visualization**
6. **Hot Reload Integration** (proper)

**Timeline:** Week 5-8 (as needed)

---

## Updated Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Foundation | Week 1 | ✅ COMPLETE |
| Phase 2: Project Management | Week 2 (3-4 days) | 🔜 NEXT |
| Phase 3: Auto-Transpilation | Week 2 (3-4 days) | 🔜 NEXT |
| Phase 4: Process Control | Week 3 (2-3 days) | ⏳ Pending |
| Phase 5: Web UI | Week 3-4 (5-6 days) | ⏳ Pending |
| Phase 6: API Controllers | Week 4 (1-2 days) | ⏳ Pending |
| **MVP Complete** | **Week 4 End** | **Target** |
| Phase 7: Advanced Features | Week 5-8 | 📋 Future |

---

## What's Different from V1?

### V1 (Original Plan)
- Focus: Debugging tool
- Scope: SignalR inspector, state viewer, metrics
- Timeline: 8 weeks to MVP

### V2 (This Plan)
- Focus: **Complete development environment**
- Scope: Project management + transpilation + process control + debugging
- Timeline: **4 weeks to MVP** (focused on essentials)
- Key Addition: **Project Manager + Auto-Transpile + Run/Build controls**

### Why V2 is Better

1. **Lower Barrier to Entry** - One tool does everything
2. **Faster Feedback Loop** - Edit → Transpile → Run in seconds
3. **Professional Image** - "Visual Studio for Minimact"
4. **Competitive Moat** - No other framework has this

---

## Next Steps

1. ✅ **Complete Phase 1** - Foundation (DONE)
2. 🔜 **Start Phase 2** - Build ProjectManager service
3. 🔜 **Start Phase 3** - Build TranspilerService
4. 🔨 **Test Integration** - Verify project open → transpile → build workflow
5. 🎨 **Build UI** - React frontend for project management
6. 🚀 **Ship MVP** - Week 4 target

---

## Success Metrics

**MVP is successful if a new developer can:**
1. Clone minimact-swig
2. Run `dotnet run`
3. Click "Create new project"
4. Edit TSX in VS Code
5. See auto-transpilation happen
6. Click "Run" to start app
7. See live inspector with components/state
8. Deploy with confidence

**Time to First Working App: < 5 minutes**

---

**The vision from swig2.txt is clear: Build the best development experience in any web framework. Period.**

Let's make it happen. 🌵✨
