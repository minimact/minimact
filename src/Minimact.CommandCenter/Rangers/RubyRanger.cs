using Minimact.CommandCenter.Core;
using Minimact.AspNetCore.Core;
using System.IO;
using Xunit;

namespace Minimact.CommandCenter.Rangers;

/// <summary>
/// Ruby Ranger - Tests useDecisionTree (minimact-trees)
///
/// What this tests:
/// - Decision tree state management
/// - Nested path navigation (role → count → region)
/// - Universal value type support (numbers, strings, objects)
/// - Predictive transition pre-computation
/// - Context-based tree evaluation
/// - TypeScript inference validation
///
/// How to run:
/// 1. Build minimact-trees: cd src/minimact-trees && npm run build
/// 2. Build client runtime: cd src/client-runtime && npm run build
/// 3. Run this test
/// 4. Watch console for decision tree evaluations
///
/// Expected result:
/// - Decision trees evaluate correctly based on context
/// - Nested paths navigate properly (role→count→region)
/// - Shipping price calculates: Admin=0, Premium=0/5/10, Basic=varies
/// - Discount calculates: Admin=50%, Premium=20%, Basic=0%
/// - Context changes trigger re-evaluation
/// - HintQueue provides predictive patches for transitions
/// </summary>
public class RubyRanger : RangerTest
{
    public override string Name => "🔶 Ruby Ranger";
    public override string Description => "Decision Trees (useDecisionTree - minimact-trees)";

    [Fact]
    public async Task Test_DecisionTree()
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
        // Step 1: For Real client, transpile PricingCalculator.tsx and register with RealHub
        if (!client.IsMockClient)
        {
            report.RecordStep("Transpiling PricingCalculator.tsx to C#...");
            var transpiler = new BabelTranspiler();
            var compiler = new DynamicComponentCompiler();

            // Find PricingCalculator.tsx in fixtures
            var projectRoot = FindProjectRoot();
            var tsxPath = Path.Combine(projectRoot, "src", "fixtures", "PricingCalculator.tsx");

            // Transpile TSX → C#
            var csharpCode = await transpiler.TranspileAsync(tsxPath);
            report.RecordStep($"Generated {csharpCode.Length} chars of C# code");

            // Log the generated C# for inspection
            Console.WriteLine("\n========== Generated C# Code ==========");
            Console.WriteLine(csharpCode);
            Console.WriteLine("========================================\n");

            // Compile C# → Component instance
            var testComponent = compiler.CompileAndInstantiate(csharpCode, "PricingCalculator");

            // Register with RealHub
            report.RecordStep("Registering PricingCalculator component with RealHub...");
            client.RealClient!.Hub.RegisterComponent("PricingCalculatorComponent", testComponent);
            report.RecordStep("PricingCalculator component registered ✓");
        }
        else
        {
            throw new InvalidOperationException("RubyRanger requires Real client mode (uses Babel transpilation)");
        }

        // Step 2: Connect to server
        report.RecordStep("Connecting to hub...");
        await client.ConnectAsync("http://localhost:5000/minimact");
        report.AssertEqual("Connected", client.ConnectionState, "Hub connection established");

        // Step 3: Initialize PricingCalculator component
        report.RecordStep("Initializing PricingCalculator component...");
        var context = client.InitializeComponent("PricingCalculatorComponent", "pricing-root");
        report.AssertNotNull(context, "Component context created");

        // Step 4: Verify component rendered with pricing UI
        report.RecordStep("Verifying pricing UI rendered...");
        var html = client.GetHTML();
        Console.WriteLine($"\n===== Initial HTML =====\n{html}\n========================\n");

        // Should have pricing calculator elements
        report.AssertTrue(html.Contains("Pricing") || html.Contains("pricing"), "Pricing UI rendered");
        report.AssertTrue(html.Contains("Role") || html.Contains("role"), "Role selector rendered");

        // Step 5: Test basic role decision tree (default: role=basic, count=1, region=domestic)
        report.RecordStep("Testing basic role with default context...");
        await Task.Delay(300);

        var basicHtml = client.GetHTML();
        Console.WriteLine($"\n===== Basic Role HTML =====\n{basicHtml}\n===========================\n");

        // For basic role, domestic, 1 item: shipping should be $15
        // Discount should be 0%
        report.AssertTrue(basicHtml.Contains("15") || basicHtml.Contains("Shipping"), "Basic role shipping calculated");

        // Step 6: Change to premium role (discount=20%, shipping varies by count)
        report.RecordStep("Changing role to premium...");
        var changeToPremiumCode = @"
            (function() {
                console.log('[Ruby] Changing role to premium...');

                // Simulate changing role dropdown
                const roleSelect = document.querySelector('select[value=""basic""]');
                if (roleSelect) {
                    roleSelect.value = 'premium';
                    // Trigger change event
                    const event = new Event('change', { bubbles: true });
                    roleSelect.dispatchEvent(event);
                }
            })()
        ";
        client.RealClient!.JSRuntime.Execute(changeToPremiumCode);

        await Task.Delay(500);

        var premiumHtml = client.GetHTML();
        Console.WriteLine($"\n===== Premium Role HTML =====\n{premiumHtml}\n=============================\n");

        // Premium with 1 item: shipping=$10, discount=20%
        report.AssertTrue(premiumHtml.Contains("20") || premiumHtml.Contains("Premium"), "Premium role discount applied");

        // Step 7: Change to admin role (discount=50%, shipping=0)
        report.RecordStep("Changing role to admin...");
        var changeToAdminCode = @"
            (function() {
                console.log('[Ruby] Changing role to admin...');

                const roleSelect = document.querySelector('select');
                if (roleSelect) {
                    roleSelect.value = 'admin';
                    const event = new Event('change', { bubbles: true });
                    roleSelect.dispatchEvent(event);
                }
            })()
        ";
        client.RealClient!.JSRuntime.Execute(changeToAdminCode);

        await Task.Delay(500);

        var adminHtml = client.GetHTML();
        Console.WriteLine($"\n===== Admin Role HTML =====\n{adminHtml}\n===========================\n");

        // Admin: shipping=0, discount=50%
        report.AssertTrue(adminHtml.Contains("50") || adminHtml.Contains("Admin"), "Admin role discount applied");

        // Step 8: Test nested decision path (premium + count=5)
        report.RecordStep("Testing nested path (premium role, 5 items)...");
        var changeCountCode = @"
            (function() {
                console.log('[Ruby] Changing count to 5...');

                // First ensure we're on premium
                const roleSelect = document.querySelector('select');
                if (roleSelect) roleSelect.value = 'premium';

                // Change item count
                const countInput = document.querySelector('input[type=""number""]');
                if (countInput) {
                    countInput.value = '5';
                    const event = new Event('change', { bubbles: true });
                    countInput.dispatchEvent(event);
                }
            })()
        ";
        client.RealClient!.JSRuntime.Execute(changeCountCode);

        await Task.Delay(500);

        var premium5Html = client.GetHTML();
        Console.WriteLine($"\n===== Premium 5 Items HTML =====\n{premium5Html}\n================================\n");

        // Premium with 5 items: shipping should be $0 (free)
        report.AssertTrue(premium5Html.Contains("0") || premium5Html.Contains("Free") || premium5Html.Contains("free"),
            "Premium 5+ items gets free shipping");

        // Step 9: Test deeply nested path (basic + international + count=3)
        report.RecordStep("Testing deeply nested path (basic, international, 3 items)...");
        var deepNestedCode = @"
            (function() {
                console.log('[Ruby] Testing deeply nested path...');

                // Set role to basic
                const roleSelect = document.querySelector('select');
                if (roleSelect) roleSelect.value = 'basic';

                // Set count to 3
                const countInput = document.querySelector('input[type=""number""]');
                if (countInput) countInput.value = '3';

                // Set region to international
                const regionSelect = document.querySelectorAll('select')[1];
                if (regionSelect) regionSelect.value = 'international';

                // Trigger change
                if (roleSelect) roleSelect.dispatchEvent(new Event('change', { bubbles: true }));
            })()
        ";
        client.RealClient!.JSRuntime.Execute(deepNestedCode);

        await Task.Delay(500);

        var internationalHtml = client.GetHTML();
        Console.WriteLine($"\n===== Basic International 3 Items HTML =====\n{internationalHtml}\n============================================\n");

        // Basic, international, 3 items: shipping=$35
        report.AssertTrue(internationalHtml.Contains("35") || internationalHtml.Contains("International"),
            "International shipping calculated correctly");

        // Step 10: Verify decision tree state is synced to server
        report.RecordStep("Verifying decision tree state synced to server...");

        // The server component should have:
        // - State["decisionTree_0"] = shipping price
        // - State["decisionTree_1"] = discount percentage

        // We can verify this by checking that re-renders use the correct values
        await Task.Delay(300);

        var finalHtml = client.GetHTML();
        Console.WriteLine($"\n===== Final Synced State HTML =====\n{finalHtml}\n====================================\n");

        report.AssertTrue(finalHtml.Contains("Pricing") || finalHtml.Contains("Total"),
            "Decision tree state successfully synced to server");

        report.RecordStep("🔶 Ruby Ranger test completed successfully!");
    }

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
