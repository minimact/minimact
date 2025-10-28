namespace Minimact.Swig.Models;

/// <summary>
/// Represents a Minimact project loaded in Swig
/// </summary>
public class MinimactProject
{
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public int Port { get; set; } = 5000;
    public List<ProjectFile> Files { get; set; } = new();
    public DateTime LastOpened { get; set; }
    public string Version { get; set; } = "1.0.0";
}

/// <summary>
/// Represents a file in the project
/// </summary>
public class ProjectFile
{
    public string Path { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Extension { get; set; } = string.Empty;
    public FileType Type { get; set; }
    public DateTime LastModified { get; set; }
}

/// <summary>
/// Type of project file
/// </summary>
public enum FileType
{
    TSX,
    CSharp,
    Config,
    Other
}

/// <summary>
/// Recent project entry
/// </summary>
public class RecentProject
{
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public DateTime LastOpened { get; set; }
}
