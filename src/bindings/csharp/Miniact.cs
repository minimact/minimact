using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;

namespace Minimact
{
    /// <summary>
    /// C# bindings for the Minimact Rust library
    /// </summary>
    public static class Native
    {
        private const string DllName = "minimact";

        [StructLayout(LayoutKind.Sequential)]
        public struct FfiResult
        {
            [MarshalAs(UnmanagedType.I1)]
            public bool Success;
            public IntPtr ErrorMessage;
        }

        [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
        public static extern UIntPtr minimact_predictor_new();

        [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
        public static extern UIntPtr minimact_predictor_new_with_config(
            float minConfidence,
            UIntPtr maxPatternsPerKey);

        [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
        public static extern FfiResult minimact_predictor_destroy(UIntPtr handle);

        [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
        public static extern IntPtr minimact_reconcile(
            [MarshalAs(UnmanagedType.LPStr)] string oldJson,
            [MarshalAs(UnmanagedType.LPStr)] string newJson);

        [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
        public static extern FfiResult minimact_predictor_learn(
            UIntPtr handle,
            [MarshalAs(UnmanagedType.LPStr)] string stateChangeJson,
            [MarshalAs(UnmanagedType.LPStr)] string oldTreeJson,
            [MarshalAs(UnmanagedType.LPStr)] string newTreeJson);

        [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
        public static extern IntPtr minimact_predictor_predict(
            UIntPtr handle,
            [MarshalAs(UnmanagedType.LPStr)] string stateChangeJson,
            [MarshalAs(UnmanagedType.LPStr)] string currentTreeJson);

        [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
        public static extern IntPtr minimact_predictor_stats(UIntPtr handle);

        [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
        public static extern void minimact_free_string(IntPtr ptr);

        [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
        public static extern void minimact_free_error(IntPtr ptr);
    }

    /// <summary>
    /// Safe wrapper around the Minimact predictor
    /// </summary>
    public class Predictor : IDisposable
    {
        private UIntPtr _handle;
        private bool _disposed;

        public Predictor()
        {
            _handle = Native.minimact_predictor_new();
        }

        public Predictor(float minConfidence, int maxPatternsPerKey)
        {
            _handle = Native.minimact_predictor_new_with_config(
                minConfidence,
                new UIntPtr((uint)maxPatternsPerKey));
        }

        public void Learn(StateChange stateChange, VNode oldTree, VNode newTree)
        {
            ThrowIfDisposed();

            var stateChangeJson = JsonSerializer.Serialize(stateChange);
            var oldTreeJson = JsonSerializer.Serialize(oldTree);
            var newTreeJson = JsonSerializer.Serialize(newTree);

            var result = Native.minimact_predictor_learn(
                _handle,
                stateChangeJson,
                oldTreeJson,
                newTreeJson);

            if (!result.Success)
            {
                string error = Marshal.PtrToStringAnsi(result.ErrorMessage) ?? "Unknown error";
                Native.minimact_free_error(result.ErrorMessage);
                throw new MinimactException(error);
            }
        }

        public Prediction? Predict(StateChange stateChange, VNode currentTree)
        {
            ThrowIfDisposed();

            var stateChangeJson = JsonSerializer.Serialize(stateChange);
            var currentTreeJson = JsonSerializer.Serialize(currentTree);

            var resultPtr = Native.minimact_predictor_predict(
                _handle,
                stateChangeJson,
                currentTreeJson);

            if (resultPtr == IntPtr.Zero)
            {
                return null;
            }

            try
            {
                var json = Marshal.PtrToStringAnsi(resultPtr) ?? "";
                return JsonSerializer.Deserialize<Prediction>(json);
            }
            finally
            {
                Native.minimact_free_string(resultPtr);
            }
        }

        public PredictorStats GetStats()
        {
            ThrowIfDisposed();

            var resultPtr = Native.minimact_predictor_stats(_handle);

            if (resultPtr == IntPtr.Zero)
            {
                throw new MinimactException("Failed to get predictor stats");
            }

            try
            {
                var json = Marshal.PtrToStringAnsi(resultPtr) ?? "{}";
                return JsonSerializer.Deserialize<PredictorStats>(json)
                    ?? new PredictorStats();
            }
            finally
            {
                Native.minimact_free_string(resultPtr);
            }
        }

        private void ThrowIfDisposed()
        {
            if (_disposed)
            {
                throw new ObjectDisposedException(nameof(Predictor));
            }
        }

        public void Dispose()
        {
            if (!_disposed)
            {
                Native.minimact_predictor_destroy(_handle);
                _disposed = true;
            }
            GC.SuppressFinalize(this);
        }

        ~Predictor()
        {
            Dispose();
        }
    }

    /// <summary>
    /// Reconciliation utilities
    /// </summary>
    public static class Reconciler
    {
        public static Patch[] Reconcile(VNode oldTree, VNode newTree)
        {
            var oldJson = JsonSerializer.Serialize(oldTree);
            var newJson = JsonSerializer.Serialize(newTree);

            var resultPtr = Native.minimact_reconcile(oldJson, newJson);

            if (resultPtr == IntPtr.Zero)
            {
                throw new MinimactException("Reconciliation failed");
            }

            try
            {
                var json = Marshal.PtrToStringAnsi(resultPtr) ?? "[]";

                // Check for error
                if (json.Contains("\"error\""))
                {
                    throw new MinimactException(json);
                }

                return JsonSerializer.Deserialize<Patch[]>(json) ?? Array.Empty<Patch>();
            }
            finally
            {
                Native.minimact_free_string(resultPtr);
            }
        }
    }

    // Data types matching Rust structs

    public class VNode
    {
        public string Type { get; set; } = "";
        public VElement? Element { get; set; }
        public VText? Text { get; set; }
    }

    public class VElement
    {
        public string Tag { get; set; } = "";
        public Dictionary<string, string> Props { get; set; } = new();
        public List<VNode> Children { get; set; } = new();
        public string? Key { get; set; }
    }

    public class VText
    {
        public string Content { get; set; } = "";
    }

    public class StateChange
    {
        public string ComponentId { get; set; } = "";
        public string StateKey { get; set; } = "";
        public object? OldValue { get; set; }
        public object? NewValue { get; set; }
    }

    public class Prediction
    {
        public StateChange StateChange { get; set; } = new();
        public List<Patch> PredictedPatches { get; set; } = new();
        public float Confidence { get; set; }
        public VNode? PredictedTree { get; set; }
    }

    public class Patch
    {
        public string Op { get; set; } = "";
        public List<int>? Path { get; set; }
        public VNode? Node { get; set; }
        public string? Content { get; set; }
        public Dictionary<string, string>? Props { get; set; }
        public List<string>? Order { get; set; }
    }

    public class PredictorStats
    {
        public int UniqueStateKeys { get; set; }
        public int TotalPatterns { get; set; }
        public int TotalObservations { get; set; }
    }

    public class MinimactException : Exception
    {
        public MinimactException(string message) : base(message) { }
    }
}
