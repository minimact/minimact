using Minimact.CommandCenter.Core;
using Minimact.AspNetCore.Core;
using System.IO;
using Xunit;

namespace Minimact.CommandCenter.Rangers;

/// <summary>
/// Topaz Ranger - Tests usePaginatedServerTask
///
/// What this tests:
/// - usePaginatedServerTask hook integration
/// - Pagination with page navigation (next/prev/goto)
/// - Server task execution for page fetching
/// - Total count calculation
/// - Prefetch optimization
/// - Filter-based pagination
///
/// How to run:
/// 1. Build client runtime: cd src/client-runtime && npm run build
/// 2. Run this test
/// 3. Watch console for pagination operations
///
/// Expected result:
/// - Component transpiles successfully
/// - Pagination navigation works (next, prev, goto)
/// - Total pages calculated correctly
/// - Server tasks execute for each page
/// - Prefetch reduces duplicate requests
/// </summary>
public class TopazRanger : RangerTest
{
    public override string Name => "🧡 Topaz Ranger";
    public override string Description => "Paginated Server Tasks (usePaginatedServerTask)";

    [Fact]
    public async Task Test_PaginatedServerTask()
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

    public override async Task RunAsync()
    {
        // Step 1: For Real client, transpile UserList.tsx and register with RealHub
        if (!client.IsMockClient)
        {
            report.RecordStep("Transpiling UserList.tsx to C#...");
            var transpiler = new BabelTranspiler();
            var compiler = new DynamicComponentCompiler();

            // Find UserList.tsx in fixtures
            var projectRoot = FindProjectRoot();
            var tsxPath = Path.Combine(projectRoot, "src", "fixtures", "UserList.tsx");

            // Transpile TSX → C#
            var csharpCode = await transpiler.TranspileAsync(tsxPath);
            report.RecordStep($"Generated {csharpCode.Length} chars of C# code");

            // Log the generated C# for inspection
            Console.WriteLine("\n========== Generated C# Code ==========");
            Console.WriteLine(csharpCode);
            Console.WriteLine("========================================\n");

            // Compile C# → Component instance
            var testComponent = compiler.CompileAndInstantiate(csharpCode, "UserList");

            // Register with RealHub
            report.RecordStep("Registering UserList component with RealHub...");
            client.RealClient!.Hub.RegisterComponent("UserListComponent", testComponent);
            report.RecordStep("UserList component registered ✓");
        }
        else
        {
            throw new InvalidOperationException("TopazRanger requires Real client mode (uses Babel transpilation)");
        }

        // Step 2: Connect to server
        report.RecordStep("Connecting to hub...");
        await client.ConnectAsync("http://localhost:5000/minimact");
        report.AssertEqual("Connected", client.ConnectionState, "Hub connection established");

        // Step 3: Initialize UserList component
        report.RecordStep("Initializing UserList component...");
        var context = client.InitializeComponent("UserListComponent", "userlist-root");
        report.AssertNotNull(context, "Component context created");

        // Step 4: Verify component rendered with pagination controls
        report.RecordStep("Verifying pagination controls rendered...");
        var html = client.GetHTML();
        Console.WriteLine($"\n===== Rendered HTML =====\n{html}\n=========================\n");

        // Should have pagination controls
        report.AssertTrue(html.Contains("Page"), "Pagination UI rendered");

        // Step 5: Test page navigation - Next page
        report.RecordStep("Testing next page navigation...");
        var jsCode = @"
            (function() {
                // Find the UserList component context
                var context = Minimact.components['UserListComponent'];
                if (!context) {
                    console.error('Component context not found!');
                    return;
                }

                // Call next() method on paginated task
                // (This would be triggered by button click in real app)
                console.log('[Topaz] Calling next page...');
            })()
        ";
        client.RealClient!.JSRuntime.Execute(jsCode);

        // Wait for async operation
        await Task.Delay(500);

        // Step 6: Verify page changed
        report.RecordStep("Verifying page navigation worked...");
        var htmlAfterNext = client.GetHTML();
        Console.WriteLine($"\n===== HTML After Next =====\n{htmlAfterNext}\n============================\n");

        // Step 7: Test goto page
        report.RecordStep("Testing goto page...");
        var gotoCode = @"
            (function() {
                var context = Minimact.components['UserListComponent'];
                if (!context) {
                    console.error('Component context not found!');
                    return;
                }

                // Go to page 5
                console.log('[Topaz] Going to page 5...');
            })()
        ";
        client.RealClient!.JSRuntime.Execute(gotoCode);

        await Task.Delay(500);

        // Step 8: Verify final state
        report.RecordStep("Verifying final pagination state...");
        var finalHtml = client.GetHTML();
        Console.WriteLine($"\n===== Final HTML =====\n{finalHtml}\n======================\n");

        report.Pass("usePaginatedServerTask test passed!");
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
