using System;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Threading.Tasks;

namespace Minimact.AspNetCore.Runtime;

/// <summary>
/// Bridge between C# and Rust task runtime via FFI
/// </summary>
public class RustTaskBridge
{
    private static RustTaskBridge? _instance;
    private static readonly object _lock = new();

    // FFI imports from minimact_rust_runtime.dll
    [DllImport("minimact_rust_runtime", EntryPoint = "minimact_runtime_init", CallingConvention = CallingConvention.Cdecl)]
    private static extern bool RustRuntimeInit();

    [DllImport("minimact_rust_runtime", EntryPoint = "minimact_execute_task", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr RustExecuteTask(
        [MarshalAs(UnmanagedType.LPStr)] string taskId,
        [MarshalAs(UnmanagedType.LPStr)] string inputJson
    );

    [DllImport("minimact_rust_runtime", EntryPoint = "minimact_get_task_status", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr RustGetTaskStatus([MarshalAs(UnmanagedType.LPStr)] string taskId);

    [DllImport("minimact_rust_runtime", EntryPoint = "minimact_cancel_task", CallingConvention = CallingConvention.Cdecl)]
    private static extern bool RustCancelTask([MarshalAs(UnmanagedType.LPStr)] string taskId);

    [DllImport("minimact_rust_runtime", EntryPoint = "minimact_free_string", CallingConvention = CallingConvention.Cdecl)]
    private static extern void RustFreeString(IntPtr ptr);

    private bool _initialized = false;

    public static RustTaskBridge Instance
    {
        get
        {
            if (_instance == null)
            {
                lock (_lock)
                {
                    _instance ??= new RustTaskBridge();
                }
            }
            return _instance;
        }
    }

    private RustTaskBridge()
    {
        Initialize();
    }

    /// <summary>
    /// Initialize the Rust runtime
    /// </summary>
    private void Initialize()
    {
        if (_initialized) return;

        try
        {
            _initialized = RustRuntimeInit();
            if (_initialized)
            {
                Console.WriteLine("[Minimact] Rust runtime initialized successfully");
            }
            else
            {
                Console.WriteLine("[Minimact] Failed to initialize Rust runtime");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Minimact] Error initializing Rust runtime: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Execute a Rust task asynchronously
    /// </summary>
    public async Task<T> ExecuteAsync<T>(string taskId, object input, int pollingIntervalMs = 10, int timeoutMs = 30000)
    {
        if (!_initialized)
        {
            throw new InvalidOperationException("Rust runtime not initialized");
        }

        // Serialize input
        var inputJson = JsonSerializer.Serialize(input);

        // Call Rust FFI to start task
        var responsePtr = RustExecuteTask(taskId, inputJson);
        var responseJson = Marshal.PtrToStringAnsi(responsePtr);
        RustFreeString(responsePtr);

        if (string.IsNullOrEmpty(responseJson))
        {
            throw new Exception("Failed to execute Rust task: empty response");
        }

        var response = JsonSerializer.Deserialize<ExecuteResponse>(responseJson);
        if (response == null || !response.success)
        {
            throw new Exception($"Failed to execute Rust task: {response?.error ?? "unknown error"}");
        }

        // Poll for completion
        var startTime = DateTime.UtcNow;
        while (true)
        {
            // Check timeout
            if ((DateTime.UtcNow - startTime).TotalMilliseconds > timeoutMs)
            {
                // Cancel task
                RustCancelTask(taskId);
                throw new TimeoutException($"Rust task '{taskId}' timed out after {timeoutMs}ms");
            }

            // Get status
            var statusPtr = RustGetTaskStatus(taskId);
            var statusJson = Marshal.PtrToStringAnsi(statusPtr);
            RustFreeString(statusPtr);

            if (string.IsNullOrEmpty(statusJson))
            {
                throw new Exception("Failed to get Rust task status: empty response");
            }

            var status = JsonSerializer.Deserialize<TaskStatus>(statusJson);

            if (status == null)
            {
                throw new Exception("Failed to deserialize Rust task status");
            }

            // Check status
            if (status.status == "complete")
            {
                // Task completed successfully
                if (status.result == null)
                {
                    throw new Exception("Task completed but no result available");
                }

                return JsonSerializer.Deserialize<T>(status.result.ToString() ?? "null")
                    ?? throw new Exception("Failed to deserialize task result");
            }

            if (status.status == "error")
            {
                throw new Exception($"Rust task failed: {status.error ?? "unknown error"}");
            }

            if (status.status == "cancelled")
            {
                throw new OperationCanceledException($"Rust task '{taskId}' was cancelled");
            }

            // Still running, wait and poll again
            await Task.Delay(pollingIntervalMs);
        }
    }

    /// <summary>
    /// Cancel a running Rust task
    /// </summary>
    public void Cancel(string taskId)
    {
        if (!_initialized)
        {
            throw new InvalidOperationException("Rust runtime not initialized");
        }

        RustCancelTask(taskId);
    }

    // Response DTOs
    private class ExecuteResponse
    {
        public bool success { get; set; }
        public string? task_id { get; set; }
        public string? error { get; set; }
    }

    private class TaskStatus
    {
        public string status { get; set; } = "";
        public double progress { get; set; }
        public object? result { get; set; }
        public string? error { get; set; }
    }
}
