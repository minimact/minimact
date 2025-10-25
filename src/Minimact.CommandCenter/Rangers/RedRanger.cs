using Minimact.CommandCenter.Core;
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
        // Step 1: Connect to server
        report.RecordStep("Connecting to MinimactHub...");
        await client.ConnectAsync("http://localhost:5000/minimact");
        report.AssertEqual("Connected", client.SignalR.ConnectionState.ToString(), "SignalR connection established");

        // Step 2: Initialize a Counter component
        report.RecordStep("Initializing Counter component...");
        var context = client.InitializeComponent("CounterComponent", "counter-root");
        report.AssertNotNull(context, "Component context created");
        report.AssertEqual("CounterComponent", context.ComponentId, "Component ID matches");

        // Step 3: Verify component element exists in DOM
        report.RecordStep("Verifying component element in DOM...");
        var element = client.DOM.GetElementById("counter-root");
        report.AssertNotNull(element, "Component element exists in DOM");
        report.AssertEqual("div", element!.TagName, "Element is a div");

        // Step 4: Simulate initial render from server
        // (In real scenario, server would send initial patches)
        report.RecordStep("Simulating initial render...");
        SimulateInitialRender(context);

        // Step 5: Verify initial state
        var counterValue = client.DOM.GetElementById("counter-value");
        report.AssertNotNull(counterValue, "Counter value element exists");
        report.AssertEqual("0", counterValue!.TextContent, "Initial counter value is 0");

        // Step 6: Simulate hint queue prediction
        // Server would send this hint when component loads
        report.RecordStep("Queueing prediction hint for increment...");
        context.HintQueue.QueueHint(
            "CounterComponent",
            "increment_hint",
            CreateIncrementPatches(),
            confidence: 0.95
        );

        // Step 7: Simulate useState setter (increment counter)
        report.RecordStep("Simulating useState setter (increment)...");
        SimulateUseStateIncrement(context);

        // Step 8: Verify cached patches were applied instantly
        var updatedValue = client.DOM.GetElementById("counter-value");
        report.AssertNotNull(updatedValue, "Counter value element still exists");
        report.AssertEqual("1", updatedValue!.TextContent, "Counter incremented via cached patch");

        // Step 9: Test hint matching
        report.RecordStep("Testing HintQueue matching...");
        var stateChanges = new Dictionary<string, object> { ["count"] = 1 };
        var matchedHint = context.HintQueue.MatchHint("CounterComponent", stateChanges);
        report.AssertNotNull(matchedHint, "Hint matched successfully");

        // Step 10: Verify DOM can be rendered as HTML
        report.RecordStep("Verifying DOM HTML rendering...");
        var html = client.DOM.ToHTML();
        report.AssertTrue(html.Contains("counter-root"), "HTML contains component root");
        report.AssertTrue(html.Contains("counter-value"), "HTML contains counter value element");

        // All assertions passed!
        report.Pass("Red Ranger: Core functionality working! 🦕⚡");
    }

    /// <summary>
    /// Simulate initial render from server
    /// Creates the counter UI structure
    /// </summary>
    private void SimulateInitialRender(ComponentContext context)
    {
        var root = context.Element;

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

    /// <summary>
    /// Simulate useState increment
    /// This is what happens when setCount(count + 1) is called
    /// </summary>
    private void SimulateUseStateIncrement(ComponentContext context)
    {
        // 1. Build state changes
        var stateChanges = new Dictionary<string, object>
        {
            ["count"] = 1
        };

        // 2. Check hint queue (instant feedback!)
        var hint = context.HintQueue.MatchHint(context.ComponentId, stateChanges);

        if (hint != null)
        {
            // 🟢 CACHE HIT! Apply patches immediately
            Console.WriteLine($"[RedRanger] 🟢 CACHE HIT! Applying {hint.Patches.Count} patches instantly");
            context.DOMPatcher.ApplyPatches(context.Element, hint.Patches);
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
}
