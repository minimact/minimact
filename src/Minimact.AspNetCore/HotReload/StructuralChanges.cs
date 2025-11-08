namespace Minimact.AspNetCore.HotReload;

/// <summary>
/// Structural changes detected by Babel transpiler
/// Generated from .structural-changes.json files
/// </summary>
public class StructuralChanges
{
    public string ComponentName { get; set; } = "";
    public DateTime Timestamp { get; set; }
    public string SourceFile { get; set; } = "";
    public List<StructuralChange> Changes { get; set; } = new();
}

/// <summary>
/// Individual structural change (JSX insert/delete or hook change)
/// </summary>
public class StructuralChange
{
    /// <summary>
    /// Type of change: "insert", "delete", "hook-added", "hook-removed", "hook-type-changed", etc.
    /// </summary>
    public string Type { get; set; } = "";

    // JSX change properties
    public string Path { get; set; } = ""; // For JSX changes (hex path)
    public VNodeRepresentation? VNode { get; set; } // Only for JSX insertions

    // Hook change properties
    public string? HookType { get; set; } // Type of hook ("useState", "useEffect", "useRef", etc.)
    public string? VarName { get; set; } // Variable name (for hooks with variables)
    public string? OldVarName { get; set; } // Old variable name (for hook-variable-changed)
    public string? NewVarName { get; set; } // New variable name (for hook-variable-changed)
    public string? OldHookType { get; set; } // Old hook type (for hook-type-changed)
    public string? NewHookType { get; set; } // New hook type (for hook-type-changed)
    public string? PropertyName { get; set; } // Property name (for useMvcState)
    public string? OldPropertyName { get; set; } // Old property name (for hook-property-changed)
    public string? NewPropertyName { get; set; } // New property name (for hook-property-changed)
    public string? Runtime { get; set; } // Runtime (for useServerTask)
    public string? OldRuntime { get; set; } // Old runtime (for hook-runtime-changed)
    public string? NewRuntime { get; set; } // New runtime (for hook-runtime-changed)
    public int? Index { get; set; } // Hook index in call order
    public bool? OldStreaming { get; set; } // Old streaming flag (for hook-streaming-changed)
    public bool? NewStreaming { get; set; } // New streaming flag (for hook-streaming-changed)
}

/// <summary>
/// VNode representation from Babel
/// Simplified VNode structure for hot reload
/// </summary>
public class VNodeRepresentation
{
    public string Type { get; set; } = ""; // "element" or "text"
    public string Tag { get; set; } = "";
    public string Path { get; set; } = "";
    public Dictionary<string, string> Attributes { get; set; } = new();
    public List<VNodeRepresentation> Children { get; set; } = new();
    public string? Value { get; set; } // For text nodes
}
