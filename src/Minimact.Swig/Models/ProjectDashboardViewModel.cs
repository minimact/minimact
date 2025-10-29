namespace Minimact.Swig.Models;

public class ProjectDashboardViewModel
{
    public MinimactProject Project { get; set; } = new();
    public bool IsRunning { get; set; }
    public int Port { get; set; } = 5000;
}
