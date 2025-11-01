using Minimact.AspNetCore.Attributes;

namespace MvcBridgeExamples.ViewModels;

/// <summary>
/// ViewModel for TodoList example
/// Demonstrates complex mutable state with nested objects
/// </summary>
public class TodoListViewModel
{
    // ❌ IMMUTABLE - Server authority
    public string UserName { get; set; } = "Guest";
    public bool IsAdminRole { get; set; } = false;
    public int MaxTodosAllowed { get; set; } = 100;
    public List<string> Categories { get; set; } = new() { "Personal", "Work", "Shopping" };

    // ✅ MUTABLE - Client can modify
    [Mutable]
    public List<TodoItemViewModel> InitialTodos { get; set; } = new();

    [Mutable]
    public string InitialNewTodoText { get; set; } = "";

    [Mutable]
    public string InitialFilterCategory { get; set; } = "All";

    [Mutable]
    public bool InitialShowCompleted { get; set; } = true;

    // Metadata
    public string PageTitle { get; set; } = "Todo List Example";
    public string Description { get; set; } = "A todo list demonstrating MVC Bridge with complex mutable state.";
}

/// <summary>
/// Individual todo item
/// </summary>
public class TodoItemViewModel
{
    public int Id { get; set; }
    public string Text { get; set; } = "";
    public bool Done { get; set; }
    public string Category { get; set; } = "Personal";
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
