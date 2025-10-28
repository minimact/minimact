using System.Text.Json;
using System.Text.RegularExpressions;
using Minimact.Swig.Models;

namespace Minimact.Swig.Services;

/// <summary>
/// Manages Minimact projects: loading, creating, watching for changes
/// </summary>
public class ProjectManager
{
    private readonly ILogger<ProjectManager> _logger;
    private readonly IWebHostEnvironment _env;
    private readonly string _recentProjectsPath;
    private FileSystemWatcher? _watcher;

    public ProjectManager(ILogger<ProjectManager> logger, IWebHostEnvironment env)
    {
        _logger = logger;
        _env = env;
        _recentProjectsPath = Path.Combine(env.ContentRootPath, "Data", "recent-projects.json");
    }

    // ============================================================
    // Load & Create Projects
    // ============================================================

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

        _logger.LogInformation($"✅ Loaded project: {projectName} from {path}");

        return project;
    }

    /// <summary>
    /// Create a new Minimact project from a template
    /// </summary>
    public async Task<MinimactProject> CreateProject(string targetPath, string templateName)
    {
        _logger.LogInformation($"Creating project at {targetPath} from template {templateName}");

        if (Directory.Exists(targetPath))
        {
            throw new InvalidOperationException($"Directory already exists: {targetPath}");
        }

        // Create directory structure
        Directory.CreateDirectory(targetPath);
        Directory.CreateDirectory(Path.Combine(targetPath, "Components"));
        Directory.CreateDirectory(Path.Combine(targetPath, "wwwroot"));
        Directory.CreateDirectory(Path.Combine(targetPath, "Properties"));

        var projectName = Path.GetFileName(targetPath);

        // Create template files based on template name
        if (templateName == "Counter")
        {
            await CreateCounterTemplate(targetPath, projectName);
        }
        else if (templateName == "TodoApp")
        {
            await CreateTodoAppTemplate(targetPath, projectName);
        }
        else
        {
            await CreateBlankTemplate(targetPath, projectName);
        }

        _logger.LogInformation($"✅ Created project: {projectName}");

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

        try
        {
            var json = await File.ReadAllTextAsync(_recentProjectsPath);
            return JsonSerializer.Deserialize<List<RecentProject>>(json) ?? new List<RecentProject>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load recent projects");
            return new List<RecentProject>();
        }
    }

    // ============================================================
    // File Watching
    // ============================================================

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

                // Ignore bin, obj, node_modules
                if (e.FullPath.Contains("\\bin\\") || e.FullPath.Contains("\\obj\\") ||
                    e.FullPath.Contains("\\node_modules\\"))
                {
                    return;
                }

                _logger.LogInformation($"📝 File changed: {Path.GetFileName(e.FullPath)}");
                await onFileChanged(e.FullPath);
            }
        };

        _watcher.EnableRaisingEvents = true;
        _logger.LogInformation($"👀 Watching for changes in: {project.Path}");
    }

    public void StopWatching()
    {
        _watcher?.Dispose();
        _watcher = null;
        _logger.LogInformation("⏸️ Stopped watching for changes");
    }

    // ============================================================
    // Private Helpers
    // ============================================================

    private async Task<List<ProjectFile>> ScanProjectFiles(string projectPath)
    {
        var files = new List<ProjectFile>();

        try
        {
            var allFiles = Directory.GetFiles(projectPath, "*.*", SearchOption.AllDirectories);

            foreach (var filePath in allFiles)
            {
                // Skip bin, obj, node_modules
                if (filePath.Contains("\\bin\\") || filePath.Contains("\\obj\\") ||
                    filePath.Contains("\\node_modules\\"))
                    continue;

                var ext = Path.GetExtension(filePath).ToLower();
                var fileName = Path.GetFileName(filePath);

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
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to scan project files");
        }

        return files;
    }

    private async Task<int> DetectPort(string projectPath)
    {
        // Try launchSettings.json first
        var launchSettingsPath = Path.Combine(projectPath, "Properties", "launchSettings.json");
        if (File.Exists(launchSettingsPath))
        {
            try
            {
                var json = await File.ReadAllTextAsync(launchSettingsPath);
                var match = Regex.Match(json, @"localhost:(\d+)");
                if (match.Success && int.TryParse(match.Groups[1].Value, out var port))
                {
                    return port;
                }
            }
            catch
            {
                // Ignore errors, use default
            }
        }

        // Default
        return 5000;
    }

    private async Task AddToRecentProjects(MinimactProject project)
    {
        var recent = await GetRecentProjects();

        // Remove if already exists
        recent.RemoveAll(p => p.Path.Equals(project.Path, StringComparison.OrdinalIgnoreCase));

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

    // ============================================================
    // Template Creation
    // ============================================================

    private async Task CreateCounterTemplate(string targetPath, string projectName)
    {
        // Create Counter.tsx
        var counterTsx = @"import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className=""counter"">
      <h1>Counter</h1>
      <p>Current count: <strong>{count}</strong></p>
      <div className=""buttons"">
        <button onClick={() => setCount(count + 1)}>Increment</button>
        <button onClick={() => setCount(count - 1)}>Decrement</button>
        <button onClick={() => setCount(0)}>Reset</button>
      </div>
    </div>
  );
}";
        await File.WriteAllTextAsync(
            Path.Combine(targetPath, "Components", "Counter.tsx"),
            counterTsx
        );

        await CreateCommonProjectFiles(targetPath, projectName);
    }

    private async Task CreateTodoAppTemplate(string targetPath, string projectName)
    {
        // Create TodoList.tsx
        var todoTsx = @"import { useState } from 'react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, { id: Date.now(), text: input, completed: false }]);
      setInput('');
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  return (
    <div className=""todo-app"">
      <h1>Todo List</h1>
      <div className=""input-section"">
        <input
          type=""text""
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder=""What needs to be done?""
        />
        <button onClick={addTodo}>Add</button>
      </div>
      <ul className=""todo-list"">
        {todos.map(todo => (
          <li key={todo.id} className={todo.completed ? 'completed' : ''}>
            <input
              type=""checkbox""
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span>{todo.text}</span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <p>{todos.filter(t => !t.completed).length} items left</p>
    </div>
  );
}";
        await File.WriteAllTextAsync(
            Path.Combine(targetPath, "Components", "TodoList.tsx"),
            todoTsx
        );

        await CreateCommonProjectFiles(targetPath, projectName);
    }

    private async Task CreateBlankTemplate(string targetPath, string projectName)
    {
        // Create App.tsx
        var appTsx = @"import { useState } from 'react';

export function App() {
  return (
    <div>
      <h1>Welcome to Minimact!</h1>
      <p>Start building your app here.</p>
    </div>
  );
}";
        await File.WriteAllTextAsync(
            Path.Combine(targetPath, "Components", "App.tsx"),
            appTsx
        );

        await CreateCommonProjectFiles(targetPath, projectName);
    }

    private async Task CreateCommonProjectFiles(string targetPath, string projectName)
    {
        // Create .csproj file
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

        // Create Program.cs
        var programCs = @"var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMinimact();

var app = builder.Build();

app.UseMinimact();

app.Run();";
        await File.WriteAllTextAsync(
            Path.Combine(targetPath, "Program.cs"),
            programCs
        );

        // Create launchSettings.json
        var launchSettings = @"{
  ""profiles"": {
    ""http"": {
      ""commandName"": ""Project"",
      ""dotnetRunMessages"": true,
      ""launchBrowser"": true,
      ""applicationUrl"": ""http://localhost:5000"",
      ""environmentVariables"": {
        ""ASPNETCORE_ENVIRONMENT"": ""Development""
      }
    }
  }
}";
        await File.WriteAllTextAsync(
            Path.Combine(targetPath, "Properties", "launchSettings.json"),
            launchSettings
        );

        // Create appsettings.json
        var appsettings = @"{
  ""Logging"": {
    ""LogLevel"": {
      ""Default"": ""Information"",
      ""Microsoft.AspNetCore"": ""Warning""
    }
  },
  ""AllowedHosts"": ""*""
}";
        await File.WriteAllTextAsync(
            Path.Combine(targetPath, "appsettings.json"),
            appsettings
        );
    }
}
