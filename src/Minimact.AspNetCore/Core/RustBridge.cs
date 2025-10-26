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
    private static extern void minimact_predictor_free(IntPtr predictor);

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
    private static extern IntPtr minimact_predictor_predict(
        IntPtr predictor,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string state_change_json,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string current_tree_json
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
                    minimact_predictor_free(_handle);
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

    [JsonProperty("path")]
    public List<int> Path { get; set; } = new();

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
    [JsonProperty("total_patterns")]
    public int TotalPatterns { get; set; }

    [JsonProperty("total_predictions")]
    public int TotalPredictions { get; set; }

    [JsonProperty("successful_predictions")]
    public int SuccessfulPredictions { get; set; }
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
