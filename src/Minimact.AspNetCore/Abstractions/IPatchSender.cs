using Minimact.AspNetCore.Core;

namespace Minimact.AspNetCore.Abstractions;

/// <summary>
/// Interface for sending patches and hints to clients
///
/// This abstracts away the transport layer:
/// - Production: SignalRPatchSender (sends via SignalR)
/// - Testing: MockPatchSender (sends via in-memory callbacks)
///
/// CRITICAL: MinimactComponent should NOT know about SignalR!
/// It only knows about IPatchSender.
/// </summary>
public interface IPatchSender
{
    /// <summary>
    /// Send patches to client for a specific component
    /// </summary>
    Task SendPatchesAsync(string componentId, List<DomPatch> patches);

    /// <summary>
    /// Send prediction hint to client for instant feedback
    /// </summary>
    Task SendHintAsync(string componentId, string hintId, List<DomPatch> patches, double confidence);

    /// <summary>
    /// Send error message to client
    /// </summary>
    Task SendErrorAsync(string componentId, string errorMessage);

    /// <summary>
    /// Send server reducer state update to client
    /// </summary>
    Task SendReducerStateUpdateAsync(string componentId, string reducerId, object newState, string? error);
}
