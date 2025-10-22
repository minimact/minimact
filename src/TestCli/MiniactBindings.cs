using System;
using System.Runtime.InteropServices;
using System.Text;
using Newtonsoft.Json;

namespace TestCli
{
    // FFI Result structure
    [StructLayout(LayoutKind.Sequential)]
    public struct FfiResult
    {
        public int Code;
        public IntPtr Message;

        public bool IsSuccess => Code == 0;

        public string? GetErrorMessage()
        {
            if (Message != IntPtr.Zero)
            {
                return Marshal.PtrToStringAnsi(Message);
            }
            return null;
        }
    }

    // Native bindings to Rust library
    public static class MinimactNative
    {
        private const string LibName = "minimact";

        // Predictor functions
        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern UIntPtr minimact_predictor_new();

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern UIntPtr minimact_predictor_new_with_config(float minConfidence, UIntPtr maxPatternsPerKey);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern FfiResult minimact_predictor_destroy(UIntPtr handle);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern FfiResult minimact_predictor_learn(
            UIntPtr handle,
            [MarshalAs(UnmanagedType.LPSTR)] string stateChangeJson,
            [MarshalAs(UnmanagedType.LPSTR)] string oldTreeJson,
            [MarshalAs(UnmanagedType.LPSTR)] string newTreeJson);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern IntPtr minimact_predictor_predict(
            UIntPtr handle,
            [MarshalAs(UnmanagedType.LPSTR)] string stateChangeJson,
            [MarshalAs(UnmanagedType.LPSTR)] string currentTreeJson);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern IntPtr minimact_predictor_stats(UIntPtr handle);

        // Reconciliation
        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern IntPtr minimact_reconcile(
            [MarshalAs(UnmanagedType.LPSTR)] string oldJson,
            [MarshalAs(UnmanagedType.LPSTR)] string newJson);

        // Memory management
        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern void minimact_free_string(IntPtr ptr);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern void minimact_free_error(IntPtr ptr);

        // Logging functions
        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern void minimact_logging_enable();

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern void minimact_logging_disable();

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern void minimact_logging_set_level(uint level);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern IntPtr minimact_logging_get_logs();

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern void minimact_logging_clear();

        // Metrics functions
        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern IntPtr minimact_metrics_get();

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        public static extern void minimact_metrics_reset();
    }

    // Helper class for JSON marshalling
    public static class MinimactHelper
    {
        public static string? GetStringAndFree(IntPtr ptr)
        {
            if (ptr == IntPtr.Zero)
                return null;

            try
            {
                return Marshal.PtrToStringAnsi(ptr);
            }
            finally
            {
                MinimactNative.minimact_free_string(ptr);
            }
        }

        public static T? DeserializeJson<T>(string json)
        {
            return JsonConvert.DeserializeObject<T>(json);
        }

        public static string SerializeJson(object obj)
        {
            return JsonConvert.SerializeObject(obj);
        }
    }
}
