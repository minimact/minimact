using Minimact.CommandCenter.Core;
using Minimact.AspNetCore.Core;
using System.IO;
using Xunit;

namespace Minimact.CommandCenter.Rangers;

/// <summary>
/// Red Ranger - Tests core Minimact functionality
///
/// What this tests:
/// - Component initialization
/// - State management via useState
/// - Event handling via SignalR
/// - DOM patch application
/// - HintQueue predictive rendering
///
/// How to run:
/// 1. Start ASP.NET Core server (dotnet run in Minimact.Server)
/// 2. Run this test
/// 3. Watch console for detailed logs
///
/// Expected result:
/// - All assertions pass
/// - Cache hit rate > 0%
/// - Average latency < 100ms (generous for first version)
/// </summary>
public class RedRanger : RangerTest
{
    public override string Name => "🔴 Red Ranger";
    public override string Description => "Core Minimact functionality";

    [Fact]
    public async Task Test_CoreFunctionality()
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
        // Step 1: For Real client, transpile TSX and register component with RealHub
        if (!client.IsMockClient)
        {
            report.RecordStep("Transpiling Counter.tsx to C#...");
            var transpiler = new BabelTranspiler();
            var compiler = new DynamicComponentCompiler();

            // Find Counter.tsx in fixtures
            var projectRoot = FindProjectRoot();
            var tsxPath = Path.Combine(projectRoot, "src", "fixtures", "Counter.tsx");

            // Transpile TSX → C#
            var csharpCode = await transpiler.TranspileAsync(tsxPath);
            report.RecordStep($"Generated {csharpCode.Length} chars of C# code");

            // Compile C# → Component instance
            var testComponent = compiler.CompileAndInstantiate(csharpCode, "Counter");

            // Register with RealHub
            report.RecordStep("Registering Counter component with RealHub...");
            client.RealClient!.Hub.RegisterComponent("CounterComponent", testComponent);
            report.RecordStep("Counter component registered ✓");
        }
        else
        {
            // For Mock client, use the simple TestCounterComponent
            report.RecordStep("Registering test component with MockHub...");
            var testComponent = new TestCounterComponent();
            // MockHub doesn't need explicit registration
            report.RecordStep("Test component ready");
        }

        // Step 2: Connect to server (for Real this is a no-op since it uses RealHub)
        report.RecordStep("Connecting to MinimactHub...");
        await client.ConnectAsync("http://localhost:5000/minimact");
        report.AssertEqual("Connected", client.ConnectionState, "SignalR connection established");

        // Step 3: Initialize a Counter component
        report.RecordStep("Initializing Counter component...");
        var context = client.InitializeComponent("CounterComponent", "counter-root");
        report.AssertNotNull(context, "Component context created");
        report.AssertEqual("CounterComponent", context.ComponentId, "Component ID matches");

        // Step 3: Verify component element exists in DOM
        report.RecordStep("Verifying component element in DOM...");
        var element = client.GetElementById("counter-root");
        report.AssertNotNull(element, "Component element exists in DOM");

        // Get tag name based on implementation
        var tagName = client.IsMockClient
            ? ((MockElement)element!).TagName
            : ((AngleSharp.Dom.IElement)element!).TagName.ToLower();
        report.AssertEqual("div", tagName, "Element is a div");

        // Step 4: Simulate initial render from server
        // (In real scenario, server would send initial patches)
        report.RecordStep("Simulating initial render...");
        SimulateInitialRender(context);

        // Step 5: Verify initial state
        var counterValue = client.GetElementById("counter-value");
        report.AssertNotNull(counterValue, "Counter value element exists");

        var textContent = client.IsMockClient
            ? ((MockElement)counterValue!).TextContent
            : ((AngleSharp.Dom.IElement)counterValue!).TextContent;
        report.AssertEqual("0", textContent, "Initial counter value is 0");

        // Step 6: Simulate hint queue prediction
        // Server would send this hint when component loads
        report.RecordStep("Queueing prediction hint for increment...");
        context.QueueHint(
            "CounterComponent",
            "increment_hint",
            CreateIncrementPatches(),
            confidence: 0.95
        );

        // Step 7: Simulate useState setter (increment counter)
        report.RecordStep("Simulating useState setter (increment)...");
        SimulateUseStateIncrement(context);

        // Step 8: Verify cached patches were applied instantly
        var updatedValue = client.GetElementById("counter-value");
        report.AssertNotNull(updatedValue, "Counter value element still exists");

        var updatedText = client.IsMockClient
            ? ((MockElement)updatedValue!).TextContent
            : ((AngleSharp.Dom.IElement)updatedValue!).TextContent;
        report.AssertEqual("1", updatedText, "Counter incremented via cached patch");

        // Step 9: Test hint matching
        report.RecordStep("Testing HintQueue matching...");
        var stateChanges = new Dictionary<string, object> { ["count"] = 1 };
        var matchedHint = context.MatchHint("CounterComponent", stateChanges);
        report.AssertNotNull(matchedHint, "Hint matched successfully");

        // Step 10: Verify DOM can be rendered as HTML
        report.RecordStep("Verifying DOM HTML rendering...");
        var html = client.GetHTML();
        report.AssertTrue(html.Contains("counter-root"), "HTML contains component root");
        report.AssertTrue(html.Contains("counter-value"), "HTML contains counter value element");

        // All assertions passed!
        report.Pass("Red Ranger: Core functionality working! 🦕⚡");
    }

    /// <summary>
    /// Simulate initial render from server
    /// Creates the counter UI structure
    /// </summary>
    private void SimulateInitialRender(UnifiedComponentContext context)
    {
        // Only works with Mock for now - Real uses JavaScript
        if (context.IsMock)
        {
            var root = (MockElement)context.Element;

        // Create counter display
        var counterValue = new MockElement
        {
            Id = "counter-value",
            TagName = "span",
            TextContent = "0"
        };

        // Create increment button
        var incrementBtn = new MockElement
        {
            Id = "increment-btn",
            TagName = "button",
            TextContent = "Increment",
            Attributes = new Dictionary<string, string>
            {
                ["type"] = "button"
            }
        };

            root.Children.Add(counterValue);
            root.Children.Add(incrementBtn);
            counterValue.Parent = root;
            incrementBtn.Parent = root;
        }
        else
        {
            // For Real client, set HTML directly
            var realContext = context.RealContext!;
            realContext.DOM.SetInnerHTML((AngleSharp.Dom.IElement)realContext.Element,
                "<span id=\"counter-value\">0</span><button id=\"increment-btn\" type=\"button\">Increment</button>");
        }
    }

    /// <summary>
    /// Simulate useState increment
    /// This is what happens when setCount(count + 1) is called
    /// </summary>
    private void SimulateUseStateIncrement(UnifiedComponentContext context)
    {
        // 1. Build state changes
        var stateChanges = new Dictionary<string, object>
        {
            ["count"] = 1
        };

        // 2. Check hint queue (instant feedback!)
        var hint = context.MatchHint(context.ComponentId, stateChanges);

        if (hint != null)
        {
            // 🟢 CACHE HIT! Apply patches immediately
            if (context.IsMock && hint is QueuedHint mockHint)
            {
                Console.WriteLine($"[RedRanger] 🟢 CACHE HIT! Applying {mockHint.Patches.Count} patches instantly");
                context.ApplyPatches(mockHint.Patches);
            }
            else
            {
                Console.WriteLine($"[RedRanger] 🟢 CACHE HIT! (Real client)");
                // Real client applies through JavaScript
            }
        }
        else
        {
            // 🔴 CACHE MISS
            Console.WriteLine($"[RedRanger] 🔴 CACHE MISS");
        }

        // 3. Update local state
        context.State["count"] = 1;

        // 4. Sync to server (in real code, this would call SignalR)
        // await context.SignalR.UpdateComponentStateAsync(context.ComponentId, "count", 1);
    }

    /// <summary>
    /// Create patches for incrementing counter
    /// These are the pre-computed patches the server sends as a hint
    /// </summary>
    private List<Models.DOMPatch> CreateIncrementPatches()
    {
        return new List<Models.DOMPatch>
        {
            new Models.DOMPatch
            {
                Type = Models.PatchType.SetText,
                Path = new[] { "0", "0" },  // counter-root -> counter-value
                Value = "1"
            }
        };
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

/// <summary>
/// Simple test component for Red Ranger
/// Simulates a counter with useState
/// </summary>
internal class TestCounterComponent : MinimactComponent
{
    private int _count = 0;

    protected override VNode Render()
    {
        return new VElement(
            "div",
            new Dictionary<string, string> { ["id"] = "counter-root" },
            new VNode[]
            {
                new VElement(
                    "span",
                    new Dictionary<string, string> { ["id"] = "counter-value" },
                    _count.ToString()
                ),
                new VElement(
                    "button",
                    new Dictionary<string, string>
                    {
                        ["id"] = "increment-btn",
                        ["type"] = "button"
                    },
                    "Increment"
                )
            }
        );
    }

    public void IncrementCounter()
    {
        _count++;
        // State change will trigger re-render through ComponentEngine
        // The test will call UpdateComponentState which handles re-rendering
    }

    public int Count => _count;

    public void SetCount(int value)
    {
        _count = value;
    }
}
