using Minimact.AspNetCore.Core;

namespace Minimact.AspNetCore.Abstractions;

/// <summary>
/// Core component engine interface
/// SHARED by production (MinimactHub) and testing (MockHub)
///
/// This interface defines the contract for component operations.
/// The implementation (ComponentEngine) contains the REAL production code.
/// </summary>
public interface IComponentEngine
{
    // ========================================
    // Component Lifecycle
    // ========================================

    /// <summary>
    /// Register a component instance
    /// </summary>
    void RegisterComponent(string componentId, MinimactComponent component);

    /// <summary>
    /// Get a component by ID
    /// </summary>
    MinimactComponent? GetComponent(string componentId);

    /// <summary>
    /// Unregister a component
    /// </summary>
    void UnregisterComponent(string componentId);

    // ========================================
    // State Management
    // ========================================

    /// <summary>
    /// Update component state (from useState)
    /// Returns patches to apply to DOM
    /// </summary>
    Task<List<Patch>> UpdateComponentStateAsync(
        string componentId,
        string stateKey,
        object value
    );

    /// <summary>
    /// Update DOM element state (from useDomElementState)
    /// Returns patches to apply to DOM
    /// </summary>
    Task<List<Patch>> UpdateDomElementStateAsync(
        string componentId,
        string stateKey,
        DomElementStateSnapshot snapshot
    );

    /// <summary>
    /// Update client-computed state (from external libraries)
    /// Returns patches to apply to DOM
    /// </summary>
    Task<List<Patch>> UpdateClientComputedStateAsync(
        string componentId,
        Dictionary<string, object> computedValues
    );

    // ========================================
    // Method Invocation
    // ========================================

    /// <summary>
    /// Invoke a component method (e.g., button click handler)
    /// Returns result with patches and hints
    /// </summary>
    Task<MethodInvocationResult> InvokeComponentMethodAsync(
        string componentId,
        string methodName,
        object[] args
    );

    // ========================================
    // Prediction
    // ========================================

    /// <summary>
    /// Request predict hints for state changes
    /// Returns pre-computed patches for instant feedback
    /// </summary>
    Task<List<PredictHint>> RequestPredictAsync(
        string componentId,
        Dictionary<string, object> stateChanges
    );
}

/// <summary>
/// Result of method invocation
/// </summary>
public class MethodInvocationResult
{
    /// <summary>
    /// Patches to apply to DOM
    /// </summary>
    public List<Patch> Patches { get; set; } = new();

    /// <summary>
    /// Prediction hints to send to client
    /// </summary>
    public List<PredictHint> Hints { get; set; } = new();

    /// <summary>
    /// Whether the method succeeded
    /// </summary>
    public bool Success { get; set; } = true;

    /// <summary>
    /// Error message if failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Prediction hint for client HintQueue
/// </summary>
public class PredictHint
{
    public string HintId { get; set; } = string.Empty;
    public List<Patch> Patches { get; set; } = new();
    public double Confidence { get; set; }
}

/// <summary>
/// DOM element state snapshot (from useDomElementState)
/// </summary>
public class DomElementStateSnapshot
{
    public bool IsIntersecting { get; set; }
    public double IntersectionRatio { get; set; }
    public int ChildrenCount { get; set; }
    public int GrandChildrenCount { get; set; }
    public Dictionary<string, string> Attributes { get; set; } = new();
    public List<string> ClassList { get; set; } = new();
    public bool Exists { get; set; }
    public int Count { get; set; }
}
