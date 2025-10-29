using System.ComponentModel.DataAnnotations;

namespace Minimact.Swig.Models;

public class CreateProjectViewModel
{
    [Required(ErrorMessage = "Project name is required")]
    [RegularExpression(@"^[a-zA-Z][a-zA-Z0-9_]*$", ErrorMessage = "Project name must start with a letter and contain only letters, numbers, and underscores")]
    public string ProjectName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Target directory is required")]
    public string TargetDirectory { get; set; } = string.Empty;

    public string? Template { get; set; } = "Counter";
}
