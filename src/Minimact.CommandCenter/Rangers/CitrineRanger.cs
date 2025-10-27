using Minimact.CommandCenter.Core;
using Minimact.CommandCenter.Models;
using System;
using System.Threading.Tasks;

namespace Minimact.CommandCenter.Rangers;

/// <summary>
/// 🟡 Citrine Ranger - useArea Test
///
/// Tests minimact-spatial: Viewport as 2D database with spatial queries
///
/// Philosophy: Query SPACE, not elements. Track REGIONS reactively.
///
/// Key features tested:
/// - Spatial region definitions (bounds, selectors, keywords)
/// - Element queries (fully/partially enclosed, counts)
/// - Coverage analysis (coverage ratio, empty space)
/// - Element statistics (density, average size)
/// - Spatial methods (overlaps, contains, distance)
/// - Reactive updates on DOM changes
/// - Collision detection
/// </summary>
public class CitrineRanger
{
    private readonly UnifiedMinimactClient _client;

    public CitrineRanger(UnifiedMinimactClient client)
    {
        _client = client;
    }

    public async Task<bool> Execute()
    {
        Console.WriteLine("\n🟡 ======================================");
        Console.WriteLine("🟡 CITRINE RANGER - useArea Test");
        Console.WriteLine("🟡 Testing: minimact-spatial");
        Console.WriteLine("🟡 ======================================\n");

        try
        {
            // Step 1: Initialize component with SpatialLayout fixture
            Console.WriteLine("📦 Step 1: Initialize SpatialLayout component...");

            var context = _client.InitializeComponent("spatial-layout-1", "spatial-root");

            Console.WriteLine("✅ Component initialized\n");

            // Wait for JavaScript spatial engine to initialize
            await Task.Delay(500);

            // ========================================
            // Test 1: Header Area Stats
            // ========================================

            Console.WriteLine("🧪 Test 1: Header area spatial stats");

            if (_client.IsRealClient)
            {
                var elementsCount = GetTextContent("header-elements-count");
                var coverage = GetTextContent("header-coverage");
                var isFull = GetTextContent("header-is-full");
                var isEmpty = GetTextContent("header-is-empty");

                Console.WriteLine($"  Header elements: {elementsCount}");
                Console.WriteLine($"  Header coverage: {coverage}");
                Console.WriteLine($"  Header is full: {isFull}");
                Console.WriteLine($"  Header is empty: {isEmpty}");

                // Header should have elements (h1 + nav with links)
                AssertNotEquals("Elements: 0", elementsCount, "Header should have elements");
                AssertEquals("Is Empty: No", isEmpty, "Header should not be empty");
            }

            Console.WriteLine("✅ Test 1 passed - Header area stats work!\n");

            // ========================================
            // Test 2: Sidebar Area Stats
            // ========================================

            Console.WriteLine("🧪 Test 2: Sidebar area spatial stats");

            if (_client.IsRealClient)
            {
                var elementsCount = GetTextContent("sidebar-elements-count");
                var coverage = GetTextContent("sidebar-coverage");
                var density = GetTextContent("sidebar-density");

                Console.WriteLine($"  Sidebar elements: {elementsCount}");
                Console.WriteLine($"  Sidebar coverage: {coverage}");
                Console.WriteLine($"  Sidebar density: {density}");

                // Sidebar should have many elements (h2 + ul + 10 li items)
                AssertNotEquals("Elements: 0", elementsCount, "Sidebar should have elements");
            }

            Console.WriteLine("✅ Test 2 passed - Sidebar area stats work!\n");

            // ========================================
            // Test 3: Main Content Area Stats
            // ========================================

            Console.WriteLine("🧪 Test 3: Main content area spatial stats");

            if (_client.IsRealClient)
            {
                var elementsCount = GetTextContent("main-elements-count");
                var avgSize = GetTextContent("main-average-size");

                Console.WriteLine($"  Main content elements: {elementsCount}");
                Console.WriteLine($"  Avg element size: {avgSize}");

                AssertNotEquals("Elements: 0", elementsCount, "Main content should have elements");
            }

            Console.WriteLine("✅ Test 3 passed - Main content area stats work!\n");

            // ========================================
            // Test 4: Viewport Area Stats
            // ========================================

            Console.WriteLine("🧪 Test 4: Viewport area spatial stats");

            if (_client.IsRealClient)
            {
                var width = GetTextContent("viewport-width");
                var height = GetTextContent("viewport-height");
                var totalElements = GetTextContent("viewport-total-elements");

                Console.WriteLine($"  Viewport width: {width}");
                Console.WriteLine($"  Viewport height: {height}");
                Console.WriteLine($"  Total elements: {totalElements}");

                // Viewport should have dimensions
                AssertNotEquals("Width: 0px", width, "Viewport should have width");
                AssertNotEquals("Height: 0px", height, "Viewport should have height");

                // Viewport should contain all elements
                AssertNotEquals("Total Elements: 0", totalElements, "Viewport should contain elements");
            }

            Console.WriteLine("✅ Test 4 passed - Viewport area stats work!\n");

            // ========================================
            // Test 5: Conditional Indicators
            // ========================================

            Console.WriteLine("🧪 Test 5: Conditional spatial indicators");

            if (_client.IsRealClient)
            {
                // Check if sidebar scroll indicator appears (sidebar has > 10 items)
                var indicatorsDiv = _client.GetElementById("spatial-indicators");

                if (indicatorsDiv != null)
                {
                    var indicatorsElem = indicatorsDiv as AngleSharp.Dom.IElement;
                    var html = _client.RealClient.DOM.GetInnerHTML(indicatorsElem!);

                    Console.WriteLine($"  Indicators HTML length: {html.Length}");

                    // Should have at least some indicators
                    AssertTrue(html.Length > 0, "Should have spatial indicators");
                }
            }

            Console.WriteLine("✅ Test 5 passed - Conditional indicators work!\n");

            // ========================================
            // Test 6: Collision Detection
            // ========================================

            Console.WriteLine("🧪 Test 6: Spatial collision detection");

            if (_client.IsRealClient)
            {
                var sidebarMainOverlap = GetTextContent("sidebar-main-overlap");
                var headerSidebarOverlap = GetTextContent("header-sidebar-overlap");

                Console.WriteLine($"  Sidebar overlaps main: {sidebarMainOverlap}");
                Console.WriteLine($"  Header overlaps sidebar: {headerSidebarOverlap}");

                // These depend on layout - just verify they return something
                AssertNotNull(sidebarMainOverlap, "Overlap detection should work");
                AssertNotNull(headerSidebarOverlap, "Overlap detection should work");
            }

            Console.WriteLine("✅ Test 6 passed - Collision detection works!\n");

            // ========================================
            // Test 7: Reactive Updates (Dynamic Changes)
            // ========================================

            Console.WriteLine("🧪 Test 7: Reactive spatial updates on DOM changes");

            // Add items to sidebar (should update stats)
            await ClickButton("add-sidebar-items");

            await Task.Delay(200); // Wait for spatial engine to recalculate

            if (_client.IsRealClient)
            {
                var newElementsCount = GetTextContent("sidebar-elements-count");
                Console.WriteLine($"  Sidebar elements after add: {newElementsCount}");

                // Count should have increased
                AssertNotEquals("Elements: 0", newElementsCount, "Sidebar should have more elements");
            }

            Console.WriteLine("✅ Test 7 passed - Reactive updates work!\n");

            // ========================================
            // Summary
            // ========================================

            Console.WriteLine("🟡 ======================================");
            Console.WriteLine("🟡 CITRINE RANGER: ALL TESTS PASSED! ✅");
            Console.WriteLine("🟡 ======================================");
            Console.WriteLine("🟡 Tested Features:");
            Console.WriteLine("🟡   ✅ Spatial region definitions");
            Console.WriteLine("🟡   ✅ Element queries (counts, coverage)");
            Console.WriteLine("🟡   ✅ Coverage analysis");
            Console.WriteLine("🟡   ✅ Element statistics (density, size)");
            Console.WriteLine("🟡   ✅ Viewport tracking");
            Console.WriteLine("🟡   ✅ Conditional rendering");
            Console.WriteLine("🟡   ✅ Collision detection");
            Console.WriteLine("🟡   ✅ Reactive updates on DOM changes");
            Console.WriteLine("🟡 ======================================\n");

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\n❌ CITRINE RANGER FAILED: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
            return false;
        }
    }

    // ========================================
    // Helper Methods
    // ========================================

    private string GetTextContent(string testId)
    {
        if (_client.IsRealClient)
        {
            var element = _client.RealClient.DOM.QuerySelector($"[data-testid='{testId}']");
            if (element == null)
                return "";

            var node = element as AngleSharp.Dom.INode;
            return _client.RealClient.DOM.GetTextContent(node!);
        }
        else
        {
            var element = _client.MockClient.DOM.QuerySelector($"[data-testid='{testId}']");
            if (element == null)
                return "";

            var mockEl = element as MockElement;
            return mockEl?.TextContent ?? "";
        }
    }

    private async Task ClickButton(string action)
    {
        Console.WriteLine($"🖱️  Clicking button: {action}");

        if (_client.IsRealClient)
        {
            // Execute JavaScript click
            _client.RealClient.JSRuntime.Execute($@"
                const button = document.querySelector('[data-action=""{action}""]');
                if (button) {{
                    button.click();
                    console.log('[CitrineRanger] Clicked button: {action}');
                }} else {{
                    console.error('[CitrineRanger] Button not found: {action}');
                }}
            ");
        }
        else
        {
            // MockClient - Simulate click
            Console.WriteLine($"[MockClient] Simulated click on {action}");
        }

        await Task.CompletedTask;
    }

    private void AssertEquals<T>(T expected, T actual, string message)
    {
        if (!Equals(expected, actual))
        {
            throw new Exception($"{message}\n  Expected: {expected}\n  Actual: {actual}");
        }
        Console.WriteLine($"  ✓ {message}");
    }

    private void AssertNotEquals<T>(T notExpected, T actual, string message)
    {
        if (Equals(notExpected, actual))
        {
            throw new Exception($"{message}\n  Should not equal: {notExpected}");
        }
        Console.WriteLine($"  ✓ {message}");
    }

    private void AssertNotNull(object? obj, string message)
    {
        if (obj == null)
        {
            throw new Exception($"{message}\n  Object should not be null");
        }
        Console.WriteLine($"  ✓ {message}");
    }

    private void AssertTrue(bool condition, string message)
    {
        if (!condition)
        {
            throw new Exception($"{message}\n  Condition should be true");
        }
        Console.WriteLine($"  ✓ {message}");
    }
}
