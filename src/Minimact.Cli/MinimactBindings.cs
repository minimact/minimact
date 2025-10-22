using System.Runtime.InteropServices;
using Newtonsoft.Json;

namespace Minimact.Cli;

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

public static class MinimactNative
{
    private const string LibName = "minimact";

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern UIntPtr minimact_predictor_new();

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern UIntPtr minimact_predictor_new_with_config(float minConfidence, UIntPtr maxPatternsPerKey);

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern FfiResult minimact_predictor_destroy(UIntPtr handle);

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern FfiResult minimact_predictor_learn(
        UIntPtr handle,
        [MarshalAs(UnmanagedType.LPStr)] string stateChangeJson,
        [MarshalAs(UnmanagedType.LPStr)] string oldTreeJson,
        [MarshalAs(UnmanagedType.LPStr)] string newTreeJson);

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr minimact_predictor_predict(
        UIntPtr handle,
        [MarshalAs(UnmanagedType.LPStr)] string stateChangeJson,
        [MarshalAs(UnmanagedType.LPStr)] string currentTreeJson);

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr minimact_predictor_stats(UIntPtr handle);

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr minimact_predictor_save(UIntPtr handle);

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern UIntPtr minimact_predictor_load([MarshalAs(UnmanagedType.LPStr)] string jsonStr);

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr minimact_reconcile(
        [MarshalAs(UnmanagedType.LPStr)] string oldJson,
        [MarshalAs(UnmanagedType.LPStr)] string newJson);

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern void minimact_free_string(IntPtr ptr);

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

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr minimact_metrics_get();

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern void minimact_metrics_reset();
}

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
        return JsonConvert.SerializeObject(obj, Formatting.Indented);
    }
}
