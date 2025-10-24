namespace Minimact.Playground.Models;

/// <summary>
/// Request to compile and run a TSX component
/// </summary>
public class CompileRequest
{
    /// <summary>Generated C# code from Babel transpilation</summary>
    public required string CSharpCode { get; set; }

    /// <summary>Optional usePredictHint directives to improve prediction</summary>
    public List<string> PredictHints { get; set; } = new();
}

/// <summary>
/// Request to simulate user interaction with a compiled component
/// </summary>
public class InteractionRequest
{
    /// <summary>Session ID from previous compile</summary>
    public required string SessionId { get; set; }

    /// <summary>Type of event: "click", "input", "change", etc.</summary>
    public required string EventType { get; set; }

    /// <summary>ID of the element that was interacted with</summary>
    public string? ElementId { get; set; }

    /// <summary>State changes to apply to the component</summary>
    public Dictionary<string, object?> StateChanges { get; set; } = new();
}

/// <summary>
/// Request to update client-computed state values (for external library support)
/// </summary>
public class UpdateClientComputedRequest
{
    /// <summary>Session ID from previous compile</summary>
    public required string SessionId { get; set; }

    /// <summary>Client-computed values (calculated in browser via lodash, moment, etc.)</summary>
    public Dictionary<string, object> ComputedValues { get; set; } = new();
}
