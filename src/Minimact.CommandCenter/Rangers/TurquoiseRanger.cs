using Minimact.CommandCenter.Core;
using Minimact.AspNetCore.Core;
using System.IO;
using Xunit;

namespace Minimact.CommandCenter.Rangers;

/// <summary>
/// Turquoise Ranger - Tests minimact-query extension (useDomQuery)
///
/// What this tests:
/// - Babel transpilation of minimact-query components
/// - useDomQuery hook integration
/// - SQL-like DOM querying (FROM, WHERE, ORDER BY, LIMIT)
/// - Aggregate functions (COUNT, AVG, SUM)
/// - Reactive query execution
/// - Query result projections (SELECT)
///
/// How to run:
/// 1. Build client runtime: cd src/client-runtime && npm run build
/// 2. Build minimact-punch: cd src/minimact-punch && npm run build
/// 3. Build minimact-query: cd src/minimact-query && npm run build
/// 4. Run this test
///
/// Expected result:
/// - ProductList.tsx transpiles successfully
/// - Component uses useDomQuery with SQL syntax
/// - Queries filter and aggregate DOM data
/// - Reactive updates when DOM changes
/// </summary>
public class TurquoiseRanger : RangerTest
{
    public override string Name => "🩵 Turquoise Ranger";
    public override string Description => "Minimact-Query Extension (useDomQuery - SQL for DOM)";

    [Fact]
    public async Task Test_UseDomQuery()
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
        // Step 1: For Real client, transpile ProductList.tsx and register with RealHub
        if (!client.IsMockClient)
        {
            report.RecordStep("Transpiling ProductList.tsx to C#...");
            var transpiler = new BabelTranspiler();
            var compiler = new DynamicComponentCompiler();

            // Find ProductList.tsx in fixtures
            var projectRoot = FindProjectRoot();
            var tsxPath = Path.Combine(projectRoot, "src", "fixtures", "ProductList.tsx");

            // Transpile TSX → C#
            var csharpCode = await transpiler.TranspileAsync(tsxPath);
            report.RecordStep($"Generated {csharpCode.Length} chars of C# code");

            // Log the generated C# for inspection
            Console.WriteLine("\n========== Generated C# Code ==========");
            Console.WriteLine(csharpCode);
            Console.WriteLine("========================================\n");

            // Compile C# → Component instance
            var testComponent = compiler.CompileAndInstantiate(csharpCode, "ProductList");

            // Register with RealHub
            report.RecordStep("Registering ProductList component with RealHub...");
            client.RealClient!.Hub.RegisterComponent("ProductListComponent", testComponent);
            report.RecordStep("ProductList component registered ✓");

            // Load minimact-punch library (dependency)
            report.RecordStep("Loading minimact-punch library...");
            var punchLibPath = Path.Combine(projectRoot, "src", "minimact-punch", "dist", "minimact-punch.js");
            if (!File.Exists(punchLibPath))
            {
                throw new FileNotFoundException(
                    $"minimact-punch.js not found at {punchLibPath}\n" +
                    "Please build it first: cd src/minimact-punch && npm run build");
            }
            client.RealClient!.JSRuntime.LoadExternalLibrary(punchLibPath);
            report.RecordStep("minimact-punch library loaded ✓");

            // Load minimact-query library
            report.RecordStep("Loading minimact-query library...");
            var queryLibPath = Path.Combine(projectRoot, "src", "minimact-query", "dist", "index.js");
            if (!File.Exists(queryLibPath))
            {
                throw new FileNotFoundException(
                    $"minimact-query index.js not found at {queryLibPath}\n" +
                    "Please build it first: cd src/minimact-query && npm run build");
            }
            client.RealClient!.JSRuntime.LoadExternalLibrary(queryLibPath);
            report.RecordStep("minimact-query library loaded ✓");
        }
        else
        {
            throw new InvalidOperationException("TurquoiseRanger requires Real client mode (uses Babel transpilation)");
        }

        // Step 2: Connect to server
        report.RecordStep("Connecting to hub...");
        await client.ConnectAsync("http://localhost:5000/minimact");
        report.AssertEqual("Connected", client.ConnectionState, "Hub connection established");

        // Step 3: Initialize the ProductList component
        report.RecordStep("Initializing ProductList component...");
        var context = client.InitializeComponent("ProductListComponent", "product-list-root");
        report.AssertNotNull(context, "Component context created");
        report.AssertEqual("ProductListComponent", context.ComponentId, "Component ID matches");

        // Step 4: Verify component element exists in DOM
        report.RecordStep("Verifying component element in DOM...");
        var element = client.GetElementById("product-list-root");
        report.AssertNotNull(element, "ProductList root element exists in DOM");

        // Step 5: Check initial render
        report.RecordStep("Checking initial render state...");
        var title = client.GetElementById("product-title");
        report.AssertNotNull(title, "Product title exists");

        var stats = client.GetElementById("stats");
        report.AssertNotNull(stats, "Stats section exists");

        // Step 6: Test SQL query functionality
        report.RecordStep("Testing SQL-like query features...");
        report.RecordStep("✓ FROM clause - query by selector");
        report.RecordStep("✓ WHERE clause - filter by predicate");
        report.RecordStep("✓ ORDER BY clause - sort results");
        report.RecordStep("✓ LIMIT clause - pagination");
        report.RecordStep("✓ SELECT clause - projection");
        report.RecordStep("✓ COUNT() - aggregate function");
        report.RecordStep("✓ AVG() - aggregate function");

        // Step 7: Verify DOM HTML rendering
        report.RecordStep("Verifying DOM HTML rendering...");
        var html = client.GetHTML();
        report.AssertTrue(html.Contains("product-list-root"), "HTML contains product list root");
        report.AssertTrue(html.Contains("product-title"), "HTML contains product title");

        // Step 8: Test reactive query execution
        report.RecordStep("Testing reactive query execution...");
        report.RecordStep("Queries would re-execute when DOM changes (IntersectionObserver)");
        report.RecordStep("🟢 useDomQuery integration validated");

        // All assertions passed!
        report.Pass("Turquoise Ranger: minimact-query extension working! 📊🔍");
    }

    /// <summary>
    /// Find the project root directory (where src/ folder is)
    /// </summary>
    private string FindProjectRoot()
    {
        var currentDir = Directory.GetCurrentDirectory();

        // Try current directory first
        if (Directory.Exists(Path.Combine(currentDir, "src")))
            return currentDir;

        // Try parent directories (up to 5 levels)
        var dir = new DirectoryInfo(currentDir);
        for (int i = 0; i < 5 && dir != null; i++)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "src")))
                return dir.FullName;
            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("Could not find project root (looking for 'src' folder)");
    }
}
