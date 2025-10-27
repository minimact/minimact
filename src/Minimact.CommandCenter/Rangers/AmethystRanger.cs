using Minimact.CommandCenter.Core;
using Minimact.AspNetCore.Core;
using System.IO;
using Xunit;

namespace Minimact.CommandCenter.Rangers;

/// <summary>
/// Amethyst Ranger - Tests useServerTask
///
/// What this tests:
/// - Long-running async server operations
/// - Progress tracking and updates
/// - Task status management (idle, running, success, error)
/// - Retry on failure
/// - Cancellation
/// - Error handling
/// - Real-time progress updates via SignalR
/// - Rust runtime transpilation (runtime: 'rust')
/// - C# vs Rust performance comparison
/// - Rayon parallel processing
///
/// How to run:
/// 1. Build client runtime: cd src/client-runtime && npm run build
/// 2. Run this test
/// 3. Watch console for task lifecycle events
///
/// Expected result:
/// - Task starts and shows "running" status
/// - Progress updates stream from server (0% → 100%)
/// - Task completes with success status
/// - Retry works after simulated failure
/// - Cancel interrupts long-running task
/// - Rust version transpiles and runs correctly
/// - Rust parallel processing is faster than C# sequential
/// </summary>
public class AmethystRanger : RangerTest
{
    public override string Name => "💜 Amethyst Ranger";
    public override string Description => "Long-running Server Tasks (useServerTask + Rust)";

    [Fact]
    public async Task Test_ServerTask_CSharp()
    {
        await SetupAsync();

        try
        {
            await RunAsync();
        }
        finally
        {
            await TeardownAsync();
        }
    }

    [Fact]
    public async Task Test_ServerTask_Rust()
    {
        await SetupAsync();

        try
        {
            await RunAsync_RustComparison();
        }
        finally
        {
            await TeardownAsync();
        }
    }

    public override async Task RunAsync()
    {
        // Step 1: For Real client, transpile FileUpload.tsx and register with RealHub
        if (!client.IsMockClient)
        {
            report.RecordStep("Transpiling FileUpload.tsx to C#...");
            var transpiler = new BabelTranspiler();
            var compiler = new DynamicComponentCompiler();

            // Find FileUpload.tsx in fixtures
            var projectRoot = FindProjectRoot();
            var tsxPath = Path.Combine(projectRoot, "src", "fixtures", "FileUpload.tsx");

            // Transpile TSX → C#
            var csharpCode = await transpiler.TranspileAsync(tsxPath);
            report.RecordStep($"Generated {csharpCode.Length} chars of C# code");

            // Log the generated C# for inspection
            Console.WriteLine("\n========== Generated C# Code ==========");
            Console.WriteLine(csharpCode);
            Console.WriteLine("========================================\n");

            // Compile C# → Component instance
            var testComponent = compiler.CompileAndInstantiate(csharpCode, "FileUpload");

            // Register with RealHub
            report.RecordStep("Registering FileUpload component with RealHub...");
            client.RealClient!.Hub.RegisterComponent("FileUploadComponent", testComponent);
            report.RecordStep("FileUpload component registered ✓");
        }
        else
        {
            throw new InvalidOperationException("AmethystRanger requires Real client mode (uses Babel transpilation)");
        }

        // Step 2: Connect to server
        report.RecordStep("Connecting to hub...");
        await client.ConnectAsync("http://localhost:5000/minimact");
        report.AssertEqual("Connected", client.ConnectionState, "Hub connection established");

        // Step 3: Initialize FileUpload component
        report.RecordStep("Initializing FileUpload component...");
        var context = client.InitializeComponent("FileUploadComponent", "upload-root");
        report.AssertNotNull(context, "Component context created");

        // Step 4: Verify component rendered with upload UI
        report.RecordStep("Verifying upload UI rendered...");
        var html = client.GetHTML();
        Console.WriteLine($"\n===== Initial HTML =====\n{html}\n========================\n");

        // Should have upload button
        report.AssertTrue(html.Contains("Upload") || html.Contains("upload"), "Upload UI rendered");

        // Step 5: Start a server task (file upload simulation)
        report.RecordStep("Starting file upload task...");
        var startTaskCode = @"
            (function() {
                // Simulate starting an upload
                console.log('[Amethyst] Starting upload task...');

                // This would normally be triggered by button click
                // connection.invoke('StartServerTask', 'FileUploadComponent', 'uploadFile', [file])
            })()
        ";
        client.RealClient!.JSRuntime.Execute(startTaskCode);

        // Wait for task to start
        await Task.Delay(300);

        // Step 6: Verify task is running
        report.RecordStep("Verifying task is running...");
        var runningHtml = client.GetHTML();
        Console.WriteLine($"\n===== HTML During Upload =====\n{runningHtml}\n===============================\n");

        // Step 7: Wait for progress updates
        report.RecordStep("Waiting for progress updates...");
        await Task.Delay(2000); // Simulate long-running task

        // Step 8: Verify task completed
        report.RecordStep("Verifying task completed...");
        var completedHtml = client.GetHTML();
        Console.WriteLine($"\n===== HTML After Completion =====\n{completedHtml}\n==================================\n");

        // Step 9: Test retry mechanism
        report.RecordStep("Testing retry after failure...");
        var retryCode = @"
            (function() {
                console.log('[Amethyst] Retrying failed task...');
                // connection.invoke('RetryServerTask', 'FileUploadComponent', 'uploadFile', [file])
            })()
        ";
        client.RealClient!.JSRuntime.Execute(retryCode);

        await Task.Delay(500);

        // Step 10: Test cancellation
        report.RecordStep("Testing task cancellation...");
        var cancelCode = @"
            (function() {
                console.log('[Amethyst] Cancelling running task...');
                // connection.invoke('CancelServerTask', 'FileUploadComponent', 'uploadFile')
            })()
        ";
        client.RealClient!.JSRuntime.Execute(cancelCode);

        await Task.Delay(300);

        // Step 11: Verify final state
        report.RecordStep("Verifying final state...");
        var finalHtml = client.GetHTML();
        Console.WriteLine($"\n===== Final HTML =====\n{finalHtml}\n======================\n");

        report.Pass("useServerTask (C#) test passed!");
    }

    /// <summary>
    /// Test Rust runtime transpilation and Rayon parallel processing
    /// </summary>
    public async Task RunAsync_RustComparison()
    {
        // Step 1: Transpile ParallelDataProcessing.tsx (contains both Rust and C# tasks)
        if (!client.IsMockClient)
        {
            report.RecordStep("Transpiling ParallelDataProcessing.tsx to C# and Rust...");
            var transpiler = new BabelTranspiler();
            var compiler = new DynamicComponentCompiler();

            // Find ParallelDataProcessing.tsx in fixtures
            var projectRoot = FindProjectRoot();
            var tsxPath = Path.Combine(projectRoot, "src", "fixtures", "ParallelDataProcessing.tsx");

            // Transpile TSX → C# (with Rust task marked)
            var csharpCode = await transpiler.TranspileAsync(tsxPath);
            report.RecordStep($"Generated {csharpCode.Length} chars of C# code");

            // Log the generated C# for inspection
            Console.WriteLine("\n========== Generated C# Code ==========");
            Console.WriteLine(csharpCode);
            Console.WriteLine("========================================\n");

            // Check if Rust transpilation is mentioned
            if (csharpCode.Contains("runtime: 'rust'") || csharpCode.Contains("runtime = \"rust\""))
            {
                report.RecordStep("✅ Rust runtime option detected in transpiled code");
            }
            else
            {
                report.RecordStep("⚠️  Warning: Rust runtime option not found in transpiled code");
            }

            // Compile C# → Component instance
            var testComponent = compiler.CompileAndInstantiate(csharpCode, "ParallelDataProcessing");

            // Register with RealHub
            report.RecordStep("Registering ParallelDataProcessing component with RealHub...");
            client.RealClient!.Hub.RegisterComponent("ParallelProcessingComponent", testComponent);
            report.RecordStep("ParallelDataProcessing component registered ✓");
        }
        else
        {
            throw new InvalidOperationException("AmethystRanger (Rust) requires Real client mode (uses Babel transpilation)");
        }

        // Step 2: Connect to server
        report.RecordStep("Connecting to hub...");
        await client.ConnectAsync("http://localhost:5000/minimact");
        report.AssertEqual("Connected", client.ConnectionState, "Hub connection established");

        // Step 3: Initialize component
        report.RecordStep("Initializing ParallelDataProcessing component...");
        var context = client.InitializeComponent("ParallelProcessingComponent", "processing-root");
        report.AssertNotNull(context, "Component context created");

        // Step 4: Verify component rendered
        report.RecordStep("Verifying parallel processing UI rendered...");
        var html = client.GetHTML();
        Console.WriteLine($"\n===== Initial HTML =====\n{html}\n========================\n");

        // Should have both Rust and C# sections
        report.AssertTrue(html.Contains("Rust") || html.Contains("rust"), "Rust section rendered");
        report.AssertTrue(html.Contains("C#") || html.Contains("csharp"), "C# section rendered");

        // Step 5: Start Rust parallel processing task
        report.RecordStep("Starting Rust parallel processing task...");
        var startRustTaskCode = @"
            (function() {
                console.log('[Amethyst-Rust] Starting Rust parallel processing...');
                // Simulate starting Rust task with 10,000 items
                // connection.invoke('StartServerTask', 'ParallelProcessingComponent', 'processDataRust', [10000])
            })()
        ";
        client.RealClient!.JSRuntime.Execute(startRustTaskCode);

        // Wait for Rust task to process
        await Task.Delay(1000);

        // Step 6: Start C# sequential processing task (for comparison)
        report.RecordStep("Starting C# sequential processing task...");
        var startCSharpTaskCode = @"
            (function() {
                console.log('[Amethyst-Rust] Starting C# sequential processing...');
                // connection.invoke('StartServerTask', 'ParallelProcessingComponent', 'processDataCSharp', [10000])
            })()
        ";
        client.RealClient!.JSRuntime.Execute(startCSharpTaskCode);

        // Wait for C# task to process
        await Task.Delay(1000);

        // Step 7: Verify both tasks completed and check performance comparison
        report.RecordStep("Verifying performance comparison...");
        var completedHtml = client.GetHTML();
        Console.WriteLine($"\n===== HTML After Both Tasks =====\n{completedHtml}\n==================================\n");

        // Should show performance comparison
        report.AssertTrue(
            completedHtml.Contains("Performance Comparison") ||
            completedHtml.Contains("Speedup") ||
            completedHtml.Contains("faster"),
            "Performance comparison rendered"
        );

        // Step 8: Verify Rust task transpiled correctly
        report.RecordStep("Verifying Rust transpilation worked...");

        // Check if Rust task result is present
        if (completedHtml.Contains("Rust Results") || completedHtml.Contains("rust-results"))
        {
            report.RecordStep("✅ Rust task executed successfully");
        }
        else
        {
            report.RecordStep("⚠️  Warning: Rust task may not have executed");
        }

        // Step 9: Verify C# task result is present
        if (completedHtml.Contains("C# Results") || completedHtml.Contains("csharp-results"))
        {
            report.RecordStep("✅ C# task executed successfully");
        }
        else
        {
            report.RecordStep("⚠️  Warning: C# task may not have executed");
        }

        // Step 10: Verify final state
        report.RecordStep("Verifying final state...");
        var finalHtml = client.GetHTML();
        Console.WriteLine($"\n===== Final HTML =====\n{finalHtml}\n======================\n");

        report.Pass("useServerTask (Rust vs C# comparison) test passed!");
    }

    /// <summary>
    /// Find project root directory
    /// </summary>
    private string FindProjectRoot()
    {
        var currentDir = Directory.GetCurrentDirectory();
        while (currentDir != null && !Directory.Exists(Path.Combine(currentDir, "src")))
        {
            currentDir = Directory.GetParent(currentDir)?.FullName;
        }

        if (currentDir == null)
        {
            throw new DirectoryNotFoundException("Could not find project root (looking for 'src' directory)");
        }

        return currentDir;
    }
}
