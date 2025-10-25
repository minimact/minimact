using Minimact.CommandCenter.Core;
using Minimact.CommandCenter.Models;
using System.Diagnostics;
using Xunit;

namespace Minimact.CommandCenter.Rangers;

/// <summary>
/// 🩷 Pink Ranger - Tests performance under stress
///
/// Color: Hot Pink #FF69B4
///
/// What this tests:
/// - High-frequency state updates
/// - Large DOM trees (100+ elements)
/// - Many concurrent components (50+)
/// - Memory usage and GC pressure
/// - Patch application throughput
/// - HintQueue performance with many hints
/// - Bulk operations performance
///
/// How to run:
/// 1. This test uses MockHub (no server needed)
/// 2. Run this test
/// 3. Watch console for performance metrics
///
/// Expected result:
/// - Can handle 1000 state updates in < 5 seconds
/// - Can manage 50+ components simultaneously
/// - Can handle 100+ element DOM trees
/// - Average patch application < 10ms
/// - No memory leaks or excessive GC
/// </summary>
public class PinkRanger : RangerTest
{
    public override string Name => "🩷 Pink Ranger";
    public override string Description => "Performance stress testing";

    [Fact]
    public async Task Test_PerformanceStress()
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
        // Step 1: Initialize MockHub
        report.RecordStep("Initializing MockHub for performance testing...");
        var hub = new MockHub(client);

        // ========================================
        // Test 1: High-Frequency State Updates
        // ========================================
        report.RecordStep("Test 1: High-frequency state updates (1000 updates)...");

        var context = client.InitializeComponent("CounterComponent", "counter-root");
        SimulateCounterRender(context);

        // Queue hint for instant updates
        context.HintQueue.QueueHint(
            "CounterComponent",
            "increment_hint",
            CreateIncrementPatch(),
            confidence: 1.0
        );

        var sw = Stopwatch.StartNew();
        var updateCount = 1000;

        for (int i = 0; i < updateCount; i++)
        {
            SimulateStateUpdate(context, "count", i);
        }

        sw.Stop();
        var totalTime = sw.ElapsedMilliseconds;
        var avgLatency = totalTime / (double)updateCount;

        Console.WriteLine($"  📊 {updateCount} updates in {totalTime}ms");
        Console.WriteLine($"  ⚡ Average: {avgLatency:F2}ms per update");
        Console.WriteLine($"  🚀 Throughput: {updateCount / (totalTime / 1000.0):F0} updates/sec");

        report.AssertTrue(avgLatency < 10.0,
            $"Average update latency < 10ms (actual: {avgLatency:F2}ms)");

        report.AssertTrue(totalTime < 5000,
            $"Total time < 5 seconds (actual: {totalTime}ms)");

        // ========================================
        // Test 2: Many Concurrent Components
        // ========================================
        report.RecordStep("Test 2: Managing 50 concurrent components...");

        var componentCount = 50;
        var components = new List<ComponentContext>();

        sw = Stopwatch.StartNew();

        for (int i = 0; i < componentCount; i++)
        {
            var comp = client.InitializeComponent($"Component{i}", $"component-{i}");
            SimulateCounterRender(comp);
            components.Add(comp);
        }

        sw.Stop();
        var initTime = sw.ElapsedMilliseconds;

        Console.WriteLine($"  📊 Initialized {componentCount} components in {initTime}ms");
        Console.WriteLine($"  ⚡ Average: {initTime / (double)componentCount:F2}ms per component");

        report.AssertTrue(initTime < 1000,
            $"Component initialization < 1 second (actual: {initTime}ms)");

        // Update all components simultaneously
        report.RecordStep("Updating all 50 components simultaneously...");

        sw = Stopwatch.StartNew();

        foreach (var comp in components)
        {
            SimulateStateUpdate(comp, "count", 1);
        }

        sw.Stop();
        var updateAllTime = sw.ElapsedMilliseconds;

        Console.WriteLine($"  📊 Updated {componentCount} components in {updateAllTime}ms");
        Console.WriteLine($"  ⚡ Average: {updateAllTime / (double)componentCount:F2}ms per component");

        report.AssertTrue(updateAllTime < 500,
            $"Bulk update < 500ms (actual: {updateAllTime}ms)");

        // ========================================
        // Test 3: Large DOM Trees
        // ========================================
        report.RecordStep("Test 3: Large DOM tree (100 elements)...");

        var largeContext = client.InitializeComponent("LargeComponent", "large-root");

        sw = Stopwatch.StartNew();
        SimulateLargeDOMTree(largeContext, depth: 100);
        sw.Stop();
        var largeTreeTime = sw.ElapsedMilliseconds;

        Console.WriteLine($"  📊 Created 100-element tree in {largeTreeTime}ms");

        var elementCount = client.DOM.GetAllElements().Count();
        Console.WriteLine($"  🌳 Total elements in DOM: {elementCount}");

        report.AssertTrue(elementCount >= 100,
            $"DOM contains at least 100 elements (actual: {elementCount})");

        // Test patch application on large tree
        report.RecordStep("Testing patch application on large DOM...");

        var largePatch = CreateBulkPatches(100);

        sw = Stopwatch.StartNew();
        largeContext.DOMPatcher.ApplyPatches(largeContext.Element, largePatch);
        sw.Stop();
        var patchTime = sw.ElapsedMilliseconds;

        Console.WriteLine($"  📊 Applied 100 patches in {patchTime}ms");
        Console.WriteLine($"  ⚡ Average: {patchTime / 100.0:F2}ms per patch");

        report.AssertTrue(patchTime < 100,
            $"Bulk patch application < 100ms (actual: {patchTime}ms)");

        // ========================================
        // Test 4: HintQueue Performance
        // ========================================
        report.RecordStep("Test 4: HintQueue with 100 hints...");

        var hintContext = client.InitializeComponent("HintComponent", "hint-root");

        // Queue many hints
        sw = Stopwatch.StartNew();

        for (int i = 0; i < 100; i++)
        {
            hintContext.HintQueue.QueueHint(
                "HintComponent",
                $"hint_{i}",
                CreateIncrementPatch(),
                confidence: 0.5 + (i / 200.0)  // Varying confidence
            );
        }

        sw.Stop();
        var queueTime = sw.ElapsedMilliseconds;

        Console.WriteLine($"  📊 Queued 100 hints in {queueTime}ms");

        // Test hint matching performance
        sw = Stopwatch.StartNew();

        var stateChanges = new Dictionary<string, object> { ["count"] = 1 };
        var matchedHint = hintContext.HintQueue.MatchHint("HintComponent", stateChanges);

        sw.Stop();
        var matchTime = sw.ElapsedMilliseconds;

        Console.WriteLine($"  📊 Matched hint in {matchTime}ms");

        report.AssertNotNull(matchedHint, "Hint matched successfully");
        report.AssertTrue(matchTime < 10,
            $"Hint matching < 10ms (actual: {matchTime}ms)");

        // Verify best hint selected (highest confidence)
        report.AssertTrue(matchedHint!.Confidence > 0.9,
            $"Best hint has high confidence (actual: {matchedHint.Confidence:P})");

        // ========================================
        // Test 5: Memory Pressure Test
        // ========================================
        report.RecordStep("Test 5: Memory pressure test (create/destroy 100 components)...");

        var memBefore = GC.GetTotalMemory(forceFullCollection: true);

        for (int i = 0; i < 100; i++)
        {
            var tempContext = client.InitializeComponent($"Temp{i}", $"temp-{i}");
            SimulateCounterRender(tempContext);

            // Do some work
            for (int j = 0; j < 10; j++)
            {
                SimulateStateUpdate(tempContext, "count", j);
            }
        }

        var memAfter = GC.GetTotalMemory(forceFullCollection: true);
        var memIncrease = (memAfter - memBefore) / 1024.0 / 1024.0;  // MB

        Console.WriteLine($"  📊 Memory before: {memBefore / 1024.0 / 1024.0:F2} MB");
        Console.WriteLine($"  📊 Memory after:  {memAfter / 1024.0 / 1024.0:F2} MB");
        Console.WriteLine($"  📊 Memory increase: {memIncrease:F2} MB");

        report.AssertTrue(memIncrease < 50,
            $"Memory increase < 50 MB (actual: {memIncrease:F2} MB)");

        // ========================================
        // Test 6: DOM Query Performance
        // ========================================
        report.RecordStep("Test 6: DOM query performance (1000 lookups)...");

        var queryCount = 1000;

        sw = Stopwatch.StartNew();

        for (int i = 0; i < queryCount; i++)
        {
            var element = client.DOM.GetElementById("counter-root");
        }

        sw.Stop();
        var queryTime = sw.ElapsedMilliseconds;
        var avgQueryTime = queryTime / (double)queryCount;

        Console.WriteLine($"  📊 {queryCount} queries in {queryTime}ms");
        Console.WriteLine($"  ⚡ Average: {avgQueryTime:F3}ms per query");

        report.AssertTrue(avgQueryTime < 0.1,
            $"Average query time < 0.1ms (actual: {avgQueryTime:F3}ms)");

        // ========================================
        // Performance Summary
        // ========================================
        Console.WriteLine("\n  ═══════════════════════════════════════");
        Console.WriteLine("  🩷 PINK RANGER PERFORMANCE SUMMARY");
        Console.WriteLine("  ═══════════════════════════════════════");
        Console.WriteLine($"  State Updates:     {updateCount} in {totalTime}ms ({avgLatency:F2}ms avg)");
        Console.WriteLine($"  Components:        {componentCount} initialized in {initTime}ms");
        Console.WriteLine($"  DOM Elements:      {elementCount} elements");
        Console.WriteLine($"  Patch Application: {largePatch.Count} patches in {patchTime}ms");
        Console.WriteLine($"  Hint Queue:        100 hints, matched in {matchTime}ms");
        Console.WriteLine($"  Memory Usage:      +{memIncrease:F2} MB");
        Console.WriteLine($"  Query Performance: {avgQueryTime:F3}ms per lookup");
        Console.WriteLine("  ═══════════════════════════════════════\n");

        // All assertions passed!
        report.Pass("Pink Ranger: Performance stress test passed! System can handle high load 🩷⚡");
    }

    /// <summary>
    /// Simulate counter component render
    /// </summary>
    private void SimulateCounterRender(ComponentContext context)
    {
        var root = context.Element;

        var counter = new MockElement
        {
            Id = $"{context.ComponentId}-value",
            TagName = "span",
            TextContent = "0"
        };

        root.Children.Add(counter);
        counter.Parent = root;
    }

    /// <summary>
    /// Simulate state update (like useState setter)
    /// </summary>
    private void SimulateStateUpdate(ComponentContext context, string key, object value)
    {
        // Update local state
        context.State[key] = value;

        // Check hint queue
        var stateChanges = new Dictionary<string, object> { [key] = value };
        var hint = context.HintQueue.MatchHint(context.ComponentId, stateChanges);

        if (hint != null)
        {
            // Apply cached patches
            context.DOMPatcher.ApplyPatches(context.Element, hint.Patches);
        }
    }

    /// <summary>
    /// Simulate large DOM tree
    /// </summary>
    private void SimulateLargeDOMTree(ComponentContext context, int depth)
    {
        var root = context.Element;

        for (int i = 0; i < depth; i++)
        {
            var element = new MockElement
            {
                Id = $"element-{i}",
                TagName = i % 2 == 0 ? "div" : "span",
                TextContent = $"Item {i}",
                Attributes = new Dictionary<string, string>
                {
                    ["data-index"] = i.ToString()
                }
            };

            root.Children.Add(element);
            element.Parent = root;
        }
    }

    /// <summary>
    /// Create increment patch
    /// </summary>
    private List<DOMPatch> CreateIncrementPatch()
    {
        return new List<DOMPatch>
        {
            new DOMPatch
            {
                Type = PatchType.SetText,
                Path = new[] { "0" },
                Value = "1"
            }
        };
    }

    /// <summary>
    /// Create bulk patches for stress testing
    /// </summary>
    private List<DOMPatch> CreateBulkPatches(int count)
    {
        var patches = new List<DOMPatch>();

        for (int i = 0; i < count; i++)
        {
            patches.Add(new DOMPatch
            {
                Type = PatchType.SetAttribute,
                Path = new[] { i.ToString() },
                Key = "data-updated",
                Value = "true"
            });
        }

        return patches;
    }
}
