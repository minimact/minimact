using System.Runtime.InteropServices;
using Newtonsoft.Json;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// FFI bridge to Rust reconciliation and prediction engine
/// Provides P/Invoke bindings to minimact.dll
/// </summary>
public static class RustBridge
{
    private const string DllName = "minimact";

    #region FFI Imports

    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr minimact_predictor_new();

    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    private static extern void minimact_predictor_destroy(IntPtr predictor);

    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr minimact_reconcile(
        [MarshalAs(UnmanagedType.LPUTF8Str)] string old_tree_json,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string new_tree_json
    );

    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr minimact_predictor_learn(
        IntPtr predictor,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string state_change_json,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string old_tree_json,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string new_tree_json,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string? all_state_json
    );

    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr minimact_predictor_learn_with_metadata(
        IntPtr predictor,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string state_change_json,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string old_tree_json,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string new_tree_json,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string? all_state_json,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string? metadata_json
    );

    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr minimact_predictor_predict(
        IntPtr predictor,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string state_change_json,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string current_tree_json
    );

    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr minimact_predictor_predict_with_metadata(
        IntPtr predictor,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string state_change_json,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string current_tree_json,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string metadata_json
    );

    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr minimact_predictor_predict_hint(
        IntPtr predictor,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string hint_id,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string component_id,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string state_changes_json,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string current_tree_json
    );

    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr minimact_predictor_stats(IntPtr predictor);

    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    private static extern void minimact_free_string(IntPtr ptr);

    #endregion

    #region Helper Methods

    /// <summary>
    /// Marshal a C string pointer to C# string and free the original
    /// </summary>
    private static string MarshalAndFreeString(IntPtr ptr)
    {
        if (ptr == IntPtr.Zero)
        {
            return string.Empty;
        }

        try
        {
            var str = Marshal.PtrToStringUTF8(ptr) ?? string.Empty;
            return str;
        }
        finally
        {
            minimact_free_string(ptr);
        }
    }

    #endregion

    #region Public API

    /// <summary>
    /// Compute patches between old and new VNode trees
    /// </summary>
    public static List<Patch> Reconcile(VNode oldTree, VNode newTree)
    {
        var oldJson = JsonConvert.SerializeObject(oldTree);
        var newJson = JsonConvert.SerializeObject(newTree);

        var resultPtr = minimact_reconcile(oldJson, newJson);
        var resultJson = MarshalAndFreeString(resultPtr);

        if (string.IsNullOrEmpty(resultJson))
        {
            return new List<Patch>();
        }

        try
        {
            return JsonConvert.DeserializeObject<List<Patch>>(resultJson) ?? new List<Patch>();
        }
        catch
        {
            return new List<Patch>();
        }
    }

    /// <summary>
    /// Predictor wrapper with automatic cleanup
    /// </summary>
    public class Predictor : IDisposable
    {
        private IntPtr _handle;
        private bool _disposed;

        public Predictor()
        {
            _handle = minimact_predictor_new();
        }

        /// <summary>
        /// Learn a state change pattern
        /// </summary>
        /// <param name="allState">Optional: Complete component state for multi-variable template extraction</param>
        public void Learn(StateChange stateChange, VNode oldTree, VNode newTree, Dictionary<string, object>? allState = null)
        {
            if (_disposed) throw new ObjectDisposedException(nameof(Predictor));

            var stateJson = JsonConvert.SerializeObject(stateChange);
            var oldJson = JsonConvert.SerializeObject(oldTree);
            var newJson = JsonConvert.SerializeObject(newTree);
            var allStateJson = allState != null ? JsonConvert.SerializeObject(allState) : null;

            var resultPtr = minimact_predictor_learn(_handle, stateJson, oldJson, newJson, allStateJson);
            MarshalAndFreeString(resultPtr); // Result is success message, just free it
        }

        /// <summary>
        /// Learn a state change pattern with component metadata (Babel-generated templates)
        /// </summary>
        /// <param name="allState">Optional: Complete component state for multi-variable template extraction</param>
        /// <param name="metadata">Optional: Component metadata with Babel-generated loop templates</param>
        public void LearnWithMetadata(StateChange stateChange, VNode oldTree, VNode newTree, Dictionary<string, object>? allState = null, ComponentMetadata? metadata = null)
        {
            if (_disposed) throw new ObjectDisposedException(nameof(Predictor));

            var stateJson = JsonConvert.SerializeObject(stateChange);
            var oldJson = JsonConvert.SerializeObject(oldTree);
            var newJson = JsonConvert.SerializeObject(newTree);
            var allStateJson = allState != null ? JsonConvert.SerializeObject(allState) : null;
            var metadataJson = metadata != null ? JsonConvert.SerializeObject(metadata) : null;

            var resultPtr = minimact_predictor_learn_with_metadata(_handle, stateJson, oldJson, newJson, allStateJson, metadataJson);
            MarshalAndFreeString(resultPtr); // Result is success message, just free it
        }

        /// <summary>
        /// Predict patches for a state change
        /// </summary>
        public Prediction? Predict(StateChange stateChange, VNode currentTree)
        {
            if (_disposed) throw new ObjectDisposedException(nameof(Predictor));

            var stateJson = JsonConvert.SerializeObject(stateChange);
            var treeJson = JsonConvert.SerializeObject(currentTree);

            var resultPtr = minimact_predictor_predict(_handle, stateJson, treeJson);
            var resultJson = MarshalAndFreeString(resultPtr);

            if (string.IsNullOrEmpty(resultJson))
            {
                return null;
            }

            try
            {
                return JsonConvert.DeserializeObject<Prediction>(resultJson);
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Predict patches for a state change with Babel-extracted template metadata
        /// Prioritizes build-time templates over runtime learned patterns for 100% coverage
        /// </summary>
        public Prediction? PredictWithMetadata(StateChange stateChange, VNode currentTree, ComponentMetadata metadata)
        {
            if (_disposed) throw new ObjectDisposedException(nameof(Predictor));

            var stateJson = JsonConvert.SerializeObject(stateChange);
            var treeJson = JsonConvert.SerializeObject(currentTree);
            var metadataJson = JsonConvert.SerializeObject(metadata);

            var resultPtr = minimact_predictor_predict_with_metadata(_handle, stateJson, treeJson, metadataJson);
            var resultJson = MarshalAndFreeString(resultPtr);

            if (string.IsNullOrEmpty(resultJson))
            {
                return null;
            }

            try
            {
                return JsonConvert.DeserializeObject<Prediction>(resultJson);
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Predict patches for a hint (for usePredictHint)
        /// </summary>
        public PredictHintResult? PredictHint(string hintId, string componentId, List<StateChange> stateChanges, VNode currentTree)
        {
            if (_disposed) throw new ObjectDisposedException(nameof(Predictor));

            var stateChangesJson = JsonConvert.SerializeObject(stateChanges);
            var treeJson = JsonConvert.SerializeObject(currentTree);

            var resultPtr = minimact_predictor_predict_hint(_handle, hintId, componentId, stateChangesJson, treeJson);
            var resultJson = MarshalAndFreeString(resultPtr);

            if (string.IsNullOrEmpty(resultJson))
            {
                return null;
            }

            try
            {
                return JsonConvert.DeserializeObject<PredictHintResult>(resultJson);
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Get predictor statistics
        /// </summary>
        public PredictorStats GetStats()
        {
            if (_disposed) throw new ObjectDisposedException(nameof(Predictor));

            var resultPtr = minimact_predictor_stats(_handle);
            var resultJson = MarshalAndFreeString(resultPtr);

            if (string.IsNullOrEmpty(resultJson))
            {
                return new PredictorStats();
            }

            try
            {
                return JsonConvert.DeserializeObject<PredictorStats>(resultJson) ?? new PredictorStats();
            }
            catch
            {
                return new PredictorStats();
            }
        }

        public void Dispose()
        {
            if (!_disposed)
            {
                if (_handle != IntPtr.Zero)
                {
                    minimact_predictor_destroy(_handle);
                    _handle = IntPtr.Zero;
                }
                _disposed = true;
            }
            GC.SuppressFinalize(this);
        }

        ~Predictor()
        {
            Dispose();
        }
    }

    #endregion
}

/// <summary>
/// Represents a state change for prediction
/// </summary>
public class StateChange
{
    [JsonProperty("component_id")]
    public string ComponentId { get; set; } = "";

    [JsonProperty("state_key")]
    public string StateKey { get; set; } = "";

    [JsonProperty("old_value")]
    public object? OldValue { get; set; }

    [JsonProperty("new_value")]
    public object? NewValue { get; set; }
}

/// <summary>
/// Represents a DOM patch operation
/// </summary>
public class Patch
{
    [JsonProperty("type")]
    public string Type { get; set; } = "";

    /// <summary>
    /// Hex-based DOM path (e.g., "10000000.20000000.30000000")
    /// This uses the tag-agnostic hex path system where each segment is a hex value
    /// with 0x10000000 (268M) gaps between elements, allowing insertions without renumbering.
    /// </summary>
    [JsonProperty("path")]
    public string Path { get; set; } = "";

    [JsonProperty("node")]
    public VNode? Node { get; set; }

    [JsonProperty("content")]
    public string? Content { get; set; }

    [JsonProperty("props")]
    public Dictionary<string, string>? Props { get; set; }

    [JsonProperty("order")]
    public List<string>? Order { get; set; }
}

/// <summary>
/// DOM patch with index-based path for client-side navigation
/// Overrides hex path with DOM index array for simple childNodes navigation
/// </summary>
public class DomPatch : Patch
{
    /// <summary>
    /// DOM index path (e.g., [0, 2, 1]) for direct childNodes navigation
    /// REPLACES the hex path for simpler client-side navigation
    /// </summary>
    [JsonProperty("path")]
    public new List<int> Path { get; set; } = new();

    /// <summary>
    /// Convert a list of Patches to DomPatches using PathConverter from the new tree
    /// </summary>
    /// <param name="patches">Patches from Rust reconciliation</param>
    /// <param name="pathConverter">PathConverter from NEW VNode tree</param>
    public static List<DomPatch> FromPatches(List<Patch> patches, PathConverter pathConverter)
    {
        var domPatches = new List<DomPatch>();

        foreach (var patch in patches)
        {
            var domPatch = new DomPatch
            {
                Type = patch.Type,
                Content = patch.Content,
                Props = patch.Props,
                Order = patch.Order
            };

            // Convert VNode paths - all patches must have a VNode
            // The VNode contains the path information, patch.path is redundant
            if (patch.Node != null)
            {
                domPatch.Node = ConvertVNodePaths(patch.Node, pathConverter);
            }

            domPatches.Add(domPatch);
        }

        return domPatches;
    }

    /// <summary>
    /// Recursively convert hex paths to DOM paths in a VNode tree
    /// </summary>
    private static VNode ConvertVNodePaths(VNode node, PathConverter pathConverter)
    {
        if (node is VElement element)
        {
            var converted = new VElement(element.Tag, element.Props, Array.Empty<VNode>())
            {
                Key = element.Key
            };

            // Convert this element's path
            if (!string.IsNullOrEmpty(element.Path))
            {
                var domPath = pathConverter.HexPathToDomPath(element.Path);
                converted.Path = string.Join(".", domPath);
            }

            // Recursively convert children
            converted.Children = element.Children.Select(child => ConvertVNodePaths(child, pathConverter)).ToList();

            return converted;
        }
        else if (node is VText text)
        {
            var converted = new VText(text.Content);

            // Convert this text's path
            if (!string.IsNullOrEmpty(text.Path))
            {
                var domPath = pathConverter.HexPathToDomPath(text.Path);
                converted.Path = string.Join(".", domPath);
            }

            return converted;
        }
        else if (node is VNull vnull)
        {
            var converted = new VNull("");

            // Convert this null's path
            if (!string.IsNullOrEmpty(vnull.Path))
            {
                var domPath = pathConverter.HexPathToDomPath(vnull.Path);
                converted.Path = string.Join(".", domPath);
            }

            return converted;
        }

        return node;
    }
}

/// <summary>
/// Prediction result from the Rust engine
/// </summary>
public class Prediction
{
    [JsonProperty("patches")]
    public List<Patch> Patches { get; set; } = new();

    [JsonProperty("confidence")]
    public double Confidence { get; set; }
}

/// <summary>
/// Predictor statistics
/// </summary>
public class PredictorStats
{
    [JsonProperty("unique_state_keys")]
    public int UniqueStateKeys { get; set; }

    [JsonProperty("total_patterns")]
    public int TotalPatterns { get; set; }

    [JsonProperty("total_observations")]
    public int TotalObservations { get; set; }

    [JsonProperty("estimated_memory_bytes")]
    public long EstimatedMemoryBytes { get; set; }

    [JsonProperty("total_predictions")]
    public int TotalPredictions { get; set; }

    [JsonProperty("correct_predictions")]
    public int CorrectPredictions { get; set; }

    [JsonProperty("incorrect_predictions")]
    public int IncorrectPredictions { get; set; }

    [JsonProperty("hit_rate")]
    public float HitRate { get; set; }

    [JsonProperty("avg_confidence")]
    public float AvgConfidence { get; set; }

    [JsonProperty("active_patterns")]
    public int ActivePatterns { get; set; }

    [JsonProperty("prediction_hits")]
    public int PredictionHits { get; set; }
}

/// <summary>
/// Result of a predict hint operation
/// </summary>
public class PredictHintResult
{
    [JsonProperty("ok")]
    public bool Ok { get; set; }

    [JsonProperty("hint_id")]
    public string? HintId { get; set; }

    [JsonProperty("data")]
    public Prediction? Data { get; set; }

    [JsonProperty("error")]
    public string? Error { get; set; }
}
