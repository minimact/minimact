using System;
using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;

namespace Minimact.CommandCenter.Models;

/// <summary>
/// Represents a single test execution with expected vs actual tracking
/// </summary>
public partial class TestExecution : ObservableObject
{
    [ObservableProperty]
    private string testName = string.Empty;

    [ObservableProperty]
    private string rangerName = string.Empty;

    [ObservableProperty]
    private TestStatus status = TestStatus.NotStarted;

    [ObservableProperty]
    private DateTime? startTime;

    [ObservableProperty]
    private DateTime? endTime;

    [ObservableProperty]
    private int passedAssertions;

    [ObservableProperty]
    private int failedAssertions;

    [ObservableProperty]
    private int totalAssertions;

    public ObservableCollection<TestStep> Steps { get; } = new();
    public ObservableCollection<TestAssertion> Assertions { get; } = new();

    public TimeSpan? Duration => EndTime.HasValue && StartTime.HasValue
        ? EndTime.Value - StartTime.Value
        : null;

    public int TotalSteps => Steps.Count;
    public int CompletedSteps => Steps.Count(s => s.Status == StepStatus.Completed);
}

/// <summary>
/// Test execution status
/// </summary>
public enum TestStatus
{
    NotStarted,
    Running,
    Passed,
    Failed,
    Error
}

/// <summary>
/// Represents a single step in test execution
/// </summary>
public partial class TestStep : ObservableObject
{
    [ObservableProperty]
    private int stepNumber;

    [ObservableProperty]
    private string description = string.Empty;

    [ObservableProperty]
    private StepStatus status = StepStatus.Pending;

    [ObservableProperty]
    private DateTime? timestamp;

    public ObservableCollection<TestAction> Actions { get; } = new();
    public ObservableCollection<DOMPatchRecord> Patches { get; } = new();
    public ObservableCollection<SignalRMessage> Messages { get; } = new();
}

public enum StepStatus
{
    Pending,
    Running,
    Completed,
    Failed
}

/// <summary>
/// Represents an action (click, setState, etc.) with expected vs actual
/// </summary>
public partial class TestAction : ObservableObject
{
    [ObservableProperty]
    private string actionType = string.Empty; // "Click", "SetState", "MouseMove", etc.

    [ObservableProperty]
    private string target = string.Empty; // Element ID or state key

    [ObservableProperty]
    private object? expectedValue;

    [ObservableProperty]
    private object? actualValue;

    [ObservableProperty]
    private bool matches = true;

    [ObservableProperty]
    private DateTime timestamp = DateTime.UtcNow;

    [ObservableProperty]
    private string? details;
}

/// <summary>
/// Represents a DOM patch with expected vs actual
/// </summary>
public partial class DOMPatchRecord : ObservableObject
{
    [ObservableProperty]
    private PatchSource source; // Expected or Actual

    [ObservableProperty]
    private PatchType patchType;

    [ObservableProperty]
    private string path = string.Empty; // DOM path as string (e.g., "[0,2,1]")

    [ObservableProperty]
    private string? key; // For SetAttribute

    [ObservableProperty]
    private object? value;

    [ObservableProperty]
    private int index; // For child operations

    [ObservableProperty]
    private string? elementId;

    [ObservableProperty]
    private string? tagName;

    [ObservableProperty]
    private DateTime timestamp = DateTime.UtcNow;

    [ObservableProperty]
    private bool matches = true; // Does expected match actual?

    [ObservableProperty]
    private DOMPatchRecord? matchingPatch; // Reference to matching expected/actual patch

    public string DisplayText
    {
        get
        {
            return PatchType switch
            {
                PatchType.SetAttribute => $"SetAttribute: {Key}=\"{Value}\" at {Path}",
                PatchType.SetText => $"SetText: \"{Value}\" at {Path}",
                PatchType.InsertChild => $"InsertChild: <{TagName}> at {Path}[{Index}]",
                PatchType.RemoveChild => $"RemoveChild: at {Path}[{Index}]",
                PatchType.ReplaceChild => $"ReplaceChild: <{TagName}> at {Path}[{Index}]",
                _ => $"Unknown patch type: {PatchType}"
            };
        }
    }
}

public enum PatchSource
{
    Expected,
    Actual
}

/// <summary>
/// Represents a SignalR message with expected vs actual
/// </summary>
public partial class SignalRMessage : ObservableObject
{
    [ObservableProperty]
    private MessageDirection direction;

    [ObservableProperty]
    private MessageSource source; // Expected or Actual

    [ObservableProperty]
    private string methodName = string.Empty;

    [ObservableProperty]
    private string componentId = string.Empty;

    [ObservableProperty]
    private object[]? arguments;

    [ObservableProperty]
    private DateTime timestamp = DateTime.UtcNow;

    [ObservableProperty]
    private bool matches = true;

    [ObservableProperty]
    private SignalRMessage? matchingMessage;

    public string DisplayText
    {
        get
        {
            var arrow = Direction == MessageDirection.ClientToServer ? "→" : "←";
            var args = Arguments != null ? string.Join(", ", Arguments.Select(a => a?.ToString() ?? "null")) : "";
            return $"{arrow} {MethodName}({args})";
        }
    }
}

public enum MessageDirection
{
    ClientToServer,
    ServerToClient
}

public enum MessageSource
{
    Expected,
    Actual
}

/// <summary>
/// Represents a test assertion (expected vs actual)
/// </summary>
public partial class TestAssertion : ObservableObject
{
    [ObservableProperty]
    private string description = string.Empty;

    [ObservableProperty]
    private object? expectedValue;

    [ObservableProperty]
    private object? actualValue;

    [ObservableProperty]
    private bool passed;

    [ObservableProperty]
    private DateTime timestamp = DateTime.UtcNow;

    [ObservableProperty]
    private string? errorMessage;

    public string StatusEmoji => Passed ? "✅" : "❌";
}
