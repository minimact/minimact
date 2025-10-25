using System;
using System.Collections.Generic;

namespace Minimact.AspNetCore.Quantum;

/// <summary>
/// Represents a quantum entanglement between DOM elements across clients
/// </summary>
public class EntanglementBinding
{
    /// <summary>
    /// Unique entanglement ID
    /// Format: sourceClient:selector→targetClient:selector
    /// </summary>
    public string EntanglementId { get; set; } = string.Empty;

    /// <summary>
    /// Source client ID (who initiated the entanglement)
    /// </summary>
    public string SourceClient { get; set; } = string.Empty;

    /// <summary>
    /// Target client ID (or '*' for broadcast to all)
    /// </summary>
    public string TargetClient { get; set; } = string.Empty;

    /// <summary>
    /// Page URL (entanglements are page-scoped)
    /// </summary>
    public string Page { get; set; } = string.Empty;

    /// <summary>
    /// Element selector
    /// </summary>
    public string Selector { get; set; } = string.Empty;

    /// <summary>
    /// Entanglement mode
    /// </summary>
    public string Mode { get; set; } = "bidirectional";

    /// <summary>
    /// Scope (private, team, public)
    /// </summary>
    public string Scope { get; set; } = "private";

    /// <summary>
    /// When this entanglement was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Is this entanglement still active?
    /// </summary>
    public bool Active { get; set; } = true;

    /// <summary>
    /// Session ID for reconnection support
    /// Entanglements can be restored when client reconnects with same session
    /// </summary>
    public string? SessionId { get; set; }
}

/// <summary>
/// Mutation vector - represents a DOM change
/// </summary>
public class MutationVector
{
    public string Type { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string? AttributeName { get; set; }
    public object? OldValue { get; set; }
    public object? NewValue { get; set; }
    public List<SerializedNode>? AddedNodes { get; set; }
    public List<SerializedNode>? RemovedNodes { get; set; }
    public long Timestamp { get; set; }
    public int[]? CausalVector { get; set; }
}

/// <summary>
/// Serialized DOM node
/// </summary>
public class SerializedNode
{
    public string NodeName { get; set; } = string.Empty;
    public int NodeType { get; set; }
    public string? TextContent { get; set; }
    public Dictionary<string, string>? Attributes { get; set; }
}
