using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;
using MvcBridgeExamples.ViewModels;

namespace MvcBridgeExamples.Controllers;

/// <summary>
/// MVC Controller demonstrating MVC Bridge pattern
/// </summary>
public class ExamplesController : Controller
{
    private readonly MinimactPageRenderer _renderer;
    private readonly ILogger<ExamplesController> _logger;

    public ExamplesController(
        MinimactPageRenderer renderer,
        ILogger<ExamplesController> logger)
    {
        _renderer = renderer;
        _logger = logger;
    }

    /// <summary>
    /// Counter example - demonstrates basic mutable state
    /// </summary>
    public async Task<IActionResult> Counter()
    {
        _logger.LogInformation("Rendering Counter example");

        // Prepare ViewModel (traditional MVC pattern)
        var viewModel = new CounterViewModel
        {
            // Server-authoritative data
            UserName = User.Identity?.Name ?? "Guest",
            CanReset = true,
            LastResetTime = DateTime.Now,

            // Client-mutable UI state
            InitialCount = 0,
            InitialStep = 1,
            InitialShowHistory = false,

            // Metadata
            PageTitle = "Counter Example - MVC Bridge",
            Description = "A simple counter demonstrating mutable state with MVC Bridge."
        };

        // Render Minimact page
        return await _renderer.RenderPage<CounterPage>(
            viewModel: viewModel,
            pageTitle: viewModel.PageTitle
        );
    }

    /// <summary>
    /// TodoList example - demonstrates complex mutable state
    /// </summary>
    public async Task<IActionResult> TodoList()
    {
        _logger.LogInformation("Rendering TodoList example");

        // Simulate fetching todos from database
        var initialTodos = new List<TodoItemViewModel>
        {
            new() { Id = 1, Text = "Learn Minimact", Done = true, Category = "Work", CreatedAt = DateTime.Now.AddDays(-2) },
            new() { Id = 2, Text = "Build MVC Bridge", Done = true, Category = "Work", CreatedAt = DateTime.Now.AddDays(-1) },
            new() { Id = 3, Text = "Create examples", Done = false, Category = "Work", CreatedAt = DateTime.Now },
            new() { Id = 4, Text = "Buy groceries", Done = false, Category = "Shopping", CreatedAt = DateTime.Now },
            new() { Id = 5, Text = "Write documentation", Done = false, Category = "Personal", CreatedAt = DateTime.Now }
        };

        var viewModel = new TodoListViewModel
        {
            // Server-authoritative data
            UserName = User.Identity?.Name ?? "Guest",
            IsAdminRole = User.IsInRole("Admin"),
            MaxTodosAllowed = 100,
            Categories = new List<string> { "All", "Personal", "Work", "Shopping" },

            // Client-mutable data
            InitialTodos = initialTodos,
            InitialNewTodoText = "",
            InitialFilterCategory = "All",
            InitialShowCompleted = true,

            // Metadata
            PageTitle = "Todo List Example - MVC Bridge",
            Description = "A todo list demonstrating complex mutable state with MVC Bridge."
        };

        return await _renderer.RenderPage<TodoListPage>(
            viewModel: viewModel,
            pageTitle: viewModel.PageTitle
        );
    }
}
