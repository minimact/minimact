using Minimact.AspNetCore.Attributes;

namespace MvcBridgeExamples.ViewModels;

/// <summary>
/// ViewModel for Counter example
/// Demonstrates mutable vs immutable properties
/// </summary>
public class CounterViewModel
{
    // ❌ IMMUTABLE - Server authority (user info, permissions)
    public string UserName { get; set; } = "Guest";
    public bool CanReset { get; set; } = true;
    public DateTime LastResetTime { get; set; } = DateTime.Now;

    // ✅ MUTABLE - Client can modify (UI state)
    [Mutable]
    public int InitialCount { get; set; } = 0;

    [Mutable]
    public int InitialStep { get; set; } = 1;

    [Mutable]
    public bool InitialShowHistory { get; set; } = false;

    // Metadata
    public string PageTitle { get; set; } = "Counter Example";
    public string Description { get; set; } = "A simple counter demonstrating MVC Bridge with mutable state.";
}
